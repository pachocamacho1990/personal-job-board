-- Migration: Add Title Column to Agent Conversations
-- Version: v3.8.0

ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Nueva Conversación';
