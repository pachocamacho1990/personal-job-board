-- Migration: Add Zenith Agent Tables
-- Version: v3.7.0

CREATE TABLE IF NOT EXISTS agent_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    onboarding_status VARCHAR(50) DEFAULT 'uninitialized',
    profile_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    type VARCHAR(50) NOT NULL, -- 'chat', 'thinking', 'tool_call', 'tool_result', 'progress', 'suggestion', 'action'
    content TEXT NOT NULL,
    tool_name VARCHAR(255),
    tool_input JSONB,
    tool_output JSONB,
    progress_pct INTEGER,
    progress_steps JSONB,
    actions JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for quick message loading and profile lookup
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);
