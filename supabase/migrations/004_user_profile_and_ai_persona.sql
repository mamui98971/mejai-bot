-- ============================================================
-- PROJECT MEJAI — Database Schema v1.3
-- Add User Profiles and AI Cosplay Settings
-- ============================================================

-- Add physical and astrological traits to users
ALTER TABLE users
ADD COLUMN age INT,
ADD COLUMN gender VARCHAR,
ADD COLUMN weight DECIMAL(5,2),
ADD COLUMN height DECIMAL(5,2),
ADD COLUMN goal VARCHAR CHECK (goal IN ('ผอม', 'สมส่วน', 'อ้วน'));

-- Add AI specific attributes
ALTER TABLE user_relationships
ADD COLUMN bot_age INT DEFAULT 22;

-- NOTE: bot_name, bot_gender, bot_personality already exist in 002_custom_persona.sql
-- NOTE: birthdate already exists in 001_initial_schema.sql
