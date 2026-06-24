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

  const systemPrompt = `You are the "Ledger of Shadows" Memory Compressor for a highly advanced adult roleplay AI companion.
Your job is to read the recent conversation transcript and the EXISTING memory summary about the user, then produce an UPDATED memory summary AND analyze the user's detailed personality traits.

You must output STRICTLY in JSON format with two keys: "summary" (string) and "traits" (object).

1. "summary": A concise paragraph extracting everyday mundane facts, deep/dark secrets, AND specifically capturing any "RECENT MICRO-DETAIL" (e.g., user is sick today, waiting for a parcel, just woke up). Prefix these specific minor details with "RECENT MICRO-DETAIL:" so the bot can mention them naturally in the next chat. DO NOT include conversational filler.
2. "traits": A detailed psychological and behavioral profile of the user based on the transcript. Rate or describe the following attributes clearly:
  - "dominance": Level of dominance (e.g., Submissive, Switch, Dominant, Master)
  - "flirtatiousness": How flirty or sexually forward they are (e.g., Shy, Teasing, Aggressive, Horny)
  - "politeness": How polite, crude, or formal they are (e.g., Formal, Casual, Crude, Abusive)
  - "emotional_state": Underlying emotional state (e.g., Lonely, Stressed, Horny, Playful, Angry)
  - "kink_level": Openness to taboo/extreme themes (e.g., Vanilla, Curious, Hardcore, Sadomasochistic)
  - "attachment_style": How they relate to the AI (e.g., Needy, Aloof, Protective, Possessive)
  - "conversation_style": (e.g., Brief, Descriptive, Demanding, Poetic)

EXISTING MEMORY SUMMARY:
${currentSummary || 'None'}

RECENT CONVERSATION TRANSCRIPT:
${transcript}

Output ONLY valid JSON.`;

  try {
    const response = await chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze the conversation and output the JSON.' }
      ],
      { 
        temperature: 0.4, 
        max_tokens: 800,
        response_format: { type: 'json_object' } 
      }
    );

    const parsed = JSON.parse(response);

    // Save back to database
    await supabase
      .from('user_relationships')
      .update({ 
        memory_summary: parsed.summary.trim(),
        personality_traits: parsed.traits
      })
      .eq('user_id', userId);

    console.log(`[Ledger of Shadows] Memory compressed & traits updated for user ${userId}`);
  } catch (error) {
    console.error(`[Ledger of Shadows] Failed to compress memory:`, error);
  }
}
