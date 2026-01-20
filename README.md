# Job Board - Personal Application Tracker

![Job Board Preview](preview.png)

A minimalist, **self-hosted Kanban board** to track job applications and networking opportunities. Now powered by **Docker**, **PostgreSQL**, and a secure **User Authentication** system.

## 🚀 Key Features

- **🔐 Multi-User Authentication**: Secure signup/login with password hashing and JWT sessions.
- **🐳 Dockerized Deployment**: One command to start Database, API, and Web Server.
- **💾 PostgreSQL Database**: Robust data persistence (no more browser localStorage limits).
- **🤝 Dual Entity System**: Track both **Connections** (networking) and **Jobs** (applications).
- **⭐ Star Ratings**: Prioritize opportunities with a 1-5 star rating system.
- **📱 Responsive & Fast**: Optimized mobile view and lightweight frontend.
- **🔄 Migration Tools**: Seamlessly import data from previous localStorage versions.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS (ES6+), CSS3 Variables, Semantic HTML
- **Backend**: Node.js, Express, JWT Authentication
- **Database**: PostgreSQL 15
- **Infrastructure**: Docker Compose, Nginx (Reverse Proxy)

## 🏃 Quick Start

### Prerequisites
- Docker & Docker Compose installed

### 1. Start the Application
Run this single command to launch everything:

```bash
docker-compose up -d
```

### 2. Access the Job Board
Open your browser and navigate to:
**http://localhost**

### 3. Create an Account
1. You will be redirected to `/login.html`.
2. Click **"Sign up"**.
3. Create your account to access your private job board.

## 🔧 Management

### Stopping the App
```bash
docker-compose down
```
*(Your data will persist in the Docker volume)*

### Viewing Logs
```bash
docker-compose logs -f
```

## 📦 Data Migration (from v1)

If you have data from the old localStorage version:

1. **Export**: Open old version console -> run code in `scripts/export-from-localstorage.js`.
2. **Import**: Use the Node.js script:
   ```bash
   node scripts/import-to-database.js migration-data.json your@email.com yourpassword
   ```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed migration steps.

## 🧪 Testing

The project includes automated backend tests (Jest) and manual verification checklists.

```bash
# Run backend tests
cd server
npm test
```

See [TESTING.md](TESTING.md) for full testing strategy.

## 📄 License
MIT
