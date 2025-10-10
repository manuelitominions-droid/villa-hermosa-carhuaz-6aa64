// database-firebase.js — versión completa con métodos faltantes y ID numérico

import { db, storage } from '../firebase-config.js';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

console.log('🔥 Iniciando DatabaseManager con Firestore modular...');

class DatabaseManager {
  constructor() {
    this.db = db;
    this.storage = storage;
    this._registrosCache = null;
    this._cuotasCache = null;
  }

  // ----------- SISTEMA DE ID NUMÉRICO -----------
  async getNextNumericId() {
    try {
      const registros = await this.getRegistros();
      if (registros.length === 0) return 1;
      
      // Buscar el ID numérico más alto
      const maxId = registros.reduce((max, r) => {
        const numId = r.numeric_id || 0;
        return numId > max ? numId : max;
      }, 0);
      
      return maxId + 1;
    } catch (error) {
      console.error('❌ Error obteniendo siguiente ID:', error);
      return 1;
    }
  }

  // ----------- REGISTROS -----------
  async getRegistros() {
    try {
      if (this._registrosCache) return this._registrosCache;
      
      const registrosRef = collection(this.db, 'registros');
      const snapshot = await getDocs(registrosRef);
      const registros = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        firebase_id: doc.id,
        ...doc.data() 
      }));
      
      // Ordenar por numeric_id si existe, sino por fecha_registro
      registros.sort((a, b) => {
        if (a.numeric_id && b.numeric_id) {
          return b.numeric_id - a.numeric_id; // Descendente
        }
        return new Date(b.fecha_registro || 0) - new Date(a.fecha_registro || 0);
      });
      
      this._registrosCache = registros;
      return registros;
    } catch (error) {
      console.error('❌ Error obteniendo registros:', error);
      return [];
    }
  }

  getRegistroById(registroId) {
    if (!this._registrosCache) return null;
    return this._registrosCache.find(r => r.id === registroId || r.firebase_id === registroId);
  }

  async addRegistro(data) {
    try {
      const numericId = await this.getNextNumericId();
      const registroData = {
        ...data,
        numeric_id: numericId,
        fecha_registro: new Date().toISOString().split('T')[0],
      };
      
      const registrosRef = collection(this.db, 'registros');
      const docRef = await addDoc(registrosRef, registroData);
      
      const nuevoRegistro = { 
        id: docRef.id, 
        firebase_id: docRef.id,
        ...registroData 
      };
      
      // Actualizar cache
      this._registrosCache = null;
      
      return nuevoRegistro;
    } catch (error) {
      console.error('❌ Error agregando registro:', error);
      throw error;
    }
  }

  async updateRegistro(id, updateData) {
    try {
      const ref = doc(this.db, 'registros', id);
      await updateDoc(ref, updateData);
      
      // Limpiar cache
      this._registrosCache = null;
      this._cuotasCache = null;
      
      return true;
    } catch (error) {
      console.error('❌ Error actualizando registro:', error);
      throw error;
    }
  }

  async deleteRegistro(id) {
    try {
      await deleteDoc(doc(this.db, 'registros', id));

      const cuotasRef = collection(this.db, 'cuotas');
      const cuotasQuery = query(cuotasRef, where('registro_id', '==', id));
      const snapshot = await getDocs(cuotasQuery);

      const deletePromises = snapshot.docs.map(docSnap =>
        deleteDoc(doc(this.db, 'cuotas', docSnap.id))
      );

      await Promise.all(deletePromises);
      
      // Limpiar cache
      this._registrosCache = null;
      this._cuotasCache = null;
      
      console.log(`🗑️ Registro y sus cuotas eliminadas: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando registro:', error);
      throw error;
    }
  }

  async searchRegistros({ manzana, lote, query: term }) {
    try {
      const registros = await this.getRegistros();
      let results = registros;

      if (manzana && lote) {
        results = results.filter(r =>
          r.manzana?.toLowerCase().includes(manzana.toLowerCase()) &&
          r.lote?.toLowerCase().includes(lote.toLowerCase())
        );
      }

      if (term) {
        results = results.filter(r =>
          r.nombre1?.toLowerCase().includes(term.toLowerCase()) ||
          r.nombre2?.toLowerCase().includes(term.toLowerCase()) ||
          r.dni1?.includes(term) ||
          r.dni2?.includes(term)
        );
      }

      return { results, error: null };
    } catch (error) {
      console.error('❌ Error buscando registros:', error);
      return { results: [], error: error.message };
    }
  }

  // ----------- CUOTAS -----------
  async getCuotas() {
    try {
      if (this._cuotasCache) return this._cuotasCache;
      
      const cuotasRef = collection(this.db, 'cuotas');
      const snapshot = await getDocs(cuotasRef);
      const cuotas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      this._cuotasCache = cuotas;
      return cuotas;
    } catch (error) {
      console.error('❌ Error obteniendo cuotas:', error);
      return [];
    }
  }

  async getCuotaById(cuotaId) {
    try {
      const cuotaRef = doc(this.db, 'cuotas', cuotaId);
      const cuotaDoc = await getDoc(cuotaRef);
      return cuotaDoc.exists() ? { id: cuotaDoc.id, ...cuotaDoc.data() } : null;
    } catch (error) {
      console.error('❌ Error obteniendo cuota:', error);
      return null;
    }
  }

  async addCuota(data) {
    try {
      const cuotasRef = collection(this.db, 'cuotas');
      const docRef = await addDoc(cuotasRef, data);
      
      // Limpiar cache
      this._cuotasCache = null;
      
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('❌ Error agregando cuota:', error);
      throw error;
    }
  }

  async updateCuota(id, updateData) {
    try {
      const ref = doc(this.db, 'cuotas', id);
      await updateDoc(ref, updateData);
      
      // Limpiar cache
      this._cuotasCache = null;
      
      return true;
    } catch (error) {
      console.error('❌ Error actualizando cuota:', error);
      throw error;
    }
  }

  async getCuotasByRegistroId(registroId) {
    try {
      const cuotas = await this.getCuotas();
      return cuotas
        .filter(c => c.registro_id === registroId)
        .sort((a, b) => (a.numero || 0) - (b.numero || 0));
    } catch (error) {
      console.error('❌ Error obteniendo cuotas por registro:', error);
      return [];
    }
  }

  // ----------- ESTADO DE PAGOS -----------
  getSaldoPendienteByRegistro(registroId) {
    try {
      if (!this._cuotasCache) return { pendingCount: 0, pendingAmount: 0 };
      
      const cuotas = this._cuotasCache.filter(c => c.registro_id === registroId && c.numero > 0);
      const cuotasPendientes = cuotas.filter(c => !c.pagado || c.pagado !== 1);
      
      const pendingCount = cuotasPendientes.length;
      const pendingAmount = cuotasPendientes.reduce((sum, c) => sum + (c.monto || 0), 0);
      
      return { pendingCount, pendingAmount };
    } catch (error) {
      console.error('❌ Error calculando saldo pendiente:', error);
      return { pendingCount: 0, pendingAmount: 0 };
    }
  }

  // ----------- PROYECCIONES -----------  
  async getProjectionForMonth(month) {
    try {
      const cuotas = await this.getCuotas();
      const registros = await this.getRegistros();
      
      const cuotasMes = cuotas.filter(c => 
        c.fecha_vencimiento?.substring(0, 7) === month && c.numero > 0
      );
      
      const totalProjected = cuotasMes.reduce((sum, c) => sum + (c.monto || 0), 0);
      const count = cuotasMes.length;
      
      return { totalProjected, count, cuotas: cuotasMes };
    } catch (error) {
      console.error('❌ Error obteniendo proyección para el mes:', error);
      return { totalProjected: 0, count: 0, cuotas: [] };
    }
  }

  async getProjectionTimeline(startMonth, endMonth) {
    try {
      const cuotas = await this.getCuotas();
      const timeline = {};
      
      cuotas
        .filter(c => c.fecha_vencimiento && c.numero > 0)
        .forEach(c => {
          const month = c.fecha_vencimiento.substring(0, 7);
          if (month >= startMonth && month <= endMonth) {
            if (!timeline[month]) {
              timeline[month] = { month, count: 0, totalProjected: 0 };
            }
            timeline[month].count++;
            timeline[month].totalProjected += c.monto || 0;
          }
        });
      
      return Object.values(timeline).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('❌ Error obteniendo timeline de proyección:', error);
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
      return fechas.length ? fechas[fechas.length - 1] : null;
    } catch (error) {
      console.error('❌ Error obteniendo última cuota:', error);
      return null;
    }
  }

  // ----------- ESTADÍSTICAS Y REPORTES -----------
  async getEstadisticasMes(month) {
    try {
      const cuotas = await this.getCuotas();
      const cuotasMes = cuotas.filter(c => c.fecha_vencimiento?.substring(0, 7) === month && c.numero > 0);
      const cuotasPagadas = cuotasMes.filter(c => c.pagado === 1);
      const cuotasPendientes = cuotasMes.filter(c => c.pagado !== 1);

      const cuotasAdelantadas = cuotas.filter(c => {
        if (!c.fecha_pago || c.pagado !== 1) return false;
        const fechaPago = c.fecha_pago.substring(0, 7);
        const fechaVenc = c.fecha_vencimiento ? c.fecha_vencimiento.substring(0, 7) : '';
        return fechaPago === month && fechaVenc > month;
      });

      return {
        totalCuotas: cuotasMes.length,
        numPagadas: cuotasPagadas.length,
        noPagadas: cuotasPendientes.length,
        porcentajePagado: cuotasMes.length ? (cuotasPagadas.length / cuotasMes.length) * 100 : 0,
        porcentajeNoPagado: cuotasMes.length ? (cuotasPendientes.length / cuotasMes.length) * 100 : 0,
        montoCuotasPagadas: cuotasPagadas.reduce((sum, c) => sum + (c.monto || 0), 0),
        montoCuotasPendientes: cuotasPendientes.reduce((sum, c) => sum + (c.monto || 0), 0),
        totalProyectado: cuotasMes.reduce((sum, c) => sum + (c.monto || 0), 0),
        numAdelantadas: cuotasAdelantadas.length,
        montoAdelantadas: cuotasAdelantadas.reduce((sum, c) => sum + (c.monto || 0), 0),
        montoPagado: cuotasPagadas.reduce((sum, c) => sum + (c.monto || 0), 0) +
                     cuotasAdelantadas.reduce((sum, c) => sum + (c.monto || 0), 0)
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        totalCuotas: 0, numPagadas: 0, noPagadas: 0,
        porcentajePagado: 0, porcentajeNoPagado: 0,
        montoCuotasPagadas: 0, montoCuotasPendientes: 0,
        totalProyectado: 0, numAdelantadas: 0, montoAdelantadas: 0, montoPagado: 0
      };
    }
  }

  async getReporteMensual(month) {
    try {
      const registros = await this.getRegistros();
      const registrosMes = registros.filter(r => r.fecha_registro?.substring(0, 7) === month);
      const totalClientes = registrosMes.length;
      const totalCuotas = registrosMes.filter(r => r.forma_pago === 'cuotas').length;
      const totalContado = registrosMes.filter(r => r.forma_pago === 'contado').length;
      const inicialesCuotas = registrosMes.filter(r => r.forma_pago === 'cuotas').reduce((sum, r) => sum + (r.inicial || 0), 0);
      const totalContadoMonto = registrosMes.filter(r => r.forma_pago === 'contado').reduce((sum, r) => sum + (r.monto_total || 0), 0);
      const totalGeneral = inicialesCuotas + totalContadoMonto;

      return { registros: registrosMes, totalClientes, totalCuotas, totalContado, inicialesCuotas, totalContadoMonto, totalGeneral };
    } catch (error) {
      console.error('❌ Error obteniendo reporte mensual:', error);
      return { registros: [], totalClientes: 0, totalCuotas: 0, totalContado: 0, inicialesCuotas: 0, totalContadoMonto: 0, totalGeneral: 0 };
    }
  }

  async getPendientesMes(month) {
    try {
      const cuotas = await this.getCuotas();
      const registros = await this.getRegistros();
      const pendientes = cuotas.filter(c => c.pagado !== 1 && c.fecha_vencimiento?.substring(0, 7) === month);

      return pendientes.map(p => {
        const registro = registros.find(r => r.id === p.registro_id);
        return { ...p, registro };
      }).filter(p => p.registro);
    } catch (error) {
      console.error('❌ Error obteniendo pendientes:', error);
      return [];
    }
  }

  async getAtrasados() {
    try {
      const cuotas = await this.getCuotas();
      const registros = await this.getRegistros();
      const hoy = new Date().toISOString().split('T')[0];
      const atrasadosPorRegistro = {};

      cuotas.forEach(c => {
        if (c.pagado !== 1 && c.fecha_vencimiento && c.fecha_vencimiento < hoy) {
          atrasadosPorRegistro[c.registro_id] = (atrasadosPorRegistro[c.registro_id] || 0) + 1;
        }
      });

      return Object.entries(atrasadosPorRegistro).map(([registroId, cuotasPendientes]) => {
        const registro = registros.find(r => r.id === registroId);
        return { registro, cuotasPendientes };
      }).filter(a => a.registro);
    } catch (error) {
      console.error('❌ Error obteniendo atrasados:', error);
      return [];
    }
  }

  // ----------- VOUCHERS Y BOLETAS -----------
  async getVouchersByCuotaId(cuotaId) {
    try {
      const vouchersRef = collection(this.db, 'vouchers');
      const q = query(vouchersRef, where('cuota_id', '==', cuotaId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error obteniendo vouchers:', error);
      return [];
    }
  }

  async getBoletasByCuotaId(cuotaId) {
    try {
      const boletasRef = collection(this.db, 'boletas');
      const q = query(boletasRef, where('cuota_id', '==', cuotaId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error obteniendo boletas:', error);
      return [];
    }
  }

  async addVoucher(voucherData) {
    try {
      const vouchersRef = collection(this.db, 'vouchers');
      const docRef = await addDoc(vouchersRef, voucherData);
      return { id: docRef.id, ...voucherData };
    } catch (error) {
      console.error('❌ Error agregando voucher:', error);
      throw error;
    }
  }

  async addBoleta(boletaData) {
    try {
      const boletasRef = collection(this.db, 'boletas');
      const docRef = await addDoc(boletasRef, boletaData);
      return { id: docRef.id, ...boletaData };
    } catch (error) {
      console.error('❌ Error agregando boleta:', error);
      throw error;
    }
  }

  async deleteVoucher(voucherId) {
    try {
      await deleteDoc(doc(this.db, 'vouchers', voucherId));
      return true;
    } catch (error) {
      console.error('❌ Error eliminando voucher:', error);
      throw error;
    }
  }

  async deleteBoleta(boletaId) {
    try {
      await deleteDoc(doc(this.db, 'boletas', boletaId));
      return true;
    } catch (error) {
      console.error('❌ Error eliminando boleta:', error);
      throw error;
    }
  }

  // ----------- MÉTODOS DE CACHE -----------
  clearCache() {
    this._registrosCache = null;
    this._cuotasCache = null;
  }

  async refreshCache() {
    this.clearCache();
    await this.getRegistros();
    await this.getCuotas();
  }
}

// Crear instancia global
window.database = new DatabaseManager();
window.db = window.database; // Alias para compatibilidad

console.log('✅ DatabaseManager inicializado correctamente con Firestore modular y ID numérico');

// Exportar para usar en otros módulos
export default window.database;
