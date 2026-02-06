# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Version**: 3.6.0

A self-hosted career management platform with **Kanban boards** for tracking job applications AND business relationships. The application uses a **multi-user architecture** with JWT authentication, PostgreSQL database, and Docker-based deployment.

### Core Boards

1. **Job Board** (`/jobs.html`): Track job applications through 8 stages (Interested → Applied → Forgotten → Interview → Pending Next Step → Offer → Rejected → Archived)
2. **Business Board** (`/business.html`): Track professional relationships (Investors, VCs, Accelerators, Connections)
3. **Dashboard** (`/index.html`): Home view with upcoming interviews and AI match widgets
4. **Archive Vault** (Modal): View and restore archived jobs

### Core Entities

**Jobs Table** (`jobs`):
- **Jobs**: Traditional job applications with `company`, `position`, `location`, `salary` fields
- **Connections**: Networking opportunities with `contact_name`, `organization` fields
- Both share: `type`, `rating` (1-5 stars), `status`, `origin` (human/agent), `is_unseen`, `comments` (markdown)
- **Status Enum**: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`, `archived`

**Business Entities Table** (`business_entities`):
- **Investors**, **VCs**, **Accelerators**, **Connections**
- Fields: `name`, `type`, `status`, `contact_person`, `email`, `website`, `location`, `notes`
- Statuses: `researching`, `contacted`, `meeting`, `negotiation`, `signed`, `rejected`, `passed`

**Job History Table** (`job_history`):
- Automatically tracks all job status changes via PostgreSQL trigger
- Fields: `job_id`, `previous_status`, `new_status`, `changed_at`
- Powers the Journey Map visualization feature

## Architecture

### Three-Tier Stack

1. **Frontend** (`/public`): Vanilla JavaScript SPA
   - `index.html`: Dashboard (home after login)
   - `jobs.html`: Job Board Kanban
   - `business.html`: Business Board Kanban
   - `login.html`: Authentication page
   - `js/api.js`: REST API client with JWT token management
   - `js/shared/utils.js`: Shared utility functions (escapeHtml, formatRelativeTime, renderStars, etc.)
   - `js/shared/file-manager.js`: `createFileManager()` factory — file upload/preview/delete for both boards
   - `js/app.js`: Job Board logic (Kanban, drag-and-drop, Center Peek modal, Journey Map)
   - `js/business.js`: Business Board logic + compact view toggle
   - `js/dashboard.js`: Dashboard widget logic
   - `js/sidebar.js`: Navigation highlighting
   - `js/logout.js`: Logout modal handling
   - `js/auth.js`: Login/signup form handling
   - `css/layout.css`: Dashboard grid layout
   - `css/sidebar.css`: Navigation styles

2. **Backend** (`/server`): Node.js/Express API
   - `server.js`: Application entry point, middleware, route mounting
   - `routes/`:
     - `auth.routes.js`: POST /signup, /login, GET /me (with rate limiting)
     - `jobs.routes.js`: GET, POST, PUT, DELETE /jobs, GET /jobs/:id/history
     - `business.routes.js`: GET, POST, PUT, DELETE /business
     - `dashboard.routes.js`: GET /dashboard/summary
   - `controllers/`:
     - `auth.controller.js`: User authentication
     - `jobs.controller.js`: Job CRUD + history retrieval
     - `business.controller.js`: Business entity CRUD
     - `dashboard.controller.js`: Summary data aggregation
     - `files.factory.js`: Generic file controller factory (shared by jobs & business)
     - `files.controller.js`: Job file operations (thin wrapper using factory)
     - `business-files.controller.js`: Business file operations (thin wrapper using factory)
   - `middleware/`:
     - `auth.js`: JWT verification middleware
     - `errorHandler.js`: Global error handler
   - `config/`:
     - `db.js`: PostgreSQL connection pool (20 max connections)
     - `auth.js`: JWT/bcrypt configuration
   - `models/schema.sql`: Database schema with tables and triggers

3. **Infrastructure** (`docker-compose.yml`):
   - **postgres**: PostgreSQL 16 with persistent volume
   - **api**: Node.js backend (port 3000, health check at `/api/health`)
   - **nginx**: Reverse proxy serving frontend + proxying `/api` to backend (port 80)

### Authentication Flow

- JWT tokens issued on signup/login with 7-day expiration
- Frontend stores token in `localStorage` as `authToken`
- All protected routes require JWT via `authMiddleware`
- Token includes `userId` and `email` claims for user-specific data isolation
- 401 responses trigger automatic redirect to `/login.html`
- Rate limiting: 15 failed attempts per 15 minutes on auth routes

### Navigation Flow

1. User logs in → Redirects to Dashboard (`index.html`)
2. Dashboard shows: Upcoming Interviews, New AI Matches
3. Sidebar enables navigation: Dashboard ↔ Job Board ↔ Business Board
4. Focus Mode (Job Board): Toggle sidebar visibility for maximized workspace
5. Logout confirmation modal prevents accidental logouts

## Development Commands

### Starting the Application

```bash
# Start all services (database, API, nginx)
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up -d --build

# Stop services (data persists in volume)
docker-compose down
```

Access at `http://localhost/jobboard/` after startup.

### Backend Testing

```bash
cd server
npm test                    # Run Jest test suite
npm run dev                 # Start with nodemon for hot-reload
```

Tests cover:
- `auth.test.js`: Authentication flows, rate limiting
- `jobs.test.js`: Job CRUD, history endpoint, pending status
- `business.test.js`: Business entity CRUD + validation
- `dashboard.test.js`: Summary endpoint + error handling

### Database Access

```bash
# Connect to PostgreSQL container
docker exec -it jobboard-db psql -U jobboard_user -d jobboard

# View data
SELECT * FROM users;
SELECT * FROM jobs WHERE user_id = 1;
SELECT * FROM business_entities WHERE user_id = 1;
SELECT * FROM job_history WHERE job_id = 1;
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Get current user |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/jobs/:id/history` | Get job status change history |

### Business Entities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/business` | List all entities |
| POST | `/api/business` | Create entity |
| PUT | `/api/business/:id` | Update entity |
| DELETE | `/api/business/:id` | Delete entity |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Get interviews + AI matches |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health status |

## Key Technical Details

### Database Schema

**jobs table**:
- Uses CHECK constraints for `type`, `rating`, `status`, `origin` validation
- Status values: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`
- `updated_at` auto-updates via PostgreSQL trigger
- `origin` field: 'human' (default) or 'agent' (AI-created)
- `is_unseen` field: true for agent-created jobs not yet viewed

**job_history table**:
- Automatically populated by `trigger_log_job_status_change` on INSERT/UPDATE
- Tracks `previous_status`, `new_status`, `changed_at` for each status change
- Cascades delete when parent job is deleted

**business_entities table**:
- `type`: investor, vc, accelerator, connection
- `status`: researching, contacted, meeting, negotiation, signed, rejected, passed
- User ownership enforced via `user_id` foreign key

### Frontend State Management

- Global arrays: `jobs[]` for Job Board, `entities[]` for Business Board
- CRUD operations update local state optimistically, then sync with API
- localStorage keys:
  - `authToken`: JWT token
  - `user`: User object (JSON)
  - `isCompactView`: Job Board view preference
  - `businessBoardCompactView`: Business Board view preference
  - `focusMode`: Focus Mode state (sidebar hidden)
- Sidebar navigation highlighting via `sidebar.js`

### Color-Coded Columns

Both boards use `data-status` attributes for CSS styling:
- Job Board: interested (purple), applied (blue), forgotten (gray), interview (orange), pending (amber), offer (green), rejected (dark gray)
- Business Board: researching (indigo), contacted (cyan), meeting (violet), negotiation (orange), signed (green)

### UI Interaction Patterns

**Job Board Card Interactions**:
1. Click card → Opens **Center Peek modal** (read-only view with Journey Map)
2. Click "Edit Details" in Center Peek → Opens **Edit Panel** (right sidebar)
3. Drag card → Updates status via API

**Journey Map**:
- SVG visualization showing job status progression over time
- Displays all 7 status columns with connecting lines between transitions
- Timestamps shown at each status change node
- Automatically populated from `job_history` table

**Focus Mode**:
- Toggle via focus button in Job Board header
- Hides sidebar for maximum board space
- State persisted to localStorage

## Important Patterns

### Adding New Fields to Jobs

1. Update `server/models/schema.sql` with new column
2. Modify `server/controllers/jobs.controller.js` CRUD operations
3. Update frontend form in `public/jobs.html`
4. Add field to `public/js/app.js` form serialization and rendering

### Adding New Fields to Business Entities

1. Update `server/models/schema.sql` business_entities table
2. Modify `server/controllers/business.controller.js` CRUD operations
3. Update frontend form in `public/business.html`
4. Add field to `public/js/business.js` form handling and card rendering

### Adding New Job Status

1. Update CHECK constraint in `server/models/schema.sql` for jobs table
2. Add column HTML in `public/jobs.html` with appropriate `data-status`
3. Add column rendering in `public/js/app.js` `renderBoard()` function
4. Add column styling in `public/styles.css`
5. Update Journey Map column mapping in `app.js`

### Adding New Routes

1. Create route in `server/routes/*.routes.js`
2. Implement controller in `server/controllers/*.controller.js`
3. Apply `authMiddleware` if route requires authentication
4. Register route in `server/server.js`
5. Add corresponding API method in `public/js/api.js`

### Security Considerations

- Never bypass `authMiddleware` for user-specific data endpoints
- Always filter queries by `req.userId` from JWT claims
- Use parameterized queries to prevent SQL injection
- Helmet.js and CORS configured in `server.js`
- Rate limiting on auth routes (15 failed attempts per 15 min)

## Recent Changes (v3.6.x)

### v3.6.0
- **Refactor**: Consolidated backend file controllers into `files.factory.js` factory pattern
- **Refactor**: Extracted shared frontend modules (`shared/utils.js`, `shared/file-manager.js`)
- **Fix**: Business board file downloads now include auth token
- `app.js` reduced from 1,343 → 1,101 lines; `business.js` from 619 → 349 lines

### v3.2.0
- **Archive Vault**: Added functionality to archive/restore jobs.
- **UI**: Added custom confirmation modals and updated Journey Map.
- **Fixes**: Resolved dropdown status issues and Chrome dialog bugs.

### v3.1.2
- Fixed Docker health check URL (`/health` → `/api/health`)

### v3.1.1
- Improved rate limiter to only count failed attempts (4xx/5xx)
- Increased limit from 5 to 15 failed attempts per 15 minutes

### v3.1.0
- Added "Pending Next Step" status column (7th stage)
- Added Job History tracking with PostgreSQL trigger
- Added Journey Map visualization (SVG timeline in Center Peek modal)
- Added Center Peek modal (view-only mode on card click)
- Added Focus Mode (toggle sidebar visibility)
- Added `GET /api/jobs/:id/history` endpoint

---

## Codebase Analysis for Refactoring

> [!NOTE]
> This section provides guidance for AI assistants analyzing this codebase for efficiency improvements and refactoring.

### File Size & Complexity Overview

| File | Lines | Concerns |
|------|-------|----------|
| `public/js/app.js` | ~1,100 | Still the largest — Kanban, modals, drag-drop, Journey Map, Archive Vault |
| `public/js/business.js` | ~350 | Board-specific logic only (entity CRUD, cards, drag-drop) |
| `public/js/shared/file-manager.js` | ~280 | Shared file operations factory (used by both boards) |
| `public/js/shared/utils.js` | ~74 | Pure utility functions (shared across boards) |
| `public/js/api.js` | 296 | REST API client |
| `server/controllers/files.factory.js` | ~162 | Generic file controller factory (shared by jobs & business) |
| `server/controllers/files.controller.js` | ~10 | Thin wrapper using factory |
| `server/controllers/business-files.controller.js` | ~10 | Thin wrapper using factory |

### Known Complexity Areas

**1. `app.js` (~1,100 lines)**
- Still the largest file — handles Kanban rendering, drag-and-drop, Center Peek, Journey Map, Archive Vault
- Contains nested function overrides (`originalOpenJobDetails` pattern)
- File management now delegated to `shared/file-manager.js`

**2. Remaining Board Logic Duplication**
- Both `app.js` and `business.js` still implement their own: `setupEventListeners()`, `renderBoard()`, `createCard()`, drag-drop
- These differ meaningfully between boards, making further extraction non-trivial

### Technical Debt

- [x] ~~**Consolidate file controllers**~~ — Done: `files.factory.js` factory pattern
- [x] ~~**Extract shared file management**~~ — Done: `shared/file-manager.js` factory
- [x] ~~**Extract shared utilities**~~ — Done: `shared/utils.js`

- [ ] **Split `app.js`** further into focused modules:
  - `journey-map.js` - SVG rendering for status timeline (~140 lines)
  - `archive-vault.js` - Archive modal logic (~160 lines)
  - `center-peek.js` - Center Peek modal (~80 lines)

- [ ] **Abstract shared board logic** into a `BoardBase` class or module:
  - Both boards share: event setup patterns, card rendering, drag-drop
  - Could use composition or inheritance pattern

- [ ] **TypeScript consideration**: No type safety - all validation is manual/runtime

- [ ] **State management**: Global arrays (`jobs[]`, `entities[]`) with no structure

### Current Module Structure

```
public/js/
├── shared/
│   ├── utils.js              # Pure utilities (escapeHtml, formatRelativeTime, renderStars, etc.)
│   └── file-manager.js       # createFileManager() factory for file operations
├── api.js                    # REST API client
├── app.js                    # Job Board (Kanban, Center Peek, Journey Map, Archive Vault)
├── business.js               # Business Board (entity CRUD, cards, drag-drop)
├── dashboard.js              # Dashboard widgets
├── sidebar.js                # Navigation highlighting
├── logout.js                 # Logout modal
└── auth.js                   # Login/signup

server/controllers/
├── files.factory.js           # Generic file controller factory
├── files.controller.js        # Job file ops (thin wrapper)
├── business-files.controller.js # Business file ops (thin wrapper)
├── jobs.controller.js         # Job CRUD
├── business.controller.js     # Business entity CRUD
├── auth.controller.js         # Authentication
└── dashboard.controller.js    # Summary data
```

### Data Flow & Dependencies

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐     ┌───────────┐     ┌───────────────┐          │
│  │ auth.js   │     │ api.js    │     │ sidebar.js    │          │
│  │ (login)   │────▶│ (REST)    │     │ (navigation)  │          │
│  └───────────┘     └─────┬─────┘     └───────────────┘          │
│                          │                                       │
│              ┌───────────┼───────────┐                           │
│              ▼           ▼           ▼                           │
│  ┌──────────────┐ ┌───────────┐ ┌──────────────┐                │
│  │ dashboard.js │ │  app.js   │ │ business.js  │                │
│  │ (widgets)    │ │(job board)│ │ (biz board)  │                │
│  └──────────────┘ └─────┬─────┘ └──────┬───────┘                │
│                         │              │                         │
│                         ▼              ▼                         │
│                  ┌─────────────────────────────┐                 │
│                  │      shared/utils.js        │                 │
│                  │   shared/file-manager.js    │                 │
│                  └─────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼ REST API
┌──────────────────────────────────────────────────────────────────┐
│                          BACKEND                                 │
├──────────────────────────────────────────────────────────────────┤
│  server.js ─── routes/*.routes.js ─── controllers/*.controller  │
│                                              │                   │
│                                       files.factory.js           │
│                                              │                   │
│                                       middleware/auth.js         │
│                                              │                   │
│                                        config/db.js              │
│                                              ▼                   │
└──────────────────────────────── PostgreSQL (jobs, entities) ─────┘
```

### Performance Considerations

- **Large DOM operations**: `renderAllJobs()` and `renderBoard()` re-render all cards on any change
- **No virtual scrolling**: Could impact performance with 100+ cards per column
- **File preview**: PDFs and images loaded fully in modal, consider lazy loading
- **N+1 queries**: Loading job history on Center Peek open is efficient, but bulk loading could help

### Entry Points for Analysis

When analyzing this codebase, start with:
1. `public/js/app.js:init()` - Job Board initialization flow
2. `public/js/business.js:DOMContentLoaded` - Business Board init
3. `server/server.js` - API route mounting
4. `server/models/schema.sql` - Database schema and triggers
