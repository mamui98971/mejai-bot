// ============================================================
// PROJECT MEJAI — Profile Update Handler
// Extracts metrics (weight, height, goal) from chat and updates DB
// ============================================================

import { MejaiContext, HandlerResult, DeepSeekMessage, ConversationRole } from '../types';
import { chat } from '../services/deepseek';
import { updateUserSettings, getConversationHistory, saveConversationTurn } from '../services/supabase';
import { buildMessages } from '../services/promptBuilder';

export async function handleProfileUpdate(
  text: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  const systemPrompt = `You are a data extractor for a Thai fitness/personal assistant chatbot.
The user's current profile:
Weight: ${ctx.user.weight || 'unknown'} kg
Height: ${ctx.user.height || 'unknown'} cm
Goal: ${ctx.user.goal || 'unknown'} (options: ผอม, สมส่วน, อ้วน)
MBTI: ${ctx.user.mbti || 'unknown'}

Extract any updated metrics or personality types from the user's message.
Respond ONLY with a JSON object containing the keys 'weight' (number or null), 'height' (number or null), 'goal' ("ผอม" | "สมส่วน" | "อ้วน" | null), and 'mbti' (string or null).
If a metric is not mentioned, return null for that key.
Do not convert units unless obviously necessary. Assume kg and cm.
For MBTI, it must be exactly 4 letters (e.g. INTJ, ENFP).`;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  let extracted: { weight: number | null; height: number | null; goal: string | null; mbti: string | null } = { weight: null, height: null, goal: null, mbti: null };

  try {
    const response = await chat(messages, {
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });
    extracted = JSON.parse(response);
  } catch (err) {
    console.error('Failed to extract profile data:', err);
  }

  const hasUpdates = extracted.weight !== null || extracted.height !== null || extracted.goal !== null || extracted.mbti !== null;

  if (hasUpdates) {
    const updatedUser = {
      weight: extracted.weight ?? ctx.user.weight,
      height: extracted.height ?? ctx.user.height,
      goal: (extracted.goal as any) ?? ctx.user.goal,
      mbti: extracted.mbti ?? ctx.user.mbti,
    };

    try {
      await updateUserSettings(ctx.user.id, updatedUser, {}); // aiPersona is empty {} because we only update user profile here
      
      // Inject context into the roleplay so it can respond appropriately
      const systemContext = `[SYSTEM MESSAGE]: You successfully updated the user's profile in the database.
Updates made:
${extracted.weight ? `- Weight updated to ${extracted.weight} kg` : ''}
${extracted.height ? `- Height updated to ${extracted.height} cm` : ''}
${extracted.goal ? `- Goal updated to ${extracted.goal}` : ''}
${extracted.mbti ? `- MBTI updated to ${extracted.mbti}` : ''}
Respond naturally to the user acknowledging this update and giving them encouragement or a playful remark depending on your persona. Do not talk like a robot.`;

      const history = await getConversationHistory(ctx.user.id, ctx.tier_config.context_turns);
      const chatMessages = buildMessages(ctx, history, text) as DeepSeekMessage[];
      chatMessages.push({ role: 'system', content: systemContext });

      const finalReply = await chat(chatMessages, { temperature: 0.85, max_tokens: 512 });
      
      await saveConversationTurn(ctx.user.id, ConversationRole.USER, text);
      await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, finalReply);

      return { reply_text: finalReply };
      
    } catch (err) {
      console.error('Failed to update user profile in DB:', err);
      return { reply_text: 'ระบบขัดข้องนิดหน่อยนะคะ เลยยังไม่ได้อัปเดตข้อมูลให้ ลองบอกใหม่อีกทีน้า' };
    }
  } else {
    // If we failed to extract anything, fallback to regular roleplay
    const history = await getConversationHistory(ctx.user.id, ctx.tier_config.context_turns);
    const chatMessages = buildMessages(ctx, history, text) as DeepSeekMessage[];
    const finalReply = await chat(chatMessages, { temperature: 0.85, max_tokens: 512 });
    
    await saveConversationTurn(ctx.user.id, ConversationRole.USER, text);
    await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, finalReply);

    return { reply_text: finalReply };
  }
}
