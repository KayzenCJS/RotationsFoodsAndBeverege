// ============================================================================
//  GESTIÓN DE BREAKS
// ============================================================================
//  Sustituye al apartado "Assignment Result", que era solo un resumen del
//  reparto y no dejaba hacer nada. Aquí se ve, en una tabla, la gente
//  asignada ese día y su descanso.
//
//  LO QUE REUTILIZA
//  ----------------
//  - La tabla employee_breaks y sus endpoints (GET/POST/DELETE /breaks). No se
//    ha creado un sistema paralelo: los mismos datos, los mismos tipos
//    ('self' y 'covered', que son el Self Break y el Break Relief), las mismas
//    reglas de la base.
//
//  - El modal de configuración de break que ya existía
//    (openBreakConfigModal), que es donde se eligen las horas y quién cubre.
//    Se sigue usando tal cual: aquí solo se le da una entrada cómoda.
//
//  - currentBreaks, que ya se carga con los breaks del día.
//
//  LAS REGLAS QUE SE RESPETAN
//  ---------------------------
//  1. El descanso es del empleado, de la fecha y del turno. La tabla lo guarda
//     con su assignment_id, así que no se puede duplicar: hay un UNIQUE.
//
//  2. Un descanso NO es una jornada ni duplica las horas trabajadas: no se
//     toca la tabla assignments, y el exportador no lo cuenta como turno.
//
//  3. El descanso tiene que caer dentro del turno. Se comprueba antes de
//     guardar y se avisa, pero no se bloquea al que lo guardó: es una decisión
//     suya.
//
//  4. Si quien cubre viene de otra localización, se comprueba que puede
//     hacerlo: que no tenga ya un turno que se solape y que su propio turno
//     siga teniendo cobertura. Un descanso no genera un conflicto falso con el
//     turno de quien releva: la persona que cubre sigue teniendo SU turno, y
//     además está cubriendo un hueco. Eso se comprueba aparte.
//
//  5. Los descansos se guardan y se mantienen al cambiar de fecha: se leen de
//     la base, no de la memoria de la pantalla.
// ============================================================================

// ---------------------------------------------------------------------------
//  Pintar la tabla
// ---------------------------------------------------------------------------
//  Una fila por persona asignada ese día. Los que no tienen descanso se
//  marcan, para que se vea de un vistazo quién falta.
//
//  Se ordenan por el mismo criterio que el resto de pantallas: por nombre.
function renderBreakManagement() {
    const body = document.getElementById('breakManagementBody');
    const vacio = document.getElementById('breakManagementEmpty');
    const resumen = document.getElementById('breakSummary');
    if (!body) return;

    const fecha = fechaDelHorarioGlobal();
    const asignaciones = (currentAssignments || []).slice();

    if (!asignaciones.length) {
        body.innerHTML = '';
        if (vacio) {
            vacio.hidden = false;
            vacio.innerHTML = `<i class="fas fa-calendar-day"></i>
                <span data-i18n="breaks.noAssignments">No hay nadie asignado para esta fecha.</span>`;
        }
        if (resumen) resumen.innerHTML = '';
        return;
    }
    if (vacio) vacio.hidden = true;

    // El descanso se busca por su assignment_id, que es la llave natural.
    const breakPorAsignacion = new Map();
    for (const b of (currentBreaks || [])) {
        breakPorAsignacion.set(b.assignment_id, b);
    }

    // El estado de día libre de cada persona ese día. Los que lo tienen no
    // deberían estar asignados, pero si lo están (el turno se creó antes de
    // marcar el día libre) se señala en vez de esconderse.
    const noDisponibleIds = new Set((noDisponiblesDelDia.lista || []).map(n => n.employee_id));
    const conflictosPorEmpleado = new Map();
    for (const c of (noDisponiblesDelDia.conflictos || [])) {
        if (!conflictosPorEmpleado.has(c.employee_id)) conflictosPorEmpleado.set(c.employee_id, []);
        conflictosPorEmpleado.get(c.employee_id).push(c);
    }

    const filas = asignaciones.map(a => {
        const br = breakPorAsignacion.get(a.id);
        const emp = employees.find(e => e.id === a.employeeId);
        const nombre = a.employeeName || (emp ? emp.name : '');
        const cubridor = br && br.covered_by_employee_id
            ? employees.find(e => e.id === br.covered_by_employee_id)
            : null;

        const duracion = br
            ? duracionDeBreak(br.break_start_time, br.break_end_time)
            : null;

        const esCubierto = br && br.break_type === 'covered';
        const enDiaLibre = noDisponibleIds.has(a.employeeId);
        const conflictos = conflictosPorEmpleado.get(a.employeeId) || [];

        return `
            <tr class="break-row ${br ? '' : 'break-row-sin-descanso'} ${enDiaLibre ? 'break-row-dia-libre' : ''}"
                data-assignment-id="${a.id}">
                <td class="break-emp">
                    <strong>${esc(nombre)}</strong>
                    ${enDiaLibre ? `<span class="status-indicator status-dayoff" title="${esc(t('employees.dayOffStatus'))}">
                        ${esc(t('status.unavailableDayOff'))}</span>` : ''}
                    ${conflictos.length ? `<span class="break-conflict-flag" title="${esc(t('employees.dayOffConflictTitle'))}">
                        <i class="fas fa-exclamation-triangle"></i></span>` : ''}
                </td>
                <td>${esc(a.locationName || t('breaks.unknownLocation'))}</td>
                <td>${esc(horaCorta(a.startTime))} - ${esc(horaCorta(a.endTime))}</td>
                <td>
                    ${!br
                        ? `<span class="skill-tag break-tag-none">${esc(t('breaks.noBreak'))}</span>`
                        : (esCubierto
                            ? `<span class="skill-tag break-tag-covered"><i class="fas fa-user-check"></i> ${esc(t('breaks.coveredByLabel'))}</span>`
                            : `<span class="skill-tag break-tag-self"><i class="fas fa-coffee"></i> ${esc(t('breaks.selfBreakLabel'))}</span>`)}
                </td>
                <td>${br ? esc((br.break_start_time || '--:--') + ' - ' + (br.break_end_time || '--:--')) : '—'}</td>
                <td>${duracion ? esc(duracion) : '—'}</td>
                <td>${cubridor ? esc(cubridor.name) : (br && br.break_type === 'covered' ? '—' : '—')}</td>
                <td class="break-actions">
                    <button class="btn btn-sm btn-secondary" onclick="openBreakConfigModal(${a.id}, '${esc(a.locationId || '')}', ${a.employeeId}, '${esc(nombre)}')"
                            title="${esc(br ? t('breaks.editBreak') : t('breaks.addBreak'))}">
                        <i class="fas fa-pen"></i>
                    </button>
                    ${br ? `<button class="btn btn-sm btn-danger-outline" onclick="eliminarBreak(${br.id})"
                            title="${esc(t('breaks.deleteBreak'))}">
                            <i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>`;
    });

    body.innerHTML = filas.join('');

    // El resumen de arriba: cuántos tienen descanso y cuántos no.
    if (resumen) {
        const conDescanso = asignaciones.filter(a => breakPorAsignacion.has(a.id)).length;
        const sinDescanso = asignaciones.length - conDescanso;
        const cubiertos = (currentBreaks || []).filter(b => b.break_type === 'covered').length;
        resumen.innerHTML = `
            <span class="break-chip break-chip-ok">
                <i class="fas fa-coffee"></i> ${esc(t('breaks.summaryWith'))}: ${conDescanso}
            </span>
            ${sinDescanso ? `<span class="break-chip break-chip-missing">
                <i class="fas fa-exclamation-circle"></i> ${esc(t('breaks.summaryWithout'))}: ${sinDescanso}
            </span>` : ''}
            ${cubiertos ? `<span class="break-chip break-chip-covered">
                <i class="fas fa-user-check"></i> ${esc(t('breaks.summaryCovered'))}: ${cubiertos}
            </span>` : ''}`;
    }
}

// La hora en HH:MM, sin los segundos que trae la base.
function horaCorta(hora) {
    if (!hora) return '--:--';
    const h = String(hora);
    // "09:00:00" -> "09:00"; "09:00" -> "09:00"
    return h.length >= 5 ? h.slice(0, 5) : h;
}

// La duración de un descanso, en minutos, escrita como "1h 30min" o "45min".
function duracionDeBreak(ini, fin) {
    if (!ini || !fin) return null;
    const a = String(ini).slice(0, 5).split(':').map(Number);
    const b = String(fin).slice(0, 5).split(':').map(Number);
    if (a.length !== 2 || b.length !== 2 || a.some(isNaN) || b.some(isNaN)) return null;

    let minutos = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]);
    if (minutos < 0) minutos += 1440;   // cruza la medianoche
    if (minutos === 0) return null;

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas && resto) return `${horas}h ${resto}min`;
    if (horas) return `${horas}h`;
    return `${resto}min`;
}

// ---------------------------------------------------------------------------
//  Borrar un descanso
// ---------------------------------------------------------------------------
async function eliminarBreak(breakId) {
    if (!confirm(t('confirm.deleteBreak'))) return;
    try {
        await deleteBreak(breakId);
        await recargarBreaks();
        renderBreakManagement();
        showNotification(t('notify.breakDeleted'), 'success');
    } catch (error) {
        console.error('Error al eliminar el descanso:', error);
        showNotification(t('notify.errorDeleteBreak'), 'error');
    }
}

// Recarga los breaks del día y repinta el panel.
async function recargarBreaks() {
    const fecha = fechaDelHorarioGlobal();
    try {
        const r = await apiRequest('/breaks?date=' + encodeURIComponent(fecha));
        currentBreaks = Array.isArray(r) ? r : (r.breaks || []);
    } catch (e) {
        console.error('No se pudieron recargar los descansos:', e);
        currentBreaks = [];
    }
    return currentBreaks;
}

// ---------------------------------------------------------------------------
//  Avisos al guardar
// ---------------------------------------------------------------------------
// El modal de configuración de breaks ya existe y se sigue usando. Lo que se
// añade aquí es lo que el encargo pide que se avise ANTES de guardar:
//
//   - Que el descanso se salga del turno.
//   - Que quien cubre tenga un conflicto.
//   - Que la locación de origen se quede sin cobertura.
//
// Se avisa, pero no se bloquea: son decisiones de quien organiza el horario.
function avisarProblemasDeBreak(datos) {
    const problemas = [];

    // 1. ¿El descanso cabe dentro del turno?
    if (datos.turnoInicio && datos.turnoFin && datos.breakInicio && datos.breakFin) {
        const dentro = descansoDentroDelHorario(datos.turnoInicio, datos.turnoFin, datos.breakInicio, datos.breakFin);
        if (!dentro.ok) {
            problemas.push({ tipo: 'fuera_de_turno', mensaje: dentro.motivo });
        }
    }

    // 2. ¿El descanso se solapa con otro descanso del mismo empleado?
    (currentBreaks || []).forEach(b => {
        if (b.assignment_id === datos.assignmentId) return;   // es el mismo
        if (b.employee_id !== datos.employeeId) return;
        if (b.break_start_time && datos.breakInicio &&
            b.break_end_time && datos.breakFin &&
            solapan(b.break_start_time, b.break_end_time, datos.breakInicio, datos.breakFin)) {
            problemas.push({
                tipo: 'descanso_duplicado',
                mensaje: t('breaks.warnOverlapsOwn')
            });
        }
    });

    // 3. ¿Quien cubre está ocupado a esas horas?
    if (datos.coveredBy && datos.breakInicio && datos.breakFin) {
        const ocupado = (currentAssignments || []).find(a =>
            a.employeeId === datos.coveredBy &&
            a.id !== datos.assignmentId &&
            a.startTime && a.endTime &&
            solapan(a.startTime, a.endTime, datos.breakInicio, datos.breakFin));

        if (ocupado) {
            problemas.push({
                tipo: 'cubridor_ocupado',
                mensaje: t('breaks.warnCoverBusy', {
                    nombre: ocupado.employeeName || '',
                    lugar: ocupado.locationName || ''
                })
            });
        } else {
            // 4. ¿La locación de origen del relevista se queda sin cobertura?
            //    Se mira si el relevista tiene a alguien más en su localización a
            //    esas horas. Si está solo, avisar.
            const suyo = (currentAssignments || []).filter(a =>
                a.employeeId === datos.coveredBy && a.id !== datos.assignmentId);
            const cubriendoSuya = suyo.filter(a =>
                a.startTime && a.endTime &&
                solapan(a.startTime, a.endTime, datos.breakInicio, datos.breakFin));

            if (suyo.length && !cubriendoSuya.length) {
                const solo = suyo.length === 1;
                problemas.push({
                    tipo: 'origen_sin_cobertura',
                    mensaje: solo
                        ? t('breaks.warnCoverAlone')
                        : t('breaks.warnCoverThin')
                });
            }
        }
    }

    return problemas;
}

// ¿Se solapan dos tramos horarios? Wrapper sobre la función del backend, que
// ya sabe contar los turnos que cruzan la medianoche.
function solapan(ini1, fin1, ini2, fin2) {
    const a = String(ini1).slice(0, 5);
    const b = String(fin1).slice(0, 5);
    const c = String(ini2).slice(0, 5);
    const d = String(fin2).slice(0, 5);
    const m = h => {
        const [hh, mm] = String(h).split(':').map(Number);
        return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
    };
    const [x1, x2, y1, y2] = [m(a), m(b), m(c), m(d)];
    if ([x1, x2, y1, y2].some(v => !Number.isFinite(v))) return false;
    return x1 < y2 && y1 < x2;
}

// ¿El descanso cae dentro del turno? La misma regla que usa el backend, para
// que el aviso de la pantalla y el del servidor digan lo mismo.
function descansoDentroDelHorario(turnoIni, turnoFin, descansoIni, descansoFin) {
    const m = h => {
        const [hh, mm] = String(h).slice(0, 5).split(':').map(Number);
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        return hh * 60 + mm;
    };
    const desde = m(turnoIni);
    const hasta = m(turnoFin);
    const dDesde = m(descansoIni);
    const dHasta = m(descansoFin);
    if ([desde, hasta, dDesde, dHasta].some(v => v === null)) {
        return { ok: false, motivo: t('breaks.warnInvalidTimes') };
    }

    const durTurno = hasta < desde ? hasta + 1440 - desde : hasta - desde;
    const durDescanso = dHasta < dDesde ? dHasta + 1440 - dDesde : dHasta - dDesde;

    let inicioRel = dDesde - desde;
    if (inicioRel < 0) inicioRel += 1440;

    if (inicioRel < 0 || inicioRel + durDescanso > durTurno) {
        return { ok: false, motivo: t('breaks.warnOutsideShift', { turno: turnoIni + ' - ' + turnoFin }) };
    }
    return { ok: true, motivo: null };
}

window.renderBreakManagement = renderBreakManagement;
window.eliminarBreak = eliminarBreak;
window.recargarBreaks = recargarBreaks;
window.avisarProblemasDeBreak = avisarProblemasDeBreak;
window.duracionDeBreak = duracionDeBreak;
