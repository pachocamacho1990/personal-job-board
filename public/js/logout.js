< !--Add logout handler inline-- >
    <script>
    // Logout button handler
    document.addEventListener('DOMContentLoaded', () => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    api.auth.logout();
                }
            });
        }
    });
    </script>
