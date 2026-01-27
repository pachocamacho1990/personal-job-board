# AI Development Guide - Personal Job Board v3.0.0

**Purpose**: Token-efficient reference for AI-assisted development. For human docs, see README.md and DESIGN.md.

## Quick Context

Multi-board career management platform with PostgreSQL backend. Three main views:
1. **Dashboard** (`index.html`) - Home with interview/AI match widgets
2. **Job Board** (`jobs.html`) - Kanban for job applications
3. **Business Board** (`business.html`) - Kanban for professional relationships

## Data Schema

### Jobs Table (jobs)
```javascript
{
  id: serial,                          // Auto-increment PK
  user_id: integer,                    // FK → users.id
  type: "job" | "connection",          // Entity type
  company: string,                     // Company name
  position: string,                    // Job title
  location: string,
  salary: string,
  contact_name: string,                // For connections
  organization: string,                // For connections
  status: "interested" | "applied" | "forgotten" | "interview" | "offer" | "rejected",
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
| `js/api.js` | REST client with JWT |
| `js/app.js` | Job Board logic |
| `js/business.js` | Business Board logic |
| `js/dashboard.js` | Dashboard widgets |
| `js/sidebar.js` | Nav highlighting |
| `js/logout.js` | Logout modal |
| `css/layout.css` | Dashboard grid |
| `css/sidebar.css` | Navigation styles |
| `styles.css` | Main design system |

### Backend (`/server`)
| File | Purpose |
|------|---------|
| `server.js` | Express entry, middleware |
| `routes/auth.routes.js` | /api/auth/* |
| `routes/jobs.routes.js` | /api/jobs/* |
| `routes/business.routes.js` | /api/business/* |
| `routes/dashboard.routes.js` | /api/dashboard/* |
| `controllers/*.controller.js` | Business logic |
| `middleware/auth.js` | JWT verification |
| `models/schema.sql` | DB schema |

## API Endpoints

```
POST /api/auth/signup          → { token }
POST /api/auth/login           → { token }
GET  /api/auth/me              → { user }

GET  /api/jobs                 → [jobs]
POST /api/jobs                 → { job }
PUT  /api/jobs/:id             → { job }
DELETE /api/jobs/:id           → { message }

GET  /api/business             → [entities]
POST /api/business             → { entity }
PUT  /api/business/:id         → { entity }
DELETE /api/business/:id       → { message }

GET  /api/dashboard/summary    → { interviews, newMatches }
```

All except auth require `Authorization: Bearer <token>` header.

## State Variables

### Dashboard (dashboard.js)
```javascript
// No persistent state - fetches fresh on load
```

### Job Board (app.js)
```javascript
jobs = []                  // Main array of job objects
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

```bash
cd server && npm test    # 26 tests
```

| Test File | Coverage |
|-----------|----------|
| auth.test.js | Signup, login, tokens |
| jobs.test.js | CRUD, validation |
| business.test.js | CRUD, type validation |
| dashboard.test.js | Summary endpoint |

## Token-Saving Tips

1. **Check this file first** - Most patterns documented here
2. **Use file ranges** - `view_file` with StartLine/EndLine
3. **Reference function names** - All functions are single-purpose
4. **Pattern consistency** - All CRUD follows: API call → update array → re-render
5. **Check CLAUDE.md** - More detailed route/controller info
