// ============================================================
// PROJECT MEJAI — Supabase Client & Data Access Layer
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import {
  User,
  UserRelationship,
  DataLog,
  ConversationEntry,
  ConversationRole,
  LogType,
  RelationshipStatus,
  RelationshipPath,
  SubscriptionTier,
} from '../types';

// Singleton client using service_role key (backend-only, bypasses RLS)
const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;

// ============================================================
// USER OPERATIONS
// ============================================================

/**
 * Find or create a user by their LINE user ID.
 * Returns the user record + relationship in one round trip.
 */
export async function findOrCreateUser(
  lineUserId: string,
  displayName?: string
): Promise<{ user: User; relationship: UserRelationship }> {
  // Try to find existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();

  let user: User;

  if (existingUser) {
    user = existingUser as User;
    // Update display name if changed
    if (displayName && displayName !== user.display_name) {
      await supabase
        .from('users')
        .update({ display_name: displayName })
        .eq('id', user.id);
      user.display_name = displayName;
    }
  } else {
    // Create new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        line_user_id: lineUserId,
        display_name: displayName || null,
        subscription_tier: SubscriptionTier.FREE,
      })
      .select()
      .single();

    if (error || !newUser) throw new Error(`Failed to create user: ${error?.message}`);
    user = newUser as User;

    // Initialize relationship record
    await supabase.from('user_relationships').insert({
      user_id: user.id,
      affinity_score: 0,
      relationship_status: RelationshipStatus.STRANGER,
      relationship_path: RelationshipPath.NEUTRAL,
    });
  }

  // Fetch relationship
  const { data: relationship } = await supabase
    .from('user_relationships')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return {
    user,
    relationship: relationship as UserRelationship,
  };
}

/**
 * Increment the user's daily message count.
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  await supabase.rpc('increment_message_count', { target_user_id: userId });
}

// ============================================================
// CONVERSATION HISTORY
// ============================================================

/**
 * Save a conversation turn.
 */
export async function saveConversationTurn(
  userId: string,
  role: ConversationRole,
  content: string
): Promise<void> {
  await supabase.from('conversation_history').insert({
    user_id: userId,
    role,
    content,
  });
}

/**
 * Get recent conversation history for context window.
 */
export async function getConversationHistory(
  userId: string,
  limit: number
): Promise<ConversationEntry[]> {
  const { data } = await supabase
    .from('conversation_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Reverse to chronological order
  return ((data as ConversationEntry[]) || []).reverse();
}

// ============================================================
// DATA LOGS (Expenses, Diet, Schedule)
// ============================================================

/**
 * Insert a data log entry.
 */
export async function insertDataLog(
  userId: string,
  logType: LogType,
  payload: Record<string, unknown>
): Promise<DataLog> {
  const { data, error } = await supabase
    .from('user_data_logs')
    .insert({
      user_id: userId,
      log_type: logType,
      payload,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to insert log: ${error?.message}`);
  return data as DataLog;
}

/**
 * Query data logs by type within a date range.
 */
export async function queryDataLogs(
  userId: string,
  logType: LogType,
  startDate: string,
  endDate: string
): Promise<DataLog[]> {
  const { data } = await supabase
    .from('user_data_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_type', logType)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)
    .order('logged_at', { ascending: false });

  return (data as DataLog[]) || [];
}

// ============================================================
// RELATIONSHIP
// ============================================================

/**
 * Update affinity score with daily cap enforcement.
 */
export async function updateAffinityScore(
  userId: string,
  delta: number
): Promise<UserRelationship> {
  const { data: rel } = await supabase
    .from('user_relationships')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!rel) throw new Error('Relationship record not found');
  const current = rel as UserRelationship;

  // Reset daily counter if new day
  const today = new Date().toISOString().split('T')[0];
  let gainedToday = current.affinity_gained_today;
  if (current.affinity_reset_date !== today) {
    gainedToday = 0;
  }

  // Apply delta with cap
  let effectiveDelta = delta;
  if (delta > 0) {
    const remainingCap = 10 - gainedToday;
    if (remainingCap <= 0) effectiveDelta = 0;
    else effectiveDelta = Math.min(delta, remainingCap);
    gainedToday += effectiveDelta;
  }

  const newScore = Math.max(0, Math.min(100, current.affinity_score + effectiveDelta));

  const { data: updated, error } = await supabase
    .from('user_relationships')
    .update({
      affinity_score: newScore,
      affinity_gained_today: gainedToday,
      affinity_reset_date: today,
      last_interacted_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !updated) throw new Error(`Failed to update affinity: ${error?.message}`);
  return updated as UserRelationship;
}

/**
 * Update the user's custom persona settings and mark them as onboarded.
 */
export async function updateUserPersona(
  userId: string,
  persona: { bot_name: string; bot_gender: string; bot_personality: string }
): Promise<UserRelationship> {
  const { data, error } = await supabase
    .from('user_relationships')
    .update({
      bot_name: persona.bot_name,
      bot_gender: persona.bot_gender,
      bot_personality: persona.bot_personality,
      is_onboarded: true,
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to update persona: ${error?.message}`);
  return data as UserRelationship;
}
