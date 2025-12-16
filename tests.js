/**
 * Job Board Unit Tests - CLI Runner
 * Run with: node tests.js
 */

// ========================================
// Mock DOM and Browser APIs
// ========================================
const mockStorage = {};
global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, value) => { mockStorage[key] = value; },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

// Mock DOM elements
const mockElements = {
    'addJobBtn': { addEventListener: () => { } },
    'detailPanel': { classList: { add: () => { }, remove: () => { }, contains: () => false } },
    'closePanel': { addEventListener: () => { } },
    'jobForm': { reset: () => { }, addEventListener: () => { } },
    'deleteBtn': { style: { display: '' }, addEventListener: () => { } },
    'panelTitle': { textContent: '' },
    'jobId': { value: '' },
    'contactName': { value: '' },
    'organization': { value: '' },
    'company': { value: '' },
    'position': { value: '' },
    'location': { value: '' },
    'salary': { value: '' },
    'status': { value: 'interested' },
    'comments': { value: '' }
};

global.document = {
    getElementById: (id) => mockElements[id] || { value: '', textContent: '', style: {} },
    querySelector: (sel) => {
        if (sel.includes('type')) return { checked: true, value: 'job' };
        if (sel.includes('rating')) return { checked: true, value: '3' };
        if (sel.includes('.connection-fields')) return { style: { display: '' } };
        if (sel.includes('.cards-container')) return { innerHTML: '', appendChild: () => { } };
        if (sel.includes('.count-badge')) return { textContent: '' };
        return { checked: false, value: '', classList: { add: () => { }, remove: () => { } } };
    },
    querySelectorAll: (sel) => {
        if (sel.includes('.cards-container')) {
            return [{ innerHTML: '', appendChild: () => { }, addEventListener: () => { } }];
        }
        if (sel.includes('.rating-input label')) {
            return [{ classList: { add: () => { }, remove: () => { } } }];
        }
        if (sel.includes('input[name=')) {
            return [{ addEventListener: () => { }, checked: true, value: '3' }];
        }
        return [];
    },
    createElement: () => ({
        className: '',
        draggable: false,
        dataset: {},
        innerHTML: '',
        addEventListener: () => { },
        appendChild: () => { }
    }),
    addEventListener: () => { }
};

global.console = console;

// ========================================
// Load app code (extract functions)
// ========================================
let jobs = [];
let currentJobId = null;

function loadJobs() {
    try {
        const stored = localStorage.getItem('jobApplications');
        jobs = stored ? JSON.parse(stored) : [];
        jobs = jobs.map(job => ({
            type: job.type || 'job',
            rating: job.rating || 3,
            ...job
        }));
    } catch (error) {
        jobs = [];
    }
}

function saveJobs() {
    localStorage.setItem('jobApplications', JSON.stringify(jobs));
}

function createJob(jobData) {
    const job = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: jobData.type || 'job',
        company: jobData.company || '',
        position: jobData.position || '',
        location: jobData.location || '',
        salary: jobData.salary || '',
        contactName: jobData.contactName || '',
        organization: jobData.organization || '',
        status: jobData.status,
        rating: jobData.rating || 3,
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

function renderStars(rating) {
    const filled = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return `<span class="rating-stars">${filled}${empty}</span>`;
}

function openJobDetails(jobId) {
    currentJobId = jobId;
    const job = getJob(jobId);

    if (job) {
        mockElements['jobId'].value = job.id;
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

// ========================================
// Test Framework
// ========================================
let passed = 0;
let failed = 0;
let currentSuite = '';

function describe(name, fn) {
    currentSuite = name;
    console.log(`\n\x1b[1m${name}\x1b[0m`);
    fn();
}

function it(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    } catch (error) {
        failed++;
        console.log(`  \x1b[31m✗\x1b[0m ${name}`);
        console.log(`    \x1b[31m${error.message}\x1b[0m`);
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toEqual(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toBeTruthy() {
            if (!actual) throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
        },
        toBeNull() {
            if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
        },
        toContain(expected) {
            if (!actual.includes(expected)) {
                throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
            }
        }
    };
}

function resetAppState() {
    jobs = [];
    currentJobId = null;
    localStorage.clear();
}

// ========================================
// TEST SUITES
// ========================================

console.log('\n🧪 Job Board Unit Tests\n' + '='.repeat(40));

// ---- CRUD Operations ----
describe('CRUD Operations', () => {

    it('createJob should generate a unique ID', () => {
        resetAppState();
        const job1 = createJob({ company: 'Test1', status: 'interested' });
        const job2 = createJob({ company: 'Test2', status: 'interested' });
        expect(job1.id).toBeTruthy();
        expect(job2.id).toBeTruthy();
        expect(job1.id === job2.id).toBe(false);
    });

    it('createJob should add job to jobs array', () => {
        resetAppState();
        expect(jobs.length).toBe(0);
        createJob({ company: 'TestCo', status: 'interested' });
        expect(jobs.length).toBe(1);
    });

    it('createJob should set default values', () => {
        resetAppState();
        const job = createJob({ company: 'TestCo', status: 'applied' });
        expect(job.type).toBe('job');
        expect(job.rating).toBe(3);
        expect(job.comments).toBe('');
    });

    it('createJob should preserve custom values', () => {
        resetAppState();
        const job = createJob({
            company: 'TestCo',
            status: 'applied',
            type: 'connection',
            rating: 5,
            contactName: 'John Doe'
        });
        expect(job.type).toBe('connection');
        expect(job.rating).toBe(5);
        expect(job.contactName).toBe('John Doe');
    });

    it('getJob should find job by ID', () => {
        resetAppState();
        const created = createJob({ company: 'FindMe', status: 'interested' });
        const found = getJob(created.id);
        expect(found.company).toBe('FindMe');
    });

    it('getJob should return undefined for non-existent ID', () => {
        resetAppState();
        const found = getJob('nonexistent-id');
        expect(found).toBe(undefined);
    });

    it('updateJob should modify existing job', () => {
        resetAppState();
        const job = createJob({ company: 'Original', status: 'interested' });
        updateJob(job.id, { company: 'Updated' });
        const updated = getJob(job.id);
        expect(updated.company).toBe('Updated');
    });

    it('updateJob should preserve unchanged fields', () => {
        resetAppState();
        const job = createJob({ company: 'Test', position: 'Dev', status: 'interested' });
        updateJob(job.id, { company: 'NewCo' });
        const updated = getJob(job.id);
        expect(updated.position).toBe('Dev');
    });

    it('updateJob should return null for non-existent ID', () => {
        resetAppState();
        const result = updateJob('fake-id', { company: 'Test' });
        expect(result).toBeNull();
    });

    it('deleteJob should remove job from array', () => {
        resetAppState();
        const job = createJob({ company: 'ToDelete', status: 'interested' });
        expect(jobs.length).toBe(1);
        deleteJob(job.id);
        expect(jobs.length).toBe(0);
    });

    it('deleteJob should only delete matching ID', () => {
        resetAppState();
        const job1 = createJob({ company: 'Keep', status: 'interested' });
        const job2 = createJob({ company: 'Delete', status: 'interested' });
        deleteJob(job2.id);
        expect(jobs.length).toBe(1);
        expect(jobs[0].company).toBe('Keep');
    });
});

// ---- State Management ----
describe('State Management (currentJobId)', () => {

    it('currentJobId should be null initially', () => {
        resetAppState();
        expect(currentJobId).toBeNull();
    });

    it('openJobDetails(null) should set currentJobId to null', () => {
        resetAppState();
        currentJobId = 'some-old-id';
        openJobDetails(null);
        expect(currentJobId).toBeNull();
    });

    it('openJobDetails(id) should set currentJobId to that id', () => {
        resetAppState();
        const job = createJob({ company: 'Test', status: 'interested' });
        openJobDetails(job.id);
        expect(currentJobId).toBe(job.id);
    });

    it('closeJobPanel should reset currentJobId to null', () => {
        resetAppState();
        currentJobId = 'some-id';
        closeJobPanel();
        expect(currentJobId).toBeNull();
    });

    it('closeJobPanel after editing should clear currentJobId', () => {
        resetAppState();
        const job = createJob({ company: 'Test', status: 'interested' });
        openJobDetails(job.id);
        expect(currentJobId).toBe(job.id);
        closeJobPanel();
        expect(currentJobId).toBeNull();
    });
});

// ---- Form Submission Logic ----
describe('Form Submission Logic', () => {

    it('handleFormSubmit should create new job when currentJobId is null', () => {
        resetAppState();
        currentJobId = null;
        const initialCount = jobs.length;
        handleFormSubmit({ company: 'NewCompany', position: 'NewPosition', status: 'interested' });
        expect(jobs.length).toBe(initialCount + 1);
        expect(jobs[jobs.length - 1].company).toBe('NewCompany');
    });

    it('handleFormSubmit should update existing job when currentJobId is set', () => {
        resetAppState();
        const job = createJob({ company: 'Original', status: 'interested' });
        currentJobId = job.id;
        const initialCount = jobs.length;
        handleFormSubmit({ company: 'Modified', position: 'ModPosition', status: 'applied' });
        expect(jobs.length).toBe(initialCount);
        const updated = getJob(job.id);
        expect(updated.company).toBe('Modified');
    });

    it('CRITICAL: After view->close->add, new job should be created, not update', () => {
        resetAppState();

        // Step 1: Create an existing job
        const existingJob = createJob({
            company: 'ExistingCo',
            position: 'ExistingPos',
            status: 'interested'
        });
        const existingId = existingJob.id;

        // Step 2: Simulate opening that job for editing
        openJobDetails(existingId);
        expect(currentJobId).toBe(existingId);

        // Step 3: Close the panel
        closeJobPanel();
        expect(currentJobId).toBeNull();

        // Step 4: Open the "Add New" panel
        openJobDetails(null);
        expect(currentJobId).toBeNull();

        // Step 5: Submit form with new data
        handleFormSubmit({
            company: 'BrandNewCo',
            position: 'BrandNewPos',
            status: 'applied'
        });

        // Verify: Should have 2 jobs now
        expect(jobs.length).toBe(2);

        // Verify: Original job unchanged
        const original = getJob(existingId);
        expect(original.company).toBe('ExistingCo');
        expect(original.position).toBe('ExistingPos');

        // Verify: New job exists with new data
        const newJob = jobs.find(j => j.id !== existingId);
        expect(newJob.company).toBe('BrandNewCo');
        expect(newJob.position).toBe('BrandNewPos');
    });
});

// ---- LocalStorage Persistence ----
describe('LocalStorage Persistence', () => {

    it('saveJobs should persist to localStorage', () => {
        resetAppState();
        createJob({ company: 'Persisted', status: 'interested' });
        const stored = JSON.parse(mockStorage['jobApplications']);
        expect(stored.length).toBe(1);
        expect(stored[0].company).toBe('Persisted');
    });

    it('loadJobs should restore from localStorage', () => {
        resetAppState();
        mockStorage['jobApplications'] = JSON.stringify([
            { id: '123', company: 'Loaded', status: 'applied' }
        ]);
        loadJobs();
        expect(jobs.length).toBe(1);
        expect(jobs[0].company).toBe('Loaded');
    });

    it('loadJobs should migrate old entries without type', () => {
        resetAppState();
        mockStorage['jobApplications'] = JSON.stringify([
            { id: '123', company: 'OldData', status: 'applied' }
        ]);
        loadJobs();
        expect(jobs[0].type).toBe('job');
        expect(jobs[0].rating).toBe(3);
    });
});

// ---- Helper Functions ----
describe('Helper Functions', () => {

    it('renderStars should generate correct star string', () => {
        expect(renderStars(1)).toContain('★☆☆☆☆');
        expect(renderStars(3)).toContain('★★★☆☆');
        expect(renderStars(5)).toContain('★★★★★');
    });
});

// ========================================
// Summary
// ========================================
console.log('\n' + '='.repeat(40));
if (failed === 0) {
    console.log(`\x1b[32m✓ All ${passed} tests passed!\x1b[0m\n`);
    process.exit(0);
} else {
    console.log(`\x1b[31m✗ ${failed} test(s) failed, ${passed} passed\x1b[0m\n`);
    process.exit(1);
}
