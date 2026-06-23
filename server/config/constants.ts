// ============================================================
// PROJECT MEJAI — Constants & Configuration
// ============================================================

import { SubscriptionTier, RelationshipStatus, TierConfig } from '../types';

// --- Subscription Tier Limits ---
export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  [SubscriptionTier.FREE]: {
    messages_per_day: 20,
    context_turns: 5,
    vision_enabled: false,
    horoscope_push: false,
  },
  [SubscriptionTier.STANDARD]: {
    messages_per_day: 100,
    context_turns: 8,
    vision_enabled: true,
    horoscope_push: false,
  },
  [SubscriptionTier.PREMIUM]: {
    messages_per_day: Infinity,
    context_turns: 10,
    vision_enabled: true,
    horoscope_push: true,
  },
};

// --- Affinity Scoring Rules ---
export const AFFINITY = {
  POSITIVE_MIN: 1,
  POSITIVE_MAX: 3,
  NEGATIVE_HIT: -5,
  INACTIVITY_DECAY_PER_DAY: -2,
  INACTIVITY_THRESHOLD_HOURS: 48,
  DAILY_GAIN_CAP: 10,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
} as const;

// --- Relationship Status Thresholds ---
export const RELATIONSHIP_THRESHOLDS: { min: number; max: number; status: RelationshipStatus }[] = [
  { min: 0, max: 15, status: RelationshipStatus.STRANGER },
  { min: 16, max: 35, status: RelationshipStatus.ACQUAINTANCE },
  { min: 36, max: 60, status: RelationshipStatus.FRIEND },
  { min: 61, max: 85, status: RelationshipStatus.CLOSE_FRIEND },
  { min: 86, max: 100, status: RelationshipStatus.SOULMATE },
];

// --- Health Thresholds ---
export const HEALTH = {
  SODIUM_DAILY_CAP_MG: 2300,
  WATER_RETENTION_ALERT: true,
} as const;

// --- Regex Command Patterns (Internal Cost-Saving Shortcuts) ---
// These bypass AI intent classification entirely
// Users don't need to know these exist — natural language always works
export const COMMAND_PATTERNS = {
  EXPENSE_SUMMARY: /^\/(สรุปรายจ่าย|expenses?)$/i,
  SCHEDULE_LIST: /^[#\/](ตารางงาน|schedule)$/i,
  HOROSCOPE: /^\/(ดูดวง|horoscope)$/i,
  STATUS: /^\/(สถานะ|status)$/i,
  HELP: /^\/(help|ช่วยเหลือ)$/i,
} as const;

// --- Upsell Messages (Pre-cached, no AI cost) ---
export const UPSELL_MESSAGES = {
  VISION_BLOCKED: '[SYSTEM] ฟีเจอร์อ่านรูปภาพสงวนสิทธิ์เฉพาะสมาชิก Standard ขึ้นไป กรุณาอัปเกรดแพ็กเกจเพื่อปลดล็อกการใช้งาน',
  MESSAGE_LIMIT: '[SYSTEM] โควต้าข้อความรายวันของคุณหมดแล้ว กรุณาอัปเกรดแพ็กเกจเพื่อสนทนาต่อโดยไม่มีขีดจำกัด',
} as const;
