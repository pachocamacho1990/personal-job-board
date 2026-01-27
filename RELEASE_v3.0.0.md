# Release v3.0.0 — Business Board & Dashboard

> **Major Release**: Complete navigation overhaul with new Dashboard, Business Board, and unified sidebar navigation.

## 🎯 Highlights

This release transforms the Personal Job Board from a single-purpose job tracker into a **comprehensive career management platform**. Track not just job applications, but also your professional network — investors, VCs, accelerators, and key connections.

## ✨ What's New

### 🏠 Home Dashboard
Your new command center after login:
- **Upcoming Interviews** — Quick view of jobs in interview stage
- **New AI Matches** — Unseen jobs created by your AI agent, highlighted for review
- **Quick Navigation** — Jump directly to any job or start reviewing matches

### 🤝 Business Board
A dedicated Kanban board for professional relationship tracking:

| Stage | Color | Purpose |
|-------|-------|---------|
| Researching | 💜 Indigo | Initial discovery |
| Contacted | 🩵 Cyan | Outreach made |
| Meeting | 💜 Violet | Active engagement |
| Negotiation | 🧡 Orange | Terms being discussed |
| Signed | 💚 Green | Deal closed |
| Rejected | 🩶 Slate | Not proceeding |

**Entity Types**: Investors 💸 • VCs 🏛️ • Accelerators 🚀 • Connections 🤝

### 📱 Unified Navigation
- **Left Sidebar** — Consistent across all pages
- **User Profile** — See who's logged in
- **Logout Confirmation** — No accidental logouts

### 🎨 Visual Improvements
- **Color-coded columns** on Business Board matching Job Board aesthetic
- **Compact/Comfortable view toggle** for dense or detailed layouts
- **View preference persistence** via localStorage

## 📊 Technical Stats

| Metric | Value |
|--------|-------|
| Files Changed | 19 |
| Lines Added | +1,982 |
| Lines Removed | -221 |
| New Tests | 9 (17 → 26 total) |

## 🗂️ New Files

### Backend
- `server/controllers/business.controller.js` — Business CRUD
- `server/controllers/dashboard.controller.js` — Summary stats
- `server/routes/business.routes.js` — `/api/business` endpoints
- `server/routes/dashboard.routes.js` — `/api/dashboard/summary`

### Frontend
- `public/jobs.html` — Job Board (moved from index)
- `public/business.html` — Business Board
- `public/js/dashboard.js`, `business.js`, `sidebar.js`
- `public/css/layout.css`, `sidebar.css`

## 🔄 Migration Notes

### Database
Run the schema migration to add the new `business_entities` table:
```sql
CREATE TABLE business_entities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'connection',
    status VARCHAR(50) DEFAULT 'researching',
    contact_person VARCHAR(255),
    email VARCHAR(255),
    website VARCHAR(255),
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Deployment
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

## 🐛 Bug Fixes
- Fixed auth token key mismatch causing login loops
- Fixed missing script includes in HTML files
- Fixed dashboard API URL for nginx proxy routing
- Standardized redirect paths

## 🧪 Testing
All 26 backend tests pass:
```
Test Suites: 4 passed (auth, jobs, business, dashboard)
Tests:       26 passed
```

---

**Full Changelog**: [v2.3.0...v3.0.0](https://github.com/pachocamacho1990/personal-job-board/compare/v2.3.0...v3.0.0)
