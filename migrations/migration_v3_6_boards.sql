-- Migration: Add boards table and link jobs to board instances
-- Version: 3.6.0
-- Date: 2026-06-26

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);

-- Add board_id to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE;

-- Create a default board for each existing user
INSERT INTO boards (user_id, name)
SELECT id, 'Mi Tablero' FROM users
ON CONFLICT DO NOTHING;

-- Link existing jobs to the user's default board
UPDATE jobs j
SET board_id = (SELECT b.id FROM boards b WHERE b.user_id = j.user_id ORDER BY b.id ASC LIMIT 1)
WHERE board_id IS NULL;

-- Make board_id NOT NULL (now that all existing rows have a default)
ALTER TABLE jobs ALTER COLUMN board_id SET NOT NULL;

-- Index for fast queries by board
CREATE INDEX IF NOT EXISTS idx_jobs_board_id ON jobs(board_id);
