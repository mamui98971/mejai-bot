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
  const formattedNow = formatThaiDate(new Date(ctx.server_timestamp));
  const extractionPrompt = [
    {
      role: 'system' as const,
      content: `You are a schedule extraction engine for a Thai personal assistant.
CURRENT TIME: ${formattedNow} (Timezone: Asia/Bangkok +07:00)

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

/**
 * Handle schedule done intent
 * Uses AI to match the user's message with a pending schedule and marks it as done.
 */
import supabase from '../services/supabase';

export async function handleScheduleDone(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);

  try {
    // 1. Fetch pending schedules
    const { data: logs } = await supabase
      .from('user_data_logs')
      .select('id, payload')
      .eq('user_id', ctx.user.id)
      .eq('log_type', LogType.SCHEDULE);

    const pendingSchedules = (logs || []).filter(
      (log) => !(log.payload as any).is_done
    );

    if (pendingSchedules.length === 0) {
      const promptEmpty = [
        {
          role: 'system' as const,
          content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้บอกว่าทำงานเสร็จแล้ว แต่ในระบบไม่มีตารางงานค้างอยู่เลย ให้ชื่นชมและบอกว่าในระบบไม่มีงานค้างนะ (ห้ามหลุดคาร์แรคเตอร์เด็ดขาด)`,
        },
        { role: 'user' as const, content: message },
      ];
      const reply = await chat(promptEmpty, { temperature: 0.8, max_tokens: 200 });
      await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);
      return { reply_text: reply };
    }

    // 2. Map for AI
    const scheduleListStr = pendingSchedules
      .map((log) => `ID: ${log.id} | Title: ${(log.payload as any).title}`)
      .join('\n');

    // 3. Ask AI to match
    const matchPrompt = [
      {
        role: 'system' as const,
        content: `You are an AI assistant helping to mark schedules as done.
The user said they finished a task.
Here are their pending tasks:
${scheduleListStr}

Which task ID best matches their message?
Reply ONLY in JSON format:
{
  "matched_id": "<ID or null if no match>"
}`
      },
      { role: 'user' as const, content: message }
    ];

    const matchRaw = await chat(matchPrompt, { temperature: 0.1, response_format: { type: 'json_object' } });
    const matchRes = JSON.parse(matchRaw);

    if (matchRes.matched_id) {
      // Find the matched log to update
      const matchedLog = pendingSchedules.find((l) => l.id === matchRes.matched_id);
      if (matchedLog) {
        const updatedPayload = { ...(matchedLog.payload as any), is_done: true };
        
        await supabase
          .from('user_data_logs')
          .update({ payload: updatedPayload })
          .eq('id', matchedLog.id);

        const promptSuccess = [
          {
            role: 'system' as const,
            content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้บอกว่าทำ "${updatedPayload.title}" เสร็จแล้ว คุณได้ทำการติ๊กเครื่องหมายถูก (Mark as done) ในระบบให้เรียบร้อยแล้ว ให้ชื่นชมและบอกให้ผู้ใช้รับรู้ว่าคุณจัดการติ๊กในระบบให้แล้ว (ห้ามหลุดคาร์แรคเตอร์เด็ดขาด)`,
          },
          { role: 'user' as const, content: message },
        ];
        const reply = await chat(promptSuccess, { temperature: 0.8, max_tokens: 200 });
        await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);
        return { reply_text: reply };
      }
    }

    // No match found
    const promptNoMatch = [
      {
        role: 'system' as const,
        content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ผู้ใช้บอกว่าทำบางอย่างเสร็จแล้ว แต่คุณหาไม่เจอว่าตรงกับงานไหนในระบบ ให้ตอบรับตามคาแรคเตอร์ ชื่นชมที่ทำเสร็จ และบอกเนียนๆ ว่าถ้าเป็นงานในระบบให้ไปกดติ๊กเองในแดชบอร์ดนะเพราะหาไม่เจอ (ห้ามหลุดคาร์แรคเตอร์เด็ดขาด)`,
      },
      { role: 'user' as const, content: message },
    ];
    const reply = await chat(promptNoMatch, { temperature: 0.8, max_tokens: 200 });
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);
    return { reply_text: reply };

  } catch (error) {
    console.error('❌ Schedule done failed:', error);
    return { reply_text: 'ระบบตารางงานมีปัญหาขัดข้องชั่วคราวครับ โปรดลองใหม่' };
  }
}
