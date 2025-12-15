# Job Board - Personal Application Tracker

A minimalist Kanban-style job board to track your job applications.

## Quick Start

**Run the local server:**
```bash
cd /Users/pachocamacho/personal-job-board
python3 server.py
```

Then open **http://localhost:8000** in your browser.

> **Why do I need a server?**  
> Browsers restrict localStorage for `file://` URLs for security reasons. Running a local server fixes this and ensures your data persists properly.

## Usage

- **Add Job**: Click "+ Add Job" button
- **View Details**: Click any job card
- **Move Between Stages**: Drag and drop cards
- **Edit**: Click a card, modify fields, and save
- **Delete**: Open a card and click "Delete"
- **Track Progress**: Use the comments field to log notes

## Features

- 5 workflow stages: Interested → Applied → Interview → Offer → Rejected
- Lateral detail panel with all job information
- Comments field for progress tracking
- Drag-and-drop functionality
- Auto-save to localStorage
- Clean, minimalist design

## Data Storage

All data is stored locally in your browser's localStorage. As long as you:
- Use the same browser
- Access via http://localhost:8000 (not file://)
- Don't clear browser data

Your jobs will persist indefinitely.

## Data Storage

All data is stored locally in your browser's localStorage. As long as you:
- Use the same browser
- Access via http://localhost:8000 (not file://)
- Don't clear browser data

Your jobs will persist indefinitely.

### Physical Location on Disk

**For Chrome:**
```
~/Library/Application Support/Google/Chrome/Profile 1/Local Storage/leveldb/
```

**To navigate there in Finder:**
1. Press `Cmd+Shift+G`
2. Paste: `~/Library/Application Support/Google/Chrome/Profile 1/Local Storage/leveldb/`
3. Hit Enter

**Note:** The data is stored in binary LevelDB database files (`.ldb` files), not plain text. Your job board data is mixed with localStorage from all websites. To view or export your job data, use:
- Chrome DevTools → Application tab → Local Storage → http://localhost:8000
- Or check the browser console for logs like "✓ Loaded X job(s) from localStorage"

## Files

- `index.html` - Main application
- `styles.css` - Minimalist design system
- `app.js` - Application logic
- `server.py` - Local HTTP server
