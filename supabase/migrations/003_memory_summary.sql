-- ============================================================
-- PROJECT MEJAI — Database Schema v1.2
-- Add Long-term Memory (The Ledger of Shadows)
-- ============================================================

ALTER TABLE user_relationships
ADD COLUMN memory_summary TEXT DEFAULT '';
