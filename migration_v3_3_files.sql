-- Migration: Add job_files table for file attachments
-- Version: 3.3.0
-- Date: 2026-02-04

CREATE TABLE IF NOT EXISTS job_files (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,          -- Stored filename (UUID-based)
    original_name VARCHAR(255) NOT NULL,     -- Original upload filename
    mimetype VARCHAR(100) NOT NULL,          -- MIME type (e.g., application/pdf)
    size INTEGER NOT NULL,                   -- File size in bytes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by job_id
CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);
