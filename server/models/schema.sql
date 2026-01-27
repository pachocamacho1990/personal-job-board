-- Job Board Database Schema v2.0.0

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
    status VARCHAR(20) CHECK (status IN ('interested', 'applied', 'forgotten', 'interview', 'offer', 'rejected')),
    origin VARCHAR(20) DEFAULT 'human',
    is_unseen BOOLEAN DEFAULT FALSE,
    
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
