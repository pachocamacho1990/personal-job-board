document.addEventListener('DOMContentLoaded', () => {
    // Highlight active nav item
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (currentPath.endsWith(href) || (href === 'index.html' && (currentPath.endsWith('/') || currentPath.endsWith('index.html')))) {
            item.classList.add('active');
        }
    });

    // Logout functionality
    const logoutTrigger = document.querySelector('.logout-trigger');
    if (logoutTrigger) {
        logoutTrigger.addEventListener('click', () => {
            // Use existing logout logic if available or just clear token
            if (typeof logout === 'function') {
                logout();
            } else {
                // Fallback
                const logoutModal = document.getElementById('logoutModal');
                if (logoutModal) {
                    logoutModal.style.display = 'flex';
                }
            }
        });
    }

    // Populate user info if available in localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userNameElement = document.querySelector('.user-name');
    const userAvatarElement = document.querySelector('.user-avatar');

    if (user.email) {
        if (userNameElement) userNameElement.textContent = user.email.split('@')[0];
        if (userAvatarElement) userAvatarElement.textContent = user.email.charAt(0).toUpperCase();
    }
});
