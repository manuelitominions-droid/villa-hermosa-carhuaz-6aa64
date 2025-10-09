console.log('🔥 Iniciando carga de Firebase...');

// Verificar que Firebase esté cargado
if (!window.firebase) {
    console.error('❌ Firebase no está cargado. Asegúrate de incluir el script de Firebase.');
    throw new Error('Firebase no está disponible');
}

const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where, orderBy, limit } = window.firebase.firestore;
const { getStorage, ref, uploadBytes, getDownloadURL } = window.firebase.storage;

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
    app = window.firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    throw error;
}

// Inicializar servicios
const db = getFirestore(app);
const storage = getStorage(app);

console.log('✅ Firestore y Storage inicializados');

// Clase para manejar la base de datos
class DatabaseManager {
    constructor() {
        this.db = db;
        this.storage = storage;
    }

    // Registros
    async getRegistros() {
        try {
            const registrosRef = collection(this.db, 'registros');
            const snapshot = await getDocs(registrosRef);
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
            const registrosRef = collection(this.db, 'registros');
            const docRef = await addDoc(registrosRef, {
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
            const registroRef = doc(this.db, 'registros', registroId);
            await updateDoc(registroRef, updateData);
            return true;
        } catch (error) {
            console.error('Error actualizando registro:', error);
            throw error;
        }
    }

    async deleteRegistro(registroId) {
        try {
            const registroRef = doc(this.db, 'registros', registroId);
            await deleteDoc(registroRef);
            
            // También eliminar cuotas asociadas
            const cuotasRef = collection(this.db, 'cuotas');
            const cuotasQuery = query(cuotasRef, where('registro_id', '==', registroId));
            const cuotasSnapshot = await getDocs(cuotasQuery);
            
            const deletePromises = cuotasSnapshot.docs.map(cuotaDoc => 
                deleteDoc(doc(this.db, 'cuotas', cuotaDoc.id))
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
            const cuotasRef = collection(this.db, 'cuotas');
            const snapshot = await getDocs(cuotasRef);
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
            const cuotaRef = doc(this.db, 'cuotas', cuotaId);
            const cuotaDoc = await getDoc(cuotaRef);
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
            const cuotasRef = collection(this.db, 'cuotas');
            const docRef = await addDoc(cuotasRef, cuotaData);
            return { id: docRef.id, ...cuotaData };
        } catch (error) {
            console.error('Error agregando cuota:', error);
            throw error;
        }
    }

    async updateCuota(cuotaId, updateData) {
        try {
            const cuotaRef = doc(this.db, 'cuotas', cuotaId);
            await updateDoc(cuotaRef, updateData);
            return true;
        } catch (error) {
            console.error('Error actualizando cuota:', error);
            throw error;
        }
    }

    async getCuotasByRegistroId(registroId) {
        try {
            const cuotasRef = collection(this.db, 'cuotas');
            const cuotasQuery = query(cuotasRef, where('registro_id', '==', registroId), orderBy('numero'));
            const snapshot = await getDocs(cuotasQuery);
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
            const vouchersRef = collection(this.db, 'vouchers');
            const vouchersQuery = query(vouchersRef, where('cuota_id', '==', cuotaId));
            const snapshot = await getDocs(vouchersQuery);
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
            const boletasRef = collection(this.db, 'boletas');
            const boletasQuery = query(boletasRef, where('cuota_id', '==', cuotaId));
            const snapshot = await getDocs(boletasQuery);
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
            const vouchersRef = collection(this.db, 'vouchers');
            const docRef = await addDoc(vouchersRef, voucherData);
            return { id: docRef.id, ...voucherData };
        } catch (error) {
            console.error('Error agregando voucher:', error);
            throw error;
        }
    }

    async addBoleta(boletaData) {
        try {
            const boletasRef = collection(this.db, 'boletas');
            const docRef = await addDoc(boletasRef, boletaData);
            return { id: docRef.id, ...boletaData };
        } catch (error) {
            console.error('Error agregando boleta:', error);
            throw error;
        }
    }

    async deleteVoucher(voucherId) {
        try {
            const voucherRef = doc(this.db, 'vouchers', voucherId);
            await deleteDoc(voucherRef);
            return true;
        } catch (error) {
            console.error('Error eliminando voucher:', error);
            throw error;
        }
    }

    async deleteBoleta(boletaId) {
        try {
            const boletaRef = doc(this.db, 'boletas', boletaId);
            await deleteDoc(boletaRef);
            return true;
        } catch (error) {
            console.error('Error eliminando boleta:', error);
            throw error;
        }
    }
}

// Crear instancia global de la base de datos
const database = new DatabaseManager();

// Hacer disponible globalmente
window.database = database;

console.log('✅ DatabaseManager inicializado y disponible globalmente');

// Exportación por defecto
export default database;
