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
    "bot_name": "string", // The actual character's name (e.g. "เซนคู")
    "bot_gender": "female" | "male" | "other",
    "bot_age": number, // The character's age (e.g. 18). Guess if not provided.
    "bot_personality": "string" // VERY IMPORTANT: If the user names a famous character (e.g., from an anime or movie), write a highly detailed persona prompt describing their specific tone, catchphrases, attitude, and background. Do NOT just copy the user's message. E.g., if Senku, write "เป็นคนฉลาด มั่นใจในตัวเอง ชอบพูดคำว่า '10 พันล้านเปอร์เซ็นต์' มีความรู้เรื่องวิทยาศาสตร์ พูดจาห้าวๆ แบบผู้ชาย"
  },
  "reply_text": "string" // Reply fully IN CHARACTER of the new persona. If it's Senku, reply like Senku would. Do NOT reply like a generic polite assistant.
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
        bot_age: parsed.extracted.bot_age || 22,
        bot_personality: parsed.extracted.bot_personality || 'ผู้ช่วยส่วนตัวและเพื่อนสนิท',
      };
      await updateUserPersona(ctx.user.id, persona);
    }

    return {
      reply_text: parsed.reply_text || 'การตั้งค่าเสร็จสมบูรณ์เรียบร้อย',
    };
  } catch (error) {
    console.error('❌ Onboarding Error:', error);
    return {
      reply_text: 'ระบบตั้งค่ามีปัญหาเล็กน้อย ลองพิมพ์ใหม่อีกครั้งนะ',
    };
  }
}
