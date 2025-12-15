// Job Board Application - Simple localStorage-based job tracker

// State
let jobs = [];
let currentJobId = null;

// DOM Elements
const addJobBtn = document.getElementById('addJobBtn');
const detailPanel = document.getElementById('detailPanel');
const closePanel = document.getElementById('closePanel');
const jobForm = document.getElementById('jobForm');
const deleteBtn = document.getElementById('deleteBtn');

// Initialize app
function init() {
    loadJobs();
    renderAllJobs();
    setupEventListeners();
}

// LocalStorage functions
function loadJobs() {
    try {
        const stored = localStorage.getItem('jobApplications');
        jobs = stored ? JSON.parse(stored) : [];
        console.log(`✓ Loaded ${jobs.length} job(s) from localStorage`);
    } catch (error) {
        console.error('Error loading jobs from localStorage:', error);
        jobs = [];
    }
}

function saveJobs() {
    try {
        localStorage.setItem('jobApplications', JSON.stringify(jobs));
        console.log(`✓ Saved ${jobs.length} job(s) to localStorage`);
    } catch (error) {
        console.error('Error saving jobs to localStorage:', error);
    }
}

// CRUD operations
function createJob(jobData) {
    const job = {
        id: Date.now().toString(),
        company: jobData.company,
        position: jobData.position,
        location: jobData.location || '',
        salary: jobData.salary || '',
        status: jobData.status,
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
    card.className = 'job-card';
    card.draggable = true;
    card.dataset.jobId = job.id;

    card.innerHTML = `
        <h3>${job.position}</h3>
        <p class="company">${job.company}</p>
        ${job.location ? `<p>${job.location}</p>` : ''}
        ${job.salary ? `<p>${job.salary}</p>` : ''}
    `;

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
        // Edit existing job
        document.getElementById('panelTitle').textContent = 'Edit Job';
        document.getElementById('jobId').value = job.id;
        document.getElementById('company').value = job.company;
        document.getElementById('position').value = job.position;
        document.getElementById('location').value = job.location;
        document.getElementById('salary').value = job.salary;
        document.getElementById('status').value = job.status;
        document.getElementById('comments').value = job.comments;
        deleteBtn.style.display = 'block';
    } else {
        // New job
        document.getElementById('panelTitle').textContent = 'Add New Job';
        jobForm.reset();
        deleteBtn.style.display = 'none';
    }

    detailPanel.classList.add('open');
}

function closeJobPanel() {
    detailPanel.classList.remove('open');
    jobForm.reset();
    currentJobId = null;
}

// Form handling
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        company: document.getElementById('company').value,
        position: document.getElementById('position').value,
        location: document.getElementById('location').value,
        salary: document.getElementById('salary').value,
        status: document.getElementById('status').value,
        comments: document.getElementById('comments').value
    };

    const jobId = document.getElementById('jobId').value;

    if (jobId) {
        // Update existing job
        updateJob(jobId, formData);
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
}

// Start the app
init();
