// ============================================================
// PROJECT MEJAI — Environment Configuration
// Validates all required env vars at startup. Fail fast.
// ============================================================

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // LINE
  LINE_CHANNEL_ID: z.string().min(1, 'LINE_CHANNEL_ID is required'),
  LINE_CHANNEL_SECRET: z.string().min(1, 'LINE_CHANNEL_SECRET is required'),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, 'LINE_CHANNEL_ACCESS_TOKEN is required'),
  LINE_LIFF_ID: z.string().optional().default(''),

  // DeepSeek
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_CHAT_MODEL: z.string().default('deepseek-chat'),
  DEEPSEEK_VISION_MODEL: z.string().default('deepseek-chat'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Payment (optional until Phase 6)
  OMISE_PUBLIC_KEY: z.string().optional().default(''),
  OMISE_SECRET_KEY: z.string().optional().default(''),

  // Vercel cron requests must present this secret in the Authorization header.
  CRON_SECRET: z.string().optional().default(''),

  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment validation failed:');
    for (const issue of result.error.issues) {
      console.error(`   → ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (result.data.NODE_ENV === 'production' && !result.data.CRON_SECRET) {
    console.error('❌ Environment validation failed: CRON_SECRET is required in production');
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
