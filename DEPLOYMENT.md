# Multi-User Job Board - Deployment Guide

## Quick Start with Docker

### Prerequisites
- Docker & Docker Compose installed
- Tailscale (for VPN access)

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
curl http://localhost/api/health
```

### 4. Tailscale Access

```bash
# Get Tailscale IP
tailscale ip -4

# Access from any Tailscale device
http://<tailscale-ip>
```

## Data Migration from v1 (localStorage)

### Export from Old Version (v1)

1. Open the old version at `http://localhost:8089`
2. Open browser console (F12 → Console)
3. Paste contents of `scripts/export-from-localstorage.js`
4. Press Enter - data will auto-download as JSON

### Import to New Version (v2)

1. Create account in v2 at `http://localhost/login.html`
2. Run import script:

```bash
cd scripts
node import-to-database.js ../migration-data.json your@email.com yourpassword
```

## Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U jobboard_user -d jobboard

# View users
SELECT id, email, created_at FROM users;

# View jobs
SELECT * FROM jobs;

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

# Frontend changes - just refresh browser
```

## Project Structure

```
.
├── docker-compose.yml       # Multi-container setup
├── .env                     # Environment variables (secrets)
├── nginx/
│   └── nginx.conf          # Reverse proxy config
├── public/                 # Frontend files
│   ├── index.html
│   ├── login.html
│   ├── styles.css
│   └── js/
│       ├── api.js          # API client
│       ├── app.js          # Main app logic
│       └── auth.js         # Authentication UI
├── scripts/
│   ├── export-from-localstorage.js
│   └── import-to-database.js
└── server/                 # Backend API
    ├── Dockerfile
    ├── server.js           # Express app
    ├── config/             # DB & auth config
    ├── controllers/        # Business logic
    ├── middleware/         # Auth & error handling
    ├── models/             # Database schema
    └── routes/             # API endpoints
```

## Security Notes

- `.env` contains secrets - never commit to git
- JWT tokens expire after 7 days
- Rate limiting: 5 login attempts per 15 minutes
- PostgreSQL only accessible within Docker network
- Tailscale provides encrypted VPN tunnel

## Next Steps

- Set up automated backups
- Configure monitoring (Docker logs)
- Add SSL certificate (when going public)
- Customize authentication (OAuth, password reset)
