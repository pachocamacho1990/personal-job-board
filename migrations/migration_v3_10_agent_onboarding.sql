-- Migration: Simplify agent onboarding status CHECK constraint and add new constraints
-- Version: v3.10.1

-- If the table already exists, let's add a CHECK constraint to enforce the simplified statuses:
-- 'uninitialized', 'interview_pending', 'interviewing', 'ready', 'searching'
ALTER TABLE agent_profiles DROP CONSTRAINT IF EXISTS chk_onboarding_status;

ALTER TABLE agent_profiles ADD CONSTRAINT chk_onboarding_status 
CHECK (onboarding_status IN ('uninitialized', 'interview_pending', 'interviewing', 'ready', 'searching'));
