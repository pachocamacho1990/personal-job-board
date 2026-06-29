# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Version**: 3.10.0

A self-hosted career management platform supporting multiple **board instances** with **Kanban boards** for tracking job applications AND business relationships. The application uses a **multi-user architecture** with JWT authentication, PostgreSQL database, and Docker-based deployment.

### Core Boards

1. **Job Board** (`/jobs.html`): Track job applications through 8 stages (Interested → Applied → Forgotten → Interview → Pending Next Step → Offer → Rejected → Archived) across multiple isolated boards.
2. **Business Board** (`/business.html`): Track professional relationships (Investors, VCs, Accelerators, Connections).
3. **Dashboard** (`/index.html`): Home view with upcoming interviews and AI match widgets filtered by active board.
4. **Archive Vault** (Modal): View and restore archived jobs.

### Core Entities

**Boards Table** (`boards`):
- Tracks separate board instances owned by users.
- Fields: `id`, `user_id` (FK → users.id), `name` (e.g. "Mi Tablero"), `created_at`, `updated_at`.

**Jobs Table** (`jobs`):
- **Jobs**: Traditional job applications with `company`, `position`, `location`, `salary` fields.
- **Connections**: Networking opportunities with `contact_name`, `organization` fields.
- Both share: `type`, `rating` (1-5 stars), `status`, `origin` (human/agent), `is_unseen`, `comments` (markdown), and `board_id` (FK → boards.id) for board scoping.
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

1. **Frontend** (`/src`): React SPA with Vite multi-page architecture
   - `login.html`, `index.html` (Dashboard), `jobs.html` (Job Board), `business.html` (Business Board), `docs.html` (Documentation) in root pointing to corresponding React entry points in `src/pages/`.
   - `src/types.ts`: Common types and interfaces for the frontend.
   - `src/api.ts`: Strongly typed REST API client using Fetch.
   - `src/utils.ts`: Pure utility functions (formatting, validation).
   - `src/components/`: Reusable React components:
     - `Sidebar.tsx`: Navigation bar with active board indicators and boards submenu.
     - `DetailPanel.tsx`: Sidebar drawer for editing job application details, adding/removing attachments.
     - `BusinessDetailPanel.tsx`: Sidebar drawer for editing business entities and their attachments.
     - `JourneyMap.tsx`: SVG status progression map.
     - `CenterPeek.tsx`: Read-only modal with status transitions.
     - `ArchiveVault.tsx`: Modal for managing archived opportunities.
   - `src/pages/`: Page components and entries:
     - `login/main.tsx`: User registration/login flows.
     - `index/main.tsx`: Home dashboard with widgets.
     - `jobs/main.tsx`: Kanban-based board for job tracking.
     - `business/main.tsx`: Kanban-based board for business connections tracking.
     - `docs/main.tsx`: Documentation and API explorer.

2. **Backend, Testing & Migrations** (`/server`, `/migrations`, `/tests`):
   - `server.ts`: Application entry point using ESModules import/export and TypeScript.
   - `routes/`: Express routers written in TypeScript.
     - `auth.routes.ts`: Authentication endpoints (signup, login, me).
     - `boards.routes.ts`: Board CRUD operations.
     - `jobs.routes.ts`: Job application CRUD + transitions.
     - `business.routes.ts`: Business entity CRUD.
     - `dashboard.routes.ts`: Summary widgets query.
   - `controllers/`: Request handler controllers.
     - `auth.controller.ts`, `boards.controller.ts`, `jobs.controller.ts`, `business.controller.ts`, `dashboard.controller.ts`.
     - `files.factory.ts`: Shared controller factory for job and connection attachment uploads.
     - `files.controller.ts` & `business-files.controller.ts`: Wrappers for the files factory.
   - `middleware/`: Authentication and error handling middlewares.
   - `config/`: Database connection pool and JWT/auth configs.
   - `tests/`: Integration tests written in TypeScript (run via Jest/ts-jest).
   - `models/schema.sql`: Clean database schema initialization.
   - `migrations/`: Root folder for database migration scripts.
   - `tests/boards-ui.spec.js`: Playwright E2E browser test verifying board switching and isolation.

3. **Infrastructure** (`docker-compose.yml`):
   - **postgres**: PostgreSQL 16 container.
   - **api**: Node.js API container (port 3000, runs compiled code from `server/dist/server.js`).
   - **nginx**: Reverse proxy mapping frontend compiled assets from `dist/` to Port 80, and proxying `/api` requests to backend.


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
| POST | `/api/jobs/:id/transform` | Transform job to business connection |

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
- Status values: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`, `archived`
- `updated_at` auto-updates via PostgreSQL trigger
- `origin` field: 'human' (default) or 'agent' (AI-created)
- `is_unseen` field: true for agent-created jobs not yet viewed
- `is_locked` field: true for jobs transformed to business connections (non-editable, non-draggable)

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
- Displays all 8 status columns with connecting lines between transitions
- Timestamps shown at each status change node
- Automatically populated from `job_history` table

**Focus Mode**:
- Toggle via focus button in Job Board header
- Hides sidebar for maximum board space
- State persisted to localStorage

## Important Patterns

### Documentation Sync Requirement

- Every time a new feature, API route, database schema modification, or status value is added or updated, you **MUST** update [public/docs.html](file:///Users/pacho-home-server/personal-job-board/public/docs.html) to keep the User Guide and Agent/API Reference in perfect sync. This ensures both human users and external agent integrations have accurate information.

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
5. Update Journey Map column mapping in `shared/journey-map.js`

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

## Recent Changes (v3.10.x)

### v3.10.0
- **Feature**: Job to Business Connection Transformation
  - Transform button in Job Detail panel creates a linked Connection on the Business Board
  - Confirmation modal explains consequences before proceeding
  - All file attachments automatically copied to the new Business Connection
- **Locked State**: Transformed jobs become read-only with visual "ghosted" treatment (grayscale, reduced opacity, lock icon overlay)
  - Locked cards are non-draggable and non-editable
  - Opening a locked job shows a banner and disables all form inputs
- **Database**: `ALTER TABLE jobs ADD COLUMN is_locked BOOLEAN DEFAULT FALSE`
- **Endpoint**: `POST /api/jobs/:id/transform`
- **Tests**: 4 new tests for transformation flow (success, not found, already locked, rollback)

### v3.9.0
- **Refactor**: Extracted shared board behaviors into `shared/board-helpers.js` factory:
  - Drag-and-drop, view toggle, markdown preview, panel open/close, file queue processing, ESC key handling
  - Both boards now use `createBoardHelpers(config)` instead of duplicating these patterns
- **Bug Fix**: Business Board markdown preview was broken (`document.getElementById('comments')` returned `null` — textarea is `id="notes"`). Factory receives correct `textareaId: 'notes'`.
- **Result**: `app.js` reduced from 700 → 573 lines (18% reduction); `business.js` from 350 → 256 lines (27% reduction); new `board-helpers.js` ~221 lines

### v3.8.0
- **Refactor**: Split `app.js` into three focused modules:
  - `shared/journey-map.js` — SVG status timeline rendering (~115 lines)
  - `shared/center-peek.js` — read-only job detail modal (~115 lines)
  - `shared/archive-vault.js` — archive/restore modal (~175 lines)
- **Fix**: `updateColumnCounts` now includes all 8 statuses (`pending`, `archived` were missing)
- **Fix**: Removed dead `showArchiveConfirm()` reference from `setupEventListeners()`
- **Behavior**: Deep links (`?openJobId=`) now open Center Peek (consistent with card clicks)
- **Result**: `app.js` reduced from 1,101 → 700 lines (36% reduction)

### v3.7.0
- **Refactor**: DRY'd up `api.js` with `createCrudApi()` and `createFilesApi()` factory functions
- **Result**: `api.js` reduced from 296 → 141 lines (52% reduction), zero consumer changes

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
| `src/pages/jobs/main.tsx` | ~450 | Job Board core Kanban page, React states, and drag-and-drop logic |
| `src/pages/business/main.tsx` | ~250 | Business Board page |
| `src/components/DetailPanel.tsx` | ~580 | Large detail sidebar panel with fields, file uploads, and connection conversion logic |
| `src/components/BusinessDetailPanel.tsx` | ~480 | Business entity detail sidebar panel |
| `src/components/Sidebar.tsx` | ~160 | Workspace sidebar navigation |
| `src/components/JourneyMap.tsx` | ~100 | SVG status timeline rendering component |
| `src/components/CenterPeek.tsx` | ~110 | Read-only details view component |
| `src/components/ArchiveVault.tsx` | ~110 | Archive / restore operations dialog |
| `src/api.ts` | ~130 | REST API client wrapper with fully typed endpoints |
| `server/controllers/files.factory.ts` | ~160 | Generic file controller factory in TS |
| `server/server.ts` | ~100 | Express server entry point in TS |

### Technical Debt

- [x] ~~**TypeScript consideration**~~ — Done: Migrated entire backend and frontend to TypeScript, achieving strict type safety.
- [x] ~~**State management**~~ — Done: Global mutable arrays replaced with React states (optimistic updates, React component-scoped state, and clear reactivity).

### Current Module Structure

```
src/
├── components/
│   ├── ArchiveVault.tsx       # Archive / restore modal dialog component
│   ├── BusinessDetailPanel.tsx # Detail side panel drawer for business board
│   ├── CenterPeek.tsx         # Read-only job details modal
│   ├── DetailPanel.tsx        # Detail side panel drawer for jobs board (with transform button)
│   ├── JourneyMap.tsx         # SVG status progression timeline widget
│   └── Sidebar.tsx            # Left navigation sidebar with boards switcher
├── pages/
│   ├── business/
│   │   └── main.tsx           # Business Kanban board page
│   ├── docs/
│   │   └── main.tsx           # Documentation & API reference explorer page
│   ├── index/
│   │   └── main.tsx           # Main Dashboard widgets page
│   ├── jobs/
│   │   └── main.tsx           # Job Kanban board page
│   └── login/
│       └── main.tsx           # Login and Signup forms page
├── api.ts                     # Fully typed REST API client (Fetch wrapper)
├── types.ts                   # Unified types for Jobs, Boards, Entities, and Files
├── utils.ts                   # Shared UI/string helpers
└── vite-env.d.ts              # Vite client types registration (allows CSS/asset imports)

server/
├── config/
│   ├── auth.ts                # JWT config and settings
│   └── db.ts                  # PostgreSQL Pool configuration
├── controllers/
│   ├── auth.controller.ts     # User signup and login controller
│   ├── boards.controller.ts   # Board CRUD controller
│   ├── jobs.controller.ts     # Job CRUD controller
│   ├── business.controller.ts # Business connection CRUD controller
│   ├── dashboard.controller.ts # Summary widgets controller
│   ├── files.factory.ts       # Generic file upload/download/delete controller factory
│   ├── files.controller.ts    # Thin job files factory wrapper
│   └── business-files.controller.ts # Thin connection files factory wrapper
├── middleware/
│   ├── auth.ts                # JWT token validation middleware
│   └── errorHandler.ts        # Express global error handler middleware
├── routes/
│   ├── auth.routes.ts         # User auth routing
│   ├── boards.routes.ts       # Board CRUD routing
│   ├── jobs.routes.ts         # Job CRUD + file uploads + transform routing
│   ├── business.routes.ts     # Business connection CRUD + files routing
│   └── dashboard.routes.ts    # Dashboard widgets routing
├── tests/
│   └── [name].test.ts         # Backend unit/integration tests (Jest + ts-jest)
├── server.ts                  # Express server startup entry point
├── tsconfig.json              # Server TypeScript configuration
└── tsconfig.build.json        # TypeScript configuration for build (excludes tests)
```

### Data Flow & Dependencies

```
┌──────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React SPA)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐         ┌────────────────────────┐  │
│  │   src/pages/*/main.tsx  │ ◀─────▶ │       src/api.ts       │  │
│  │     (Page Component)    │         │     (REST Client)      │  │
│  └────────────┬────────────┘         └───────────┬────────────┘  │
│               │                                  │               │
│               ▼                                  │               │
│  ┌─────────────────────────┐                     │               │
│  │    src/components/*     │                     │               │
│  │   (Reusable Widgets)    │                     │               │
│  └────────────┬────────────┘                     │               │
│               │                                  │               │
│               ▼                                  │               │
│  ┌─────────────────────────┐                     │               │
│  │    src/utils.ts,        │                     │               │
│  │    src/types.ts         │                     │               │
│  └─────────────────────────┘                     │               │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                                                   ▼ REST API / JSON
┌──────────────────────────────────────────────────────────────────┐
│                          BACKEND (TypeScript)                    │
├──────────────────────────────────────────────────────────────────┤
│  server.ts ─── routes/*.ts ─── controllers/*.ts                  │
│                                      │                           │
│                               files.factory.ts                   │
│                                      │                           │
│                               middleware/auth.ts                 │
│                                      │                           │
│                                config/db.ts                      │
│                                      ▼                           │
│                        PostgreSQL Database                       │
└──────────────────────────────────────────────────────────────────┘
```

### Performance Considerations

- **React render cycle**: React optimizes DOM updates automatically, rendering only cards and columns that undergo actual state changes.
- **Vite Bundle Sizes**: Built with ESModule code splitting to ensure clean chunks (each under 200KB).
- **Optimistic UI Updates**: State updates are performed immediately locally for cards drag-and-drop to keep the UI snappy, then synchronized asynchronously via API calls.

### Entry Points for Analysis

When analyzing this codebase, start with:
1. `src/pages/jobs/main.tsx` - Job Board main logic and React layout.
2. `src/pages/index/main.tsx` - Home dashboard and widgets.
3. `server/server.ts` - Express router mounting and middleware setup.
4. `server/models/schema.sql` - Database schema tables and triggers.

