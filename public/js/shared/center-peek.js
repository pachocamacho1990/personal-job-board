/**
 * Center Peek Module
 * Read-only job detail modal with Journey Map visualization.
 * Depends on: shared/utils.js (formatFullDate), shared/journey-map.js (renderJourneyMap),
 *             api.js (api.jobs.getHistory), marked.js (marked.parse)
 *
 * Usage:
 *   initCenterPeek({ getJob, setCurrentJobId });
 *   // Called from app.js init() after setupEventListeners()
 */

// DOM refs (cached on init)
let _centerPeekModal;
let _closeCenterPeekBtn;
let _peekContent;

// Callbacks passed from app.js
let _getJob;
let _setCurrentJobId;

/**
 * Initialize Center Peek — cache DOM refs, attach listeners, override openJobDetails.
 * @param {Object} deps
 * @param {Function} deps.getJob - (id) => job object
 * @param {Function} deps.setCurrentJobId - (id) => void, sets app.js currentJobId
 */
function initCenterPeek(deps) {
    _getJob = deps.getJob;
    _setCurrentJobId = deps.setCurrentJobId;

    _centerPeekModal = document.getElementById('centerPeekModal');
    _closeCenterPeekBtn = document.getElementById('closeCenterPeek');
    _peekContent = document.getElementById('peekContent');

    // Listeners
    if (_closeCenterPeekBtn) {
        _closeCenterPeekBtn.addEventListener('click', closeCenterPeek);
        _centerPeekModal.addEventListener('click', (e) => {
            if (e.target === _centerPeekModal) closeCenterPeek();
        });
    }

    // Override openJobDetails: card clicks open Center Peek, "Add" opens Edit Panel
    const originalOpenJobDetails = openJobDetails;
    openJobDetails = function (jobId) {
        if (jobId === null) {
            originalOpenJobDetails(null); // Add Mode → Edit Panel
        } else {
            openCenterPeek(jobId); // View Mode → Center Peek
        }
    };

    // Expose original edit function for "Edit Details" button
    window.openRealEditPanel = originalOpenJobDetails;
}

/**
 * Open the Center Peek modal for a given job.
 */
async function openCenterPeek(jobId) {
    const job = _getJob(jobId);
    if (!job) return;

    _setCurrentJobId(jobId);

    // Show modal loading state
    _centerPeekModal.classList.add('open');
    _peekContent.innerHTML = '<div style="color:white; padding:2rem;">Loading history...</div>';

    try {
        const history = await api.jobs.getHistory(jobId);
        renderCenterPeekContent(job, history);
    } catch (error) {
        console.error("Failed to load history", error);
        _peekContent.innerHTML = '<div style="color:var(--color-danger); padding:2rem;">Failed to load history.</div>';
    }
}

/**
 * Close the Center Peek modal.
 */
function closeCenterPeek() {
    _centerPeekModal.classList.remove('open');
    _peekContent.innerHTML = '';
}

/**
 * Render the Center Peek content (job details + Journey Map).
 */
function renderCenterPeekContent(job, history) {
    _peekContent.innerHTML = `
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
        window.openRealEditPanel(job.id);
    });

    // Render Journey Map SVG
    setTimeout(() => renderJourneyMap(history, job.status), 0);
}
