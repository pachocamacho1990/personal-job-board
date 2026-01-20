#!/usr/bin/env node

/**
 * Import migration data from exported JSON file to database via API
 * Usage: node import-to-database.js <migration-data.json> <email> <password>
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost/api';

//Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.error('Usage: node import-to-database.js <json-file> <email> <password>');
    console.error('Example: node import-to-database.js migration-data.json user@example.com mypassword');
    process.exit(1);
}

const [jsonFile, email, password] = args;

// Read migration data
if (!fs.existsSync(jsonFile)) {
    console.error(`❌ File not found: ${jsonFile}`);
    process.exit(1);
}

const jobs = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

console.log(`\n=== Job Board Migration Import ===`);
console.log(`Found ${jobs.length} jobs to import\n`);

// Login and get token
async function login() {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.token;
}

// Import single job
async function importJob(job, token) {
    const jobData = {
        type: job.type || 'job',
        rating: job.rating || 3,
        status: job.status,
        company: job.company || '',
        position: job.position || '',
        location: job.location || '',
        salary: job.salary || '',
        contact_name: job.contactName || '',
        organization: job.organization || '',
        comments: job.comments || '',
        // Preserve original timestamps
        created_at: job.created_at || job.dateAdded || null,
        updated_at: job.updated_at || job.dateAdded || null
    };

    const response = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
    });

    if (!response.ok) {
        throw new Error(`Failed to import job: ${response.statusText}`);
    }

    return await response.json();
}

// Main migration function
async function migrate() {
    try {
        console.log('🔑 Logging in...');
        const token = await login();
        console.log('✓ Login successful\n');

        console.log('📤 Importing jobs...');
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            process.stdout.write(`  [${i + 1}/${jobs.length}] Importing "${job.position || job.contactName || 'Untitled'}"... `);

            try {
                await importJob(job, token);
                console.log('✓');
                successCount++;
            } catch (error) {
                console.log(`❌ ${error.message}`);
                errorCount++;
            }
        }

        console.log(`\n=== Migration Complete ===`);
        console.log(`✓ Successfully imported: ${successCount}`);
        if (errorCount > 0) {
            console.log(`❌ Failed: ${errorCount}`);
        }
        console.log(`\nLogin to your job board to verify the imported data.`);

    } catch (error) {
        console.error(`\n❌ Migration failed: ${error.message}`);
        process.exit(1);
    }
}

migrate();
