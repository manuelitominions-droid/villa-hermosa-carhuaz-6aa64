// init-firebase.js - Inicialización de Firebase
console.log('🔥 Cargando Firebase SDK...');

// Cargar Firebase desde CDN
(function() {
    // Firebase v9 modular SDK
    const firebaseScript = document.createElement('script');
    firebaseScript.type = 'module';
    firebaseScript.innerHTML = `
        // Importar Firebase
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
        import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

        // ⚙️ Configuración Firebase CORREGIDA - Opción A
        const firebaseConfig = {
            apiKey: "AIzaSyAp6lYxU-ZTz8GL4fwAQWbkcCNODQuils8",
            authDomain: "villa-hermosa-carhuaz-6aa64.firebaseapp.com",
            projectId: "villa-hermosa-carhuaz-6aa64",
            storageBucket: "villa-hermosa-carhuaz-6aa64.appspot.com",
            messagingSenderId: "82074482369",
            appId: "1:82074482369:web:66a1a2cb610b4c21440640",
            measurementId: "G-N8JEN5X0WC"
        };

        // Inicializar Firebase
        let app;
        try {
            app = initializeApp(firebaseConfig);
            console.log('✅ Firebase App cargado');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            throw error;
        }

        // Inicializar servicios
        const db = getFirestore(app);
        const storage = getStorage(app);

        console.log('✅ Firebase Firestore cargado');
        console.log('✅ Firebase Storage cargado');

        // Crear objeto Firebase global con todas las funciones necesarias
        window.firebase = {
            app: app,
            db: db,
            storage: storage,
            // Funciones de Firestore
            collection: (name) => collection(db, name),
            doc: (collectionName, docId) => doc(db, collectionName, docId),
            addDoc: addDoc,
            updateDoc: updateDoc,
            deleteDoc: deleteDoc,
            getDocs: getDocs,
            getDoc: getDoc,
            query: query,
            where: where,
            orderBy: orderBy,
            limit: limit,
            // Funciones de Storage
            ref: (path) => ref(storage, path),
            uploadBytes: uploadBytes,
            getDownloadURL: getDownloadURL
        };

        console.log('✅ Firebase inicializado correctamente y disponible globalmente');
        console.log('📊 Proyecto unificado:', firebaseConfig.projectId);
        
        // Disparar evento personalizado para indicar que Firebase está listo
        window.dispatchEvent(new CustomEvent('firebaseReady'));
    `;
    
    document.head.appendChild(firebaseScript);
})();
