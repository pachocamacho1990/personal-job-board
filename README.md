# Job Board - Personal Application Tracker

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
- **Kanban Columns**: Interested → Applied → Interview → Offer → Rejected
- **Job/Connection Types**: Track both networking and applications
- **AI Agent Integration**: Jobs created by AI agents are highlighted with a glow effect
- **Star Ratings**: Prioritize opportunities (1-5 stars)
- **Compact/Comfortable View**: Toggle between dense and detailed card layouts

### 🤝 Business Board
- **Track Business Relationships**: Investors, VCs, Accelerators, Connections
- **Kanban Stages**: Researching → Contacted → Meeting → Negotiation → Signed/Rejected
- **Color-Coded Columns**: Each stage has distinct visual styling
- **Drag & Drop**: Move entities between stages
- **Compact/Comfortable View**: Same view toggle as Job Board

### 🔐 Authentication
- Secure signup/login with password hashing (bcrypt)
- JWT session tokens
- Per-user data isolation

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS (ES6+), CSS3 Variables, Semantic HTML
- **Backend**: Node.js, Express, JWT Authentication
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker Compose, Nginx (Reverse Proxy)

## 🏃 Quick Start

### Prerequisites
- Docker & Docker Compose installed

### 1. Clone & Configure
```bash
git clone https://github.com/pachocamacho1990/personal-job-board.git
cd personal-job-board
cp .env.example .env  # Edit with your settings
```

### 2. Start the Application
```bash
docker-compose up -d
```

### 3. Access the Job Board
Open your browser: **http://localhost/jobboard/**

### 4. Create an Account
1. Click **"Sign up"** on the login page
2. Create your account
3. You'll be redirected to your personal Dashboard

## 📁 Project Structure

```
personal-job-board/
├── public/                   # Frontend files
│   ├── index.html           # Dashboard (home)
│   ├── jobs.html            # Job Board
│   ├── business.html        # Business Board
│   ├── login.html           # Authentication
│   ├── styles.css           # Main stylesheet
│   ├── css/
│   │   ├── layout.css       # Dashboard layout
│   │   └── sidebar.css      # Navigation styles
│   └── js/
│       ├── api.js           # API client
│       ├── app.js           # Job Board logic
│       ├── business.js      # Business Board logic
│       ├── dashboard.js     # Dashboard widgets
│       ├── sidebar.js       # Navigation
│       ├── logout.js        # Logout modal
│       └── auth.js          # Login/signup
├── server/                   # Backend API
│   ├── server.js            # Express entry point
│   ├── controllers/         # Request handlers
│   ├── routes/              # API routes
│   ├── middleware/          # Auth middleware
│   ├── models/              # Database schema
│   └── tests/               # Jest tests
├── docker-compose.yml       # Container orchestration
└── nginx/                   # Reverse proxy config
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
```bash
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

```bash
# Run backend tests
cd server
npm test
```

Tests include:
- `auth.test.js` - Authentication flows
- `jobs.test.js` - Job CRUD operations
- `business.test.js` - Business entity CRUD
- `dashboard.test.js` - Summary data

See [TESTING.md](TESTING.md) for full testing strategy.

## 🗺️ API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| POST | `/api/auth/logout` | Invalidate session |

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
| GET | `/api/dashboard/summary` | Get widget data |

## 📄 License
MIT
