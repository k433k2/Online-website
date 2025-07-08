// Authentication state
let currentUser = null;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const registerForm = document.getElementById('registerUser');
const loginUserForm = document.getElementById('loginUser');
const userDropdown = document.getElementById('userDropdown');
const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const myFilesBtn = document.getElementById('myFiles');

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        validateToken(token);
    }
});

// Show auth modal
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    authModal.style.display = 'flex';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
});

// Toggle between login and signup forms
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
});

// Register new user
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(user)
        });

        const data = await response.json();
        
        if (response.ok) {
            setCurrentUser(data.user, data.token);
            authModal.style.display = 'none';
            showSuccess('Registration successful!');
        } else {
            showError(data.message || 'Registration failed');
        }
    } catch (err) {
        showError('Network error. Please try again.');
    }
});

// Login user
loginUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const credentials = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();
        
        if (response.ok) {
            setCurrentUser(data.user, data.token);
            authModal.style.display = 'none';
            showSuccess('Login successful!');
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (err) {
        showError('Network error. Please try again.');
    }
});

// Logout user
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutUser();
});

// Validate JWT token
async function validateToken(token) {
    try {
        const response = await fetch('/api/auth/validate', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            setCurrentUser(user, token);
        } else {
            localStorage.removeItem('token');
        }
    } catch (err) {
        console.error('Token validation error:', err);
    }
}

// Set current user
function setCurrentUser(user, token) {
    currentUser = user;
    localStorage.setItem('token', token);
    updateUI();
}

// Logout user
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('token');
    updateUI();
    showSuccess('Logged out successfully');
}

// Update UI based on auth state
function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        userDropdown.style.display = 'inline-block';
        userNameSpan.textContent = currentUser.name;
    } else {
        loginBtn.style.display = 'block';
        userDropdown.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    authForms.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    document.body.prepend(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}
