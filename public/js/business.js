// Reusing app.js logic but adapted for business entities
// In a fuller refactor we would abstract the board logic into a generic class
// due to time constraints, I will duplicate the relevant logic and adapt.

let entities = [];
let dragSource = null;
let isCompactView = false;

// DOM Elements
const addBtn = document.getElementById('addBtn');
const entityForm = document.getElementById('entityForm');
const detailPanel = document.getElementById('detailPanel');
const closePanelBtn = document.getElementById('closePanel');
const deleteBtn = document.getElementById('deleteBtn');
const togglePreview = document.getElementById('togglePreview');
const commentsInput = document.getElementById('comments');
const commentsPreview = document.getElementById('commentsPreview');
const viewToggle = document.getElementById('viewToggle');
const viewIcon = document.getElementById('viewIcon');

// File Elements
const attachmentsSection = document.getElementById('attachmentsSection');
const fileInput = document.getElementById('fileInput');
const addFileBtn = document.getElementById('addFileBtn');
const filesList = document.getElementById('filesList');

// File Modals
const filePreviewModal = document.getElementById('filePreviewModal');
const closeFilePreviewBtn = document.getElementById('closeFilePreview');
const filePreviewContent = document.getElementById('filePreviewContent');
const previewFileName = document.getElementById('previewFileName');
const previewDownloadBtn = document.getElementById('previewDownloadBtn');

const fileDeleteConfirmModal = document.getElementById('fileDeleteConfirmModal');
const confirmFileDeleteBtn = document.getElementById('confirmFileDelete');
const cancelFileDeleteBtn = document.getElementById('cancelFileDelete');

let fileToDeleteId = null;


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/jobboard/login.html';
        return;
    }

    // Load saved view preference
    isCompactView = localStorage.getItem('businessBoardCompactView') === 'true';
    updateViewToggleIcon();

    fetchEntities();
    setupEventListeners();
});

function setupEventListeners() {
    // Open panel for new entity
    addBtn.addEventListener('click', () => {
        openPanel();
    });

    // Close panel
    closePanelBtn.addEventListener('click', closePanel);

    // Form submission
    entityForm.addEventListener('submit', handleFormSubmit);

    // Delete entity
    deleteBtn.addEventListener('click', handleDelete);

    // Markdown preview toggle
    togglePreview.addEventListener('click', () => {
        const isPreview = commentsPreview.style.display !== 'none';
        if (isPreview) {
            commentsPreview.style.display = 'none';
            commentsInput.style.display = 'block';
            togglePreview.textContent = 'Preview';
            togglePreview.classList.remove('active');
        } else {
            commentsPreview.innerHTML = marked.parse(commentsInput.value);
            commentsPreview.style.display = 'block';
            commentsInput.style.display = 'none';
            togglePreview.textContent = 'Edit';
            togglePreview.classList.add('active');
        }
    });

    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            isCompactView = !isCompactView;
            localStorage.setItem('businessBoardCompactView', isCompactView);
            updateViewToggleIcon();
            renderBoard();
        });
    }

    // File Upload
    addFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileUpload);

    // File Preview Modal
    closeFilePreviewBtn.addEventListener('click', () => {
        filePreviewModal.style.display = 'none';
        filePreviewContent.innerHTML = '';
        // revoke object URLs to free memory
        if (filePreviewContent.querySelector('img')) {
            URL.revokeObjectURL(filePreviewContent.querySelector('img').src);
        }
    });

    // File Delete Modal
    cancelFileDeleteBtn.addEventListener('click', () => {
        fileDeleteConfirmModal.style.display = 'none';
        fileToDeleteId = null;
    });

    confirmFileDeleteBtn.addEventListener('click', confirmFileDelete);
}

function updateViewToggleIcon() {
    if (viewIcon) {
        viewIcon.textContent = isCompactView ? '⊞' : '⊟';
        viewToggle.title = isCompactView ? 'Switch to comfortable view' : 'Switch to compact view';
    }
}

async function fetchEntities() {
    try {
        entities = await api.business.getAll();
        renderBoard();
    } catch (error) {
        console.error('Failed to fetch entities:', error);
    }
}

function renderBoard() {
    // Clear all columns
    document.querySelectorAll('.cards-container').forEach(container => {
        container.innerHTML = '';
    });

    // Update counts
    const counts = {};

    entities.forEach(entity => {
        const card = createCard(entity);
        const container = document.querySelector(`.cards-container[data-status="${entity.status}"]`);
        if (container) {
            container.appendChild(card);
            counts[entity.status] = (counts[entity.status] || 0) + 1;
        }
    });

    // Update count badges
    document.querySelectorAll('.column').forEach(column => {
        const status = column.dataset.status;
        const badge = column.querySelector('.count-badge');
        if (badge) badge.textContent = counts[status] || 0;
    });
}

function createCard(entity) {
    const card = document.createElement('div');
    card.className = 'job-card'; // Reusing job-card class for consistent styling
    if (isCompactView) card.classList.add('compact');
    card.draggable = true;
    card.dataset.id = entity.id;

    // Type definition and Emoji
    let typeEmoji = '🤝';
    if (entity.type === 'investor') typeEmoji = '💸';
    if (entity.type === 'vc') typeEmoji = '🏛️';
    if (entity.type === 'accelerator') typeEmoji = '🚀';

    if (isCompactView) {
        card.innerHTML = `
            <div class="compact-row">
                <span class="type-emoji">${typeEmoji}</span>
                <h3>${escapeHtml(entity.name)}</h3>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="card-header">
                <span class="type-badge">${typeEmoji} ${capitalize(entity.type)}</span>
            </div>
            <h3>${escapeHtml(entity.name)}</h3>
            <p class="company">${escapeHtml(entity.contact_person || 'No Contact')}</p>
            <p>${escapeHtml(entity.location || '')}</p>
        `;
    }

    // Drag events
    card.addEventListener('dragstart', (e) => {
        dragSource = card;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', entity.id);
        e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragSource = null;
    });

    // Click to edit
    card.addEventListener('click', () => openPanel(entity));

    return card;
}

// Drag and Drop Logic for Columns
document.querySelectorAll('.column').forEach(column => {
    const container = column.querySelector('.cards-container');

    column.addEventListener('dragover', (e) => {
        e.preventDefault(); // Allow drop
        container.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
        container.classList.remove('drag-over');
    });

    column.addEventListener('drop', async (e) => {
        e.preventDefault();
        container.classList.remove('drag-over');

        const id = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;

        // Find entity
        const entity = entities.find(e => e.id == id);
        if (entity && entity.status !== newStatus) {
            // Optimistic update
            const oldStatus = entity.status;
            entity.status = newStatus;

            // Move card in DOM
            if (dragSource) {
                container.appendChild(dragSource);
                // Update counts
                updateCounts();
            }

            try {
                await api.business.update(id, { status: newStatus });
            } catch (error) {
                console.error('Update failed:', error);
                // Revert
                entity.status = oldStatus;
                renderBoard();
                alert('Failed to update status');
            }
        }
    });
});

function updateCounts() {
    // Simple recalculation based on DOM
    document.querySelectorAll('.column').forEach(column => {
        const count = column.querySelectorAll('.job-card').length;
        column.querySelector('.count-badge').textContent = count;
    });
}

function openPanel(entity = null) {
    const isEdit = !!entity;

    // Reset form
    entityForm.reset();
    document.getElementById('entityId').value = isEdit ? entity.id : '';

    // Set title
    document.getElementById('panelTitle').textContent = isEdit ? 'Edit Entity' : 'New Entity';

    // Show/Hide delete button
    deleteBtn.style.display = isEdit ? 'block' : 'none';

    if (isEdit) {
        document.getElementById('entityName').value = entity.name || '';
        document.getElementById('contactPerson').value = entity.contact_person || '';
        document.getElementById('email').value = entity.email || '';
        document.getElementById('website').value = entity.website || '';
        document.getElementById('location').value = entity.location || '';
        document.getElementById('status').value = entity.status || 'researching';
        document.getElementById('notes').value = entity.notes || '';

        // Radio buttons for type
        const typeRadios = document.getElementsByName('type');
        for (const radio of typeRadios) {
            if (radio.value === entity.type) radio.checked = true;
        }

        // Show attachments and load
        if (attachmentsSection) {
            attachmentsSection.style.display = 'block';
            loadEntityFiles(entity.id);
        }
    } else {
        // Defaults for new
        document.getElementById('status').value = 'researching';

        // Show attachments section for new entities too (files will be queued)
        if (attachmentsSection) {
            attachmentsSection.style.display = 'block';
            filesList.innerHTML = '<div class="no-files">No attachments yet</div>';
        }
        filesToUpload = []; // Reset queue
    }

    detailPanel.classList.add('open');
}

function closePanel() {
    detailPanel.classList.remove('open');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('entityId').value;
    const isEdit = !!id;

    const formData = {
        name: document.getElementById('entityName').value,
        type: document.querySelector('input[name="type"]:checked')?.value || 'connection',
        status: document.getElementById('status').value,
        contact_person: document.getElementById('contactPerson').value,
        email: document.getElementById('email').value,
        website: document.getElementById('website').value,
        location: document.getElementById('location').value,
        notes: document.getElementById('notes').value
    };

    try {
        if (isEdit) {
            const updated = await api.business.update(id, formData);
            // Update local state
            const index = entities.findIndex(e => e.id == id);
            if (index !== -1) entities[index] = updated;
        } else {
            const created = await api.business.create(formData);
            entities.push(created);

            // Process queued files
            if (filesToUpload.length > 0) {
                for (const file of filesToUpload) {
                    try {
                        await api.business.files.upload(created.id, file);
                    } catch (err) {
                        console.error('Failed to upload queued file:', err);
                    }
                }
                filesToUpload = [];
            }
        }

        renderBoard();
        closePanel();
    } catch (error) {
        alert('Failed to save entity: ' + error.message);
    }
}

async function handleDelete() {
    const id = document.getElementById('entityId').value;
    if (!id) return;

    if (confirm('Are you sure you want to delete this entity?')) {
        try {
            await api.business.delete(id);
            entities = entities.filter(e => e.id != id);
            renderBoard();
            closePanel();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// File Handling Functions

async function loadEntityFiles(entityId) {
    try {
        filesList.innerHTML = '<div class="loading-spinner">Loading files...</div>';
        const files = await api.business.files.getAll(entityId);
        renderFilesList(files, entityId);
    } catch (error) {
        console.error('Failed to load files:', error);
        filesList.innerHTML = '<div class="error-message">Failed to load files</div>';
    }
}

function renderFilesList(files, entityId) {
    if ((!files || files.length === 0) && filesToUpload.length === 0) {
        filesList.innerHTML = '<div class="no-files">No attachments yet</div>';
        return;
    }

    let html = '';

    // Render queued files
    if (filesToUpload.length > 0) {
        html += filesToUpload.map((file, index) => {
            const fileIcon = getFileIcon(file.type);
            return `
                <div class="file-item pending-upload">
                    <div class="file-icon">${fileIcon}</div>
                    <div class="file-info">
                        <div class="file-name">${file.name} (Pending)</div>
                        <div class="file-meta">${formatFileSize(file.size)}</div>
                    </div>
                    <div class="file-actions">
                        <button type="button" class="btn-icon delete-file" onclick="removeQueuedFile(${index})" title="Remove">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render existing files
    if (files && files.length > 0) {
        html += files.map(file => `
            <div class="file-item">
                <div class="file-icon" onclick="openFilePreview('${entityId}', '${file.id}', '${file.mimetype}', '${escapeHtml(file.originalName)}')">
                    ${getFileIcon(file.mimetype)}
                </div>
                <div class="file-info">
                    <div class="file-name" onclick="openFilePreview('${entityId}', '${file.id}', '${file.mimetype}', '${escapeHtml(file.originalName)}')">
                        ${escapeHtml(file.originalName)}
                    </div>
                    <div class="file-meta">
                        ${formatDate(file.createdAt)} • ${formatFileSize(file.size)}
                    </div>
                </div>
                <div class="file-actions">
                    <button type="button" class="btn-icon" onclick="openFilePreview('${entityId}', '${file.id}', '${file.mimetype}', '${escapeHtml(file.originalName)}')" title="View">
                        👁️
                    </button>
                    <a href="${api.business.files.getDownloadUrl(entityId, file.id)}" class="btn-icon" title="Download" download>
                        ⬇️
                    </a>
                    <button type="button" class="btn-icon delete-file" onclick="initiateFileDelete('${file.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    filesList.innerHTML = html;
}

// Queue management
let filesToUpload = [];

function removeQueuedFile(index) {
    filesToUpload.splice(index, 1);
    const entityId = document.getElementById('entityId').value;
    // We need to re-render, but renderFilesList expects the list of existing files.
    // We can just reload the files if we have an ID, or pass empty if not.
    if (entityId) {
        loadEntityFiles(entityId); // This is safe but might flicker.
    } else {
        renderFilesList([], null);
    }
}
window.removeQueuedFile = removeQueuedFile;

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const entityId = document.getElementById('entityId').value;

    // If new entity (no ID), queue it
    if (!entityId) {
        filesToUpload.push(file);
        renderFilesList([], null); // Re-render with queued files
        e.target.value = '';
        return;
    }

    try {
        // Show uploading state
        const originalText = addFileBtn.textContent;
        addFileBtn.textContent = 'Uploading...';
        addFileBtn.disabled = true;

        await api.business.files.upload(entityId, file);

        // Reload files
        await loadEntityFiles(entityId);

        // Reset input
        fileInput.value = '';
    } catch (error) {
        alert('Failed to upload file: ' + error.message);
    } finally {
        addFileBtn.textContent = '+ Add File';
        addFileBtn.disabled = false;
    }
}

// Make globally available for onclick handlers
window.initiateFileDelete = function (fileId) {
    fileToDeleteId = fileId;
    fileDeleteConfirmModal.style.display = 'flex';
};

async function confirmFileDelete() {
    if (!fileToDeleteId) return;

    const entityId = document.getElementById('entityId').value;

    try {
        await api.business.files.delete(entityId, fileToDeleteId);
        fileDeleteConfirmModal.style.display = 'none';
        fileToDeleteId = null;
        loadEntityFiles(entityId);
    } catch (error) {
        alert('Failed to delete file: ' + error.message);
    }
}

// Make globally available for onclick handlers
window.openFilePreview = function (entityId, fileId, mimetype, filename) {
    previewFileName.textContent = filename;
    previewDownloadBtn.href = api.business.files.getDownloadUrl(entityId, fileId);

    filePreviewContent.innerHTML = '<div class="loading-spinner">Loading preview...</div>';
    filePreviewModal.style.display = 'flex';

    if (mimetype.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = api.business.files.getDownloadUrl(entityId, fileId) + '?preview=true'; // Add preview param if backend supports inline
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        filePreviewContent.innerHTML = '';
        filePreviewContent.appendChild(img);
    } else if (mimetype === 'application/pdf') {
        const iframe = document.createElement('iframe');
        iframe.src = api.business.files.getDownloadUrl(entityId, fileId) + '?preview=true';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        filePreviewContent.innerHTML = '';
        filePreviewContent.appendChild(iframe);
    } else {
        filePreviewContent.innerHTML = `
            <div class="no-preview">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
                <p>Preview not available for this file type.</p>
                <a href="${api.business.files.getDownloadUrl(entityId, fileId)}" class="btn-primary" download>Download File</a>
            </div>
        `;
    }
};

function getFileIcon(mimetype) {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype === 'application/pdf') return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('text')) return '📝';
    return '📁';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
