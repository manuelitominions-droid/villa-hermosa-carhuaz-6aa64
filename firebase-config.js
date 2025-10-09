// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ⚙️ Configuración Firebase correcta (tu proyecto actual)
const firebaseConfig = {
  apiKey: "AIzaSyAp6lYxU-ZTz8GL4fwAQWbkcCNODQuils8",
  authDomain: "villa-hermosa-carhuaz-6aa64.firebaseapp.com",
  projectId: "villa-hermosa-carhuaz-6aa64",
  storageBucket: "villa-hermosa-carhuaz-6aa64.appspot.com", // 👈 muy importante este cambio
  messagingSenderId: "82074482369",
  appId: "1:82074482369:web:66a1a2cb610b4c21440640",
  measurementId: "G-N8JEN5X0WC"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Hacer accesible globalmente
window.firebase = { db, auth, storage };
window.dispatchEvent(new Event('firebaseReady'));

console.log('🔥 Firebase inicializado correctamente para Villa Hermosa');
console.log('📊 Proyecto:', firebaseConfig.projectId);
