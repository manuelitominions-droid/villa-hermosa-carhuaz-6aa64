import { debounce } from './utils.js';

// app.js - Lógica principal de la aplicación

// Importar la instancia de base de datos
import { database } from './database-firebase.js';

// Hacer la instancia disponible globalmente como 'db'
window.db = database;
const db = database;

// Helper seguro para obtener la instancia de auth (puede estar en window o en el scope del módulo auth.js)
function getAuth() {
    return window.auth || (typeof auth !== 'undefined' ? auth : null);
}

// Helper: envuelve una promesa con timeout para evitar hangs
function promiseWithTimeout(promise, ms, errMsg) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errMsg || `Timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeoutPromise]);
}

// Subir archivo con timeout por tipo (voucher/boleta)
function uploadWithTimeout(file, cuotaId, tipo, timeoutMs = 30000) {
    return promiseWithTimeout(new Promise((resolve, reject) => {
        handleFileUpload(file, cuotaId, tipo).then(resolve).catch(reject);
    }), timeoutMs, `Upload ${file.name} timed out after ${timeoutMs}ms`);
}

// Subir con reintentos y backoff exponencial
function uploadWithRetry(file, cuotaId, tipo, options = {}) {
    const { retries = 2, timeoutMs = 45000, backoffBase = 800 } = options;

    const attempt = (n) => {
        return uploadWithTimeout(file, cuotaId, tipo, timeoutMs).then(res => ({ status: 'fulfilled', fileName: file.name, res, tipo }))
            .catch(err => {
                if (n <= 0) return { status: 'rejected', fileName: file.name, err, tipo };
                const delay = backoffBase * Math.pow(2, (options.retries - n));
                console.warn(`Upload failed for ${file.name}. Retrying in ${delay}ms... (${n} retries left)`);
                return new Promise(resolve => setTimeout(resolve, delay)).then(() => attempt(n - 1));
            });
    };

    return attempt(retries);
}

// Variables globales
let currentSection = 'inicio';

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay usuario logueado
    // Usar getAuth() para obtener la instancia de auth de forma segura
    const _auth = getAuth();
    if (_auth && typeof _auth.updateUI === 'function') {
        _auth.updateUI();
    }
    
    // Si está logueado, mostrar la sección de inicio (showSection puede estar definido luego)
    if (_auth && typeof _auth.isLoggedIn === 'function' && _auth.isLoggedIn()) {
        if (typeof showSection === 'function') showSection('inicio');
    }
});

// Navegación entre secciones
function showSection(sectionName) {
    // Ocultar todas las secciones
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.remove('hidden');
    currentSection = sectionName;
    // Mantener una referencia global para otros scripts que no son módulos
    try { window.currentSection = currentSection; } catch (e) { /* ignore */ }
        
        // Cargar contenido específico de la sección
        loadSectionContent(sectionName);
        
        // Actualizar navegación activa
        updateActiveNav(sectionName);
    }
}

function updateActiveNav(sectionName) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-white', 'ring-opacity-50');
    });
    
    // Encontrar y activar el botón correspondiente
    const activeButton = Array.from(navButtons).find(btn => 
        btn.onclick && btn.onclick.toString().includes(sectionName)
    );
    if (activeButton) {
        activeButton.classList.add('ring-2', 'ring-white', 'ring-opacity-50');
    }
}

// Cargar contenido específico de cada sección
async function loadSectionContent(sectionName) {
    switch (sectionName) {
        case 'inicio':
            loadInicioContent();
            break;
        case 'clientes':
            await loadClientesContent();
            break;
        case 'proyeccion':
            await loadProyeccionContent();
            break;
        case 'estadisticas':
            await loadEstadisticasContent();
            break;
        case 'pendientes':
            await loadPendientesContent();
            break;
        case 'atrasados':
            await loadAtrasadosContent();
            break;
        case 'reporte-mensual':
            await loadReporteMensualContent();
            break;
        case 'crear-usuario':
            loadCrearUsuarioContent();
            break;
    }
}

// Contenido de la sección Inicio
function loadInicioContent() {
    // El contenido de inicio ya está en el HTML
    // Solo necesitamos limpiar los resultados de búsqueda
    document.getElementById('searchResults').innerHTML = '';
    
    // Mostrar el botón "Nuevo Registro" si el usuario tiene permisos
    const _auth = getAuth();
    const nuevoRegistroBtn = document.getElementById('nuevoRegistroBtn');
    if (nuevoRegistroBtn && _auth && _auth.isAdmin && _auth.isAdmin()) {
        nuevoRegistroBtn.classList.remove('hidden');
    }
}

// Manejo de búsqueda
async function handleSearch(event) {
    try {
        event.preventDefault();

        const manzana = document.getElementById('searchManzana').value.trim();
        const lote = document.getElementById('searchLote').value.trim();
        const query = document.getElementById('searchQuery').value.trim();

        console.log('Buscar registros con:', { manzana, lote, query });

        const searchResult = await db.searchRegistros({ manzana, lote, query });
        const resultsContainer = document.getElementById('searchResults');

        if (searchResult.error) {
            console.warn('searchRegistros error:', searchResult.error);
            resultsContainer.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    <strong>❌ ${searchResult.error}</strong>
                </div>
            `;
            return;
        }

        if (!searchResult.results || searchResult.results.length === 0) {
            console.info('searchRegistros no encontró resultados');
            let mensaje = "No se encontraron registros";
            if (manzana && lote) {
                mensaje = `No se encontró ningún cliente en Manzana '${manzana}' y Lote '${lote}'`;
                if (query) {
                    mensaje += ` con DNI/Nombre '${query}'`;
                }
            } else if (query) {
                mensaje = `No se encontró ningún cliente con DNI/Nombre '${query}'`;
            }

            resultsContainer.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
                    <strong>⚠️ ${mensaje}</strong>
                </div>
            `;
            return;
        }

        // Mostrar resultados
        resultsContainer.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Resultados de búsqueda (${searchResult.results.length})</h3>
                ${createRegistrosTable(searchResult.results)}
            </div>
        `;
    } catch (err) {
        console.error('Error en handleSearch:', err);
        showNotification('Error al realizar búsqueda. Revisa la consola para más detalles.', 'error');
    }
}

// Contenido de la sección Clientes
async function loadClientesContent() {
    try {
        const registros = await db.getRegistros();
        const sortedRegistros = registros.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));
        
        document.getElementById('clientesCount').textContent = `Total de clientes: ${sortedRegistros.length}`;
        document.getElementById('clientesTable').innerHTML = createRegistrosTable(sortedRegistros);
    } catch (error) {
        console.error('Error cargando clientes:', error);
        document.getElementById('clientesCount').textContent = 'Error cargando clientes';
        document.getElementById('clientesTable').innerHTML = '<div class="text-red-500">Error al cargar los datos</div>';
    }
}

// Filtrar clientes
const filterClientes = debounce(async function() {
    try {
        const query = document.getElementById('clientesSearch').value.trim().toLowerCase();
        const registros = await db.getRegistros();
        
        let filteredRegistros = registros;
        if (query) {
            filteredRegistros = registros.filter(r =>
                (r.nombre1 && r.nombre1.toLowerCase().includes(query)) ||
                (r.nombre2 && r.nombre2.toLowerCase().includes(query)) ||
                (r.dni1 && r.dni1.includes(query)) ||
                (r.dni2 && r.dni2.includes(query))
            );
        }
        
        filteredRegistros.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));
        
        document.getElementById('clientesCount').textContent = `Total de clientes: ${filteredRegistros.length}`;
        document.getElementById('clientesTable').innerHTML = createRegistrosTable(filteredRegistros);
    } catch (error) {
        console.error('Error filtrando clientes:', error);
    }
}, 300);

// Contenido de la sección Proyección
async function loadProyeccionContent() {
    try {
        // Proyección: opción de seleccionar mes y ver timeline hasta última cuota
        const nextMonth = getNextMonth();
        const defaultEnd = await db.getLastCuotaMonth() || nextMonth;

        // Inicializar estado de vista de proyección (se usará para exportar lo visible)
        window._currentProjectionView = { mode: 'single', month: nextMonth, start: null, end: null };

        document.getElementById('proyeccionContent').innerHTML = `
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xl font-semibold text-gray-800">Proyección de Ingresos</h3>
                    <div class="flex items-center space-x-2">
                        <input type="month" id="proyeccionMonth" value="${nextMonth}" class="px-3 py-2 border border-gray-300 rounded-lg">
                        <button onclick="showProjectionSingle()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Ver mes</button>
                        <button onclick="showProjectionTimeline()" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg">Ver proyección mes a mes</button>
                        <button onclick="exportProjectionPDF()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Exportar PDF</button>
                    </div>
                </div>

                <div class="flex items-center space-x-2">
                    <label class="text-sm">Ver rango histórico:</label>
                    <input type="month" id="proyeccionStart" value="${defaultEnd}" class="px-3 py-2 border border-gray-300 rounded-lg">
                    <input type="month" id="proyeccionEnd" value="${defaultEnd}" class="px-3 py-2 border border-gray-300 rounded-lg">
                    <button onclick="showProjectionRange(document.getElementById('proyeccionStart').value, document.getElementById('proyeccionEnd').value)" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Ver rango</button>
                </div>

                <div id="proyeccionResult"></div>
            </div>
        `;

        // Mostrar valor inicial de la proyección para el mes por defecto
        await showProjectionSingle();
    } catch (error) {
        console.error('Error cargando proyección:', error);
        document.getElementById('proyeccionContent').innerHTML = '<div class="text-red-500">Error al cargar proyección</div>';
    }
}

// Mostrar proyección para un mes seleccionado
async function showProjectionSingle() {
    try {
        const mes = document.getElementById('proyeccionMonth').value || getNextMonth();
        // marcar vista actual
        window._currentProjectionView = { mode: 'single', month: mes, start: null, end: null };
        const proj = await db.getProjectionForMonth(mes);

        // Vista simple: solo dos cuadros como en la versión original
        const monto = proj.totalProjected || 0;
        const cuotasCount = proj.count || 0;

        document.getElementById('proyeccionResult').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-indigo-50 p-6 rounded-lg">
                    <h4 class="text-lg font-semibold text-indigo-800 mb-2">Número de cuotas</h4>
                    <p class="text-3xl font-bold text-indigo-600">${cuotasCount}</p>
                </div>
                <div class="bg-purple-50 p-6 rounded-lg">
                    <h4 class="text-lg font-semibold text-purple-800 mb-2">Total proyectado</h4>
                    <p class="text-3xl font-bold text-purple-600">${formatCurrency(monto)}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error en showProjectionSingle:', error);
        document.getElementById('proyeccionResult').innerHTML = '<div class="text-red-500">Error al cargar proyección</div>';
    }
}

// Mostrar proyección timeline desde next month hasta last cuota month
async function showProjectionTimeline() {
    try {
        const start = getNextMonth();
        const end = await db.getLastCuotaMonth() || start;
        // marcar vista timeline
        window._currentProjectionView = { mode: 'timeline', month: null, start, end };
        const timeline = await db.getProjectionTimeline(start, end);

        if (!timeline || timeline.length === 0) {
            document.getElementById('proyeccionResult').innerHTML = '<div class="text-sm text-gray-500">No hay cuotas para proyectar.</div>';
            return;
        }

        // Render a styled table: alternating rows, header highlight, right-aligned amounts
        const rows = timeline.map(t => `
            <tr class="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                <td class="px-4 py-3 text-sm text-gray-700">${getMonthName(t.month)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${t.count}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-gray-800">${formatCurrency(t.totalProjected)}</td>
            </tr>
        `).join('');

        document.getElementById('proyeccionResult').innerHTML = `
            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-2">Proyección mes a mes (${getMonthName(start)} → ${getMonthName(end)})</h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead class="bg-indigo-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase">Mes</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase"># Cuotas</th>
                                <th class="px-4 py-3 text-right text-xs font-medium text-indigo-700 uppercase">Proyectado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error en showProjectionTimeline:', error);
        document.getElementById('proyeccionResult').innerHTML = '<div class="text-red-500">Error al cargar timeline</div>';
    }
}

// Exportar la proyección visible (mes seleccionado) a PDF — usa exportReporteMensualPDF como base
function exportProjectionPDF() {
    try {
        const view = window._currentProjectionView || { mode: 'single' };
        if (view.mode === 'single') {
            const mes = view.month || document.getElementById('proyeccionMonth').value || getNextMonth();
            if (typeof exportProjectionMonthPDF === 'function') return exportProjectionMonthPDF(mes);
            if (typeof exportReporteMensualPDF === 'function') return exportReporteMensualPDF(mes);
        } else if (view.mode === 'timeline' || view.mode === 'range') {
            const start = view.start || document.getElementById('proyeccionStart')?.value || getNextMonth();
            const end = view.end || document.getElementById('proyeccionEnd')?.value || getNextMonth();
            if (typeof exportProjectionTimelinePDF === 'function') return exportProjectionTimelinePDF(start, end);
        }

        showNotification('Función de exportar no disponible para la vista actual', 'error');
    } catch (e) {
        console.error('Error exportProjectionPDF', e);
        showNotification('Error al exportar proyección', 'error');
    }
}

// Mostrar proyección para un rango arbitrario (start..end). Permite ver proyecciones pasadas.
async function showProjectionRange(startMonth, endMonth) {
    try {
        if (!startMonth || !endMonth) return showNotification('Selecciona mes de inicio y fin', 'error');
        // Normalizar orden
        if (startMonth > endMonth) {
            const tmp = startMonth; startMonth = endMonth; endMonth = tmp;
        }

        // marcar vista rango
        window._currentProjectionView = { mode: 'range', month: null, start: startMonth, end: endMonth };

        // Obtener timeline para el rango
        const timeline = await db.getProjectionTimeline(startMonth, endMonth);
        if (!timeline || timeline.length === 0) {
            document.getElementById('proyeccionResult').innerHTML = '<div class="text-sm text-gray-500">No hay datos en ese rango.</div>';
            return;
        }

        const rows = timeline.map(t => `
            <tr class="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                <td class="px-4 py-3 text-sm text-gray-700">${getMonthName(t.month)}</td>
                <td class="px-4 py-3 text-sm text-gray-700">${t.count}</td>
                <td class="px-4 py-3 text-sm text-right font-medium text-gray-800">${formatCurrency(t.totalProjected)}</td>
            </tr>
        `).join('');

        document.getElementById('proyeccionResult').innerHTML = `
            <div>
                <h4 class="text-lg font-semibold text-gray-800 mb-2">Proyección (${getMonthName(startMonth)} → ${getMonthName(endMonth)})</h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead class="bg-indigo-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase">Mes</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase"># Cuotas</th>
                                <th class="px-4 py-3 text-right text-xs font-medium text-indigo-700 uppercase">Proyectado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error en showProjectionRange:', error);
        document.getElementById('proyeccionResult').innerHTML = '<div class="text-red-500">Error al cargar rango</div>';
    }
}

// Exportar timeline completo (desde nextMonth hasta last cuota month)
async function exportProjectionTimeline() {
    try {
        const start = getNextMonth();
        const end = await db.getLastCuotaMonth() || start;
        if (typeof exportProjectionTimelinePDF === 'function') {
            exportProjectionTimelinePDF(start, end);
        } else {
            showNotification('Función de exportar proyección no disponible', 'error');
        }
    } catch (e) {
        console.error('Error exportProjectionTimeline', e);
        showNotification('Error al exportar proyección', 'error');
    }
}

// ACTUALIZADO: Contenido de la sección Estadísticas con nueva estructura
async function loadEstadisticasContent() {
    try {
        const currentMonth = getCurrentMonth();
        const monthName = getMonthName(currentMonth);
        const stats = await db.getEstadisticasMes(currentMonth);
        
        document.getElementById('estadisticasContent').innerHTML = `
            <div class="space-y-6">
                <div class="flex items-start justify-between">
                    <h3 class="text-xl font-semibold text-gray-800">Estadísticas de ${monthName}</h3>
                    <div class="flex items-center space-x-3">
                        <button onclick="exportEstadisticasPDF('${currentMonth}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                            <i class="fas fa-file-pdf mr-2"></i>Exportar PDF
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-blue-800 mb-2">Total de Cuotas</h4>
                        <p class="text-3xl font-bold text-blue-600">${stats.totalCuotas || 0}</p>
                        <p class="text-xs text-blue-600 mt-1">Cuotas que vencen este mes</p>
                    </div>
                    <div class="bg-orange-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-orange-800 mb-2">Cuotas Adelantadas</h4>
                        <p class="text-3xl font-bold text-orange-600">${stats.numAdelantadas || 0}</p>
                        <p class="text-sm text-orange-600">${formatCurrency(stats.montoAdelantadas || 0)}</p>
                        <p class="text-xs text-orange-600 mt-1">Pagadas este mes, vencen después</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-green-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-green-800 mb-2">Cuotas Pagadas</h4>
                        <p class="text-3xl font-bold text-green-600">${stats.numPagadas || 0}</p>
                        <p class="text-sm text-green-600">(${(stats.porcentajePagado || 0).toFixed(1)}%) - ${formatCurrency(stats.montoCuotasPagadas || 0)}</p>
                    </div>
                    <div class="bg-red-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-red-800 mb-2">Cuotas Pendientes</h4>
                        <p class="text-3xl font-bold text-red-600">${stats.noPagadas || 0}</p>
                        <p class="text-sm text-red-600">(${(stats.porcentajeNoPagado || 0).toFixed(1)}%) - ${formatCurrency(stats.montoCuotasPendientes || 0)}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-yellow-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-yellow-800 mb-2">Monto Proyectado</h4>
                        <p class="text-2xl font-bold text-yellow-600">${formatCurrency(stats.totalProyectado || 0)}</p>
                        <p class="text-xs text-yellow-600 mt-1">Lo que se esperaba recibir este mes</p>
                    </div>
                    <div class="bg-purple-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-purple-800 mb-2">Monto Ingresado</h4>
                        <p class="text-2xl font-bold text-purple-600">${formatCurrency(stats.montoPagado || 0)}</p>
                        <p class="text-sm text-purple-600">(${(stats.totalProyectado || 0) > 0 ? ((stats.montoPagado || 0) / (stats.totalProyectado || 1) * 100).toFixed(1) : 0}% del proyectado)</p>
                        <p class="text-xs text-purple-600 mt-1">Incluye cuotas del mes + adelantadas</p>
                    </div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-semibold text-gray-700 mb-2">💡 Interpretación de los datos:</h4>
                    <div class="text-xs text-gray-600 space-y-1">
                        <p>• <strong>Total de Cuotas:</strong> Solo cuenta cuotas N° 1 en adelante que vencen este mes (no incluye iniciales).</p>
                        <p>• <strong>Cuotas Adelantadas:</strong> Clientes que pagaron cuotas de meses futuros durante este mes.</p>
                        <p>• <strong>Monto Proyectado:</strong> Se calcula multiplicando cada cuota por su monto según el registro del cliente.</p>
                        <p>• <strong>Monto Ingresado:</strong> Suma de cuotas pagadas del mes + cuotas adelantadas.</p>
                        <p>• Si el <strong>Monto Ingresado</strong> es mayor al <strong>Proyectado</strong>, significa que hay pagos adelantados.</p>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        document.getElementById('estadisticasContent').innerHTML = '<div class="text-red-500">Error al cargar estadísticas</div>';
    }
}

// Contenido de la sección Pendientes
async function loadPendientesContent() {
    try {
        const currentMonth = getCurrentMonth();
        const monthName = getMonthName(currentMonth);
        const pendientes = await db.getPendientesMes(currentMonth);
        
        let pendientesHTML = '';
        if (!pendientes || pendientes.length === 0) {
            pendientesHTML = '<div class="text-center py-8 text-green-600 font-semibold">✅ Todos los clientes han pagado su cuota este mes.</div>';
        } else {
            let skipped = 0;
            pendientesHTML = '<ul class="space-y-4">';
            pendientes.forEach(p => {
                // Defensive: skip entries missing the linked registro to avoid runtime errors
                if (!p || !p.registro) {
                    skipped++;
                    console.warn('[loadPendientesContent] Omitiendo pendiente sin registro asociado:', p);
                    return;
                }

                const mora = calcularMora(p.monto, p.fecha_vencimiento, p.fecha_pago);
                const montoTotal = (typeof p.monto === 'number' ? p.monto : parseFloat(p.monto) || 0) + (mora || 0);
                const montoStr = mora > 0 ? `${formatCurrency(montoTotal)} (incluye mora)` : formatCurrency(p.monto || 0);

                pendientesHTML += `
                    <li class="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-semibold text-red-800">${p.registro.nombre1 || ''} ${p.registro.apellido1 || ''}</h4>
                                <p class="text-sm text-red-600">DNI: ${p.registro.dni1 || ''} | Celular: ${p.registro.celular1 || 'N/A'}</p>
                                <p class="text-sm text-red-600">Manzana: ${p.registro.manzana || ''} | Lote: ${p.registro.lote || ''}</p>
                                <p class="text-sm text-red-600">Cuota N° ${p.numero} - Vence: ${formatFecha(p.fecha_vencimiento)}</p>
                                <p class="font-semibold text-red-800">Monto a pagar: ${montoStr}</p>
                            </div>
                            <button onclick="showCuotasModal(${p.registro_id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm">
                                Ver Detalle
                            </button>
                        </div>
                    </li>
                `;
            });
            pendientesHTML += '</ul>';

            if (skipped > 0) {
                pendientesHTML += `
                    <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                        Se omitieron ${skipped} pendiente(s) por datos incompletos. Revisa la integridad de la base de datos.
                    </div>
                `;
            }
        }

        document.getElementById('pendientesContent').innerHTML = `
            <div class="space-y-4">
                <h3 class="text-xl font-semibold text-gray-800">Cuotas Pendientes de ${monthName}</h3>
                ${pendientesHTML}
            </div>
        `;
    } catch (error) {
        console.error('Error cargando pendientes:', error);
        document.getElementById('pendientesContent').innerHTML = '<div class="text-red-500">Error al cargar pendientes</div>';
    }
}

// Contenido de la sección Atrasados
async function loadAtrasadosContent() {
    try {
        const atrasados = await db.getAtrasados();
        
        let atrasadosHTML = '';
        if (!atrasados || atrasados.length === 0) {
            atrasadosHTML = '<div class="text-center py-8 text-green-600 font-semibold">✅ No hay clientes con cuotas atrasadas.</div>';
        } else {
            atrasadosHTML = '<ul class="space-y-4">';
            atrasados.forEach(a => {
                if (a && a.registro) {
                    atrasadosHTML += `
                        <li class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-semibold text-orange-800">${a.registro.nombre1 || ''}</h4>
                                    <p class="text-sm text-orange-600">DNI: ${a.registro.dni1 || ''} | Celular: ${a.registro.celular1 || 'N/A'}</p>
                                    <p class="text-sm text-orange-600">Manzana: ${a.registro.manzana || ''} | Lote: ${a.registro.lote || ''}</p>
                                    <p class="font-semibold text-orange-800">Debe ${a.cuotasPendientes || 0} cuotas atrasadas</p>
                                </div>
                                <button onclick="showCuotasModal(${a.registro.id})" class="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm">
                                    Ver Detalle
                                </button>
                            </div>
                        </li>
                    `;
                }
            });
            atrasadosHTML += '</ul>';
        }
        
        document.getElementById('atrasadosContent').innerHTML = `
            <div class="space-y-4">
                <h3 class="text-xl font-semibold text-gray-800">Clientes con Cuotas Atrasadas</h3>
                ${atrasadosHTML}
            </div>
        `;
    } catch (error) {
        console.error('Error cargando atrasados:', error);
        document.getElementById('atrasadosContent').innerHTML = '<div class="text-red-500">Error al cargar atrasados</div>';
    }
}

// Contenido de la sección Reporte Mensual
async function loadReporteMensualContent() {
    const currentMonth = getCurrentMonth();
    
    document.getElementById('reporteMensualContent').innerHTML = `
        <div class="space-y-6">
            <div class="flex items-center space-x-4">
                <label class="text-sm font-medium text-gray-700">Seleccionar mes:</label>
                <input type="month" id="reporteMonth" value="${currentMonth}" onchange="updateReporteMensual()" 
                       class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500">
                <button onclick="exportReporteMensualPDF(document.getElementById('reporteMonth').value)" 
                        class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-file-pdf mr-2"></i>Exportar PDF
                </button>
            </div>
            <div id="reporteContent"></div>
        </div>
    `;
    
    await updateReporteMensual();
}

async function updateReporteMensual() {
    try {
        const selectedMonth = document.getElementById('reporteMonth').value;
        const reporte = await db.getReporteMensual(selectedMonth);
        const monthName = getMonthName(selectedMonth);
        
        let registrosHTML = '';
        if (!reporte.registros || reporte.registros.length === 0) {
            registrosHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">No hay registros en este mes.</td></tr>';
        } else {
            reporte.registros.forEach(r => {
                const inicialStr = r.forma_pago === 'cuotas' ? formatCurrency(r.inicial || 0) : '-';
                registrosHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm">${formatFecha(r.fecha_registro)}</td>
                        <td class="px-4 py-3 text-sm">${r.nombre1 || ''}</td>
                        <td class="px-4 py-3 text-sm">${r.dni1 || ''}</td>
                        <td class="px-4 py-3 text-sm">${r.manzana || ''}</td>
                        <td class="px-4 py-3 text-sm">${r.lote || ''}</td>
                        <td class="px-4 py-3 text-sm">${r.forma_pago ? r.forma_pago.charAt(0).toUpperCase() + r.forma_pago.slice(1) : ''}</td>
                        <td class="px-4 py-3 text-sm">${formatCurrency(r.monto_total || 0)}</td>
                        <td class="px-4 py-3 text-sm">${inicialStr}</td>
                    </tr>
                `;
            });
        }
        
        document.getElementById('reporteContent').innerHTML = `
            <div class="space-y-6">
                <h3 class="text-xl font-semibold text-gray-800">Resumen de ${monthName}</h3>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="text-sm font-semibold text-blue-800">Total Clientes</h4>
                        <p class="text-2xl font-bold text-blue-600">${reporte.totalClientes || 0}</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="text-sm font-semibold text-green-800">Con Cuotas</h4>
                        <p class="text-2xl font-bold text-green-600">${reporte.totalCuotas || 0}</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="text-sm font-semibold text-purple-800">Al Contado</h4>
                        <p class="text-2xl font-bold text-purple-600">${reporte.totalContado || 0}</p>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h4 class="text-sm font-semibold text-yellow-800">Total Ingresos</h4>
                        <p class="text-xl font-bold text-yellow-600">${formatCurrency(reporte.totalGeneral || 0)}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-teal-50 p-4 rounded-lg">
                        <h4 class="text-sm font-semibold text-teal-800">Ingresos por Iniciales</h4>
                        <p class="text-xl font-bold text-teal-600">${formatCurrency(reporte.inicialesCuotas || 0)}</p>
                    </div>
                    <div class="bg-indigo-50 p-4 rounded-lg">
                        <h4 class="text-sm font-semibold text-indigo-800">Ingresos por Contado</h4>
                        <p class="text-xl font-bold text-indigo-600">${formatCurrency(reporte.totalContadoMonto || 0)}</p>
                    </div>
                </div>
                
                <div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Detalle de Registros</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manzana</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forma Pago</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicial</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${registrosHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error actualizando reporte mensual:', error);
        document.getElementById('reporteContent').innerHTML = '<div class="text-red-500">Error al cargar reporte</div>';
    }
}

// Contenido de la sección Crear Usuario
function loadCrearUsuarioContent() {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdminPrincipal && _auth.isAdminPrincipal())) {
        document.getElementById('crearUsuarioContent').innerHTML = `
            <div class="text-center py-8 text-red-600">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p class="text-lg font-semibold">Solo el administrador principal puede crear usuarios.</p>
            </div>
        `;
        return;
    }
    
    document.getElementById('crearUsuarioContent').innerHTML = `
        <form id="crearUsuarioForm" onsubmit="handleCrearUsuario(event)" class="max-w-md">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Usuario *</label>
                    <input type="text" name="username" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Contraseña *</label>
                    <input type="password" name="password" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Rol *</label>
                    <select name="rol" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                        <option value="ver">Solo ver y descargar</option>
                        <option value="admin_secundario">Admin secundario (editar, registrar)</option>
                    </select>
                </div>
                
                <button type="submit" class="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-user-plus mr-2"></i>Crear Usuario
                </button>
            </div>
        </form>
        
        <div id="crearUsuarioMessage" class="mt-4"></div>
    `;
}

// Manejo de nuevo registro
async function handleNewRegistro(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const registroData = {
        nombre1: formData.get('nombre1'),
        nombre2: formData.get('nombre2') || null,
        dni1: formData.get('dni1'),
        dni2: formData.get('dni2') || null,
        celular1: formData.get('celular1') || null,
        celular2: formData.get('celular2') || null,
        gmail1: formData.get('gmail1') || null,
        gmail2: formData.get('gmail2') || null,
        manzana: formData.get('manzana'),
        lote: formData.get('lote'),
        metraje: parseFloat(formData.get('metraje')) || null,
        monto_total: parseFloat(formData.get('monto_total')),
        forma_pago: formData.get('forma_pago'),
        inicial: parseFloat(formData.get('inicial')) || 0,
        numero_cuotas: parseInt(formData.get('numero_cuotas')) || 1
    };
    
    // Validar que no exista la manzana y lote
    const registros = await db.getRegistros();
    const existe = registros.find(r => 
        r.manzana.toUpperCase() === registroData.manzana.toUpperCase() && 
        r.lote.toUpperCase() === registroData.lote.toUpperCase()
    );
    
    if (existe) {
        showNotification('Ya existe un registro con esa manzana y lote', 'error');
        return;
    }
    
    // Ajustar datos según forma de pago
    if (registroData.forma_pago === 'contado') {
        registroData.inicial = 0;
    }
    
    try {
        // Crear registro
        const nuevoRegistro = await db.addRegistro(registroData);
        
        // Generar cuotas
        generarCuotas(
            nuevoRegistro.id,
            registroData.forma_pago,
            registroData.monto_total,
            registroData.inicial,
            registroData.numero_cuotas
        );
        
        showNotification('Registro creado exitosamente', 'success');
        closeModal();
        
        // Recargar la sección actual
        loadSectionContent(currentSection);
        
    } catch (error) {
        showNotification('Error al crear el registro', 'error');
        console.error(error);
    }
}

// Manejo de crear usuario
async function handleCrearUsuario(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        password: formData.get('password'),
        rol: formData.get('rol')
    };
    
    const _auth = getAuth();
    const result = _auth ? _auth.createUser(userData) : { success: false, message: 'Sistema de autenticación no disponible' };
    const messageDiv = document.getElementById('crearUsuarioMessage');
    
    if (result.success) {
        messageDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
                <strong>✅ Usuario creado exitosamente</strong>
            </div>
        `;
        event.target.reset();
    } else {
        messageDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <strong>❌ ${result.message}</strong>
            </div>
        `;
    }
}

// Eliminar registro
async function deleteRegistro(registroId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para eliminar registros', 'error');
        return;
    }
    
    try {
        await db.deleteRegistro(registroId);
        showNotification('Registro eliminado exitosamente', 'success');
        loadSectionContent(currentSection);
    } catch (error) {
        showNotification('Error al eliminar el registro', 'error');
        console.error(error);
    }
}

// ACTUALIZADO: Modal para pagar cuota - Acepta cualquier tipo de archivo
async function showPagarCuotaModal(cuotaId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para registrar pagos', 'error');
        return;
    }
    
    const cuota = await db.getCuotaById(cuotaId);
    if (!cuota || cuota.pagado) {
        showNotification('No se puede registrar el pago para esta cuota', 'error');
        return;
    }
    
    const cuotaDisplay = cuota.numero === 0 ? 'Inicial' : `N° ${cuota.numero}`;
    
    // Obtener fecha actual en zona horaria de Perú
    const fechaHoyPeru = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-credit-card mr-3 text-green-500"></i>Registrar Pago
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div class="mb-4">
                    <p class="text-gray-600">Cuota: <strong>${cuotaDisplay}</strong></p>
                    <p class="text-gray-600">Monto: <strong>${formatCurrency(cuota.monto)}</strong></p>
                </div>
                
                <form id="pagarCuotaForm" onsubmit="handlePagarCuota(event, ${cuotaId})">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fecha de Pago *</label>
                            <input type="date" name="fecha_pago" required value="${fechaHoyPeru}"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                            <p class="text-xs text-gray-500 mt-1">Puedes seleccionar cualquier fecha (zona horaria: Perú)</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Vouchers (opcional)</label>
                            <input type="file" name="vouchers" multiple accept="*/*"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                            <p class="text-xs text-gray-500 mt-1">✅ Acepta cualquier archivo: imágenes, PDF, Excel, etc. (sin límite de tamaño)</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Boletas (opcional)</label>
                            <input type="file" name="boletas" multiple accept="*/*"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                            <p class="text-xs text-gray-500 mt-1">✅ Acepta cualquier archivo (las imágenes se optimizan automáticamente)</p>
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

// ACTUALIZADO: Manejo de pago de cuota con compresión automática
async function handlePagarCuota(event, cuotaId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fechaPago = formData.get('fecha_pago');
    const vouchersFiles = formData.getAll('vouchers');
    const boletasFiles = formData.getAll('boletas');
    
    // Validar formato de fecha (YYYY-MM-DD)
    if (fechaPago && !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
        showNotification('Formato de fecha inválido. Usa YYYY-MM-DD.', 'error');
        return;
    }
    
    // Mostrar indicador de carga si hay archivos
    const totalFiles = vouchersFiles.length + boletasFiles.length;
    if (totalFiles > 0) {
        showNotification(`Procesando ${totalFiles} archivo(s)... Por favor espera.`, 'info');
    }
    
    try {
        // Procesar vouchers y boletas usando uploads con retries y esperar por todos (cada archivo es independiente)
        const voucherFilesToUpload = (vouchersFiles || []).filter(f => f && f.size > 0);
        const boletaFilesToUpload = (boletasFiles || []).filter(f => f && f.size > 0);

        const allFilePromises = [];

        voucherFilesToUpload.forEach(f => allFilePromises.push(uploadWithRetry(f, cuotaId, 'voucher', { retries: 2, timeoutMs: 45000 }).then(r => r)));
        boletaFilesToUpload.forEach(f => allFilePromises.push(uploadWithRetry(f, cuotaId, 'boleta', { retries: 2, timeoutMs: 45000 }).then(r => r)));

        const settled = await Promise.allSettled(allFilePromises);

        const failedUploads = [];
        const successCount = { voucher: 0, boleta: 0 };

        settled.forEach(s => {
            if (s.status === 'fulfilled' && s.value && s.value.status === 'fulfilled') {
                const t = s.value.tipo || (s.value.res && s.value.res.tipo) || 'voucher';
                successCount[t] = (successCount[t] || 0) + 1;
                console.info(`Upload success: ${s.value.fileName} (${t})`);
            } else if (s.status === 'fulfilled' && s.value && s.value.status === 'rejected') {
                failedUploads.push({ file: s.value.fileName, tipo: s.value.tipo, err: s.value.err });
                console.warn(`Upload failed after retries: ${s.value.fileName}`, s.value.err);
            } else if (s.status === 'rejected') {
                failedUploads.push({ file: '(unknown)', tipo: 'unknown', err: s.reason });
                console.warn('Upload promise rejected:', s.reason);
            }
        });

        // Mostrar resumen de subida
        const totalAttempted = voucherFilesToUpload.length + boletaFilesToUpload.length;
        const totalSucceeded = (successCount.voucher || 0) + (successCount.boleta || 0);

        if (failedUploads.length > 0) {
            showNotification(`${totalSucceeded}/${totalAttempted} archivos subidos. ${failedUploads.length} fallaron. Revisa la consola.`, 'warning');
        } else if (totalAttempted > 0) {
            showNotification(`Todos los archivos (${totalSucceeded}) subidos correctamente`, 'success');
        }
        
        // Actualizar cuota como pagada
        await db.updateCuota(cuotaId, {
            pagado: 1,
            fecha_pago: fechaPago
        });
        
        // Intentar actualizar la UI del modal de cuotas sin forzar un cierre que cause un parpadeo
        const cuota = await db.getCuotaById(cuotaId);
        if (cuota) {
            showNotification('Pago registrado exitosamente', 'success');
            // Actualizar la fila del cliente inmediatamente (si está visible)
            try { if (typeof window.updateRegistroRow === 'function') window.updateRegistroRow(cuota.registro_id); } catch(e){}
            // Notificar a otras pestañas
            try {
                const payload = { type: 'registro-updated', registroId: cuota.registro_id };
                if (window._villa_bc) window._villa_bc.postMessage(payload);
                else if (typeof window._villa_sendMessageFallback === 'function') window._villa_sendMessageFallback(payload);
            } catch (e) {}
            // Reemplazar el contenido del modal directamente (showCuotasModal escribe en modalContainer)
            if (typeof showCuotasModal === 'function') showCuotasModal(cuota.registro_id);
        } else {
            // Fallback seguro: cerrar modal y recargar la sección actual
            showNotification('Pago registrado. Si no ves el detalle, recarga la sección Clientes.', 'success');
            closeModal();
            loadSectionContent(currentSection);
        }
        
    } catch (error) {
        showNotification('Error al registrar el pago', 'error');
        console.error(error);
    }
}

// Modal para editar pago
async function showEditarPagoModal(cuotaId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para editar pagos', 'error');
        return;
    }
    
    const cuota = await db.getCuotaById(cuotaId);
    if (!cuota) {
        showNotification('Cuota no encontrada', 'error');
        return;
    }
    
    const vouchers = await db.getVouchersByCuotaId(cuotaId);
    const boletas = await db.getBoletasByCuotaId(cuotaId);
    const cuotaDisplay = cuota.numero === 0 ? 'Inicial' : `N° ${cuota.numero}`;
    
    let vouchersHTML = '';
    if (vouchers.length > 0) {
        vouchers.forEach(v => {
            const sizeInfo = v.file_size ? ` (${(v.file_size / 1024 / 1024).toFixed(2)} MB)` : '';
            vouchersHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span class="text-sm">${v.file_name}${sizeInfo}</span>
                    <div class="space-x-2">
                        <button onclick="viewFile('${v.file_data}', '${v.file_name}')" class="text-blue-600 hover:text-blue-800 text-xs">Ver</button>
                        <button onclick="deleteVoucher(${v.id}, ${cuotaId})" class="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
                    </div>
                </div>
            `;
        });
    } else {
        vouchersHTML = '<p class="text-gray-500 text-sm">No hay vouchers registrados</p>';
    }
    
    let boletasHTML = '';
    if (boletas.length > 0) {
        boletas.forEach(b => {
            const sizeInfo = b.file_size ? ` (${(b.file_size / 1024 / 1024).toFixed(2)} MB)` : '';
            boletasHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <span class="text-sm">${b.file_name}${sizeInfo}</span>
                    <div class="space-x-2">
                        <button onclick="viewFile('${b.file_data}', '${b.file_name}')" class="text-blue-600 hover:text-blue-800 text-xs">Ver</button>
                        <button onclick="deleteBoleta(${b.id}, ${cuotaId})" class="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
                    </div>
                </div>
            `;
        });
    } else {
        boletasHTML = '<p class="text-gray-500 text-sm">No hay boletas registradas</p>';
    }
    
    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-edit mr-3 text-orange-500"></i>Editar Pago - Cuota ${cuotaDisplay}
                    </h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                
                <div class="space-y-6">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Información Actual</h3>
                        <p class="text-gray-600">Fecha de Pago: <strong>${formatFecha(cuota.fecha_pago)}</strong></p>
                        <p class="text-gray-600">Monto: <strong>${formatCurrency(cuota.monto)}</strong></p>
                    </div>
                    
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Vouchers Actuales</h3>
                        <div class="space-y-2">
                            ${vouchersHTML}
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Boletas Actuales</h3>
                        <div class="space-y-2">
                            ${boletasHTML}
                        </div>
                    </div>
                    
                    <form id="editarPagoForm" onsubmit="handleEditarPago(event, ${cuotaId})">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Actualizar Información</h3>
                        
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Nueva fecha de pago</label>
                                <input type="date" name="fecha_pago" value="${cuota.fecha_pago || ''}"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                                <p class="text-xs text-gray-500 mt-1">Zona horaria: Perú</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Agregar nuevos vouchers</label>
                                <input type="file" name="vouchers" multiple accept="*/*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                                <p class="text-xs text-gray-500 mt-1">✅ Cualquier tipo de archivo</p>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Agregar nuevas boletas</label>
                                <input type="file" name="boletas" multiple accept="*/*"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
                                <p class="text-xs text-gray-500 mt-1">✅ Cualquier tipo de archivo</p>
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
        </div>
    `;
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
}

// Manejo de editar pago
async function handleEditarPago(event, cuotaId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fechaPago = formData.get('fecha_pago');
    const vouchersFiles = formData.getAll('vouchers');
    const boletasFiles = formData.getAll('boletas');
    
    // Mostrar indicador de carga si hay archivos
    const totalFiles = vouchersFiles.length + boletasFiles.length;
    if (totalFiles > 0) {
        showNotification(`Procesando ${totalFiles} archivo(s)... Por favor espera.`, 'info');
    }
    
    try {
        // Actualizar fecha si se proporcionó
        if (fechaPago) {
            await db.updateCuota(cuotaId, { fecha_pago: fechaPago });
        }
        
        // Procesar nuevos vouchers y boletas con retries y no bloquear por uno fallido
        const voucherFilesToUpload = (vouchersFiles || []).filter(f => f && f.size > 0);
        const boletaFilesToUpload = (boletasFiles || []).filter(f => f && f.size > 0);

        const allFilePromisesEdit = [];
        voucherFilesToUpload.forEach(f => allFilePromisesEdit.push(uploadWithRetry(f, cuotaId, 'voucher', { retries: 2, timeoutMs: 45000 })));
        boletaFilesToUpload.forEach(f => allFilePromisesEdit.push(uploadWithRetry(f, cuotaId, 'boleta', { retries: 2, timeoutMs: 45000 })));

        const settledEdit = await Promise.allSettled(allFilePromisesEdit);

        const failedUploadsEdit = [];
        const successCountEdit = { voucher: 0, boleta: 0 };

        settledEdit.forEach(s => {
            if (s.status === 'fulfilled' && s.value && s.value.status === 'fulfilled') {
                const t = s.value.tipo || 'voucher';
                successCountEdit[t] = (successCountEdit[t] || 0) + 1;
                console.info(`Upload success (editar): ${s.value.fileName} (${t})`);
            } else if (s.status === 'fulfilled' && s.value && s.value.status === 'rejected') {
                failedUploadsEdit.push({ file: s.value.fileName, tipo: s.value.tipo, err: s.value.err });
                console.warn(`Upload failed after retries (editar): ${s.value.fileName}`, s.value.err);
            } else if (s.status === 'rejected') {
                failedUploadsEdit.push({ file: '(unknown)', tipo: 'unknown', err: s.reason });
                console.warn('Upload promise rejected (editar):', s.reason);
            }
        });

        const totalAttemptedEdit = voucherFilesToUpload.length + boletaFilesToUpload.length;
        const totalSucceededEdit = (successCountEdit.voucher || 0) + (successCountEdit.boleta || 0);

        if (failedUploadsEdit.length > 0) {
            showNotification(`${totalSucceededEdit}/${totalAttemptedEdit} archivos subidos. ${failedUploadsEdit.length} fallaron. Revisa la consola.`, 'warning');
        } else if (totalAttemptedEdit > 0) {
            showNotification(`Todos los archivos (${totalSucceededEdit}) subidos correctamente`, 'success');
        }
        
        // Intentar reabrir/actualizar el modal de cuotas después de editar
        const cuota = await db.getCuotaById(cuotaId);
        if (cuota) {
            showNotification('Pago actualizado exitosamente', 'success');
            try { if (typeof window.updateRegistroRow === 'function') window.updateRegistroRow(cuota.registro_id); } catch(e){}
            try {
                const payload = { type: 'registro-updated', registroId: cuota.registro_id };
                if (window._villa_bc) window._villa_bc.postMessage(payload);
                else if (typeof window._villa_sendMessageFallback === 'function') window._villa_sendMessageFallback(payload);
            } catch (e) {}
            showCuotasModal(cuota.registro_id);
        } else {
            showNotification('Pago actualizado. Si no ves el detalle, recarga la sección Clientes.', 'success');
            closeModal();
            loadSectionContent(currentSection);
        }
        
    } catch (error) {
        showNotification('Error al actualizar el pago', 'error');
        console.error(error);
    }
}

// Modal para editar la mora manualmente
async function editMoraModal(cuotaId) {
    const _auth = getAuth();
    if (!(_auth && _auth.isAdmin && _auth.isAdmin())) {
        showNotification('No tienes permisos para editar la mora', 'error');
        return;
    }

    const cuota = await db.getCuotaById(cuotaId);
    if (!cuota) return showNotification('Cuota no encontrada', 'error');

    const currentMoraManual = cuota.mora_manual ? cuota.mora_manual : '';

    const modalHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Editar Mora Manual - Cuota ${cuota.numero === 0 ? 'Inicial' : cuota.numero}</h3>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>

                <form id="editMoraForm">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Mora manual (S/)</label>
                        <input type="number" step="0.01" min="0" name="mora_manual" value="${currentMoraManual}" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <p class="text-xs text-gray-500 mt-2">Si dejas vacío o 0, se usará el cálculo automático.</p>
                    </div>

                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="closeModal()" class="px-4 py-2 border rounded text-gray-700">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modalContainer').innerHTML = modalHTML;

    // Adjuntar listener de submit de forma segura para asegurar que event.preventDefault
    // funcione y evitar que el formulario haga submit nativo redirigiendo la página.
    try {
        const editMoraFormEl = document.getElementById('editMoraForm');
        if (editMoraFormEl) {
            // Remover listeners previos por seguridad
            editMoraFormEl.addEventListener('submit', function _handleEditMoraSubmit(e) {
                e.preventDefault();
                try { handleEditMora(e, cuotaId); } catch (err) { console.error('handleEditMora submit error', err); }
            });
        }
    } catch (e) { /* ignore */ }
}

async function handleEditMora(event, cuotaId) {
    event.preventDefault();
    const formData = new FormData(event.target);
    let moraVal = formData.get('mora_manual');
    moraVal = moraVal === null || moraVal === '' ? 0 : parseFloat(moraVal);
    if (isNaN(moraVal) || moraVal < 0) return showNotification('Ingresa un valor válido para la mora', 'error');

    try {
        if (moraVal === 0) {
            // remover mora_manual
            await db.updateCuota(cuotaId, { mora_manual: 0 });
        } else {
            await db.updateCuota(cuotaId, { mora_manual: moraVal });
        }

        showNotification('Mora actualizada', 'success');
        const cuota = await db.getCuotaById(cuotaId);
        if (cuota && typeof showCuotasModal === 'function') {
            showCuotasModal(cuota.registro_id);
        } else {
            closeModal();
            loadSectionContent(currentSection);
        }
    } catch (err) {
        console.error('Error al actualizar mora:', err);
        showNotification('Error al actualizar la mora', 'error');
    }
}

// Eliminar voucher
async function deleteVoucher(voucherId, cuotaId) {
    confirmAction('¿Seguro que deseas eliminar este voucher?', async () => {
        await db.deleteVoucher(voucherId);
        showNotification('Voucher eliminado exitosamente', 'success');
        showEditarPagoModal(cuotaId);
    });
}

// Eliminar boleta
async function deleteBoleta(boletaId, cuotaId) {
    confirmAction('¿Seguro que deseas eliminar esta boleta?', async () => {
        await db.deleteBoleta(boletaId);
        showNotification('Boleta eliminada exitosamente', 'success');
        showEditarPagoModal(cuotaId);
    });
}

// Hacer visible globalmente
window.showSection = showSection;
// Exponer loadSectionContent para que otros scripts (HTML inline / componentes) puedan recargar la sección
if (typeof loadSectionContent === 'function') window.loadSectionContent = loadSectionContent;
window.handleNewRegistro = handleNewRegistro;
window.handleCrearUsuario = handleCrearUsuario;
// Exponer handlers usados por atributos inline en HTML
window.handleSearch = handleSearch;
window.filterClientes = filterClientes;
window.handlePagarCuota = handlePagarCuota;
window.handleEditarPago = handleEditarPago;
// Algunas funciones de pago se definen aquí y deben estar disponibles globalmente
if (typeof showPagarCuotaModal === 'function') window.showPagarCuotaModal = showPagarCuotaModal;
if (typeof showEditarPagoModal === 'function') window.showEditarPagoModal = showEditarPagoModal;
// Exponer funciones de eliminación para que onclick en HTML pueda llamarlas
if (typeof deleteRegistro === 'function') window.deleteRegistro = deleteRegistro;
if (typeof deleteVoucher === 'function') window.deleteVoucher = deleteVoucher;
if (typeof deleteBoleta === 'function') window.deleteBoleta = deleteBoleta;
// Exponer funciones de Proyección usadas por botones inline
if (typeof showProjectionSingle === 'function') window.showProjectionSingle = showProjectionSingle;
if (typeof showProjectionTimeline === 'function') window.showProjectionTimeline = showProjectionTimeline;
if (typeof exportProjectionPDF === 'function') window.exportProjectionPDF = exportProjectionPDF;
if (typeof exportProjectionTimeline === 'function') window.exportProjectionTimeline = exportProjectionTimeline;
if (typeof showProjectionRange === 'function') window.showProjectionRange = showProjectionRange;
// Exponer funciones que se llaman desde HTML inline en componentes.js
if (typeof editMoraModal === 'function') window.editMoraModal = editMoraModal;
if (typeof handleEditMora === 'function') window.handleEditMora = handleEditMora;
// Exponer updateReporteMensual para el onchange del input
if (typeof updateReporteMensual === 'function') window.updateReporteMensual = updateReporteMensual;
// Asegurar currentSection inicial también esté en window
try { window.currentSection = currentSection; } catch (e) { /* ignore */ }
