// auth.js - Sistema de autenticación

// Función para esperar a que la base de datos esté lista
function waitForDatabase() {
    return new Promise((resolve) => {
        if (window.database) {
            resolve();
        } else {
            window.addEventListener('databaseReady', resolve, { once: true });
        }
    });
}

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = {
            'villahermosa': { password: 'villa8956', rol: 'admin_principal' },
            'admin': { password: 'admin123', rol: 'admin_secundario' },
            'viewer': { password: 'view123', rol: 'ver' }
        };
        this.init();
    }

    async init() {
        // Esperar a que la base de datos esté lista
        await waitForDatabase();
        
        // Cargar usuario desde localStorage
        const savedUser = localStorage.getItem('villa_current_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUI();
            } catch (e) {
                localStorage.removeItem('villa_current_user');
            }
        }
        
        console.log('✅ AuthManager inicializado');
    }

    async login(username, password) {
        try {
            // Esperar a que la base de datos esté lista
            await waitForDatabase();
            
            const user = this.users[username];
            if (user && user.password === password) {
                this.currentUser = { username, rol: user.rol };
                localStorage.setItem('villa_current_user', JSON.stringify(this.currentUser));
                this.updateUI();
                return { success: true };
            } else {
                return { success: false, message: 'Usuario o contraseña incorrectos' };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error interno del sistema' };
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('villa_current_user');
        this.updateUI();
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && (this.currentUser.rol === 'admin_principal' || this.currentUser.rol === 'admin_secundario');
    }

    isAdminPrincipal() {
        return this.currentUser && this.currentUser.rol === 'admin_principal';
    }

    updateUI() {
        const loginSection = document.getElementById('loginSection');
        const mainContent = document.getElementById('mainContent');
        const mainNav = document.getElementById('mainNav');
        const userInfo = document.getElementById('userInfo');
        const currentUser = document.getElementById('currentUser');
        const crearUsuarioBtn = document.getElementById('crearUsuarioBtn');

        if (this.isLoggedIn()) {
            if (loginSection) loginSection.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            if (mainNav) mainNav.classList.remove('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
            if (currentUser) currentUser.textContent = `Usuario: ${this.currentUser.username}`;
            
            // Mostrar botón de crear usuario solo para admin principal
            if (crearUsuarioBtn) {
                if (this.isAdminPrincipal()) {
                    crearUsuarioBtn.classList.remove('hidden');
                } else {
                    crearUsuarioBtn.classList.add('hidden');
                }
            }
        } else {
            if (loginSection) loginSection.classList.remove('hidden');
            if (mainContent) mainContent.classList.add('hidden');
            if (mainNav) mainNav.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
        }
    }

    createUser(userData) {
        if (!this.isAdminPrincipal()) {
            return { success: false, message: 'No tienes permisos para crear usuarios' };
        }

        if (this.users[userData.username]) {
            return { success: false, message: 'El usuario ya existe' };
        }

        this.users[userData.username] = {
            password: userData.password,
            rol: userData.rol
        };

        return { success: true, message: 'Usuario creado exitosamente' };
    }
}

// Crear instancia global del sistema de autenticación
const auth = new AuthManager();
window.auth = auth;

// Función global para manejar el login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');

    if (loginError) loginError.classList.add('hidden');

    try {
        const result = await auth.login(username, password);
        
        if (result.success) {
            // Login exitoso - la UI se actualiza automáticamente
            console.log('✅ Login exitoso');
        } else {
            if (loginError) {
                loginError.textContent = result.message;
                loginError.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error en handleLogin:', error);
        if (loginError) {
            loginError.textContent = 'Error interno del sistema';
            loginError.classList.remove('hidden');
        }
    }
}

// Función global para logout
function logout() {
    auth.logout();
}

// Hacer funciones disponibles globalmente
window.handleLogin = handleLogin;
window.logout = logout;

console.log('✅ Sistema de autenticación cargado');

export default auth;
