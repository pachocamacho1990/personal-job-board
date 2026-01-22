# Changelog

All notable changes to this project will be documented in this file.

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
