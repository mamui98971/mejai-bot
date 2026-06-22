// ============================================================
// PROJECT MEJAI — Nutrition Handler (Pillar 4)
// Tracks food, macros, and monitors sodium intake.
// Triggers Water_Retention_Alert when sodium > 2300mg.
// ============================================================

import { chat } from '../services/deepseek';
import { buildSystemPrompt } from '../services/promptBuilder';
import {
  insertDataLog,
  queryDataLogs,
  saveConversationTurn,
} from '../services/supabase';
import {
  MejaiContext,
  HandlerResult,
  LogType,
  ConversationRole,
  DietPayload,
} from '../types';
import { HEALTH } from '../config/constants';

/**
 * Handle nutrition logging from natural language.
 * AI estimates calories, protein, carbs, fats, sodium from food description.
 */
export async function handleNutritionLog(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const extractionPrompt = [
    {
      role: 'system' as const,
      content: `You are a nutrition estimation engine for a Thai food tracker.
Estimate nutritional information from the user's food description.
Use your knowledge of Thai food portions and common dishes.

Respond ONLY in JSON format:
{
  "food_name": "<food name in Thai>",
  "calories": <estimated kcal>,
  "protein": <grams>,
  "carbs": <grams>,
  "fats": <grams>,
  "sodium": <milligrams>,
  "meal_type": "<breakfast|lunch|dinner|snack>"
}

Rules:
- Base estimates on standard Thai portion sizes
- Include sodium from common Thai condiments (น้ำปลา, ซีอิ๊ว, etc.)
- If unsure about meal_type, infer from CURRENT TIME: ${ctx.server_timestamp}
- Be realistic with Thai food (som tum, pad thai, etc. tend to be high sodium)`,
    },
    { role: 'user' as const, content: message },
  ];

  try {
    const raw = await chat(extractionPrompt, {
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(raw) as DietPayload;

    // Save to database
    await insertDataLog(ctx.user.id, LogType.DIET, extracted as any);
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);

    // Check 24-hour rolling sodium
    const sodiumAlert = await checkSodiumLevel(ctx);

    // Build Mejai's response
    let contextHint = `บันทึกอาหารแล้ว: ${extracted.food_name} (${extracted.calories} kcal, P:${extracted.protein}g, C:${extracted.carbs}g, F:${extracted.fats}g, Na:${extracted.sodium}mg)`;

    if (sodiumAlert) {
      contextHint += `\n⚠️ WATER_RETENTION_ALERT: โซเดียมวันนี้เกิน ${HEALTH.SODIUM_DAILY_CAP_MG}mg แล้ว! (รวม ${sodiumAlert.totalSodium}mg) เตือนผู้ใช้เรื่องบวมน้ำและดื่มน้ำเยอะๆ อย่างน่ารักแต่จริงจัง`;
    }

    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ${contextHint}\nRespond in character. Keep it short. Include the key nutrition numbers naturally.`,
      },
      { role: 'user' as const, content: message },
    ];

    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 300 });
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);

    return { reply_text: reply };
  } catch (error) {
    console.error('❌ Nutrition extraction failed:', error);
    const fallback = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: พยายามประเมินอาหารแต่ไม่แน่ใจ ถามผู้ใช้ว่ากินอะไรและปริมาณเท่าไหร่`,
      },
      { role: 'user' as const, content: message },
    ];
    const reply = await chat(fallback, { temperature: 0.8, max_tokens: 256 });
    return { reply_text: reply };
  }
}

/**
 * Check 24-hour rolling sodium intake.
 * Returns alert data if over threshold, null if OK.
 */
async function checkSodiumLevel(
  ctx: MejaiContext
): Promise<{ totalSodium: number } | null> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const logs = await queryDataLogs(
    ctx.user.id,
    LogType.DIET,
    twentyFourHoursAgo.toISOString(),
    now.toISOString()
  );

  let totalSodium = 0;
  for (const log of logs) {
    const payload = log.payload as DietPayload;
    totalSodium += payload.sodium || 0;
  }

  if (totalSodium > HEALTH.SODIUM_DAILY_CAP_MG) {
    return { totalSodium };
  }

  return null;
}

/**
 * Handle nutrition summary request.
 * Shows today's macro totals and progress.
 */
export async function handleNutritionSummary(
  ctx: MejaiContext
): Promise<HandlerResult> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const logs = await queryDataLogs(
    ctx.user.id,
    LogType.DIET,
    startOfDay,
    endOfDay
  );

  if (logs.length === 0) {
    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้ยังไม่ได้บันทึกอาหารวันนี้เลย ถามว่ากินอะไรไปบ้าง ตอบใน character`,
      },
      { role: 'user' as const, content: 'สรุปอาหาร' },
    ];
    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
    return { reply_text: reply };
  }

  // Aggregate today's nutrition
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalSodium = 0;
  const foods: string[] = [];

  for (const log of logs) {
    const p = log.payload as DietPayload;
    totalCalories += p.calories || 0;
    totalProtein += p.protein || 0;
    totalCarbs += p.carbs || 0;
    totalFats += p.fats || 0;
    totalSodium += p.sodium || 0;
    foods.push(p.food_name);
  }

  const sodiumWarning = totalSodium > HEALTH.SODIUM_DAILY_CAP_MG
    ? `\n⚠️ โซเดียมเกิน! (${totalSodium}/${HEALTH.SODIUM_DAILY_CAP_MG}mg) เตือนเรื่องบวมน้ำและดื่มน้ำเยอะ`
    : '';

  const summaryText = `🥗 สรุปอาหารวันนี้\n
กินไป: ${foods.join(', ')}\n
🔥 แคลอรี่: ${totalCalories} kcal
🥩 โปรตีน: ${totalProtein}g
🍞 คาร์บ: ${totalCarbs}g
🧈 ไขมัน: ${totalFats}g
🧂 โซเดียม: ${totalSodium}/${HEALTH.SODIUM_DAILY_CAP_MG}mg${sodiumWarning}`;

  const replyPrompt = [
    {
      role: 'system' as const,
      content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: นี่คือสรุปโภชนาการ นำเสนออย่างเป็นธรรมชาติ แต่ต้องรวมตัวเลขทั้งหมด:\n${summaryText}`,
    },
    { role: 'user' as const, content: 'สรุปอาหาร' },
  ];

  const reply = await chat(replyPrompt, { temperature: 0.7, max_tokens: 512 });
  return { reply_text: reply };
}
