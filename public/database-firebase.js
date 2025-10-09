// database-firebase.js - Manejo de base de datos con Firebase

console.log('🔥 Iniciando carga de Firebase...');

// Verificar que Firebase esté disponible
if (typeof window.firebase === 'undefined') {
    console.error('❌ Firebase no está cargado. Asegúrate de incluir el script de Firebase.');
    // En lugar de lanzar error, crear un objeto mock para evitar que se rompa la app
    window.firebase = {
        getFirestore: () => null,
        collection: () => null,
        doc: () => null,
        addDoc: () => Promise.reject(new Error('Firebase no disponible')),
        updateDoc: () => Promise.reject(new Error('Firebase no disponible')),
        deleteDoc: () => Promise.reject(new Error('Firebase no disponible')),
        getDocs: () => Promise.reject(new Error('Firebase no disponible')),
        getDoc: () => Promise.reject(new Error('Firebase no disponible')),
        query: () => null,
        where: () => null,
        orderBy: () => null,
        limit: () => null
    };
}

// Importar Firebase desde el contexto global
const { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc, 
    query, 
    where, 
    orderBy, 
    limit 
} = window.firebase;

// Obtener instancia de Firestore
let db = null;
try {
    db = getFirestore();
    console.log('🔥 Firebase Database inicializada correctamente');
} catch (error) {
    console.error('❌ Error inicializando Firestore:', error);
    db = null;
}

// Clase Database para manejar todas las operaciones
class DatabaseManager {
    constructor() {
        this.db = db;
        this.storage = null; // Para compatibilidad
    }

    // Registros
    async getRegistros() {
        try {
            if (!this.db) {
                console.warn('Base de datos no disponible');
                return [];
            }
            const querySnapshot = await getDocs(collection(this.db, 'villa_registros'));
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo registros:', error);
            return [];
        }
    }

    async addRegistro(registroData) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            registroData.fecha_registro = registroData.fecha_registro || new Date().toISOString().split('T')[0];
            const docRef = await addDoc(collection(this.db, 'villa_registros'), registroData);
            return { id: docRef.id, firebaseId: docRef.id, ...registroData };
        } catch (error) {
            console.error('Error agregando registro:', error);
            throw error;
        }
    }

    async updateRegistro(registroId, updateData) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            const docRef = doc(this.db, 'villa_registros', registroId);
            await updateDoc(docRef, updateData);
            return true;
        } catch (error) {
            console.error('Error actualizando registro:', error);
            throw error;
        }
    }

    async deleteRegistro(registroId) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            // Eliminar registro
            await deleteDoc(doc(this.db, 'villa_registros', registroId));
            
            // Eliminar cuotas asociadas
            const cuotasQuery = query(collection(this.db, 'villa_cuotas'), where('registro_id', '==', registroId));
            const cuotasSnapshot = await getDocs(cuotasQuery);
            const deletePromises = cuotasSnapshot.docs.map(cuotaDoc => deleteDoc(cuotaDoc.ref));
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

            // Filtrar por manzana y lote si se proporcionan
            if (manzana && lote) {
                results = results.filter(r => 
                    r.manzana && r.lote &&
                    r.manzana.toString().toLowerCase() === manzana.toLowerCase() &&
                    r.lote.toString().toLowerCase() === lote.toLowerCase()
                );
            }

            // Filtrar por query (DNI o nombre) si se proporciona
            if (query) {
                const queryLower = query.toLowerCase();
                results = results.filter(r =>
                    (r.nombre1 && r.nombre1.toLowerCase().includes(queryLower)) ||
                    (r.nombre2 && r.nombre2.toLowerCase().includes(queryLower)) ||
                    (r.dni1 && r.dni1.includes(query)) ||
                    (r.dni2 && r.dni2.includes(query))
                );
            }

            return { results, error: null };
        } catch (error) {
            console.error('Error en búsqueda:', error);
            return { results: [], error: 'Error en la búsqueda' };
        }
    }

    // Cuotas
    async getCuotas() {
        try {
            if (!this.db) return [];
            const querySnapshot = await getDocs(collection(this.db, 'villa_cuotas'));
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo cuotas:', error);
            return [];
        }
    }

    async getCuotaById(cuotaId) {
        try {
            if (!this.db) return null;
            const docRef = doc(this.db, 'villa_cuotas', cuotaId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, firebaseId: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo cuota por ID:', error);
            return null;
        }
    }

    async addCuota(cuotaData) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            const docRef = await addDoc(collection(this.db, 'villa_cuotas'), cuotaData);
            return { id: docRef.id, firebaseId: docRef.id, ...cuotaData };
        } catch (error) {
            console.error('Error agregando cuota:', error);
            throw error;
        }
    }

    async updateCuota(cuotaId, updateData) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            const docRef = doc(this.db, 'villa_cuotas', cuotaId);
            await updateDoc(docRef, updateData);
            return true;
        } catch (error) {
            console.error('Error actualizando cuota:', error);
            throw error;
        }
    }

    async getCuotasByRegistroId(registroId) {
        try {
            if (!this.db) return [];
            const cuotasQuery = query(collection(this.db, 'villa_cuotas'), where('registro_id', '==', registroId));
            const querySnapshot = await getDocs(cuotasQuery);
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo cuotas por registro ID:', error);
            return [];
        }
    }

    // Vouchers
    async getVouchers() {
        try {
            if (!this.db) return [];
            const querySnapshot = await getDocs(collection(this.db, 'villa_vouchers'));
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo vouchers:', error);
            return [];
        }
    }

    async addVoucher(voucherData) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            const docRef = await addDoc(collection(this.db, 'villa_vouchers'), voucherData);
            return { id: docRef.id, firebaseId: docRef.id, ...voucherData };
        } catch (error) {
            console.error('Error agregando voucher:', error);
            throw error;
        }
    }

    async deleteVoucher(voucherId) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            await deleteDoc(doc(this.db, 'villa_vouchers', voucherId));
            return true;
        } catch (error) {
            console.error('Error eliminando voucher:', error);
            throw error;
        }
    }

    async getVouchersByCuotaId(cuotaId) {
        try {
            if (!this.db) return [];
            const vouchersQuery = query(collection(this.db, 'villa_vouchers'), where('cuota_id', '==', cuotaId));
            const querySnapshot = await getDocs(vouchersQuery);
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo vouchers por cuota ID:', error);
            return [];
        }
    }

    // Boletas
    async getBoletas() {
        try {
            if (!this.db) return [];
            const querySnapshot = await getDocs(collection(this.db, 'villa_boletas'));
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo boletas:', error);
            return [];
        }
    }

    async addBoleta(boletaData) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            const docRef = await addDoc(collection(this.db, 'villa_boletas'), boletaData);
            return { id: docRef.id, firebaseId: docRef.id, ...boletaData };
        } catch (error) {
            console.error('Error agregando boleta:', error);
            throw error;
        }
    }

    async deleteBoleta(boletaId) {
        try {
            if (!this.db) throw new Error('Base de datos no disponible');
            await deleteDoc(doc(this.db, 'villa_boletas', boletaId));
            return true;
        } catch (error) {
            console.error('Error eliminando boleta:', error);
            throw error;
        }
    }

    async getBoletasByCuotaId(cuotaId) {
        try {
            if (!this.db) return [];
            const boletasQuery = query(collection(this.db, 'villa_boletas'), where('cuota_id', '==', cuotaId));
            const querySnapshot = await getDocs(boletasQuery);
            return querySnapshot.docs.map(doc => ({ id: doc.id, firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo boletas por cuota ID:', error);
            return [];
        }
    }

    // Funciones de análisis y reportes
    async getEstadisticasMes(mesStr) {
        const cuotas = await this.getCuotas();
        const registros = await this.getRegistros();
        
        // Cuotas que vencen este mes (número > 0)
        const cuotasMes = cuotas.filter(c => {
            const fechaVenc = c.fecha_vencimiento;
            return fechaVenc && fechaVenc.substring(0, 7) === mesStr && c.numero > 0;
        });

        // Cuotas pagadas que vencen este mes
        const cuotasPagadasMes = cuotasMes.filter(c => c.pagado === 1);
        
        // Cuotas no pagadas que vencen este mes
        const cuotasNoPagadasMes = cuotasMes.filter(c => c.pagado === 0);

        // Cuotas adelantadas: pagadas este mes pero vencen después
        const cuotasAdelantadas = cuotas.filter(c => {
            const fechaPago = c.fecha_pago;
            const fechaVenc = c.fecha_vencimiento;
            return fechaPago && fechaPago.substring(0, 7) === mesStr && 
                   fechaVenc && fechaVenc.substring(0, 7) > mesStr && 
                   c.pagado === 1 && c.numero > 0;
        });

        const totalCuotas = cuotasMes.length;
        const numPagadas = cuotasPagadasMes.length;
        const noPagadas = cuotasNoPagadasMes.length;
        const numAdelantadas = cuotasAdelantadas.length;

        const porcentajePagado = totalCuotas > 0 ? (numPagadas / totalCuotas) * 100 : 0;
        const porcentajeNoPagado = totalCuotas > 0 ? (noPagadas / totalCuotas) * 100 : 0;

        // Calcular montos
        const montoCuotasPagadas = cuotasPagadasMes.reduce((sum, c) => sum + (c.monto || 0), 0);
        const montoCuotasPendientes = cuotasNoPagadasMes.reduce((sum, c) => sum + (c.monto || 0), 0);
        const montoAdelantadas = cuotasAdelantadas.reduce((sum, c) => sum + (c.monto || 0), 0);
        
        const totalProyectado = cuotasMes.reduce((sum, c) => sum + (c.monto || 0), 0);
        const montoPagado = montoCuotasPagadas + montoAdelantadas;

        return {
            totalCuotas,
            numPagadas,
            noPagadas,
            numAdelantadas,
            porcentajePagado,
            porcentajeNoPagado,
            montoCuotasPagadas,
            montoCuotasPendientes,
            montoAdelantadas,
            totalProyectado,
            montoPagado
        };
    }

    async getProjectionForMonth(mesStr) {
        const cuotas = await this.getCuotas();
        const registros = await this.getRegistros();
        
        // Cuotas que vencen en el mes especificado (número > 0, no pagadas)
        const cuotasDelMes = cuotas.filter(c => {
            const fechaVenc = c.fecha_vencimiento;
            return fechaVenc && fechaVenc.substring(0, 7) === mesStr && c.numero > 0 && c.pagado === 0;
        });

        let totalProjected = 0;
        let totalProjectedWithMora = 0;
        const cuotasDetail = [];

        cuotasDelMes.forEach(c => {
            const registro = registros.find(r => r.id === c.registro_id);
            if (!registro) return;

            const monto = c.monto || 0;
            const pending = c.pagado === 0;
            // Usar función global si existe, sino 0
            const mora = pending && typeof calcularMora === 'function' ? calcularMora(monto, c.fecha_vencimiento, null) : 0;

            totalProjected += monto;
            totalProjectedWithMora += monto + mora;

            cuotasDetail.push({ cuota: c, registro, monto, pending, mora });
        });

        const pendingCount = cuotasDetail.filter(d => d.pending).length;

        return {
            month: mesStr,
            count: pendingCount,
            totalProjected,
            totalProjectedWithMora,
            cuotas: cuotasDetail
        };
    }

    async getLastCuotaMonth() {
        const cuotas = await this.getCuotas();
        if (!cuotas || cuotas.length === 0) return null;
        let maxDate = null;
        cuotas.forEach(c => {
            if (c.fecha_vencimiento) {
                const d = c.fecha_vencimiento;
                if (!maxDate || d > maxDate) maxDate = d;
            }
        });
        return maxDate ? maxDate.substring(0,7) : null;
    }

    async getProjectionTimeline(startMonth, endMonth) {
        function addMonth(monthStr, n = 1) {
            const [y, m] = monthStr.split('-').map(Number);
            const date = new Date(y, m - 1 + n, 1);
            const yy = date.getFullYear();
            const mm = (date.getMonth() + 1).toString().padStart(2, '0');
            return `${yy}-${mm}`;
        }

        const timeline = [];
        if (!startMonth) return timeline;
        if (!endMonth) endMonth = startMonth;

        let cursor = startMonth;
        while (cursor <= endMonth) {
            timeline.push(await this.getProjectionForMonth(cursor));
            cursor = addMonth(cursor, 1);
            if (timeline.length > 600) break;
        }

        return timeline;
    }

    async getPendientesMes(mesStr) {
        const cuotas = await this.getCuotas();
        const registros = await this.getRegistros();
        
        const cuotasPendientes = cuotas.filter(c => {
            const fechaVenc = c.fecha_vencimiento;
            return fechaVenc && fechaVenc.substring(0, 7) === mesStr && c.numero > 0 && c.pagado === 0;
        });

        return cuotasPendientes.map(c => {
            const registro = registros.find(r => r.id === c.registro_id);
            return { ...c, registro };
        });
    }

    async getAtrasados() {
        const hoy = new Date().toISOString().split('T')[0];
        const cuotas = await this.getCuotas();
        const registros = await this.getRegistros();
        
        const cuotasAtrasadas = cuotas.filter(c => 
            c.pagado === 0 && c.numero > 0 && c.fecha_vencimiento < hoy
        );

        const atrasadosMap = {};
        cuotasAtrasadas.forEach(c => {
            if (!atrasadosMap[c.registro_id]) {
                atrasadosMap[c.registro_id] = {
                    registro: registros.find(r => r.id === c.registro_id),
                    cuotasPendientes: 0
                };
            }
            atrasadosMap[c.registro_id].cuotasPendientes++;
        });

        return Object.values(atrasadosMap)
            .filter(a => a.cuotasPendientes >= 1)
            .sort((a, b) => b.cuotasPendientes - a.cuotasPendientes);
    }

    async getReporteMensual(mesStr) {
        const registros = await this.getRegistros();
        const cuotas = await this.getCuotas();
        
        const registrosMes = registros.filter(r => 
            r.fecha_registro && r.fecha_registro.substring(0, 7) === mesStr
        );

        const cuotasPagadasMes = cuotas.filter(c => 
            c.pagado === 1 && c.fecha_pago && c.fecha_pago.substring(0, 7) === mesStr
        );

        let totalCuotas = 0;
        let inicialesCuotas = 0;
        let totalContadoMonto = 0;

        registrosMes.forEach(r => {
            if (r.forma_pago === 'cuotas') {
                totalCuotas++;
                inicialesCuotas += r.inicial || 0;
            }
        });

        cuotasPagadasMes.forEach(c => {
            const registro = registros.find(r => r.id === c.registro_id);
            if (registro && registro.forma_pago === 'contado') {
                totalContadoMonto += c.monto;
            }
        });

        const totalContado = registrosMes.filter(r => r.forma_pago === 'contado').length;

        return {
            registros: registrosMes.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro)),
            totalClientes: registrosMes.length,
            totalCuotas,
            totalContado,
            inicialesCuotas,
            totalContadoMonto,
            totalGeneral: inicialesCuotas + totalContadoMonto
        };
    }
}

// Instancia global de la base de datos
const database = new DatabaseManager();

// Hacer disponible globalmente
window.database = database;

console.log('✅ DatabaseManager inicializado y disponible globalmente');

// Exportación por defecto
export default database;
