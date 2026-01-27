# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2026-01-27

### 🚀 Major Release: Business Board & Dashboard

This release introduces a complete navigation overhaul with a new Home Dashboard, Business Board for tracking professional connections, and unified sidebar navigation across all pages.

### Added

#### Home Dashboard
- **New Entry Point**: Dashboard replaces Job Board as the default view after login
- **Upcoming Interviews Widget**: Shows jobs with "Interview" status for quick reference
- **New AI Matches Widget**: Displays unseen jobs created by AI agent (`origin='agent'`)
- **Quick Actions**: View and Review links for rapid navigation

#### Business Board
- **New Kanban Board**: Dedicated board for tracking business relationships
- **Entity Types**: Investors 💸, VCs 🏛️, Accelerators 🚀, Connections 🤝
- **Status Columns**: Researching → Contacted → Meeting → Negotiation → Signed/Rejected
- **Color-Coded Columns**: Each status has distinct visual styling (Indigo, Cyan, Violet, Orange, Green)
- **Drag & Drop**: Move entities between stages just like job applications
- **Compact/Comfortable View**: Toggle between dense and detailed card layouts (persisted)
- **Full CRUD**: Create, Read, Update, Delete operations with ownership verification

#### Unified Navigation
- **Left Sidebar**: Consistent navigation across all pages (Dashboard, Job Board, Business Board)
- **User Profile**: Displays logged-in user info in sidebar footer
- **Logout Modal**: Confirmation dialog before logging out
- **Active Page Highlighting**: Current page indicated in navigation

### Changed
- **Job Board moved to /jobs.html**: Original Kanban board now at dedicated URL
- **Index.html repurposed**: Now serves as the Dashboard home page
- **API paths**: Standardized to use `/jobboard/api/` prefix for nginx proxy

### Technical Details

#### New Backend Files
- `server/controllers/business.controller.js` - Business entity CRUD operations
- `server/controllers/dashboard.controller.js` - Summary data aggregation
- `server/routes/business.routes.js` - API endpoints for `/api/business`
- `server/routes/dashboard.routes.js` - API endpoint for `/api/dashboard/summary`

#### New Frontend Files
- `public/jobs.html` - Job Board (original Kanban)
- `public/business.html` - Business Board
- `public/js/dashboard.js` - Dashboard widget logic
- `public/js/business.js` - Business board + view toggle
- `public/js/sidebar.js` - Navigation highlighting
- `public/css/layout.css` - Dashboard grid layout
- `public/css/sidebar.css` - Navigation styles

#### Database Schema
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

#### Test Coverage
- Expanded from 17 to 26 tests
- Added `business.test.js` - Full CRUD + validation tests
- Added `dashboard.test.js` - Summary endpoint + error handling

### Fixed
- Auth token key mismatch (`token` → `authToken`)
- Missing script includes in HTML files
- Dashboard API URL path for nginx proxy
- Redirect path consistency (absolute paths)

---

## [2.3.0] - 2026-01-23

### Added
- **Job Origin Indicator**:
    - **Created By Field**: Distinguish between jobs created by human 👤 vs AI Agent 🤖.
    - **Visual Badges**: New icons in standard and compact views.
    - **Unseen Shine Effect**: Agent-created jobs glow purple until clicked/seen.
    - **Database**: Added `origin` (enum) and `is_unseen` (bool) columns.

## [2.2.0] - 2026-01-22

### Added
- **Aurora Design System**: A complete visual overhaul of the application.
    - **Color Palette**: New Indigo & Slate theme for a cleaner, more professional look.
    - **Typography**: Standardized on Inter/System UI font stack.
    - **Components**: New "Frozen Glass" card style, refined buttons, and inputs.
    - **Login & Modals**: Redesigned authentication screens and dialogs.
- **Documentation**: Added `DESIGN_SYSTEM.md` and updated README screenshots.

## [2.1.0] - 2026-01-22

### Added
- **Focus Mode 🎯**: A new feature to filter the board for high-priority items.
    - Toggle button in the header.
    - Hides columns "Rejected" and "Forgotten".
    - Hides job cards with less than 3 stars.
    - Persists user reference between sessions via LocalStorage.

### Changed
- Updated UI styles for Focus Mode active state.

## [2.0.0] - 2026-01-20

### Added
- **Multi-User Architecture**: Full migration to a client-server model.
- **PostgreSQL Database**: Replaced localStorage with robust SQL persistence.
- **Authentication**: Secure Signup/Login flows with JWT and password hashing.
- **Docker Support**: Full Docker Compose setup for API, DB, and Nginx.

## [1.0.0] - 2026-01-15

### Added
- **Forgotten Column**: New column for tracking stalled applications.
- **Timestamps**: Added created/updated timestamps to job cards.
- **Sorting**: Added ability to sort cards by rating and updated date.
- **Basic Board**: Original Kanban board implementation with localStorage.
