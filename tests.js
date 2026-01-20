/**
 * Job Board Unit Tests - Simplified CLI Runner
 * Run with: node tests.js
 * 
 * Tests core functionality without overengineering:
 * - CRUD operations (create, read, update, delete)
 * - State management (currentJobId tracking)
 * - The critical bug: view→close→add workflow
 * - Data persistence (localStorage)
 * - View preferences (compact/comfortable toggle)
 */

// Mock DOM and localStorage
const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, value) => { mockStorage[key] = value; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const mockElements = {
    'jobId': { value: '' },
    'company': { value: '' },
    'position': { value: '' },
    'status': { value: 'interested' },
    'viewIcon': { textContent: '⊟' }
};

global.document = {
    getElementById: (id) => mockElements[id] || { value: '' },
    querySelector: () => ({ checked: true, value: '3' }),
    querySelectorAll: () => [{ addEventListener: () => { }, classList: { add: () => { }, remove: () => { } } }],
    createElement: () => ({ innerHTML: '', addEventListener: () => { }, appendChild: () => { }, dataset: {}, classList: { add: () => { } } }),
    addEventListener: () => { }
};

// App code
let jobs = [];
let currentJobId = null;
let isCompactView = false;

function loadJobs() {
    const stored = localStorage.getItem('jobApplications');
    jobs = stored ? JSON.parse(stored) : [];

    // Auto-migrate: add missing fields to old entries
    jobs = jobs.map(job => {
        const migrated = {
            type: job.type || 'job',
            rating: job.rating || 3,
            ...job
        };

        // Migrate timestamps for old cards
        if (!migrated.created_at) {
            migrated.created_at = job.dateAdded || new Date().toISOString();
        }
        if (!migrated.updated_at) {
            migrated.updated_at = migrated.created_at;
        }

        return migrated;
    });
}

function saveJobs() {
    localStorage.setItem('jobApplications', JSON.stringify(jobs));
}

function createJob(jobData) {
    const now = new Date().toISOString();
    const job = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: jobData.type || 'job',
        company: jobData.company || '',
        position: jobData.position || '',
        status: jobData.status,
        rating: jobData.rating || 3,
        dateAdded: now,
        created_at: now,
        updated_at: now,
        ...jobData
    };
    jobs.push(job);
    saveJobs();
    return job;
}

function updateJob(id, jobData) {
    const index = jobs.findIndex(j => j.id === id);
    if (index !== -1) {
        jobs[index] = {
            ...jobs[index],
            ...jobData,
            updated_at: new Date().toISOString()
        };
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

function openJobDetails(jobId) {
    currentJobId = jobId;
    if (jobId) {
        mockElements['jobId'].value = jobId;
    } else {
        currentJobId = null;
        mockElements['jobId'].value = '';
    }
}

function closeJobPanel() {
    mockElements['jobId'].value = '';
    currentJobId = null;
}

function handleFormSubmit(formData) {
    if (currentJobId) {
        updateJob(currentJobId, formData);
    } else {
        createJob(formData);
    }
    closeJobPanel();
}

// View preference functions
function loadViewPreference() {
    const saved = localStorage.getItem('viewPreference');
    isCompactView = saved === 'compact';
    updateViewIcon();
}

function saveViewPreference() {
    localStorage.setItem('viewPreference', isCompactView ? 'compact' : 'comfortable');
}

function toggleViewMode() {
    isCompactView = !isCompactView;
    saveViewPreference();
    updateViewIcon();
}

function updateViewIcon() {
    const icon = document.getElementById('viewIcon');
    if (icon) {
        icon.textContent = isCompactView ? '⊞' : '⊟';
    }
}

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (error) {
        failed++;
        console.log(`  ✗ ${name}`);
        console.log(`    ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function reset() {
    jobs = [];
    currentJobId = null;
    isCompactView = false;
    mockElements['viewIcon'].textContent = '⊟';
    localStorage.clear();
}

// Tests
console.log('\n🧪 Job Board Tests\n' + '='.repeat(40));

console.log('\n1. CRUD Operations');
test('Create adds job to array', () => {
    reset();
    createJob({ company: 'Test', status: 'applied' });
    assert(jobs.length === 1, 'Expected 1 job');
    assert(jobs[0].company === 'Test', 'Expected company to be Test');
});

test('Create sets defaults', () => {
    reset();
    const job = createJob({ company: 'Test', status: 'applied' });
    assert(job.type === 'job', 'Expected default type');
    assert(job.rating === 3, 'Expected default rating');
});

test('Read finds job by ID', () => {
    reset();
    const created = createJob({ company: 'Test', status: 'applied' });
    const found = getJob(created.id);
    assert(found.company === 'Test', 'Expected to find job');
});

test('Update modifies job', () => {
    reset();
    const job = createJob({ company: 'Old', status: 'applied' });
    updateJob(job.id, { company: 'New' });
    assert(getJob(job.id).company === 'New', 'Expected updated company');
});

test('Delete removes job', () => {
    reset();
    const job = createJob({ company: 'Test', status: 'applied' });
    deleteJob(job.id);
    assert(jobs.length === 0, 'Expected empty array');
});

console.log('\n2. State Management');
test('Opening job sets currentJobId', () => {
    reset();
    const job = createJob({ company: 'Test', status: 'applied' });
    openJobDetails(job.id);
    assert(currentJobId === job.id, 'Expected currentJobId to be set');
});

test('Closing panel clears currentJobId', () => {
    reset();
    currentJobId = 'some-id';
    closeJobPanel();
    assert(currentJobId === null, 'Expected null currentJobId');
});

console.log('\n3. Form Submission');
test('Submit creates when currentJobId is null', () => {
    reset();
    currentJobId = null;
    handleFormSubmit({ company: 'New', status: 'applied' });
    assert(jobs.length === 1, 'Expected new job created');
});

test('Submit updates when currentJobId is set', () => {
    reset();
    const job = createJob({ company: 'Old', status: 'applied' });
    currentJobId = job.id;
    handleFormSubmit({ company: 'Updated', status: 'applied' });
    assert(jobs.length === 1, 'Expected no new job');
    assert(jobs[0].company === 'Updated', 'Expected company updated');
});

test('BUG TEST: view→close→add creates new job', () => {
    reset();
    // Create existing job
    const existing = createJob({ company: 'Existing', position: 'Old', status: 'applied' });

    // Open and close it
    openJobDetails(existing.id);
    closeJobPanel();

    // Add new job
    openJobDetails(null);
    handleFormSubmit({ company: 'New', position: 'Fresh', status: 'applied' });

    // Verify both exist
    assert(jobs.length === 2, `Expected 2 jobs, got ${jobs.length}`);
    assert(getJob(existing.id).company === 'Existing', 'Original unchanged');
    assert(jobs.find(j => j.company === 'New'), 'New job exists');
});

console.log('\n4. Persistence');
test('Save persists to localStorage', () => {
    reset();
    createJob({ company: 'Test', status: 'applied' });
    const stored = JSON.parse(mockStorage['jobApplications']);
    assert(stored.length === 1, 'Expected 1 stored job');
});

test('Load restores from localStorage', () => {
    reset();
    mockStorage['jobApplications'] = JSON.stringify([{ id: '1', company: 'Test', status: 'applied' }]);
    loadJobs();
    assert(jobs.length === 1, 'Expected 1 loaded job');
    assert(jobs[0].company === 'Test', 'Expected loaded data');
});

test('Load migrates old data', () => {
    reset();
    mockStorage['jobApplications'] = JSON.stringify([{ id: '1', company: 'Old', status: 'applied' }]);
    loadJobs();
    assert(jobs[0].type === 'job', 'Expected default type');
    assert(jobs[0].rating === 3, 'Expected default rating');
});

console.log('\n5. View Preferences');
test('View defaults to comfortable mode', () => {
    reset();
    loadViewPreference();
    assert(isCompactView === false, 'Expected default comfortable view');
    assert(mockElements['viewIcon'].textContent === '⊟', 'Expected ⊟ icon');
});

test('Toggle switches view mode', () => {
    reset();
    toggleViewMode();
    assert(isCompactView === true, 'Expected compact view after toggle');
    assert(mockElements['viewIcon'].textContent === '⊞', 'Expected ⊞ icon');
    toggleViewMode();
    assert(isCompactView === false, 'Expected comfortable view after second toggle');
    assert(mockElements['viewIcon'].textContent === '⊟', 'Expected ⊟ icon again');
});

test('Save persists view preference', () => {
    reset();
    isCompactView = true;
    saveViewPreference();
    assert(mockStorage['viewPreference'] === 'compact', 'Expected compact saved');

    isCompactView = false;
    saveViewPreference();
    assert(mockStorage['viewPreference'] === 'comfortable', 'Expected comfortable saved');
});

test('Load restores view preference', () => {
    reset();
    mockStorage['viewPreference'] = 'compact';
    loadViewPreference();
    assert(isCompactView === true, 'Expected compact view loaded');
    assert(mockElements['viewIcon'].textContent === '⊞', 'Expected ⊞ icon');
});

test('View preference persists across sessions', () => {
    reset();
    // Simulate user setting compact view
    toggleViewMode();
    const savedPref = mockStorage['viewPreference'];

    // Simulate page reload
    isCompactView = false;
    loadViewPreference();

    // View should be restored
    assert(isCompactView === true, 'Expected view preference restored');
    assert(savedPref === 'compact', 'Expected compact in storage');
});

console.log('\n6. Timestamps');
test('Create sets both timestamps', () => {
    reset();
    const before = new Date().toISOString();
    const job = createJob({ company: 'Test', status: 'applied' });
    const after = new Date().toISOString();

    assert(job.created_at !== undefined, 'Expected created_at to be set');
    assert(job.updated_at !== undefined, 'Expected updated_at to be set');
    assert(job.created_at >= before && job.created_at <= after, 'created_at should be current time');
    assert(job.created_at === job.updated_at, 'Both timestamps should be equal on creation');
});

test('Update changes updated_at but not created_at', () => {
    reset();
    const job = createJob({ company: 'Test', status: 'applied' });
    const originalCreated = job.created_at;
    const originalUpdated = job.updated_at;

    // Wait a tiny bit to ensure different timestamp
    const updated = updateJob(job.id, { company: 'Updated' });

    assert(updated.created_at === originalCreated, 'created_at should not change');
    assert(updated.updated_at >= originalUpdated, 'updated_at should be updated');
});

test('Migration adds timestamps to old data', () => {
    reset();
    const oldDate = '2025-01-01T00:00:00.000Z';
    mockStorage['jobApplications'] = JSON.stringify([
        { id: '1', company: 'Old', status: 'applied', dateAdded: oldDate }
    ]);
    loadJobs();

    assert(jobs[0].created_at === oldDate, 'created_at should use dateAdded');
    assert(jobs[0].updated_at === oldDate, 'updated_at should equal created_at');
});

test('Migration handles data without dateAdded', () => {
    reset();
    mockStorage['jobApplications'] = JSON.stringify([
        { id: '1', company: 'Very Old', status: 'applied' }
    ]);
    loadJobs();

    assert(jobs[0].created_at !== undefined, 'created_at should be set');
    assert(jobs[0].updated_at !== undefined, 'updated_at should be set');
});

console.log('\n7. Sorting');
test('Jobs sort by updated_at descending', () => {
    reset();
    createJob({ company: 'Older', status: 'applied' });
    createJob({ company: 'Newer', status: 'applied' });
    // Make second job have later timestamp
    jobs[1].updated_at = new Date(Date.now() + 1000).toISOString();

    const sorted = [...jobs].sort((a, b) => {
        const dateA = new Date(a.updated_at || 0);
        const dateB = new Date(b.updated_at || 0);
        const dateDiff = dateB - dateA;
        if (dateDiff === 0) {
            return (b.rating || 3) - (a.rating || 3);
        }
        return dateDiff;
    });
    assert(sorted[0].company === 'Newer', 'Newer should come first');
});

test('Jobs with same date sort by rating descending', () => {
    reset();
    const now = new Date().toISOString();
    createJob({ company: 'Low', rating: 1, status: 'applied' });
    createJob({ company: 'High', rating: 5, status: 'applied' });
    createJob({ company: 'Mid', rating: 3, status: 'applied' });
    // Set all to same timestamp
    jobs.forEach(j => j.updated_at = now);

    const sorted = [...jobs].sort((a, b) => {
        const dateA = new Date(a.updated_at || 0);
        const dateB = new Date(b.updated_at || 0);
        const dateDiff = dateB - dateA;
        if (dateDiff === 0) {
            return (b.rating || 3) - (a.rating || 3);
        }
        return dateDiff;
    });

    assert(sorted[0].company === 'High', 'Highest rated should come first');
    assert(sorted[1].company === 'Mid', 'Mid rated should come second');
    assert(sorted[2].company === 'Low', 'Lowest rated should come last');
});

// Summary
console.log('\n' + '='.repeat(40));
if (failed === 0) {
    console.log(`✓ All ${passed} tests passed!\n`);
    process.exit(0);
} else {
    console.log(`✗ ${failed} failed, ${passed} passed\n`);
    process.exit(1);
}
