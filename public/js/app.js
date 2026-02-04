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
            // Focus Mode: Hide rejected, forgotten, and archived
            const isRelevantStatus = !['rejected', 'forgotten', 'archived'].includes(job.status);
            return isHighRated && isRelevantStatus;
        })
        : jobs.filter(job => job.status !== 'archived'); // Default: Hide archived jobs, show everything else including rejected

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

        // Show attachments section and load files for existing jobs
        const attachmentsSection = document.getElementById('attachmentsSection');
        if (attachmentsSection) {
            attachmentsSection.style.display = 'block';
            loadJobFiles(job.id);
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

        // Hide attachments section for new jobs (no ID yet)
        const attachmentsSection = document.getElementById('attachmentsSection');
        if (attachmentsSection) {
            attachmentsSection.style.display = 'none';
            document.getElementById('filesList').innerHTML = '';
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

/* --- File Attachments --- */
let currentJobFiles = [];
let fileToDeleteId = null;

async function loadJobFiles(jobId) {
    const filesList = document.getElementById('filesList');
    if (!filesList) return;

    filesList.innerHTML = '<div class="loading-files">Loading files...</div>';

    try {
        currentJobFiles = await api.files.getAll(jobId);
        renderFilesList();
    } catch (error) {
        console.error('Error loading files:', error);
        filesList.innerHTML = '<div class="files-error">Failed to load files</div>';
    }
}

function renderFilesList() {
    const filesList = document.getElementById('filesList');
    if (!filesList) return;

    if (currentJobFiles.length === 0) {
        filesList.innerHTML = '<div class="no-files">No files attached</div>';
        return;
    }

    filesList.innerHTML = currentJobFiles.map(file => {
        const isPreviewable = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
        const fileIcon = getFileIcon(file.mimetype);
        const downloadUrl = api.files.getDownloadUrl(currentJobId, file.id);
        const token = localStorage.getItem('authToken');
        const authedDownloadUrl = `${downloadUrl}?token=${encodeURIComponent(token)}`;

        return `
            <div class="file-item" data-file-id="${file.id}">
                <span class="file-icon">${fileIcon}</span>
                <span class="file-name">${file.originalName}</span>
                <div class="file-actions">
                    ${isPreviewable ? `<button type="button" class="btn-icon btn-view" title="View" onclick="event.stopPropagation(); openFilePreview(${file.id})">👁</button>` : ''}
                    <a href="${authedDownloadUrl}" class="btn-icon btn-download" title="Download" target="_blank" onclick="event.stopPropagation();">⬇</a>
                    <button type="button" class="btn-icon btn-delete-file" title="Delete" onclick="event.stopPropagation(); handleFileDelete(${file.id})">🗑</button>
                </div>
            </div>
        `;
    }).join('');
}

function getFileIcon(mimetype) {
    if (mimetype === 'application/pdf') return '📄';
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype === 'text/plain') return '📃';
    return '📎';
}

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentJobId) return;

    const addFileBtn = document.getElementById('addFileBtn');
    const originalText = addFileBtn.textContent;
    addFileBtn.textContent = 'Uploading...';
    addFileBtn.disabled = true;

    try {
        const uploaded = await api.files.upload(currentJobId, file);
        currentJobFiles.unshift(uploaded);
        renderFilesList();
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload file: ' + error.message);
    } finally {
        addFileBtn.textContent = originalText;
        addFileBtn.disabled = false;
        e.target.value = ''; // Reset input
    }
}

function handleFileDelete(fileId) {
    fileToDeleteId = fileId;
    const modal = document.getElementById('fileDeleteConfirmModal');
    modal.style.display = 'flex';
}

function openFilePreview(fileId) {
    const file = currentJobFiles.find(f => f.id === fileId);
    if (!file) return;

    const modal = document.getElementById('filePreviewModal');
    const previewFileName = document.getElementById('previewFileName');
    const previewContent = document.getElementById('filePreviewContent');
    const downloadBtn = document.getElementById('previewDownloadBtn');

    const downloadUrl = api.files.getDownloadUrl(currentJobId, file.id);
    const token = localStorage.getItem('authToken');

    // URL for download/link (attachment disposition)
    const downloadLinkUrl = `${downloadUrl}?token=${encodeURIComponent(token)}`;

    // URL for preview (inline disposition)
    const previewUrl = `${downloadUrl}?token=${encodeURIComponent(token)}&preview=true`;

    previewFileName.textContent = file.originalName;
    downloadBtn.href = downloadLinkUrl;

    if (file.mimetype === 'application/pdf') {
        previewContent.innerHTML = `<embed src="${previewUrl}" type="application/pdf" width="100%" height="100%">`;
    } else if (file.mimetype.startsWith('image/')) {
        previewContent.innerHTML = `<img src="${previewUrl}" alt="${file.originalName}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    } else {
        previewContent.innerHTML = `<div class="preview-fallback">
            <p>Preview not available for this file type.</p>
            <a href="${downloadLinkUrl}" class="btn-primary" download>Download File</a>
        </div>`;
    }

    modal.classList.add('open');
}

function closeFilePreview() {
    const modal = document.getElementById('filePreviewModal');
    const previewContent = document.getElementById('filePreviewContent');
    modal.classList.remove('open');
    previewContent.innerHTML = '';
}

// Expose functions to global scope for onclick handlers
window.openFilePreview = openFilePreview;
window.handleFileDelete = handleFileDelete;

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

    // File attachment handlers
    const addFileBtn = document.getElementById('addFileBtn');
    const fileInput = document.getElementById('fileInput');
    const closeFilePreviewBtn = document.getElementById('closeFilePreview');
    const filePreviewModal = document.getElementById('filePreviewModal');

    if (addFileBtn) {
        addFileBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    if (closeFilePreviewBtn) {
        closeFilePreviewBtn.addEventListener('click', closeFilePreview);
    }

    if (filePreviewModal) {
        filePreviewModal.addEventListener('click', (e) => {
            if (e.target === filePreviewModal) closeFilePreview();
        });
    }
}

// Start the app
// Start the app
init();

/* --- New Features: Center Peek & Journey Map --- */

const centerPeekModal = document.getElementById('centerPeekModal');
const closeCenterPeekBtn = document.getElementById('closeCenterPeek');
const peekContent = document.getElementById('peekContent');

// All status types including the new 'pending' status
const ALL_STATUSES = ['interested', 'applied', 'interview', 'pending', 'offer', 'rejected', 'forgotten', 'archived'];
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

    // Columns config - Matches job board column order
    const columns = ['interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected', 'archived'];

    // Fixed width per column for horizontal scroll
    const colWidth = 100;
    const padding = { top: 50, right: 30, bottom: 30, left: 30 };
    const totalWidth = padding.left + (columns.length - 1) * colWidth + padding.right;
    const width = Math.max(container.clientWidth || 500, totalWidth);
    const height = Math.max(350, history.length * 80 + 120);


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
    const nodes = [];

    // 1. Add Start Node (from first history entry's previous_status)
    if (sortedHistory.length > 0) {
        const firstEntry = sortedHistory[0];
        if (firstEntry.previous_status) {
            nodes.push({
                x: getX(firstEntry.previous_status),
                y: padding.top,
                status: firstEntry.previous_status,
                date: firstEntry.changed_at, // Use same date as change? Or slightly earlier?
                label: 'Start',
                isCurrent: false,
                isStart: true
            });
        }
    }

    // 2. Add History Nodes (new_status)
    sortedHistory.forEach((entry, i) => {
        // Offset y to accommodate start node
        const yOffset = (nodes.length > 0 && nodes[0].isStart) ? ((i + 1) * 80) : (i * 80);

        nodes.push({
            x: getX(entry.new_status),
            y: padding.top + yOffset,
            status: entry.new_status,
            date: entry.changed_at,
            label: formatFullDate(entry.changed_at),
            isCurrent: false
        });
    });

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
        // Line - lighter color, contained within SVG bounds
        svgHtml += `<line x1="${x}" y1="${padding.top + 10}" x2="${x}" y2="${height - padding.bottom}" stroke="#E2E8F0" stroke-dasharray="4" />`;
        // Label - full name, centered on column
        const label = col.charAt(0).toUpperCase() + col.slice(1);
        svgHtml += `<text x="${x}" y="${padding.top - 5}" class="status-column-label">${label}</text>`;
    });

    // 2. Draw Paths
    let pathD = "";
    if (nodes.length > 1) {
        pathD = `M ${nodes[0].x} ${nodes[0].y}`;
        for (let i = 1; i < nodes.length; i++) {
            pathD += ` L ${nodes[i].x} ${nodes[i].y}`;
        }
        svgHtml += `<path d="${pathD}" class="journey-path active" />`;
    }

    // 3. Draw Nodes
    nodes.forEach(node => {
        const r = node.isCurrent ? 10 : 6;
        const classes = `journey-node ${node.isCurrent ? 'active' : ''}`;
        svgHtml += `<circle cx="${node.x}" cy="${node.y}" r="${r}" class="${classes}" />`;

        // Date Label - positioned consistently to the right of node
        svgHtml += `<text x="${node.x + 15}" y="${node.y + 4}" class="time-label">${formatRelativeTime(node.date)}</text>`;
    });

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}

// Override openJobDetails to show Center Peek for existing jobs, Edit Panel for new jobs
const originalOpenJobDetails = openJobDetails;
openJobDetails = function (jobId) {
    if (jobId === null) {
        originalOpenJobDetails(null); // Add Mode → Edit Panel
    } else {
        openCenterPeek(jobId); // View Mode → Center Peek
    }
};

// Expose original edit function for "Edit Details" button in Center Peek
window.openRealEditPanel = originalOpenJobDetails;

/* --- Archive Vault Logic --- */

const archiveModal = document.getElementById('archiveModal');
const closeArchiveModalBtn = document.getElementById('closeArchiveModal');
const archiveContent = document.getElementById('archiveContent');
const archiveBtnHeader = document.getElementById('archiveBtn');
const archiveJobBtnPanel = document.getElementById('archiveJobBtn');

function openArchiveModal() {
    const archivedJobs = jobs.filter(j => j.status === 'archived');
    renderArchiveList(archivedJobs);
    archiveModal.classList.add('open');
}

function closeArchiveModal() {
    archiveModal.classList.remove('open');
}

function renderArchiveList(archivedJobs) {
    if (archivedJobs.length === 0) {
        archiveContent.innerHTML = `
            <div class="archive-empty">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                <h3>The Vault is Empty</h3>
                <p>Jobs you archive will appear here.</p>
            </div>
        `;
        return;
    }

    const listContainer = document.createElement('div');
    listContainer.className = 'archive-list';

    // Header Row
    const headerRow = document.createElement('div');
    headerRow.className = 'archive-row';
    headerRow.style.background = 'var(--bg-secondary)';
    headerRow.style.borderBottom = '2px solid var(--border-color)';
    headerRow.style.fontWeight = '600';
    headerRow.style.color = 'var(--text-secondary)';
    headerRow.style.fontSize = 'var(--font-size-xs)';
    headerRow.style.textTransform = 'uppercase';
    headerRow.innerHTML = `
        <div class="archive-col-main">Job Details</div>
        <div class="archive-col-status">Status</div>
    `;
    listContainer.appendChild(headerRow);

    archivedJobs.forEach(job => {
        const row = document.createElement('div');
        row.className = 'archive-row';

        const isConnection = job.type === 'connection';
        const title = isConnection ? (job.contactName || job.position) : job.position;
        const subtitle = isConnection ? (job.organization || job.company) : job.company;

        row.innerHTML = `
            <div class="archive-col-main">
                <div class="archive-title">${title || 'Untitled'}</div>
                <div class="archive-company">${subtitle || 'Unknown'}</div>
            </div>
            <div class="archive-col-status">
                <select class="archive-status-select" data-job-id="${job.id}">
                    <option value="archived" selected>📦 Archived</option>
                    <option value="interested">Interested</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="pending">Pending Next Step</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
        `;
        listContainer.appendChild(row);
    });

    archiveContent.innerHTML = '';
    archiveContent.appendChild(listContainer);

    // Event listeners for status changes (Restore)
    document.querySelectorAll('.archive-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const jobId = e.target.dataset.jobId;
            const newStatus = e.target.value;

            if (newStatus !== 'archived') {
                // Restore item
                try {
                    await updateJob(jobId, { status: newStatus });

                    // Remove row with animation
                    const row = e.target.closest('.archive-row');
                    row.style.opacity = '0';
                    setTimeout(() => {
                        openArchiveModal(); // Re-render list
                        renderAllJobs(); // Update board in background
                    }, 200);
                } catch (error) {
                    console.error("Failed to restore job", error);
                    e.target.value = 'archived'; // Revert on failure
                }
            }
        });
    });
}

// Archive Action from Panel
if (archiveJobBtnPanel) {
    const archiveConfirmModal = document.getElementById('archiveConfirmModal');
    const confirmArchiveBtn = document.getElementById('confirmArchive');
    const cancelArchiveBtn = document.getElementById('cancelArchive');

    // Open Modal
    archiveJobBtnPanel.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentJobId) {
            archiveConfirmModal.style.display = 'flex';
        }
    });

    // Handle Confirm - using global handler pattern or re-attaching safe? 
    // Since this runs once on load, we attach handlers once. They will use currentJobId when clicked.
    if (confirmArchiveBtn) {
        confirmArchiveBtn.onclick = async () => {
            if (currentJobId) {
                try {
                    await updateJob(currentJobId, { status: 'archived' });
                    archiveConfirmModal.style.display = 'none';
                    closeJobPanel();
                    renderAllJobs();
                } catch (error) {
                    console.error("Failed to archive job", error);
                }
            }
        };
    }

    if (cancelArchiveBtn) {
        cancelArchiveBtn.onclick = () => {
            archiveConfirmModal.style.display = 'none';
        };
    }

    // Close on background click
    archiveConfirmModal.addEventListener('click', (e) => {
        if (e.target === archiveConfirmModal) {
            archiveConfirmModal.style.display = 'none';
        }
    });
}

// Event Listeners for Archive UI
if (archiveBtnHeader) {
    archiveBtnHeader.addEventListener('click', openArchiveModal);
}

if (closeArchiveModalBtn) {
    closeArchiveModalBtn.addEventListener('click', closeArchiveModal);
    archiveModal.addEventListener('click', (e) => {
        if (e.target === archiveModal) closeArchiveModal();
    });
}

// File Delete Confirmation Modal Listeners
const fileDeleteConfirmModal = document.getElementById('fileDeleteConfirmModal');
const confirmFileDeleteBtn = document.getElementById('confirmFileDelete');
const cancelFileDeleteBtn = document.getElementById('cancelFileDelete');

if (fileDeleteConfirmModal) {
    // Confirm delete
    if (confirmFileDeleteBtn) {
        confirmFileDeleteBtn.onclick = async () => {
            if (fileToDeleteId && currentJobId) {
                try {
                    await api.files.delete(currentJobId, fileToDeleteId);
                    currentJobFiles = currentJobFiles.filter(f => f.id !== fileToDeleteId);
                    renderFilesList();
                    fileDeleteConfirmModal.style.display = 'none';
                    fileToDeleteId = null;
                } catch (error) {
                    console.error('Error deleting file:', error);
                    alert('Failed to delete file: ' + error.message);
                }
            }
        };
    }

    // Cancel delete
    if (cancelFileDeleteBtn) {
        cancelFileDeleteBtn.onclick = () => {
            fileDeleteConfirmModal.style.display = 'none';
            fileToDeleteId = null;
        };
    }

    // Close on background click
    fileDeleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === fileDeleteConfirmModal) {
            fileDeleteConfirmModal.style.display = 'none';
            fileToDeleteId = null;
        }
    });
}
