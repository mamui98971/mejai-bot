-- ============================================================
-- PROJECT MEJAI — Database Schema v1.0
-- Target: Supabase (Managed PostgreSQL)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE USERS TABLE
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_user_id VARCHAR UNIQUE NOT NULL,
    display_name VARCHAR,
    subscription_tier VARCHAR DEFAULT 'free' 
        CHECK (subscription_tier IN ('free', 'standard', 'premium')),
    message_count_today INT DEFAULT 0,
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    birthdate DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for LINE webhook user lookups
CREATE INDEX idx_users_line_user_id ON users(line_user_id);

-- ============================================================
-- 2. RELATIONSHIP & PERSONA ENGINE
-- ============================================================
CREATE TABLE user_relationships (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    affinity_score INT DEFAULT 0 
        CHECK (affinity_score >= 0 AND affinity_score <= 100),
    relationship_status VARCHAR DEFAULT 'stranger'
        CHECK (relationship_status IN ('stranger', 'acquaintance', 'friend', 'close_friend', 'soulmate')),
    relationship_path VARCHAR DEFAULT 'neutral'
        CHECK (relationship_path IN ('neutral', 'romantic', 'friendly')),
    personality_traits JSONB DEFAULT '{}'::jsonb,
    affinity_gained_today INT DEFAULT 0,
    affinity_reset_date DATE DEFAULT CURRENT_DATE,
    last_interacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id)
);

-- ============================================================
-- 3. DATA LAKE — Expenses, Nutrition, Schedule
-- ============================================================
CREATE TABLE user_data_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    log_type VARCHAR NOT NULL 
        CHECK (log_type IN ('expense', 'diet', 'schedule')),
    payload JSONB NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Composite index for efficient queries by user + type + time range
CREATE INDEX idx_data_logs_user_type_date 
    ON user_data_logs(user_id, log_type, logged_at DESC);

-- ============================================================
-- 4. CONVERSATION HISTORY
-- ============================================================
CREATE TABLE conversation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fetching recent conversation turns per user
CREATE INDEX idx_conversation_user_time 
    ON conversation_history(user_id, created_at DESC);

-- ============================================================
-- 5. AUTO-UPDATE TRIGGER for users.updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (backend server access)
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON user_relationships
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON user_data_logs
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON conversation_history
    FOR ALL USING (auth.role() = 'service_role');
