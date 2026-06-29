# Job Board - Personal Application Tracker

![Version](https://img.shields.io/badge/version-3.10.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

![Job Board Preview](preview.png)

<div align="center">
  <img src="docs/assets/login-preview.png" width="45%" alt="Login Screen" />
  <img src="docs/assets/detail-preview.png" width="45%" alt="Job Detail View" />
</div>

A minimalist, **self-hosted Kanban board** to track job applications, networking opportunities, and business connections. Powered by **Docker**, **PostgreSQL**, and a secure **User Authentication** system.

## 🚀 Key Features

### 🏠 Home Dashboard
- **Upcoming Interviews**: Quick view of jobs in interview stage
- **New AI Matches**: Unseen jobs created by your AI agent
- **Unified Navigation**: Sidebar access to all boards

### 💼 Job Board
- **Kanban Columns**: Interested → Applied → Forgotten → Interview → **Pending** → Offer → Rejected (→ Archived)
- **Center Peek Modal**: Click any card to view detailed info with Journey Map
- **Journey Map Visualization**: Interactive SVG showing status progression over time
- **File Attachments**: Upload resumes, cover letters, PDFs, and images to any job
- **Job/Connection Types**: Track both networking and applications
- **AI Agent Integration**: Jobs created by AI agents are highlighted with a glow effect
- **Star Ratings**: Prioritize opportunities (1-5 stars)
- **Compact/Comfortable View**: Toggle between dense and detailed card layouts
- **Focus Mode 🎯**: Filter to high-priority items (hides low-rated cards and Rejected/Forgotten columns)
- **Archive Vault 📦**: Archive completed or old jobs to declutter your board while preserving history
- **Transform to Connection 🚀**: Convert job applications into Business Board connections with file migration and locked state

### 🤝 Business Board
- **Track Business Relationships**: Investors, VCs, Accelerators, Connections
- **Kanban Stages**: Researching → Contacted → Meeting → Negotiation → Signed/Rejected
- **Color-Coded Columns**: Each stage has distinct visual styling
- **Drag & Drop**: Move entities between stages
- **File Attachments**: Upload pitch decks, contracts, or notes to any entity
- **Compact/Comfortable View**: Same view toggle as Job Board
- **Deep Linking**: Click jobs from Dashboard to open directly in Job Board with details visible

### 🔐 Authentication
- Secure signup/login with password hashing (bcrypt)
- J## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript 6, Vite 8, CSS3 variables, Semantic HTML, TanStack Query v5
- **Backend**: Node.js, Express, TypeScript 6 (compiled to ESModules)
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose, Nginx (Reverse Proxy)

## 🏃 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Node.js (v18+) and npm (for local compilation/tests)

### 1. Clone & Configure
```bash
git clone https://github.com/pachocamacho1990/personal-job-board.git
cd personal-job-board
cp .env.example .env  # Edit with your settings
```

### 2. Install & Build Frontend
Before running Docker Compose, you must build the frontend and backend assets:
```bash
# Install root dependencies and build React app
npm install
npm run build

# Install backend dependencies and build server
cd server
npm install
npm run build
cd ..
```

### 3. Start the Application
```bash
docker-compose up -d
```

### 4. Access the Job Board
Open your browser: **http://localhost/jobboard/**

### 5. Create an Account
1. Click **"Sign up"** on the login page
2. Create your account
3. You'll be redirected to your personal Dashboard

## 📁 Project Structure

```
personal-job-board/
├── dist/                     # Compiled frontend assets (served by Nginx)
├── src/                      # Frontend source code (React + TypeScript)
│   ├── components/           # Reusable React components (Sidebar, Panels, etc.)
│   ├── pages/                # MPA Entry points (Dashboard, Jobs, Business, Docs, Login)
│   │   ├── business/
│   │   ├── docs/
│   │   ├── index/
│   │   ├── jobs/
│   │   └── login/
│   ├── api.ts                # Typed REST API client
│   ├── types.ts              # Common interfaces and types
│   └── utils.ts              # Shared utility functions
├── server/                   # Backend API (TypeScript)
│   ├── dist/                 # Compiled JavaScript output (run by Node container)
│   ├── config/               # DB & auth config
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth & error handling
│   ├── routes/               # API routes
│   ├── tests/                # Jest integration tests
│   ├── server.ts             # Express entry point
│   ├── tsconfig.json         # Server TS config
│   └── tsconfig.build.json   # Build config (excludes tests)
├── docker-compose.yml        # Container orchestration
├── nginx/                    # Reverse proxy config
├── tests/                    # Playwright E2E browser tests
└── tsconfig.json             # Root TS config (frontend)
```

## 🔧 Management

### Stopping the App
```bash
docker-compose down
```
*(Your data persists in the Docker volume)*

### Viewing Logs
```bash
docker-compose logs -f api
```

### Rebuilding After Changes
To rebuild container layers (and apply backend TS/code changes):
```bash
# Rebuild frontend
npm run build

# Rebuild backend locally (to update mounted /app volume)
cd server && npm run build && cd ..

# Restart containers
docker-compose up -d --build
```

## 📦 Data Migration (from v1)

If you have data from the old localStorage version:

1. **Export**: Open old version console → run `scripts/export-from-localstorage.js`
2. **Import**:
   ```bash
   node scripts/import-to-database.js migration-data.json your@email.com yourpassword
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed migration steps.

## 🧪 Testing

### Backend Unit/Integration Tests (Jest)
```bash
cd server
npm test
```

### Frontend E2E UI Tests (Playwright)
Ensure the application is running (e.g. via Docker Compose) at `http://localhost/jobboard/` before running E2E tests:
```bash
# Run headless UI tests
npm run test:ui

# Run headed or UI mode UI tests
npm run test:ui:headed
npm run test:ui:ui
```

See [TESTING.md](TESTING.md) for full testing strategy.

## 🗺️ API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/jobs/:id/history` | Get status change history |
| POST | `/api/jobs/:id/transform` | Transform job to business connection |
| GET | `/api/jobs/:id/files` | List job files |
| POST | `/api/jobs/:id/files` | Upload file to job |
| DELETE | `/api/jobs/:id/files/:fileId` | Delete job file |

### Business Entities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/business` | List all entities |
| POST | `/api/business` | Create entity |
| PUT | `/api/business/:id` | Update entity |
| DELETE | `/api/business/:id` | Delete entity |
| GET | `/api/business/:id/files` | List entity files |
| POST | `/api/business/:id/files` | Upload file to entity |
| DELETE | `/api/business/:id/files/:fileId` | Delete entity file |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Get widget data |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health check |

## 📚 Documentation

- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment and migration guide
- [TESTING.md](TESTING.md) - Testing strategy
- [CLAUDE.md](CLAUDE.md) - AI assistant codebase guide

## 📄 License
MIT
