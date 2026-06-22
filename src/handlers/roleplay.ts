// ============================================================
// PROJECT MEJAI — Roleplay Handler (Pillar 5)
// The soul of Mejai. Handles all general conversation.
// When no other intent matches, this is where the magic happens.
// ============================================================

import { chat } from '../services/deepseek';
import { buildMessages } from '../services/promptBuilder';
import {
  getConversationHistory,
  saveConversationTurn,
} from '../services/supabase';
import { MejaiContext, HandlerResult, ConversationRole } from '../types';

/**
 * Handle a roleplay/general conversation message.
 * This is the default handler when no specific intent is detected.
 */
export async function handleRoleplay(
  message: string,
  ctx: MejaiContext
): Promise<HandlerResult> {
  // Fetch conversation history based on tier limit
  const history = await getConversationHistory(
    ctx.user.id,
    ctx.tier_config.context_turns
  );

  // Build full message array with system prompt + history + current
  const messages = buildMessages(ctx, history, message);

  // Call DeepSeek for Mejai's response
  const response = await chat(messages, {
    temperature: 0.85,
    max_tokens: 512,
  });

  // Save both turns to conversation history
  await saveConversationTurn(ctx.user.id, ConversationRole.USER, message);
  await saveConversationTurn(ctx.user.id, ConversationRole.ASSISTANT, response);

  return {
    reply_text: response,
  };
}
