/**
 * Archive Vault Module
 * Archive/restore modal for managing archived jobs.
 * Depends on: api.js (for updateJob callback)
 *
 * Usage:
 *   initArchiveVault({
 *       getJobs: () => jobs,
 *       updateJob: updateJob,
 *       renderAllJobs: renderAllJobs,
 *       closeJobPanel: closeJobPanel,
 *       getCurrentJobId: () => currentJobId
 *   });
 *   // Called from app.js init() after setupEventListeners()
 */

// DOM refs (cached on init)
let _archiveModal;
let _closeArchiveModalBtn;
let _archiveContent;

// Callbacks passed from app.js
let _getJobs;
let _updateJob;
let _renderAllJobs;
let _closeJobPanel;
let _getCurrentJobId;

/**
 * Initialize Archive Vault — cache DOM refs, attach all event listeners.
 * @param {Object} deps
 * @param {Function} deps.getJobs - () => jobs array
 * @param {Function} deps.updateJob - (id, data) => Promise
 * @param {Function} deps.renderAllJobs - () => void
 * @param {Function} deps.closeJobPanel - () => void
 * @param {Function} deps.getCurrentJobId - () => currentJobId
 */
function initArchiveVault(deps) {
    _getJobs = deps.getJobs;
    _updateJob = deps.updateJob;
    _renderAllJobs = deps.renderAllJobs;
    _closeJobPanel = deps.closeJobPanel;
    _getCurrentJobId = deps.getCurrentJobId;

    _archiveModal = document.getElementById('archiveModal');
    _closeArchiveModalBtn = document.getElementById('closeArchiveModal');
    _archiveContent = document.getElementById('archiveContent');

    const archiveBtnHeader = document.getElementById('archiveBtn');
    const archiveJobBtnPanel = document.getElementById('archiveJobBtn');

    // Header button opens the vault
    if (archiveBtnHeader) {
        archiveBtnHeader.addEventListener('click', openArchiveModal);
    }

    // Close button and background click
    if (_closeArchiveModalBtn) {
        _closeArchiveModalBtn.addEventListener('click', closeArchiveModal);
        _archiveModal.addEventListener('click', (e) => {
            if (e.target === _archiveModal) closeArchiveModal();
        });
    }

    // Archive action from the edit panel
    if (archiveJobBtnPanel) {
        const archiveConfirmModal = document.getElementById('archiveConfirmModal');
        const confirmArchiveBtn = document.getElementById('confirmArchive');
        const cancelArchiveBtn = document.getElementById('cancelArchive');

        // Open confirmation modal
        archiveJobBtnPanel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (_getCurrentJobId()) {
                archiveConfirmModal.style.display = 'flex';
            }
        });

        // Handle confirm
        if (confirmArchiveBtn) {
            confirmArchiveBtn.onclick = async () => {
                const jobId = _getCurrentJobId();
                if (jobId) {
                    try {
                        await _updateJob(jobId, { status: 'archived' });
                        archiveConfirmModal.style.display = 'none';
                        _closeJobPanel();
                        _renderAllJobs();
                    } catch (error) {
                        console.error("Failed to archive job", error);
                    }
                }
            };
        }

        // Handle cancel
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
}

/**
 * Open the Archive Vault modal showing all archived jobs.
 */
function openArchiveModal() {
    const archivedJobs = _getJobs().filter(j => j.status === 'archived');
    renderArchiveList(archivedJobs);
    _archiveModal.classList.add('open');
}

/**
 * Close the Archive Vault modal.
 */
function closeArchiveModal() {
    _archiveModal.classList.remove('open');
}

/**
 * Render the list of archived jobs inside the vault.
 */
function renderArchiveList(archivedJobs) {
    if (archivedJobs.length === 0) {
        _archiveContent.innerHTML = `
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

    _archiveContent.innerHTML = '';
    _archiveContent.appendChild(listContainer);

    // Event listeners for status changes (Restore)
    document.querySelectorAll('.archive-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const jobId = e.target.dataset.jobId;
            const newStatus = e.target.value;

            if (newStatus !== 'archived') {
                try {
                    await _updateJob(jobId, { status: newStatus });

                    // Remove row with animation
                    const row = e.target.closest('.archive-row');
                    row.style.opacity = '0';
                    setTimeout(() => {
                        openArchiveModal(); // Re-render list
                        _renderAllJobs(); // Update board in background
                    }, 200);
                } catch (error) {
                    console.error("Failed to restore job", error);
                    e.target.value = 'archived'; // Revert on failure
                }
            }
        });
    });
}
