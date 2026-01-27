# Job Board v3.0.0 - Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker & Docker Compose installed
- Tailscale (optional, for VPN access)

### 1. Create Environment File

```bash
cp .env.example .env
nano .env
```

Update with secure values:
- `DB_PASSWORD`: Strong database password
- `JWT_SECRET`: Run `openssl rand -base64 64` and paste result

### 2. Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database (port 5432)
- Node.js API (port 3000)
- Nginx web server (port 80)

### 3. Verify

```bash
# Check all containers running
docker-compose ps

# View logs
docker-compose logs -f

# Test health endpoint
curl http://localhost/jobboard/api/health
```

### 4. Access the Application

Open browser: **http://localhost/jobboard/**

You'll be redirected to login. Create an account to access:
- **Dashboard**: Home view with widgets
- **Job Board**: Track job applications
- **Business Board**: Track business relationships

## Database Schema

The database includes three main tables:

1. **users**: User accounts with hashed passwords
2. **jobs**: Job applications and connections
3. **business_entities**: Business relationships (v3.0.0+)

On first start, the schema is auto-initialized from `server/models/schema.sql`.

### Running Migrations

If upgrading from v2.x, the `business_entities` table needs to be created:

```bash
# Connect to database
docker-compose exec postgres psql -U jobboard_user -d jobboard

# Run migration (if not auto-created)
CREATE TABLE business_entities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'connection',
    status VARCHAR(50) DEFAULT 'researching',
    contact_person VARCHAR(255),
    email VARCHAR(255),
    website VARCHAR(255),
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U jobboard_user -d jobboard

# View users
SELECT id, email, created_at FROM users;

# View jobs
SELECT id, company, status FROM jobs WHERE user_id = 1;

# View business entities
SELECT id, name, type, status FROM business_entities WHERE user_id = 1;

# Backup
docker-compose exec postgres pg_dump -U jobboard_user jobboard > backup.sql

# Restore
docker-compose exec -T postgres psql -U jobboard_user jobboard < backup.sql
```

## Updating

```bash
git pull
docker-compose down
docker-compose up -d --build
```

## Tailscale Access

```bash
# Get Tailscale IP
tailscale ip -4

# Access from any Tailscale device
http://<tailscale-ip>/jobboard/
```

## Troubleshooting

**Containers won't start:**
```bash
docker-compose logs api
docker-compose logs postgres
```

**Database connection errors:**
```bash
docker-compose exec postgres pg_isready -U jobboard_user
docker-compose restart postgres
```

**Reset everything (⚠️ deletes all data):**
```bash
docker-compose down -v
docker-compose up -d
```

## Development

```bash
# Install API dependencies
cd server && npm install

# Run API in dev mode
npm run dev

# Run tests
npm test

# Frontend changes - just refresh browser
```

## Project Structure

```
.
├── docker-compose.yml           # Multi-container setup
├── .env                         # Environment variables (secrets)
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── public/                     # Frontend files
│   ├── index.html              # Dashboard (home)
│   ├── jobs.html               # Job Board
│   ├── business.html           # Business Board
│   ├── login.html              # Authentication
│   ├── styles.css              # Main stylesheet
│   ├── css/
│   │   ├── layout.css          # Dashboard layout
│   │   └── sidebar.css         # Navigation styles
│   └── js/
│       ├── api.js              # API client
│       ├── app.js              # Job Board logic
│       ├── business.js         # Business Board logic
│       ├── dashboard.js        # Dashboard widgets
│       ├── sidebar.js          # Navigation
│       ├── logout.js           # Logout modal
│       └── auth.js             # Authentication UI
├── scripts/
│   ├── export-from-localstorage.js
│   └── import-to-database.js
└── server/                     # Backend API
    ├── Dockerfile
    ├── server.js               # Express app
    ├── config/                 # DB & auth config
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── jobs.controller.js
    │   ├── business.controller.js
    │   └── dashboard.controller.js
    ├── middleware/             # Auth & error handling
    ├── models/                 # Database schema
    ├── routes/
    │   ├── auth.routes.js
    │   ├── jobs.routes.js
    │   ├── business.routes.js
    │   └── dashboard.routes.js
    └── tests/
        ├── auth.test.js
        ├── jobs.test.js
        ├── business.test.js
        └── dashboard.test.js
```

## Security Notes

- `.env` contains secrets - never commit to git
- JWT tokens expire after 7 days
- Rate limiting: 5 login attempts per 15 minutes
- PostgreSQL only accessible within Docker network
- Tailscale provides encrypted VPN tunnel
- All data endpoints require authenticated JWT

## Data Migration (v1 to v3)

For migrating from the old localStorage-based version:

1. Export data: Run code from `scripts/export-from-localstorage.js` in browser console
2. Import to database:
   ```bash
   node scripts/import-to-database.js migration-data.json user@email.com password
   ```

Note: This only migrates jobs. Business entities are a new feature in v3.0.0.
