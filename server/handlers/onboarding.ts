// ============================================================
// PROJECT MEJAI — Onboarding & Custom Persona Setup
// ============================================================

import { MejaiContext, HandlerResult, DeepSeekMessage, ConversationRole } from '../types';
import { chat } from '../services/deepseek';
import { updateUserPersona, getConversationHistory, saveConversationTurn } from '../services/supabase';

export async function handleOnboarding(
  userMessage: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const systemPrompt = `You are a strict but creative casting director and psychologist for a LINE chatbot.
The user wants to create a custom AI character persona (Name, Gender, Personality/Background).
Your goal is to interview the user, understand their exact needs, and set up the persona.

CRITICAL RULES (CLARIFICATION & CONFIRMATION):
1. If the user provides a brief or ambiguous name (e.g., "Ayanokoji", "Senku", "Gojo"), DO NOT immediately assume and create the character.
2. You MUST set "is_complete": false and ask for clarification in "reply_text".
   - Example: "หมายถึง อายาโนะโคจิ คิโยทากะ จาก Classroom of the Elite ใช่ไหมคะ? อยากให้ดึงนิสัยเย็นชามา 100% เลย หรืออยากปรับให้ซอฟต์ลงหน่อยไหม?"
3. Only set "is_complete": true when the user explicitly confirms or provides enough detail to lock in the character design.

When "is_complete" is true, you must provide a highly detailed "bot_personality" that expands on the character's background, catchphrases, tone, and traits. Also assign an accurate "bot_mbti" (4 letters).

Respond ONLY in JSON format:
{
  "is_complete": boolean,
  "extracted": {
    "bot_name": "string",
    "bot_gender": "female" | "male" | "other",
    "bot_age": number,
    "bot_personality": "string", // Detailed persona prompt if complete
    "bot_mbti": "string"
  },
  "reply_text": "string" // The message you send back to the user. If is_complete=false, act as the casting director asking questions. If is_complete=true, act FULLY IN CHARACTER of the newly created persona!
}`;

  try {
    // 1. Fetch recent conversation history (last 5 turns) to prevent "goldfish memory"
    const rawHistory = await getConversationHistory(ctx.user.id, 5);
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Append history
    for (const h of rawHistory) {
      messages.push({
        role: h.role === ConversationRole.USER ? 'user' : 'assistant',
        content: h.content
      });
    }

    // Append current message
    messages.push({ role: 'user', content: userMessage });
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
        bot_mbti: parsed.extracted.bot_mbti,
      };
      await updateUserPersona(ctx.user.id, persona);
    }

    const replyText = parsed.reply_text || 'การตั้งค่าเสร็จสมบูรณ์เรียบร้อย';

    // Save the conversation turns so the AI remembers this step
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, userMessage);
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, replyText);

    return {
      reply_text: replyText,
    };
  } catch (error) {
    console.error('❌ Onboarding Error:', error);
    return {
      reply_text: 'ระบบตั้งค่ามีปัญหาเล็กน้อย ลองพิมพ์ใหม่อีกครั้งนะ',
    };
  }
}
