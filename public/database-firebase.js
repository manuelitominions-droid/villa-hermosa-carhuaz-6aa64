// database-firebase.js - Integración Firebase manteniendo la misma interfaz que localStorage
import { db } from '../firebase-config.js';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  setDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class Database {
    constructor() {
        this.initializeDatabase();
    }

    async initializeDatabase() {
        try {
            // Verificar si existe el usuario por defecto
            const usuariosRef = collection(db, 'villa_usuarios');
            const usuariosSnapshot = await getDocs(usuariosRef);
            
            if (usuariosSnapshot.empty) {
                // Crear usuario por defecto
                const defaultUser = {
                    id: 1,
                    username: 'villahermosa',
                    password: 'villa8956',
                    rol: 'admin_principal'
                };
                await addDoc(usuariosRef, defaultUser);
                console.log('✅ Usuario por defecto creado');
            }

            // Inicializar configuración de mora si no existe
            const configRef = doc(db, 'villa_config', 'mora');
            const configDoc = await getDoc(configRef);
            
            if (!configDoc.exists()) {
                const defaultConfig = {
                    porcentaje_6_14: 0.01,
                    porcentaje_15_30: 0.015
                };
                await setDoc(configRef, defaultConfig);
                console.log('✅ Configuración de mora inicializada');
            }

            console.log('🔥 Firebase Database inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
        }
    }

    // Usuarios
    async getUsuarios() {
        try {
            const usuariosRef = collection(db, 'villa_usuarios');
            const snapshot = await getDocs(usuariosRef);
            return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            return [];
        }
    }

    async saveUsuarios(usuarios) {
        // Este método se mantiene por compatibilidad pero no se usa en Firebase
        console.warn('saveUsuarios no implementado en Firebase - usar addUsuario');
    }

    async getUsuarioByCredentials(username, password) {
        try {
            const usuarios = await this.getUsuarios();
            return usuarios.find(u => u.username === username && u.password === password);
        } catch (error) {
            console.error('Error verificando credenciales:', error);
            return null;
        }
    }

    async addUsuario(usuario) {
        try {
            const usuarios = await this.getUsuarios();
            usuario.id = this.getNextId(usuarios);
            const usuariosRef = collection(db, 'villa_usuarios');
            const docRef = await addDoc(usuariosRef, usuario);
            return { firebaseId: docRef.id, ...usuario };
        } catch (error) {
            console.error('Error agregando usuario:', error);
            return null;
        }
    }

    // Registros
    async getRegistros() {
        try {
            const registrosRef = collection(db, 'villa_registros');
            const q = query(registrosRef, orderBy('fecha_registro', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo registros:', error);
            return [];
        }
    }

    async saveRegistros(registros) {
        // Método de compatibilidad - no recomendado para Firebase
        console.warn('saveRegistros no recomendado en Firebase');
    }

    async addRegistro(registro) {
        try {
            const registros = await this.getRegistros();
            const newId = registros.length + 1;
            registro.id = newId;
            registro.fecha_registro = new Date().toISOString().split('T')[0];
            registro.bienvenida_enviada = 0;
            
            const registrosRef = collection(db, 'villa_registros');
            const docRef = await addDoc(registrosRef, registro);
            return { firebaseId: docRef.id, ...registro };
        } catch (error) {
            console.error('Error agregando registro:', error);
            return null;
        }
    }

    async getRegistroById(id) {
        try {
            const registros = await this.getRegistros();
            return registros.find(r => r.id === parseInt(id));
        } catch (error) {
            console.error('Error obteniendo registro por ID:', error);
            return null;
        }
    }

    async updateRegistro(id, updatedData) {
        try {
            const registros = await this.getRegistros();
            const registro = registros.find(r => r.id === parseInt(id));
            
            if (registro && registro.firebaseId) {
                const registroRef = doc(db, 'villa_registros', registro.firebaseId);
                await updateDoc(registroRef, updatedData);
                return { ...registro, ...updatedData };
            }
            return null;
        } catch (error) {
            console.error('Error actualizando registro:', error);
            return null;
        }
    }

    async deleteRegistro(id) {
        try {
            const registros = await this.getRegistros();
            const registro = registros.find(r => r.id === parseInt(id));
            
            if (registro && registro.firebaseId) {
                // Eliminar cuotas relacionadas
                const cuotas = await this.getCuotas();
                const cuotasToDelete = cuotas.filter(c => c.registro_id === parseInt(id));
                
                for (const cuota of cuotasToDelete) {
                    if (cuota.firebaseId) {
                        await deleteDoc(doc(db, 'villa_cuotas', cuota.firebaseId));
                    }
                }
                
                // Eliminar registro
                await deleteDoc(doc(db, 'villa_registros', registro.firebaseId));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error eliminando registro:', error);
            return false;
        }
    }

    // Cuotas
    async getCuotas() {
        try {
            const cuotasRef = collection(db, 'villa_cuotas');
            const snapshot = await getDocs(cuotasRef);
            return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo cuotas:', error);
            return [];
        }
    }

    async saveCuotas(cuotas) {
        console.warn('saveCuotas no recomendado en Firebase');
    }

    async addCuota(cuota) {
        try {
            const cuotas = await this.getCuotas();
            cuota.id = this.getNextId(cuotas);
            cuota.pagado = cuota.pagado || 0;
            cuota.mora = cuota.mora || 0;
            
            const cuotasRef = collection(db, 'villa_cuotas');
            const docRef = await addDoc(cuotasRef, cuota);
            return { firebaseId: docRef.id, ...cuota };
        } catch (error) {
            console.error('Error agregando cuota:', error);
            return null;
        }
    }

    async getCuotasByRegistroId(registroId) {
        try {
            const cuotas = await this.getCuotas();
            return cuotas.filter(c => c.registro_id === parseInt(registroId))
                        .sort((a, b) => a.numero - b.numero);
        } catch (error) {
            console.error('Error obteniendo cuotas por registro:', error);
            return [];
        }
    }

    async getCuotaById(id) {
        try {
            const cuotas = await this.getCuotas();
            return cuotas.find(c => c.id === parseInt(id));
        } catch (error) {
            console.error('Error obteniendo cuota por ID:', error);
            return null;
        }
    }

    async updateCuota(id, updatedData) {
        try {
            const cuotas = await this.getCuotas();
            const cuota = cuotas.find(c => c.id === parseInt(id));
            
            if (cuota && cuota.firebaseId) {
                const cuotaRef = doc(db, 'villa_cuotas', cuota.firebaseId);
                await updateDoc(cuotaRef, updatedData);
                
                // Recalcular estado del registro
                setTimeout(() => {
                    try { 
                        this.recalcRegistroEstado(cuota.registro_id); 
                    } catch(e) { 
                        console.warn('Error recalculando estado registro', e); 
                    }
                }, 0);
                
                return { ...cuota, ...updatedData };
            }
            return null;
        } catch (error) {
            console.error('Error actualizando cuota:', error);
            return null;
        }
    }

    // Vouchers
    async getVouchers() {
        try {
            const vouchersRef = collection(db, 'villa_vouchers');
            const snapshot = await getDocs(vouchersRef);
            return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo vouchers:', error);
            return [];
        }
    }

    async saveVouchers(vouchers) {
        console.warn('saveVouchers no recomendado en Firebase');
    }

    async addVoucher(voucher) {
        try {
            const vouchers = await this.getVouchers();
            voucher.id = this.getNextId(vouchers);
            
            const vouchersRef = collection(db, 'villa_vouchers');
            const docRef = await addDoc(vouchersRef, voucher);
            return { firebaseId: docRef.id, ...voucher };
        } catch (error) {
            console.error('Error agregando voucher:', error);
            return null;
        }
    }

    async getVouchersByCuotaId(cuotaId) {
        try {
            const vouchers = await this.getVouchers();
            return vouchers.filter(v => v.cuota_id === parseInt(cuotaId));
        } catch (error) {
            console.error('Error obteniendo vouchers por cuota:', error);
            return [];
        }
    }

    async deleteVoucher(id) {
        try {
            const vouchers = await this.getVouchers();
            const voucher = vouchers.find(v => v.id === parseInt(id));
            
            if (voucher && voucher.firebaseId) {
                await deleteDoc(doc(db, 'villa_vouchers', voucher.firebaseId));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error eliminando voucher:', error);
            return false;
        }
    }

    // Boletas
    async getBoletas() {
        try {
            const boletasRef = collection(db, 'villa_boletas');
            const snapshot = await getDocs(boletasRef);
            return snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error obteniendo boletas:', error);
            return [];
        }
    }

    async saveBoletas(boletas) {
        console.warn('saveBoletas no recomendado en Firebase');
    }

    async addBoleta(boleta) {
        try {
            const boletas = await this.getBoletas();
            boleta.id = this.getNextId(boletas);
            
            const boletasRef = collection(db, 'villa_boletas');
            const docRef = await addDoc(boletasRef, boleta);
            return { firebaseId: docRef.id, ...boleta };
        } catch (error) {
            console.error('Error agregando boleta:', error);
            return null;
        }
    }

    async getBoletasByCuotaId(cuotaId) {
        try {
            const boletas = await this.getBoletas();
            return boletas.filter(b => b.cuota_id === parseInt(cuotaId));
        } catch (error) {
            console.error('Error obteniendo boletas por cuota:', error);
            return [];
        }
    }

    async deleteBoleta(id) {
        try {
            const boletas = await this.getBoletas();
            const boleta = boletas.find(b => b.id === parseInt(id));
            
            if (boleta && boleta.firebaseId) {
                await deleteDoc(doc(db, 'villa_boletas', boleta.firebaseId));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error eliminando boleta:', error);
            return false;
        }
    }

    // Configuración de mora
    async getConfigMora() {
        try {
            const configRef = doc(db, 'villa_config', 'mora');
            const configDoc = await getDoc(configRef);
            
            if (configDoc.exists()) {
                return configDoc.data();
            }
            
            return {
                porcentaje_6_14: 0.01,
                porcentaje_15_30: 0.015
            };
        } catch (error) {
            console.error('Error obteniendo configuración de mora:', error);
            return {
                porcentaje_6_14: 0.01,
                porcentaje_15_30: 0.015
            };
        }
    }

    async saveConfigMora(config) {
        try {
            const configRef = doc(db, 'villa_config', 'mora');
            await setDoc(configRef, config);
        } catch (error) {
            console.error('Error guardando configuración de mora:', error);
        }
    }

    // Métodos de utilidad que se mantienen igual
    getNextId(array) {
        if (!array || array.length === 0) return 1;
        return array.length + 1;
    }

    // Métodos de cálculo que se mantienen iguales (sin async)
    async getSaldoPendienteByRegistro(registroId) {
        const cuotas = (await this.getCuotas()).filter(c => c.registro_id === parseInt(registroId) && c.numero > 0);
        let pendingAmount = 0;
        let pendingCount = 0;

        cuotas.forEach(c => {
            if (!c.pagado || parseInt(c.pagado) === 0) {
                const mora = c.numero > 0 ? calcularMora(c.monto, c.fecha_vencimiento, c.fecha_pago) : 0;
                pendingAmount += (c.monto || 0) + (mora || 0);
                pendingCount += 1;
            }
        });

        return { pendingAmount, pendingCount };
    }

    async recalcRegistroEstado(registroId) {
        try {
            const saldo = await this.getSaldoPendienteByRegistro(registroId);
            const updatedData = {
                saldo_pendiente: saldo.pendingAmount,
                cuotas_pendientes: saldo.pendingCount,
                estado_pago: saldo.pendingAmount > 0 ? 'deuda' : 'al_dia'
            };
            
            return await this.updateRegistro(registroId, updatedData);
        } catch (error) {
            console.error('Error recalculando estado registro:', error);
            return null;
        }
    }

    // Búsquedas (se mantienen iguales pero con async)
    async searchRegistros(criteria) {
        const registros = await this.getRegistros();
        let results = registros;

        if (criteria.manzana && criteria.lote) {
            const manzanaQ = criteria.manzana.trim().toUpperCase();
            const loteQ = criteria.lote.trim().toUpperCase();
            results = results.filter(r => 
                (r.manzana || '').toString().trim().toUpperCase() === manzanaQ &&
                (r.lote || '').toString().trim().toUpperCase() === loteQ
            );

            if (criteria.query) {
                const q = criteria.query.trim().toUpperCase();
                results = results.filter(r =>
                    (r.nombre1 || '').toString().toUpperCase().includes(q) ||
                    (r.nombre2 || '').toString().toUpperCase().includes(q) ||
                    (r.dni1 || '').toString().toUpperCase().includes(q) ||
                    (r.dni2 || '').toString().toUpperCase().includes(q)
                );
            }
        } else if (criteria.query && !criteria.manzana && !criteria.lote) {
            const q = criteria.query.trim().toUpperCase();
            results = results.filter(r =>
                (r.nombre1 || '').toString().toUpperCase().includes(q) ||
                (r.nombre2 || '').toString().toUpperCase().includes(q) ||
                (r.dni1 || '').toString().toUpperCase().includes(q) ||
                (r.dni2 || '').toString().toUpperCase().includes(q)
            );
        } else {
            return { results: [], error: "Para buscar por ubicación, debe ingresar tanto la Manzana como el Lote" };
        }

        return { results: results.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro)), error: null };
    }

    // Estadísticas (se mantienen iguales pero con async)
    async getEstadisticasMes(mesStr) {
        const cuotas = await this.getCuotas();
        const registros = await this.getRegistros();
        
        const cuotasVencenEsteMes = cuotas.filter(c => {
            const fechaVenc = c.fecha_vencimiento;
            return fechaVenc.substring(0, 7) === mesStr && c.numero > 0;
        });
        
        const cuotasAdelantadas = cuotas.filter(c => {
            const fechaPago = c.fecha_pago;
            const fechaVenc = c.fecha_vencimiento;
            return c.pagado === 1 && 
                   fechaPago && fechaPago.substring(0, 7) === mesStr && 
                   fechaVenc.substring(0, 7) !== mesStr && 
                   c.numero > 0;
        });
        
        const cuotasPagadasDelMes = cuotasVencenEsteMes.filter(c => c.pagado === 1);
        const cuotasPendientesDelMes = cuotasVencenEsteMes.filter(c => c.pagado === 0);
        
        const montoProyectado = cuotasVencenEsteMes.reduce((sum, c) => sum + c.monto, 0);
        const montoPagadoDelMes = cuotasPagadasDelMes.reduce((sum, c) => sum + c.monto, 0);
        const montoAdelantado = cuotasAdelantadas.reduce((sum, c) => sum + c.monto, 0);
        const montoIngresado = montoPagadoDelMes + montoAdelantado;
        const montoCuotasPagadas = cuotasPagadasDelMes.reduce((sum, c) => sum + c.monto, 0);
        const montoCuotasPendientes = cuotasPendientesDelMes.reduce((sum, c) => sum + c.monto, 0);

        const totalCuotas = cuotasVencenEsteMes.length;
        const numPagadas = cuotasPagadasDelMes.length;
        const numPendientes = cuotasPendientesDelMes.length;
        const numAdelantadas = cuotasAdelantadas.length;

        return {
            totalCuotas: totalCuotas,
            numPagadas: numPagadas,
            noPagadas: numPendientes,
            numAdelantadas: numAdelantadas,
            totalProyectado: montoProyectado,
            montoPagado: montoIngresado,
            montoCuotasPagadas: montoCuotasPagadas,
            montoCuotasPendientes: montoCuotasPendientes,
            montoAdelantadas: montoAdelantado,
            porcentajePagado: totalCuotas > 0 ? (numPagadas / totalCuotas * 100) : 0,
            porcentajeNoPagado: totalCuotas > 0 ? (numPendientes / totalCuotas * 100) : 0,
            cuotasVencenEsteMes: cuotasVencenEsteMes,
            cuotasAdelantadas: cuotasAdelantadas,
            cuotasPagadasDelMes: cuotasPagadasDelMes,
            cuotasPendientesDelMes: cuotasPendientesDelMes
        };
    }

    async getProjectionForMonth(mesStr) {
        const cuotas = await this.getCuotas();
        const registros = await this.getRegistros();

        const cuotasEnMes = cuotas.filter(c => c.fecha_vencimiento && c.fecha_vencimiento.substring(0,7) === mesStr && c.numero > 0);

        let totalProjected = 0;
        let totalProjectedWithMora = 0;
        const cuotasDetail = [];

        cuotasEnMes.forEach(c => {
            const registro = registros.find(r => r.id === c.registro_id) || null;
            const mora = c.numero > 0 ? calcularMora(c.monto, c.fecha_vencimiento, c.fecha_pago) : 0;
            const pending = !c.pagado || parseInt(c.pagado) === 0;
            if (pending) {
                totalProjected += (c.monto || 0);
                totalProjectedWithMora += (c.monto || 0) + (mora || 0);
            }
            cuotasDetail.push({ cuota: c, registro, pending, mora });
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
            return fechaVenc.substring(0, 7) === mesStr && c.numero > 0 && c.pagado === 0;
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
            r.fecha_registro.substring(0, 7) === mesStr
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

    async cleanupOrphans(options = { dryRun: true, delete: false, backupKey: null }) {
        const opts = { dryRun: true, delete: false, backupKey: null, ...(options || {}) };

        const cuotas = await this.getCuotas();
        const cuotasIds = cuotas.map(c => parseInt(c.id));

        const vouchers = await this.getVouchers();
        const boletas = await this.getBoletas();

        const orphanVouchers = vouchers.filter(v => !cuotasIds.includes(parseInt(v.cuota_id)));
        const orphanBoletas = boletas.filter(b => !cuotasIds.includes(parseInt(b.cuota_id)));

        const report = {
            orphanVouchers: orphanVouchers.map(v => ({ id: v.id, file_name: v.file_name, cuota_id: v.cuota_id })),
            orphanBoletas: orphanBoletas.map(b => ({ id: b.id, file_name: b.file_name, cuota_id: b.cuota_id })),
            deleted: { vouchers: 0, boletas: 0 }
        };

        if (opts.delete && !opts.dryRun) {
            if (opts.backupKey) {
                try {
                    const backup = { vouchers: orphanVouchers, boletas: orphanBoletas, timestamp: new Date().toISOString() };
                    localStorage.setItem(opts.backupKey, JSON.stringify(backup));
                } catch (err) {
                    console.warn('No se pudo crear backup en localStorage:', err);
                }
            }

            // Borrar vouchers huérfanos
            for (const voucher of orphanVouchers) {
                if (voucher.firebaseId) {
                    await deleteDoc(doc(db, 'villa_vouchers', voucher.firebaseId));
                    report.deleted.vouchers++;
                }
            }

            // Borrar boletas huérfanas
            for (const boleta of orphanBoletas) {
                if (boleta.firebaseId) {
                    await deleteDoc(doc(db, 'villa_boletas', boleta.firebaseId));
                    report.deleted.boletas++;
                }
            }
        }

        return report;
    }

    // Métodos de IndexedDB se mantienen para compatibilidad local
    openFilesDB() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB no disponible'));
            const req = indexedDB.open('villa_files', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    idbPut(key, blob) {
        return this.openFilesDB().then(db => new Promise((resolve, reject) => {
            try {
                const tx = db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                const r = store.put(blob, key);
                r.onsuccess = () => resolve(true);
                r.onerror = () => reject(r.error);
                tx.oncomplete = () => db.close();
            } catch (err) {
                reject(err);
            }
        }));
    }

    idbGet(key) {
        return this.openFilesDB().then(db => new Promise((resolve, reject) => {
            try {
                const tx = db.transaction('files', 'readonly');
                const store = tx.objectStore('files');
                const r = store.get(key);
                r.onsuccess = () => resolve(r.result || null);
                r.onerror = () => reject(r.error);
                tx.oncomplete = () => db.close();
            } catch (err) {
                reject(err);
            }
        }));
    }

    idbDelete(key) {
        return this.openFilesDB().then(db => new Promise((resolve, reject) => {
            try {
                const tx = db.transaction('files', 'readwrite');
                const store = tx.objectStore('files');
                const r = store.delete(key);
                r.onsuccess = () => resolve(true);
                r.onerror = () => reject(r.error);
                tx.oncomplete = () => db.close();
            } catch (err) {
                reject(err);
            }
        }));
    }
}

// Instancia global de la base de datos
const database = new Database();
window.database = database;

// Exponer utilidades globales
if (typeof window.cleanupOrphans === 'undefined') {
    window.cleanupOrphans = function(opts) { return db.cleanupOrphans(opts); };
}
if (typeof window.recalcRegistroEstado === 'undefined') {
    window.recalcRegistroEstado = function(registroId) { return db.recalcRegistroEstado(registroId); };

}
