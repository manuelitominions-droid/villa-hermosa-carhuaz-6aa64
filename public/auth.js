// auth.js - Sistema de autenticación y roles

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.checkSession();
    }

    checkSession() {
        const sessionUser = sessionStorage.getItem('villa_current_user');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
            this.updateUI();
        }
    }

    login(username, password) {
        const user = database.getUsuarioByCredentials(username, password);
        if (user) {
            this.currentUser = user;
            sessionStorage.setItem('villa_current_user', JSON.stringify(user));
            this.updateUI();
            return { success: true, user };
        }
        return { success: false, message: 'Usuario o contraseña incorrectos' };
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('villa_current_user');
        this.updateUI();
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdminPrincipal() {
        return this.currentUser && this.currentUser.rol === 'admin_principal';
    }

    isAdmin() {
        return this.currentUser && ['admin_principal', 'admin_secundario'].includes(this.currentUser.rol);
    }

    isViewer() {
        return this.currentUser && this.currentUser.rol === 'ver';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const mainContent = document.getElementById('mainContent');
        const mainNav = document.getElementById('mainNav');
        const userInfo = document.getElementById('userInfo');
        const currentUserSpan = document.getElementById('currentUser');
        const nuevoRegistroBtn = document.getElementById('nuevoRegistroBtn');
        const crearUsuarioBtn = document.getElementById('crearUsuarioBtn');

        if (this.isLoggedIn()) {
            loginSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
            mainNav.classList.remove('hidden');
            userInfo.classList.remove('hidden');
            currentUserSpan.textContent = `👤 ${this.currentUser.username} (${this.currentUser.rol})`;

            // Mostrar/ocultar botones según permisos
            if (this.isAdmin()) {
                nuevoRegistroBtn.classList.remove('hidden');
            } else {
                nuevoRegistroBtn.classList.add('hidden');
            }

            if (this.isAdminPrincipal()) {
                crearUsuarioBtn.classList.remove('hidden');
            } else {
                crearUsuarioBtn.classList.add('hidden');
            }

            // Mostrar sección de inicio por defecto
            if (typeof showSection === 'function') {
                showSection('inicio');
            }
        } else {
            loginSection.classList.remove('hidden');
            mainContent.classList.add('hidden');
            mainNav.classList.add('hidden');
            userInfo.classList.add('hidden');
        }
    }

    createUser(userData) {
        if (!this.isAdminPrincipal()) {
            return { success: false, message: 'No tienes permisos para crear usuarios' };
        }

        try {
            const usuarios = database.getUsuarios();
            const existingUser = usuarios.find(u => u.username === userData.username);
            
            if (existingUser) {
                return { success: false, message: 'El usuario ya existe' };
            }

            const newUser = database.addUsuario(userData);
            return { success: true, user: newUser };
        } catch (error) {
            return { success: false, message: 'Error al crear el usuario' };
        }
    }
}

// Instancia global del gestor de autenticación
const auth = new AuthManager();

// Funciones globales para el HTML
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    const result = auth.login(username, password);
    
    if (result.success) {
        errorDiv.classList.add('hidden');
        document.getElementById('loginForm').reset();
    } else {
        errorDiv.textContent = result.message;
        errorDiv.classList.remove('hidden');
    }
}

function logout() {
    auth.logout();
}

// ✅ Hacer `auth` global (visible para otros scripts)
window.auth = auth;
window.handleLogin = handleLogin;
window.logout = logout;
