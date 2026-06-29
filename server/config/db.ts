import { Pool } from 'pg';

// PostgreSQL connection pool
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'jobboard',
    user: process.env.DB_USER || 'jobboard_user',
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
    console.error('Unexpected database error:', err);
    process.exit(-1);
});
