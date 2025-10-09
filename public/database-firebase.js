// database-firebase.js — versión completa con métodos faltantes

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
  }

  // ----------- REGISTROS -----------
  async getRegistros() {
    try {
      const registrosRef = collection(this.db, 'registros');
      const snapshot = await getDocs(registrosRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error obteniendo registros:', error);
      return [];
    }
  }

  async addRegistro(data) {
    try {
      const registrosRef = collection(this.db, 'registros');
      const docRef = await addDoc(registrosRef, {
        ...data,
        fecha_registro: new Date().toISOString().split('T')[0],
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('❌ Error agregando registro:', error);
      throw error;
    }
  }

  async updateRegistro(id, updateData) {
    try {
      const ref = doc(this.db, 'registros', id);
      await updateDoc(ref, updateData);
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
      const cuotasRef = collection(this.db, 'cuotas');
      const snapshot = await getDocs(cuotasRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      return true;
    } catch (error) {
      console.error('❌ Error actualizando cuota:', error);
      throw error;
    }
  }

  async getCuotasByRegistroId(registroId) {
    try {
      const cuotasRef = collection(this.db, 'cuotas');
      const cuotasQuery = query(
        cuotasRef,
        where('registro_id', '==', registroId),
        orderBy('numero')
      );
      const snapshot = await getDocs(cuotasQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error obteniendo cuotas por registro:', error);
      return [];
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
}

// Crear instancia global
window.database = new DatabaseManager();
console.log('✅ DatabaseManager inicializado correctamente con Firestore modular');

// Exportar para usar en otros módulos
export default window.database;
