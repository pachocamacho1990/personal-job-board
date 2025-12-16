// Job Board Application - Simple localStorage-based job tracker

// State
let jobs = [];
let currentJobId = null;
let isCompactView = false; // View mode state
let isPreviewMode = false; // Markdown preview mode

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
function init() {
    loadJobs();
    loadViewPreference();
    renderAllJobs();
    setupEventListeners();
}

// LocalStorage functions
function loadJobs() {
    try {
        const stored = localStorage.getItem('jobApplications');
        jobs = stored ? JSON.parse(stored) : [];

        // Auto-migrate: add type and rating fields to old entries
        jobs = jobs.map(job => ({
            type: job.type || 'job',  // default existing entries to 'job'
            rating: job.rating || 3,  // default to 3 stars (moderate interest)
            ...job
        }));

        console.log(`✓ Loaded ${jobs.length} item(s) from localStorage`);
    } catch (error) {
        console.error('Error loading jobs from localStorage:', error);
        jobs = [];
    }
}

function saveJobs() {
    try {
        localStorage.setItem('jobApplications', JSON.stringify(jobs));
        console.log(`✓ Saved ${jobs.length} item(s) to localStorage`);
    } catch (error) {
        console.error('Error saving jobs to localStorage:', error);
    }
}

// CRUD operations
function createJob(jobData) {
    const job = {
        id: Date.now().toString(),
        type: jobData.type || 'job',

        // Core fields (shared by both types)
        company: jobData.company || '',
        position: jobData.position || '',
        location: jobData.location || '',
        salary: jobData.salary || '',

        // Connection-specific additional fields (optional)
        contactName: jobData.contactName || '',
        organization: jobData.organization || '',

        // Common fields
        status: jobData.status,
        rating: jobData.rating || 3,  // Default to 3 stars
        comments: jobData.comments || '',
        dateAdded: new Date().toISOString()
    };
    jobs.push(job);
    saveJobs();
    return job;
}

function updateJob(id, jobData) {
    const index = jobs.findIndex(j => j.id === id);
    if (index !== -1) {
        jobs[index] = { ...jobs[index], ...jobData };
        saveJobs();
        return jobs[index];
    }
    return null;
}

function deleteJob(id) {
    jobs = jobs.filter(j => j.id !== id);
    saveJobs();
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

// Rendering
function renderAllJobs() {
    // Clear all containers
    document.querySelectorAll('.cards-container').forEach(container => {
        container.innerHTML = '';
    });

    // Render jobs in their respective columns
    jobs.forEach(job => renderJob(job));

    // Update counts
    updateColumnCounts();
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

    // Build metadata array for compact view
    const metadata = [];
    if (subtitle) metadata.push(subtitle);
    if (job.location) metadata.push(job.location);
    if (job.salary) metadata.push(job.salary);

    if (isCompactView) {
        // Compact layout: rating + title + badge on one line, metadata below
        card.innerHTML = `
            <div class="card-header">
                ${renderStars(job.rating || 3)}
                <h3>${title}</h3>
                <span class="type-badge ${job.type}">
                    <span class="type-emoji">${typeEmoji}</span>
                    ${typeName}
                </span>
            </div>
            ${metadata.length > 0 ? `<div class="metadata">${metadata.join(' • ')}</div>` : ''}
        `;
    } else {
        // Comfortable layout: original multi-line format
        card.innerHTML = `
            <div class="card-header">
                ${renderStars(job.rating || 3)}
                <span class="type-badge ${job.type}">
                    <span class="type-emoji">${typeEmoji}</span>
                    ${typeName}
                </span>
            </div>
            <h3>${title}</h3>
            <p class="company">${subtitle}</p>
            ${job.location ? `<p>${job.location}</p>` : ''}
            ${job.salary ? `<p>${job.salary}</p>` : ''}
        `;
    }

    // Click to view details
    card.addEventListener('click', () => openJobDetails(job.id));

    // Drag and drop
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
}

function updateColumnCounts() {
    const statuses = ['interested', 'applied', 'interview', 'offer', 'rejected'];
    statuses.forEach(status => {
        const count = jobs.filter(j => j.status === status).length;
        const badge = document.querySelector(`.column[data-status="${status}"] .count-badge`);
        if (badge) badge.textContent = count;
    });
}

// Panel functions
function openJobDetails(jobId) {
    currentJobId = jobId;
    const job = getJob(jobId);

    if (job) {
        // Edit existing entry
        const isConnection = job.type === 'connection';
        document.getElementById('panelTitle').textContent = isConnection ? 'Edit Connection' : 'Edit Job';
        document.getElementById('jobId').value = job.id;

        // Set type
        document.querySelector(`input[name="type"][value="${job.type}"]`).checked = true;
        toggleFieldsByType(job.type);

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

        deleteBtn.style.display = 'block';
    } else {
        // New entry
        currentJobId = null; // Ensure global state is cleared
        document.getElementById('panelTitle').textContent = 'Add New Item';
        jobForm.reset();
        document.getElementById('jobId').value = '';  // Clear hidden field AFTER reset to ensure it stays empty

        // Default to job type
        document.querySelector('input[name="type"][value="job"]').checked = true;
        toggleFieldsByType('job');
        updateRatingDisplay();  // Reset star display to default (3 stars)
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
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.querySelector('input[name="type"]:checked').value,

        // Connection fields
        contactName: document.getElementById('contactName').value,
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

    // Use global state instead of hidden input for reliability
    if (currentJobId) {
        // Update existing job
        updateJob(currentJobId, formData);
    } else {
        // Create new job
        createJob(formData);
    }

    renderAllJobs();
    closeJobPanel();
}

function handleDelete() {
    if (currentJobId && confirm('Are you sure you want to delete this job?')) {
        deleteJob(currentJobId);
        renderAllJobs();
        closeJobPanel();
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
        updateJob(jobId, { status: newStatus });

        // Re-render
        renderAllJobs();

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

    // Markdown preview toggle
    togglePreviewBtn.addEventListener('click', togglePreviewMode);
}

// Start the app
init();
