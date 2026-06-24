// ============================================================
// PROJECT MEJAI — Type Definitions
// ============================================================

// --- Enums ---

export enum SubscriptionTier {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum LogType {
  EXPENSE = 'expense',
  DIET = 'diet',
  SCHEDULE = 'schedule',
}

export enum RelationshipStatus {
  STRANGER = 'stranger',
  ACQUAINTANCE = 'acquaintance',
  FRIEND = 'friend',
  CLOSE_FRIEND = 'close_friend',
  SOULMATE = 'soulmate',
}

export enum RelationshipPath {
  NEUTRAL = 'neutral',
  ROMANTIC = 'romantic',
  FRIENDLY = 'friendly',
}

export enum Intent {
  HOROSCOPE = 'horoscope',
  SCHEDULE_CREATE = 'schedule_create',
  SCHEDULE_LIST = 'schedule_list',
  SCHEDULE_DONE = 'schedule_done',
  EXPENSE_LOG = 'expense_log',
  EXPENSE_SUMMARY = 'expense_summary',
  NUTRITION_LOG = 'nutrition_log',
  NUTRITION_SUMMARY = 'nutrition_summary',
  UPDATE_PROFILE = 'update_profile',
  ROLEPLAY = 'roleplay',
  STATUS_CHECK = 'status_check',
  VISION_RECEIPT = 'vision_receipt',
  VISION_FOOD = 'vision_food',
  RESET_PERSONA = 'reset_persona',
  RESET_PERSONA_CONFIRM = 'reset_persona_confirm',
  UNKNOWN = 'unknown',
}

export enum ConversationRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

// --- Database Models ---

export interface User {
  id: string;
  line_user_id: string;
  display_name: string;
  subscription_tier: SubscriptionTier;
  message_count_today: number;
  subscription_expiry?: string;
  birthdate?: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  goal?: 'ผอม' | 'สมส่วน' | 'อ้วน';
  monthly_budget?: number;
  created_at: string;
  updated_at: string;
}

export interface UserRelationship {
  user_id: string;
  affinity_score: number;
  relationship_status: RelationshipStatus;
  relationship_path: RelationshipPath;
  personality_traits: Record<string, unknown>;
  affinity_gained_today: number;
  affinity_reset_date: string;
  last_interacted_at: string;
  bot_name: string;
  bot_gender: string;
  bot_age: number;
  bot_personality: string;
  is_onboarded: boolean;
  memory_summary: string;
}

export interface DataLog {
  id: string;
  user_id: string;
  log_type: LogType;
  payload: ExpensePayload | DietPayload | SchedulePayload;
  logged_at: string;
}

export interface ConversationEntry {
  id: string;
  user_id: string;
  role: ConversationRole;
  content: string;
  created_at: string;
}

// --- Payload Types ---

export interface ExpensePayload {
  amount: number;
  category: string;
  merchant: string | null;
  description: string | null;
  date: string;
}

export interface DietPayload {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sodium: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface SchedulePayload {
  title: string;
  datetime_iso: string;
  reminder_before_minutes: number | null;
  is_recurring: boolean;
  recurrence_pattern?: string;
}

// --- Service Types ---

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | DeepSeekContentPart[];
}

export interface DeepSeekContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  extracted_data?: Record<string, unknown>;
  raw_response?: string;
}

export interface HandlerResult {
  reply_text: string;
  flex_message?: unknown;
  quick_replies?: string[];
}

// --- Tier Configuration ---

export interface TierConfig {
  messages_per_day: number;
  context_turns: number;
  vision_enabled: boolean;
  horoscope_push: boolean;
}

// --- Request Context ---

export interface MejaiContext {
  user: User;
  relationship: UserRelationship;
  tier_config: TierConfig;
  server_timestamp: string;
}
