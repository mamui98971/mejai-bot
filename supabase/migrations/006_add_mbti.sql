-- Database Migration for MBTI Personality System
-- Please run this script in the Supabase SQL Editor

-- 1. Add 'mbti' column to the 'users' table (to store the user's MBTI type)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS mbti VARCHAR(4);

-- 2. Add 'bot_mbti' column to the 'user_relationships' table (to store the AI's MBTI type)
ALTER TABLE public.user_relationships 
ADD COLUMN IF NOT EXISTS bot_mbti VARCHAR(4);
