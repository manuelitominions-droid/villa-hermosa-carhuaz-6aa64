// utils.js - Funciones auxiliares

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

// CORREGIDO: Formatear fecha para zona horaria de Perú
function formatFecha(fecha) {
    if (!fecha) return '';
    try {
        // Crear fecha sin conversión de zona horaria
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

// CORREGIDO: Generar cuotas con fechas correctas para Perú
function generarCuotas(registroId, formaPago, montoTotal, inicial, numeroCuotas, montosPersonalizados = null) {
    const cuotas = [];
    
    if (formaPago === 'cuotas' && inicial > 0) {
        // Crear cuota inicial (número 0) con fecha de Perú
        const hoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const cuotaInicial = {
            registro_id: registroId,
            numero: 0,
            fecha_vencimiento: hoyPeru,
            monto: inicial,
            pagado: 1,
            fecha_pago: hoyPeru
        };
        cuotas.push(db.addCuota(cuotaInicial));
    }
    
    // Generar cuotas regulares
    if (formaPago === 'cuotas' && numeroCuotas > 0) {
        const saldo = montoTotal - inicial;
        let montoCuota = Math.round((saldo / numeroCuotas) * 100) / 100;
        
        // Usar fecha de Perú
        const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
        let mes = fechaPeru.getMonth() + 1;
        let anio = fechaPeru.getFullYear();
        
        for (let i = 0; i < numeroCuotas; i++) {
            mes += 1;
            if (mes > 12) {
                mes = 1;
                anio += 1;
            }
            
            // Obtener el último día del mes correctamente
            const ultimoDiaDelMes = new Date(anio, mes, 0).getDate();
            const fechaVencimiento = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
            
            // Usar monto personalizado si se proporciona, sino usar el calculado
            let montoFinal = montosPersonalizados && montosPersonalizados[i] ? montosPersonalizados[i] : montoCuota;
            
            // Ajustar última cuota para manejar redondeo solo si no hay montos personalizados
            if (i === numeroCuotas - 1 && !montosPersonalizados) {
                montoFinal = Math.round((saldo - (montoCuota * (numeroCuotas - 1))) * 100) / 100;
            }
            
            const cuota = {
                registro_id: registroId,
                numero: i + 1,
                fecha_vencimiento: fechaVencimiento,
                monto: montoFinal
            };
            cuotas.push(db.addCuota(cuota));
        }
    } else if (formaPago === 'contado') {
        // Para contado, usar fecha de Perú
        const fechaHoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        let montoCuota = Math.round((montoTotal / numeroCuotas) * 100) / 100;
        
        for (let i = 0; i < numeroCuotas; i++) {
            // Usar monto personalizado si se proporciona
            let montoFinal = montosPersonalizados && montosPersonalizados[i] ? montosPersonalizados[i] : montoCuota;
            
            // Ajustar última cuota para manejar redondeo solo si no hay montos personalizados
            if (i === numeroCuotas - 1 && !montosPersonalizados) {
                montoFinal = Math.round((montoTotal - (montoCuota * (numeroCuotas - 1))) * 100) / 100;
            }
            
            const cuota = {
                registro_id: registroId,
                numero: i + 1,
                fecha_vencimiento: fechaHoyPeru,
                monto: montoFinal
            };
            cuotas.push(db.addCuota(cuota));
        }
    }
    
    return cuotas;
}

// NUEVA FUNCIÓN: Regenerar cuotas con montos personalizados
function regenerarCuotasConMontos(registroId, montosPersonalizados) {
    const registro = db.getRegistroById(registroId);
    if (!registro) return false;
    
    // Eliminar cuotas existentes (excepto inicial si existe)
    const cuotasExistentes = db.getCuotasByRegistroId(registroId);
    const cuotaInicial = cuotasExistentes.find(c => c.numero === 0);
    
    // Eliminar todas las cuotas regulares
    const cuotas = db.getCuotas();
    const cuotasFiltered = cuotas.filter(c => 
        c.registro_id !== registroId || c.numero === 0
    );
    db.saveCuotas(cuotasFiltered);
    
    // Regenerar con montos personalizados usando fecha de Perú
    const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    let mes = fechaPeru.getMonth() + 1;
    let anio = fechaPeru.getFullYear();
    
    for (let i = 0; i < montosPersonalizados.length; i++) {
        mes += 1;
        if (mes > 12) {
            mes = 1;
            anio += 1;
        }
        
        // Último día del mes
        const ultimoDiaDelMes = new Date(anio, mes, 0).getDate();
        const fechaVencimiento = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
        
        const cuota = {
            registro_id: registroId,
            numero: i + 1,
            fecha_vencimiento: fechaVencimiento,
            monto: montosPersonalizados[i]
        };
        db.addCuota(cuota);
    }
    
    return true;
}

// Validaciones ACTUALIZADAS - más flexibles
function validarDNI(dni) {
    // Permitir DNI de 7, 8, 9 o 12 dígitos
    return /^\d{7,12}$/.test(dni);
}

function validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validarCelular(celular) {
    // Permitir celular de 8, 9, 12 o 15 dígitos
    return /^\d{8,15}$/.test(celular);
}

// Formatear moneda
function formatCurrency(amount) {
    return `S/ ${parseFloat(amount).toFixed(2)}`;
}

// CORREGIDO: Obtener mes actual con zona horaria de Perú
function getCurrentMonth() {
    const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
    const year = fechaPeru.getFullYear();
    const month = String(fechaPeru.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// CORREGIDO: Obtener próximo mes con zona horaria de Perú
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

// Obtener nombre del mes
function getMonthName(monthStr) {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

// ACTUALIZADO: Comprimir y manejar archivos de cualquier tamaño y tipo
function handleFileUpload(file, cuotaId, tipo) {
    return new Promise((resolve, reject) => {
        // Primero intentar comprimir/optimizar si aplica
        compressIfNeeded(file).then(finalFile => {
            processFile(finalFile, cuotaId, tipo, resolve, reject);
        }).catch(err => {
            console.warn('No se pudo optimizar el archivo, usando original:', err);
            processFile(file, cuotaId, tipo, resolve, reject);
        });
    });
}

/**
 * Comprueba si el archivo necesita compresión.
 * - Para imágenes: aplica compresión adaptativa (calidad y maxWidth según tamaño)
 * - Para archivos no-imagen muy grandes: intenta usar CompressionStream('gzip') si está disponible
 * Devuelve una Promise que resuelve en un File (posiblemente comprimido) listo para procesar
 */
function compressIfNeeded(file) {
    const MB = 1024 * 1024;
    const sizeMB = file.size / MB;

    // Si es imagen, aplicamos compresión adaptativa
    if (file.type && file.type.startsWith('image/')) {
        // Definir parámetros según tamaño
        let quality = 0.8;
        let maxWidth = 1200;

        if (sizeMB > 10) {
            quality = 0.45; maxWidth = 1000;
        } else if (sizeMB > 5) {
            quality = 0.55; maxWidth = 1100;
        } else if (sizeMB > 2) {
            quality = 0.65; maxWidth = 1200;
        } else if (sizeMB > 1) {
            quality = 0.75; maxWidth = 1400;
        }

        // Forzar conversión a JPEG para mayor compresión cuando no sea SVG
        const preferType = (file.type === 'image/svg+xml') ? file.type : 'image/jpeg';

        return new Promise((resolve, reject) => {
            compressImageAdaptive(file, quality, maxWidth, preferType).then(compressed => {
                try {
                    const reduction = ((file.size - compressed.size) / file.size * 100).toFixed(1);
                    console.info(`Archivo ${file.name} comprimido: ${ (file.size/MB).toFixed(2) }MB → ${ (compressed.size/MB).toFixed(2) }MB (${reduction}% reducción)`);
                    showNotification(`Archivo ${file.name} optimizado (${reduction}% menos)`, 'info');
                } catch (e) { /* ignora */ }
                resolve(compressed);
            }).catch(err => {
                console.warn('compressIfNeeded: no se pudo comprimir imagen, usando original', err);
                resolve(file);
            });
        });
    }

    // Para no-imagenes muy grandes, intentar gzip (si está disponible)
    const LARGE_THRESHOLD = 2 * MB; // 2 MB
    if (file.size > LARGE_THRESHOLD && typeof CompressionStream !== 'undefined') {
        return (async () => {
            try {
                const ab = await file.arrayBuffer();
                const cs = new CompressionStream('gzip');
                const compressedStream = new Response(new Blob([ab]).stream().pipeThrough(cs));
                const compressedBlob = await compressedStream.blob();
                const gzFile = new File([compressedBlob], file.name + '.gz', { type: 'application/gzip', lastModified: Date.now() });
                console.info(`Archivo ${file.name} comprimido por gzip: ${(file.size/MB).toFixed(2)}MB → ${(gzFile.size/MB).toFixed(2)}MB`);
                showNotification(`Archivo ${file.name} comprimido (gzip)`, 'info');
                return gzFile;
            } catch (err) {
                console.warn('compressIfNeeded: gzip fallo, usando original', err);
                return file;
            }
        })();
    }

    // No aplica compresión, devolver original
    return Promise.resolve(file);
}

// Variante de compressImage con control de calidad, tamaño máximo y conversión a tipo objetivo
function compressImageAdaptive(file, quality = 0.7, maxWidth = 1200, targetType = null) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const outType = targetType || file.type;
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('No se pudo crear blob comprimido'));
                const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + (outType === 'image/jpeg' ? '.jpg' : '') , {
                    type: outType,
                    lastModified: Date.now()
                });
                resolve(newFile);
            }, outType, quality);
        };

        img.onerror = (e) => {
            console.warn('compressImageAdaptive: error cargando imagen', e);
            // fallback: devolver original
            resolve(file);
        };

        img.src = URL.createObjectURL(file);
    });
}

// NUEVA FUNCIÓN: Comprimir imágenes para optimizar rendimiento
function compressImage(file, quality = 0.7, maxWidth = 1200) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calcular nuevas dimensiones manteniendo proporción
            let { width, height } = img;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir a blob comprimido
            canvas.toBlob((blob) => {
                // Crear nuevo archivo con el blob comprimido
                const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now()
                });
                resolve(compressedFile);
            }, file.type, quality);
        };
        
        img.onerror = () => resolve(file); // Si falla, usar archivo original
        img.src = URL.createObjectURL(file);
    });
}

// NUEVA FUNCIÓN: Procesar archivo (comprimido o normal)
function processFile(file, cuotaId, tipo, resolve, reject) {
    // Store file blob in IndexedDB and save only metadata in localStorage to avoid quota issues
    (async () => {
        try {
            const fileKey = `${tipo}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const meta = {
                cuota_id: cuotaId,
                file_name: file.name,
                file_type: file.type,
                upload_date: new Date().toISOString(),
                file_size: file.size,
                file_key: fileKey
            };

            let saved;
            if (tipo === 'voucher') {
                saved = db.addVoucher(meta);
            } else if (tipo === 'boleta') {
                saved = db.addBoleta(meta);
            } else {
                throw new Error('Tipo de archivo desconocido');
            }

            // Store blob in IndexedDB under fileKey
            await db.idbPut(fileKey, file);

            resolve(saved);
        } catch (err) {
            // If we created metadata but failed to store blob, attempt to rollback
            try {
                if (typeof saved !== 'undefined' && saved && saved.id) {
                    if (tipo === 'voucher') db.deleteVoucher(saved.id);
                    if (tipo === 'boleta') db.deleteBoleta(saved.id);
                }
            } catch (e) { /* ignore rollback error */ }
            reject(err);
        }
    })();
}

// NUEVA FUNCIÓN: Descargar archivo individual
function downloadFile(fileData, fileName) {
    // If fileData looks like a data URL, download directly
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = fileData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    // Otherwise treat fileData as a key in IndexedDB
    db.idbGet(fileData).then(blobOrFile => {
        if (!blobOrFile) return showNotification('Archivo no encontrado en almacenamiento', 'error');
        const url = URL.createObjectURL(blobOrFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }).catch(err => {
        console.error('Error al obtener archivo de IndexedDB:', err);
        showNotification('Error al descargar archivo', 'error');
    });
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-semibold transition-all duration-300 transform translate-x-full`;
    
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500');
            break;
        case 'error':
            notification.classList.add('bg-red-500');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500');
            break;
        default:
            notification.classList.add('bg-blue-500');
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animar salida y remover
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Confirmar acción
// Confirmar acción: mostrar un modal centrado y estilizado en lugar de window.confirm
function confirmAction(message, callback) {
    try {
        // Evitar múltiples modales
        if (document.getElementById('confirmModalContainer')) return;

        const container = document.createElement('div');
        container.id = 'confirmModalContainer';
        container.className = 'fixed inset-0 z-60 flex items-center justify-center';

        container.innerHTML = `
            <div class="absolute inset-0" id="confirmModalOverlay" style="background: transparent;"></div>
            <div class="bg-white rounded-lg shadow-none max-w-lg w-full mx-4 p-6 z-10">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0 mt-1">
                        <svg class="w-10 h-10 text-yellow-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M11 7h2v6h-2z" fill="currentColor"/>
                            <path d="M11 15h2v2h-2z" fill="currentColor"/>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12zM12 4C7.589 4 4 7.589 4 12s3.589 8 8 8 8-3.589 8-8-3.589-8-8-8z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Confirmar eliminación</h3>
                        <p class="text-sm text-gray-600" id="confirmModalMessage">${escapeHtml(String(message))}</p>
                        <div class="mt-6 flex justify-end space-x-3">
                            <button id="confirmModalCancel" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded">Cancelar</button>
                            <button id="confirmModalConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Antes de añadir el modal, buscar overlays oscuros existentes y atenuarlos
        const dimmedOverlays = [];
        try {
            const possibleOverlays = Array.from(document.querySelectorAll('.fixed.bg-black'));
            possibleOverlays.forEach(el => {
                // Guardar estilos previos
                dimmedOverlays.push({ el, prevBackground: el.style.background || '', prevOpacity: el.style.opacity || '', prevPointer: el.style.pointerEvents || '' });
                // Hacer overlay menos oscuro y no bloquear interacción visual
                el.style.background = 'transparent';
                el.style.opacity = '1';
                el.style.pointerEvents = 'none';
            });
        } catch (e) { /* ignore */ }

        // Añadir al body
        container.style.zIndex = '9999';
        document.body.appendChild(container);

        // Foco al botón confirmar
        const btnConfirm = document.getElementById('confirmModalConfirm');
        const btnCancel = document.getElementById('confirmModalCancel');
        const overlay = document.getElementById('confirmModalOverlay');

        function closeConfirm() {
            try {
                document.removeEventListener('keydown', onKeyDown);
                if (container && container.parentNode) container.parentNode.removeChild(container);
                // Restaurar overlays atenuados
                try {
                    dimmedOverlays.forEach(d => {
                        if (!d.el) return;
                        d.el.style.background = d.prevBackground || '';
                        d.el.style.opacity = d.prevOpacity || '';
                        d.el.style.pointerEvents = d.prevPointer || '';
                    });
                } catch (ee) { /* ignore restore errors */ }
            } catch (e) { /* ignore */ }
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                closeConfirm();
            }
        }

        document.addEventListener('keydown', onKeyDown);

        overlay.addEventListener('click', () => closeConfirm());

        btnCancel.addEventListener('click', () => {
            closeConfirm();
        });

        btnConfirm.addEventListener('click', () => {
            try {
                // Ejecutar callback de forma segura
                if (typeof callback === 'function') callback();
            } catch (err) {
                console.error('confirmAction callback error:', err);
            }
            closeConfirm();
        });

        // focus management
        setTimeout(() => { try { btnConfirm.focus(); } catch(e){} }, 50);
    } catch (err) {
        // Fallback a confirm() si algo falla
        try { if (confirm(message)) callback(); } catch (e) { console.error(e); }
    }
}

// helper: escapar texto simple para evitar inyección de HTML en el modal
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/\"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Debounce para búsquedas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
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
  handleFileUpload,
  compressImage,
  processFile,
  downloadFile,
  showNotification,
  confirmAction,
  debounce
};

// Hacer accesibles globalmente para HTML y otros módulos que usan onclick/global scope
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
window.handleFileUpload = handleFileUpload;
window.compressImage = compressImage;
window.processFile = processFile;
window.downloadFile = downloadFile;
window.showNotification = showNotification;
window.confirmAction = confirmAction;
window.debounce = debounce;
