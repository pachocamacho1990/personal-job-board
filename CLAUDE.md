# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A self-hosted career management platform with **Kanban boards** for tracking job applications AND business relationships. The application uses a **multi-user architecture** with JWT authentication, PostgreSQL database, and Docker-based deployment.

### Core Boards

1. **Job Board** (`/jobs.html`): Track job applications through stages (Interested → Applied → Interview → Offer → Rejected)
2. **Business Board** (`/business.html`): Track professional relationships (Investors, VCs, Accelerators, Connections)
3. **Dashboard** (`/index.html`): Home view with upcoming interviews and AI match widgets

### Core Entities

**Jobs Table** (`jobs`):
- **Jobs**: Traditional job applications with `company`, `position`, `location`, `salary` fields
- **Connections**: Networking opportunities with `contact_name`, `organization` fields
- Both share: `type`, `rating` (1-5 stars), `status`, `origin` (human/agent), `is_unseen`, `comments` (markdown)

**Business Entities Table** (`business_entities`):
- **Investors** 💸, **VCs** 🏛️, **Accelerators** 🚀, **Connections** 🤝
- Fields: `name`, `type`, `status`, `contact_person`, `email`, `website`, `location`, `notes`
- Statuses: `researching`, `contacted`, `meeting`, `negotiation`, `signed`, `rejected`

## Architecture

### Three-Tier Stack

1. **Frontend** (`/public`): Vanilla JavaScript SPA
   - `index.html`: Dashboard (home after login)
   - `jobs.html`: Job Board Kanban
   - `business.html`: Business Board Kanban
   - `login.html`: Authentication page
   - `js/api.js`: REST API client with JWT token management
   - `js/app.js`: Job Board logic (Kanban rendering, drag-and-drop, CRUD)
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
     - `auth.routes.js`: POST /signup, /login, GET /me
     - `jobs.routes.js`: GET, POST, PUT, DELETE /jobs
     - `business.routes.js`: GET, POST, PUT, DELETE /business
     - `dashboard.routes.js`: GET /dashboard/summary
   - `controllers/`:
     - `auth.controller.js`: User authentication
     - `jobs.controller.js`: Job CRUD operations
     - `business.controller.js`: Business entity CRUD
     - `dashboard.controller.js`: Summary data aggregation
   - `middleware/auth.js`: JWT verification middleware
   - `config/db.js`: PostgreSQL connection pool
   - `models/schema.sql`: Database schema with both tables

3. **Infrastructure** (`docker-compose.yml`):
   - **postgres**: PostgreSQL 16 with persistent volume
   - **api**: Node.js backend (port 3000)
   - **nginx**: Reverse proxy serving frontend + proxying `/api` to backend (port 80)

### Authentication Flow

- JWT tokens issued on signup/login with 7-day expiration
- Frontend stores token in `localStorage` as `authToken`
- All protected routes require JWT via `authMiddleware`
- Token includes `userId` and `email` claims for user-specific data isolation
- 401 responses trigger automatic redirect to `/login.html`

### Navigation Flow

1. User logs in → Redirects to Dashboard (`index.html`)
2. Dashboard shows: Upcoming Interviews, New AI Matches
3. Sidebar enables navigation: Dashboard ↔ Job Board ↔ Business Board
4. Logout confirmation modal prevents accidental logouts

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
npm test                    # Run Jest test suite (26 tests)
npm run dev                 # Start with nodemon for hot-reload
```

Tests cover:
- `auth.test.js`: Authentication flows
- `jobs.test.js`: Job CRUD operations
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

## Key Technical Details

### Database Schema

**jobs table**:
- Uses CHECK constraints for `type`, `rating`, `status`, `origin` validation
- `updated_at` auto-updates via PostgreSQL trigger
- `origin` field: 'human' (default) or 'agent' (AI-created)
- `is_unseen` field: true for agent-created jobs not yet viewed

**business_entities table**:
- `type`: investor, vc, accelerator, connection
- `status`: researching, contacted, meeting, negotiation, signed, rejected
- User ownership enforced via `user_id` foreign key

### Frontend State Management

- Global arrays: `jobs[]` for Job Board, `entities[]` for Business Board
- CRUD operations update local state optimistically, then sync with API
- View preferences (`isCompactView`) persisted to localStorage
- Sidebar navigation highlighting via `sidebar.js`

### Color-Coded Columns

Both boards use `data-status` attributes for CSS styling:
- Job Board: interested (purple), applied (blue), interview (orange), offer (green), rejected (gray)
- Business Board: researching (indigo), contacted (cyan), meeting (violet), negotiation (orange), signed (green)

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
