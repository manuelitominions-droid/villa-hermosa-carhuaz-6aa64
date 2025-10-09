// reports.js - Generación de reportes PDF y Excel

// Exportar a PDF
async function exportToPDF(registroId) {
    const registro = db.getRegistroById(registroId);
    const cuotas = db.getCuotasByRegistroId(registroId);
    
    if (!registro) {
        showNotification('Registro no encontrado', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurar fuente
    doc.setFont('helvetica');
    
    // Añadir cabecera grande con logos y recibir altura usada
    const usedHeader = await addPDFHeader(doc, 'CRONOGRAMA DE PAGOS');

    // Información del cliente
    let y = usedHeader + 6;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const leftMargin = 18;
    const rightMargin = doc.internal.pageSize.getWidth() - 18;
    const contentWidth = rightMargin - leftMargin;

    // Center the client's full name and show the rest of the fields in a colored table for better layout
    const pageW = doc.internal.pageSize.getWidth();
    const fullName = [registro.nombre1 || '', registro.nombre2 || ''].filter(Boolean).join(' ').trim() || '---';
    // Draw centered name
    try { doc.setFont('helvetica', 'bold'); } catch (e) { /* ignore */ }
    doc.setFontSize(14);
    doc.setTextColor(10, 30, 60);
    doc.text(String(fullName), pageW / 2, y, { align: 'center' });
    y += 8;

    // Build client info rows (label, value)
    const clientRows = [];
    const pushRow = (label, val) => clientRows.push([label, String(val || '')]);
    pushRow('DNI 1', registro.dni1);
    if (registro.dni2) pushRow('DNI 2', registro.dni2);
    pushRow('Celular 1', registro.celular1 || '');
    if (registro.celular2) pushRow('Celular 2', registro.celular2);
    pushRow('Gmail 1', registro.gmail1 || '');
    if (registro.gmail2) pushRow('Gmail 2', registro.gmail2);
    pushRow('Precio total', formatCurrency(registro.monto_total));
    pushRow('Moneda', 'SOLES');
    pushRow('Proyecto', 'VILLA HERMOSA DE CARHUAZ');
    pushRow('Inicial', formatCurrency(registro.inicial || 0));
    pushRow('Manzana', registro.manzana);
    pushRow('Lote', registro.lote);
    if (registro.metraje) pushRow('Metraje', `${registro.metraje} m²`);

    // Draw a two-column table for client info with light header color
    doc.autoTable({
        startY: y + 2,
        margin: { left: leftMargin, right: 18 },
        head: [['Campo', 'Valor']],
        body: clientRows,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak', lineColor: [120,120,120], lineWidth: 0.2 },
        headStyles: { fillColor: [220, 230, 250], textColor: [20, 40, 80], halign: 'center' },
        bodyStyles: { textColor: [30,30,30] },
        columnStyles: { 0: { cellWidth: 45, halign: 'left' }, 1: { cellWidth: contentWidth - 55 } },
        tableWidth: contentWidth
    });
    // Move y after the table
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : y + 30;
    // Reset font
    try { doc.setFont('helvetica', 'normal'); } catch (e) { /* ignore */ }
    
    // Información bancaria
    y += 10;
    doc.setFillColor(144, 238, 144);
    doc.rect(20, y, 170, 15, 'F');
    doc.text('N° CUENTA Soles - 38006500681006', 25, y + 5);
    doc.text('BCP CCI - 00238010650068100645', 25, y + 10);
    doc.text('SEGUNDO TEOFILO LOZADA VILLEGAS', 105, y + 15, { align: 'center' });
    
    // Tabla de cuotas
    y += 25;
    const tableData = [];
    let totalPagado = 0;
    
    cuotas.forEach(c => {
        const mora = c.numero > 0 ? calcularMora(c.monto, c.fecha_vencimiento, c.fecha_pago) : 0;
        const total = c.monto + mora;
        const estado = c.pagado ? 'Cancelado' : 'Pendiente';
        const fechaPago = c.pagado && c.fecha_pago ? formatFecha(c.fecha_pago) : '';
        const cuotaDisplay = c.numero === 0 ? 'Inicial' : c.numero.toString();
        
        if (c.pagado) {
            totalPagado += c.monto;
        }
        
        const vouchers = db.getVouchersByCuotaId(c.id);
        const boletas = db.getBoletasByCuotaId(c.id);
        
        tableData.push([
            cuotaDisplay,
            formatFecha(c.fecha_vencimiento),
            c.monto.toFixed(2),
            mora.toFixed(2),
            total.toFixed(2),
            fechaPago,
            estado,
            vouchers.length > 0 ? `${vouchers.length} voucher(s)` : '',
            boletas.length > 0 ? `${boletas.length} boleta(s)` : ''
        ]);
    });
    
    doc.autoTable({
        head: [['N° de cuota', 'Fecha de Vencimiento', 'Monto', 'Mora', 'Total', 'Fecha de Pago', 'Estado', 'Vouchers', 'Boletas']],
        body: tableData,
        startY: y,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [128, 128, 128] }
    });
    
    // Resumen final
    const finalY = doc.lastAutoTable.finalY + 10;
    const importePendiente = registro.monto_total - totalPagado;
    
    doc.text(`Importe total pagado: ${formatCurrency(totalPagado)}`, 20, finalY);
    doc.text(`Importe pendiente: ${formatCurrency(importePendiente)}`, 20, finalY + 5);
    
    // Nota final
    doc.setFillColor(144, 238, 144);
    doc.rect(20, finalY + 15, 170, 10, 'F');
    doc.setFontSize(8);
    doc.text('NOTA: UNA VEZ CANCELADO LA CUOTA MENSUAL, ENVIAR FOTO DEL VOUCHER AL NUMERO DE COBRANZA: 942252720', 105, finalY + 20, { align: 'center' });
    
    // Descargar PDF
    doc.save(`estado_cuenta_${registroId}.pdf`);
    showNotification('PDF generado exitosamente', 'success');
}

// Helper: cargar imagen desde ruta relativa y devolver { dataURL, width, height } (Promise)
function loadImageAsDataURL(src) {
    return new Promise(async (resolve, reject) => {
        try {
            // Intentamos fetch primero para evitar problemas de cross-origin que taintean canvas
            const resp = await fetch(src, { cache: 'no-cache' });
            if (!resp.ok) return reject(new Error('Error al obtener imagen: ' + resp.status));
            const blob = await resp.blob();

            // Crear object URL para medir dimensiones sin taint
            const objUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = function() {
                try {
                    const w = img.naturalWidth || img.width;
                    const h = img.naturalHeight || img.height;
                    URL.revokeObjectURL(objUrl);

                    // Convertir blob a dataURL
                    const fr = new FileReader();
                    fr.onload = function() {
                        resolve({ dataURL: fr.result, width: w, height: h });
                    };
                    fr.onerror = function(err) { reject(err); };
                    fr.readAsDataURL(blob);
                } catch (e) {
                    URL.revokeObjectURL(objUrl);
                    reject(e);
                }
            };
            img.onerror = function(e) {
                URL.revokeObjectURL(objUrl);
                reject(new Error('No se pudo cargar la imagen ' + src));
            };
            img.src = objUrl;
        } catch (err) {
            // Fallback: intentar cargar vía Image con crossOrigin
            try {
                const img2 = new Image();
                img2.crossOrigin = 'Anonymous';
                img2.onload = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        const w = img2.naturalWidth || img2.width;
                        const h = img2.naturalHeight || img2.height;
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img2, 0, 0);
                        const dataURL = canvas.toDataURL('image/jpeg');
                        resolve({ dataURL, width: w, height: h });
                    } catch (e) { reject(e); }
                };
                img2.onerror = function(e) { reject(new Error('No se pudo cargar la imagen ' + src)); };
                img2.src = src;
            } catch (e2) {
                reject(err);
            }
        }
    });
}

// Helper: dibujar cabecera con logos y franja de color y título centrado
async function addPDFHeader(doc, title) {
    // Intentar cargar logos que normalmente están en /logo-at.jpeg y /villa-hermosa.jpg
    const leftLogoPath = '/logo-at.jpeg';
    const rightLogoPath = '/villa-hermoza.jpg';
    let leftData = null, rightData = null;
    try { leftData = await loadImageAsDataURL(leftLogoPath); } catch (e) { /* ignore */ }
    try { rightData = await loadImageAsDataURL(rightLogoPath); } catch (e) { /* ignore */ }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25; // 2.5 cm margins on both sides (units are mm in jsPDF default)
    const contentWidth = pageWidth - margin * 2; // target width in mm (e.g. ~160 mm for A4)
    const topY = 8; // small offset from page top

    // Choose banner image (prefer leftData as main brand); fallback to rightData
    const banner = leftData || rightData;
    let imageHeightMm = 0;

    if (banner && banner.dataURL && banner.width && banner.height) {
        try {
            // banner.width/height are pixels; jsPDF uses mm by default for coordinates and sizes
            // We want the displayed width to be contentWidth (mm). Compute height preserving aspect ratio.
            const imgW = banner.width;
            const imgH = banner.height;
            const targetW = contentWidth; // mm
            const aspect = imgH / imgW;
            const imageHeightMmCalc = Math.max(18, Math.round(targetW * aspect * 100) / 100); // min height 18mm to keep presence
            imageHeightMm = imageHeightMmCalc;
            // draw banner at left margin with target width and computed height
            doc.addImage(banner.dataURL, 'JPEG', margin, topY, targetW, imageHeightMm);
        } catch (e) {
            console.warn('No se pudo dibujar banner en PDF header', e);
            imageHeightMm = 0;
        }
    }

    // Dibujar solo un logo (preferir rightData). No dibujamos el logo pequeño adicional para evitar ocupar espacio.
    // Si rightData no existe, se usará leftData como fallback.
    // (El banner principal ya fue dibujado arriba si existe.)

    // Franja de color justo debajo de la imagen/banner
    doc.setFillColor(237, 243, 255);
    // Limitar la altura del banner para que no cubra la mayor parte de la página
    const maxBannerHeight = Math.min(40, Math.round(doc.internal.pageSize.getHeight() * 0.25)); // mm
    const usedImageHeight = Math.min(imageHeightMm || 18, maxBannerHeight);
    const rectY = topY + usedImageHeight + 6;

    // Normalizar títulos que vienen con letras separadas (p. ej. 'P R O Y E C C I Ó N')
    const normalizeSpacedTitle = (t) => {
        // Reemplazar múltiples espacios por único espacio y remover espacios entre letras cuando detectado patrón de letras separadas
        // Si el título tiene secuencias de letras separadas por espacios (mayormente mayúsculas), unirlas.
        const spacedPattern = /(?:\b[A-ZÁÉÍÓÚÑ]\s){3,}[A-ZÁÉÍÓÚÑ]\b/; // heurística
        if (spacedPattern.test(t.replace(/\s+/g, ' '))) {
            // quitar espacios entre letras y luego normalizar espacios entre palabras
            const compact = t.replace(/\s+/g, '');
            // reinsertar un espacio antes de las palabras comunes (heurística simple con paréntesis o guiones)
            return compact.replace(/\(/g, ' (');
        }
        return t.replace(/\s+/g, ' ').trim();
    };

    // Support title as Array [line1, line2] (forced two-line layout)
    let forcedTwoLines = false;
    if (Array.isArray(title)) {
        forcedTwoLines = true;
    } else {
        // ensure we always work with a string
        title = normalizeSpacedTitle(title || '').toString();
    }

    // Ajustar título: preferir 1 línea; if forcedTwoLines is set, render two-line deterministic layout; otherwise try to fit.
    const maxTextWidth = contentWidth - 14;
    let fontSize = 11; // Adjusted initial font size for better fit
    const minFontSize = 7;
    doc.setTextColor(20, 40, 80);

    // Primero intento single-line reduciendo fuente si es necesario
    let singleFits = false;
    // Skip single-line measurement when caller explicitly passed an Array (forced two-line)
    if (!forcedTwoLines) {
        while (fontSize >= minFontSize) {
            doc.setFontSize(fontSize);
            // Coerce to string to avoid passing non-string to jsPDF internals
            if (doc.getTextWidth(String(title)) <= maxTextWidth) { singleFits = true; break; }
            fontSize -= 1;
        }
    }

    let titleLines = [];
    let forceLeft = false;

    // If caller passed an explicit two-line title array, use deterministic left-aligned layout
    if (forcedTwoLines) {
        const partA = String(title[0] || '').toUpperCase();
        let partB = String(title[1] || '').trim();
        const size1 = 11;
        const size2 = 9;
        doc.setFontSize(size2);
        while (doc.splitTextToSize(partB, maxTextWidth).length > 1 && partB.length > 10) {
            partB = partB.substring(0, partB.length - 6);
        }
        if (partB.length < String(title[1] || '').length) partB = partB + '...';
        titleLines = [{ text: partA, size: size1 }, { text: partB, size: size2 }];
        forceLeft = true;
    } else {
    if (singleFits) {
        titleLines = [title];
    } else {
        // Intentar dividir en 2 partes por separadores comunes
        const separators = [' (', ' - ', ' — ', ': ', ' – '];
        let partA = null, partB = null;
        for (const sep of separators) {
            if (title.includes(sep)) {
                const idx = title.indexOf(sep);
                partA = title.substring(0, idx).trim();
                partB = title.substring(idx).trim();
                break;
            }
        }
        // Si no encontramos separador razonable, partir por la mitad en un espacio
        if (!partA) {
            const words = title.split(' ');
            const half = Math.ceil(words.length / 2);
            partA = words.slice(0, half).join(' ');
            partB = words.slice(half).join(' ');
        }

        // Reducir fontSize hasta que ambas partes quepan en 2 líneas o lleguemos a minFontSize
        while (fontSize >= minFontSize) {
            doc.setFontSize(fontSize);
            const linesA = doc.splitTextToSize(partA, maxTextWidth);
            const linesB = doc.splitTextToSize(partB, maxTextWidth);
            if (linesA.length <= 1 && linesB.length <= 1) {
                titleLines = [partA, partB];
                break;
            }
            fontSize -= 1;
        }

        // Si aún no se ajusta en 2 líneas (por muy largas), truncar segunda parte
        if (titleLines.length === 0) {
            doc.setFontSize(minFontSize);
            // truncar partB hasta que ocupe 1 línea
            let truncatedB = partB;
            while (doc.splitTextToSize(truncatedB + '...', maxTextWidth).length > 1 && truncatedB.length > 10) {
                truncatedB = truncatedB.substring(0, truncatedB.length - 6);
            }
            titleLines = [partA, truncatedB + (truncatedB.length < partB.length ? '...' : '')];
        }
    }

    }

    // Normalizar titleLines: si vienen como strings, convertir a objetos con tamaño default
    if (titleLines.length > 0 && typeof titleLines[0] === 'string') {
        const defaultSize = typeof fontSize === 'number' ? fontSize : 10;
        titleLines = titleLines.map(t => ({ text: t, size: defaultSize }));
    }

    // Calcular alturas por línea (approx en mm) y la altura total del título
    const lineHeights = titleLines.map(l => Math.round(l.size * 0.7 * 100) / 100);
    const titleHeight = lineHeights.reduce((s, h) => s + h, 0);
    const franjaHeight = Math.max(18, Math.round((titleHeight + 8) * 100) / 100);
    doc.rect(0, rectY, pageWidth, franjaHeight, 'F');

    // Escribir las líneas del título centradas verticalmente en la franja
    // Calcular Y inicial para la primera línea (centra el bloque de texto)
    let curY = rectY + (franjaHeight - titleHeight) / 2 + lineHeights[0];
    // Introducir pequeño desplazamiento a la izquierda para evitar overflow en el margen derecho
    const leftShift = Math.min(18, Math.round(contentWidth * 0.05)); // mm
    // Si se forzó layout izquierdo, ubicamos texto cerca del margen; si no, lo centramos con un leve shift
    const defaultCenterX = (pageWidth / 2) - leftShift;
    const leftAlignedX = margin + 6;
    for (let i = 0; i < titleLines.length; i++) {
        const line = titleLines[i];
        // Use bold for the first (primary) line and normal for subsequent lines for better legibility
        if (i === 0) {
            try { doc.setFont('helvetica', 'bold'); } catch (e) { /* ignore if font variant unavailable */ }
        } else {
            try { doc.setFont('helvetica', 'normal'); } catch (e) { /* ignore */ }
        }
        doc.setFontSize(line.size);
        doc.setTextColor(20, 40, 80);
        const drawX = forceLeft ? leftAlignedX : defaultCenterX;
        // Round coordinates to 2 decimal places to improve rendering crispness
        const drawY = Math.round(curY * 100) / 100;
        const drawXr = Math.round(drawX * 100) / 100;
        // Use left alignment when forcedTwoLines requested; otherwise center
        const alignMode = forceLeft ? 'left' : 'center';
        doc.text(String(line.text), drawXr, drawY, { align: alignMode });
        curY += lineHeights[i];
    }

    // Note: Removed the footer contact line from the PDF header as requested.

    // Return used header height so callers can position content below
    return rectY + 14;
}

// Exportar a Excel
function exportToExcel(registroId) {
    const registro = db.getRegistroById(registroId);
    const cuotas = db.getCuotasByRegistroId(registroId);
    
    if (!registro) {
        showNotification('Registro no encontrado', 'error');
        return;
    }

    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Datos del cliente
    const clienteData = [
        ['CRONOGRAMA DE PAGOS', '', '', '', '', '', '', ''],
        ['Teléfono de cobranza Villa Hermosa: 942252720', '', '', '', '', '', '', ''],
        [''],
        ['Nombre 1', registro.nombre1],
        ...(registro.nombre2 ? [['Nombre 2', registro.nombre2]] : []),
        ['DNI 1', registro.dni1],
        ...(registro.dni2 ? [['DNI 2', registro.dni2]] : []),
        ['Celular 1', registro.celular1 || ''],
        ...(registro.celular2 ? [['Celular 2', registro.celular2]] : []),
        ['Gmail 1', registro.gmail1 || ''],
        ...(registro.gmail2 ? [['Gmail 2', registro.gmail2]] : []),
        ['Precio total', formatCurrency(registro.monto_total)],
        ['Moneda', 'SOLES'],
        ['Proyecto', 'VILLA HERMOSA DE CARHUAZ'],
        ['Inicial', formatCurrency(registro.inicial || 0)],
        ['Manzana', registro.manzana],
        ['Lote', registro.lote],
        ...(registro.metraje ? [['Metraje', `${registro.metraje} m²`]] : []),
        [''],
        ['N° CUENTA', 'Soles - 38006500681006'],
        ['BCP', 'CCI - 00238010650068100645'],
        ['SEGUNDO TEOFILO LOZADA VILLEGAS'],
        [''],
        ['N° de cuota', 'Fecha de Vencimiento', 'Monto', 'Mora', 'Total', 'Fecha de Pago', 'Estado', 'Vouchers', 'Boletas']
    ];
    
    // Datos de cuotas
    let totalPagado = 0;
    cuotas.forEach(c => {
        const mora = c.numero > 0 ? calcularMora(c.monto, c.fecha_vencimiento, c.fecha_pago) : 0;
        const total = c.monto + mora;
        const estado = c.pagado ? 'Cancelado' : 'Pendiente';
        const fechaPago = c.pagado && c.fecha_pago ? formatFecha(c.fecha_pago) : '';
        const cuotaDisplay = c.numero === 0 ? 'Inicial' : c.numero;
        
        if (c.pagado) {
            totalPagado += c.monto;
        }
        
        const vouchers = db.getVouchersByCuotaId(c.id);
        const boletas = db.getBoletasByCuotaId(c.id);
        
        clienteData.push([
            cuotaDisplay,
            formatFecha(c.fecha_vencimiento),
            c.monto,
            mora,
            total,
            fechaPago,
            estado,
            vouchers.length > 0 ? `${vouchers.length} voucher(s)` : '',
            boletas.length > 0 ? `${boletas.length} boleta(s)` : ''
        ]);
    });
    
    // Resumen final
    const importePendiente = registro.monto_total - totalPagado;
    clienteData.push(
        [''],
        ['Importe total pagado', formatCurrency(totalPagado)],
        ['Importe pendiente', formatCurrency(importePendiente)],
        [''],
        ['NOTA: UNA VEZ CANCELADO LA CUOTA MENSUAL, ENVIAR FOTO DEL VOUCHER AL NUMERO DE COBRANZA: 942252720']
    );
    
    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(clienteData);
    
    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Estado de Cuenta');
    
    // Descargar archivo
    XLSX.writeFile(wb, `estado_cuenta_${registroId}.xlsx`);
    showNotification('Excel generado exitosamente', 'success');
}

// Exportar reporte mensual a PDF
async function exportReporteMensualPDF(mesStr) {
    const reporte = db.getReporteMensual(mesStr);
    const mesNombre = getMonthName(mesStr);
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Agregar cabecera
    const usedHeader = await addPDFHeader(doc, `REPORTE MENSUAL - ${getMonthName(mesStr)}`);

    // Resumen
    // Añadir espacio extra para que el título no quede tan pegado al header
    let y = usedHeader + 12; // antes era +6
    doc.setFontSize(12);
    doc.text('RESUMEN DEL MES', 20, y);
    
    y += 10;
    doc.setFontSize(10);
    doc.text(`Total de clientes registrados: ${reporte.totalClientes}`, 20, y);
    y += 5;
    doc.text(`Clientes con cuotas: ${reporte.totalCuotas}`, 20, y);
    y += 5;
    doc.text(`Clientes al contado: ${reporte.totalContado}`, 20, y);
    y += 5;
    doc.text(`Ingresos por iniciales: ${formatCurrency(reporte.inicialesCuotas)}`, 20, y);
    y += 5;
    doc.text(`Ingresos por contado: ${formatCurrency(reporte.totalContadoMonto)}`, 20, y);
    y += 5;
    doc.text(`Total ingresos del mes: ${formatCurrency(reporte.totalGeneral)}`, 20, y);
    
    // Tabla de registros
    if (reporte.registros.length > 0) {
        y += 15;
        doc.text('DETALLE DE REGISTROS', 20, y);
        
        const tableData = reporte.registros.map(r => [
            formatFecha(r.fecha_registro),
            r.nombre1,
            r.dni1,
            r.manzana,
            r.lote,
            r.forma_pago.charAt(0).toUpperCase() + r.forma_pago.slice(1),
            formatCurrency(r.monto_total),
            r.forma_pago === 'cuotas' ? formatCurrency(r.inicial || 0) : '-'
        ]);
        
        doc.autoTable({
            head: [['Fecha', 'Nombre', 'DNI', 'Manzana', 'Lote', 'Forma Pago', 'Monto Total', 'Inicial']],
            body: tableData,
            startY: y + 5,
            styles: { fontSize: 8 }
        });
    }
    
    doc.save(`reporte_mensual_${mesStr}.pdf`);
    showNotification('Reporte PDF generado exitosamente', 'success');
}

// Exportar las estadísticas (mismo contenido que la sección Estadísticas) a PDF
async function exportEstadisticasPDF(monthStr) {
    const month = monthStr || getCurrentMonth();
    const stats = db.getEstadisticasMes(month);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Cabecera
    const usedHeader = await addPDFHeader(doc, `ESTADÍSTICAS - ${getMonthName(month)}`);
    let y = usedHeader + 8;

    // Draw boxes similar to UI
    const pageW = doc.internal.pageSize.getWidth();
    const leftMargin = 18;
    const rightMargin = pageW - 18;
    const contentW = rightMargin - leftMargin;
    const gap = 8;
    const boxW = Math.round(((contentW - gap) / 2) * 100) / 100;
    const boxH = 34;

    // Box 1: Total de Cuotas
    doc.setFillColor(235, 245, 255);
    doc.rect(leftMargin, y, boxW, boxH, 'F');
    doc.setFontSize(10); doc.setTextColor(30, 64, 175);
    doc.text('Total de Cuotas', leftMargin + 8, y + 10);
    doc.setFontSize(18); doc.setTextColor(30, 64, 175);
    doc.text(String(stats.totalCuotas || 0), leftMargin + 8, y + 26);

    // Box 2: Cuotas Adelantadas
    const bx2 = leftMargin + boxW + gap;
    doc.setFillColor(240, 250, 245);
    doc.rect(bx2, y, boxW, boxH, 'F');
    doc.setFontSize(10); doc.setTextColor(4, 120, 87);
    doc.text('Cuotas Adelantadas', bx2 + 8, y + 10);
    doc.setFontSize(18); doc.setTextColor(4, 120, 87);
    doc.text(String(stats.numAdelantadas || 0), bx2 + 8, y + 26);

    // Next row
    y += boxH + 10;

    // Box 3: Cuotas Pagadas
    doc.setFillColor(235, 250, 241);
    doc.rect(leftMargin, y, boxW, boxH, 'F');
    doc.setFontSize(10); doc.setTextColor(5, 105, 5);
    doc.text('Cuotas Pagadas', leftMargin + 8, y + 10);
    doc.setFontSize(18); doc.setTextColor(5, 105, 5);
    doc.text(String(stats.numPagadas || 0), leftMargin + 8, y + 26);

    // Box 4: Cuotas Pendientes
    const bx4 = leftMargin + boxW + gap;
    doc.setFillColor(255, 243, 230);
    doc.rect(bx4, y, boxW, boxH, 'F');
    doc.setFontSize(10); doc.setTextColor(153, 64, 0);
    doc.text('Cuotas Pendientes', bx4 + 8, y + 10);
    doc.setFontSize(18); doc.setTextColor(153, 64, 0);
    doc.text(String(stats.noPagadas || 0), bx4 + 8, y + 26);

    // Third row: Monto Proyectado / Monto Ingresado
    y += boxH + 14;
    // Full width boxes
    const bigBoxH = 40;
    doc.setFillColor(255, 249, 230);
    doc.rect(leftMargin, y, contentW, bigBoxH, 'F');
    doc.setFontSize(10); doc.setTextColor(133, 77, 14);
    doc.text('Monto Proyectado', leftMargin + 8, y + 12);
    doc.setFontSize(18); doc.setTextColor(133, 77, 14);
    doc.text(String(formatCurrency(stats.totalProyectado || 0)), rightMargin - 8, y + 28, { align: 'right' });

    y += bigBoxH + 8;
    doc.setFillColor(243, 238, 255);
    doc.rect(leftMargin, y, contentW, bigBoxH, 'F');
    doc.setFontSize(10); doc.setTextColor(88, 64, 255);
    doc.text('Monto Ingresado', leftMargin + 8, y + 12);
    doc.setFontSize(18); doc.setTextColor(88, 64, 255);
    doc.text(String(formatCurrency(stats.montoPagado || 0)), rightMargin - 8, y + 28, { align: 'right' });

    // Footer note with totals
    y += bigBoxH + 12;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Periodo: ${getMonthName(month)}`, leftMargin, y);

    // Save
    doc.save(`estadisticas_${month}.pdf`);
    showNotification('Estadísticas exportadas a PDF', 'success');
}

// Exportar proyección timeline a PDF (desde startMonth hasta endMonth)
async function exportProjectionTimelinePDF(startMonth, endMonth) {
    const start = startMonth || getNextMonth();
    const end = endMonth || db.getLastCuotaMonth() || start;
    const timeline = db.getProjectionTimeline(start, end);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Agregar cabecera (logos + franja + footer) y esperar a que cargue
    // Forzar título en dos líneas: primera línea fija y segunda con el rango
    const titleLines = ['PROYECCIÓN MES A MES', `(${getMonthName(start)} → ${getMonthName(end)})`];
    const usedHeaderTimeline = await addPDFHeader(doc, titleLines);

    let y = usedHeaderTimeline + 6; // dejar espacio por el header
    doc.setFontSize(10);

    const tableData = timeline.map(t => [getMonthName(t.month), t.count, formatCurrency(t.totalProjected)]);

    doc.autoTable({
        head: [['Mes', '# Cuotas', 'Proyectado']],
        body: tableData,
        startY: y,
        styles: { fontSize: 9 }
    });

    doc.save(`proyeccion_${start}_to_${end}.pdf`);
    showNotification('Proyección exportada a PDF', 'success');
}
// Exportar proyección para un mes específico (sin mora) - coincide con la vista 'Ver mes'
async function exportProjectionMonthPDF(mes) {
    const m = mes || getNextMonth();
    const proj = db.getProjectionForMonth(m);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Añadir cabecera con logos
    const usedHeaderMonth = await addPDFHeader(doc, `PROYECCIÓN - ${getMonthName(m)}`);

    let y = usedHeaderMonth + 8;
    // Draw two colored boxes similar to the UI for better spacing and readability
    const pageW = doc.internal.pageSize.getWidth();
    const leftMargin = 20;
    const rightMargin = pageW - 20;
    const contentW = rightMargin - leftMargin;
    const gap = 10;
    const boxW = Math.round(((contentW - gap) / 2) * 100) / 100;
    const boxH = 34;

    // Left box - Número de cuotas
    doc.setFillColor(238, 242, 255); // light indigo
    doc.rect(leftMargin, y, boxW, boxH, 'F');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text('Número de cuotas', leftMargin + 8, y + 10);
    doc.setFontSize(20);
    doc.setTextColor(67, 56, 202);
    doc.text(String(proj.count || 0), leftMargin + 8, y + 26);

    // Right box - Total proyectado
    const rightX = leftMargin + boxW + gap;
    doc.setFillColor(249, 240, 255); // light purple
    doc.rect(rightX, y, boxW, boxH, 'F');
    doc.setFontSize(10);
    doc.setTextColor(124, 58, 237);
    doc.text('Total proyectado', rightX + 8, y + 10);
    doc.setFontSize(20);
    doc.setTextColor(109, 40, 217);
    doc.text(String(formatCurrency(proj.totalProjected || 0)), rightX + 8, y + 26);

    // Advance Y to leave space below boxes
    y = y + boxH + 10;

    // Nota: se omite la lista detallada en el PDF mensual para generar un resumen limpio.

    doc.save(`proyeccion_${m}.pdf`);
    showNotification('Proyección mensual exportada a PDF', 'success');
}
// Exponer funciones para uso en HTML
window.exportToPDF = function(registroId) { return exportToPDF(registroId); };
window.exportToExcel = exportToExcel;
window.exportReporteMensualPDF = function(mesStr) { return exportReporteMensualPDF(mesStr); };
window.exportProjectionTimelinePDF = exportProjectionTimelinePDF;
window.exportProjectionMonthPDF = exportProjectionMonthPDF;
window.exportEstadisticasPDF = function(monthStr) { return exportEstadisticasPDF(monthStr); };