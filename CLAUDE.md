# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Version**: 4.0.0

A self-hosted **career management platform**: professional profiling and job search, with an AI agent (Zenith) that works your profile against new postings. Multi-user, JWT authentication, PostgreSQL, Docker-based deployment.

> **The Business Board is no longer here.** It moved to its own repository and
> its own stack — Cassimir Management Center, `~/cassimir-management-center`, on
> port 8080. That app has its own database, its own `users` table and its own
> `JWT_SECRET`. The only remaining link is one outbound HTTP call: see
> [The Cassimir bridge](#the-cassimir-bridge). Do not add business, CRM or
> investor-tracking features to this repository.

### Core Boards

1. **Job Board** (`/jobs.html`): Track job applications through 8 stages (Interested → Applied → Forgotten → Interview → Pending Next Step → Offer → Rejected → Archived) across multiple isolated boards.
2. **Dashboard** (`/index.html`): Home view with upcoming interviews and AI match widgets filtered by active board.
4. **Archive Vault** (Modal): View and restore archived jobs.
5. **Professional Profile** (`/profile.html`): Manage experience, skills, and languages for Zenith AI Agent onboarding.

### Core Entities

**Boards Table** (`boards`):
- Tracks separate board instances owned by users.
- Fields: `id`, `user_id` (FK → users.id), `name` (e.g. "Mi Tablero"), `created_at`, `updated_at`.

**Jobs Table** (`jobs`):
- **Jobs**: Traditional job applications with `company`, `position`, `location`, `salary` fields.
- **Connections**: Networking opportunities with `contact_name`, `organization` fields.
- Both share: `type`, `rating` (1-5 stars), `status`, `origin` (human/agent), `is_unseen`, `comments` (markdown), and `board_id` (FK → boards.id) for board scoping.
- **Status Enum**: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`, `archived`

**Job History Table** (`job_history`):
- Automatically tracks all job status changes via PostgreSQL trigger
- Fields: `job_id`, `previous_status`, `new_status`, `changed_at`
- Powers the Journey Map visualization feature

## Architecture

### Three-Tier Stack

1. **Frontend** (`/src`): React SPA with Vite multi-page architecture
   - `login.html`, `index.html` (Dashboard), `jobs.html` (Job Board), `profile.html` (Profile), `docs.html` (Documentation) in root pointing to corresponding React entry points in `src/pages/`.
   - `src/types.ts`: Common types and interfaces for the frontend.
   - `src/api.ts`: Strongly typed REST API client using Fetch.
   - `src/utils.ts`: Pure utility functions (formatting, validation).
   - `src/components/`: Reusable React components:
     - `Sidebar.tsx`: Navigation bar with active board indicators and boards submenu.
     - `DetailPanel.tsx`: Sidebar drawer for editing job application details, adding/removing attachments.
     - `JourneyMap.tsx`: SVG status progression map.
     - `CenterPeek.tsx`: Read-only modal with status transitions.
     - `ArchiveVault.tsx`: Modal for managing archived opportunities.
   - `src/pages/`: Page components and entries:
     - `login/main.tsx`: User registration/login flows.
     - `index/main.tsx`: Home dashboard with widgets.
     - `jobs/main.tsx`: Kanban-based board for job tracking.
     - `docs/main.tsx`: Documentation and API explorer.

2. **Backend, Testing & Migrations** (`/server`, `/migrations`, `/tests`):
   - `server.ts`: Application entry point using ESModules import/export and TypeScript.
   - `routes/`: Express routers written in TypeScript.
     - `auth.routes.ts`: Authentication endpoints (signup, login, me).
     - `boards.routes.ts`: Board CRUD operations.
     - `jobs.routes.ts`: Job application CRUD + transitions.
     - `dashboard.routes.ts`: Summary widgets query.
   - `controllers/`: Request handler controllers.
     - `auth.controller.ts`, `boards.controller.ts`, `jobs.controller.ts`, `dashboard.controller.ts`.
     - `files.factory.ts`: Shared controller factory for job and connection attachment uploads.
     - `files.controller.ts`: Wrapper for the files factory.
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
3. Sidebar enables navigation: Dashboard ↔ Job Board ↔ Profile ↔ Docs
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
- `dashboard.test.js`: Summary endpoint + error handling

### Database Access

```bash
# Connect to PostgreSQL container
docker exec -it jobboard-db psql -U jobboard_user -d jobboard

# View data
SELECT * FROM users;
SELECT * FROM jobs WHERE user_id = 1;
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
| POST | `/api/jobs/:id/transform` | Push the job to Cassimir Management Center as an opportunity |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Get interviews + AI matches |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Fetch user's professional profile data |
| POST | `/api/profile` | Save professional profile data |

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
- `is_locked` field: true once the job has been pushed to Cassimir Management Center (non-editable, non-draggable)
- `external_opportunity_url` field: where that opportunity lives, so the locked card can link to it

**job_history table**:
- Automatically populated by `trigger_log_job_status_change` on INSERT/UPDATE
- Tracks `previous_status`, `new_status`, `changed_at` for each status change
- Cascades delete when parent job is deleted

### Frontend State Management

- Global arrays: `jobs[]` for the Job Board
- CRUD operations update local state optimistically, then sync with API
- localStorage keys:
  - `authToken`: JWT token
  - `user`: User object (JSON)
  - `viewPreference`: Job Board view preference (`compact` / `comfortable`)
  - `focusModePreference`: Focus Mode state (sidebar hidden)
  - `activeBoardId`: Currently selected board instance
  - `carbonTheme`: Active Carbon theme (`g10` light / `g100` dark)
- Sidebar navigation highlighting via `sidebar.js`

### Color-Coded Columns (Carbon status tokens)

The board still keys its styling off `data-status` attributes, but no stylesheet
holds a colour any more. Every status resolves through a **triplet of semantic
tokens** defined in `src/styles/theme.css`:

| Token | Applied to |
|-------|-----------|
| `--cds-status-<name>` | Column header accent bar + title, card left border |
| `--cds-status-<name>-header` | Tinted chips and blocks — **not** the column header |
| `--cds-status-<name>-surface` | Tinted chips and blocks — **not** the column body |

- Job Board statuses: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`

**The columns carry no hue fill** (PJBA-38). They used to: the header was tinted at
hue-20 and the whole body beneath it at hue-10, which across seven columns read as
too much colour. Carbon's layering model puts surfaces on grey and reserves hue for
accent, so the header is now `--cds-layer-01` with a 3px accent bar on its top edge,
the column body is transparent, and the status survives in that bar, the title, and
the card's left border.

The `-header` and `-surface` tokens still exist and are still correct — for small
tinted elements where a hue wash is the point: skill chips, the agent's thinking and
suggestion blocks. Do not reintroduce them as column fills.

Each triplet is defined **twice** — once under `:root` (g10, light) and once under
`[data-carbon-theme='g100']` (dark). The light theme tints toward white (accent at
the 70 stop, fills at 10/20); the dark theme inverts it (accent at 30, fills at
80/90) so the same status reads at the same strength in both. The accent stays at
70/30 rather than dropping to the more vivid 60: it is still the foreground on those
tinted chips, where 60 fails AA — that is why PJBA-13 raised it in the first place.

Rules when touching board styling:

1. Never write a hex, `rgb()` or `rgba()` in a page stylesheet — `src/styles/*.css`
   contains zero colour literals and that is enforced.
2. Never reach for an N1 primitive (`--cds-blue-60`) from a component stylesheet.
   Primitives are theme-independent by design, so a component that consumes one
   will not follow the theme switch. Consume N2 semantics only.
3. Adding a status means adding its triplet to **both** theme blocks. A token
   present only in g10 silently inherits its light value in dark mode.
4. Verify with `python3 scripts/check-tokens.py` (structure, g10/g100 parity, WCAG
   contrast). `python3 scripts/audit-undefined-tokens.py` catches `var()`
   references that resolve to nothing, and
   `python3 scripts/find-non-carbon-colors.py <file.css>` catches literals that
   slipped back in.

### Theming (g10 / g100)

- The active theme is a `data-carbon-theme` attribute on `<html>` (`g10` light,
  `g100` dark), applied by `src/theme.ts` before React mounts.
- Resolution order on first load: stored preference wins; otherwise
  `prefers-color-scheme`. Once the user chooses, the OS is no longer consulted.
- The toggle lives at the foot of the Sidebar and persists to
  `localStorage.carbonTheme`.
- Typography is **IBM Plex Sans** and **IBM Plex Mono**, linked from the `<head>`
  of each HTML entry — not via a CSS `@import`, which would block rendering.
- `src/styles/theme.css` is imported exactly once, from `src/main.tsx`. Do not
  import it anywhere else.

### Shared UI Components

- `src/components/Drawer.tsx` — the right-hand editing drawer shell shared by
  `DetailPanel` (aside, header, close button, Escape
  handling, with a `blockedBy` prop for layers stacked above it).
- `src/components/InlineNotification.tsx` — Carbon inline notification
  (`error | success | info | warning`). Colour lives entirely in the modifier
  class, so a caller cannot invent a kind that skips the contrast checks.

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

### Branching After a Merge (required)

Once a branch is merged, **never** start the next piece of work from the stale local
branch or from a local `main` that has not been refreshed. Always:

```bash
git checkout main
git pull
git checkout -b feature/<next-thing>
```

Merges on this repo are **rebase merges**, so the commits that land on `main` carry
different SHAs than the ones pushed to the feature branch. A branch cut from a stale
base therefore replays work that is already upstream and produces conflicts on the
next PR. Pulling first is what keeps history linear and each PR limited to its own
diff.

### Session Continuity (long-running work)

Long efforts are tracked in Linear (team `personal-job-board-app`, prefix `PJBA`) and
handed off between sessions through `.claude/handoffs/`:

- `CURRENT.md` — live state: where we stopped, the literal next step, gotchas.
- `DECISIONS.md` — append-only architectural decisions and discarded paths.
- `snapshots/` — mechanical dumps written by hooks (gitignored, emergency use only).

The `handoff` skill (`.claude/skills/handoff/`) owns this protocol. Invoke it in
`resume` mode when a handoff exists at session start, in `checkpoint` mode after
closing each Linear issue, and in `save` mode when wrapping up. A `SessionStart` hook
injects the open handoff automatically — but **verify it against the real repo state
before trusting it**.

### Documentation Sync Requirement

- Every time a new feature, API route, database schema modification, or status value is added or updated, you **MUST** update [public/docs.html](file:///Users/pacho-home-server/personal-job-board/public/docs.html) to keep the User Guide and Agent/API Reference in perfect sync. This ensures both human users and external agent integrations have accurate information.

### Adding New Fields to Jobs

1. Update `server/models/schema.sql` with new column
2. Modify `server/controllers/jobs.controller.js` CRUD operations
3. Update frontend form in `public/jobs.html`
4. Add field to `public/js/app.js` form serialization and rendering

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

### The Cassimir bridge

The one place this repository talks to another application.
`POST /api/jobs/:id/transform` — `server/controllers/jobs.controller.ts` — pushes
a job across to Cassimir Management Center as an opportunity.

**Configuration** (`docker-compose.yml`, service `api`):

```
CMC_API_URL=http://host.docker.internal:8080
CMC_INTEGRATION_TOKEN=<minted in the CMC repo>
```

Mint the token **there**, not here:
`node scripts/create-integration-token.js you@example.com jobboard`. It is stored
hashed on that side and printed once. It is deliberately **not** this app's
`JWT_SECRET`: sharing that would let a session token from one app authenticate
against the other, which is the coupling the split removed.

Leave both blank and the endpoint returns 503. Nothing else is affected.

**What changed and why it matters.** This used to be one local transaction with a
rollback, because `business_entities` was a table in this database. There is no
transaction spanning two databases, so two things replace it:

1. **Order** — CMC is written first, the local lock second. The reverse would
   leave a job marked "transformed" with nothing on the other side.
2. **Idempotency** — the request carries `external_ref: "jobboard:<id>"` and CMC
   returns the existing opportunity instead of creating a second one. So if the
   local lock fails after CMC succeeded, a retry converges.

If CMC is unreachable the endpoint is a **503 and nothing changes** — the job is
not locked and the user can retry. That degradation is what makes depending on a
second service acceptable. Attachments are forwarded best-effort afterwards: one
failed upload is logged, never rolled back, because the opportunity already
exists.

### Security Considerations

- Never bypass `authMiddleware` for user-specific data endpoints
- Always filter queries by `req.userId` from JWT claims
- Use parameterized queries to prevent SQL injection
- Helmet.js and CORS configured in `server.js`
- Rate limiting on auth routes (15 failed attempts per 15 min)

## Recent Changes

### v4.0.0 — the Business Board leaves
- **Split**: the Business Board moved to `~/cassimir-management-center` (Cassimir
  Management Center), with its own Postgres, `users` table, `JWT_SECRET` and
  compose stack on ports 8080/3001/5433. Its flat `business_entities` table was
  redesigned into `organizations` / `contacts` / `opportunities` / `activities`.
- **Removed here**: `business.html`, `src/pages/business/`,
  `BusinessDetailPanel.tsx`, the business controllers, routes and tests (18
  tests), the five business status token triplets in both theme blocks, and the
  Business Board sections of the docs page.
- **Rewired**: `POST /api/jobs/:id/transform` no longer writes
  `business_entities`. It calls CMC over HTTP with an idempotency key and
  degrades to 503 if CMC is down, leaving the job untouched. See
  [The Cassimir bridge](#the-cassimir-bridge).
- **Database**: `migrations/migration_v4_0_split_business.sql`. Part 1 adds
  `jobs.external_opportunity_url`; part 2 drops the two business tables and is
  the point of no return — run it only after the data is verified in CMC.
- **Fix**: `UPLOADS_DIR` was derived from `__dirname`, so it meant
  `server/uploads/` under ts-node and `server/dist/uploads/` once compiled.
  Nothing errored; only attachments stored before a deploy 404'd. Now anchored
  to the working directory with a `UPLOADS_DIR` override.
- **Rename**: `BusinessIcon` → `ConnectionIcon`. It marks job cards of
  `type: 'connection'`, which is a job-board concept and always was.

## Older changes (v3.10.x)

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
| `src/components/DetailPanel.tsx` | ~580 | Large detail sidebar panel with fields, file uploads, and connection conversion logic |
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
│   ├── CenterPeek.tsx         # Read-only job details modal
│   ├── DetailPanel.tsx        # Detail side panel drawer for jobs board (with the Cassimir transform button)
│   ├── JourneyMap.tsx         # SVG status progression timeline widget
│   └── Sidebar.tsx            # Left navigation sidebar with boards switcher
├── pages/
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
│   ├── dashboard.controller.ts # Summary widgets controller
│   ├── files.factory.ts       # Generic file upload/download/delete controller factory
│   ├── files.controller.ts    # Thin job files factory wrapper
├── middleware/
│   ├── auth.ts                # JWT token validation middleware
│   └── errorHandler.ts        # Express global error handler middleware
├── routes/
│   ├── auth.routes.ts         # User auth routing
│   ├── boards.routes.ts       # Board CRUD routing
│   ├── jobs.routes.ts         # Job CRUD + file uploads + transform routing
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

