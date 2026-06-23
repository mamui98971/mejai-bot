import { chat } from './deepseek';
import supabase from './supabase';
import { ConversationEntry } from '../types';

/**
 * The Ledger of Shadows: Memory Compressor
 * Reads the last N messages and the current memory summary, 
 * then extracts new permanent facts and rewrites the summary.
 */
export async function compressMemory(
  userId: string,
  currentSummary: string,
  history: ConversationEntry[]
): Promise<void> {
  if (history.length === 0) return;

  // Format history into a readable transcript
  const transcript = history
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  const systemPrompt = `You are the Memory Compressor for an AI companion.
Your job is to read the recent conversation transcript and the EXISTING memory summary about the user, then produce an UPDATED memory summary.
Extract ONLY permanent facts about the user (e.g., likes, dislikes, profession, pets, relationship events, dietary preferences).
DO NOT include transient information (e.g., what they ate today, temporary feelings, or random small talk).
Keep the summary as a concise paragraph or a short bulleted list.

EXISTING MEMORY SUMMARY:
${currentSummary || 'None'}

RECENT CONVERSATION TRANSCRIPT:
${transcript}

Output ONLY the updated memory summary. Do not output conversational text.`;

  try {
    const newSummary = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Update the memory summary.' }
      ],
      { temperature: 0.3, max_tokens: 300 }
    );

    // Save back to database
    await supabase
      .from('user_relationships')
      .update({ memory_summary: newSummary.trim() })
      .eq('user_id', userId);

    console.log(`[Ledger of Shadows] Memory compressed for user ${userId}`);
  } catch (error) {
    console.error(`[Ledger of Shadows] Failed to compress memory:`, error);
  }
}
