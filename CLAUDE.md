# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A self-hosted Kanban board for tracking job applications and networking opportunities. The application uses a **multi-user architecture** with JWT authentication, PostgreSQL database, and Docker-based deployment.

### Core Entities

The system handles two entity types stored in a unified `jobs` table:
- **Jobs**: Traditional job applications with `company`, `position`, `location`, `salary` fields
- **Connections**: Networking opportunities with `contact_name`, `organization` fields

Both share common attributes: `type`, `rating` (1-5 stars), `status` (interested, applied, forgotten, interview, offer, rejected), and `comments` (markdown-supported).

## Architecture

### Three-Tier Stack

1. **Frontend** (`/public`): Vanilla JavaScript SPA
   - `js/api.js`: REST API client with JWT token management
   - `js/app.js`: Core application logic (Kanban rendering, drag-and-drop, CRUD)
   - `js/auth.js`: Login/signup form handling
   - `index.html`: Main Kanban board UI
   - `login.html`: Authentication page

2. **Backend** (`/server`): Node.js/Express API
   - `server.js`: Application entry point, middleware configuration, route mounting
   - `routes/`: Express route definitions
     - `auth.routes.js`: POST /signup, /login, GET /me
     - `jobs.routes.js`: GET, POST, PUT, DELETE /jobs (all authenticated)
   - `controllers/`: Business logic for routes
   - `middleware/auth.js`: JWT verification middleware (extracts `userId` from token)
   - `config/db.js`: PostgreSQL connection pool
   - `models/schema.sql`: Database schema with auto-updated timestamps

3. **Infrastructure** (`docker-compose.yml`):
   - **postgres**: PostgreSQL 16 with persistent volume (`postgres_data`)
   - **api**: Node.js backend (port 3000)
   - **nginx**: Reverse proxy serving frontend + proxying `/api` to backend (port 80)

### Authentication Flow

- JWT tokens issued on signup/login with 7-day expiration (configurable via `JWT_EXPIRES_IN`)
- Frontend stores token in `localStorage` as `authToken`
- All `/api/jobs/*` routes require JWT via `authMiddleware`
- Token includes `userId` and `email` claims for user-specific data isolation
- 401 responses trigger automatic redirect to `/login.html` (handled in `js/api.js`)

### Data Isolation

All queries in `jobs.controller.js` filter by `user_id` from JWT token to ensure users only access their own data. The database enforces cascade deletion: deleting a user removes all associated jobs.

## Development Commands

### Starting the Application

```bash
# Start all services (database, API, nginx)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services (data persists in volume)
docker-compose down
```

Access the application at `http://localhost` after startup.

### Backend Testing

```bash
cd server
npm test                    # Run Jest test suite
npm run dev                 # Start with nodemon for hot-reload
```

Tests cover authentication, authorization, CRUD operations, and multi-user data isolation. See `server/tests/` for test files.

### Database Access

```bash
# Connect to PostgreSQL container
docker exec -it jobboard-db psql -U jobboard_user -d jobboard

# Common queries
SELECT * FROM users;
SELECT * FROM jobs WHERE user_id = 1;
```

### Environment Configuration

Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Required variables:
- `DB_PASSWORD`: PostgreSQL password
- `JWT_SECRET`: Secret for JWT signing (generate with `openssl rand -base64 64`)

### Data Migration (v1 to v2)

For migrating from the old localStorage-based version:

1. Export data: Run code from `scripts/export-from-localstorage.js` in browser console
2. Import to database:
   ```bash
   node scripts/import-to-database.js migration-data.json user@email.com password
   ```

## Key Technical Details

### Sorting Logic

Jobs are sorted by date (calendar day) FIRST, then by star rating within each day. Implementation in `public/js/app.js` uses a composite sort key. When modifying sort behavior, maintain this two-tier sorting.

### Database Schema Notes

- The `jobs` table uses CHECK constraints for `type`, `rating`, and `status` validation
- `updated_at` automatically updates via PostgreSQL trigger (`update_jobs_updated_at`)
- Schema is automatically initialized on first container startup via `/docker-entrypoint-initdb.d/schema.sql`

### Frontend State Management

- Global `jobs` array holds all jobs in memory (loaded once on page load)
- CRUD operations update local state optimistically, then sync with API
- No framework used - direct DOM manipulation via `renderAllJobs()` function

### API Error Handling

- Backend uses centralized error handler (`middleware/errorHandler.js`)
- Frontend `api.js` automatically handles 401s by clearing token and redirecting
- All API responses follow JSON format: `{ data }` for success, `{ error }` for failures

## Important Patterns

### Adding New Job Fields

1. Update `server/models/schema.sql` with new column
2. Modify `server/controllers/jobs.controller.js` to handle field in CRUD operations
3. Update frontend form in `public/index.html`
4. Add field to `public/js/app.js` in form serialization and rendering logic

### Adding New Routes

1. Create route in `server/routes/*.routes.js`
2. Implement controller in `server/controllers/*.controller.js`
3. Apply `authMiddleware` if route requires authentication
4. Add corresponding API method in `public/js/api.js`

### Security Considerations

- Never bypass `authMiddleware` for user-specific data endpoints
- Always filter queries by `req.userId` from JWT claims
- Use parameterized queries in controllers to prevent SQL injection
- Helmet.js and CORS are configured in `server.js` - maintain these security headers
