// ============================================================================
//  DÍAS LIBRES (FRONTEND)
// ============================================================================
//  Lo que se puede hacer desde la ficha de un empleado:
//
//    - Marcar los días de la semana en los que no trabaja (recurrentes).
//      Cualquier combinación, sin límite. Ninguno marcado es lo mismo que
//      "no tiene días libres recurrentes", y es un caso válido.
//
//    - Añadir días libres SUELTOS para una fecha concreta (excepciones). No
//      cambian el patrón semanal: un día libre para el 15 de julio no deja de
//      trabajar los martes.
//
//  Y lo que se ve en el resto de la aplicación:
//
//    - Los empleados con día libre se muestran como NO DISPONIBLES en la
//      lista, en el buscador de personal y en el selector de asignación.
//
//    - Si ya había un turno guardado para un día que ahora es libre, se avisa
//      en la ficha, pero NO se borra: se decide a mano.
//
//  DE DÓNDE VIENEN LOS DATOS
//  ---------------------------
//  Los días recurrentes vienen en el propio listado de empleados
//  (employee_availability.days_off), que el backend ya devolvía. Las
//  excepciones son una tabla nueva con su propio endpoint.
//
//  NINGÚN DÍA SE CONVIERTE EN EL OTRO
//  ----------------------------------
//  Un recurrente sigue siendo recurrente y una excepción sigue siendo una
//  excepción. Guardar una excepción no toca days_off, y marcar un día de la
//  semana no toca las excepciones.
// ============================================================================

// Los días de la semana, en el MISMO formato que el backend usa para guardarlos
// (minúsculas en inglés). El texto visible se traduce aparte.
const DIAS_SEMANA_EMPLEADO = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

// Las excepciones que se están editando ahora mismo. Se guardan en una variable
// aparte del DOM porque se pintan y se borran antes de que se pulse "Guardar":
// el backend no se toca hasta entonces.
let excepcionesDiaLibreEnCurso = [];

// ============================================================================
//  PINTAR LAS CASILLAS DE LA SEMANA
// ============================================================================
//  El contenedor va vacío en el HTML y se llena aquí, para que los textos
//  salgan traducidos sin tenerlos duplicados en el HTML.
function pintarDiasLibreSemana(seleccionados) {
    const box = document.getElementById('empDaysOffWeek');
    if (!box) return;

    const marcados = new Set((seleccionados || []).map(d => String(d).toLowerCase()));

    box.innerHTML = DIAS_SEMANA_EMPLEADO.map(dia => `
        <label class="day-off-weekday">
            <input type="checkbox" value="${dia}" ${marcados.has(dia) ? 'checked' : ''} />
            <span>${esc(t('employees.days.' + dia))}</span>
        </label>
    `).join('');
}

// Los días marcados ahora mismo. Solo se leen los que están dentro del
// contenedor de días libres: el formulario tiene otras casillas (las de
// capacitaciones y las de grupos adicionales) que NO son días libres.
function diasLibreSeleccionados() {
    const box = document.getElementById('empDaysOffWeek');
    if (!box) return [];
    return [...box.querySelectorAll('input[type="checkbox"][value]')]
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

// ============================================================================
//  EXCEPCIONES
// ============================================================================
function pintarExcepcionesDiaLibre() {
    const box = document.getElementById('empDayOffExceptions');
    if (!box) return;

    if (!excepcionesDiaLibreEnCurso.length) {
        box.innerHTML = `<span class="no-assignments" data-i18n="employees.dayOffNoExceptions">Sin excepciones registradas</span>`;
        return;
    }

    box.innerHTML = excepcionesDiaLibreEnCurso.map((ex, i) => `
        <div class="day-off-exception-item">
            <span class="day-off-exception-date">${esc(ex.off_date)}</span>
            ${ex.reason ? `<span class="day-off-exception-reason">${esc(ex.reason)}</span>` : ''}
            <button type="button" class="btn btn-sm btn-danger-outline"
                    onclick="quitarExcepcionDiaLibre(${i})"
                    title="${esc(t('employees.dayOffRemoveException'))}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function anadirExcepcionDiaLibre() {
    const inputFecha = document.getElementById('empDayOffExceptionDate');
    const inputMotivo = document.getElementById('empDayOffExceptionReason');
    if (!inputFecha) return;

    const fecha = (inputFecha.value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        showNotification(t('employees.dayOffExceptionBadDate'), 'error');
        return;
    }

    // No se admiten dos excepciones para la misma fecha: la segunda machacaría
    // a la primera y el usuario no sabría cuál se quedó.
    if (excepcionesDiaLibreEnCurso.some(ex => ex.off_date === fecha)) {
        showNotification(t('employees.dayOffExceptionDuplicate'), 'error');
        return;
    }

    excepcionesDiaLibreEnCurso.push({
        off_date: fecha,
        reason: inputMotivo ? inputMotivo.value.trim() : ''
    });

    inputFecha.value = '';
    if (inputMotivo) inputMotivo.value = '';
    pintarExcepcionesDiaLibre();
}

function quitarExcepcionDiaLibre(indice) {
    excepcionesDiaLibreEnCurso.splice(indice, 1);
    pintarExcepcionesDiaLibre();
}

// ============================================================================
//  CARGAR Y GUARDAR
// ============================================================================
//  Carga los días libres de un empleado al abrir su ficha. Se hace aparte
//  porque las excepciones necesitan una consulta al backend.
//
//  Cuando el empleado es nuevo, se deja limpio: sin días recurrentes y sin
//  excepciones. Que "no tenga" es un estado válido, no una ausencia de datos.
async function cargarDiasLibreEmpleado(empleadoId) {
    pintarDiasLibreSemana([]);
    excepcionesDiaLibreEnCurso = [];
    pintarExcepcionesDiaLibre();
    limpiarAvisosDiaLibre();

    if (!empleadoId) return;

    // Los recurrentes ya vienen en el listado de empleados.
    const emp = findEmployee(empleadoId);
    if (emp) {
        const disponibilidad = emp.availability || {};
        const lista = disponibilidad.daysOff
            || (emp.days_off || [])
            || [];
        pintarDiasLibreSemana(lista);
    }

    // Las excepciones sí hay que pedirlas.
    try {
        const r = await apiRequest(`/employees/${empleadoId}/day-off-exceptions`);
        excepcionesDiaLibreEnCurso = (r && r.excepciones ? r.excepciones : []).map(x => ({
            off_date: x.off_date,
            reason: x.reason || ''
        }));
        pintarExcepcionesDiaLibre();
    } catch (e) {
        console.error('No se pudieron cargar las excepciones de día libre:', e);
    }
}

// Guarda los días libres del empleado que se está editando.
//
// Los RECURRENTES van con el empleado (PUT /employees, en availability.days_off)
// y las EXCEPCIONES tienen su propio endpoint.
//
// Si al guardar hay turnos que caen en un día que ahora es libre, se avisa
// DESPUÉS de guardar, con los datos de verdad: no se borra nada.
async function guardarDiasLibreEmpleado(empleadoId) {
    if (!empleadoId) return;

    const recurrentes = diasLibreSeleccionados();

    try {
        // 1. Los recurrentes, con el empleado.
        const emp = findEmployee(empleadoId);
        if (emp) {
            emp.availability = emp.availability || {};
            emp.availability.daysOff = recurrentes;
            emp.days_off = recurrentes;
        }

        // 2. Las excepciones, con su propio endpoint.
        const r = await apiRequest(`/employees/${empleadoId}/day-off-exceptions`, {
            method: 'PUT',
            body: JSON.stringify({ exceptions: excepcionesDiaLibreEnCurso })
        });

        if (r && r.asignaciones_en_conflicto && r.asignaciones_en_conflicto.length) {
            mostrarAvisosDiaLibre(r.asignaciones_en_conflicto);
        }
    } catch (e) {
        console.error('Error al guardar los días libres:', e);
    }
}

// ============================================================================
//  AVISOS
// ============================================================================
//  Cuando se marca un día libre y ya había un turno ese día, se dice. El turno
//  NO se borra: es una decisión del administrador, no un efecto secundario de
//  marcar una casilla.
function mostrarAvisosDiaLibre(conflictos) {
    const box = document.getElementById('empDayOffWarnings');
    if (!box) return;

    if (!conflictos || !conflictos.length) {
        box.innerHTML = '';
        return;
    }

    box.innerHTML = `
        <div class="day-off-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>${esc(t('employees.dayOffConflictTitle'))}</strong>
                <p>${esc(t('employees.dayOffConflictHint'))}</p>
                <ul>
                    ${conflictos.map(c => `<li>
                        ${esc(c.work_date || '')}
                        ${esc(c.location_name || t('employees.dayOffUnknownLocation'))}
                        ${esc(c.start_time || '')} - ${esc(c.end_time || '')}
                    </li>`).join('')}
                </ul>
            </div>
        </div>`;
}

function limpiarAvisosDiaLibre() {
    const box = document.getElementById('empDayOffWarnings');
    if (box) box.innerHTML = '';
}

// ============================================================================
//  ESTADO
// ============================================================================
//  ¿Está esta persona bloqueada el día que se está mirando?
//
//  Devuelve null si no, o un objeto con el motivo. Se usa para pintar el
//  estado en la lista y para avisar en el selector de asignación.
function motivoDiaLibreFecha(emp, fechaISO) {
    if (!emp || !fechaISO) return null;

    const disponibilidad = emp.availability || {};
    const lista = disponibilidad.daysOff || emp.days_off || [];

    // El flag de "hoy libre" es una marca explícita de una sola fecha.
    if (disponibilidad.isDayOff === true || emp.is_day_off === true) {
        return { tipo: 'hoy', etiqueta: t('employees.dayOffStatus') };
    }

    if (!Array.isArray(lista) || !lista.length) return null;

    const dia = nombreDiaSemana(fechaISO);
    if (!dia) return null;

    if (lista.map(d => String(d).toLowerCase()).includes(dia)) {
        return { tipo: 'recurrente', etiqueta: t('employees.dayOffStatus'), diaSemana: dia };
    }

    return null;
}

// El nombre del día de una fecha, en el formato que usa el backend.
function nombreDiaSemana(fechaISO) {
    const DIAS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const d = new Date(String(fechaISO).slice(0, 10) + 'T12:00:00Z');
    const n = d.getUTCDay();
    return Number.isInteger(n) ? DIAS[n] : null;
}

// Los empleados con día libre el día indicado, tal y como lo devuelve el
// backend (incluidas las excepciones). Es la fuente de verdad para el informe
// y para el panel de la fecha.
let noDisponiblesDelDia = { fecha: null, lista: [], conflictos: [] };

async function cargarNoDisponiblesDelDia(fecha) {
    if (!fecha) {
        noDisponiblesDelDia = { fecha: null, lista: [], conflictos: [] };
        return noDisponiblesDelDia;
    }
    try {
        const r = await apiRequest('/day-off-status?date=' + encodeURIComponent(fecha));
        noDisponiblesDelDia = {
            fecha: r.fecha,
            lista: r.no_disponibles || [],
            conflictos: r.asignaciones_en_conflicto || []
        };
    } catch (e) {
        console.error('No se pudo consultar el estado de días libres:', e);
        noDisponiblesDelDia = { fecha, lista: [], conflictos: [] };
    }
    return noDisponiblesDelDia;
}

window.pintarDiasLibreSemana = pintarDiasLibreSemana;
window.diasLibreSeleccionados = diasLibreSeleccionados;
window.pintarExcepcionesDiaLibre = pintarExcepcionesDiaLibre;
window.anadirExcepcionDiaLibre = anadirExcepcionDiaLibre;
window.quitarExcepcionDiaLibre = quitarExcepcionDiaLibre;
window.cargarDiasLibreEmpleado = cargarDiasLibreEmpleado;
window.guardarDiasLibreEmpleado = guardarDiasLibreEmpleado;
window.motivoDiaLibreFecha = motivoDiaLibreFecha;
window.cargarNoDisponiblesDelDia = cargarNoDisponiblesDelDia;
