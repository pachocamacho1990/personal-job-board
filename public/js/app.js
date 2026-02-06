// State
let jobs = [];
let currentJobId = null;
let isFocusMode = false; // Focus mode state

// File manager instance (uses shared/file-manager.js factory)
const fileManager = createFileManager({
    apiFiles: api.files,
    getOwnerId: () => currentJobId
});

// Board helpers (uses shared/board-helpers.js factory)
const helpers = createBoardHelpers({
    getCardId: (card) => card.dataset.jobId,
    onDrop: (id, newStatus) => updateJob(id, { status: newStatus }),
    onDropComplete: () => renderAllJobs(),
    viewStorageKey: 'viewPreference',
    viewIconId: 'viewIcon',
    onViewChange: () => renderAllJobs(),
    textareaId: 'comments',
    previewId: 'commentsPreview',
    toggleBtnId: 'togglePreview',
    panelId: 'detailPanel',
    formId: 'jobForm',
    onPanelClose: () => {
        document.getElementById('jobId').value = '';
        currentJobId = null;
    },
    fileManager: fileManager,
    uploadFile: (id, file) => api.files.upload(id, file)
});

// DOM Elements
const addJobBtn = document.getElementById('addJobBtn');
const detailPanel = document.getElementById('detailPanel');
const closePanelBtn = document.getElementById('closePanel');
const jobForm = document.getElementById('jobForm');
const deleteBtn = document.getElementById('deleteBtn');

// Initialize app
async function init() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/jobboard/login.html';
        return;
    }

    helpers.loadViewPreference();
    loadFocusPreference(); // Load focus mode state
    await loadJobs();

    setupEventListeners();

    // Initialize extracted modules (must come after setupEventListeners so DOM is wired)
    initCenterPeek({
        getJob: getJob,
        setCurrentJobId: (id) => { currentJobId = id; }
    });
    initArchiveVault({
        getJobs: () => jobs,
        updateJob: updateJob,
        renderAllJobs: renderAllJobs,
        closeJobPanel: closeJobPanel,
        getCurrentJobId: () => currentJobId
    });

    // Check for deep link (openJobId) — after Center Peek init so it opens in peek mode
    const urlParams = new URLSearchParams(window.location.search);
    const openJobId = urlParams.get('openJobId');
    if (openJobId) {
        const jobToOpen = jobs.find(j => j.id == openJobId);
        if (jobToOpen) {
            openJobDetails(parseInt(openJobId));
        }
    }

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

// Focus Mode Management
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
    card.className = helpers.isCompactView() ? 'job-card compact' : 'job-card';
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

    if (helpers.isCompactView()) {
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
    card.addEventListener('dragstart', helpers.handleDragStart);
    card.addEventListener('dragend', helpers.handleDragEnd);

    // Shine Effect for Unseen Jobs
    if (job.is_unseen) {
        card.classList.add('shining');
    }

    container.appendChild(card);
}

function updateColumnCounts(visibleJobs = jobs) {
    const statuses = ['interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected', 'archived'];
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
            fileManager.loadFiles(job.id);
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

        // Show attachments section for new jobs too (files will be queued)
        const attachmentsSection = document.getElementById('attachmentsSection');
        if (attachmentsSection) {
            attachmentsSection.style.display = 'block';
            fileManager.showEmpty();
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
    helpers.closePanel();
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
            const newJob = await createJob(formData);

            // Process queued files
            await helpers.processFileQueue(newJob.id);
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

// Event Listeners
function setupEventListeners() {
    // Add job button
    addJobBtn.addEventListener('click', () => openJobDetails(null));

    // Close panel
    closePanelBtn.addEventListener('click', closeJobPanel);

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

    // File management (delegated to shared file-manager.js)
    fileManager.setupListeners();

    // Logout
    const logoutTrigger = document.querySelector('.logout-trigger');
    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', () => {
            document.getElementById('logoutModal').style.display = 'flex';
        });
    }


    // Drag and drop on containers (delegated to board-helpers.js)
    helpers.setupDropZones();

    // Close panel on ESC (delegated to board-helpers.js)
    helpers.setupEscapeKey();

    // View toggle button
    document.getElementById('viewToggle').addEventListener('click', helpers.toggleViewMode);

    // Focus toggle button
    const focusToggle = document.getElementById('focusToggle');
    if (focusToggle) {
        focusToggle.addEventListener('click', toggleFocusMode);
    }

    // Markdown preview toggle
    document.getElementById('togglePreview').addEventListener('click', helpers.togglePreviewMode);
}

// Start the app
init();
