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

        // Configuración de Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyBvOoWWl7pVGGnuGJWnz8bkV8yHxGLwYxs",
            authDomain: "villa-hermosa-00.firebaseapp.com",
            projectId: "villa-hermosa-00",
            storageBucket: "villa-hermosa-00.appspot.com",
            messagingSenderId: "123456789012",
            appId: "1:123456789012:web:abcdef123456789012345678"
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
        
        // Disparar evento personalizado para indicar que Firebase está listo
        window.dispatchEvent(new CustomEvent('firebaseReady'));
    `;
    
    document.head.appendChild(firebaseScript);
})();
