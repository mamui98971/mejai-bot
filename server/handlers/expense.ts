// ============================================================
// PROJECT MEJAI — Expense Handler (Pillar 3)
// Tracks spending via natural language and OCR.
// Fallback: uncategorized + ask user in character.
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
  ExpensePayload,
} from '../types';

/**
 * Handle expense logging from natural language.
 * AI extracts amount, category, merchant from user message.
 */
export async function handleExpenseLog(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const extractionPrompt = [
    {
      role: 'system' as const,
      content: `You are a data extraction engine for a Thai expense tracker.
Extract expense information from the user's message.
CURRENT TIME: ${ctx.server_timestamp}

Respond ONLY in JSON format:
{
  "amount": <number>,
  "category": "<food|transport|shopping|entertainment|health|bills|education|uncategorized>",
  "merchant": "<merchant name or null>",
  "description": "<brief description>",
  "date": "<ISO 8601 date string>"
}

Rules:
- If you cannot determine the category confidently, use "uncategorized"
- If no date mentioned, use current date from CURRENT TIME
- Amount must be a positive number
- Parse Thai currency terms: บาท, สตางค์, ตังค์`,
    },
    { role: 'user' as const, content: message },
  ];

  try {
    const raw = await chat(extractionPrompt, {
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(raw) as ExpensePayload;

    // Validate amount
    if (!extracted.amount || extracted.amount <= 0) {
      return await buildRoleplayResponse(
        message,
        ctx,
        'เอ๊ะ~ เค้าจับตัวเลขไม่ถูกเลยนะคะ จ่ายไปเท่าไหร่คะ?'
      );
    }

    // Save to database
    await insertDataLog(ctx.user.id, LogType.EXPENSE, extracted as any);

    // Save conversation turn
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);

    // Build response based on category
    let responseHint: string;
    if (extracted.category === 'uncategorized') {
      responseHint = `ผู้ใช้จ่าย ${extracted.amount} บาท แต่เค้าไม่รู้ว่าจ่ายค่าอะไร ถามผู้ใช้อย่างน่ารักและอินคาแรคเตอร์ว่าจ่ายค่าอะไร`;
    } else {
      responseHint = `บันทึกรายจ่ายแล้ว: ${extracted.amount} บาท หมวด${extracted.category} ยืนยันการบันทึกให้ผู้ใช้ทราบ`;
    }

    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ${responseHint}\nRespond in character as Mejai. Keep it short (1-2 sentences).`,
      },
      { role: 'user' as const, content: message },
    ];

    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);

    return { reply_text: reply };
  } catch (error) {
    console.error('❌ Expense extraction failed:', error);
    return await buildRoleplayResponse(
      message,
      ctx,
      'เกิดข้อผิดพลาดในการบันทึก ลองบอกใหม่นะ'
    );
  }
}

/**
 * Handle expense summary request.
 * Aggregates current month's expenses by category.
 */
export async function handleExpenseSummary(
  ctx: MejaiContext
): Promise<HandlerResult> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const logs = await queryDataLogs(
    ctx.user.id,
    LogType.EXPENSE,
    startOfMonth,
    endOfMonth
  );

  if (logs.length === 0) {
    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้ยังไม่มีรายจ่ายในเดือนนี้เลย ตอบใน character`,
      },
      { role: 'user' as const, content: 'สรุปรายจ่าย' },
    ];
    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
    return { reply_text: reply };
  }

  // Aggregate by category
  const summary: Record<string, { total: number; count: number }> = {};
  let grandTotal = 0;

  for (const log of logs) {
    const payload = log.payload as ExpensePayload;
    const cat = payload.category || 'uncategorized';
    if (!summary[cat]) summary[cat] = { total: 0, count: 0 };
    summary[cat].total += payload.amount;
    summary[cat].count += 1;
    grandTotal += payload.amount;
  }

  // Build summary text
  const categoryEmoji: Record<string, string> = {
    food: '🍜',
    transport: '🚗',
    shopping: '🛒',
    entertainment: '🎬',
    health: '🏥',
    bills: '💳',
    education: '📚',
    uncategorized: '❓',
  };

  let summaryText = '💰 สรุปรายจ่ายเดือนนี้\n\n';
  for (const [cat, data] of Object.entries(summary)) {
    const emoji = categoryEmoji[cat] || '•';
    summaryText += `${emoji} ${cat}: ฿${data.total.toLocaleString()} (${data.count} รายการ)\n`;
  }
  summaryText += `\nรวม: ฿${grandTotal.toLocaleString()}`;

  // Let Mejai present it in character
  const replyPrompt = [
    {
      role: 'system' as const,
      content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: นี่คือข้อมูลรายจ่าย นำเสนอให้ผู้ใช้อย่างเป็นธรรมชาติ แทรกข้อความสั้นๆ แต่ต้องรวมข้อมูลตัวเลขทั้งหมดไว้ด้วย:\n${summaryText}`,
    },
    { role: 'user' as const, content: 'สรุปรายจ่าย' },
  ];

  const reply = await chat(replyPrompt, { temperature: 0.7, max_tokens: 512 });
  return { reply_text: reply };
}

/**
 * Helper: Build a roleplay-style response with additional context.
 */
async function buildRoleplayResponse(
  message: string,
  ctx: MejaiContext,
  contextHint: string
): Promise<HandlerResult> {
  const prompt = [
    {
      role: 'system' as const,
      content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ${contextHint}`,
    },
    { role: 'user' as const, content: message },
  ];

  const reply = await chat(prompt, { temperature: 0.8, max_tokens: 256 });
  await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);
  await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);
  return { reply_text: reply };
}
