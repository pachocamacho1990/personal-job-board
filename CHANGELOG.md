# Changelog

All notable changes to this project will be documented in this file.

## [3.10.0] - 2026-02-09

### 🚀 Feature: Job to Business Connection Transformation

Transform job applications into business connections when a networking opportunity emerges. This creates a linked Connection card on the Business Board while preserving the original job history.

### Added

#### Transformation Flow
- **Transform Button**: New "Transform to Connection 🚀" button in the Job Detail panel.
- **Confirmation Modal**: Custom modal explains consequences (locking, creating, copying) before proceeding.
- **File Migration**: All attachments are automatically copied to the new Business Connection.

#### Locked State
- **Visual Indicator**: Transformed jobs appear "ghosted" (grayscale, reduced opacity) with a lock icon overlay.
- **Non-Draggable**: Locked cards cannot be moved between columns.
- **Read-Only**: Opening a locked job shows a banner and disables all form inputs.

### Technical Details

#### Database Schema
```sql
-- Added to jobs table
ALTER TABLE jobs ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
```

#### New Backend Endpoint
```
POST /api/jobs/:id/transform
```

#### New Tests
- Added 4 tests to `jobs.test.js` for transformation endpoint (success, not found, already locked, rollback).

---

## [3.9.0] - 2026-02-06

### Refactored
- **Shared Board Helpers**: Extract shared board behaviors into `createBoardHelpers()` factory.
  - Drag-and-drop, view toggle, markdown preview, panel close, file queue, ESC key handling.
  - `app.js`: 700 → 573 lines; `business.js`: 350 → 256 lines.
- **Bug Fix**: Business Board markdown preview now references correct id (`notes` vs `comments`).

---

## [3.8.0] - 2026-02-06

### Refactored
- **Module Extraction**: Split `app.js` into focused shared modules (36% reduction).
  - `shared/journey-map.js`: SVG status timeline rendering.
  - `shared/center-peek.js`: Read-only job detail modal with init pattern.
  - `shared/archive-vault.js`: Archive/restore modal with init pattern.
- **Bug Fix**: `updateColumnCounts` now includes all 8 statuses (pending, archived).
- **Deep Links**: Now open Center Peek (consistent with card clicks).

---

## [3.7.0] - 2026-02-06

### Refactored
- **DRY API Client**: Replace duplicated CRUD methods with `createCrudApi` and `createFilesApi` factories.
  - `api.js` reduced from 296 → 141 lines with zero consumer changes.

---

## [3.6.0] - 2026-02-06

### Changed
- **Version Correction**: Documentation version bump to align with release tags.

---

## [3.5.1] - 2026-02-05

### Changed
- **File Upload Limit**: Increased from 10MB to 20MB.
  - `nginx.conf`: Added `client_max_body_size 20M`.
  - `upload.js`: Increased `MAX_FILE_SIZE` constant.

---

## [3.5.0] - 2026-02-05

### 🚀 Feature: Business Entity Attachments & Unified File Queueing

This release extends file attachment capabilities to the Business Board and standardizes the experience across the application. It also introduces a "Queue & Upload" feature for smoother item creation.

### Added

#### Business Board Attachments
- **File Support**: Attach PDFs, Images, and Docs to Investors, VCs, and Connections.
- **Full Lifecycle**: Upload, Preview (Modal), Download, and Delete.
- **Queueing Engine**: Upload files *while* creating a new entity; they are queued and uploaded automatically upon save.

#### Job Board Enhancements
- **Connection Attachments**: Parity feature allowing "Connection" type cards to have attachments.
- **Creation Queue**: "Add File" button is now available immediately when creating a new job; files are queued and uploaded after the job is created.

### Technical Details

#### Database Schema
- New `business_entity_files` table mirroring `job_files` structure.

#### Backend
- `business-files.controller.js`: dedicated controller for business file operations.
- `business.routes.js`: updated routes to support file endpoints.

#### Testing
- Added `server/tests/business-files.test.js` for full coverage of the new endpoints.

### 🚀 Feature: Deep Linking from Dashboard

Clicking on a job card in the Dashboard (Upcoming Interviews or New Matches) now directly opens the Job Board with the **Center Peek** details modal automatically activated for that specific job.

### Changed
- **Dashboard**: "View" and "Review" buttons now use `?openJobId={id}` for direct navigation.
- **Job Board**: startup logic now checks for `openJobId` parameter and auto-opens the details panel.

## [3.4.0] - 2026-02-04

### 🚀 Feature: File Attachments & Secure Downloads

This release introduces full support for attaching files to job cards, with a focus on cross-browser compatibility and security. Users can now upload resumes, cover letters, and other documents directly to the board.

### Added

#### File Management
- **Uploads**: Attach PDFs, DOCX, and Images (up to 10MB) to any job card.
- **Inline Preview**: View PDFs and Images instantly in a dedicated modal without downloading.
- **Management**: Easy delete workflow with confirmation modals.

#### Secure & Robust Downloads
- **Safari Support**: Optimized download behavior (same-tab navigation) to comply with strict popup policies.
- **Chrome Support**: Explicit filename enforcement to prevent internal server paths from leaking.

### Technical Details

#### New Backend Files
- `server/controllers/files.controller.js` - Handles upload, download, and delete operations.
- `server/middleware/upload.js` - Multer configuration with UUID-based filename generation.
- `server/tests/files.test.js` - Comprehensive integration tests for file endpoints.

#### Database Schema
New `job_files` table to track attachments:
```sql
CREATE TABLE job_files (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100),
    size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Documentation
- **WIREFRAMING_GUIDE.md**: Added new standard protocol for AI-generated UI wireframes.
- **AI-GUIDE.md**: Updated with "Browser Quirks" section for file handling.

---

## [3.4.1] - 2026-02-05

### Changed
- **Documentation**: Updated AI-GUIDE with deep linking patterns.

---

## [3.1.3] - 2026-01-29

### Fixed
- **Status Dropdown**: Added missing 'Pending Next Step' option to the job edit form.

---

## [3.1.2] - 2026-01-28

### Fixed
- **Journey Map Visualization**: Corrected an issue where the first status change (e.g., Interview → Pending) was missing the starting node in the visualization. Now correctly displays the full path.

## [3.1.1] - 2026-01-28

### Fixed
- **Login Rate Limiter**: Improved logic to only count failed attempts (`4xx/5xx`) against the quota.
- **Increased Limits**: Raised limit from 5 to 15 failed attempts per 15 minutes to prevent lockout during normal use.

## [3.1.0] - 2026-01-28

### 🚀 Advanced Job Tracking & Journey Map

This release adds non-linear job tracking with the new "Pending Next Step" status and a visual Journey Map to see how jobs progress through different stages over time.

### Added

#### Pending Next Step Status
- **New Kanban Column**: "Pending Next Step" between Interview and Offer
- **Non-Linear Workflow**: Jobs can move back and forth (e.g., Interview → Pending → Interview)
- **Database Update**: Added 'pending' to job status enum

#### Job History Tracking
- **History Table**: New `job_history` table logs all status changes
- **Database Trigger**: Automatic logging on INSERT/UPDATE via PostgreSQL trigger
- **API Endpoint**: `GET /api/jobs/:id/history` returns status change history

#### Center Peek Modal
- **Journey Map Visualization**: Interactive SVG diagram showing job progression
- **Horizontal Scroll**: Spacious column layout with full status names
- **Visual Path**: Indigo line connecting status changes over time
- **Timeline Labels**: Relative timestamps (e.g., "2h ago") at each node
- **Quick Edit**: "Edit Details" button opens the full edit panel

### Changed
- **Card Click Behavior**: Clicking a job card now opens Center Peek (view mode)
- **Add Job**: "Add Job" button still opens the edit panel directly

### Technical Details

#### New Database Objects
```sql
-- History tracking table
CREATE TABLE job_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automatic trigger
CREATE TRIGGER trigger_log_job_status_change
AFTER INSERT OR UPDATE OF status ON jobs
FOR EACH ROW EXECUTE FUNCTION log_job_status_change();
```

#### New Test Cases (5 added)
- History endpoint returns data for valid job
- History endpoint returns 404 for non-existent job
- History endpoint returns empty array for no history
- Create job with 'pending' status
- Update job to 'pending' status

---

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

## [3.2.0] - 2026-02-02

### Added
- **Archive Vault 📦**:
    - **Archived Status**: New status for jobs to keep them off the main board but preserved in history.
    - **Archive Modal**: Dedicated view for archived jobs with list layout and "Restore" functionality.
    - **One-Click Archiving**: "Archive 📦" button added to the Job Detail panel.
    - **Journey Map Update**: Now includes 'Archived' as the final stage in the visualization.
- **UI Enhancements**:
    - **Custom Confirmation Modal**: Replaced native browser confirm dialogs with styled HTML/CSS modals for Archiving.
    - **Status Dropdown**: Added missing "Pending Next Step" option to Archive Modal and Detail Panel.
    - **Refined Styles**: Consistent glassmorphism styling for new modals.

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

## [1.0.0] - 2026-01-19

### Added
- **Forgotten Column**: New column for tracking stalled applications.
- **Timestamps**: Added created/updated timestamps to job cards.
- **Sorting**: Added ability to sort cards by rating and updated date.
- **Basic Board**: Original Kanban board implementation with localStorage.
