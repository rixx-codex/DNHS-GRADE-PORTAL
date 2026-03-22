/* ==========================================
   SECURE AUTH LOGIC (auth.js) - FIXED VERSION
   ========================================== */

// 1.Toggle Password Visibility
function togglePasswordVisibility() {
    const passwordField = document.getElementById('adminPassword');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
        eyeIcon.style.color = "var(--primary)";
    } else {
        passwordField.type = 'password';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
        eyeIcon.style.color = "var(--text-dim)";
    }
}

// 2. Handle Admin Login
async function handleAdminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
        showError("Please enter your credentials.");
        return;
    }

    // Add loading class for spinner
    btn.classList.add('loading');
    btn.innerText = "";

    try {
        // Use custom database authentication
        const { data, error } = await supabase.rpc('verify_admin_login', {
            p_email: email,
            p_password: password
        });

        if (error) throw error;
        
        if (data !== true) {
            throw new Error('Invalid credentials');
        }

        // Success - store session in localStorage
        sessionStorage.setItem('admin_email', email);
        sessionStorage.setItem('admin_logged_in', 'true');
        
        // Remove loading
        btn.classList.remove('loading');
        
        // Success transition
        showToast("Access Granted!");
        checkUserSession();

    } catch (err) {
        showError("Access Denied: " + err.message);
        btn.classList.remove('loading');
        btn.innerText = "SIGN IN";
    }
}

// Expose to global scope
window.handleAdminLogin = handleAdminLogin;
window.handleLogout = handleLogout;

// Run check on page load
document.addEventListener('DOMContentLoaded', checkUserSession);

// 3. Smooth Session Check & Transition
async function checkUserSession() {
    // Check custom session in localStorage
    const isLoggedIn = sessionStorage.getItem('admin_logged_in');
    const adminEmail = sessionStorage.getItem('admin_email');
    
    const loginSection = document.getElementById('adminLoginSection');
    const encoderSection = document.getElementById('encoderSection');
    
    if (isLoggedIn === 'true') {
        // Transition effect
        loginSection.style.opacity = "0";
        setTimeout(() => {
            loginSection.classList.add('hidden');
            encoderSection.classList.remove('hidden');
            
            // Display Admin Info
            const adminIdDisplay = document.getElementById('adminIdDisplay');
            if(adminIdDisplay) adminIdDisplay.innerText = "Logged in as: " + adminEmail;
        }, 400); 
    } else {
        loginSection.classList.remove('hidden');
        encoderSection.classList.add('hidden');
    }
}

// 4. Logout Function with custom confirm modal
function handleLogout() {
    // Create custom confirmation modal
    const modal = document.createElement('div');
    modal.className = 'confirm-modal-overlay';
    modal.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-icon">
                <i class="fa-solid fa-right-from-bracket"></i>
            </div>
            <h3>Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div class="confirm-buttons">
                <button class="btn-cancel" onclick="this.closest('.confirm-modal-overlay').remove()">Cancel</button>
                <button class="btn-confirm" onclick="confirmLogout()">Logout</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function confirmLogout() {
    // Clear session storage
    sessionStorage.clear();
    localStorage.clear();
    
    // Remove modal
    document.querySelector('.confirm-modal-overlay').remove();
    
    // Reload page
    window.location.href = window.location.pathname + '?t=' + Date.now();
}

// 5. Helper: Show Error Message
function showError(msg) {
    const errorMsg = document.getElementById('loginError');
    if(errorMsg) {
        errorMsg.innerText = msg;
        errorMsg.style.display = "block";
        setTimeout(() => { errorMsg.style.display = "none"; }, 5000);
    }
}

// 6. Enter Key Listener for Login Form
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const loginSection = document.getElementById('adminLoginSection');
        if (loginSection && !loginSection.classList.contains('hidden')) {
            handleAdminLogin();
        }
    }
});

// 6. Enter Key Listener
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const loginSection = document.getElementById('adminLoginSection');
        if (loginSection && !loginSection.classList.contains('hidden')) {
            handleAdminLogin();
        }
    }
});

// 7. Forgot Password Functions
function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    const messageDiv = document.getElementById('resetMessage');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }
    if (messageDiv) {
        messageDiv.innerHTML = '';
        messageDiv.className = 'reset-message';
    }
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
    // Clear the email input
    const resetEmail = document.getElementById('resetEmail');
    if (resetEmail) resetEmail.value = '';
}

async function handleForgotPassword() {
    const email = document.getElementById('resetEmail').value.trim();
    const messageDiv = document.getElementById('resetMessage');
    const resetBtn = document.querySelector('.btn-reset');
    
    if (!email) {
        showResetMessage('Please enter your email address.', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showResetMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    // Disable button during request
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SENDING...';
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/admin.html'
        });
        
        if (error) throw error;
        
        showResetMessage('Password reset link has been sent! Check your email.', 'success');
        
        // Auto close modal after 3 seconds on success
        setTimeout(() => {
            closeForgotPasswordModal();
        }, 3000);
        
    } catch (err) {
        showResetMessage(err.message || 'Failed to send reset link. Please try again.', 'error');
    } finally {
        if (resetBtn) {
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> SEND RESET LINK';
        }
    }
}

function showResetMessage(message, type) {
    const messageDiv = document.getElementById('resetMessage');
    if (messageDiv) {
        messageDiv.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        messageDiv.className = `reset-message ${type}`;
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal && e.target === modal) {
        closeForgotPasswordModal();
    }
});

// Run session check on load
document.addEventListener('DOMContentLoaded', checkUserSession);
