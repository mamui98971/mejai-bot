// ============================================================
// PROJECT MEJAI — Horoscope Handler (Pillar 1)
// Generates daily horoscope based on birthdate.
// ============================================================

import { chat } from '../services/deepseek';
import { buildSystemPrompt } from '../services/promptBuilder';
import { MejaiContext, HandlerResult, ConversationRole } from '../types';
import { saveConversationTurn } from '../services/supabase';

export async function handleHoroscope(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const birthdate = ctx.user.birthdate;
  let contextHint = '';

  if (!birthdate) {
    contextHint = 'ผู้ใช้ขอให้ดูดวง แต่เรายังไม่รู้วันเกิด ถามวันเกิดผู้ใช้อย่างน่ารัก (รูปแบบ เช่น 15 ตุลาคม 2540)';
  } else {
    contextHint = `สร้างคำทำนายดวงชะตารายวันสำหรับคนที่เกิดวันที่ ${birthdate} 
    สิ่งที่ต้องมี:
    1. ภาพรวมดวงวันนี้ (สั้นๆ)
    2. สีมงคลประจำวัน
    3. ไอเทมมงคล (lucky item) นำโชค
    เล่าในสไตล์ที่เข้ากับคาแรคเตอร์ของคุณ`;
  }

  const prompt = [
    {
      role: 'system' as const,
      content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ${contextHint}`,
    },
    { role: 'user' as const, content: message },
  ];

  try {
    const reply = await chat(prompt, { temperature: 0.85, max_tokens: 512 });
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, reply);
    return { reply_text: reply };
  } catch (error) {
    console.error('❌ Horoscope generation failed:', error);
    return { reply_text: 'แงงงงงง ตอนนี้พลังเวทย์เค้าหมด ดูดวงไม่ได้เลย รอก่อนน้าาา~' };
  }
}
