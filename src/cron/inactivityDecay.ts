// ============================================================
// PROJECT MEJAI — Cron: Inactivity Affinity Decay
// Decays affinity score if user hasn't interacted for > 48h.
// ============================================================

import supabase from '../services/supabase';
import { AFFINITY } from '../config/constants';

export async function processInactivityDecay(): Promise<void> {
  console.log('🥀 Running Inactivity Affinity Decay...');

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Find relationships where last_interacted_at is older than 48 hours
  const { data: inactiveRels, error } = await supabase
    .from('user_relationships')
    .select('*')
    .lt('last_interacted_at', fortyEightHoursAgo)
    .gt('affinity_score', 0); // Only decay if score > 0

  if (error || !inactiveRels) {
    console.error('❌ Failed to fetch inactive relationships:', error);
    return;
  }

  for (const rel of inactiveRels) {
    const newScore = Math.max(0, rel.affinity_score + AFFINITY.INACTIVITY_DECAY_PER_DAY);
    
    await supabase
      .from('user_relationships')
      .update({ affinity_score: newScore })
      .eq('user_id', rel.user_id);
      
    console.log(`🔻 Decayed affinity for user ${rel.user_id}: ${rel.affinity_score} -> ${newScore}`);
  }
}
