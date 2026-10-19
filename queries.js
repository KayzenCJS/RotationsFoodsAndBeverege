// ============================================================================
//  CONSULTAS INTELIGENTES: BUSQUEDA POR LOCACION ENTRENADA
// ============================================================================
//  Muestra quienes tienen una localizacion en el apartado "Locaciones
//  entrenadas" de su perfil, este trabajando donde este.
//
//  LO QUE NO HACE, Y POR QUE
//  --------------------------
//  No saca a la gente del historial de turnos. Que alguien haya trabajado una
//  vez en una localizacion no significa que este entrenado en ella: puede haber
//  ido para otra cosa y no volver. La pregunta es "quien esta entrenado", y esa
//  respuesta solo esta en el perfil.
//
//  No rellena con supuestos. Si una localizacion no tiene a nadie anotado, se
//  devuelve vacio y se explica. Antes esta consulta contaba asignaciones del dia
//  activo, asi que una localizacion sin turno parecia "sin personal" cuando en
//  realidad lo que faltaba era la informacion de entrenamiento.
//
//  No dibuja el Catalogo entero: solo se pintan las localizaciones que han
//  salido, para no cambiar el aspecto del modulo.
//
//  Los filtros (rol, grupo, certificacion, nombre) se aplican en el servidor,
//  sobre los datos reales, no en el navegador sobre una lista ya traida. Asi el
//  total que se enseña y los nombres que se ven siempre cuadran.
// ============================================================================

// Lo que se ha pedido en la ultima consulta: la localizacion y los filtros.
// Se guarda aparte de la respuesta para poder reaplicar un filtro sin tener que
// volver a escribir el nombre de la localizacion.
const consultaEntrenados = {
    texto: '',
    filtros: { role: '', group: '', cert: '' }
};

// El catalogo de localizaciones para el desplegable. Lo pide el servidor, no se
// construye en el HTML: la lista tiene que salir de la base.
let catalogoEntrenados = { localizaciones: [], certificaciones: [] };

// ---------------------------------------------------------------------------
//  Cargar el catalogo
// ---------------------------------------------------------------------------
// Se llama una sola vez al abrir la pestaña. Antes pedia una cosa y la otra
// siguiente, que eran dos viajes para lo mismo.
async function cargarCatalogoEntrenados() {
    try {
        const r = await apiRequest('/trained-at');
        const locs = await apiRequest('/locations');
        catalogoEntrenados = {
            localizaciones: Array.isArray(locs) ? locs : [],
            certificaciones: r.certificaciones || []
        };
        pintarDesplegableEntrenados();
    } catch (e) {
        console.error('No se pudo cargar el catálogo de localizaciones:', e);
    }
}

function pintarDesplegableEntrenados() {
    const sel = document.getElementById('trainedLocationSelect');
    if (sel && catalogoEntrenados.localizaciones.length) {
        sel.innerHTML = `<option value="">${esc(t('queries.trainedTab'))}</option>`
            + catalogoEntrenados.localizaciones
                .map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
    }
}

// ---------------------------------------------------------------------------
//  Consultar
// ---------------------------------------------------------------------------
async function consultarEntrenados() {
    const sel = document.getElementById('trainedLocationSelect');
    const txt = document.getElementById('trainedLocationInput');
    const cont = document.getElementById('trainedQueryResults');
    if (!cont) return;

    // El desplegable manda si hay algo elegido; si no, lo escrito. Permite las
    // dos formas sin tener que decidir por el usuario cual usar.
    const texto = (sel && sel.value) || (txt && txt.value.trim()) || '';

    if (!texto) {
        cont.innerHTML = `<p style="text-align:center;color:var(--text-tertiary);">${esc(t('queries.trainedHint'))}</p>`;
        return;
    }

    cont.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">…</p>';

    try {
        const params = new URLSearchParams();
        params.set('location', texto);
        if (consultaEntrenados.filtros.role) params.set('role', consultaEntrenados.filtros.role);
        if (consultaEntrenados.filtros.group) params.set('group', consultaEntrenados.filtros.group);
        if (consultaEntrenados.filtros.cert) params.set('cert', consultaEntrenados.filtros.cert);

        const r = await apiRequest('/trained-at?' + params.toString());
        consultaEntrenados.texto = texto;
        pintarResultadosEntrenados(r);
    } catch (e) {
        console.error('Error en la consulta de entrenados:', e);
        cont.innerHTML = `<p style="text-align:center;color:var(--danger);">${esc(t('notify.error'))}</p>`;
    }
}

// ---------------------------------------------------------------------------
//  Pintar el resultado
// ---------------------------------------------------------------------------
function pintarResultadosEntrenados(r, cont, titulo) {
    // Se puede pintar en la pestaña propia o en el hueco general de la
    // pestaña "Por Empleado". Sin destino se usa el de la pestaña.
    cont = cont || document.getElementById('trainedQueryResults');
    if (!cont) return;

    // ---- Ninguna localizacion se parece a lo escrito ----------------------
    if (r.modo === 'sin-coincidencia') {
        cont.innerHTML = `
            <div class="query-vacio">
                <p><strong>${esc(t('queries.noLocationMatch', { q: r.consulta }))}</strong></p>
                <small>${esc(t('queries.didYouMean'))}</small>
                <div class="query-sugerencias">
                    ${(r.sugerencias || []).map(n => `<span class="query-chip">${esc(n)}</span>`).join('')}
                </div>
            </div>`;
        return;
    }

    // ---- Botones de filtro ------------------------------------------------
    // Se construyen con lo que hay de verdad: los roles y certificaciones salen
    // de lo que la base tiene registrado. Un desplegable con opciones que no
    // existen seria peor que no tener desplegable.
    const roles = [...new Set(r.resultados.flatMap(x => x.empleados.map(e => e.role)))]
        .filter(Boolean).sort();
    const grupos = [...new Set(r.resultados.flatMap(x => x.empleados.flatMap(e => e.grupos)))]
        .filter(Boolean).sort();

    const filtros = `
        <div class="query-filtros">
            <span class="query-filtros-titulo">${esc(t('queries.filters'))}</span>
            <select id="tfRole" onchange="aplicarFiltrosEntrenados()">
                <option value="">${esc(t('queries.anyRole'))}</option>
                ${roles.map(x => `<option value="${esc(x)}"${consultaEntrenados.filtros.role === x ? ' selected' : ''}>${esc(getRoleName(x))}</option>`).join('')}
            </select>
            <select id="tfGroup" onchange="aplicarFiltrosEntrenados()">
                <option value="">${esc(t('queries.anyGroup'))}</option>
                ${grupos.map(x => `<option value="${esc(x)}"${consultaEntrenados.filtros.group === x ? ' selected' : ''}>${esc(groupLabel(x))}</option>`).join('')}
            </select>
            <select id="tfCert" onchange="aplicarFiltrosEntrenados()">
                <option value="">${esc(t('queries.anyCert'))}</option>
                ${(r.certificaciones || []).map(c =>
                    `<option value="${esc(c.nombre)}"${consultaEntrenados.filtros.cert === c.nombre ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}
            </select>
            <input type="text" id="tfNombre" placeholder="${esc(t('queries.searchByName'))}"
                   value="${esc(consultaEntrenados.filtros.nombre || '')}"
                   oninput="filtrarEntrenadosPorNombre()" />
            <button class="btn btn-secondary btn-sm" onclick="limpiarFiltrosEntrenados()">
                <i class="fas fa-times"></i> ${esc(t('queries.clearFilters'))}
            </button>
        </div>`;

    // Hay dos motivos muy distintos para que aqui no salga nadie, y la accion
    // que corresponde es distinta:
    //   - No hay nadie entrenado en esta localizacion: falta registrarlo.
    //   - Hay gente entrenada pero el filtro (rol, grupo, certificacion) deja a
    //     todos fuera: no falta informacion, sencillamente nadie cumple.
    // Decir lo segundo como lo primero manda a buscar datos que ya existen.
    const hayFiltros = !!r.filtrosPuestos
        || !!(r.filtros && (r.filtros.role || r.filtros.group || r.filtros.cert));

    const vacias = r.resultados.filter(x => !x.empleados.length);
    const conGente = r.resultados.filter(x => x.empleados.length);

    const bloques = conGente.map(x => `
        <div class="query-loc-bloque">
            <div class="query-loc-cabecera">
                <h4>${esc(t('queries.trainedFor', { loc: x.localizacion.name }))}</h4>
                <span class="query-loc-total">${x.empleados.length}</span>
            </div>
            <small class="query-loc-fuente">${esc(t('queries.trainedSource'))}</small>
            ${tablaEntrenados(x.empleados)}
        </div>`).join('');

    const avisosVacias = vacias.length ? `
        <div class="query-vacio">
            ${vacias.map(x => `<p><strong>${esc(hayFiltros
                ? t('queries.noneMatchFilters', { loc: x.localizacion.name })
                : t('queries.noneTrained', { loc: x.localizacion.name }))}</strong></p>`).join('')}
            <small>${esc(hayFiltros
                ? t('queries.noneMatchFiltersHint')
                : t('queries.noneTrainedHint'))}</small>
        </div>` : '';

    // Cuando hay resultados, se recuerda igualmente que hay localizaciones sin
    // datos. Es informacion que quien pregunta necesita aunque no la pidiera:
    // si alguien pregunta por Pixie y no sale nadie, tiene que saber si es que
    // no hay o es que falta registrarlo.
    const sinRegistrar = (r.sinRegistrar && r.sinRegistrar.length && conGente.length) ? `
        <div class="query-vacio query-vacio-aviso">
            <p><strong>${esc(t('queries.whyNoData'))}</strong></p>
            <small>${esc(t('queries.whyNoDataHint'))}</small>
            <div class="query-sugerencias">
                ${r.sinRegistrar.map(n => `<span class="query-chip">${esc(n)}</span>`).join('')}
            </div>
        </div>` : '';

    const cab = `
        <div class="query-resumen">
            <h4>${esc(r.nota || t('queries.trainedFor', { loc: titulo || r.consulta }))}</h4>
            <span class="query-total">${esc(t('queries.totalFound', { n: r.total }))}</span>
        </div>
        ${r.departamentos ? `<small class="query-departamentos">${esc(t('queries.departmentNote', {
            foods: r.departamentos.foods, retail: r.departamentos.retail }))}</small>` : ''}`;

    cont.innerHTML = cab + filtros + bloques + avisosVacias + sinRegistrar
        + (r.total ? `<p class="query-nota"><i class="fas fa-circle-info"></i> ${esc(t('queries.certMeaning'))}</p>` : '');

    // Los nombres de las personas, para el filtro por nombre, se guardan en la
    // fila de la tabla: no hace falta otra estructura.
    aplicaFiltroNombreEnTabla();
}

// Una fila por persona. Las columnas son las que pide el encargo: nombre, rol,
// grupo, departamento, certificaciones y estado.
function tablaEntrenados(empleados) {
    // Cada encabezado declara su clave: asi manda el diccionario sobre
    // cualquier palabra que el observador del DOM pueda encontrar.
    const th = (clave) => `<th data-i18n="${clave}">${esc(t(clave))}</th>`;

    return `
        <table class="query-tabla">
            <thead><tr>
                ${th('queries.colName')}
                ${th('queries.colRole')}
                ${th('queries.colGroup')}
                ${th('queries.colDept')}
                ${th('queries.colSince')}
                ${th('queries.colCerts')}
                ${th('queries.colStatus')}
            </tr></thead>
            <tbody>
                ${empleados.map(e => filaEntrenado(e)).join('')}
            </tbody>
        </table>`;
}

function filaEntrenado(e) {
    const certs = (e.formaciones || []).filter(x => /certif|bartend|alcohol|licen/i.test(x));

    // El estado se calcula con la misma funcion que usa el resto de la
    // aplicacion. El backend devuelve las banderas en crudo, no un texto, para
    // que aqui se traduzca al idioma activo.
    const estado = getEmployeeStatus({
        availability: {
            isOnBreak: e.is_on_break,
            isOnTraining: e.is_on_training,
            isDayOff: e.is_day_off,
            isHoliday: e.is_holiday,
            schedule: e.schedule
        }
    });

    const certificaciones = certs.length
        ? `<span title="${esc(certs.join(', '))}">${esc(t('queries.certCount', { n: certs.length }))}</span>`
        : `<span class="query-sin-cert">${esc(t('queries.noCerts'))}</span>`;

    return `
        <tr class="query-fila-entr" data-nombre="${esc(normalizeQuery(e.name))}">
            <td data-col="${esc(t('queries.colName'))}"><strong>${esc(e.name)}</strong></td>
            <td data-col="${esc(t('queries.colRole'))}">${esc(getRoleName(e.role))}</td>
            <td data-col="${esc(t('queries.colGroup'))}">${(e.grupos || []).map(g => `<span class="query-grupo">${esc(g)}</span>`).join(' ')}</td>
            <td data-col="${esc(t('queries.colDept'))}">${esc(e.departamento === 'Retail' ? t('queries.departmentRetail') : t('queries.departmentFoods'))}</td>
            <td data-col="${esc(t('queries.colSince'))}">${e.formadoEn ? esc(String(e.formadoEn).slice(0, 10)) : '—'}</td>
            <td data-col="${esc(t('queries.colCerts'))}">${certificaciones}</td>
            <td data-col="${esc(t('queries.colStatus'))}"><span class="status-indicator ${estado.class}">${esc(estado.text)}</span></td>
        </tr>`;
}

// ---------------------------------------------------------------------------
//  Filtros
// ---------------------------------------------------------------------------
// Los tres desplegables van al servidor: el total que se enseña arriba y los
// nombres de la tabla tienen que salir del mismo sitio, o se contradicen.
function aplicarFiltrosEntrenados() {
    consultaEntrenados.filtros.role = (document.getElementById('tfRole') || {}).value || '';
    consultaEntrenados.filtros.group = (document.getElementById('tfGroup') || {}).value || '';
    consultaEntrenados.filtros.cert = (document.getElementById('tfCert') || {}).value || '';
    consultarEntrenados();
}

function limpiarFiltrosEntrenados() {
    consultaEntrenados.filtros = { role: '', group: '', cert: '', nombre: '' };
    consultarEntrenados();
}

// El filtro por nombre no va al servidor a proposito: es una búsqueda sobre
// una lista que ya está en pantalla, y mandar una petición en cada tecla haría
// la caja lenta y ladeada. Es el único filtro que se aplica aquí, y solo sobre
// las filas ya recibidas: nunca amplía lo que el servidor ha dicho.
function filtrarEntrenadosPorNombre() {
    consultaEntrenados.filtros.nombre = (document.getElementById('tfNombre') || {}).value || '';
    aplicaFiltroNombreEnTabla();
}

// El mismo filtro por nombre pero acotado a un contenedor. La pestaña general y
// la propia tienen que funcionar igual, y comparten la funcion.
function aplicaFiltroNombreEnTabla(raiz) {
    const texto = normalizeQuery(consultaEntrenados.filtros.nombre || '');
    const filas = (raiz || document).querySelectorAll('.query-fila-entr');
    filas.forEach(fila => {
        const nombre = fila.getAttribute('data-nombre') || '';
        fila.style.display = !texto || nombre.includes(texto) ? '' : 'none';
    });
}

// ---------------------------------------------------------------------------
//  Preguntas en lenguaje natural
// ---------------------------------------------------------------------------
// La pestaña "Por Empleado" escribe una pregunta suelta. Si la pregunta va de
// gente entrenada en una localizacion, se contesta con estos mismos datos.
//
// Se busca la marca "entrenado" / "entrenada" / "puede trabajar" antes de la
// localizacion, que es como se escribe la pregunta de verdad. Si la pregunta
// tiene ademas un rol, un grupo o una certificacion, se llevan como filtro: el
// encargo pide aplicar todos los filtros que se pidan.
async function processQuery() {
    const input = document.getElementById('queryInput')?.value || '';
    const texto = input.trim();

    if (!texto) {
        document.getElementById('queryResults').innerHTML =
            `<p style="text-align:center;color:var(--text-tertiary);">${esc(t('queries.typeHint'))}</p>`;
        return;
    }

    // ¿Va de entrenamiento?
    if (/entrenad|puede trabajar|can work|qualified/i.test(texto)) {
        return responderPreguntaEntrenados(texto);
    }

    return processQueryOriginal(texto);
}

// -----------------------------------------------------------------------------
//  QUE LOCALIZACION MENCIONA LA PREGUNTA
// -----------------------------------------------------------------------------
// No vale con "el texto contiene el nombre entero": al preguntar "¿quienes estan
// entrenados en Pixie?" el texto es "quienes estan entrenados en pixie" y el
// nombre de la localizacion es "pixie kitchen", que no aparece completo.
//
// En una pregunta real la localizacion va al final, en dos o tres palabras, y el
// resto es ruido. Asi que se puntua cada localizacion por la palabra MAS LARGA de
// su nombre que aparezca dentro de la pregunta, y gana la que mas coincida:
//
//   "¿quienes estan entrenados en Pixie?"  -> pixie     (de "pixie kitchen")
//   "personas entrenadas en Oasis"         -> oasis     (de "teddy's at oasis")
//   "entrenados en Barnyard"               -> barnyard  (de "barnyard pizza")
//
// Se exige 4 letras o mas, y se descartan las palabras de la propia pregunta
// ("entrenados", "personas"), que salen en casi todas y no distinguirian nada.
const PALABRAS_RUIDO = new Set([
    'persona', 'personas', 'empleado', 'empleados', 'gente', 'equipo',
    'entrenado', 'entrenada', 'entrenados', 'entrenadas', 'entrenamiento',
    'trabajo', 'trabajar', 'puede', 'pueden', 'listo', 'lista', 'hay',
    'todos', 'todas', 'muestra', 'muestrame', 'dime', 'quien', 'quienes',
    'donde', 'cual', 'cuales', 'tiene', 'tienen', 'segun', 'estan', 'esta',
    'cuantos', 'cuantas', 'favor', 'ayuda', 'por', 'para', 'con', 'del', 'los', 'las'
]);

function localizacionDeLaPregunta(texto, localizaciones) {
    const norm = normalizeQuery(texto);
    let mejor = null;
    let mejorPuntos = 0;

    for (const loc of localizaciones) {
        const nombre = normalizeQuery(loc.name);
        const id = normalizeQuery(loc.id);

        // El nombre o el id enteros dentro de la pregunta: senal mas fuerte.
        if (norm.includes(id) || norm.includes(nombre)) {
            return { localizacion: loc, puntos: 100 };
        }

        // Si no, la palabra mas larga del nombre que aparezca en la pregunta.
        const palabras = nombre.split(' ').filter(p => p.length >= 4 && !PALABRAS_RUIDO.has(p));
        for (const p of palabras) {
            if (norm.includes(p) && p.length > mejorPuntos) {
                mejorPuntos = p.length;
                mejor = loc;
            }
        }
    }

    return mejor ? { localizacion: mejor, puntos: mejorPuntos } : null;
}

async function responderPreguntaEntrenados(texto) {
    const cont = document.getElementById('queryResults');
    if (!cont) return;

    const localizaciones = catalogoEntrenados.localizaciones.length
        ? catalogoEntrenados.localizaciones
        : await apiRequest('/locations');

    const encontrada = localizacionDeLaPregunta(texto, localizaciones);

    if (!encontrada) {
        cont.innerHTML = `
            <div class="query-vacio">
                <p><strong>${esc(t('queries.noLocationMatch', { q: texto }))}</strong></p>
                <small>${esc(t('queries.didYouMean'))}</small>
                <div class="query-sugerencias">
                    ${localizaciones.map(l => `<span class="query-chip">${esc(l.name)}</span>`).join('')}
                </div>
            </div>`;
        return;
    }

    const norm = normalizeQuery(texto);

    // Filtros que viajan en la propia pregunta. El encargo pide aplicar todos los
    // que se pidan, asi que se buscan rol, grupo y certificacion a la vez.
    const filtros = { role: '', group: '', cert: '' };
    const roles = [...new Set(employees.map(e => e.role))].filter(Boolean);
    for (const r of roles) {
        if (norm.includes(normalizeQuery(getRoleName(r))) || norm.includes(normalizeQuery(r))) {
            filtros.role = r;
            break;
        }
    }
    const grupos = ['A', 'B', 'C', 'D'].filter(g => new RegExp('\\b(grupo\\s*)?' + g + '\\b', 'i').test(texto));
    if (grupos.length) filtros.group = grupos[0];

    if (/bartender|alcohol/i.test(texto)) filtros.cert = 'alcohol';
    else if (/certificac/i.test(texto)) filtros.cert = 'certif';

    cont.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">…</p>';

    const params = new URLSearchParams({ location: encontrada.localizacion.id });
    if (filtros.role) params.set('role', filtros.role);
    if (filtros.group) params.set('group', filtros.group);
    if (filtros.cert) params.set('cert', filtros.cert);

    try {
        const r = await apiRequest('/trained-at?' + params.toString());
        // Se guarda si hay filtros puestos, para que el mensaje de "no hay
        // nadie" distinga entre "nadie entrenado aqui" y "nadie con ese filtro".
        r.filtrosPuestos = Object.values(filtros).filter(Boolean).length;
        pintarResultadosEn(r, cont, encontrada.localizacion);
    } catch (e) {
        console.error('Error en la pregunta de entrenados:', e);
        cont.innerHTML = `<p style="text-align:center;color:var(--danger);">${esc(t('notify.error'))}</p>`;
    }
}

// Reutiliza el mismo pintado que la pestaña, pero escribiendo en el hueco que
// se le pase. No se mueve el DOM de sitio: se pinta donde toque y ya.
function pintarResultadosEn(r, cont, elegida) {
    pintarResultadosEntrenados(r, cont, elegida ? elegida.name : r.consulta);
}

window.cargarCatalogoEntrenados = cargarCatalogoEntrenados;
window.consultarEntrenados = consultarEntrenados;
window.aplicarFiltrosEntrenados = aplicarFiltrosEntrenados;
window.limpiarFiltrosEntrenados = limpiarFiltrosEntrenados;
window.filtrarEntrenadosPorNombre = filtrarEntrenadosPorNombre;

// Exportacion para Node (pruebas). En el navegador no hace falta: las
// funciones de arriba ya son globales al ser declaraciones de primer nivel.
// Sigue el mismo patron que usa quinyx-parser.js.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        localizacionDeLaPregunta,
        PALABRAS_RUIDO
    };
}