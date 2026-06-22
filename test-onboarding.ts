import { env } from './src/config/env';
import supabase from './src/services/supabase';
import { handleOnboarding } from './src/handlers/onboarding';
import { MejaiContext, RelationshipStatus, RelationshipPath, SubscriptionTier } from './src/types';

async function runTest() {
  const mockCtx: MejaiContext = {
    user: {
      id: 'mock-id',
      line_user_id: 'mock-line',
      display_name: 'Test',
      subscription_tier: SubscriptionTier.FREE,
      message_count_today: 0,
      subscription_expiry: null,
      birthdate: null,
      created_at: '',
      updated_at: ''
    },
    relationship: {
      user_id: 'mock-id',
      affinity_score: 0,
      relationship_status: RelationshipStatus.STRANGER,
      relationship_path: RelationshipPath.NEUTRAL,
      personality_traits: {},
      affinity_gained_today: 0,
      affinity_reset_date: '',
      last_interacted_at: '',
      bot_name: 'เมใจ',
      bot_gender: 'female',
      bot_personality: 'ผู้ช่วย',
      is_onboarded: false
    },
    tier_config: {
      messages_per_day: 100,
      context_turns: 5,
      vision_enabled: true,
      horoscope_push: true
    },
    server_timestamp: new Date().toISOString()
  };

  console.log("Testing onboarding extraction...");
  const res = await handleOnboarding("อยากให้ชื่อ เอเลน เป็นผู้ชาย ดุดัน แต่แอบห่วงใย จากเรื่องผ่าพิภพไททัน", mockCtx);
  console.log(res);
}

runTest().catch(console.error);
