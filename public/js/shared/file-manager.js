/**
 * File Manager Factory
 * Creates a file manager instance for either Job Board or Business Board.
 * Depends on: utils.js (getFileIcon, escapeHtml, formatFileSize), api.js (getToken)
 *
 * Usage:
 *   const fileManager = createFileManager({
 *       apiFiles: api.files,            // or api.business.files
 *       getOwnerId: () => currentJobId  // or () => document.getElementById('entityId').value
 *   });
 */

function createFileManager(config) {
    const { apiFiles, getOwnerId } = config;

    // Internal state
    let currentFiles = [];
    let filesToUpload = [];
    let fileToDeleteId = null;

    // DOM element references (looked up lazily to support late initialization)
    function el(id) { return document.getElementById(id); }

    /**
     * Load files for an existing entity/job and render them.
     */
    async function loadFiles(ownerId) {
        const filesList = el('filesList');
        if (!filesList) return;

        filesList.innerHTML = '<div class="loading-files">Loading files...</div>';

        try {
            currentFiles = await apiFiles.getAll(ownerId);
            renderFilesList();
        } catch (error) {
            console.error('Error loading files:', error);
            filesList.innerHTML = '<div class="files-error">Failed to load files</div>';
        }
    }

    /**
     * Show empty state (for new entities/jobs that don't have an ID yet).
     */
    function showEmpty() {
        currentFiles = [];
        filesToUpload = [];
        const filesList = el('filesList');
        if (filesList) {
            filesList.innerHTML = '<div class="no-files">No files attached</div>';
        }
    }

    /**
     * Render the files list combining queued uploads and existing files.
     */
    function renderFilesList() {
        const filesList = el('filesList');
        if (!filesList) return;

        if (currentFiles.length === 0 && filesToUpload.length === 0) {
            filesList.innerHTML = '<div class="no-files">No files attached</div>';
            return;
        }

        let html = '';
        const ownerId = getOwnerId();
        const token = localStorage.getItem('authToken');

        // Render queued files (for new entities before save)
        if (filesToUpload.length > 0) {
            html += filesToUpload.map((file, index) => {
                const fileIcon = getFileIcon(file.type);
                return `
                    <div class="file-item pending-upload">
                        <span class="file-icon">${fileIcon}</span>
                        <span class="file-name">${escapeHtml(file.name)} (Pending)</span>
                        <div class="file-actions">
                            <button type="button" class="btn-icon btn-delete-file" title="Remove" onclick="event.stopPropagation(); window._fileManager.removeQueuedFile(${index})">🗑</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Render existing files
        if (currentFiles.length > 0) {
            html += currentFiles.map(file => {
                const isPreviewable = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
                const fileIcon = getFileIcon(file.mimetype);
                const downloadUrl = apiFiles.getDownloadUrl(ownerId, file.id);
                const authedDownloadUrl = `${downloadUrl}?token=${encodeURIComponent(token)}`;

                return `
                    <div class="file-item" data-file-id="${file.id}">
                        <span class="file-icon">${fileIcon}</span>
                        <span class="file-name">${escapeHtml(file.originalName)}</span>
                        <div class="file-actions">
                            ${isPreviewable ? `<button type="button" class="btn-icon btn-view" title="View" onclick="event.stopPropagation(); openFilePreview(${file.id})">👁</button>` : ''}
                            <a href="${authedDownloadUrl}" class="btn-icon btn-download" title="Download" download="${escapeHtml(file.originalName)}" onclick="event.stopPropagation();">⬇</a>
                            <button type="button" class="btn-icon btn-delete-file" title="Delete" onclick="event.stopPropagation(); handleFileDelete(${file.id})">🗑</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        filesList.innerHTML = html;
    }

    /**
     * Handle file input change — queue for new entities, upload immediately for existing.
     */
    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const ownerId = getOwnerId();

        // If new entity (no ID), queue it
        if (!ownerId) {
            filesToUpload.push(file);
            renderFilesList();
            e.target.value = '';
            return;
        }

        // Existing entity: upload immediately
        const addFileBtn = el('addFileBtn');
        const originalText = addFileBtn.textContent;
        addFileBtn.textContent = 'Uploading...';
        addFileBtn.disabled = true;

        try {
            const uploaded = await apiFiles.upload(ownerId, file);
            currentFiles.unshift(uploaded);
            renderFilesList();
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file: ' + error.message);
        } finally {
            addFileBtn.textContent = originalText;
            addFileBtn.disabled = false;
            e.target.value = '';
        }
    }

    /**
     * Show the delete confirmation modal for a file.
     */
    function handleFileDeleteFn(fileId) {
        fileToDeleteId = fileId;
        const modal = el('fileDeleteConfirmModal');
        modal.style.display = 'flex';
    }

    /**
     * Confirm and execute file deletion.
     */
    async function confirmDelete() {
        const ownerId = getOwnerId();
        if (!fileToDeleteId || !ownerId) return;

        try {
            await apiFiles.delete(ownerId, fileToDeleteId);
            el('fileDeleteConfirmModal').style.display = 'none';
            currentFiles = currentFiles.filter(f => f.id !== fileToDeleteId);
            fileToDeleteId = null;
            renderFilesList();
        } catch (error) {
            alert('Failed to delete file: ' + error.message);
        }
    }

    /**
     * Open file preview modal for a given file ID.
     */
    function openFilePreviewFn(fileId) {
        const file = currentFiles.find(f => f.id === fileId);
        if (!file) return;

        const modal = el('filePreviewModal');
        const previewFileName = el('previewFileName');
        const previewContent = el('filePreviewContent');
        const downloadBtn = el('previewDownloadBtn');

        const ownerId = getOwnerId();
        const downloadUrl = apiFiles.getDownloadUrl(ownerId, file.id);
        const token = localStorage.getItem('authToken');

        const downloadLinkUrl = `${downloadUrl}?token=${encodeURIComponent(token)}`;
        const previewUrl = `${downloadUrl}?token=${encodeURIComponent(token)}&preview=true`;

        previewFileName.textContent = file.originalName;
        downloadBtn.href = downloadLinkUrl;

        if (file.mimetype === 'application/pdf') {
            previewContent.innerHTML = `<embed src="${previewUrl}" type="application/pdf" width="100%" height="100%">`;
        } else if (file.mimetype.startsWith('image/')) {
            previewContent.innerHTML = `<img src="${previewUrl}" alt="${escapeHtml(file.originalName)}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        } else {
            previewContent.innerHTML = `<div class="preview-fallback">
                <p>Preview not available for this file type.</p>
                <a href="${downloadLinkUrl}" class="btn-primary" download>Download File</a>
            </div>`;
        }

        modal.classList.add('open');
    }

    /**
     * Close the file preview modal.
     */
    function closeFilePreviewFn() {
        const modal = el('filePreviewModal');
        const previewContent = el('filePreviewContent');
        modal.classList.remove('open');
        previewContent.innerHTML = '';
    }

    /**
     * Remove a queued file by index (before entity is saved).
     */
    function removeQueuedFile(index) {
        filesToUpload.splice(index, 1);
        renderFilesList();
    }

    /**
     * Wire up DOM event listeners for file-related buttons and modals.
     * Call this once during board initialization.
     */
    function setupListeners() {
        // Add File button triggers hidden file input
        el('addFileBtn').addEventListener('click', () => {
            el('fileInput').click();
        });

        el('fileInput').addEventListener('change', handleFileUpload);

        // File Preview Modal close
        el('closeFilePreview').addEventListener('click', closeFilePreviewFn);

        // File Delete Modal
        el('cancelFileDelete').addEventListener('click', () => {
            el('fileDeleteConfirmModal').style.display = 'none';
            fileToDeleteId = null;
        });

        el('confirmFileDelete').addEventListener('click', confirmDelete);

        // Expose to global scope for onclick attributes in rendered HTML
        window.openFilePreview = openFilePreviewFn;
        window.handleFileDelete = handleFileDeleteFn;
        window._fileManager = { removeQueuedFile };
    }

    /**
     * Get the current upload queue (for uploading after entity creation).
     */
    function getQueue() {
        return filesToUpload;
    }

    /**
     * Clear the upload queue after files have been uploaded.
     */
    function clearQueue() {
        filesToUpload = [];
    }

    return {
        loadFiles,
        showEmpty,
        renderFilesList,
        setupListeners,
        getQueue,
        clearQueue,
        removeQueuedFile
    };
}
