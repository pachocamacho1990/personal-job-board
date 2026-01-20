/**
 * Authentication UI Logic
 */

let isSignupMode = false;

// DOM elements
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const toggleLink = document.getElementById('toggleMode');
const errorMessage = document.getElementById('errorMessage');

// Toggle between login and signup
function toggleMode() {
    isSignupMode = !isSignupMode;

    if (isSignupMode) {
        formTitle.textContent = 'Create Account';
        submitBtn.textContent = 'Sign Up';
        toggleLink.innerHTML = 'Already have an account? <strong>Log in</strong>';
    } else {
        formTitle.textContent = 'Welcome Back';
        submitBtn.textContent = 'Log In';
        toggleLink.innerHTML = 'Don\'t have an account? <strong>Sign up</strong>';
    }

    clearError();
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Clear error message
function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

// Validate email format
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    // Disable submit button during request
    submitBtn.disabled = true;
    submitBtn.textContent = isSignupMode ? 'Creating account...' : 'Logging in...';

    try {
        if (isSignupMode) {
            await api.auth.signup(email, password);
        } else {
            await api.auth.login(email, password);
        }

        // Redirect to main app on success
        window.location.href = '/index.html';
    } catch (error) {
        showError(error.message || 'Authentication failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = isSignupMode ? 'Sign Up' : 'Log In';
    }
}

// Event listeners
authForm.addEventListener('submit', handleSubmit);
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMode();
});

// Clear error when user starts typing
emailInput.addEventListener('input', clearError);
passwordInput.addEventListener('input', clearError);

// Check if already logged in
if (localStorage.getItem('authToken')) {
    window.location.href = '/index.html';
}
