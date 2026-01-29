// State
let jobs = [];
let currentJobId = null;
let isCompactView = false; // View mode state
let isPreviewMode = false; // Markdown preview mode
let isFocusMode = false; // Focus mode state 🎯 (New)

// Date formatting helpers
function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return `${diffMonths}mo ago`;
}

function formatFullDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// DOM Elements
const addJobBtn = document.getElementById('addJobBtn');
const detailPanel = document.getElementById('detailPanel');
const closePanel = document.getElementById('closePanel');
const jobForm = document.getElementById('jobForm');
const deleteBtn = document.getElementById('deleteBtn');
const togglePreviewBtn = document.getElementById('togglePreview');
const commentsTextarea = document.getElementById('comments');
const commentsPreview = document.getElementById('commentsPreview');

// Initialize app
async function init() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/jobboard/login.html';
        return;
    }

    loadViewPreference();
    loadFocusPreference(); // Load focus mode state
    await loadJobs();
    setupEventListeners();

    // Hide loading overlay
    const loader = document.getElementById('appLoading');
    if (loader) loader.style.display = 'none';
}

// API functions
async function loadJobs() {
    try {
        jobs = await api.jobs.getAll();
        console.log(`✓ Loaded ${jobs.length} item(s) from database`);
        renderAllJobs();
    } catch (error) {
        console.error('Error loading jobs:', error);
        if (error.message === 'Unauthorized') {
            // Already redirected by api client
            return;
        }
        jobs = [];
        alert('Failed to load jobs. Please refresh the page.');
    }
}

// CRUD operations
async function createJob(jobData) {
    try {
        const newJob = await api.jobs.create(jobData);
        jobs.push(newJob);
        renderAllJobs();
        return newJob;
    } catch (error) {
        console.error('Error creating job:', error);
        alert('Failed to create job. Please try again.');
        throw error;
    }
}

async function updateJob(id, jobData) {
    try {
        const updatedJob = await api.jobs.update(id, jobData);
        const index = jobs.findIndex(j => j.id == id);
        if (index !== -1) {
            jobs[index] = updatedJob;
        }
        return updatedJob;
    } catch (error) {
        console.error('Error updating job:', error);
        alert('Failed to update job. Please try again.');
        throw error;
    }
}

async function deleteJob(id) {
    try {
        await api.jobs.delete(id);
        jobs = jobs.filter(j => j.id != id);
    } catch (error) {
        console.error('Error deleting job:', error);
        alert('Failed to delete job. Please try again.');
        throw error;
    }
}

function getJob(id) {
    return jobs.find(j => j.id === id);
}

// Helper function to render star rating
function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return `<span class="rating-stars">${filled}${empty}</span>`;
}

// View preference management
function loadViewPreference() {
    try {
        const saved = localStorage.getItem('viewPreference');
        isCompactView = saved === 'compact';
        updateViewIcon();
        console.log(`✓ Loaded view preference: ${isCompactView ? 'compact' : 'comfortable'}`);
    } catch (error) {
        console.error('Error loading view preference:', error);
        isCompactView = false;
    }
}

function saveViewPreference() {
    try {
        localStorage.setItem('viewPreference', isCompactView ? 'compact' : 'comfortable');
        console.log(`✓ Saved view preference: ${isCompactView ? 'compact' : 'comfortable'}`);
    } catch (error) {
        console.error('Error saving view preference:', error);
    }
}

function toggleViewMode() {
    isCompactView = !isCompactView;
    saveViewPreference();
    updateViewIcon();
    renderAllJobs();
}

function updateViewIcon() {
    const icon = document.getElementById('viewIcon');
    if (icon) {
        icon.textContent = isCompactView ? '⊞' : '⊟';
    }
}

// Focus Mode Management 🎯
function loadFocusPreference() {
    try {
        const saved = localStorage.getItem('focusMode');
        isFocusMode = saved === 'true';
        updateFocusUI();
        console.log(`✓ Loaded focus mode: ${isFocusMode ? 'ON' : 'OFF'}`);
    } catch (error) {
        console.error('Error loading focus preference:', error);
        isFocusMode = false;
    }
}

function saveFocusPreference() {
    try {
        localStorage.setItem('focusMode', isFocusMode);
        console.log(`✓ Saved focus mode: ${isFocusMode ? 'ON' : 'OFF'}`);
    } catch (error) {
        console.error('Error saving focus preference:', error);
    }
}

function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    saveFocusPreference();
    updateFocusUI();
    renderAllJobs(); // Re-render to filter items
}

function updateFocusUI() {
    const btn = document.getElementById('focusToggle');
    if (btn) {
        if (isFocusMode) {
            btn.classList.add('active');
            document.body.classList.add('focus-mode');
        } else {
            btn.classList.remove('active');
            document.body.classList.remove('focus-mode');
        }
    }
}

// Rendering
function renderAllJobs() {
    // Clear all containers
    document.querySelectorAll('.cards-container').forEach(container => {
        container.innerHTML = '';
    });

    // 🎯 Filter jobs based on Focus Mode
    // If Focus Mode is ON:
    // 1. Hide jobs with rating < 3
    // 2. Hide jobs in 'rejected' or 'forgotten' (columns are hidden via CSS, but we also filter items)
    const jobsToRender = isFocusMode
        ? jobs.filter(job => {
            const isHighRated = (job.rating || 3) >= 3;
            const isRelevantStatus = !['rejected', 'forgotten'].includes(job.status);
            return isHighRated && isRelevantStatus;
        })
        : jobs;

    // Render jobs in their respective columns
    jobsToRender.forEach(job => renderJob(job));

    // Update counts (show total count, even hidden ones, or filtered count?)
    // Let's show the filtered count to match visual state
    updateColumnCounts(jobsToRender);
}

function renderJob(job) {
    const container = document.querySelector(`.cards-container[data-status="${job.status}"]`);
    if (!container) return;

    const card = document.createElement('div');
    card.className = isCompactView ? 'job-card compact' : 'job-card';
    card.draggable = true;
    card.dataset.jobId = job.id;
    card.dataset.type = job.type;

    // Intelligently determine what to display
    const isConnection = job.type === 'connection';

    // For connections, prefer contactName, fall back to position if available
    // For jobs, use position
    const title = isConnection
        ? (job.contactName || job.position || 'Untitled')
        : (job.position || 'Untitled');

    // For connections, prefer organization, fall back to company
    // For jobs, use company
    const subtitle = isConnection
        ? (job.organization || job.company || '')
        : (job.company || '');

    const typeEmoji = isConnection ? '🤝' : '💼';
    const typeName = isConnection ? 'Connection' : 'Job';

    // Origin Emoji (Human vs Agent)
    const isAgent = job.origin === 'agent';
    const originClass = isAgent ? 'origin-agent' : 'origin-human';
    const originEmoji = isAgent ? '🤖' : '👤';

    // Build metadata array for compact view
    const metadata = [];
    if (subtitle) metadata.push(subtitle);
    if (job.location) metadata.push(job.location);
    if (job.salary) metadata.push(job.salary);

    if (isCompactView) {
        // Compact layout: rating + title + badges on one line
        const relativeTime = formatRelativeTime(job.updated_at);
        card.innerHTML = `
            <div class="card-header">
                ${renderStars(job.rating || 3)}
                <h3>${title}</h3>
                <div style="display:flex; gap:4px; margin-left: auto;">
                    <span class="type-badge ${job.type}">
                         <span class="type-emoji">${typeEmoji}</span>
                         ${typeName}
                    </span>
                    <span class="type-badge ${originClass}" title="Created by ${isAgent ? 'AI Agent' : 'Human'}">
                         <span class="type-emoji">${originEmoji}</span>
                    </span>
                </div>
            </div>
            <div class="card-footer">
                ${metadata.length > 0 ? `<span class="metadata">${metadata.join(' • ')}</span>` : ''}
                ${relativeTime ? `<span class="timestamp">${relativeTime}</span>` : ''}
            </div>
        `;
    } else {
        // Comfortable layout: original multi-line format with timestamp
        const relativeTime = formatRelativeTime(job.updated_at);
        card.innerHTML = `
            <div class="card-header">
                ${renderStars(job.rating || 3)}
                 <div style="display:flex; gap:4px">
                    <span class="type-badge ${job.type}">
                        <span class="type-emoji">${typeEmoji}</span>
                        ${typeName}
                    </span>
                    <span class="type-badge ${originClass}" title="Created by ${isAgent ? 'AI Agent' : 'Human'}">
                        <span class="type-emoji">${originEmoji}</span>
                    </span>
                 </div>
            </div>
            <h3>${title}</h3>
            <p class="company">${subtitle}</p>
            ${job.location ? `<p>${job.location}</p>` : ''}
            ${job.salary ? `<p>${job.salary}</p>` : ''}
            ${relativeTime ? `<p class="timestamp">Updated ${relativeTime}</p>` : ''}
        `;
    }

    // Click to view details
    card.addEventListener('click', () => openJobDetails(job.id));

    // Drag and drop
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    // Shine Effect for Unseen Jobs
    if (job.is_unseen) {
        card.classList.add('shining');
    }

    container.appendChild(card);
}

function updateColumnCounts(visibleJobs = jobs) {
    // If no jobs arg provided (legacy call), use global list
    // But renderAllJobs passes visibleJobs now.

    const statuses = ['interested', 'applied', 'forgotten', 'interview', 'offer', 'rejected'];
    statuses.forEach(status => {
        const count = visibleJobs.filter(j => j.status === status).length;
        const badge = document.querySelector(`.column[data-status="${status}"] .count-badge`);
        if (badge) badge.textContent = count;
    });
}

// Panel functions
function openJobDetails(jobId) {
    currentJobId = jobId;
    const job = getJob(jobId);

    if (job) {
        // Handle Unseen State (Dismiss Shine)
        if (job.is_unseen) {
            // Optimistic update locally
            job.is_unseen = false;
            // Remove class from DOM immediately
            const card = document.querySelector(`.job-card[data-job-id="${jobId}"]`);
            if (card) card.classList.remove('shining');

            // Send API update silently
            api.jobs.update(jobId, { is_unseen: false }).catch(err => console.error("Failed to dismiss shine", err));
        }

        // Edit existing entry
        const isConnection = job.type === 'connection';
        document.getElementById('panelTitle').textContent = isConnection ? 'Edit Connection' : 'Edit Job';
        document.getElementById('jobId').value = job.id;

        // Set type
        document.querySelector(`input[name="type"][value="${job.type}"]`).checked = true;
        toggleFieldsByType(job.type);

        // Set Origin (Human/Agent)
        const originVal = job.origin || 'human'; // Default to human if null
        const originInput = document.querySelector(`input[name="origin"][value="${originVal}"]`);
        if (originInput) originInput.checked = true;

        // Populate all fields
        document.getElementById('contactName').value = job.contactName || '';
        document.getElementById('organization').value = job.organization || '';
        document.getElementById('company').value = job.company || '';
        document.getElementById('position').value = job.position || '';
        document.getElementById('location').value = job.location || '';
        document.getElementById('salary').value = job.salary || '';
        document.getElementById('status').value = job.status;
        document.getElementById('comments').value = job.comments;

        // Set rating
        const ratingInput = document.querySelector(`input[name="rating"][value="${job.rating || 3}"]`);
        if (ratingInput) ratingInput.checked = true;
        updateRatingDisplay();

        // Display timestamps in the info section
        const timestampInfo = document.getElementById('timestampInfo');
        if (timestampInfo) {
            timestampInfo.innerHTML = `
                <div class="timestamp-row">
                    <span class="timestamp-label">Created:</span>
                    <span class="timestamp-value">${formatFullDate(job.created_at)}</span>
                </div>
                <div class="timestamp-row">
                    <span class="timestamp-label">Updated:</span>
                    <span class="timestamp-value">${formatFullDate(job.updated_at)}</span>
                </div>
            `;
            timestampInfo.style.display = 'block';
        }

        deleteBtn.style.display = 'block';
    } else {
        // New entry
        currentJobId = null; // Ensure global state is cleared
        document.getElementById('panelTitle').textContent = 'Add New Item';
        jobForm.reset();
        document.getElementById('jobId').value = '';  // Clear hidden field AFTER reset to ensure it stays empty

        // Default to job type
        document.querySelector('input[name="type"][value="job"]').checked = true;
        // Default to human origin
        document.querySelector('input[name="origin"][value="human"]').checked = true;

        toggleFieldsByType('job');
        updateRatingDisplay();  // Reset star display to default (3 stars)

        // Hide timestamps for new entries
        const timestampInfo = document.getElementById('timestampInfo');
        if (timestampInfo) {
            timestampInfo.style.display = 'none';
        }

        deleteBtn.style.display = 'none';
    }

    detailPanel.classList.add('open');
}

// Toggle field visibility based on type
function toggleFieldsByType(type) {
    const connectionFields = document.querySelector('.connection-fields');

    // Only toggle connection-specific fields
    // Core fields (company, position, location, salary) are always visible
    if (type === 'connection') {
        connectionFields.style.display = 'block';
    } else {
        connectionFields.style.display = 'none';
    }
}

// Update rating display to highlight selected stars
function updateRatingDisplay() {
    const selectedRating = parseInt(document.querySelector('input[name="rating"]:checked')?.value || 3);
    const labels = document.querySelectorAll('.rating-input label');

    labels.forEach((label, index) => {
        if (index < selectedRating) {
            label.classList.add('highlighted');
        } else {
            label.classList.remove('highlighted');
        }
    });
}

function closeJobPanel() {
    detailPanel.classList.remove('open');
    jobForm.reset();
    document.getElementById('jobId').value = ''; // Explicitly clear hidden ID
    currentJobId = null;

    // Reset to edit mode when closing
    if (isPreviewMode) {
        togglePreviewMode();
    }
}

// Form handling
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.querySelector('input[name="type"]:checked').value,
        origin: document.querySelector('input[name="origin"]:checked').value,

        // Connection fields
        contact_name: document.getElementById('contactName').value,
        organization: document.getElementById('organization').value,

        // Job fields
        company: document.getElementById('company').value,
        position: document.getElementById('position').value,
        location: document.getElementById('location').value,
        salary: document.getElementById('salary').value,

        // Common fields
        status: document.getElementById('status').value,
        rating: parseInt(document.querySelector('input[name="rating"]:checked').value) || 3,
        comments: document.getElementById('comments').value
    };

    try {
        // Use global state instead of hidden input for reliability
        if (currentJobId) {
            // Update existing job
            await updateJob(currentJobId, formData);
        } else {
            // Create new job
            await createJob(formData);
        }

        renderAllJobs();
        closeJobPanel();
    } catch (error) {
        // Error already displayed by CRUD functions
    }
}

async function handleDelete() {
    if (currentJobId && confirm('Are you sure you want to delete this job?')) {
        try {
            await deleteJob(currentJobId);
            renderAllJobs();
            closeJobPanel();
        } catch (error) {
            // Error already displayed by deleteJob
        }
    }
}

// Drag and Drop
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (e.target.classList.contains('cards-container')) {
        e.target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('cards-container')) {
        e.target.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    e.preventDefault();

    const container = e.target.closest('.cards-container');
    if (container && draggedElement) {
        const jobId = draggedElement.dataset.jobId;
        const newStatus = container.dataset.status;

        // Update job status
        updateJob(jobId, { status: newStatus }).then(() => {
            // Re-render
            renderAllJobs();
        });

        container.classList.remove('drag-over');
    }

    return false;
}

// Markdown Preview Toggle
function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;

    if (isPreviewMode) {
        // Switch to preview mode
        const markdown = commentsTextarea.value;
        commentsPreview.innerHTML = markdown ? marked.parse(markdown) : '<p style="color: var(--text-tertiary);">No comments yet...</p>';
        commentsTextarea.style.display = 'none';
        commentsPreview.style.display = 'block';
        togglePreviewBtn.textContent = 'Edit';
        togglePreviewBtn.classList.add('active');
    } else {
        // Switch to edit mode
        commentsTextarea.style.display = 'block';
        commentsPreview.style.display = 'none';
        togglePreviewBtn.textContent = 'Preview';
        togglePreviewBtn.classList.remove('active');
    }
}

// Event Listeners
function setupEventListeners() {
    // Add job button
    addJobBtn.addEventListener('click', () => openJobDetails(null));

    // Close panel
    closePanel.addEventListener('click', closeJobPanel);

    // Form submit
    jobForm.addEventListener('submit', handleFormSubmit);

    // Delete button
    deleteBtn.addEventListener('click', handleDelete);

    // Type selector change
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleFieldsByType(e.target.value);
        });
    });

    // Rating selector change - highlight stars
    document.querySelectorAll('input[name="rating"]').forEach(radio => {
        radio.addEventListener('change', updateRatingDisplay);
    });

    // Drag and drop on containers
    document.querySelectorAll('.cards-container').forEach(container => {
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
    });

    // Close panel on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && detailPanel.classList.contains('open')) {
            closeJobPanel();
        }
    });

    // View toggle button
    document.getElementById('viewToggle').addEventListener('click', toggleViewMode);

    // Focus toggle button (New)
    const focusToggle = document.getElementById('focusToggle');
    if (focusToggle) {
        focusToggle.addEventListener('click', toggleFocusMode);
    }

    // Markdown preview toggle
    togglePreviewBtn.addEventListener('click', togglePreviewMode);
}

// Start the app
// Start the app
init();

/* --- New Features: Center Peek & Journey Map --- */

const centerPeekModal = document.getElementById('centerPeekModal');
const closeCenterPeekBtn = document.getElementById('closeCenterPeek');
const peekContent = document.getElementById('peekContent');

// Update statuses to include 'pending'
const ALL_STATUSES = ['interested', 'applied', 'interview', 'pending', 'offer', 'rejected', 'forgotten'];

// Override updateColumnCounts to use new status list
function updateColumnCounts(visibleJobs = jobs) {
    ALL_STATUSES.forEach(status => {
        const count = visibleJobs.filter(j => j.status === status).length;
        const badge = document.querySelector(`.column[data-status="${status}"] .count-badge`);
        if (badge) badge.textContent = count;
    });
}

/**
 * Open the Center Peek Modal (Journey Map View)
 */
async function openCenterPeek(jobId) {
    const job = getJob(jobId);
    if (!job) return;

    currentJobId = jobId;

    // Show modal loading state
    centerPeekModal.classList.add('open');
    peekContent.innerHTML = '<div style="color:white; padding:2rem;">Loading history...</div>';

    try {
        // Fetch history
        const history = await api.jobs.getHistory(jobId);
        renderCenterPeekContent(job, history);
    } catch (error) {
        console.error("Failed to load history", error);
        peekContent.innerHTML = '<div style="color:var(--color-danger); padding:2rem;">Failed to load history.</div>';
    }
}

function closeCenterPeek() {
    centerPeekModal.classList.remove('open');
    peekContent.innerHTML = '';
}

if (closeCenterPeekBtn) {
    closeCenterPeekBtn.addEventListener('click', closeCenterPeek);
    // Close on background click
    centerPeekModal.addEventListener('click', (e) => {
        if (e.target === centerPeekModal) closeCenterPeek();
    });
}

function renderCenterPeekContent(job, history) {
    // 1. Structure
    peekContent.innerHTML = `
        <div class="journey-map-section">
            <div class="journey-header">
                <h1>${job.position || 'Untitled'}</h1>
                <p class="company">${job.company || 'Unknown Company'}</p>
            </div>
            <div class="journey-graph-container" id="journeyGraph">
                <!-- SVG injected here -->
            </div>
        </div>
        <div class="job-details-section">
            <div class="detail-row">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="type-badge ${job.type}" style="font-size: 1rem; padding: 4px 12px;">
                        ${job.status.toUpperCase()}
                    </span>
                 </div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Location</div>
                <div class="detail-value">${job.location || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Salary</div>
                <div class="detail-value">${job.salary || '-'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Comments</div>
                <div class="detail-value markdown-body">${job.comments ? marked.parse(job.comments) : 'No comments'}</div>
            </div>
            <div style="margin-top: 2rem;">
                <button id="editJobFromPeek" class="btn-primary" style="width:100%">Edit Details</button>
            </div>
        </div>
    `;

    document.getElementById('editJobFromPeek').addEventListener('click', () => {
        closeCenterPeek();
        // Use the original openJobDetails (exposed on window) to bypass the Center Peek redirect
        window.openRealEditPanel(job.id);
    });

    // 2. Render Graph
    setTimeout(() => renderJourneyMap(history, job.status), 0);
}

/**
 * Render SVG Journey Map
 * X-axis: Statuses
 * Y-axis: Time (History Entries)
 */
function renderJourneyMap(history, currentStatus) {
    const container = document.getElementById('journeyGraph');
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 600;
    const height = Math.max(400, history.length * 100 + 100);
    const padding = { top: 60, right: 40, bottom: 40, left: 80 };

    // Columns config - Complete job flow including end states
    const columns = ['interested', 'applied', 'interview', 'pending', 'offer', 'rejected', 'forgotten'];
    const colWidth = (width - padding.left - padding.right) / (columns.length - 1);

    // Combine history + current state if not redundant
    // Sort history by date desc (newest first) -> effectively bottom up?
    // Let's visualize Top = Oldest, Bottom = Newest (Time flows down)
    const sortedHistory = [...history].sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));

    // Add "Start" node? Or just first history status
    // Ensure we map status to an X coordinate
    function getX(status) {
        let idx = columns.indexOf(status);
        if (idx === -1) {
            idx = 0; // Default to first column for unknown statuses
        }
        return padding.left + (idx * colWidth);
    }

    // Generate Nodes
    const nodes = sortedHistory.map((entry, i) => ({
        x: getX(entry.new_status),
        y: padding.top + (i * 80),
        status: entry.new_status,
        date: entry.changed_at,
        label: formatFullDate(entry.changed_at),
        isCurrent: false
    }));

    // If no history, show current status as single node
    if (nodes.length === 0) {
        nodes.push({
            x: getX(currentStatus),
            y: padding.top,
            status: currentStatus,
            date: new Date().toISOString(),
            label: 'Current Status',
            isCurrent: true
        });
    } else {
        // Mark last as current
        nodes[nodes.length - 1].isCurrent = true;
    }

    // SVG Content
    let svgHtml = `<svg width="${width}" height="${height}" style="overflow: visible;">`;

    // 1. Draw Column Lines & Labels
    columns.forEach((col, i) => {
        const x = padding.left + (i * colWidth);
        // Line
        svgHtml += `<line x1="${x}" y1="${padding.top - 20}" x2="${x}" y2="${height}" stroke="#334155" stroke-dasharray="4" />`;
        // Label
        svgHtml += `<text x="${x}" y="${padding.top - 30}" class="status-column-label">${col}</text>`;
    });

    // 2. Draw Paths
    let pathD = "";
    if (nodes.length > 1) {
        pathD = `M ${nodes[0].x} ${nodes[0].y}`;
        for (let i = 1; i < nodes.length; i++) {
            // Bezier curve or straight line? Straight zig-zag is clearer for "Journey"
            // Let's use simple lines with rounded corners logic if possible, or just L
            pathD += ` L ${nodes[i].x} ${nodes[i].y}`;
        }
        svgHtml += `<path d="${pathD}" class="journey-path active" />`;
    }

    // 3. Draw Nodes
    nodes.forEach(node => {
        const r = node.isCurrent ? 8 : 5;
        const classes = `journey-node ${node.isCurrent ? 'active' : ''}`;
        svgHtml += `<circle cx="${node.x}" cy="${node.y}" r="${r}" class="${classes}" />`;

        // Date Label (Left)
        svgHtml += `<text x="${node.x - 15}" y="${node.y + 4}" class="time-label">${formatRelativeTime(node.date)}</text>`;

        // Status Label (Right - optional if column is clear)
        // svgHtml += `<text x="${node.x + 15}" y="${node.y + 4}" fill="#94A3B8" font-size="10">${node.status}</text>`;
    });

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}

// Intercept clicks on job cards to open Center Peek instead
// We need to override the existing event listeners or just attach new ones that stop propagation?
// The existing `renderJob` adds `card.addEventListener('click', () => openJobDetails(job.id));`
// We can overwrite `renderJob` entirely or hack it.
// Since we are appending code, we can't easily overwrite `renderJob` inside `app.js` without rewriting the whole function.
// However, `renderJob` uses `openJobDetails`. We can re-define `openJobDetails` efficiently?
// No, `openJobDetails` is defined earlier. Re-defining it here (since var/function hoisting or overwrite) might work if it's global scope.
// `openJobDetails` is a function declaration at top level. We can overwrite it.

// Redefine openJobDetails to redirect to Center Peek
// BUT standard edit functionality is needed.
// Strategy: openJobDetails is "Edit Mode". We want "View Mode" (Center Peek) on Card Click.
// We should update `renderJob` to call `openCenterPeek`.
// Since we can't easily replace `renderJob`, let's redefine `openJobDetails` to act as a router?
// "If clicking card -> Center Peek. If clicking 'Edit' in Center Peek -> Real Edit Panel."
// The card click calls `openJobDetails(job.id)`.
// So if we redefine `openJobDetails` to call `openCenterPeek`, we achieve the goal.
// THEN we need a function `openEditPanel` (the old `openJobDetails`) for the actual edit form.

const originalOpenJobDetails = openJobDetails;
openJobDetails = function (jobId) {
    if (jobId === null) {
        // "Add Job" button passes null -> Go straight to Edit Panel (Add Mode)
        originalOpenJobDetails(null);
    } else {
        // Open Center Peek
        openCenterPeek(jobId);
    }
};

// We need to expose the "Real" open edit panel for the "Edit Details" button in Peek
// We can attach it to window or just call originalOpenJobDetails
window.openRealEditPanel = originalOpenJobDetails;

// Fix the Edit Button listener in renderCenterPeekContent to use originalOpenJobDetails
// Rewriting renderCenterPeekContent's listener above:
/*
    document.getElementById('editJobFromPeek').addEventListener('click', () => {
        closeCenterPeek();
        originalOpenJobDetails(job.id);
    });
*/
// We need to make sure `originalOpenJobDetails` is available in that scope.
// Since `renderCenterPeekContent` is defined after `originalOpenJobDetails` assignment, it works.


