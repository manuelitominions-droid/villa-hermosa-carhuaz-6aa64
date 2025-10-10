// components.js - Componentes reutilizables CORREGIDOS

// Helper seguro para obtener auth
function getAuth() {
    return window.auth || (typeof auth !== 'undefined' ? auth : null);
}

// Función para esperar a que la base de datos esté lista
function waitForDatabase() {
    return new Promise((resolve) => {
        if (window.database && typeof window.database.getRegistros === 'function') {
            resolve(window.database);
        } else {
            const checkDatabase = () => {
                if (window.database && typeof window.database.getRegistros === 'function') {
                    resolve(window.database);
                } else {
                    setTimeout(checkDatabase, 50);
                }
            };
            checkDatabase();
        }
    });
}

// Cache global para optimización
const CACHE_REGISTROS = {
    registros: new Map(),
    cuotas: new Map(),
    estados: new Map(),
    lastUpdate: 0
};

// Crear tabla de registros CORREGIDA
function createRegistrosTable(registros) {
    if (!registros || registros.length === 0) {
        return '<div class="text-center py-8 text-gray-500">No se encontraron registros.</div>';
    }

    let html = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombres</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNIs</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Celulares</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emails</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manzana</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metraje</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma Pago</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicial</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuotas</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;

    registros.forEach((r, index) => {
        const displayId = r.numeric_id || (index + 1);
        const nombres = r.nombre2 ? `<div class="flex flex-col"><span>${r.nombre1}</span><span>${r.nombre2}</span></div>` : `${r.nombre1}`;
        const dnis = r.dni2 ? `<div class="flex flex-col"><span>${r.dni1}</span><span>${r.dni2}</span></div>` : `${r.dni1}`;
        const celulares = r.celular2 ? `<div class="flex flex-col"><span>${r.celular1 || ''}</span><span>${r.celular2}</span></div>` : `${r.celular1 || ''}`;
        const emails = r.gmail2 ? `<div class="flex flex-col"><span>${r.gmail1 || ''}</span><span>${r.gmail2}</span></div>` : `${r.gmail1 || ''}`;
        const inicialStr = r.forma_pago === 'cuotas' ? formatCurrency(r.inicial || 0) : '-';
        const metrajeStr = r.metraje ? `${r.metraje} m²` : '-';
        const cuotasStr = r.forma_pago === 'cuotas' ? r.numero_cuotas : '-';
        
        // Estado calculado de forma síncrona
        const estadoHTML = renderEstadoHTMLSync(r);
        
        // CORREGIDO: Crear índice único para cada registro
        const registroIndex = `reg_${index}`;
        
        // Botón de cuotas CORREGIDO - usar data attributes
        const opciones = r.forma_pago === 'cuotas' 
            ? `<button data-registro-id="${r.id}" onclick="window.showCuotasModalSafe(this)" class="text-blue-600 hover:text-blue-800 mr-2 font-semibold" title="Ver cuotas">⚡ Cuotas</button>`
            : `<button data-registro-id="${r.id}" onclick="window.showCuotasModalSafe(this)" class="text-blue-600 hover:text-blue-800 mr-2" title="Ver detalles">Contado</button>`;
        
        const _auth = getAuth();
        const editBtn = (_auth && _auth.isAdmin && _auth.isAdmin()) 
            ? `<button data-registro-id="${r.id}" onclick="window.showEditCuotasModalSafe(this)" class="mr-2 text-orange-500 hover:text-orange-600" title="Editar cuotas" style="line-height:0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
                </button>` : '';
        
        const deleteBtn = (_auth && _auth.isAdmin && _auth.isAdmin()) 
            ? `<button data-registro-id="${r.id}" onclick="window.confirmDeleteSafe(this)" class="ml-2 text-red-600 hover:text-red-800" aria-label="Eliminar registro" title="Eliminar registro" style="line-height:0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H2V4h4l1-1z"/></svg>
                </button>` : '';

        html += `
                <tr data-registro-id="${r.id}" class="hover:bg-gray-50">
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">${displayId}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${nombres}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${dnis}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${celulares}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${emails}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${r.manzana}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${r.lote}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${metrajeStr}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${formatCurrency(r.monto_total)}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${r.forma_pago.charAt(0).toUpperCase() + r.forma_pago.slice(1)}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${inicialStr}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 cuotas-cell">${cuotasStr}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 estado-cell" id="estado-${registroIndex}">${estadoHTML}</td>
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 opciones-cell">${opciones}${editBtn}${deleteBtn}</td>
                </tr>
            `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}

// Render HTML para estado SIN async
function renderEstadoHTMLSync(registro) {
    if (!registro) return '<span class="text-gray-500">-</span>';
    
    if (registro.forma_pago === 'contado') {
        return '<span class="text-green-600 font-semibold">Pagado</span>';
    }
    
    // Usar cache si está disponible
    if (CACHE_REGISTROS.estados.has(registro.id)) {
        const cached = CACHE_REGISTROS.estados.get(registro.id);
        if (cached.pendingCount === 0) {
            return '<span class="text-green-600 font-semibold">Al día</span>';
        } else {
            return `<span class="text-red-600 font-semibold">Debe ${cached.pendingCount} cuota${cached.pendingCount > 1 ? 's' : ''}</span>`;
        }
    }
    
    return '<span class="text-blue-600 font-semibold">Calculando...</span>';
}

// FUNCIÓN SEGURA: Modal de cuotas usando data attributes
function showCuotasModalSafe(buttonElement) {
    const registroId = buttonElement.getAttribute('data-registro-id');
    console.log('🚀 Abriendo modal para:', registroId);
    
    if (!registroId) {
        console.error('No se encontró ID del registro');
        return;
    }
    
    // Mostrar modal inmediatamente
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-chart-bar mr-3 text-blue-500"></i>⚡ Cuotas - Cargando...
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div id="cuotasContent">
                    <div class="text-center py-8">
                        <div class="text-blue-600 text-lg font-semibold">⚡ Cargando datos...</div>
                    </div>
                </div>
                
                <div class="flex justify-end mt-6">
                    <button onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
    
    // Cargar datos en background
    setTimeout(async () => {
        try {
            const db = await waitForDatabase();
            
            // Obtener datos
            let registro = CACHE_REGISTROS.registros.get(registroId);
            let cuotas = CACHE_REGISTROS.cuotas.get(registroId);
            
            if (!registro) {
                registro = db.getRegistroById(registroId);
                if (registro) CACHE_REGISTROS.registros.set(registroId, registro);
            }
            
            if (!cuotas) {
                cuotas = await db.getCuotasByRegistroId(registroId);
                if (cuotas) CACHE_REGISTROS.cuotas.set(registroId, cuotas);
            }
            
            if (!registro) {
                document.getElementById('cuotasContent').innerHTML = 
                    '<div class="text-center py-4 text-red-500">Registro no encontrado</div>';
                return;
            }
            
            // Generar tabla de cuotas
            let cuotasHTML = '';
            if (!cuotas || cuotas.length === 0) {
                cuotasHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay cuotas registradas</td></tr>';
            } else {
                cuotas.forEach(c => {
                    const mora = c.numero > 0 ? calcularMora(c.monto, c.fecha_vencimiento, c.fecha_pago) : 0;
                    const moraManual = c.mora_manual && Number(c.mora_manual) > 0 ? Number(c.mora_manual) : 0;
                    const moraToShow = moraManual > 0 ? `${formatCurrency(moraManual)} <span class="text-xs text-gray-500">(manual)</span>` : formatCurrency(mora);
                    const total = c.monto + (moraManual > 0 ? moraManual : mora);
                    const estado = c.pagado ? 
                        '<span class="text-green-600 font-semibold">✅ Pagado</span>' : 
                        '<span class="text-red-600 font-semibold">❌ Pendiente</span>';
                    const fechaPago = c.pagado && c.fecha_pago ? formatFecha(c.fecha_pago) : '-';
                    const cuotaDisplay = c.numero === 0 ? 'Inicial' : c.numero;
                    
                    const _auth = getAuth();
                    let accionHTML = '-';
                    if (!c.pagado && _auth && _auth.isAdmin && _auth.isAdmin()) {
                        accionHTML = `<button data-cuota-id="${c.id}" onclick="window.showPagarCuotaModalSafe(this)" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">Registrar Pago</button>`;
                    } else if (c.pagado && _auth && _auth.isAdmin && _auth.isAdmin()) {
                        accionHTML = `<button data-cuota-id="${c.id}" onclick="window.showEditarPagoModalSafe(this)" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm">✏️ Editar Pago</button>`;
                    }
                    
                    cuotasHTML += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-sm">${cuotaDisplay}</td>
                            <td class="px-4 py-3 text-sm">${formatFecha(c.fecha_vencimiento)}</td>
                            <td class="px-4 py-3 text-sm">${formatCurrency(c.monto)}</td>
                            <td class="px-4 py-3 text-sm">${moraToShow}</td>
                            <td class="px-4 py-3 text-sm">${formatCurrency(total)}</td>
                            <td class="px-4 py-3 text-sm">${fechaPago}</td>
                            <td class="px-4 py-3 text-sm">${estado}</td>
                            <td class="px-4 py-3 text-sm">${accionHTML}</td>
                        </tr>
                    `;
                });
            }
            
            // Actualizar contenido del modal
            const cuotasContent = document.getElementById('cuotasContent');
            if (cuotasContent) {
                cuotasContent.innerHTML = `
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mora</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Pago</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${cuotasHTML}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            // Actualizar título
            const titulo = document.querySelector('#modalContainer h2');
            if (titulo) {
                titulo.innerHTML = `<i class="fas fa-chart-bar mr-3 text-blue-500"></i>⚡ Cuotas - ${registro.nombre1}`;
            }
            
        } catch (error) {
            console.error('Error cargando cuotas:', error);
            const cuotasContent = document.getElementById('cuotasContent');
            if (cuotasContent) {
                cuotasContent.innerHTML = '<div class="text-center py-4 text-red-500">Error cargando cuotas</div>';
            }
        }
    }, 10);
}

// FUNCIÓN SEGURA: Modal para editar cuotas
function showEditCuotasModalSafe(buttonElement) {
    const registroId = buttonElement.getAttribute('data-registro-id');
    
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para editar cuotas', 'error');
        return;
    }
    
    // Mostrar modal inmediatamente
    const loadingHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-3 text-orange-500"></i>⚡ Editar Cuotas - Cargando...
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div class="flex items-center justify-center py-8">
                    <div class="text-orange-600 text-lg font-semibold">⚡ Preparando editor...</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = loadingHTML;
    
    // Cargar datos en background
    setTimeout(async () => {
        try {
            const db = await waitForDatabase();
            const registro = db.getRegistroById(registroId);
            const cuotas = await db.getCuotasByRegistroId(registroId);
            const cuotasNormales = cuotas.filter(c => c.numero > 0);
            
            if (!registro || cuotasNormales.length === 0) {
                showNotification('No hay cuotas para editar', 'error');
                closeModal();
                return;
            }
            
            let cuotasEditHTML = '';
            cuotasNormales.forEach(c => {
                cuotasEditHTML += `
                    <div class="flex items-center space-x-4 mb-3">
                        <label class="w-20 text-sm font-medium text-gray-700">Cuota ${c.numero}:</label>
                        <input type="number" id="cuota_${c.numero}" step="0.01" min="0" value="${c.monto}" 
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        <input type="date" id="fecha_${c.numero}" value="${c.fecha_vencimiento}" 
                               class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                    </div>
                `;
            });
            
            const modalHTML = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-800">
                                <i class="fas fa-edit mr-3 text-orange-500"></i>⚡ Editar Cuotas - ${registro.nombre1}
                            </h2>
                            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>
                        
                        <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                            <p class="text-sm text-blue-800">
                                <strong>Total:</strong> ${formatCurrency(registro.monto_total)} | 
                                <strong>Inicial:</strong> ${formatCurrency(registro.inicial || 0)} | 
                                <strong>Saldo:</strong> ${formatCurrency(registro.monto_total - (registro.inicial || 0))}
                            </p>
                        </div>
                        
                        <form onsubmit="window.handleEditCuotasSafe(event, '${registroId}')">
                            <div class="space-y-2 mb-6">
                                ${cuotasEditHTML}
                            </div>
                            
                            <div class="flex justify-end space-x-4">
                                <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </button>
                                <button type="submit" class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                                    ⚡ Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.getElementById('modalContainer').innerHTML = modalHTML;
            
        } catch (error) {
            console.error('Error cargando editor:', error);
            showNotification('Error al cargar editor', 'error');
            closeModal();
        }
    }, 10);
}

// FUNCIÓN SEGURA: Confirmación para eliminar
function confirmDeleteSafe(buttonElement) {
    const registroId = buttonElement.getAttribute('data-registro-id');
    
    if (confirm('¿Seguro que deseas borrar este registro?')) {
        deleteRegistroSafe(registroId);
    }
}

// FUNCIÓN SEGURA: Eliminar registro
async function deleteRegistroSafe(registroId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para eliminar registros', 'error');
        return;
    }
    
    try {
        const db = await waitForDatabase();
        await db.deleteRegistro(registroId);
        
        // Limpiar cache
        CACHE_REGISTROS.registros.delete(registroId);
        CACHE_REGISTROS.cuotas.delete(registroId);
        CACHE_REGISTROS.estados.delete(registroId);
        
        showNotification('Registro eliminado exitosamente', 'success');
        
        // Recargar la sección actual
        if (typeof loadSectionContent === 'function' && window.currentSection) {
            loadSectionContent(window.currentSection);
        }
    } catch (error) {
        showNotification('Error al eliminar el registro', 'error');
        console.error(error);
    }
}

// FUNCIÓN SEGURA: Manejar edición de cuotas
async function handleEditCuotasSafe(event, registroId) {
    event.preventDefault();
    
    try {
        const db = await waitForDatabase();
        const cuotas = await db.getCuotasByRegistroId(registroId);
        const cuotasNormales = cuotas.filter(c => c.numero > 0);
        
        // Actualizar cuotas
        for (const c of cuotasNormales) {
            const inputMonto = document.getElementById(`cuota_${c.numero}`);
            const inputFecha = document.getElementById(`fecha_${c.numero}`);
            if (inputMonto && inputFecha) {
                await db.updateCuota(c.id, { 
                    monto: parseFloat(inputMonto.value),
                    fecha_vencimiento: inputFecha.value
                });
            }
        }
        
        // Limpiar cache
        CACHE_REGISTROS.cuotas.delete(registroId);
        CACHE_REGISTROS.estados.delete(registroId);
        
        showNotification('⚡ Cuotas actualizadas exitosamente', 'success');
        closeModal();
        
        // Recargar la sección actual
        if (typeof loadSectionContent === 'function' && window.currentSection) {
            loadSectionContent(window.currentSection);
        }
    } catch (error) {
        console.error('Error actualizando cuotas:', error);
        showNotification('Error al actualizar cuotas', 'error');
    }
}

// FUNCIÓN SEGURA: Modal para pagar cuota
function showPagarCuotaModalSafe(buttonElement) {
    const cuotaId = buttonElement.getAttribute('data-cuota-id');
    
    if (typeof showPagarCuotaModal === 'function') {
        showPagarCuotaModal(cuotaId);
    } else {
        console.error('Función showPagarCuotaModal no encontrada');
    }
}

// FUNCIÓN SEGURA: Modal para editar pago
function showEditarPagoModalSafe(buttonElement) {
    const cuotaId = buttonElement.getAttribute('data-cuota-id');
    
    if (typeof showEditarPagoModal === 'function') {
        showEditarPagoModal(cuotaId);
    } else {
        console.error('Función showEditarPagoModal no encontrada');
    }
}

// Funciones auxiliares
function toggleCuotasFields(formaPago) {
    const inicialField = document.getElementById('inicialField');
    if (formaPago === 'cuotas') {
        inicialField.classList.remove('hidden');
    } else {
        inicialField.classList.add('hidden');
    }
}

function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
}

function viewFile(fileData, fileName) {
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
        const newWindow = window.open();
        newWindow.document.write(`
            <html>
                <head><title>${fileName}</title></head>
                <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
                    <img src="${fileData}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${fileName}">
                </body>
            </html>
        `);
        return;
    }

    if (window.database && typeof window.database.idbGet === 'function') {
        window.database.idbGet(fileData).then(blobOrFile => {
            if (!blobOrFile) return showNotification('Archivo no encontrado', 'error');
            const url = URL.createObjectURL(blobOrFile);
            const newWindow = window.open();
            newWindow.document.write(`
                <html>
                    <head><title>${fileName}</title></head>
                    <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0f0f0;">
                        <img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;" alt="${fileName}">
                    </body>
                </html>
            `);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        }).catch(err => {
            console.error('Error al leer archivo:', err);
            showNotification('Error al abrir archivo', 'error');
        });
    }
}

// Modal para nuevo registro
function showNewRegistroModal() {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para registrar clientes', 'error');
        return;
    }

    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-plus mr-3 text-green-500"></i>Nuevo Registro
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <form id="newRegistroForm" onsubmit="handleNewRegistro(event)">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nombre 1 *</label>
                            <input type="text" name="nombre1" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nombre 2</label>
                            <input type="text" name="nombre2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">DNI 1 *</label>
                            <input type="text" name="dni1" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">DNI 2</label>
                            <input type="text" name="dni2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Celular 1</label>
                            <input type="text" name="celular1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Celular 2</label>
                            <input type="text" name="celular2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Gmail 1</label>
                            <input type="email" name="gmail1" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Gmail 2</label>
                            <input type="email" name="gmail2" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Manzana *</label>
                            <input type="text" name="manzana" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Lote *</label>
                            <input type="text" name="lote" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Metraje (m²)</label>
                            <input type="number" name="metraje" step="0.01" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Monto Total *</label>
                            <input type="number" name="monto_total" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Forma de Pago *</label>
                            <select name="forma_pago" onchange="toggleCuotasFields(this.value)" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                                <option value="contado">Contado</option>
                                <option value="cuotas">Cuotas</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Número de Cuotas *</label>
                            <input type="number" name="numero_cuotas" min="1" value="1" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div id="inicialField" class="hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Inicial</label>
                            <input type="number" name="inicial" step="0.01" min="0" value="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-4 mt-6">
                        <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
                            Registrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// Exponer funciones globalmente de forma SEGURA
window.createRegistrosTable = createRegistrosTable;
window.renderEstadoHTMLSync = renderEstadoHTMLSync;
window.showCuotasModalSafe = showCuotasModalSafe;
window.showEditCuotasModalSafe = showEditCuotasModalSafe;
window.confirmDeleteSafe = confirmDeleteSafe;
window.deleteRegistroSafe = deleteRegistroSafe;
window.handleEditCuotasSafe = handleEditCuotasSafe;
window.showPagarCuotaModalSafe = showPagarCuotaModalSafe;
window.showEditarPagoModalSafe = showEditarPagoModalSafe;
window.showNewRegistroModal = showNewRegistroModal;
window.toggleCuotasFields = toggleCuotasFields;
window.closeModal = closeModal;
window.viewFile = viewFile;

// Aliases para compatibilidad (mantener las funciones originales)
window.showCuotasModal = showCuotasModalSafe;
window.showEditCuotasModal = showEditCuotasModalSafe;
window.deleteRegistro = deleteRegistroSafe;
window.confirmAction = confirmDeleteSafe;

console.log('✅ Components.js CORREGIDO - Funciones seguras cargadas');
