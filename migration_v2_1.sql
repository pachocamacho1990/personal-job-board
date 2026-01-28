-- Migration v2.1.0: Advanced Job Tracking

-- 1. Update 'status' check constraint to include 'pending'
-- Note: modifying check constraints in Postgres usually involves dropping and recreating
ALTER TABLE jobs DROP CONSTRAINT jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check 
    CHECK (status IN ('interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected'));

-- 2. Create job_history table
CREATE TABLE IF NOT EXISTS job_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create Index
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);

-- 4. Create Trigger Function
CREATE OR REPLACE FUNCTION log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO job_history (job_id, previous_status, new_status, changed_at)
        VALUES (NEW.id, NULL, NEW.status, NOW());
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO job_history (job_id, previous_status, new_status, changed_at)
            VALUES (NEW.id, OLD.status, NEW.status, NOW());
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 5. Create Trigger
DROP TRIGGER IF EXISTS trigger_log_job_status_change ON jobs;
CREATE TRIGGER trigger_log_job_status_change
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_job_status_change();
