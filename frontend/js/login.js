const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');

    // Tab Navigation
    if (tabSignIn && tabSignUp && loginSection && registerSection) {
        tabSignIn.addEventListener('click', () => {
            tabSignIn.classList.add('active');
            tabSignUp.classList.remove('active');
            loginSection.classList.remove('hidden');
            registerSection.classList.add('hidden');
        });

        tabSignUp.addEventListener('click', () => {
            tabSignUp.classList.add('active');
            tabSignIn.classList.remove('active');
            registerSection.classList.remove('hidden');
            loginSection.classList.add('hidden');
        });
    }

    // Login Form Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mobileInput = document.getElementById('mobile');
            const passwordInput = document.getElementById('password');
            const loginBtn = document.getElementById('loginBtn');
            
            if (!mobileInput || !passwordInput) {
                showToast('Form inputs missing!', 'error');
                return;
            }

            const origBtnHtml = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            loginBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile: mobileInput.value.trim(),
                        password: passwordInput.value
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    showToast(`Welcome back, ${data.user.name || 'User'}!`, 'success');
                    
                    setTimeout(() => {
                        if (data.user.role === 'student') {
                            window.location.href = 'student.html';
                        } else if (data.user.role === 'faculty') {
                            window.location.href = 'faculty.html';
                        } else if (data.user.role === 'parent') {
                            window.location.href = 'parent.html';
                        } else if (['admin', 'super_admin', 'principal'].includes(data.user.role)) {
                            window.location.href = 'admin.html';
                        } else if (['hod', 'accounts', 'librarian', 'warden'].includes(data.user.role)) {
                            window.location.href = 'staff.html';
                        } else {
                            window.location.href = 'student.html';
                        }
                    }, 600);
                } else {
                    showToast(data.message || 'Login failed! Please check credentials.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Unable to reach server. Please ensure backend is running.', 'error');
            } finally {
                loginBtn.innerHTML = origBtnHtml;
                loginBtn.disabled = false;
            }
        });
    }

    // Register Form Handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const regBtn = document.getElementById('regBtn');
            const origBtnHtml = regBtn.innerHTML;
            regBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            regBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: document.getElementById('regName').value.trim(),
                        role: document.getElementById('regRole').value,
                        mobile: document.getElementById('regMobile').value.trim(),
                        password: document.getElementById('regPassword').value
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    showToast('Student registered successfully! Please login.', 'success');
                    // Switch back to login
                    if (tabSignIn && tabSignUp && loginSection && registerSection) {
                        tabSignIn.click();
                        document.getElementById('mobile').value = document.getElementById('regMobile').value;
                        document.getElementById('password').value = document.getElementById('regPassword').value;
                    }
                    registerForm.reset();
                } else {
                    showToast(data.message || 'Registration failed!', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Registration failed! Network error.', 'error');
            } finally {
                regBtn.innerHTML = origBtnHtml;
                regBtn.disabled = false;
            }
        });
    }
});

function autofillDemo(mobile, password, role) {
    const mobileInput = document.getElementById('mobile');
    const passwordInput = document.getElementById('password');
    if (mobileInput && passwordInput) {
        mobileInput.value = mobile;
        passwordInput.value = password;
        showToast(`Filled ${role.toUpperCase()} credentials: ${mobile}`, 'success');
    }
}

function togglePasswordVisibility(fieldId, btn) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const icon = btn.querySelector('i');
    if (field.type === 'password') {
        field.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        field.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

function showToast(message, type = 'success') {
    let existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
