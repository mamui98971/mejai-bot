-- ============================================================
-- PROJECT MEJAI — Database Schema v1.1
-- Add Custom Persona & Onboarding fields
-- ============================================================

ALTER TABLE user_relationships
ADD COLUMN bot_name VARCHAR DEFAULT 'เมใจ',
ADD COLUMN bot_gender VARCHAR DEFAULT 'female',
ADD COLUMN bot_personality TEXT DEFAULT 'ผู้ช่วยส่วนตัวและเพื่อนสนิทที่คอยดูแลสุขภาพ การเงิน และตารางงานให้ผู้ใช้ นิสัยน่ารัก ขี้อ้อน และเอาใจใส่',
ADD COLUMN is_onboarded BOOLEAN DEFAULT false;
