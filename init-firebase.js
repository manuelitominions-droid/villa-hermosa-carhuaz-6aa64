// init-firebase.js - Inicialización de Firebase
console.log('🔥 Iniciando configuración de Firebase...');

// Importar Firebase desde CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Configuración Firebase actualizada para el proyecto correcto
const firebaseConfig = {
  apiKey: "AIzaSyAp6lYxU-ZTz8GL4fwAQWbkcCNODQuils8",
  authDomain: "villa-hermosa-00.firebaseapp.com",
  projectId: "villa-hermosa-00",
  storageBucket: "villa-hermosa-00.appspot.com",
  messagingSenderId: "82074482369",
  appId: "1:82074482369:web:66a1a2cb610b4c21440640",
  measurementId: "G-N8JEN5X0WC"
};

try {
  // Inicializar Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  console.log('✅ Firebase inicializado correctamente');
  console.log('📊 Proyecto:', firebaseConfig.projectId);

  // Hacer disponible globalmente
  window.firebase = {
    app,
    db,
    auth,
    storage,
    // Funciones de Firestore
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy
  };

  // Disparar evento para notificar que Firebase está listo
  console.log('🔔 Disparando evento firebaseReady');
  window.dispatchEvent(new CustomEvent('firebaseReady'));

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  window.firebase = null;
}
