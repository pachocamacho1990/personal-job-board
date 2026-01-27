document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) {
        window.location.href = '/jobboard/login.html';
        return;
    }

    // Set welcome message
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle && user.email) {
        const username = user.email.split('@')[0];
        welcomeTitle.textContent = `Welcome back, ${username.charAt(0).toUpperCase() + username.slice(1)}`;
    }

    try {
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
});

async function loadDashboardData() {
    const interviewsList = document.getElementById('interviewsList');
    const newMatchesList = document.getElementById('newMatchesList');

    // Show loading state
    if (interviewsList) interviewsList.innerHTML = '<div class="loading-spinner">Loading...</div>';
    if (newMatchesList) newMatchesList.innerHTML = '<div class="loading-spinner">Loading...</div>';

    try {
        const response = await fetchWithAuth('/jobboard/api/dashboard/summary');
        const data = await response.json();

        renderInterviews(data.interviews);
        renderNewMatches(data.newMatches);
    } catch (error) {
        if (interviewsList) interviewsList.innerHTML = '<div class="error-message">Failed to load interviews</div>';
        if (newMatchesList) newMatchesList.innerHTML = '<div class="error-message">Failed to load matches</div>';
    }
}

function renderInterviews(interviews) {
    const list = document.getElementById('interviewsList');
    if (!list) return;

    if (!interviews || interviews.length === 0) {
        list.innerHTML = '<div class="empty-state">No upcoming interviews scheduled.</div>';
        return;
    }

    list.innerHTML = interviews.map(job => `
        <div class="list-item" onclick="window.location.href='jobs.html?highlight=${job.id}'">
            <div class="item-icon interview-icon">📅</div>
            <div class="item-content">
                <div class="item-title">${escapeHtml(job.company)}</div>
                <div class="item-subtitle">${escapeHtml(job.position)}</div>
            </div>
            <div class="item-action">View</div>
        </div>
    `).join('');
}

function renderNewMatches(matches) {
    const list = document.getElementById('newMatchesList');
    if (!list) return;

    if (!matches || matches.length === 0) {
        list.innerHTML = '<div class="empty-state">No new AI job matches found.</div>';
        return;
    }

    list.innerHTML = matches.map(job => `
        <div class="list-item" onclick="window.location.href='jobs.html?highlight=${job.id}'">
            <div class="item-icon match-icon">🤖</div>
            <div class="item-content">
                <div class="item-title">${escapeHtml(job.company)}</div>
                <div class="item-subtitle">${escapeHtml(job.position)}</div>
            </div>
            <div class="item-action">Review</div>
        </div>
    `).join('');
}

// Helper to use existing auth API wrapper if available, or fetch directly
async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/jobboard/login.html';
        throw new Error('Unauthorized');
    }
    return response;
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
