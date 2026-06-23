// ============================================================
// PROJECT MEJAI — Cron: Reset Daily Message Limits
// Runs at midnight (00:00) to reset message_count_today.
// ============================================================

import supabase from '../services/supabase';

export async function resetDailyLimits(): Promise<void> {
  console.log('🔄 Resetting daily message counts...');

  const { error } = await supabase
    .from('users')
    .update({ message_count_today: 0 })
    .gt('message_count_today', 0); // Only update users who sent messages

  if (error) {
    console.error('❌ Failed to reset daily limits:', error);
  } else {
    console.log('✅ Successfully reset daily limits.');
  }
}
