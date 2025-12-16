# Job Board - Personal Application Tracker

![Job Board Preview](preview.png)

A minimalist Kanban board to track job applications and networking connections.

## Features

- 🤝 **Dual Entity System**: Track connections and job applications together
- ⭐ **Star Ratings**: 1-5 stars to prioritize opportunities
- 🎯 **Visual Badges**: Emoji icons and type badges for quick scanning
- 📋 **Kanban Workflow**: Drag-and-drop through 5 stages
- 🗜️ **Compact View**: Toggle between comfortable and compact card layouts
- 💾 **Local Storage**: All data stays on your machine

## Quick Start

```bash
cd /Users/pachocamacho/personal-job-board
python3 server.py
```

Open **http://localhost:8000** in your browser.

> **Why a server?** Browsers block localStorage on `file://` URLs. The server enables proper data persistence.

## Usage

**Connections (🤝)**: Networking contacts that may lead to opportunities
- Fields: Contact Name, Organization, Company, Position, Location, Salary

**Jobs (💼)**: Formal applications to specific roles  
- Fields: Company, Position, Location, Salary

**Star Ratings**: Click a star (1-5) to set priority level

**View Toggle**: Click the ⊟/⊞ button in the header to switch between:
- **Comfortable view** (⊟): Full-size cards with multi-line layout
- **Compact view** (⊞): Condensed cards (~50% smaller) for seeing more at once

**Workflow**: Interested → Applied → Interview → Offer → Rejected

## Data Storage

Data lives in your browser's localStorage. To keep your data:
- Use the same browser
- Access via http://localhost:8000
- Don't clear browser data

**View in Chrome DevTools**: Application tab → Local Storage → http://localhost:8000

## Files

- `index.html` - Application UI
- `styles.css` - Design system
- `app.js` - Core logic
- `server.py` - Local HTTP server
