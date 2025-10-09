// database-firebase.js — versión moderna con imports desde firebase-config.js

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
      // Eliminar el registro principal
      await deleteDoc(doc(this.db, 'registros', id));

      // También eliminar cuotas asociadas
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
