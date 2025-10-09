// database-firebase.js - Manejo de base de datos con Firebase

console.log('🔥 Iniciando carga de Firebase...');

// Función para esperar a que Firebase esté disponible
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebase && window.firebase.db) {
            resolve();
        } else {
            window.addEventListener('firebaseReady', resolve);
        }
    });
}

// Clase para manejar la base de datos
class DatabaseManager {
    constructor() {
        this.db = null;
        this.storage = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return true;
        
        try {
            await waitForFirebase();
            
            if (!window.firebase || !window.firebase.db) {
                throw new Error('Firebase no está disponible');
            }
            
            this.db = window.firebase.db;
            this.storage = window.firebase.storage;
            this.initialized = true;
            console.log('✅ DatabaseManager inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error inicializando DatabaseManager:', error);
            this.initialized = false;
            return false;
        }
    }

    // Registros
    async getRegistros() {
        try {
            const success = await this.init();
            if (!success || !this.initialized) return [];
            
            const registrosRef = window.firebase.collection('registros');
            const snapshot = await window.firebase.getDocs(registrosRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo registros:', error);
            return [];
        }
    }

    async addRegistro(registroData) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const registrosRef = window.firebase.collection('registros');
            const docRef = await window.firebase.addDoc(registrosRef, {
                ...registroData,
                fecha_registro: new Date().toISOString().split('T')[0]
            });
            return { id: docRef.id, ...registroData };
        } catch (error) {
            console.error('Error agregando registro:', error);
            throw error;
        }
    }

    async updateRegistro(registroId, updateData) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const registroRef = window.firebase.doc('registros', registroId);
            await window.firebase.updateDoc(registroRef, updateData);
            return true;
        } catch (error) {
            console.error('Error actualizando registro:', error);
            throw error;
        }
    }

    async deleteRegistro(registroId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const registroRef = window.firebase.doc('registros', registroId);
            await window.firebase.deleteDoc(registroRef);
            
            // También eliminar cuotas asociadas
            const cuotasRef = window.firebase.collection('cuotas');
            const cuotasQuery = window.firebase.query(
                cuotasRef, 
                window.firebase.where('registro_id', '==', registroId)
            );
            const cuotasSnapshot = await window.firebase.getDocs(cuotasQuery);
            
            const deletePromises = cuotasSnapshot.docs.map(cuotaDoc => 
                window.firebase.deleteDoc(window.firebase.doc('cuotas', cuotaDoc.id))
            );
            await Promise.all(deletePromises);
            
            return true;
        } catch (error) {
            console.error('Error eliminando registro:', error);
            throw error;
        }
    }

    async searchRegistros({ manzana, lote, query }) {
        try {
            const registros = await this.getRegistros();
            let results = registros;

            if (manzana && lote) {
                results = results.filter(r => 
                    r.manzana && r.lote &&
                    r.manzana.toLowerCase().includes(manzana.toLowerCase()) &&
                    r.lote.toLowerCase().includes(lote.toLowerCase())
                );
            }

            if (query) {
                results = results.filter(r =>
                    (r.nombre1 && r.nombre1.toLowerCase().includes(query.toLowerCase())) ||
                    (r.nombre2 && r.nombre2.toLowerCase().includes(query.toLowerCase())) ||
                    (r.dni1 && r.dni1.includes(query)) ||
                    (r.dni2 && r.dni2.includes(query))
                );
            }

            return { results, error: null };
        } catch (error) {
            console.error('Error en búsqueda:', error);
            return { results: [], error: error.message };
        }
    }

    // Cuotas
    async getCuotas() {
        try {
            const success = await this.init();
            if (!success || !this.initialized) return [];
            
            const cuotasRef = window.firebase.collection('cuotas');
            const snapshot = await window.firebase.getDocs(cuotasRef);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo cuotas:', error);
            return [];
        }
    }

    async getCuotaById(cuotaId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) return null;
            
            const cuotaRef = window.firebase.doc('cuotas', cuotaId);
            const cuotaDoc = await window.firebase.getDoc(cuotaRef);
            if (cuotaDoc.exists()) {
                return { id: cuotaDoc.id, ...cuotaDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo cuota:', error);
            return null;
        }
    }

    async addCuota(cuotaData) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const cuotasRef = window.firebase.collection('cuotas');
            const docRef = await window.firebase.addDoc(cuotasRef, cuotaData);
            return { id: docRef.id, ...cuotaData };
        } catch (error) {
            console.error('Error agregando cuota:', error);
            throw error;
        }
    }

    async updateCuota(cuotaId, updateData) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const cuotaRef = window.firebase.doc('cuotas', cuotaId);
            await window.firebase.updateDoc(cuotaRef, updateData);
            return true;
        } catch (error) {
            console.error('Error actualizando cuota:', error);
            throw error;
        }
    }

    async getCuotasByRegistroId(registroId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) return [];
            
            const cuotasRef = window.firebase.collection('cuotas');
            const cuotasQuery = window.firebase.query(
                cuotasRef, 
                window.firebase.where('registro_id', '==', registroId),
                window.firebase.orderBy('numero')
            );
            const snapshot = await window.firebase.getDocs(cuotasQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo cuotas por registro:', error);
            return [];
        }
    }

    // Estadísticas y reportes
    async getEstadisticasMes(month) {
        try {
            const cuotas = await this.getCuotas();
            const registros = await this.getRegistros();
            
            // Filtrar cuotas del mes
            const cuotasMes = cuotas.filter(c => {
                if (!c.fecha_vencimiento) return false;
                const fechaVenc = c.fecha_vencimiento.substring(0, 7); // YYYY-MM
                return fechaVenc === month && c.numero > 0; // Excluir iniciales
            });

            const totalCuotas = cuotasMes.length;
            const cuotasPagadas = cuotasMes.filter(c => c.pagado === 1);
            const cuotasPendientes = cuotasMes.filter(c => c.pagado !== 1);
            
            // Cuotas adelantadas (pagadas este mes pero vencen después)
            const cuotasAdelantadas = cuotas.filter(c => {
                if (!c.fecha_pago || c.pagado !== 1) return false;
                const fechaPago = c.fecha_pago.substring(0, 7);
                const fechaVenc = c.fecha_vencimiento ? c.fecha_vencimiento.substring(0, 7) : '';
                return fechaPago === month && fechaVenc > month;
            });

            const stats = {
                totalCuotas,
                numPagadas: cuotasPagadas.length,
                noPagadas: cuotasPendientes.length,
                porcentajePagado: totalCuotas > 0 ? (cuotasPagadas.length / totalCuotas * 100) : 0,
                porcentajeNoPagado: totalCuotas > 0 ? (cuotasPendientes.length / totalCuotas * 100) : 0,
                montoCuotasPagadas: cuotasPagadas.reduce((sum, c) => sum + (c.monto || 0), 0),
                montoCuotasPendientes: cuotasPendientes.reduce((sum, c) => sum + (c.monto || 0), 0),
                totalProyectado: cuotasMes.reduce((sum, c) => sum + (c.monto || 0), 0),
                numAdelantadas: cuotasAdelantadas.length,
                montoAdelantadas: cuotasAdelantadas.reduce((sum, c) => sum + (c.monto || 0), 0),
                montoPagado: cuotasPagadas.reduce((sum, c) => sum + (c.monto || 0), 0) + 
                           cuotasAdelantadas.reduce((sum, c) => sum + (c.monto || 0), 0)
            };

            return stats;
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return {
                totalCuotas: 0,
                numPagadas: 0,
                noPagadas: 0,
                porcentajePagado: 0,
                porcentajeNoPagado: 0,
                montoCuotasPagadas: 0,
                montoCuotasPendientes: 0,
                totalProyectado: 0,
                numAdelantadas: 0,
                montoAdelantadas: 0,
                montoPagado: 0
            };
        }
    }

    async getPendientesMes(month) {
        try {
            const cuotas = await this.getCuotas();
            const registros = await this.getRegistros();
            
            const pendientes = cuotas.filter(c => {
                if (c.pagado === 1) return false;
                if (!c.fecha_vencimiento) return false;
                const fechaVenc = c.fecha_vencimiento.substring(0, 7);
                return fechaVenc === month;
            });

            // Agregar información del registro
            return pendientes.map(p => {
                const registro = registros.find(r => r.id === p.registro_id);
                return { ...p, registro };
            }).filter(p => p.registro); // Solo incluir los que tienen registro válido
        } catch (error) {
            console.error('Error obteniendo pendientes:', error);
            return [];
        }
    }

    async getAtrasados() {
        try {
            const cuotas = await this.getCuotas();
            const registros = await this.getRegistros();
            const hoy = new Date().toISOString().split('T')[0];
            
            // Agrupar por registro_id
            const atrasadosPorRegistro = {};
            
            cuotas.forEach(c => {
                if (c.pagado !== 1 && c.fecha_vencimiento && c.fecha_vencimiento < hoy) {
                    if (!atrasadosPorRegistro[c.registro_id]) {
                        atrasadosPorRegistro[c.registro_id] = 0;
                    }
                    atrasadosPorRegistro[c.registro_id]++;
                }
            });

            return Object.entries(atrasadosPorRegistro).map(([registroId, cuotasPendientes]) => {
                const registro = registros.find(r => r.id === registroId);
                return { registro, cuotasPendientes };
            }).filter(a => a.registro); // Solo incluir los que tienen registro válido
        } catch (error) {
            console.error('Error obteniendo atrasados:', error);
            return [];
        }
    }

    async getReporteMensual(month) {
        try {
            const registros = await this.getRegistros();
            
            // Filtrar registros del mes
            const registrosMes = registros.filter(r => {
                if (!r.fecha_registro) return false;
                const fechaReg = r.fecha_registro.substring(0, 7);
                return fechaReg === month;
            });

            const totalClientes = registrosMes.length;
            const totalCuotas = registrosMes.filter(r => r.forma_pago === 'cuotas').length;
            const totalContado = registrosMes.filter(r => r.forma_pago === 'contado').length;
            
            const inicialesCuotas = registrosMes
                .filter(r => r.forma_pago === 'cuotas')
                .reduce((sum, r) => sum + (r.inicial || 0), 0);
            
            const totalContadoMonto = registrosMes
                .filter(r => r.forma_pago === 'contado')
                .reduce((sum, r) => sum + (r.monto_total || 0), 0);
            
            const totalGeneral = inicialesCuotas + totalContadoMonto;

            return {
                registros: registrosMes,
                totalClientes,
                totalCuotas,
                totalContado,
                inicialesCuotas,
                totalContadoMonto,
                totalGeneral
            };
        } catch (error) {
            console.error('Error obteniendo reporte mensual:', error);
            return {
                registros: [],
                totalClientes: 0,
                totalCuotas: 0,
                totalContado: 0,
                inicialesCuotas: 0,
                totalContadoMonto: 0,
                totalGeneral: 0
            };
        }
    }

    // Proyecciones
    async getProjectionForMonth(month) {
        try {
            const cuotas = await this.getCuotas();
            const cuotasMes = cuotas.filter(c => {
                if (!c.fecha_vencimiento) return false;
                const fechaVenc = c.fecha_vencimiento.substring(0, 7);
                return fechaVenc === month && c.numero > 0; // Excluir iniciales
            });

            return {
                count: cuotasMes.length,
                totalProjected: cuotasMes.reduce((sum, c) => sum + (c.monto || 0), 0)
            };
        } catch (error) {
            console.error('Error obteniendo proyección:', error);
            return { count: 0, totalProjected: 0 };
        }
    }

    async getProjectionTimeline(startMonth, endMonth) {
        try {
            const cuotas = await this.getCuotas();
            const monthlyData = {};
            
            cuotas.forEach(c => {
                if (!c.fecha_vencimiento || c.numero === 0) return; // Excluir iniciales
                const month = c.fecha_vencimiento.substring(0, 7);
                if (month >= startMonth && month <= endMonth) {
                    if (!monthlyData[month]) {
                        monthlyData[month] = { count: 0, totalProjected: 0 };
                    }
                    monthlyData[month].count++;
                    monthlyData[month].totalProjected += c.monto || 0;
                }
            });

            return Object.entries(monthlyData)
                .map(([month, data]) => ({ month, ...data }))
                .sort((a, b) => a.month.localeCompare(b.month));
        } catch (error) {
            console.error('Error obteniendo timeline:', error);
            return [];
        }
    }

    async getLastCuotaMonth() {
        try {
            const cuotas = await this.getCuotas();
            const fechas = cuotas
                .filter(c => c.fecha_vencimiento && c.numero > 0)
                .map(c => c.fecha_vencimiento.substring(0, 7))
                .sort();
            
            return fechas.length > 0 ? fechas[fechas.length - 1] : null;
        } catch (error) {
            console.error('Error obteniendo última cuota:', error);
            return null;
        }
    }

    // Vouchers y Boletas
    async getVouchersByCuotaId(cuotaId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) return [];
            
            const vouchersRef = window.firebase.collection('vouchers');
            const vouchersQuery = window.firebase.query(
                vouchersRef, 
                window.firebase.where('cuota_id', '==', cuotaId)
            );
            const snapshot = await window.firebase.getDocs(vouchersQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo vouchers:', error);
            return [];
        }
    }

    async getBoletasByCuotaId(cuotaId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) return [];
            
            const boletasRef = window.firebase.collection('boletas');
            const boletasQuery = window.firebase.query(
                boletasRef, 
                window.firebase.where('cuota_id', '==', cuotaId)
            );
            const snapshot = await window.firebase.getDocs(boletasQuery);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo boletas:', error);
            return [];
        }
    }

    async addVoucher(voucherData) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const vouchersRef = window.firebase.collection('vouchers');
            const docRef = await window.firebase.addDoc(vouchersRef, voucherData);
            return { id: docRef.id, ...voucherData };
        } catch (error) {
            console.error('Error agregando voucher:', error);
            throw error;
        }
    }

    async addBoleta(boletaData) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const boletasRef = window.firebase.collection('boletas');
            const docRef = await window.firebase.addDoc(boletasRef, boletaData);
            return { id: docRef.id, ...boletaData };
        } catch (error) {
            console.error('Error agregando boleta:', error);
            throw error;
        }
    }

    async deleteVoucher(voucherId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const voucherRef = window.firebase.doc('vouchers', voucherId);
            await window.firebase.deleteDoc(voucherRef);
            return true;
        } catch (error) {
            console.error('Error eliminando voucher:', error);
            throw error;
        }
    }

    async deleteBoleta(boletaId) {
        try {
            const success = await this.init();
            if (!success || !this.initialized) throw new Error('Base de datos no inicializada');
            
            const boletaRef = window.firebase.doc('boletas', boletaId);
            await window.firebase.deleteDoc(boletaRef);
            return true;
        } catch (error) {
            console.error('Error eliminando boleta:', error);
            throw error;
        }
    }
}

// Inicializar la base de datos cuando Firebase esté listo
async function initDatabase() {
    try {
        await waitForFirebase();
        const database = new DatabaseManager();
        const success = await database.init();
        
        if (success) {
            // Hacer disponible globalmente - ASEGURAR QUE NO SEA UNDEFINED
            window.database = database;
            
            // Esperar un poco para asegurar que esté disponible
            setTimeout(() => {
                if (window.database && typeof window.database.getRegistros === 'function') {
                    console.log('✅ DatabaseManager inicializado y disponible globalmente');
                    // Disparar evento para notificar que la base de datos está lista
                    window.dispatchEvent(new CustomEvent('databaseReady'));
                } else {
                    console.error('❌ DatabaseManager no está disponible correctamente');
                    window.database = database; // Forzar asignación
                }
            }, 100);
            
        } else {
            console.error('❌ No se pudo inicializar DatabaseManager');
            window.database = null;
        }
    } catch (error) {
        console.error('❌ Error en initDatabase:', error);
        window.database = null;
    }
}

// Inicializar inmediatamente
initDatabase();

// Exportación por defecto
export default window.database;
