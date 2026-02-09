-- Migration: Add is_locked column to jobs table
-- Version: 3.5.0
-- Date: 2026-02-09

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
