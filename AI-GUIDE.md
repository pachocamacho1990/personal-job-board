# AI Development Guide - Personal Job Board v3.6.0

**Purpose**: Token-efficient reference for AI-assisted development. For human docs, see README.md and DESIGN.md.

## Quick Context

Multi-board career management platform with PostgreSQL backend. Three main views:
1. **Dashboard** (`index.html`) - Home with interview/AI match widgets
2. **Job Board** (`jobs.html`) - Kanban for job applications supporting multiple board instances (similar to ChatGPT sidebar history)
3. **Business Board** (`business.html`) - Kanban for professional relationships

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

### Frontend (`/public`)
| File | Purpose |
|------|---------|
| `index.html` | Dashboard (home after login) |
| `jobs.html` | Job Board Kanban |
| `business.html` | Business Board Kanban |
| `login.html` | Auth page |
| `js/api.js` | REST client with JWT and cache-busting versioning |
| `js/app.js` | Job Board logic (with board management) |
| `js/business.js` | Business Board logic |
| `js/dashboard.js` | Dashboard widgets |
| `js/sidebar.js` | Nav highlighting |
| `js/logout.js` | Logout modal |
| `css/layout.css` | Dashboard grid |
| `css/sidebar.css` | Navigation styles with boards submenu |
| `styles.css` | Main design system |
| `WIREFRAMING_GUIDE.md` | Protocols for AI image generation |

### Backend, Testing & Migrations
| Folder/File | Purpose |
|------|---------|
| `server.js` | Express entry, middleware |
| `routes/boards.routes.js` | /api/boards/* endpoints |
| `controllers/boards.controller.js` | Board management logic |
| `routes/jobs.routes.js` | /api/jobs/* endpoints |
| `models/schema.sql` | DB schema (v3.6.0 clean setup) |
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

## State Variables

### Dashboard (dashboard.js)
```javascript
// No persistent state - fetches fresh on load
```

### Job Board (app.js)
```javascript
jobs = []                  // Array of job objects for active board
boards = []                // Array of board objects owned by user
activeBoardId = null       // Current active board ID
currentJobId = null        // Selected job ID
isCompactView = false      // View mode toggle
isPreviewMode = false      // Markdown preview toggle
isFocusMode = false        // Filter high-priority items
```

### Business Board (business.js)
```javascript
entities = []              // Main array of business entities
dragSource = null          // Currently dragged card
isCompactView = false      // View mode toggle
```

## Core Functions

### Dashboard (dashboard.js)
- `fetchDashboardData()` → Fetches /dashboard/summary, updates widgets
- `renderInterviews(jobs)` → Populates upcoming interviews list
- `renderNewMatches(jobs)` → Populates AI matches list

### Job Board (app.js)
- `fetchJobs()` → Loads all jobs from API
- `renderAllJobs()` → Clears columns, renders all job cards
- `createJob(data)` → POST /jobs, adds to array
- `updateJob(id, data)` → PUT /jobs/:id, updates array
- `deleteJob(id)` → DELETE /jobs/:id, removes from array
- `openJobDetails(jobId)` → Opens side panel (null = new)
- `toggleViewMode()` → Switches compact/comfortable

### Business Board (business.js)
- `fetchEntities()` → Loads all entities from API
- `renderBoard()` → Clears columns, renders all entity cards
- `createCard(entity)` → Creates DOM card element
- `openPanel(entity)` → Opens side panel (null = new)
- `handleFormSubmit(e)` → Creates or updates entity
- `handleDelete()` → Deletes current entity

## Key Patterns

### Authentication
- Token stored in `localStorage.authToken`
- All pages check token on load, redirect to `/jobboard/login.html` if missing
- API client auto-clears token on 401 response

### Drag & Drop
Both boards use same pattern:
1. `dragstart` → Store reference, add `.dragging` class
2. `dragover` → Prevent default, add `.drag-over`
3. `drop` → Read `data-id`, call update API, re-render

### View Toggle
- Icon: ⊟ (comfortable) ↔ ⊞ (compact)
- Persisted to localStorage: `viewPreference` (jobs), `businessBoardCompactView` (business)
- Adds `.compact` class to cards

### Color-Coded Columns
CSS uses `[data-status="..."]` selectors:
```css
.column[data-status="interested"] .column-header { /* purple */ }
.column[data-status="researching"] .column-header { /* indigo */ }
```

## Design Tokens (styles.css :root)

### Status Colors - Job Board
```css
--color-interested: #A855F7  /* Purple */
--color-applied: #3B82F6     /* Blue */
--color-interview: #F59E0B   /* Amber */
--color-offer: #22C55E       /* Green */
--color-rejected: #64748B    /* Slate */
```

### Status Colors - Business Board
```css
--color-researching: #6366F1  /* Indigo */
--color-contacted: #0891B2    /* Cyan */
--color-meeting: #8B5CF6      /* Violet */
--color-negotiation: #EA580C  /* Orange */
--color-signed: #059669       /* Emerald */
```

## Common Workflows

### Add Job/Entity
1. Click "+ Add" button
2. `openPanel(null)` / `openJobDetails(null)` → Sets currentId=null
3. Fill form, submit
4. `handleFormSubmit()` → Sees null ID → Calls create API
5. Re-render board, close panel

### Edit Job/Entity
1. Click card → `openPanel(entity)` / `openJobDetails(jobId)`
2. Sets currentId, populates form
3. Edit, submit
4. `handleFormSubmit()` → Sees ID → Calls update API
5. Re-render, close panel

### Drag to Change Status
1. Drag card → Store element
2. Drop on column → Read new status from `data-status`
3. Call update API with new status
4. Re-render board

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
4. **Pattern consistency** - All CRUD follows: API call → update array → re-render
5. **Check CLAUDE.md** - More detailed route/controller info
6. **UI/Wireframing** - Always consult `WIREFRAMING_GUIDE.md` before generating UI mockups.
7. **Documentation Sync** - When modifying features, routes, or schema, always update the public [public/docs.html](file:///Users/pacho-home-server/personal-job-board/public/docs.html) to keep it in sync.

## Development Insights (v3.2.0)

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
- **Auto-Open**: The Job Board (`app.js`) automatically detects this parameter and opens the **Center Peek** modal.
- **Parameter Handling**: Do not remove the query parameter (allows for bookmarking specific job views).
