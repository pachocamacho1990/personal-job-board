/**
 * Board Helpers Factory
 * Encapsulates shared behavioral patterns for both Job Board and Business Board:
 * drag-and-drop, view toggle, markdown preview, panel open/close, file queue, ESC key.
 *
 * Follows the same factory pattern as createFileManager().
 *
 * Usage:
 *   const helpers = createBoardHelpers({
 *       getCardId: (card) => card.dataset.jobId,
 *       onDrop: (id, newStatus) => updateJob(id, { status: newStatus }),
 *       onDropComplete: () => renderAllJobs(),
 *       viewStorageKey: 'viewPreference',
 *       viewIconId: 'viewIcon',
 *       onViewChange: () => renderAllJobs(),
 *       textareaId: 'comments',
 *       previewId: 'commentsPreview',
 *       toggleBtnId: 'togglePreview',
 *       panelId: 'detailPanel',
 *       formId: 'jobForm',
 *       onPanelClose: () => { currentJobId = null; },
 *       fileManager: fileManager,
 *       uploadFile: (id, file) => api.files.upload(id, file)
 *   });
 */

function createBoardHelpers(config) {
    const {
        getCardId,
        onDrop,
        onDropComplete,
        viewStorageKey,
        viewIconId,
        onViewChange,
        textareaId,
        previewId,
        toggleBtnId,
        panelId,
        formId,
        onPanelClose,
        fileManager,
        uploadFile
    } = config;

    // --- Internal state ---
    let _isCompactView = false;
    let _isPreviewMode = false;
    let _draggedElement = null;

    // --- Drag-and-drop ---

    function handleDragStart(e) {
        _draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    function setupDropZones() {
        document.querySelectorAll('.cards-container').forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            container.addEventListener('dragenter', (e) => {
                if (e.target.classList.contains('cards-container')) {
                    e.target.classList.add('drag-over');
                }
            });

            container.addEventListener('dragleave', (e) => {
                if (e.target.classList.contains('cards-container')) {
                    e.target.classList.remove('drag-over');
                }
            });

            container.addEventListener('drop', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const dropContainer = e.target.closest('.cards-container');
                if (dropContainer && _draggedElement) {
                    const id = getCardId(_draggedElement);
                    const newStatus = dropContainer.dataset.status;

                    onDrop(id, newStatus).then(() => {
                        onDropComplete();
                    });

                    dropContainer.classList.remove('drag-over');
                }
            });
        });
    }

    // --- View toggle ---

    function isCompactView() {
        return _isCompactView;
    }

    function loadViewPreference() {
        try {
            const saved = localStorage.getItem(viewStorageKey);
            _isCompactView = saved === 'compact' || saved === 'true';
            _updateViewIcon();
        } catch (error) {
            console.error('Error loading view preference:', error);
            _isCompactView = false;
        }
    }

    function toggleViewMode() {
        _isCompactView = !_isCompactView;
        try {
            localStorage.setItem(viewStorageKey, _isCompactView ? 'compact' : 'comfortable');
        } catch (error) {
            console.error('Error saving view preference:', error);
        }
        _updateViewIcon();
        onViewChange();
    }

    function _updateViewIcon() {
        const icon = document.getElementById(viewIconId);
        if (icon) {
            icon.textContent = _isCompactView ? '\u229E' : '\u229F';
        }
    }

    // --- Markdown preview ---

    function togglePreviewMode() {
        _isPreviewMode = !_isPreviewMode;
        const textarea = document.getElementById(textareaId);
        const preview = document.getElementById(previewId);
        const btn = document.getElementById(toggleBtnId);

        if (_isPreviewMode) {
            const markdown = textarea.value;
            preview.innerHTML = markdown
                ? marked.parse(markdown)
                : '<p style="color: var(--text-tertiary);">No comments yet...</p>';
            textarea.style.display = 'none';
            preview.style.display = 'block';
            btn.textContent = 'Edit';
            btn.classList.add('active');
        } else {
            textarea.style.display = 'block';
            preview.style.display = 'none';
            btn.textContent = 'Preview';
            btn.classList.remove('active');
        }
    }

    function resetPreviewMode() {
        if (_isPreviewMode) {
            togglePreviewMode();
        }
    }

    // --- Panel ---

    function openPanel() {
        document.getElementById(panelId).classList.add('open');
    }

    function closePanel() {
        document.getElementById(panelId).classList.remove('open');
        document.getElementById(formId).reset();
        resetPreviewMode();
        if (onPanelClose) onPanelClose();
    }

    // --- File queue ---

    async function processFileQueue(newEntityId) {
        if (!fileManager) return;
        const queuedFiles = fileManager.getQueue();
        if (queuedFiles.length > 0) {
            for (const file of queuedFiles) {
                try {
                    await uploadFile(newEntityId, file);
                } catch (err) {
                    console.error('Failed to upload queued file:', err);
                }
            }
            fileManager.clearQueue();
        }
    }

    // --- ESC key ---

    function setupEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById(panelId).classList.contains('open')) {
                closePanel();
            }
        });
    }

    return {
        handleDragStart,
        handleDragEnd,
        setupDropZones,
        isCompactView,
        loadViewPreference,
        toggleViewMode,
        togglePreviewMode,
        resetPreviewMode,
        openPanel,
        closePanel,
        processFileQueue,
        setupEscapeKey
    };
}
