-- Migration: Add career strategy and search prompt columns to agent_profiles
-- Version: v3.11.0

ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS career_strategy JSONB DEFAULT '{}'::jsonb;
ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS search_prompt TEXT;
