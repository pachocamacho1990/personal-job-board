-- Job Board Database Schema v3.10.0

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job metadata
    type VARCHAR(20) CHECK (type IN ('job', 'connection')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(20) CHECK (status IN ('interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected', 'archived')),
    origin VARCHAR(20) DEFAULT 'human',
    is_unseen BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    
    -- Core fields
    company VARCHAR(255),
    position VARCHAR(255),
    location VARCHAR(255),
    salary VARCHAR(100),
    
    -- Connection-specific fields
    contact_name VARCHAR(255),
    organization VARCHAR(255),
    
    -- Comments (supports markdown)
    comments TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- Trigger to auto-update updated_at on job updates
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Business Entities table
CREATE TABLE IF NOT EXISTS business_entities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Entity details
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('investor', 'vc', 'accelerator', 'connection')),
    status VARCHAR(50) CHECK (status IN ('researching', 'contacted', 'meeting', 'negotiation', 'signed', 'rejected', 'passed')),
    
    -- Contact info
    contact_person VARCHAR(255),
    email VARCHAR(255),
    website VARCHAR(255),
    location VARCHAR(255),
    
    -- Notes (supports markdown)
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast user queries on business_entities
CREATE INDEX IF NOT EXISTS idx_business_user_id ON business_entities(user_id);

-- Trigger to auto-update updated_at on business_entities updates
DROP TRIGGER IF EXISTS update_business_updated_at ON business_entities;
CREATE TRIGGER update_business_updated_at 
    BEFORE UPDATE ON business_entities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Job History table (Added in v2.1.0)
CREATE TABLE IF NOT EXISTS job_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);

-- Trigger function to log status changes
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

-- Trigger definition
DROP TRIGGER IF EXISTS trigger_log_job_status_change ON jobs;
CREATE TRIGGER trigger_log_job_status_change
    AFTER INSERT OR UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_job_status_change();

