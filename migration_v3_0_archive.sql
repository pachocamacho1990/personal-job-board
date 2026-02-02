-- Migration v3.0.0: Archive Vault
-- Adds 'archived' to the allowed status values for jobs

BEGIN;

-- 1. Drop the existing check constraint
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;

-- 2. Add the new check constraint including 'archived'
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected', 'archived'));

COMMIT;
