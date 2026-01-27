// Reusing app.js logic but adapted for business entities
// In a fuller refactor we would abstract the board logic into a generic class
// due to time constraints, I will duplicate the relevant logic and adapt.

let entities = [];
let dragSource = null;

// DOM Elements
const addBtn = document.getElementById('addBtn');
const entityForm = document.getElementById('entityForm');
const detailPanel = document.getElementById('detailPanel');
const closePanelBtn = document.getElementById('closePanel');
const deleteBtn = document.getElementById('deleteBtn');
const togglePreview = document.getElementById('togglePreview');
const commentsInput = document.getElementById('comments');
const commentsPreview = document.getElementById('commentsPreview');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/jobboard/login.html';
        return;
    }

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
    card.draggable = true;
    card.dataset.id = entity.id;

    // Type definition and Emoji
    let typeEmoji = '🤝';
    if (entity.type === 'investor') typeEmoji = '💸';
    if (entity.type === 'vc') typeEmoji = '🏛️';
    if (entity.type === 'accelerator') typeEmoji = '🚀';

    card.innerHTML = `
        <div class="card-header">
            <span class="type-badge">${typeEmoji} ${capitalize(entity.type)}</span>
        </div>
        <h3>${escapeHtml(entity.name)}</h3>
        <p class="company">${escapeHtml(entity.contact_person || 'No Contact')}</p>
        <p>${escapeHtml(entity.location || '')}</p>
    `;

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
    } else {
        // Defaults for new
        document.getElementById('status').value = 'researching';
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
