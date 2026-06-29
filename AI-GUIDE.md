# AI Development Guide - Personal Job Board v3.10.0 (TypeScript & React)

**Purpose**: Token-efficient reference for AI-assisted development. For human docs, see README.md and DESIGN.md.

## Quick Context

Multi-board career management platform with PostgreSQL backend. Three main views served via a Vite multi-page React application:
1. **Dashboard** (`index.html` -> `src/pages/index/main.tsx`) - Home with interview/AI match widgets
2. **Job Board** (`jobs.html` -> `src/pages/jobs/main.tsx`) - Kanban for job applications supporting multiple board instances (similar to ChatGPT sidebar history)
3. **Business Board** (`business.html` -> `src/pages/business/main.tsx`) - Kanban for professional relationships

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

### Business Entities Table (business_entities)
```javascript
{
  id: serial,                          // Auto-increment PK
  user_id: integer,                    // FK → users.id
  name: string,                        // Entity name
  type: "investor" | "vc" | "accelerator" | "connection",
  status: "researching" | "contacted" | "meeting" | "negotiation" | "signed" | "rejected",
  contact_person: string,
  email: string,
  website: string,
  location: string,
  notes: text,
  created_at: timestamp,
  updated_at: timestamp
}
```

## Core Files

### Frontend React SPA (`/src`)
| File / Directory | Purpose |
|------|---------|
| `src/pages/index/main.tsx` | Dashboard home view |
| `src/pages/jobs/main.tsx` | Job Board Kanban board page |
| `src/pages/business/main.tsx` | Business Board Kanban page |
| `src/pages/login/main.tsx` | Auth register / login page |
| `src/pages/docs/main.tsx` | Dynamic API Reference and guide |
| `src/api.ts` | Strongly typed client with JWT management |
| `src/types.ts` | Unified TypeScript interfaces |
| `src/utils.ts` | Pure utility functions (escaping, ratings, dates) |
| `src/components/Sidebar.tsx` | Left side navigation with active board selection |
| `src/components/DetailPanel.tsx` | Jobs detail edit panel (sliding drawer) |
| `src/components/BusinessDetailPanel.tsx` | Business connection detail panel (sliding drawer) |

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

GET    /api/business             → [entities]
POST   /api/business             → { entity }
PUT    /api/business/:id         → { entity }
DELETE /api/business/:id         → { message }

GET    /api/dashboard/summary    → { interviews, newMatches } (Filtered by boardId)
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

### Business Page (`pages/business/main.tsx`)
- `entities` (state `BusinessEntity[]`): Business connections.
- `selectedEntity` (state `BusinessEntity | null`): Connection being edited/viewed in the sliding drawer.
- `viewMode` (state `"comfortable" | "compact"`): Layout density.
- `activePanel` (state `"details" | null`): Panel visibility indicator.

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
- Stored in localStorage: `viewPreference` (jobs), `businessBoardCompactView` (business).
- Controls mapping CSS classes: `.comfortable` or `.compact` on cards.

### Color-Coded Columns
Tailored HSL theme colors mapped via `data-status` attributes in CSS.
- Job Board: `interested`, `applied`, `forgotten`, `interview`, `pending`, `offer`, `rejected`, `archived`
- Business Board: `researching`, `contacted`, `meeting`, `negotiation`, `signed`, `rejected`

## Common Workflows

### Add Job/Entity
1. User clicks "+ Add Job" or "+ Add Relationship" button.
2. React sets `selectedJob` / `selectedEntity` to `null` and sets `activePanel = "details"`.
3. The detail panel renders blank fields.
4. Form submit sends POST request to `/api/jobs` or `/api/business`, appends returned object to state, and closes panel.

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
| `business.test.js` | Business entity CRUD, type validation, user checks |
| `business-files.test.js` | Business file attachment handling |
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

