// components.js - Componentes reutilizables

// Helper seguro para obtener auth (puede estar expuesto en window por auth.js)
function getAuth() {
    return window.auth || (typeof auth !== 'undefined' ? auth : null);
}

// Crear tabla de registros
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

    registros.forEach(r => {
    const nombres = r.nombre2 ? `<div class="flex flex-col"><span>${r.nombre1}</span><span>${r.nombre2}</span></div>` : `${r.nombre1}`;
    const dnis = r.dni2 ? `<div class="flex flex-col"><span>${r.dni1}</span><span>${r.dni2}</span></div>` : `${r.dni1}`;
    const celulares = r.celular2 ? `<div class="flex flex-col"><span>${r.celular1 || ''}</span><span>${r.celular2}</span></div>` : `${r.celular1 || ''}`;
    const emails = r.gmail2 ? `<div class="flex flex-col"><span>${r.gmail1 || ''}</span><span>${r.gmail2}</span></div>` : `${r.gmail1 || ''}`;
        const inicialStr = r.forma_pago === 'cuotas' ? formatCurrency(r.inicial || 0) : '-';
        const metrajeStr = r.metraje ? `${r.metraje} m²` : '-';
        const cuotasStr = r.forma_pago === 'cuotas' ? r.numero_cuotas : '-';
        
        const opciones = r.forma_pago === 'cuotas' 
            ? `<button onclick="showCuotasModal(${r.id})" class="text-blue-600 hover:text-blue-800 mr-2">Cuotas</button>`
            : `<button onclick="showCuotasModal(${r.id})" class="text-blue-600 hover:text-blue-800 mr-2">Contado</button>`;
        
    const _auth = getAuth();
        const editBtn = (_auth && _auth.isAdmin && _auth.isAdmin()) 
            ? `<button onclick="showEditCuotasModal(${r.id})" class="mr-2 text-orange-500 hover:text-red-600" style="line-height:0">
                    <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z\"/></svg>
                </button>` : '';
        
        const deleteBtn = (_auth && _auth.isAdmin && _auth.isAdmin()) 
            ? `<button onclick="confirmAction('¿Seguro que deseas borrar este registro?', () => deleteRegistro(${r.id}))" class="ml-2 text-red-600 hover:text-red-800" aria-label="Eliminar registro" title="Eliminar registro" style="line-height:0">
                    <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H2V4h4l1-1z\"/></svg>
                </button>` : '';

        html += `
                <tr data-registro-id="${r.id}" class="hover:bg-gray-50">
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${r.id}</td>
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
                    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 estado-cell">${renderEstadoHTML(r)}</td>
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

// Render HTML para la columna Estado (usa cache si existe, si no calcula al vuelo)
function renderEstadoHTML(registro) {
    if (!registro) return '<span class="text-gray-500">-</span>';
    if (registro.estado_pago) {
        if (registro.estado_pago === 'al_dia') return '<span class="text-green-600 font-semibold">Al día</span>';
        return `<span class="text-red-600 font-semibold">(${registro.cuotas_pendientes || 0} cuotas)</span>`;
    }
    // fallback: calcular saldo
    try {
    const s = db.getSaldoPendienteByRegistro(registro.id);
    return s.pendingAmount > 0 ? `<span class="text-red-600 font-semibold">(${s.pendingCount} cuotas)</span>` : '<span class="text-green-600 font-semibold">Al día</span>';
    } catch (e) {
        return '<span class="text-gray-500">-</span>';
    }
}

// Actualiza la fila del registro en la tabla Clientes si está visible
function updateRegistroRow(registroId) {
    try {
        const tr = document.querySelector(`tr[data-registro-id="${registroId}"]`);
        if (!tr) return; // no en la vista actual

        const registro = db.getRegistroById(registroId) || { id: registroId };
        // Asegurar campos cacheados
        const s = db.getSaldoPendienteByRegistro(registroId);
        registro.saldo_pendiente = s.pendingAmount;
        registro.cuotas_pendientes = s.pendingCount;
        registro.estado_pago = s.pendingAmount > 0 ? 'deuda' : 'al_dia';

        // actualizar celdas por clase
        const estadoCell = tr.querySelector('.estado-cell');
        if (estadoCell) estadoCell.innerHTML = renderEstadoHTML(registro);

        const opcionesCell = tr.querySelector('.opciones-cell');
        if (opcionesCell) {
            const _auth = getAuth();
            const opcionesHTML = registro.forma_pago === 'cuotas'
                ? `<button onclick="showCuotasModal(${registro.id})" class="text-blue-600 hover:text-blue-800 mr-2">Cuotas</button>`
                : `<button onclick="showCuotasModal(${registro.id})" class="text-blue-600 hover:text-blue-800 mr-2">Contado</button>`;
            const editBtn = (_auth && _auth.isAdmin && _auth.isAdmin())
                ? `<button onclick="showEditCuotasModal(${registro.id})" class="text-orange-600 hover:text-orange-800 mr-2">✏️</button>` : '';
            const deleteBtn = (_auth && _auth.isAdmin && _auth.isAdmin())
                ? `<button onclick="confirmAction('¿Seguro que deseas borrar este registro?', () => deleteRegistro(${registro.id}))" class="ml-2 text-red-600 hover:text-red-800" aria-label="Eliminar registro" title="Eliminar registro" style="line-height:0">
                        <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-4h6l1 1h4v2H2V4h4l1-1z\"/></svg>
                    </button>` : '';
            opcionesCell.innerHTML = `${opcionesHTML}${editBtn}${deleteBtn}`;
        }

    } catch (err) {
        console.error('updateRegistroRow error:', err);
    }
}

// Exponer la función para poder llamarla desde app.js
if (typeof window.updateRegistroRow === 'undefined') window.updateRegistroRow = updateRegistroRow;

// --- Cross-tab synchronization: BroadcastChannel with fallback a localStorage ---
;(function setupCrossTabSync() {
    const CHANNEL_NAME = 'villa_registros_channel';
    let bc = null;

    function handleMessagePayload(payload) {
        try {
            if (!payload || !payload.type) return;
            if (payload.type === 'registro-updated' && payload.registroId) {
                // Actualizar fila si está visible
                updateRegistroRow(payload.registroId);
                // Si el modal de cuotas está abierto para ese registro, refrescarlo
                try {
                    const cuota = db.getCuotasByRegistroId(payload.registroId)[0];
                    if (cuota && typeof showCuotasModal === 'function') {
                        // No forzamos abrir si no está abierto, showCuotasModal reescribe modalContainer
                        // solo actualizar si modal visible: verificamos si modalContainer contiene 'Cuotas -'
                        const modal = document.getElementById('modalContainer');
                        if (modal && modal.innerHTML.includes('Cuotas -')) {
                            showCuotasModal(payload.registroId);
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        } catch (err) { console.error('handleMessagePayload', err); }
    }

    if (typeof BroadcastChannel !== 'undefined') {
        try {
            bc = new BroadcastChannel(CHANNEL_NAME);
            bc.onmessage = (ev) => {
                handleMessagePayload(ev.data);
            };
            window._villa_bc = bc;
            return; // listo
        } catch (e) { bc = null; }
    }

    // Fallback: usar localStorage events
    window.addEventListener('storage', (ev) => {
        if (!ev.key || ev.key !== CHANNEL_NAME) return;
        try {
            const payload = JSON.parse(ev.newValue);
            handleMessagePayload(payload);
        } catch (e) { /* ignore */ }
    });

    // Exponer método para enviar mensajes desde otras pestañas si BroadcastChannel no está disponible
    window._villa_sendMessageFallback = function(payload) {
        try {
            localStorage.setItem(CHANNEL_NAME, JSON.stringify(payload));
            // cleanup immediate (some browsers may not fire storage if value same) -> set timestamp
            setTimeout(() => localStorage.removeItem(CHANNEL_NAME), 500);
        } catch (e) { console.warn('broadcast fallback failed', e); }
    };

})();

// Modal para nuevo registro - ACTUALIZADO con validaciones flexibles
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
                            <label class="block text-sm font-medium text-gray-700 mb-2">DNI 1 * (7-12 dígitos)</label>
                            <input type="text" name="dni1" required pattern="[0-9]{7,12}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">DNI 2 (7-12 dígitos)</label>
                            <input type="text" name="dni2" pattern="[0-9]{7,12}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Celular 1 (8-15 dígitos)</label>
                            <input type="text" name="celular1" pattern="[0-9]{8,15}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Celular 2 (8-15 dígitos)</label>
                            <input type="text" name="celular2" pattern="[0-9]{8,15}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
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

// ACTUALIZADO: Modal para editar montos de cuotas con ajuste automático y botón "Aplicar a todas"
function showEditCuotasModal(registroId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para editar cuotas', 'error');
        return;
    }
    
    const registro = db.getRegistroById(registroId);
    const cuotas = db.getCuotasByRegistroId(registroId).filter(c => c.numero > 0);
    
    if (!registro || cuotas.length === 0) {
        showNotification('No hay cuotas para editar', 'error');
        return;
    }
    
    let cuotasEditHTML = '';
    cuotas.forEach(c => {
        cuotasEditHTML += `
            <div class="flex items-center space-x-4 mb-3">
                <label class="w-20 text-sm font-medium text-gray-700">Cuota ${c.numero}:</label>
                <input type="number" id="cuota_${c.numero}" step="0.01" min="0" value="${c.monto}" 
                       oninput="ajustarCuotasAutomaticamente(${registroId})"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                <input type="date" id="fecha_${c.numero}" value="${c.fecha_vencimiento}" 
                       class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                <span class="text-sm text-gray-500 w-24">Vence: ${formatFecha(c.fecha_vencimiento)}</span>
            </div>
        `;
    });
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-3 text-orange-500"></i>Editar Cuotas - ${registro.nombre1}
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <strong>Monto Total:</strong> ${formatCurrency(registro.monto_total)}<br>
                        <strong>Inicial:</strong> ${formatCurrency(registro.inicial || 0)}<br>
                        <strong>Saldo a Financiar:</strong> ${formatCurrency(registro.monto_total - (registro.inicial || 0))}
                    </p>
                </div>
                
                <!-- NUEVO: Sección de aplicar monto a todas -->
                <div class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 class="text-lg font-semibold text-yellow-800 mb-3">Aplicar Monto Igual a Todas las Cuotas</h3>
                    <div class="flex items-center space-x-4">
                        <input type="number" id="montoParaTodas" step="0.01" min="0" placeholder="Monto por cuota"
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-yellow-500">
                        <button onclick="aplicarMontoATodas(${registroId})" 
                                class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg">
                            Aplicar a Todas
                        </button>
                    </div>
                    <p class="text-xs text-yellow-700 mt-2">
                        * La última cuota se ajustará automáticamente con el saldo restante
                    </p>
                </div>
                
                <form id="editCuotasForm" onsubmit="handleEditCuotas(event, ${registroId})">
                    <div class="space-y-2 mb-6">
                        ${cuotasEditHTML}
                    </div>
                    
                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                            Actualizar Cuotas
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// NUEVA FUNCIÓN: Aplicar monto igual a todas las cuotas
function aplicarMontoATodas(registroId) {
    const monto = parseFloat(document.getElementById('montoParaTodas').value);
    if (!monto || monto <= 0) {
        showNotification('Por favor ingresa un monto válido', 'error');
        return;
    }
    
    const registro = db.getRegistroById(registroId);
    const cuotas = db.getCuotasByRegistroId(registroId).filter(c => c.numero > 0);
    const saldoAFinanciar = registro.monto_total - (registro.inicial || 0);
    
    // Aplicar el monto a todas las cuotas excepto la última
    cuotas.forEach((c, index) => {
        const input = document.getElementById(`cuota_${c.numero}`);
        if (input) {
            if (index === cuotas.length - 1) {
                // Última cuota: calcular el saldo restante
                const montoAcumulado = monto * (cuotas.length - 1);
                const ultimaCuota = saldoAFinanciar - montoAcumulado;
                input.value = ultimaCuota.toFixed(2);
            } else {
                input.value = monto.toFixed(2);
            }
        }
    });
    
    showNotification('Montos aplicados correctamente. La última cuota se ajustó con el saldo restante.', 'success');
}

// NUEVA FUNCIÓN: Ajustar cuotas automáticamente cuando se cambia un monto
function ajustarCuotasAutomaticamente(registroId) {
    const registro = db.getRegistroById(registroId);
    const cuotas = db.getCuotasByRegistroId(registroId).filter(c => c.numero > 0);
    const saldoAFinanciar = registro.monto_total - (registro.inicial || 0);
    
    // Calcular la suma de todas las cuotas editadas
    let sumaActual = 0;
    let ultimaCuotaInput = null;
    
    cuotas.forEach((c, index) => {
        const input = document.getElementById(`cuota_${c.numero}`);
        if (input) {
            const valor = parseFloat(input.value) || 0;
            if (index === cuotas.length - 1) {
                ultimaCuotaInput = input;
            } else {
                sumaActual += valor;
            }
        }
    });
    
    // Ajustar la última cuota automáticamente
    if (ultimaCuotaInput) {
        const ultimaCuotaMonto = saldoAFinanciar - sumaActual;
        ultimaCuotaInput.value = ultimaCuotaMonto.toFixed(2);
    }
}

// Modal para ver cuotas - ACTUALIZADO con descargas individuales
function showCuotasModal(registroId) {
    const registro = db.getRegistroById(registroId);
    const cuotas = db.getCuotasByRegistroId(registroId);
    
    if (!registro) {
        showNotification('Registro no encontrado', 'error');
        return;
    }

    let cuotasHTML = '';
    if (cuotas.length === 0) {
        cuotasHTML = '<tr><td colspan="10" class="text-center py-4 text-gray-500">No hay cuotas registradas para este cliente.</td></tr>';
    } else {
        cuotas.forEach(c => {
            const mora = c.numero > 0 ? calcularMora(c.monto, c.fecha_vencimiento, c.fecha_pago) : 0;
            const moraManual = c.mora_manual && Number(c.mora_manual) > 0 ? Number(c.mora_manual) : 0;
            const moraToShow = moraManual > 0 ? `${formatCurrency(moraManual)} <span class="text-xs text-gray-500">(manual)</span>` : formatCurrency(mora);
            const total = c.monto + (moraManual > 0 ? moraManual : mora);
            const estado = c.pagado ? '<span class="text-green-600 font-semibold">✅ Pagado</span>' : '<span class="text-red-600 font-semibold">❌ Pendiente</span>';
            const fechaPagoStr = c.pagado && c.fecha_pago ? formatFecha(c.fecha_pago) : '-';
            const cuotaDisplay = c.numero === 0 ? 'Inicial' : c.numero;
            
            const vouchers = db.getVouchersByCuotaId(c.id);
            const boletas = db.getBoletasByCuotaId(c.id);
            
            let accionHTML = '-';
            const _auth = getAuth();
            if (!c.pagado && _auth && _auth.isAdmin && _auth.isAdmin()) {
                accionHTML = `<button onclick="showPagarCuotaModal(${c.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">Registrar Pago</button>`;
            } else if (c.pagado && _auth && _auth.isAdmin && _auth.isAdmin()) {
                accionHTML = `<button onclick="showEditarPagoModal(${c.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm">✏️ Editar Pago</button>`;
            }
            
            // ACTUALIZADO: Botones de descarga individual
            const vouchersHTML = vouchers.length > 0 ? 
                vouchers.map(v => `
                    <div class="flex space-x-1 mb-1">
                        <button onclick="viewFile('${v.file_key || v.file_data}', '${v.file_name}')" class="text-blue-600 hover:text-blue-800 text-xs">Ver</button>
                        <button onclick="downloadFile('${v.file_key || v.file_data}', '${v.file_name}')" class="text-orange-500 hover:text-red-600 text-xs" aria-label="Descargar ${v.file_name}" title="Descargar ${v.file_name}" style="line-height:0">
                            <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M5 20h14v-2H5v2zm7-18L5.33 9h3.92v4h5.5V9h3.92L12 2z\"/></svg>
                        </button>
                    </div>
                `).join('') : '-';
            
            const boletasHTML = boletas.length > 0 ? 
                boletas.map(b => `
                    <div class="flex space-x-1 mb-1">
                        <button onclick="viewFile('${b.file_key || b.file_data}', '${b.file_name}')" class="text-blue-600 hover:text-blue-800 text-xs">Ver</button>
                        <button onclick="downloadFile('${b.file_key || b.file_data}', '${b.file_name}')" class="text-orange-500 hover:text-red-600 text-xs" aria-label="Descargar ${b.file_name}" title="Descargar ${b.file_name}" style="line-height:0">
                            <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M5 20h14v-2H5v2zm7-18L5.33 9h3.92v4h5.5V9h3.92L12 2z\"/></svg>
                        </button>
                    </div>
                `).join('') : '-';

            cuotasHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm">${cuotaDisplay}</td>
                    <td class="px-4 py-3 text-sm">${formatFecha(c.fecha_vencimiento)}</td>
                    <td class="px-4 py-3 text-sm">${formatCurrency(c.monto)}</td>
                    <td class="px-4 py-3 text-sm">${moraToShow} ${_auth && _auth.isAdmin && _auth.isAdmin() && c.numero > 0 ? `<button aria-label="Editar mora" title="Editar mora" onclick="editMoraModal(${c.id})" class="ml-2 text-indigo-600 hover:text-indigo-800 text-sm" style="line-height:0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>
                    </button>` : ''}</td>
                    <td class="px-4 py-3 text-sm">${formatCurrency(total)}</td>
                    <td class="px-4 py-3 text-sm">${fechaPagoStr}</td>
                    <td class="px-4 py-3 text-sm">${estado}</td>
                    <td class="px-4 py-3 text-sm">${accionHTML}</td>
                    <td class="px-4 py-3 text-sm">${vouchersHTML}</td>
                    <td class="px-4 py-3 text-sm">${boletasHTML}</td>
                </tr>
            `;
        });
    }

    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-chart-bar mr-3 text-blue-500"></i>Cuotas - ${registro.nombre1}
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
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
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boleta</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${cuotasHTML}
                        </tbody>
                    </table>
                </div>
                
                <div class="flex justify-between items-center mt-6">
                    <div class="space-x-4">
                        <button onclick="exportToPDF(${registroId})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-file-pdf mr-2"></i>Exportar PDF
                        </button>
                        <button onclick="exportToExcel(${registroId})" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-file-excel mr-2"></i>Exportar Excel
                        </button>
                    </div>
                    <button onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// ACTUALIZADA: Manejar edición de cuotas con fechas
function handleEditCuotas(event, registroId) {
    event.preventDefault();
    
    const cuotas = db.getCuotasByRegistroId(registroId).filter(c => c.numero > 0);
    const montosPersonalizados = [];
    const fechasPersonalizadas = [];
    
    // Recoger los montos y fechas editados
    cuotas.forEach(c => {
        const inputMonto = document.getElementById(`cuota_${c.numero}`);
        const inputFecha = document.getElementById(`fecha_${c.numero}`);
        if (inputMonto && inputFecha) {
            montosPersonalizados.push(parseFloat(inputMonto.value));
            fechasPersonalizadas.push(inputFecha.value);
        }
    });
    
    // Validar que la suma sea correcta
    const registro = db.getRegistroById(registroId);
    const saldoAFinanciar = registro.monto_total - (registro.inicial || 0);
    const sumaMontos = montosPersonalizados.reduce((sum, monto) => sum + monto, 0);
    
    if (Math.abs(sumaMontos - saldoAFinanciar) > 0.01) {
        showNotification(`La suma de cuotas (${formatCurrency(sumaMontos)}) debe ser igual al saldo a financiar (${formatCurrency(saldoAFinanciar)})`, 'error');
        return;
    }
    
    // Actualizar las cuotas existentes con montos y fechas
    cuotas.forEach((c, index) => {
        if (montosPersonalizados[index] !== undefined && fechasPersonalizadas[index] !== undefined) {
            db.updateCuota(c.id, { 
                monto: montosPersonalizados[index],
                fecha_vencimiento: fechasPersonalizadas[index]
            });
        }
    });
    
    showNotification('Cuotas actualizadas exitosamente', 'success');
    closeModal();
    
    // Recargar la sección actual
    loadSectionContent(currentSection);
}

// Funciones auxiliares para modales
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
    // Si fileData parece una data URL, mostrarla directamente
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

    // Si no es data URL, tratar fileData como clave en IndexedDB
    db.idbGet(fileData).then(blobOrFile => {
        if (!blobOrFile) return showNotification('Archivo no encontrado en almacenamiento', 'error');
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
        console.error('Error al leer archivo desde IndexedDB:', err);
        showNotification('Error al abrir archivo', 'error');
    });
}

// Exponer funciones globalmente para uso en HTML (onclick) y en app.js
// Usar typeof checks para evitar ReferenceError si alguna función fue definida en otro módulo (ej. app.js)
if (typeof createRegistrosTable === 'function') window.createRegistrosTable = createRegistrosTable;
if (typeof showNewRegistroModal === 'function') window.showNewRegistroModal = showNewRegistroModal;
if (typeof showEditCuotasModal === 'function') window.showEditCuotasModal = showEditCuotasModal;
if (typeof aplicarMontoATodas === 'function') window.aplicarMontoATodas = aplicarMontoATodas;
if (typeof ajustarCuotasAutomaticamente === 'function') window.ajustarCuotasAutomaticamente = ajustarCuotasAutomaticamente;
if (typeof showCuotasModal === 'function') window.showCuotasModal = showCuotasModal;
// showPagarCuotaModal and showEditarPagoModal are defined in app.js; app.js expondrá esas funciones
if (typeof handleEditCuotas === 'function') window.handleEditCuotas = handleEditCuotas;
if (typeof toggleCuotasFields === 'function') window.toggleCuotasFields = toggleCuotasFields;
if (typeof closeModal === 'function') window.closeModal = closeModal;
if (typeof viewFile === 'function') window.viewFile = viewFile;