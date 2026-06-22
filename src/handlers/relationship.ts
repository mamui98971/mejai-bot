// ============================================================
// PROJECT MEJAI — Relationship Handler (Pillar 9)
// Manages affinity score and persona tone adaptation.
// ============================================================

import { chat } from '../services/deepseek';
import { updateAffinityScore, saveConversationTurn } from '../services/supabase';
import { buildSystemPrompt } from '../services/promptBuilder';
import {
  MejaiContext,
  HandlerResult,
  RelationshipStatus,
  ConversationRole,
} from '../types';
import { AFFINITY, RELATIONSHIP_THRESHOLDS } from '../config/constants';
import supabase from '../services/supabase';

/**
 * Handle relationship status check.
 */
export async function handleStatusCheck(
  ctx: MejaiContext
): Promise<HandlerResult> {
  const score = ctx.relationship.affinity_score;
  const status = ctx.relationship.relationship_status;

  const statusMap: Record<RelationshipStatus, string> = {
    [RelationshipStatus.STRANGER]: 'คนแปลกหน้า',
    [RelationshipStatus.ACQUAINTANCE]: 'คนรู้จัก',
    [RelationshipStatus.FRIEND]: 'เพื่อน',
    [RelationshipStatus.CLOSE_FRIEND]: 'เพื่อนสนิท',
    [RelationshipStatus.SOULMATE]: 'คนรู้ใจ',
  };

  const statusHint = `บอกผู้ใช้ว่าตอนนี้ระดับความสัมพันธ์คือ "${statusMap[status]}" (คะแนนความสนิท: ${score}/100) พูดอธิบายความรู้สึกที่มีต่อผู้ใช้ในระดับนี้อย่างน่ารัก`;

  const replyPrompt = [
    {
      role: 'system' as const,
      content: `${buildSystemPrompt(ctx)}\n\nCONTEXT: ${statusHint}`,
    },
    { role: 'user' as const, content: 'สถานะความสัมพันธ์ของเราตอนนี้เป็นยังไงบ้าง' },
  ];

  const reply = await chat(replyPrompt, { temperature: 0.8, max_tokens: 256 });
  return { reply_text: reply };
}

/**
 * Analyze sentiment of the conversation and update affinity.
 * To be called in the background after a roleplay message is handled.
 */
export async function processAffinityUpdate(
  message: string,
  ctx: MejaiContext
): Promise<void> {
  const prompt = [
    {
      role: 'system' as const,
      content: `Analyze the sentiment of the user's message towards the AI companion.
Respond ONLY in JSON format:
{
  "sentiment": "<positive|negative|neutral>",
  "reason": "<brief reason>"
}
Positive: Compliments, flirting, sustained polite chat.
Negative: Abuse, harsh words, insults.
Neutral: Normal commands, informational chat.`,
    },
    { role: 'user' as const, content: message },
  ];

  try {
    const raw = await chat(prompt, {
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(raw);
    let delta = 0;

    if (result.sentiment === 'positive') {
      // Randomly award 1 to 3 points
      delta = Math.floor(Math.random() * (AFFINITY.POSITIVE_MAX - AFFINITY.POSITIVE_MIN + 1)) + AFFINITY.POSITIVE_MIN;
    } else if (result.sentiment === 'negative') {
      delta = AFFINITY.NEGATIVE_HIT;
    }

    if (delta !== 0) {
      const updatedRel = await updateAffinityScore(ctx.user.id, delta);
      
      // Update relationship status if threshold crossed
      const newScore = updatedRel.affinity_score;
      const currentStatus = updatedRel.relationship_status;
      
      let newStatus = currentStatus;
      for (const threshold of RELATIONSHIP_THRESHOLDS) {
        if (newScore >= threshold.min && newScore <= threshold.max) {
          newStatus = threshold.status;
          break;
        }
      }
      
      if (newStatus !== currentStatus) {
        await supabase
          .from('user_relationships')
          .update({ relationship_status: newStatus })
          .eq('user_id', ctx.user.id);
        console.log(`💖 Relationship status upgraded for ${ctx.user.id}: ${currentStatus} -> ${newStatus}`);
      }
    }
  } catch (error) {
    console.error('❌ Affinity processing failed:', error);
  }
}
