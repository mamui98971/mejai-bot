// ============================================================
// PROJECT MEJAI — Secretary Handler (Pillar 2)
// Schedule creation and listing with Thai date parsing.
// Server timestamp injected for relative time resolution.
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
  SchedulePayload,
} from '../types';
import { formatThaiDate } from '../utils/dateParser';

/**
 * Handle schedule creation from natural language.
 * AI extracts title, datetime, reminder from user message.
 */
export async function handleScheduleCreate(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const extractionPrompt = [
    {
      role: 'system' as const,
      content: `You are a schedule extraction engine for a Thai personal assistant.
CURRENT TIME: ${ctx.server_timestamp}

Extract schedule information from the user's message.
Respond ONLY in JSON format:
{
  "title": "<event title in Thai>",
  "datetime_iso": "<ISO 8601 datetime string with timezone +07:00>",
  "reminder_before_minutes": <number or null>,
  "is_recurring": false,
  "recurrence_pattern": null
}

Rules:
- ALWAYS resolve relative dates (e.g., "พรุ่งนี้", "วันศุกร์") using CURRENT TIME as reference
- Default reminder: 30 minutes before
- If no time specified, default to 09:00 +07:00
- Timezone is always Asia/Bangkok (+07:00)`,
    },
    { role: 'user' as const, content: message },
  ];

  try {
    const raw = await chat(extractionPrompt, {
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(raw) as SchedulePayload;

    // Save to database
    await insertDataLog(ctx.user.id, LogType.SCHEDULE, extracted as any);

    // Save conversation
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);

    // Format datetime for display
    const eventDate = new Date(extracted.datetime_iso);
    const formattedDate = formatThaiDate(eventDate);

    // Build Mejai's confirmation response
    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: บันทึกนัดแล้ว: "${extracted.title}" ${formattedDate} ยืนยันการบันทึก และจะแจ้งเตือนก่อน. Keep it short.`,
      },
      { role: 'user' as const, content: message },
    ];

    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);

    return { reply_text: reply };
  } catch (error) {
    console.error('❌ Schedule extraction failed:', error);
    // Fallback: respond in character
    const fallbackPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: พยายามเข้าใจนัดแต่จับข้อมูลไม่ครบ ถามผู้ใช้ว่านัดวันไหนกี่โมง`,
      },
      { role: 'user' as const, content: message },
    ];
    const reply = await chat(fallbackPrompt, { temperature: 0.8, max_tokens: 256 });
    return { reply_text: reply };
  }
}

/**
 * Handle schedule list request.
 * Shows upcoming events from today onward.
 */
export async function handleScheduleList(
  ctx: MejaiContext
): Promise<HandlerResult> {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30); // Show next 30 days

  const logs = await queryDataLogs(
    ctx.user.id,
    LogType.SCHEDULE,
    now.toISOString(),
    endDate.toISOString()
  );

  if (logs.length === 0) {
    const replyPrompt = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้ไม่มีนัดหมายที่กำลังจะถึง ตอบใน character และถามว่าอยากให้เค้าช่วยจัดตารางไหม`,
      },
      { role: 'user' as const, content: 'ตารางงาน' },
    ];
    const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
    return { reply_text: reply };
  }

  // Build schedule list
  const scheduleItems = logs
    .map((log) => {
      const payload = log.payload as SchedulePayload;
      const date = new Date(payload.datetime_iso);
      return { ...payload, date };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let scheduleText = '📅 ตารางงาน\n\n';
  for (const item of scheduleItems.slice(0, 10)) {
    const formatted = formatThaiDate(item.date);
    scheduleText += `• ${item.title}\n  🕒 ${formatted}\n\n`;
  }

  if (scheduleItems.length > 10) {
    scheduleText += `...(และอีก ${scheduleItems.length - 10} รายการ)`;
  }

  // Let Mejai present it
  const replyPrompt = [
    {
      role: 'system' as const,
      content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: นี่คือตารางงาน นำเสนอให้ผู้ใช้อย่างเป็นธรรมชาติ แทรกข้อความสั้นๆ แต่รวมข้อมูลทั้งหมดไว้ด้วย:\n${scheduleText}`,
    },
    { role: 'user' as const, content: 'ตารางงาน' },
  ];

  const reply = await chat(replyPrompt, { temperature: 0.7, max_tokens: 512 });
  return { reply_text: reply };
}
