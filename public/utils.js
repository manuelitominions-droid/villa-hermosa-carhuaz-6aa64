// utils.js - Funciones auxiliares

import db from './database-firebase.js'; // 🔥 Importar DatabaseManager

// Cálculo de mora
function calcularMora(monto, fechaVencimiento, fechaPago) {
    if (!fechaPago) {
        fechaPago = new Date().toISOString().split('T')[0];
    }
    
    const fechaV = new Date(fechaVencimiento);
    const fechaP = new Date(fechaPago);
    const dias = Math.floor((fechaP - fechaV) / (1000 * 60 * 60 * 24));
    
    if (dias <= 5) {
        return 0;
    }
    
    let moraTotal = 0;
    
    // Calcular mora del rango 6-14 días (1%)
    if (dias >= 6) {
        const diasRango1 = Math.min(dias, 14) - 5; // días del 6 al 14
        const moraRango1 = monto * 0.01 * diasRango1;
        moraTotal += moraRango1;
    }
    
    // Calcular mora del rango 15+ días (1.5%)
    if (dias >= 15) {
        const diasRango2 = dias - 14; // días del 15 en adelante
        const moraRango2 = monto * 0.015 * diasRango2;
        moraTotal += moraRango2;
    }
    
    return Math.round(moraTotal * 100) / 100;
}

// Formatear fecha para zona horaria de Perú
function formatFecha(fecha) {
    if (!fecha) return '';
    try {
        const [year, month, day] = fecha.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'America/Lima'
        });
    } catch {
        return fecha;
    }
}

// Generar cuotas con fechas correctas para Perú
async function generarCuotas(registroId, formaPago, montoTotal, inicial, numeroCuotas, montosPersonalizados = null) {
    const cuotas = [];
    
    if (formaPago === 'cuotas' && inicial > 0) {
        const hoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const cuotaInicial = {
            registro_id: registroId,
            numero: 0,
            fecha_vencimiento: hoyPeru,
            monto: inicial,
            pagado: 1,
            fecha_pago: hoyPeru
        };
        cuotas.push(await db.addCuota(cuotaInicial));
    }
    
    if (formaPago === 'cuotas' && numeroCuotas > 0) {
        const saldo = montoTotal - inicial;
        let montoCuota = Math.round((saldo / numeroCuotas) * 100) / 100;
        const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
        let mes = fechaPeru.getMonth() + 1;
        let anio = fechaPeru.getFullYear();
        
        for (let i = 0; i < numeroCuotas; i++) {
            mes += 1;
            if (mes > 12) {
                mes = 1;
                anio += 1;
            }
            const ultimoDiaDelMes = new Date(anio, mes, 0).getDate();
            const fechaVencimiento = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
            let montoFinal = montosPersonalizados && montosPersonalizados[i] ? montosPersonalizados[i] : montoCuota;
            if (i === numeroCuotas - 1 && !montosPersonalizados) {
                montoFinal = Math.round((saldo - (montoCuota * (numeroCuotas - 1))) * 100) / 100;
            }
            const cuota = {
                registro_id: registroId,
                numero: i + 1,
                fecha_vencimiento: fechaVencimiento,
                monto: montoFinal
            };
            cuotas.push(await db.addCuota(cuota));
        }
    } else if (formaPago === 'contado') {
        const fechaHoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        let montoCuota = Math.round((montoTotal / numeroCuotas) * 100) / 100;
        for (let i = 0; i < numeroCuotas; i++) {
            let montoFinal = montosPersonalizados && montosPersonalizados[i] ? montosPersonalizados[i] : montoCuota;
            if (i === numeroCuotas - 1 && !montosPersonalizados) {
                montoFinal = Math.round((montoTotal - (montoCuota * (numeroCuotas - 1))) * 100) / 100;
            }
            const cuota = {
                registro_id: registroId,
                numero: i + 1,
                fecha_vencimiento: fechaHoyPeru,
                monto: montoFinal
            };
            cuotas.push(await db.addCuota(cuota));
        }
    }
    
    return cuotas;
}

// Regenerar cuotas con montos personalizados
async function regenerarCuotasConMontos(registroId, montosPersonalizados) {
    const registro = await db.getRegistroById(registroId);
    if (!registro) return false;

    const cuotasExistentes = await db.getCuotasByRegistroId(registroId);
    const cuotaInicial = cuotasExistentes.find(c => c.numero === 0);

    for (const c of cuotasExistentes) {
        if (c.numero !== 0) await db.deleteCuota(c.id);
    }

    const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    let mes = fechaPeru.getMonth() + 1;
    let anio = fechaPeru.getFullYear();

    for (let i = 0; i < montosPersonalizados.length; i++) {
        mes += 1;
        if (mes > 12) {
            mes = 1;
            anio += 1;
        }
        const ultimoDiaDelMes = new Date(anio, mes, 0).getDate();
        const fechaVencimiento = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
        const cuota = {
            registro_id: registroId,
            numero: i + 1,
            fecha_vencimiento: fechaVencimiento,
            monto: montosPersonalizados[i]
        };
        await db.addCuota(cuota);
    }
    
    return true;
}

// --- RESTO DEL CÓDIGO QUEDA IGUAL ---
// Validaciones
function validarDNI(dni) {
    return /^\d{7,12}$/.test(dni);
}
function validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function validarCelular(celular) {
    return /^\d{8,15}$/.test(celular);
}
function formatCurrency(amount) {
    return `S/ ${parseFloat(amount).toFixed(2)}`;
}
function getCurrentMonth() {
    const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    const year = fechaPeru.getFullYear();
    const month = String(fechaPeru.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function getNextMonth() {
    const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    let year = fechaPeru.getFullYear();
    let month = fechaPeru.getMonth() + 2;
    if (month > 12) {
        month = 1;
        year += 1;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
}
function getMonthName(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

// --- Export y window global actualizado ---
export { 
  calcularMora,
  formatFecha,
  generarCuotas,
  regenerarCuotasConMontos,
  validarDNI,
  validarEmail,
  validarCelular,
  formatCurrency,
  getCurrentMonth,
  getNextMonth,
  getMonthName,
  debounce,        // ✅ agregar debounce
  handleFileUpload,
  compressImage,
  processFile,
  downloadFile,
  showNotification,
  confirmAction
};

window.calcularMora = calcularMora;
window.formatFecha = formatFecha;
window.generarCuotas = generarCuotas;
window.regenerarCuotasConMontos = regenerarCuotasConMontos;
window.validarDNI = validarDNI;
window.validarEmail = validarEmail;
window.validarCelular = validarCelular;
window.formatCurrency = formatCurrency;
window.getCurrentMonth = getCurrentMonth;
window.getNextMonth = getNextMonth;
window.getMonthName = getMonthName;
window.debounce = debounce;   // ✅ agregar debounce
window.handleFileUpload = handleFileUpload;
window.compressImage = compressImage;
window.processFile = processFile;
window.downloadFile = downloadFile;
window.showNotification = showNotification;
window.confirmAction = confirmAction;
