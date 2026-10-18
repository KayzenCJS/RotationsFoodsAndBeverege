// ============================================================================
//  EXPORTACION A PDF DEL HISTORIAL DE AUDITORIA DE INSPECCIONES
// ============================================================================
//  Genera el PDF en el SERVIDOR, con pdfkit.
//
//  Todo lo que sale en el documento sale de la base de datos en ese momento.
//  Si un dato no esta guardado, no se inventa: se omite. Un campo sin valor
//  aparece como "—" en vez de relleno.
//
//  La consulta se hace con los mismos filtros que aplica el usuario en el
//  panel, para que "Exportar" exporte lo que se esta viendo. Cuando no hay
//  filtros, sale el historico completo y el documento lo dice en la cabecera.
const PDFDocument = require('pdfkit');

const SEP = '='.repeat(70);

// --- Paleta: los mismos colores del proyecto, para que el papel no sea ajeno.
const COLOR = {
  texto: '#1a1a2e',
  suave: '#5a5a72',
  linea: '#d0d0dd',
  cabeceraFondo: '#2c3e80',
  cabeceraTexto: '#ffffff',
  banda: '#f0f2f8',
  alerta: '#8a1f1f',
  ok: '#0F6E4E'
};

const MARGEN = 42;
const ANCHO_UTIL_A4 = 595.28 - MARGEN * 2;

// --- Formato de fechas ------------------------------------------------------
// Todo lo que sale de la base es UTC; se formatea en el huso del parque (NH,
// UTC-4) para que el papel no diga "mañana" cuando aqui es de tarde.
const TZ_PARQUE = 'America/New_York';

function aFecha(v) {
    if (!v) return null;
    const d = (v instanceof Date) ? v : new Date(v);
    if (isNaN(d.getTime())) return null;
    // Si viene como 'YYYY-MM-DD' (una date de Postgres), se trata como dia local.
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return d.toLocaleDateString('es-US', { timeZone: TZ_PARQUE, year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    return d.toLocaleString('es-US', {
        timeZone: TZ_PARQUE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(', ', ' · ');
}

function aHora(v) {
    if (!v) return null;
    const s = String(v);
    if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-GB', { timeZone: TZ_PARQUE, hour: '2-digit', minute: '2-digit' });
}

// Como se muestra una persona en el PDF.
//
// El endpoint ya resuelve el nombre y, cuando el id guardado no corresponde a
// ningun empleado, devuelve "ID n (no esta en la lista de empleados)". Aqui solo
// se anade el "(ID n)" cuando hay nombre Y ese id no va ya dentro, para no
// escribirlo dos veces.
function persona(display, nombreAlterno, nombreEmpleado, id) {
    const base = display || nombreAlterno || nombreEmpleado;
    if (!base) return id ? valor('ID ' + id) : valor(null);
    if (!id) return valor(base);
    if (String(base).indexOf('ID ' + id) >= 0) return valor(base);   // ya lo lleva
    return valor(base) + '  (ID ' + id + ')';
}

const valor = (v) => (v === null || v === undefined || String(v).trim() === '') ? '—' : String(v).trim();

// Recorta un texto largo para que la tabla no reviente. Los textos largos se
// parten en varias lineas, no se cortan a media palabra.
function partir(texto, anchoFuente, maxChars) {
    if (!texto) return ['—'];
    const limpio = String(texto).replace(/\s+/g, ' ').trim();
    if (limpio.length <= maxChars) return [limpio];
    const corte = limpio.lastIndexOf(' ', maxChars);
    return [limpio.slice(0, corte > maxChars * 0.6 ? corte : maxChars) + '…'];
}

// ============================================================================
//  Genera el PDF a partir de los datos ya consultados
// ============================================================================
function generarPDF({ inspecciones, filtros, generadoPor, resumen }) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: MARGEN,
        info: {
            Title: 'Historial de auditoría de inspecciones',
            Author: 'StoryManager',
            Subject: 'Historial de auditoría de inspecciones',
            CreationDate: new Date()
        },
        bufferPages: true,
        info2: undefined
    });

    // -----------------------------------------------------------------------
    //  PORTADA / CABECERA
    // -----------------------------------------------------------------------
    doc.rect(0, 0, doc.page.width, 96).fill(COLOR.cabeceraFondo);
    doc.fillColor(COLOR.cabeceraTexto)
       .font('Helvetica-Bold').fontSize(19)
       .text('Historial de auditoría de inspecciones', MARGEN, 30, { width: ANCHO_UTIL_A4 });
    doc.font('Helvetica').fontSize(9.5)
       .fillColor('#dfe4f2')
       .text('StoryManager · Módulo de Inspecciones', MARGEN, 56, { width: ANCHO_UTIL_A4 });

    const ahora = aFecha(new Date());
    doc.fontSize(8.5).fillColor('#dfe4f2')
       .text('Generado: ' + ahora + (generadoPor ? '   ·   Por: ' + generadoPor : ''),
             MARGEN, 72, { width: ANCHO_UTIL_A4 });

    doc.fillColor(COLOR.texto);

    // -----------------------------------------------------------------------
    //  ALCANCE (filtros aplicados)
    // -----------------------------------------------------------------------
    let y = 118;
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.texto)
       .text('Alcance del documento', MARGEN, y);
    y += 17;

    const clavesFiltro = Object.keys(filtros || {}).filter(k => filtros[k]);
    doc.font('Helvetica').fontSize(9);
    if (!clavesFiltro.length) {
        doc.fillColor(COLOR.suave)
           .text('Sin filtros aplicados: este documento incluye TODO el historial de auditoría '
               + 'disponible en el sistema, sin importar la vista desde la que se exportó.',
               MARGEN, y, { width: ANCHO_UTIL_A4 });
        y += 26;
    } else {
        const etiquetas = {
            date_from: 'Desde', date_to: 'Hasta', location_id: 'Locación',
            inspector_id: 'Inspector', status: 'Estado de inspección', inspection_type: 'Tipo'
        };
        doc.fillColor(COLOR.suave);
        clavesFiltro.forEach(k => {
            doc.text('•  ' + (etiquetas[k] || k) + ':  ' + valor(filtros[k]), MARGEN + 4, y,
                     { width: ANCHO_UTIL_A4 - 4 });
            y += 13;
        });
        y += 8;
    }

    // Resumen
    if (resumen) {
        doc.font('Helvetica').fontSize(9).fillColor(COLOR.texto);
        doc.text('Incluye ' + resumen.inspecciones + ' inspección(es), ' + resumen.hallazgos
                 + ' hallazgo(s) y ' + resumen.correcciones + ' corrección(es).',
                 MARGEN, y, { width: ANCHO_UTIL_A4 });
        y += 22;
    }

    doc.moveTo(MARGEN, y).lineTo(doc.page.width - MARGEN, y).lineWidth(0.8).strokeColor(COLOR.linea).stroke();
    y += 16;

    // -----------------------------------------------------------------------
    //  CUERPO: una sección por inspección
    // -----------------------------------------------------------------------
    if (!inspecciones.length) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLOR.suave)
           .text('No hay inspecciones que cumplan los criterios seleccionados.',
                 MARGEN, y, { width: ANCHO_UTIL_A4, align: 'center' });
    }

    for (const insp of inspecciones) {
        y = asegurarEspacio(doc, y, 170);

        // --- Cabecera de la inspección ---------------------------------------
        doc.rect(MARGEN, y - 5, ANCHO_UTIL_A4, 21).fill(COLOR.banda);
        doc.fillColor(COLOR.cabeceraFondo).font('Helvetica-Bold').fontSize(11)
           .text(valor(insp.inspection_number), MARGEN + 7, y + 1, { width: 150 });
        doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave)
           .text(valor(insp.location_name || insp.location_id), MARGEN + 162, y + 2, { width: ANCHO_UTIL_A4 - 230 });
        doc.text('Estado: ' + valor(insp.status), MARGEN + 162, y + 14, { width: ANCHO_UTIL_A4 - 230 });
        y += 28;

        // --- Ficha ------------------------------------------------------------
        // Inspector: los inspectores son una entidad propia, con su propio id, y
        // no tienen que ver con los empleados. Se imprime el nombre guardado en
        // la propia inspeccion (la foto del momento en que se hizo) mas su id de
        // inspector. Cuando no hay nombre, el texto de inspector_display ya
        // explica el id, asi que no se le añade otra vez.
        const textoInspector = insp.inspector_name
            ? insp.inspector_name + '  ·  ID de inspector ' + valor(insp.inspector_id)
            : valor(insp.inspector_display);

        const ficha = [
            ['ID de inspección', valor(insp.inspection_number)],
            ['Inspector', textoInspector],
            ['Fecha', valor(aFecha(insp.inspection_date))],
            ['Hora', valor(aHora(insp.inspection_time))],
            ['Tipo de inspección', valor(insp.inspection_type)],
            ['Locación', valor(insp.location_name || insp.location_id)]
        ];
        y = fichaEnDosColumnas(doc, ficha, y);

        // --- Notas generales --------------------------------------------------
        y += 4;
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.texto)
           .text('Notas generales', MARGEN, y);
        y += 13;
        doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave);
        y = textoMultilinea(doc, insp.general_notes || '—', y, ANCHO_UTIL_A4) + 10;

        // --- Hallazgos --------------------------------------------------------
        const hallazgos = insp.findings || [];
        y = asegurarEspacio(doc, y, 90);

        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto)
           .text('Hallazgos (' + hallazgos.length + ')', MARGEN, y);
        y += 15;

        if (!hallazgos.length) {
            doc.font('Helvetica-Oblique').fontSize(9).fillColor(COLOR.suave)
               .text('Sin hallazgos registrados.', MARGEN + 7, y);
            y += 16;
        }

        for (const h of hallazgos) {
            y = asegurarEspacio(doc, y, 96);

            const colorEstado = (h.status === 'closed' || h.status === 'corrected' ||
                                 h.status === 'audited') ? COLOR.ok : COLOR.texto;

            doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colorEstado)
               .text('Hallazgo #' + h.id + (h.category ? '  ·  ' + h.category : ''),
                     MARGEN + 7, y);
            y += 12;

            const fichaH = [
                ['Título', valor(h.title)],
                ['Descripción', valor(h.description)],
                ['Categoría', valor(h.category)],
                ['Prioridad', valor(h.priority)],
                ['Estado', valor(h.status)],
                ['Asignado a', persona(h.assigned_display, h.assigned_to_name, h.assigned_name, h.assigned_to)],
                ['Creado', valor(aFecha(h.created_at))],
                ['Fecha límite', valor(h.due_date ? aFecha(h.due_date) : null)],
                ['Resuelto', valor(h.resolved_at ? aFecha(h.resolved_at) : null)]
            ];
            y = fichaEnDosColumnas(doc, fichaH, y, MARGEN + 7);

            // --- Correcciones del hallazgo ------------------------------------
            const corr = h.corrections || [];
            if (corr.length) {
                y = asegurarEspacio(doc, y, 70);
                doc.font('Helvetica-Bold').fontSize(9).fillColor(COLOR.texto)
                   .text('Correcciones (' + corr.length + ')', MARGEN + 14, y);
                y += 13;

                // Tabla de correcciones
                const cols = [
                    { t: 'ID',            w: 32,  al: 'left'  },
                    { t: 'Fecha',         w: 58,  al: 'left'  },
                    { t: 'Acción correctiva', w: ANCHO_UTIL_A4 - 32 - 58 - 78 - 58 - 14, al: 'left' },
                    { t: 'Asignado a',    w: 78,  al: 'left'  },
                    { t: 'Estado',        w: 58,  al: 'left'  }
                ];
                y = cabeceraTabla(doc, cols, MARGEN + 14, y);
                for (const c of corr) {
                    const celdas = [
                        String(c.id),
                        c.correction_date ? String(aFecha(c.correction_date)).slice(-10) : '—',
                        partir(c.description, 8, 70),
                        partir(c.assigned_display || c.assigned_to_name, 8, 22),
                        [valor(c.status)]
                    ];
                    y = filaTabla(doc, cols, celdas, MARGEN + 14, y);
                }
                y += 6;
            }
            y += 8;
        }

        // --- Historial de la inspección ---------------------------------------
        const hist = insp.history || [];
        if (hist.length) {
            y = asegurarEspacio(doc, y, 76);
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLOR.texto)
               .text('Cambios registrados (' + hist.length + ')', MARGEN + 7, y);
            y += 14;
            hist.forEach(he => {
                y = asegurarEspacio(doc, y, 22);
                doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.suave);
                const quien = he.changed_by ? 'ID ' + he.changed_by : 'sin responsable registrado';
                doc.text('•  ' + aFecha(he.changed_at) + '  ·  ' + quien
                    + '  ·  ' + valor(he.previous_status) + ' → ' + valor(he.new_status)
                    + (he.comment ? '  ·  ' + he.comment : ''),
                    MARGEN + 14, y, { width: ANCHO_UTIL_A4 - 14 });
                y = doc.y + 2;
            });
            y += 6;
        }

        doc.moveTo(MARGEN, y).lineTo(doc.page.width - MARGEN, y).lineWidth(0.5)
           .strokeColor(COLOR.linea).dash(2, { space: 2 }).stroke();
        doc.undash();
        y += 16;
    }

    // -----------------------------------------------------------------------
    //  PIES DE PAGINA
    // -----------------------------------------------------------------------
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.suave);
        doc.text('Historial de auditoría de inspecciones · StoryManager',
                 MARGEN, doc.page.height - 30, { width: ANCHO_UTIL_A4, align: 'left' });
        doc.text('Página ' + (i - rango.start + 1) + ' de ' + rango.count,
                 MARGEN, doc.page.height - 30, { width: ANCHO_UTIL_A4, align: 'right' });
    }

    doc.end();
    return doc;
}

// --- Utilidades de maquetacion ---------------------------------------------

function asegurarEspacio(doc, y, altoNecesario) {
    const limite = doc.page.height - MARGEN - altoNecesario;
    if (y > limite) { doc.addPage(); return MARGEN; }
    return y;
}

function textoMultilinea(doc, texto, y, ancho) {
    doc.text(texto, MARGEN, y, { width: ancho });
    return doc.y + 4;
}

// Ficha de dos columnas: etiqueta a la izquierda, valor a la derecha. Los
// valores largos pasan a su propia linea en lugar de salirse de la pagina.
function fichaEnDosColumnas(doc, campos, y, sangria) {
    sangria = sangria || 0;
    const xEtq = MARGEN + sangria;
    const xVal = MARGEN + 168;
    const anchoVal = doc.page.width - MARGEN - xVal;
    doc.fontSize(9);

    for (const [etiqueta, val] of campos) {
        doc.font('Helvetica').fontSize(8.5).fillColor(COLOR.suave);
        doc.text(etiqueta + ':', xEtq, y, { width: 160 });
        doc.font('Helvetica').fillColor(COLOR.texto);
        const largo = doc.widthOfString(String(val));
        if (largo <= anchoVal) {
            doc.text(String(val), xVal, y, { width: anchoVal });
            y = Math.max(y + 12, doc.y + 1);
        } else {
            // Valor largo: la etiqueta se queda arriba y el texto fluye debajo.
            y += 12;
            doc.text(String(val), xVal, y, { width: anchoVal });
            y = doc.y + 3;
        }
    }
    return y;
}

function cabeceraTabla(doc, cols, x, y) {
    const h = 15;
    doc.rect(x, y, ANCHO_UTIL_A4, h).fill(COLOR.banda);
    let cx = x + 4;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLOR.cabeceraFondo);
    for (const c of cols) {
        doc.text(c.t, cx, y + 4, { width: c.w - 4, align: c.al });
        cx += c.w;
    }
    return y + h;
}

function filaTabla(doc, cols, celdas, x, y) {
    const h = 13;
    doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.texto);
    let cx = x + 4;
    for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const v = celdas[i];
        const lineas = Array.isArray(v) ? v : [String(v)];
        doc.text(lineas.slice(0, 2).join('\n'), cx, y + 3, { width: c.w - 4, align: c.al });
        cx += c.w;
    }
    doc.moveTo(x, y + h).lineTo(x + ANCHO_UTIL_A4, y + h).lineWidth(0.4)
       .strokeColor(COLOR.linea).stroke();
    return y + h;
}

module.exports = { generarPDF, aFecha, aHora };