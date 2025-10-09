// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Configuración Firebase corregida
const firebaseConfig = {
  apiKey: "AIzaSyAp6lYxU-ZTz8GL4fwAQWbkcCNODQuils8",
  authDomain: "villa-hermosa-00.firebaseapp.com",
  projectId: "villa-hermosa-00",
  storageBucket: "villa-hermosa-00.appspot.com",
  messagingSenderId: "82074482369",
  appId: "1:82074482369:web:66a1a2cb610b4c21440640",
  measurementId: "G-N8JEN5X0WC"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Verificar conexión
console.log('🔥 Firebase inicializado correctamente para Villa Hermosa');
console.log('📊 Proyecto:', firebaseConfig.projectId);
