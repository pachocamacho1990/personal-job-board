// Business Board - Entity management
// Shared utilities loaded from shared/utils.js, shared/file-manager.js, shared/board-helpers.js

let entities = [];

// DOM Elements
const addBtn = document.getElementById('addBtn');
const entityForm = document.getElementById('entityForm');
const deleteBtn = document.getElementById('deleteBtn');
const attachmentsSection = document.getElementById('attachmentsSection');

// File manager instance (uses shared/file-manager.js factory)
const fileManager = createFileManager({
    apiFiles: api.business.files,
    getOwnerId: () => document.getElementById('entityId').value
});

// Board helpers (uses shared/board-helpers.js factory)
const helpers = createBoardHelpers({
    getCardId: (card) => card.dataset.id,
    onDrop: (id, newStatus) => api.business.update(id, { status: newStatus }),
    onDropComplete: () => renderBoard(),
    viewStorageKey: 'businessBoardCompactView',
    viewIconId: 'viewIcon',
    onViewChange: () => renderBoard(),
    textareaId: 'notes',
    previewId: 'commentsPreview',
    toggleBtnId: 'togglePreview',
    panelId: 'detailPanel',
    formId: 'entityForm',
    onPanelClose: null,
    fileManager: fileManager,
    uploadFile: (id, file) => api.business.files.upload(id, file)
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/jobboard/login.html';
        return;
    }

    helpers.loadViewPreference();
    fetchEntities();
    setupEventListeners();
});

function setupEventListeners() {
    // Open panel for new entity
    addBtn.addEventListener('click', () => {
        openPanel();
    });

    // Close panel
    document.getElementById('closePanel').addEventListener('click', () => helpers.closePanel());

    // Form submission
    entityForm.addEventListener('submit', handleFormSubmit);

    // Delete entity
    deleteBtn.addEventListener('click', handleDelete);

    // Markdown preview toggle (delegated to board-helpers.js)
    document.getElementById('togglePreview').addEventListener('click', helpers.togglePreviewMode);

    // View toggle (delegated to board-helpers.js)
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', helpers.toggleViewMode);
    }

    // Drag and drop on containers (delegated to board-helpers.js)
    helpers.setupDropZones();

    // File management (delegated to shared file-manager.js)
    fileManager.setupListeners();
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
    if (helpers.isCompactView()) card.classList.add('compact');
    card.draggable = true;
    card.dataset.id = entity.id;

    // Type definition and Emoji
    let typeEmoji = '\u{1F91D}';
    if (entity.type === 'investor') typeEmoji = '\u{1F4B8}';
    if (entity.type === 'vc') typeEmoji = '\u{1F3DB}\uFE0F';
    if (entity.type === 'accelerator') typeEmoji = '\u{1F680}';

    if (helpers.isCompactView()) {
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

    // Drag events (delegated to board-helpers.js)
    card.addEventListener('dragstart', helpers.handleDragStart);
    card.addEventListener('dragend', helpers.handleDragEnd);

    // Click to edit
    card.addEventListener('click', () => openPanel(entity));

    return card;
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
            fileManager.loadFiles(entity.id);
        }
    } else {
        // Defaults for new
        document.getElementById('status').value = 'researching';

        // Show attachments section for new entities too (files will be queued)
        if (attachmentsSection) {
            attachmentsSection.style.display = 'block';
            fileManager.showEmpty();
        }
    }

    helpers.openPanel();
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
            await helpers.processFileQueue(created.id);
        }

        renderBoard();
        helpers.closePanel();
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
            helpers.closePanel();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    }
}
