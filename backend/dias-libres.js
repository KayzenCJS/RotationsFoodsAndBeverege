// ============================================================================
//  DÍAS LIBRES
// ============================================================================
//  Dos conceptos que se guardan por separado y no se mezclan:
//
//    DÍA LIBRE RECURRENTE
//      Los días de la semana en los que la persona normalmente no trabaja.
//      "Todos los martes". Vive en employee_availability.days_off, que ya
//      existía y que el motor de asignación automática ya leía.
//
//    DÍA LIBRE EXCEPCIONAL
//      Un día libre concreto, para una fecha concreta. "El 15 de julio no
//      trabajo, aunque normalmente sí". Vive en la tabla nueva
//      employee_day_off_exceptions.
//
//  Por qué separados: si un recurrente se convirtiera en excepción al pasar
//  una fecha, el día dejaría de estar bloqueado para las demás semanas. Son
//  cosas distintas y se guardan en sitios distintos.
//
//  LO QUE YA EXISTÍA Y NO SE TOCA
//  ------------------------------
//  days_off, is_day_off y holidays ya estaban en employee_availability. El
//  motor de asignación automática (auto-assign.js) ya leía days_off e is_day_off
//  para rechazar a alguien. Aquí se centraliza la comprobación para que la
//  usen también el backend, el frontend, los reportes y el exportador, con la
//  misma regla y sin cuatro versiones distintas.
//
//  EL VALOR "sunday" QUE VENÍA PUESTO
//  ----------------------------------
//  Los 44 empleados tenían days_off = ["sunday"], y el valor salía hardcodeado
//  en el formulario de alta: no lo había elegido nadie y no había ninguna
//  casilla donde verlo o cambiarlo. Si se hubiera dejado, la función nueva
//  habría salido con las 44 fichas ya marcadas en domingo, que es justo lo que
//  no se puede pedir a quien la usa.
//
//  Por eso se limpia (ver migrar_dias_libres.js, que deja copia para
//  deshacerlo) y cada persona configura los suyos. Quien quiera el domingo
//  libre para alguien, lo marca en su ficha.
// ============================================================================

// Los nombres de día, en el MISMO formato que usa el resto del sistema:
// minúsculas en inglés, como en auto-assign.js (DIAS) y en la columna days_off.
// No se inventan nombres nuevos: se reutiliza el existente para que una lista
// guardada ayer siga valiendo hoy.
const DIAS_SEMANA = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

// Lo que se usa en pantalla, con su equivalente en los dos idiomas.
const DIAS_ETIQUETA = {
    sunday: { es: 'domingo', en: 'Sunday' },
    monday: { es: 'lunes', en: 'Monday' },
    tuesday: { es: 'martes', en: 'Tuesday' },
    wednesday: { es: 'miércoles', en: 'Wednesday' },
    thursday: { es: 'jueves', en: 'Thursday' },
    friday: { es: 'viernes', en: 'Friday' },
    saturday: { es: 'sábado', en: 'Saturday' }
};

// El día de la semana de una fecha, en ese mismo formato.
// Se calcula a mediodía en UTC para que el cambio de día por zona horaria no
// mueva el nombre del día. Es lo mismo que hace diaSemanaDe() en
// auto-assign-routes.js.
function diaSemana(fechaISO) {
    const d = new Date(String(fechaISO).slice(0, 10) + 'T12:00:00Z');
    return DIAS_SEMANA[d.getUTCDay()];
}

// Normaliza lo que venga de la base o del formulario a nombres de día válidos.
// Filtra lo que no sea un día conocido, para que un valor raro no bloquee a
// alguien un día que no existe.
function normalizarDias(lista) {
    if (!Array.isArray(lista)) return [];
    const vistos = new Set();
    for (const d of lista) {
        const n = String(d || '').trim().toLowerCase();
        if (DIAS_SEMANA.includes(n)) vistos.add(n);
    }
    // Se devuelve en el orden de la semana, no en el que viniera: así la
    // lista se ve igual guarde quien la guarde.
    return DIAS_SEMANA.filter(d => vistos.has(d));
}

// -----------------------------------------------------------------------------
//  ¿Es día libre?
// -----------------------------------------------------------------------------
// El día libre RECURRENTE se puede responder sin tocar la base: depende solo
// de la lista de la ficha y del día de la semana de la fecha.
//
//  disponibilidad: { is_day_off, days_off, ... }   (la fila de employee_availability)
//  fechaISO: 'YYYY-MM-DD'
function esDiaLibreRecurrente(disponibilidad, fechaISO) {
    const d = disponibilidad || {};
    if (!fechaISO) return false;

    // is_day_off es la marca de "hoy está libre" (una sola fecha concreta, la
    // que se está mirando). Se respeta tal cual.
    if (d.is_day_off === true) return true;

    const dias = normalizarDias(d.days_off);
    if (!dias.length) return false;
    return dias.includes(diaSemana(fechaISO));
}

// El día EXCEPCIONAL sí necesita la base: son filas.
//
// Devuelve null si no es excepción, o { fecha, motivo } si lo es.
async function buscarExcepcion(pool, employeeId, fechaISO) {
    if (!employeeId || !fechaISO) return null;
    const r = await pool.query(
        `SELECT off_date::text AS fecha, reason
           FROM employee_day_off_exceptions
          WHERE employee_id = $1 AND off_date = $2::date`,
        [employeeId, String(fechaISO).slice(0, 10)]
    );
    if (!r.rows.length) return null;
    return {
        fecha: r.rows[0].fecha,
        motivo: r.rows[0].reason || null
    };
}

// Comprobación completa: recurrente O excepción.
//
// Devuelve null si la persona está disponible, o un objeto con el motivo por el
// que no lo está. El motivo se usa tal cual en el mensaje de error y en el
// informe, para que quien lo lea sepa si es un patrón semanal o una fecha
// suelta.
async function motivoDiaLibre(pool, disponibilidad, employeeId, fechaISO) {
    // El flag de "hoy libre" se mira primero: es la marca más explícita.
    if (disponibilidad && disponibilidad.is_day_off === true) {
        return { tipo: 'hoy', etiqueta: 'día libre', fecha: String(fechaISO).slice(0, 10), motivo: null };
    }

    // Excepción concreta para esta fecha.
    const exc = await buscarExcepcion(pool, employeeId, fechaISO);
    if (exc) {
        return { tipo: 'excepcion', etiqueta: 'día libre excepcional', fecha: exc.fecha, motivo: exc.motivo };
    }

    // Recurrente: depende del día de la semana.
    const dias = normalizarDias(disponibilidad && disponibilidad.days_off);
    const hoy = diaSemana(fechaISO);
    if (dias.length && hoy && dias.includes(hoy)) {
        return {
            tipo: 'recurrente',
            etiqueta: 'descansa los ' + hoy,
            fecha: String(fechaISO).slice(0, 10),
            diaSemana: hoy,
            motivo: null
        };
    }

    return null;
}

// -----------------------------------------------------------------------------
//  Listado de quién no está disponible un día
// -----------------------------------------------------------------------------
// Para el informe y para el panel de la fecha. Devuelve SOLO los que están
// bloqueados, con el motivo, para que la interfaz pueda mostrarlos.
//
// No incluye a quien tiene un turno: un empleado con turno no está "no
// disponible", y una asignación existente en un día libre se informa aparte
// como conflicto, que es otra cosa.
async function listadoNoDisponibles(pool, employeeIds, fechaISO) {
    if (!employeeIds || !employeeIds.length) return [];

    const ids = employeeIds.map(Number).filter(n => Number.isInteger(n));
    if (!ids.length) return [];

    const [disp, exc] = await Promise.all([
        pool.query(
            `SELECT employee_id, is_day_off, days_off
               FROM employee_availability
              WHERE employee_id = ANY($1::int[])`, [ids]),
        pool.query(
            `SELECT employee_id, off_date::text AS fecha, reason
               FROM employee_day_off_exceptions
              WHERE employee_id = ANY($1::int[]) AND off_date = $2::date`,
            [ids, String(fechaISO).slice(0, 10)])
    ]);

    const dispPor = new Map(disp.rows.map(d => [d.employee_id, d]));
    const excPor = new Map(exc.rows.map(e => [e.employee_id, e]));

    const salida = [];
    for (const id of ids) {
        const d = dispPor.get(id);
        const e = excPor.get(id);

        let motivo = null;
        if (d && d.is_day_off === true) {
            motivo = { tipo: 'hoy', etiqueta: 'día libre', fecha: String(fechaISO).slice(0, 10), motivo: null };
        } else if (e) {
            motivo = { tipo: 'excepcion', etiqueta: 'día libre excepcional', fecha: e.fecha, motivo: e.reason };
        } else {
            const dias = normalizarDias(d && d.days_off);
            const hoy = diaSemana(fechaISO);
            if (dias.length && hoy && dias.includes(hoy)) {
                motivo = {
                    tipo: 'recurrente', etiqueta: 'descansa los ' + hoy,
                    fecha: String(fechaISO).slice(0, 10), diaSemana: hoy, motivo: null
                };
            }
        }
        if (motivo) salida.push({ employee_id: id, ...motivo });
    }
    return salida;
}

// -----------------------------------------------------------------------------
//  Utilidades de horario
// -----------------------------------------------------------------------------
// Minutos que dura un descanso, o null si las horas no valen.
// Se usa para mostrar la duración, y para comprobar que el descanso cabe
// dentro del turno.
function duracionMinutos(ini, fin) {
    if (!ini || !fin) return null;
    const a = String(ini).slice(0, 5);
    const b = String(fin).slice(0, 5);
    const [h1, m1] = a.split(':').map(Number);
    const [h2, m2] = b.split(':').map(Number);
    if ([h1, m1, h2, m2].some(n => !Number.isFinite(n))) return null;
    let d = (h2 * 60 + m2) - (h1 * 60 + m1);
    // Un descanso que cruza la medianoche dura "lo que falta" para volver a
    // empezar, que es lo mismo que se hace con los turnos.
    if (d < 0) d += 24 * 60;
    return d;
}

// ¿El descanso está dentro del turno?
//
// Regla: el descanso tiene que caer dentro del horario laboral. Se admite que
// termine justo a la hora de salida, y se admite que empiece justo a la hora
// de entrada. Fuera de eso, el descanso no es de este turno.
//
// Devuelve { ok, motivo }.
function descansoDentroDelTurno(turnoIni, turnoFin, descansoIni, descansoFin) {
    if (!turnoIni || !turnoFin) return { ok: true, motivo: null };
    if (!descansoIni || !descansoFin) return { ok: false, motivo: 'Faltan las horas del descanso' };

    const desde = minutosAbsolutos(turnoIni);
    const hasta = minutosAbsolutos(turnoFin);
    const dDesde = minutosAbsolutos(descansoIni);
    const dHasta = minutosAbsolutos(descansoFin);

    if (desde === null || hasta === null || dDesde === null || dHasta === null) {
        return { ok: false, motivo: 'Horas inválidas' };
    }

    // Un turno que cruza la medianoche: se mide sobre las 24 horas.
    const durTurno = hasta < desde ? hasta + 1440 - desde : hasta - desde;
    const durDescanso = dHasta < dDesde ? dHasta + 1440 - dDesde : dHasta - dDesde;

    // Se pasa el inicio del descanso a la misma referencia que el turno.
    let inicioRel = dDesde - desde;
    if (inicioRel < 0) inicioRel += 1440;
    // Y si el descanso se solapa con el principio del turno, es que empezó el
    // día anterior: se ajusta para que no se escapes.
    if (inicioRel >= 1440) inicioRel -= 1440;

    if (inicioRel < 0 || inicioRel + durDescanso > durTurno) {
        return {
            ok: false,
            motivo: 'El descanso está fuera del horario del turno (' + turnoIni + ' - ' + turnoFin + ')'
        };
    }
    return { ok: true, motivo: null };
}

function minutosAbsolutos(hora) {
    const [h, m] = String(hora).slice(0, 5).split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
}

module.exports = {
    DIAS_SEMANA,
    DIAS_ETIQUETA,
    diaSemana,
    normalizarDias,
    esDiaLibreRecurrente,
    buscarExcepcion,
    motivoDiaLibre,
    listadoNoDisponibles,
    duracionMinutos,
    descansoDentroDelTurno,
    minutosAbsolutos
};
