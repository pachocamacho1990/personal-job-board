/**
 * Logout Logic
 * Handles custom confirmation modal for logout
 */
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const confirmBtn = document.getElementById('confirmLogout');
    const cancelBtn = document.getElementById('cancelLogout');

    // Open Modal
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Stop any default behavior
            if (logoutModal) {
                logoutModal.style.display = 'flex';
            }
        });
    }

    // Confirm Logout
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            api.auth.logout();
        });
    }

    // Cancel / Close Modal
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    // Close on click outside
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && logoutModal && logoutModal.style.display === 'flex') {
            logoutModal.style.display = 'none';
        }
    });
});
