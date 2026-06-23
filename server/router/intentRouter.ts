// ============================================================
// PROJECT MEJAI — Intent Router
// Natural language first: Users just chat normally.
// Regex patterns are internal cost-saving shortcuts.
// ============================================================

import { matchCommand } from './commands';
import { classifyIntent } from '../services/deepseek';
import { getConversationHistory } from '../services/supabase';
import { MejaiContext, Intent, IntentResult } from '../types';

/**
 * Route a user's text message to the appropriate handler.
 *
 * Flow:
 * 1. Check regex command patterns (free, no AI call)
 * 2. If no match → ask DeepSeek to classify intent
 * 3. Return IntentResult for the webhook handler to dispatch
 */
export async function routeIntent(
  message: string,
  ctx: MejaiContext
): Promise<IntentResult> {
  // Step 1: Regex fast lane (zero cost)
  const commandMatch = matchCommand(message);
  if (commandMatch) {
    console.log(`⚡ Regex match: ${commandMatch}`);
    return {
      intent: commandMatch,
      confidence: 1.0,
    };
  }

  // Step 2: AI classification (costs tokens but handles natural language)
  const history = await getConversationHistory(
    ctx.user.id,
    3 // Use fewer turns for classification to save tokens
  );

  const recentContext = history
    .map((h) => `${h.role}: ${h.content}`)
    .join('\n');

  const result = await classifyIntent(message, recentContext);
  console.log(`🧠 AI classified: ${result.intent} (confidence: ${result.confidence})`);

  return result;
}

/**
 * Determine if a LINE event contains an image.
 */
export function isImageEvent(event: any): boolean {
  return event?.message?.type === 'image';
}

/**
 * Determine if a LINE event is a text message.
 */
export function isTextEvent(event: any): boolean {
  return event?.message?.type === 'text';
}

/**
 * Get text content from a LINE event.
 */
export function getEventText(event: any): string {
  return event?.message?.text?.trim() || '';
}
