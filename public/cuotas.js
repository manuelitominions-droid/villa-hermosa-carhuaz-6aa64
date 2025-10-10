// cuotas.js - Manejo de cuotas y pagos

// Función para esperar a que la base de datos esté lista
function waitForDatabase() {
    return new Promise((resolve) => {
        const checkDatabase = () => {
            if (window.database && typeof window.database.getRegistros === 'function') {
                resolve(window.database);
            } else {
                setTimeout(checkDatabase, 100);
            }
        };
        checkDatabase();
    });
}

// Helper seguro para obtener auth
function getAuth() {
    return window.auth || (typeof auth !== 'undefined' ? auth : null);
}

// Generar cuotas automáticamente al crear un registro
async function generarCuotasAutomaticamente(registroId, formaPago, montoTotal, inicial, numeroCuotas) {
    try {
        console.log(`🔄 Generando cuotas para registro ${registroId}:`, {
            formaPago, montoTotal, inicial, numeroCuotas
        });

        const db = await waitForDatabase();
        const cuotas = [];
        
        // Si es cuotas y tiene inicial, crear cuota inicial (número 0)
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
            const nuevaCuotaInicial = await db.addCuota(cuotaInicial);
            cuotas.push(nuevaCuotaInicial);
            console.log(`✅ Cuota inicial creada: ${formatCurrency(inicial)}`);
        }
        
        // Generar cuotas normales
        if (formaPago === 'cuotas' && numeroCuotas > 0) {
            const saldoAFinanciar = montoTotal - (inicial || 0);
            const montoCuotaBase = Math.round((saldoAFinanciar / numeroCuotas) * 100) / 100;
            
            console.log(`💰 Saldo a financiar: ${formatCurrency(saldoAFinanciar)}`);
            console.log(`📊 Monto por cuota: ${formatCurrency(montoCuotaBase)}`);
            
            // Calcular fechas de vencimiento
            const fechaPeru = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Lima"}));
            let mes = fechaPeru.getMonth() + 1; // Mes actual
            let anio = fechaPeru.getFullYear();
            
            for (let i = 0; i < numeroCuotas; i++) {
                // Avanzar al siguiente mes
                mes += 1;
                if (mes > 12) {
                    mes = 1;
                    anio += 1;
                }
                
                // Último día del mes
                const ultimoDiaDelMes = new Date(anio, mes, 0).getDate();
                const fechaVencimiento = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaDelMes.toString().padStart(2, '0')}`;
                
                // Calcular monto (la última cuota ajusta el saldo restante)
                let montoFinal = montoCuotaBase;
                if (i === numeroCuotas - 1) {
                    // Última cuota: ajustar con el saldo exacto
                    const montoAcumulado = montoCuotaBase * (numeroCuotas - 1);
                    montoFinal = Math.round((saldoAFinanciar - montoAcumulado) * 100) / 100;
                }
                
                const cuota = {
                    registro_id: registroId,
                    numero: i + 1,
                    fecha_vencimiento: fechaVencimiento,
                    monto: montoFinal,
                    pagado: 0
                };
                
                const nuevaCuota = await db.addCuota(cuota);
                cuotas.push(nuevaCuota);
            }
            
            console.log(`✅ ${numeroCuotas} cuotas generadas correctamente`);
            
        } else if (formaPago === 'contado') {
            // Para contado, crear una sola cuota con el monto total
            const fechaHoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
            const cuotaContado = {
                registro_id: registroId,
                numero: 1,
                fecha_vencimiento: fechaHoyPeru,
                monto: montoTotal,
                pagado: 1,
                fecha_pago: fechaHoyPeru
            };
            
            const nuevaCuotaContado = await db.addCuota(cuotaContado);
            cuotas.push(nuevaCuotaContado);
            console.log(`✅ Cuota de contado creada: ${formatCurrency(montoTotal)}`);
        }
        
        return cuotas;
        
    } catch (error) {
        console.error('❌ Error generando cuotas:', error);
        throw error;
    }
}

// Modal para registrar pago de cuota
async function showPagarCuotaModal(cuotaId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para registrar pagos', 'error');
        return;
    }
    
    const db = await waitForDatabase();
    const cuota = await db.getCuotaById(cuotaId);
    
    if (!cuota) {
        showNotification('Cuota no encontrada', 'error');
        return;
    }
    
    const registro = db.getRegistroById(cuota.registro_id);
    const mora = calcularMora(cuota.monto, cuota.fecha_vencimiento, null);
    const total = cuota.monto + mora;
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-money-bill mr-3 text-green-500"></i>Registrar Pago
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <strong>Cliente:</strong> ${registro?.nombre1}<br>
                        <strong>Cuota N°:</strong> ${cuota.numero === 0 ? 'Inicial' : cuota.numero}<br>
                        <strong>Monto:</strong> ${formatCurrency(cuota.monto)}<br>
                        <strong>Mora:</strong> ${formatCurrency(mora)}<br>
                        <strong>Total a pagar:</strong> ${formatCurrency(total)}
                    </p>
                </div>
                
                <form id="pagarCuotaForm" onsubmit="handlePagarCuota(event, '${cuotaId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha de Pago *</label>
                            <input type="date" name="fecha_pago" required value="${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Monto Pagado *</label>
                            <input type="number" name="monto_pagado" step="0.01" min="0" value="${total}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                            <textarea name="observaciones" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-4 mt-6">
                        <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
                            Registrar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// Manejar pago de cuota
async function handlePagarCuota(event, cuotaId) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const db = await waitForDatabase();
        
        const updateData = {
            pagado: 1,
            fecha_pago: formData.get('fecha_pago'),
            monto_pagado: parseFloat(formData.get('monto_pagado')),
            observaciones: formData.get('observaciones') || null
        };
        
        await db.updateCuota(cuotaId, updateData);
        
        showNotification('Pago registrado exitosamente', 'success');
        closeModal();
        
        // Recargar modal de cuotas si está abierto
        const modal = document.getElementById('modalContainer');
        if (modal && modal.innerHTML.includes('Cuotas -')) {
            const cuota = await db.getCuotaById(cuotaId);
            if (cuota) {
                showCuotasModal(cuota.registro_id);
            }
        }
        
        // Recargar la sección actual
        if (typeof loadSectionContent === 'function' && window.currentSection) {
            loadSectionContent(window.currentSection);
        }
        
    } catch (error) {
        console.error('❌ Error registrando pago:', error);
        showNotification('Error al registrar el pago', 'error');
    }
}

// Modal para editar pago existente
async function showEditarPagoModal(cuotaId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para editar pagos', 'error');
        return;
    }
    
    const db = await waitForDatabase();
    const cuota = await db.getCuotaById(cuotaId);
    
    if (!cuota) {
        showNotification('Cuota no encontrada', 'error');
        return;
    }
    
    const registro = db.getRegistroById(cuota.registro_id);
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-3 text-orange-500"></i>Editar Pago
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div class="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <strong>Cliente:</strong> ${registro?.nombre1}<br>
                        <strong>Cuota N°:</strong> ${cuota.numero === 0 ? 'Inicial' : cuota.numero}<br>
                        <strong>Monto original:</strong> ${formatCurrency(cuota.monto)}
                    </p>
                </div>
                
                <form id="editarPagoForm" onsubmit="handleEditarPago(event, '${cuotaId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha de Pago *</label>
                            <input type="date" name="fecha_pago" required value="${cuota.fecha_pago || ''}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Monto Pagado *</label>
                            <input type="number" name="monto_pagado" step="0.01" min="0" value="${cuota.monto_pagado || cuota.monto}" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                            <textarea name="observaciones" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">${cuota.observaciones || ''}</textarea>
                        </div>
                        
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" id="marcarNoPagado" name="marcar_no_pagado" class="rounded">
                            <label for="marcarNoPagado" class="text-sm text-gray-700">Marcar como no pagado</label>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-4 mt-6">
                        <button type="button" onclick="closeModal()" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg">
                            Actualizar Pago
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// Manejar edición de pago
async function handleEditarPago(event, cuotaId) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const db = await waitForDatabase();
        
        const marcarNoPagado = formData.get('marcar_no_pagado');
        
        const updateData = {
            pagado: marcarNoPagado ? 0 : 1,
            fecha_pago: marcarNoPagado ? null : formData.get('fecha_pago'),
            monto_pagado: marcarNoPagado ? null : parseFloat(formData.get('monto_pagado')),
            observaciones: formData.get('observaciones') || null
        };
        
        await db.updateCuota(cuotaId, updateData);
        
        showNotification('Pago actualizado exitosamente', 'success');
        closeModal();
        
        // Recargar modal de cuotas si está abierto
        const modal = document.getElementById('modalContainer');
        if (modal && modal.innerHTML.includes('Cuotas -')) {
            const cuota = await db.getCuotaById(cuotaId);
            if (cuota) {
                showCuotasModal(cuota.registro_id);
            }
        }
        
        // Recargar la sección actual
        if (typeof loadSectionContent === 'function' && window.currentSection) {
            loadSectionContent(window.currentSection);
        }
        
    } catch (error) {
        console.error('❌ Error editando pago:', error);
        showNotification('Error al editar el pago', 'error');
    }
}

// Modal para editar mora manual
async function editMoraModal(cuotaId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para editar mora', 'error');
        return;
    }
    
    const db = await waitForDatabase();
    const cuota = await db.getCuotaById(cuotaId);
    
    if (!cuota) {
        showNotification('Cuota no encontrada', 'error');
        return;
    }
    
    const moraCalculada = calcularMora(cuota.monto, cuota.fecha_vencimiento, cuota.fecha_pago);
    const moraManual = cuota.mora_manual || 0;
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Editar Mora</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
                
                <div class="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <p><strong>Mora calculada:</strong> ${formatCurrency(moraCalculada)}</p>
                    <p><strong>Mora manual actual:</strong> ${formatCurrency(moraManual)}</p>
                </div>
                
                <form onsubmit="handleEditMora(event, '${cuotaId}')">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nueva mora manual</label>
                        <input type="number" name="mora_manual" step="0.01" min="0" value="${moraManual}" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                    </div>
                    
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">
                            Actualizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// Manejar edición de mora
async function handleEditMora(event, cuotaId) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const db = await waitForDatabase();
        
        const moraManual = parseFloat(formData.get('mora_manual')) || 0;
        
        await db.updateCuota(cuotaId, { mora_manual: moraManual });
        
        showNotification('Mora actualizada exitosamente', 'success');
        closeModal();
        
        // Recargar modal de cuotas si está abierto
        const modal = document.getElementById('modalContainer');
        if (modal && modal.innerHTML.includes('Cuotas -')) {
            const cuota = await db.getCuotaById(cuotaId);
            if (cuota) {
                showCuotasModal(cuota.registro_id);
            }
        }
        
    } catch (error) {
        console.error('❌ Error editando mora:', error);
        showNotification('Error al editar la mora', 'error');
    }
}

// Función de confirmación para acciones críticas
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Exponer funciones globalmente
window.generarCuotasAutomaticamente = generarCuotasAutomaticamente;
window.showPagarCuotaModal = showPagarCuotaModal;
window.handlePagarCuota = handlePagarCuota;
window.showEditarPagoModal = showEditarPagoModal;
window.handleEditarPago = handleEditarPago;
window.editMoraModal = editMoraModal;
window.handleEditMora = handleEditMora;
window.confirmAction = confirmAction;

console.log('✅ Cuotas.js cargado correctamente');
