# AI Development Guide - Personal Job Board v4.0.0 (TypeScript & React)

**Purpose**: Token-efficient reference for AI-assisted development. For human docs, see README.md and DESIGN.md.

## Quick Context

Career management platform — professional profiling and job search — with a PostgreSQL backend. Views served via a Vite multi-page React application:
1. **Dashboard** (`index.html` -> `src/pages/index/main.tsx`) - Home with interview/AI match widgets
2. **Job Board** (`jobs.html` -> `src/pages/jobs/main.tsx`) - Kanban for job applications supporting multiple board instances (similar to ChatGPT sidebar history)
3. **Profile** (`profile.html` -> `src/pages/profile/main.tsx`) - Experience, skills and languages; what Zenith reads

> Business relationships moved out in v4.0.0 to **Cassimir Management Center**, a separate repository and stack. The only link left is `POST /api/jobs/:id/transform`, an outbound HTTP call. Do not add CRM features here.

## Data Schema

### Boards Table (boards)
```javascript
{
  id: serial,                          // Auto-increment PK
  user_id: integer,                    // FK → users.id
  name: string,                        // Board name (e.g. "Mi Tablero")
  created_at: timestamp,
  updated_at: timestamp
}
```

### Jobs Table (jobs)
```javascript
{
  id: serial,                          // Auto-increment PK
  user_id: integer,                    // FK → users.id
  board_id: integer,                   // FK → boards.id (Supports separation of board instances)
  type: "job" | "connection",          // Entity type
  company: string,                     // Company name
  position: string,                    // Job title
  location: string,
  salary: string,
  contact_name: string,                // For connections
  organization: string,                // For connections
  status: "interested" | "applied" | "forgotten" | "interview" | "pending" | "offer" | "rejected" | "archived",
  rating: 1-5,                         // Star rating
  origin: "human" | "agent",           // Who created it
  is_unseen: boolean,                  // Agent-created, not viewed
  comments: text,                      // Markdown notes
  created_at: timestamp,
  updated_at: timestamp                // Auto-updates via trigger
}
```

## Core Files

### Frontend React SPA (`/src`)
| File / Directory | Purpose |
|------|---------|
| `src/pages/index/main.tsx` | Dashboard home view |
| `src/pages/jobs/main.tsx` | Job Board Kanban board page |
| `src/pages/login/main.tsx` | Auth register / login page |
| `src/pages/docs/main.tsx` | Dynamic API Reference and guide |
| `src/pages/profile/main.tsx` | Professional Profile form |
| `src/api.ts` | Strongly typed client with JWT management |
| `src/types.ts` | Unified TypeScript interfaces |
| `src/utils.ts` | Pure utility functions (escaping, ratings, dates) |
| `src/components/Sidebar.tsx` | Left side navigation with active board selection |
| `src/components/DetailPanel.tsx` | Jobs detail edit panel (sliding drawer) |

### Backend, Testing & Migrations
| Folder/File | Purpose |
|------|---------|
| `server/server.ts` | Express entry point in TypeScript (ESModules) |
| `server/routes/` | Strongly typed Express routers |
| `server/controllers/` | Request controllers (TS) |
| `server/models/schema.sql` | DB schema (v3.6.0 clean setup) |
| `migrations/` | Directory for chronological database schema updates |
| `playwright.config.js` | Configuration for Playwright E2E browser tests |
| `tests/boards-ui.spec.js` | E2E browser automation test for board isolation |


## API Endpoints

```
POST   /api/auth/signup          → { token, user }
POST   /api/auth/login           → { token, user }
GET    /api/auth/me              → { user }

GET    /api/boards               → [boards] (Includes job counts)
POST   /api/boards               → { board }
PUT    /api/boards/:id           ➔ { board }
DELETE /api/boards/:id           ➔ { message }

GET    /api/jobs                 → [jobs] (Optionally filtered by boardId)
POST   /api/jobs                 → { job }
PUT    /api/jobs/:id             → { job }
DELETE /api/jobs/:id             → { message }
GET    /api/jobs/:id             → { job } (Deep link retrieval)

POST   /api/jobs/:id/transform   → { opportunityId, opportunityUrl }
                                   Pushes the job to Cassimir Management Center.
                                   503 if CMC is unreachable; the job is left untouched.

GET    /api/dashboard/summary    → { interviews, newMatches } (Filtered by boardId)

GET    /api/profile              → { profile_data, onboarding_status }
POST   /api/profile              → { message, onboarding_status, profile_data }
```

All except auth require `Authorization: Bearer <token>` header.

## State Variables & React hooks

### Jobs Page (`pages/jobs/main.tsx`)
- `jobs` (state `Job[]`): Jobs belonging to the currently active board.
- `boards` (state `Board[]`): Boards belonging to the current user.
- `activeBoardId` (state `number | null`): Id of the active board.
- `selectedJob` (state `Job | null`): Selected job for detail sidebar panel.
- `viewMode` (state `"comfortable" | "compact"`): Layout density.
- `focusMode` (state `boolean`): Filters the board to high-rated cards and hides rejected/forgotten columns.
- `activePanel` (state `"details" | "center-peek" | "archive-vault" | null`): Currently visible modal/drawer view.

## Core Component Architectures

### Page Lifecycle
1. **Initial Mount**: Check `localStorage.authToken` presence. If missing, redirect to `/jobboard/login.html`.
2. **Fetch Data**: Fetch boards list (`GET /api/boards`) and current user info (`GET /api/auth/me`). Set default active board.
3. **Fetch Board Jobs**: Whenever `activeBoardId` changes, fetch all jobs (`GET /api/jobs?boardId=id`).

### Optimistic Updates
For drag-and-drop status changes, state arrays are updated immediately on drop:
1. Re-map local state (`jobs` or `entities`) setting the new status.
2. Trigger API PUT request in background.
3. If API request fails, roll back local state to original value and alert user.

## Key Patterns

### Authentication
- Token stored in `localStorage.authToken`.
- React pages block render/redirect if token is missing.
- API requests automatically append `Authorization: Bearer <token>` header.

### Drag & Drop (HTML5 Native Drag and Drop)
1. Card defines `draggable="true"` and `onDragStart`.
2. Column defines `onDragOver` (triggers `preventDefault`) and `onDrop`.
3. Drop retrieves card ID, modifies status, triggers background API PUT sync.

### View Toggle
- Stored in localStorage: `viewPreference` (jobs).
- Controls mapping CSS classes: `.comfortable` or `.compact` on cards.

### Color-Coded Columns
Tailored HSL theme colors mapped via `data-status` attributes in CSS.
- Job Board: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`, `archived`

## Common Workflows

### Add Job/Entity
1. User clicks "+ Add Job" or "+ Add Relationship" button.
2. React sets `selectedJob` / `selectedEntity` to `null` and sets `activePanel = "details"`.
3. The detail panel renders blank fields.
4. Form submit sends POST request to `/api/jobs`, appends returned object to state, and closes panel.

### Edit Job/Entity
1. User clicks card.
2. React sets `selectedJob` to the card object and `activePanel = "center-peek"` (or `"details"`).
3. Modifying fields in Detail Panel and submitting sends PUT request, updates matching object in state array, and closes panel.

### Drag to Change Status
1. Drag card -> triggers `onDragStart` setting transfer data (card ID).
2. Drop on column -> triggers `onDrop` fetching target status from column's `data-status` attribute.
3. React performs optimistic update on `jobs` state and initiates `PUT /api/jobs/:id` in background.


## Testing

### Unit and Integration Tests (Jest)
Tests are executed inside the `server/` directory or root depending on dependency paths:
```bash
npm test    # Runs all 61 unit tests across 7 test suites
```

| Test File | Description |
|-----------|-------------|
| `auth.test.js` | Signup, login, tokens, password hashing |
| `boards.test.js` | Board CRUD, data isolation, last board deletion restriction |
| `jobs.test.js` | Job CRUD, column updates, archive/restore operations |
| `files.test.js` | Job file uploads, downloads, delete operations |
| `dashboard.test.js` | Summary widgets, interviews, AI matches |

### Browser E2E Automation Tests (Playwright)
E2E flows are located in `tests/` and run sequentially to avoid PG conflicts:
```bash
npm run test:ui         # Run playwright tests headless
npm run test:ui:headed  # Run playwright tests in headed mode (shows browser)
```
Covers user registration, creating boards, data isolation, and deep link verification.

## Token-Saving Tips

1. **Check this file first** - Most patterns documented here
2. **Use file ranges** - `view_file` with StartLine/EndLine
3. **Reference function names** - All functions are single-purpose
4. **Pattern consistency** - All CRUD follows React state update -> background API call
5. **Check CLAUDE.md** - More detailed route/controller info
6. **UI/Wireframing** - Always consult `WIREFRAMING_GUIDE.md` before generating UI mockups.
7. **Documentation Sync** - When modifying features, routes, or schema, always update [src/pages/docs/main.tsx](file:///Users/pacho-home-server/personal-job-board/src/pages/docs/main.tsx) (and `docs.html` root entry if layout changes) to keep it in sync.

## Development Insights (v3.10.0)

### File Downloads & Browser Quirks
1. **Safari**:
   - ❌ strict about opening new tabs (`target="_blank"`) for downloads. Often blocks them without warning.
   - ✅ Use `<a href="..." download>` (same-page navigation). Relies on `Content-Disposition: attachment` header to prevent page replacement.
2. **Chrome**:
   - ❌ Can interpret internal storage filenames (e.g., UUIDs) if headers are ambiguous.
   - ✅ Use `<a download="filename.ext">` to explicitly override the filename, providing a robust fallback.
3. **Backend**:
   - Always sanitize filenames! Spaces and special characters in `Content-Disposition` headers can break parsing in some browsers.
   - Use `res.download(path, sanitizedName)` for best results.

### Testing
- **Mocking Streams**: When testing `res.download`, `supertest` requires a robust `fs` mock.
  - Mock `fs.stat` with `{ isFile: ()=>true, isDirectory: ()=>false, size: 1024, mtime: new Date(), ino: 0 }`.
  - Mock `fs.createReadStream` returning `Readable.from(['data'])` (from `stream` module), NOT a simple object with `pipe`.
  - Use `jest.requireActual('fs')` to preserve unmocked classes like `ReadStream`.

## Navigation & Deep Linking
- **Dashboard to Board**: Links from the dashboard (e.g., "Upcoming Interviews") should use `?openJobId={id}`.
- **Auto-Open**: The Jobs Page (`src/pages/jobs/main.tsx`) automatically detects this parameter and opens the **Center Peek** modal.
- **Parameter Handling**: Do not remove the query parameter (allows for bookmarking specific job views).

## Multi-Model Session Continuity (Claude Code ↔ Antigravity)

This repo is worked with either **Claude Code** or **Antigravity (`agy`)**.
Antigravity is the backup when Claude Code is unavailable. Both share one state
file, `.claude/handoffs/CURRENT.md`.

- **Single source of truth**: the protocol lives once in
  `.claude/skills/handoff/SKILL.md`; `.agents/skills/handoff` is a **symlink** to
  it. The session-start text lives once in `.claude/hooks/handoff-context.sh`;
  each CLI only wraps it in its own JSON envelope. **Never duplicate protocol
  text between the two** — change the source and both inherit it.
- **`.claude/` is the source of truth for `agy` too.** Do not create a parallel
  protocol under `.agents/`.
- **Starting a session in `agy`**: say *"retomemos el trabajo de la sesión
  pasada"*. Rules files (`GEMINI.md`, `AGENTS.md`) load lazily — only once a repo
  file is opened — so they cannot be relied on to fire the protocol.
- **Setup details, and what was empirically verified vs. what the vendor docs get
  wrong**: [GEMINI.md](file:///Users/pacho-home-server/personal-job-board/GEMINI.md).
- The `gemini` CLI is installed but **deprecated by Google** and its auth is
  broken. Use `agy`.


