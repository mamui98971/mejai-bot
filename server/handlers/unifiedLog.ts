import { chat } from '../services/deepseek';
import { buildSystemPrompt } from '../services/promptBuilder';
import {
  insertDataLog,
  saveConversationTurn,
} from '../services/supabase';
import {
  MejaiContext,
  HandlerResult,
  LogType,
  ConversationRole,
  ExpensePayload,
  DietPayload,
} from '../types';
import { calculateTDEE, getTodayCalories } from './nutrition';
import { HEALTH } from '../config/constants';

interface UnifiedPayload {
  expense: ExpensePayload;
  diet: DietPayload;
}

export async function handleUnifiedLog(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const extractionPrompt = [
    {
      role: 'system' as const,
      content: `You are a data extraction engine for a Thai tracker.
The user's message contains BOTH spending money AND eating food.
Extract both expense and nutrition information.
CURRENT TIME: ${ctx.server_timestamp}

Respond ONLY in JSON format:
{
  "expense": {
    "amount": <number>,
    "category": "<food|transport|shopping|entertainment|health|bills|education|uncategorized>",
    "merchant": "<merchant name or null>",
    "description": "<brief description>",
    "date": "<ISO 8601 date string>"
  },
  "diet": {
    "food_name": "<food name in Thai>",
    "calories": <estimated kcal>,
    "protein": <grams>,
    "carbs": <grams>,
    "fats": <grams>,
    "sodium": <milligrams>,
    "meal_type": "<breakfast|lunch|dinner|snack>"
  }
}

Rules:
- Base diet estimates on standard Thai portion sizes
- Include sodium from common Thai condiments
- If no date mentioned, use current date from CURRENT TIME`,
    },
    { role: 'user' as const, content: message },
  ];

  try {
    const raw = await chat(extractionPrompt, {
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(raw) as UnifiedPayload;

    // Validate payloads
    if (!extracted.expense || !extracted.diet) {
      throw new Error('Incomplete unified extraction');
    }

    // Save to database (Expense)
    await insertDataLog(ctx.user.id, LogType.EXPENSE, extracted.expense as any);
    
    // Save to database (Diet)
    await insertDataLog(ctx.user.id, LogType.DIET, extracted.diet as any);

    // Save conversation turn
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);

    // Calculate TDEE and today's calories
    const tdee = calculateTDEE(ctx.user);
    const todayCalories = await getTodayCalories(ctx.user.id);
    const remaining = tdee - todayCalories; // todayCalories already includes the newly inserted diet log

    // Build Mejai's response
    let contextHint = `บันทึกข้อมูลเรียบร้อยแล้ว:\n`;
    contextHint += `- รายจ่าย: ${extracted.expense.amount} บาท (หมวด${extracted.expense.category})\n`;
    contextHint += `- อาหาร: ${extracted.diet.food_name} (${extracted.diet.calories} kcal, P:${extracted.diet.protein}g, C:${extracted.diet.carbs}g, F:${extracted.diet.fats}g, Na:${extracted.diet.sodium}mg)\n\n`;
    contextHint += `เป้าหมายผู้ใช้: ${ctx.user.goal || 'สมส่วน'}, โควต้าแคลอรี่ที่แนะนำต่อวัน: ${tdee} kcal, กินไปแล้ววันนี้: ${todayCalories} kcal, เหลือโควต้าอีก: ${remaining} kcal. 
พูดคุยให้กำลังใจตามเป้าหมายของเขาอย่างเป็นธรรมชาติ โดยรวบยอดทั้งเรื่องเงินและเรื่องอาหารไว้ด้วยกัน`;

    if (extracted.diet.sodium > HEALTH.SODIUM_DAILY_CAP_MG) {
      contextHint += `\n⚠️ WATER_RETENTION_ALERT: แค่มื้อนี้ก็โซเดียมเกิน ${HEALTH.SODIUM_DAILY_CAP_MG}mg แล้ว! เตือนผู้ใช้เรื่องบวมน้ำอย่างน่ารัก`;
    }

    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ${contextHint}\nRespond in character. Keep it conversational. Include the key numbers naturally.`,
      },
      { role: 'user' as const, content: message },
    ];

    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 300 });
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);

    return { reply_text: reply };
  } catch (error) {
    console.error('❌ Unified extraction failed:', error);
    const fallback = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: พยายามบันทึกทั้งรายจ่ายและอาหารแต่เกิดข้อผิดพลาด ขอโทษผู้ใช้และให้ลองพิมพ์ใหม่`,
      },
      { role: 'user' as const, content: message },
    ];
    const reply = await chat(fallback, { temperature: 0.8, max_tokens: 256 });
    return { reply_text: reply };
  }
}
