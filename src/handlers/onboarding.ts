// ============================================================
// PROJECT MEJAI — Onboarding & Custom Persona Setup
// ============================================================

import { MejaiContext, HandlerResult, DeepSeekMessage } from '../types';
import { chat } from '../services/deepseek';
import { updateUserPersona } from '../services/supabase';

export async function handleOnboarding(
  userMessage: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const systemPrompt = `You are an onboarding assistant for a LINE chatbot.
The user needs to set up the chatbot's persona (Name, Gender, Personality/Character).
Your goal is to extract these details from the user's message.
If the user hasn't provided enough information (e.g., they just said "Hello"), greet them nicely and ask what they want to name the bot, what gender, and what personality or character they want to roleplay.
If the user provides the information, extract it and confirm it.

Respond ONLY in JSON format:
{
  "is_complete": boolean, // true if you have enough info to set the persona
  "extracted": {
    "bot_name": "string", // default "เมใจ" if not specified
    "bot_gender": "female" | "male" | "other", // default "female"
    "bot_personality": "string" // detailed personality or character prompt
  },
  "reply_text": "string" // The message to send to the user (Thai language). If is_complete is true, say something like "รับทราบค่ะ! จากนี้ไปฉันคือ [bot_name] นะคะ มีอะไรให้ช่วยบอกได้เลย!"
}

Current User Message: ${userMessage}
`;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  try {
    const response = await chat(messages, {
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response);

    if (parsed.is_complete && parsed.extracted) {
      // User provided enough info, update the database
      const persona = {
        bot_name: parsed.extracted.bot_name || 'เมใจ',
        bot_gender: parsed.extracted.bot_gender || 'female',
        bot_personality: parsed.extracted.bot_personality || 'ผู้ช่วยส่วนตัวและเพื่อนสนิท',
      };
      await updateUserPersona(ctx.user.id, persona);
    }

    return {
      reply_text: parsed.reply_text || 'มีอะไรให้ตั้งค่าเพิ่มเติมไหมคะ?',
    };
  } catch (error) {
    console.error('❌ Onboarding Error:', error);
    return {
      reply_text: 'ระบบตั้งค่ามีปัญหาเล็กน้อยค่ะ ลองพิมพ์ใหม่อีกครั้งนะคะ',
    };
  }
}
