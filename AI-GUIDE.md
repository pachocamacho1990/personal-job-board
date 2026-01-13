# AI Development Guide - Personal Job Board

**Purpose**: Token-efficient reference for AI-assisted development. For human docs, see README.md and DESIGN.md.

## Quick Context
Vanilla JS Kanban board for job applications. localStorage-based, no backend. Supports 2 entity types (jobs + connections), 5 workflow stages, star ratings, markdown comments, compact/comfortable view toggle.

## Data Schema

```javascript
Job/Connection Object:
{
  id: "timestamp_string",           // Date.now().toString()
  type: "job" | "connection",       // Entity type

  // Core fields (both types)
  company: string,                  // Company name
  position: string,                 // Job title/role
  location: string,                 // Location
  salary: string,                   // Salary info

  // Connection-specific (optional)
  contactName: string,              // Person's name
  organization: string,             // Organization they belong to

  // Common fields
  status: "interested" | "applied" | "interview" | "offer" | "rejected",
  rating: 1-5,                      // Star rating (default: 3)
  comments: string,                 // Markdown-formatted notes
  dateAdded: ISO8601_string         // Creation timestamp
}
```

## State Variables (app.js)

```javascript
jobs = []                  // Main array of job/connection objects
currentJobId = null        // Selected job ID (null when panel closed)
isCompactView = false      // View mode: compact(true) or comfortable(false)
isPreviewMode = false      // Markdown: preview(true) or edit(false)
```

## Core Functions (app.js)

### Lifecycle
- `init()` - Bootstrap: loadJobs → loadViewPreference → renderAllJobs → setupEventListeners

### CRUD (always call saveJobs() after mutation)
- `createJob(jobData)` → Generates ID, adds to jobs[], saves, returns job
- `updateJob(id, updates)` → Partial merge update, saves, returns updated job or null
- `deleteJob(id)` → Filters out job, saves
- `getJob(id)` → Returns job object or undefined

### Storage
- `loadJobs()` → Reads from localStorage.jobApplications, auto-migrates old data, sets jobs[]
- `saveJobs()` → Writes jobs[] to localStorage.jobApplications

### Rendering
- `renderAllJobs()` → Clears all columns, renders all jobs, updates counts
- `renderJob(job)` → Creates card DOM, appends to correct column based on status
- `renderStars(rating)` → Returns HTML string: ★★★☆☆ format
- `updateColumnCounts()` → Updates count badges for all 5 columns

### Panel Management
- `openJobDetails(jobId)` → Opens panel, populates form (null = new item)
- `closeJobPanel()` → Closes panel, resets form, clears currentJobId, exits preview mode
- `toggleFieldsByType(type)` → Shows/hides connection-specific fields

### View Preferences
- `loadViewPreference()` → Reads from localStorage.viewPreference, sets isCompactView
- `saveViewPreference()` → Writes isCompactView to localStorage.viewPreference
- `toggleViewMode()` → Flips isCompactView, saves, updates icon, re-renders
- `updateViewIcon()` → Sets icon to ⊞ (compact) or ⊟ (comfortable)

### Form Handling
- `handleFormSubmit(e)` → Uses currentJobId to decide create vs update
- `handleDelete()` → Confirms, deletes, re-renders, closes panel
- `updateRatingDisplay()` → Highlights stars based on selected radio input

### Drag & Drop
- `handleDragStart(e)` → Stores draggedElement, adds .dragging class
- `handleDragEnd(e)` → Removes .dragging class
- `handleDragOver(e)` → Prevents default, sets dropEffect
- `handleDragEnter(e)` → Adds .drag-over to container
- `handleDragLeave(e)` → Removes .drag-over from container
- `handleDrop(e)` → Reads dataset.jobId and dataset.status, calls updateJob, re-renders

### Markdown
- `togglePreviewMode()` → Flips isPreviewMode, renders with marked.parse() or shows textarea

### Event Setup
- `setupEventListeners()` → Binds all click, submit, dragover, keydown handlers

## Key Patterns

### Display Logic (renderJob)
- **Jobs**: Show position as title, company as subtitle
- **Connections**: Show contactName (or position fallback) as title, organization (or company fallback) as subtitle
- **Emoji badges**: 🤝 = connection, 💼 = job
- **Compact view**: rating + title + badge on one line, metadata below (joined with •)
- **Comfortable view**: rating + badge header, title, subtitle, location, salary as separate lines

### State Management
- Always use `currentJobId` (global) over form hidden input for reliability
- Critical bug fix: view → close → add workflow must clear currentJobId in closeJobPanel()
- Auto-migration in loadJobs() adds type/rating to old data

### DOM Conventions
- `data-job-id` attribute on cards for identification
- `data-status` attribute on columns/containers
- `data-type` attribute on cards for styling hooks

### localStorage Keys
- `jobApplications` - Main data store (JSON array)
- `viewPreference` - "compact" or "comfortable"

## Design Tokens (styles.css :root)

### Status Colors
```css
--color-interested: #9d34da    (purple)
--color-applied: #0062cc       (blue)
--color-interview: #ff8c00     (orange)
--color-offer: #008000         (green)
--color-rejected: #9e9e9e      (gray)
```

### Spacing Scale
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
```

### Colors
```css
--bg-primary: #ffffff
--bg-secondary: #f7f6f3
--bg-hover: #f0f0f0
--border-color: #e3e3e3
--text-primary: #37352f
--text-secondary: #73726e
--text-tertiary: #a0a0a0
```

### Typography
```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
--font-mono: "SF Mono", Monaco, "Cascadia Code", monospace
```

## File Structure

```
├── index.html (183L)    - UI structure, form, columns
├── app.js (501L)        - All application logic
├── styles.css (756L)    - Complete design system
├── tests.js (335L)      - 18 unit tests (node tests.js)
├── server.py (23L)      - Python SimpleHTTPServer
├── README.md            - User documentation
├── DESIGN.md            - Design system docs
├── TESTING.md           - Testing philosophy
├── GITHUB.md            - Repo setup guide
└── *.png, *.webp        - Visual assets
```

## HTML Structure (index.html)

- `#addJobBtn` - Add new item button
- `#viewToggle` - Compact/comfortable toggle
- `.kanban-board` - Contains 5 `.column[data-status]` elements
  - `.cards-container[data-status]` - Drop zones for cards
- `#detailPanel.panel` - Lateral panel with `.panel-content`
  - `#jobForm` - Form with all fields
  - `.connection-fields` - contactName, organization (conditional display)
  - `.type-selector` - Radio inputs for job/connection
  - `.rating-input` - Radio inputs for 1-5 stars
  - `#comments` - Textarea for markdown
  - `#commentsPreview` - Div for rendered markdown
  - `#togglePreview` - Edit/Preview button

## Common Workflows

### Add New Item
1. User clicks #addJobBtn
2. openJobDetails(null) → sets currentJobId=null, resets form, shows panel
3. User fills form, submits
4. handleFormSubmit() → sees currentJobId is null → createJob()
5. renderAllJobs() → re-renders board
6. closeJobPanel() → hides panel

### Edit Existing Item
1. User clicks card → openJobDetails(jobId)
2. Sets currentJobId=jobId, populates form from getJob(jobId)
3. User edits, submits
4. handleFormSubmit() → sees currentJobId exists → updateJob(currentJobId, data)
5. Re-renders, closes panel

### Drag to Change Status
1. User drags card → handleDragStart stores draggedElement
2. User drops on new column → handleDrop reads jobId + newStatus
3. updateJob(jobId, {status: newStatus})
4. renderAllJobs() → card moves to new column

### Toggle View Mode
1. User clicks #viewToggle
2. toggleViewMode() → flips isCompactView, saves to localStorage
3. updateViewIcon() → changes button icon
4. renderAllJobs() → re-renders with new card classes

### Markdown Preview
1. User types in #comments textarea
2. User clicks #togglePreview
3. togglePreviewMode() → calls marked.parse(), shows #commentsPreview div
4. Click again → shows textarea, hides preview

## Dependencies

- **marked.js** (v11.1.1) - Loaded via CDN in index.html for markdown parsing
- **Python 3** - For local HTTP server (server.py)
- **Modern browser** - localStorage, ES6, drag-and-drop API

## Testing

Run: `node tests.js` (18 tests, console output)

Coverage: CRUD operations, state management, view preferences, localStorage persistence, critical bug (view→close→add workflow)

## Token-Saving Tips

1. **Read app.js selectively** - Use line ranges for specific functions instead of full file
2. **Reference this file first** - Before reading source, check if info is here
3. **Use function names** - All functions are single-purpose with clear names
4. **Pattern consistency** - All mutations follow: modify → saveJobs() → renderAllJobs()
5. **No abstractions** - Direct DOM manipulation, no frameworks to learn
