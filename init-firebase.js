// Inicializador Firebase para Villa Hermosa
// Este script asegura que Firebase se cargue correctamente

console.log('🔥 Iniciando carga de Firebase...');

// Función para esperar a que Firebase esté disponible
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.db && window.firebaseDB) {
                console.log('✅ Firebase está disponible');
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Función para cargar datos iniciales
async function loadInitialData() {
    try {
        console.log('📊 Cargando datos iniciales...');
        
        // Cargar registros
        const registros = await window.db.getRegistros();
        console.log(`✅ ${registros.length} registros cargados`);
        
        // Cargar cuotas
        const cuotas = await window.db.getCuotas();
        console.log(`✅ ${cuotas.length} cuotas cargadas`);
        
        // Mostrar mensaje de éxito
        if (typeof showNotification === 'function') {
            showNotification('Firebase conectado correctamente', 'success');
        }
        
        console.log('🚀 Aplicación lista para usar con Firebase');
        
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error conectando con Firebase', 'error');
        }
    }
}

// Inicializar cuando Firebase esté listo
waitForFirebase().then(loadInitialData);

// Hacer disponible globalmente
window.loadInitialData = loadInitialData;