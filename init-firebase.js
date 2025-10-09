// init-firebase.js - Inicialización de Firebase
console.log('🔥 Cargando Firebase SDK...');

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBvOoWWl7pVGGnuGJWnz8bkV8yHxGLwYxs",
    authDomain: "villa-hermosa-00.firebaseapp.com",
    projectId: "villa-hermosa-00",
    storageBucket: "villa-hermosa-00.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012345678"
};

// Cargar Firebase SDK dinámicamente
async function loadFirebaseSDK() {
    try {
        // Cargar Firebase core
        const firebaseScript = document.createElement('script');
        firebaseScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        firebaseScript.onload = async () => {
            console.log('✅ Firebase App cargado');
            
            // Cargar Firestore
            const firestoreScript = document.createElement('script');
            firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
            firestoreScript.onload = async () => {
                console.log('✅ Firebase Firestore cargado');
                
                // Cargar Storage
                const storageScript = document.createElement('script');
                storageScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
                storageScript.onload = () => {
                    console.log('✅ Firebase Storage cargado');
                    
                    // Inicializar Firebase
                    try {
                        const app = firebase.initializeApp(firebaseConfig);
                        
                        // Crear objeto global con todas las funciones necesarias
                        window.firebase = {
                            app: app,
                            firestore: {
                                getFirestore: () => firebase.firestore(),
                                collection: (db, path) => firebase.firestore().collection(path),
                                doc: (db, path, id) => firebase.firestore().collection(path).doc(id),
                                addDoc: (ref, data) => ref.add(data),
                                updateDoc: (ref, data) => ref.update(data),
                                deleteDoc: (ref) => ref.delete(),
                                getDocs: (ref) => ref.get(),
                                getDoc: (ref) => ref.get(),
                                query: (ref, ...constraints) => {
                                    let q = ref;
                                    constraints.forEach(constraint => {
                                        if (constraint.type === 'where') {
                                            q = q.where(constraint.field, constraint.op, constraint.value);
                                        } else if (constraint.type === 'orderBy') {
                                            q = q.orderBy(constraint.field, constraint.direction);
                                        } else if (constraint.type === 'limit') {
                                            q = q.limit(constraint.limit);
                                        }
                                    });
                                    return q;
                                },
                                where: (field, op, value) => ({ type: 'where', field, op, value }),
                                orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
                                limit: (limit) => ({ type: 'limit', limit })
                            },
                            storage: {
                                getStorage: () => firebase.storage(),
                                ref: (storage, path) => firebase.storage().ref(path),
                                uploadBytes: (ref, data) => ref.put(data),
                                getDownloadURL: (ref) => ref.getDownloadURL()
                            }
                        };
                        
                        console.log('✅ Firebase inicializado correctamente y disponible globalmente');
                        
                        // Disparar evento personalizado para notificar que Firebase está listo
                        window.dispatchEvent(new CustomEvent('firebaseReady'));
                        
                    } catch (error) {
                        console.error('❌ Error inicializando Firebase:', error);
                    }
                };
                storageScript.onerror = () => console.error('❌ Error cargando Firebase Storage');
                document.head.appendChild(storageScript);
            };
            firestoreScript.onerror = () => console.error('❌ Error cargando Firebase Firestore');
            document.head.appendChild(firestoreScript);
        };
        firebaseScript.onerror = () => console.error('❌ Error cargando Firebase App');
        document.head.appendChild(firebaseScript);
        
    } catch (error) {
        console.error('❌ Error cargando Firebase SDK:', error);
    }
}

// Cargar Firebase inmediatamente
loadFirebaseSDK();
