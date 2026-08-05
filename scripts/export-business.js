#!/usr/bin/env node

/**
 * Export the real Business Board data so it can be imported into Cassimir
 * Management Center. Reads straight from Postgres — the API is not involved.
 *
 * Only rows owned by --user (default 1) are exported. Everything else in
 * business_entities was seeded by scripts/contrast-sweep.py, which leaves 12
 * rows behind on a test account every time it runs.
 *
 * Usage: node scripts/export-business.js [--user 1] [--out business-export.json]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const USER_ID = parseInt(argValue('--user', '1'), 10);
const OUT_FILE = path.resolve(process.cwd(), argValue('--out', 'business-export.json'));
const UPLOADS_DIR = path.resolve(__dirname, '..', 'server', 'uploads');
const FILES_DIR = path.join(path.dirname(OUT_FILE), 'business-export-files');

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'jobboard',
    user: process.env.DB_USER || 'jobboard_user',
    password: process.env.DB_PASSWORD,
});

const sha256 = (file) =>
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
    await client.connect();

    const { rows: entities } = await client.query(
        `SELECT id, name, type, status, contact_person, email, website, location,
                notes, created_at, updated_at
           FROM business_entities
          WHERE user_id = $1
          ORDER BY id`,
        [USER_ID]
    );

    if (entities.length === 0) {
        console.error(`No business entities found for user_id=${USER_ID}. Nothing exported.`);
        process.exit(1);
    }

    const { rows: files } = await client.query(
        `SELECT f.id, f.entity_id, f.filename, f.original_name, f.mimetype, f.size, f.created_at
           FROM business_entity_files f
           JOIN business_entities e ON e.id = f.entity_id
          WHERE e.user_id = $1
          ORDER BY f.id`,
        [USER_ID]
    );

    // Copy the attachments next to the JSON and record a checksum for each, so the
    // import side can prove it received the same bytes.
    fs.mkdirSync(FILES_DIR, { recursive: true });
    const missing = [];

    for (const file of files) {
        const source = path.join(UPLOADS_DIR, file.filename);
        if (!fs.existsSync(source)) {
            missing.push(file.filename);
            file.sha256 = null;
            continue;
        }
        fs.copyFileSync(source, path.join(FILES_DIR, file.filename));
        file.sha256 = sha256(source);
    }

    const payload = {
        exported_at: new Date().toISOString(),
        source: 'personal-job-board/business_entities',
        source_user_id: USER_ID,
        files_dir: path.basename(FILES_DIR),
        entities,
        files,
    };

    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));

    console.log(`Exported ${entities.length} entities and ${files.length} attachments.`);
    console.log(`  JSON:  ${OUT_FILE}`);
    console.log(`  Files: ${FILES_DIR}`);
    for (const e of entities) {
        console.log(`  - [${e.id}] ${e.name} (${e.type}/${e.status})`);
    }
    if (missing.length) {
        console.error(`\nWARNING: ${missing.length} attachment(s) missing from ${UPLOADS_DIR}:`);
        missing.forEach((f) => console.error(`  - ${f}`));
        process.exitCode = 2;
    }

    await client.end();
}

main().catch(async (err) => {
    console.error(err);
    await client.end().catch(() => {});
    process.exit(1);
});
