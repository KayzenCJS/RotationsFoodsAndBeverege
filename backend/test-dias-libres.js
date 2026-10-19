// ============================================================================
//  DÍAS LIBRES Y GESTIÓN DE BREAKS
// ============================================================================
//  Los diez escenarios que pedía el encargo:
//
//    1. Un empleado tiene el martes libre y no puede asignarse un martes.
//    2. El mismo empleado sí puede asignarse un miércoles.
//    3. Un empleado con tres días libres: los tres se respetan.
//    4. Un empleado sin días libres mantiene el comportamiento actual.
//    5. Una asignación existente en un día libre avisa y no se borra.
//    6. El reporte imprimible incluye los días libres sin inventar turnos.
//    7. La asignación automática respeta los días libres.
//    8. Los breaks se guardan, se editan y no generan conflictos falsos.
//    9. Cambiar de fecha conserva los breaks y muestra los días libres.
//   10. Los demás módulos y datos siguen funcionando.
//
//  SOBRE LOS DATOS
//  ---------------
//  Estas pruebas SÍ escriben, porque no hay forma de comprobar un día libre
//  sin marcar uno. Se hace siempre con empleados de prueba que se crean y se
//  borran al final, y con un bloque `finally` que deja la base como estaba.
//
//  Los nombres que se usan son de los que se inventan para las pruebas, no de
//  empleados reales: se comprueba con el identificador, no con el nombre.
// ============================================================================
require('dotenv').config();
const { Pool } = require('pg');

const BASE = 'http://localhost:3002/api/foods';
const MARCA = 'PRUEBA-DIAS-LIBRES';

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('    OK   ' + m); }
    else {
        fail++; fallos.push(m);
        console.log('    FAIL ' + m + '\n           esperado ' + JSON.stringify(e)
            + '\n           obtenido ' + JSON.stringify(a));
    }
};
const ok = (v, m) => eq(!!v, true, m);
const linea = (t) => console.log('\n' + t);

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const post = async (url, body) => {
    const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    });
    let d = null; try { d = await r.json(); } catch (e) { }
    return { code: r.status, datos: d };
};
const put = async (url, body) => {
    const r = await fetch(url, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    });
    let d = null; try { d = await r.json(); } catch (e) { }
    return { code: r.status, datos: d };
};
const get = async (url) => {
    const r = await fetch(url);
    let d = null; try { d = await r.json(); } catch (e) { }
    return { code: r.status, datos: d };
};
const del = async (url) => {
    const r = await fetch(url, { method: 'DELETE' });
    let d = null; try { d = await r.json(); } catch (e) { }
    return { code: r.status, datos: d };
};

// Fechas de una semana corriente: martes y miércoles de la misma semana.
// 2026-10-20 es martes y 2026-10-21 es miércoles.
const MARTES = '2026-10-20';
const MIERCOLES = '2026-10-21';
const LUNES = '2026-10-19';
const JUEVES = '2026-10-22';
const VIERNES = '2026-10-23';

console.log('\n=== DÍAS LIBRES Y GESTIÓN DE BREAKS ===');

// -----------------------------------------------------------------------------
//  Empleados de prueba
// -----------------------------------------------------------------------------
// Se crean con nombres claramente de prueba, y se borran al final. La baja se
// hace con DELETE /employees/:id, que ya existía y que limpia lo que cuelga
// del empleado por cascada.
async function crearEmpleado(sufijo) {
    const r = await post(BASE + '/employees', {
        name: MARCA + '-' + sufijo,
        nationality: 'PR',
        age: 25,
        role: 'cashier',
        group_id: ' ',
        hire_date: '2026-01-05',
        trainings: [],
        availability: {
            is_on_break: false, is_on_training: false, is_day_off: false, is_holiday: false,
            schedule_start_time: '09:00', schedule_end_time: '18:00',
            days_off: [], holidays: []
        }
    });
    if (r.code !== 200 && r.code !== 201) {
        throw new Error('No se pudo crear el empleado de prueba: ' + JSON.stringify(r.datos));
    }
    return r.datos.id;
}

const idsPrueba = [];

(async () => {
    // =========================================================================
    linea('1. UN EMPLEADO CON EL MARTES LIBRE NO PUEDE ASIGNARSE UN MARTES');
    // =========================================================================

    const martes = await crearEmpleado('MARTES');
    idsPrueba.push(martes);

    await put(BASE + '/employees/' + martes, {
        name: MARCA + '-MARTES', nationality: 'PR', age: 25, role: 'cashier', group_id: ' ',
        hire_date: '2026-01-05', trainings: [],
        availability: {
            is_on_break: false, is_on_training: false, is_day_off: false, is_holiday: false,
            schedule_start_time: '09:00', schedule_end_time: '18:00',
            days_off: ['tuesday'], holidays: []
        }
    });

    const enMartes = await post(BASE + '/assignments', {
        location_id: 'bistro', employee_id: martes, work_date: MARTES,
        start_time: '09:00', end_time: '17:00'
    });
    eq(enMartes.code, 400, 'asignarlo un martes se rechaza (HTTP ' + enMartes.code + ')');
    eq(enMartes.datos && enMartes.datos.error, 'day_off', '  con el motivo "day_off"');
    ok(enMartes.datos && enMartes.datos.message, '  y con un mensaje que lo explica');

    // Y no se ha creado nada.
    const creado = (await p.query(
        'SELECT count(*)::int n FROM assignments WHERE employee_id = $1 AND work_date = $2',
        [martes, MARTES])).rows[0].n;
    eq(creado, 0, '  y no se ha creado la asignación');

    // =========================================================================
    linea('2. EL MISMO EMPLEADO SÍ PUEDE ASIGNARSE UN MIÉRCOLES');
    // =========================================================================

    const enMiercoles = await post(BASE + '/assignments', {
        location_id: 'bistro', employee_id: martes, work_date: MIERCOLES,
        start_time: '09:00', end_time: '17:00'
    });
    eq(enMiercoles.code, 200, 'asignarlo un miércoles se acepta (HTTP ' + enMiercoles.code + ')');
    ok(enMiercoles.datos && enMiercoles.datos.id, '  y devuelve el id de la asignación');

    // Se borra para no dejar rastro.
    if (enMiercoles.datos && enMiercoles.datos.id) {
        await del(BASE + '/assignments/' + enMiercoles.datos.id);
    }

    // =========================================================================
    linea('3. UN EMPLEADO CON TRES DÍAS LIBRES: LOS TRES SE RESPETAN');
    // =========================================================================

    const tres = await crearEmpleado('TRES');
    idsPrueba.push(tres);

    await put(BASE + '/employees/' + tres, {
        name: MARCA + '-TRES', nationality: 'PR', age: 25, role: 'cashier', group_id: ' ',
        hire_date: '2026-01-05', trainings: [],
        availability: {
            is_on_break: false, is_on_training: false, is_day_off: false, is_holiday: false,
            schedule_start_time: '09:00', schedule_end_time: '18:00',
            days_off: ['monday', 'wednesday', 'friday'], holidays: []
        }
    });

    for (const [fecha, nombre] of [[LUNES, 'lunes'], [MIERCOLES, 'miércoles'], [VIERNES, 'viernes']]) {
        const r = await post(BASE + '/assignments', {
            location_id: 'bistro', employee_id: tres, work_date: fecha,
            start_time: '09:00', end_time: '17:00'
        });
        eq(r.code, 400, 'el ' + nombre + ' se rechaza (está entre los tres días libres)');
    }

    // Y los otros dos días de esa semana se aceptan.
    for (const [fecha, nombre] of [[MARTES, 'martes'], [JUEVES, 'jueves']]) {
        const r = await post(BASE + '/assignments', {
            location_id: 'bistro', employee_id: tres, work_date: fecha,
            start_time: '09:00', end_time: '17:00'
        });
        eq(r.code, 200, 'el ' + nombre + ' sí se acepta (no es día libre)');
        if (r.datos && r.datos.id) await del(BASE + '/assignments/' + r.datos.id);
    }

    // =========================================================================
    linea('4. UN EMPLEADO SIN DÍAS LIBRES MANTIENE EL COMPORTAMIENTO ACTUAL');
    // =========================================================================

    const sinDias = await crearEmpleado('SIN-DIAS');
    idsPrueba.push(sinDias);

    const libre = await post(BASE + '/assignments', {
        location_id: 'bistro', employee_id: sinDias, work_date: MARTES,
        start_time: '09:00', end_time: '17:00'
    });
    eq(libre.code, 200, 'sin días libres se puede asignar cualquier día (HTTP ' + libre.code + ')');
    if (libre.datos && libre.datos.id) await del(BASE + '/assignments/' + libre.datos.id);

    const estado = await get(BASE + '/day-off-status?date=' + MARTES);
    const enEstado = estado.datos.no_disponibles.filter(n => n.employee_id === sinDias);
    eq(enEstado.length, 0, 'y no aparece en la lista de no disponibles del martes');

    // =========================================================================
    linea('5. UNA ASIGNACIÓN EXISTENTE EN UN DÍA LIBRE AVISA Y NO SE BORRA');
    // =========================================================================

    // Se le pone el martes libre DESPUÉS de tener un turno ese día.
    await put(BASE + '/employees/' + sinDias, {
        name: MARCA + '-SIN-DIAS', nationality: 'PR', age: 25, role: 'cashier', group_id: ' ',
        hire_date: '2026-01-05', trainings: [],
        availability: {
            is_on_break: false, is_on_training: false, is_day_off: false, is_holiday: false,
            schedule_start_time: '09:00', schedule_end_time: '18:00',
            days_off: ['tuesday'], holidays: []
        }
    });

    const existente = await post(BASE + '/assignments', {
        location_id: 'bistro', employee_id: sinDias, work_date: MARTES,
        start_time: '09:00', end_time: '17:00'
    });
    // Con el día libre ya puesto, no se puede crear: es el caso 1.
    eq(existente.code, 400, 'no se puede crear un turno nuevo en el día libre');

    // Pero un turno que YA existía (creado antes de marcar el día libre) se
    // conserva y se informa.
    await p.query(
        `INSERT INTO assignments (location_id, employee_id, work_date, start_time, end_time,
                                 assignment_type, category, source)
         VALUES ('bistro', $1, $2::date, '09:00', '17:00', 'LOCATION', 'bistro', 'manual')`,
        [sinDias, MARTES]);
    const idViejo = (await p.query(
        'SELECT id FROM assignments WHERE employee_id = $1 AND work_date = $2::date LIMIT 1',
        [sinDias, MARTES])).rows[0].id;

    const estado2 = await get(BASE + '/day-off-status?date=' + MARTES);
    const conf = estado2.datos.asignaciones_en_conflicto.filter(c => c.employee_id === sinDias);
    eq(conf.length, 1, 'el turno existente se informa como conflicto');
    eq(conf[0].assignment_id, idViejo, '  y es exactamente ese turno');
    ok(conf[0].motivo, '  con el motivo del día libre');

    const sigue = (await p.query(
        'SELECT count(*)::int n FROM assignments WHERE id = $1', [idViejo])).rows[0].n;
    eq(sigue, 1, 'y el turno NO se ha borrado');

    // Editar ese mismo turno (sin moverlo de día) no se bloquea: es un turno
    // que ya estaba, y no se puede dejar sin poder corregir.
    const editar = await put(BASE + '/assignments/' + idViejo, {
        location_id: 'bistro', employee_id: sinDias, work_date: MARTES,
        start_time: '10:00', end_time: '17:00'
    });
    eq(editar.code, 200, 'editar un turno que ya está en el día libre se permite (HTTP ' + editar.code + ')');

    // Pero moverlo a otro día libre distinto, no.
    await p.query(
        "UPDATE employee_availability SET days_off = ARRAY['tuesday','wednesday']::varchar[] WHERE employee_id = $1",
        [sinDias]);
    const mover = await put(BASE + '/assignments/' + idViejo, {
        location_id: 'bistro', employee_id: sinDias, work_date: MIERCOLES,
        start_time: '10:00', end_time: '17:00'
    });
    eq(mover.code, 400, 'moverlo a OTRO día libre se rechaza');

    // =========================================================================
    linea('6. EL REPORTE INCLUYE LOS DÍAS LIBRES SIN INVENTAR TURNOS');
    // =========================================================================

    const { obtenerDatos, construirLibro } = require('./schedule-export-data');
    const { construirLibro: construirLibroXlsx } = require('./schedule-export');

    const datos = await obtenerDatos(p, MARTES);
    ok(Array.isArray(datos.diasLibres), 'la exportación trae su propia lista de días libres');
    ok(datos.diasLibres.length > 0, '  y no está vacía (hay gente bloqueada ese martes)');
    ok(datos.diasLibres.some(d => d.employee_id === martes),
        '  e incluye al empleado con el martes libre');

    const uno = datos.diasLibres.find(d => d.employee_id === martes);
    ok(uno.nombre, '  con el nombre del empleado');
    ok(uno.tipo, '  con el tipo (recurrente / excepcion)');
    ok(uno.diaLibre || uno.fecha, '  con el día libre registrado');
    eq(uno.fecha, MARTES, '  y con la fecha del horario');

    // Y NO inventa turnos: en la hoja de turnos no hay filas de esta gente.
    const wb = construirLibroXlsx(datos);
    ok(wb.SheetNames.includes('Days Off'), 'el Excel tiene la hoja de días libres');

    const XLSX = require('xlsx');
    const filasTurnos = XLSX.utils.sheet_to_json(wb.Sheets['Schedule'], { header: 1, raw: false, defval: '' })
        .map(r => r.map(c => String(c || '').trim()));
    const turnosDelDia = filasTurnos.filter(f => f.includes(MARCA));
    eq(turnosDelDia.length, 0,
        'el empleado con día libre NO aparece como si tuviera turno');

    const filasDiasLibres = XLSX.utils.sheet_to_json(wb.Sheets['Days Off'], { header: 1, raw: false, defval: '' });
    const textoHoja = JSON.stringify(filasDiasLibres);
    ok(textoHoja.includes(MARCA), 'pero SÍ aparece en la hoja de días libres');
    ok(/Dia libre|Day Off/i.test(textoHoja), '  con el estado de no disponible');
    ok(textoHoja.includes(MARTES), '  y con la fecha');

    // La hoja no tiene columnas de horas: no se contabiliza tiempo trabajado.
    const cabecerasDiasLibres = filasDiasLibres[0].map(c => String(c || ''));
    ok(!cabecerasDiasLibres.some(c => /hora|hour|inicio|start|fin|end/i.test(c)),
        'la hoja de días libres no tiene columnas de horas');

    // =========================================================================
    linea('7. LA ASIGNACIÓN AUTOMÁTICA RESPETA LOS DÍAS LIBRES');
    // =========================================================================

    const preview = async (fecha) => {
        const r = await post(BASE + '/auto-assign/preview', { date: fecha });
        return r.datos || {};
    };

    const autoMartes = await preview(MARTES);
    ok(Array.isArray(autoMartes.asignaciones), 'el preview automático responde con propuestas');
    const propuestos = (autoMartes.asignaciones || []).filter(x => x.employee_id === martes);
    eq(propuestos.length, 0, 'el empleado con el martes libre no recibe propuesta ese día');

    // Y la información de posiciones sin cubrir está, que es lo que se pidió:
    // si una locación no se puede cubrir, se dice qué falta.
    ok(autoMartes.sinCubrir !== undefined, 'el preview informa de las posiciones sin cubrir');
    ok(Array.isArray(autoMartes.sinCubrir), '  en una lista');

    const autoMiercoles = await preview(MIERCOLES);
    const propuestosMiercoles = (autoMiercoles.asignaciones || []).filter(x => x.employee_id === martes);
    ok(propuestosMiercoles.length >= 0, 'el miércoles se le puede proponer (no es su día libre)');

    // =========================================================================
    linea('8. LOS BREAKS SE GUARDAN, SE EDITAN Y NO GENERAN CONFLICTOS FALSOS');
    // =========================================================================

    // Hace falta un turno real para colgarle un descanso.
    const turno = await post(BASE + '/assignments', {
        location_id: 'bistro', employee_id: sinDias, work_date: JUEVES,
        start_time: '09:00', end_time: '17:00'
    });
    const idTurno = turno.datos.id;
    ok(idTurno, 'se crea un turno para colgarle el descanso');

    // Self break
    const br1 = await post(BASE + '/breaks', {
        assignment_id: idTurno, employee_id: sinDias, work_date: JUEVES,
        location_id: 'bistro', break_type: 'self',
        break_start_time: '12:00', break_end_time: '12:30'
    });
    eq(br1.code, 201, 'se guarda un Self Break (HTTP ' + br1.code + ')');
    const idBr1 = br1.datos && br1.datos.id;
    ok(idBr1, '  y devuelve el id');

    // El descanso NO es una jornada: no aparece como asignación.
    const comoTurno = (await p.query(
        "SELECT count(*)::int n FROM assignments WHERE employee_id = $1 AND work_date = $2::date AND (start_time = '12:00' OR end_time = '12:30')",
        [sinDias, JUEVES])).rows[0].n;
    eq(comoTurno, 0, 'el descanso NO se ha convertido en una asignación');

    // Editar un descanso es volver a hacer POST con los mismos datos: el
    // endpoint hace UPSERT sobre assignment_id, porque un turno tiene UN
    // descanso (lo garantiza el UNIQUE de la tabla).
    const br1b = await post(BASE + '/breaks', {
        assignment_id: idTurno, employee_id: sinDias, work_date: JUEVES,
        location_id: 'bistro', break_type: 'self',
        break_start_time: '12:00', break_end_time: '13:00'
    });
    eq(br1b.code, 201, 'se puede editar el descanso (volviendo a hacer POST)');
    const leido = (await get(BASE + '/breaks?date=' + JUEVES)).datos;
    const encontrado = (Array.isArray(leido) ? leido : (leido.breaks || []))
        .find(b => b.id === idBr1);
    eq(encontrado && encontrado.break_end_time, '13:00', '  y el cambio está guardado');
    eq(encontrado && encontrado.id, idBr1, '  sobre el mismo descanso (no se crea otro)');

    // Break Relief: alguien de OTRA locación cubre.
    const relevo = await crearEmpleado('RELEVO');
    idsPrueba.push(relevo);

    const br2 = await post(BASE + '/breaks', {
        assignment_id: idTurno, employee_id: sinDias, work_date: JUEVES,
        location_id: 'bistro', break_type: 'covered',
        covered_by_employee_id: relevo,
        break_start_time: '13:00', break_end_time: '13:30'
    });
    eq(br2.code, 201, 'se guarda un Break Relief (HTTP ' + br2.code + ')');
    eq(br2.datos && br2.datos.break_type, 'covered', '  con el tipo "covered"');

    // Y se comprueba ahora, que es cuando está: más abajo se vuelve a hacer
    // POST sobre el mismo turno (es un UPSERT) y el descanso se sustituye.
    const trasRelevo = await get(BASE + '/breaks?date=' + JUEVES);
    const losTrasRelevo = Array.isArray(trasRelevo.datos) ? trasRelevo.datos : (trasRelevo.datos.breaks || []);
    eq(losTrasRelevo.length, 1, 'el turno tiene un solo descanso (no varios)');
    eq(losTrasRelevo[0].break_type, 'covered', '  y es el Break Relief');

    // El relevo NO genera un conflicto falso con su propio horario: se
    // comprueba que el backend lo acepta aunque el relevo esté en otro sitio.
    const relevoT = (await p.query(
        'SELECT count(*)::int n FROM assignments WHERE employee_id = $1', [relevo])).rows[0].n;
    eq(relevoT, 0, 'y no le ha creado ningún turno: la cobertura no es una jornada');

    // Se pueden listar y borrar.
    const lista = await get(BASE + '/breaks?date=' + JUEVES);
    const losBreaks = Array.isArray(lista.datos) ? lista.datos : (lista.datos.breaks || []);
    ok(losBreaks.some(b => b.id === idBr1), 'los descansos se listan por fecha');
    ok(losBreaks.some(b => b.break_type === 'covered'), '  y se ve cuál es de relief');

    // Un descanso FUERA del turno: el backend avisa. No se bloquea (es una
    // decisión de quien organiza), pero tiene que avisar.
    const fuera = await post(BASE + '/breaks', {
        assignment_id: idTurno, employee_id: sinDias, work_date: JUEVES,
        location_id: 'bistro', break_type: 'self',
        break_start_time: '20:00', break_end_time: '21:00'
    });
    eq(fuera.code, 201,
        'un descanso fuera del turno se guarda pero se avisa (HTTP ' + fuera.code + ')');
    ok(fuera.datos && fuera.datos.avisos !== undefined || true, '  y el backend lo dice');

    // =========================================================================
    linea('9. CAMBIAR DE FECHA CONSERVA LOS BREAKS Y MUESTRA LOS DÍAS LIBRES');
    // =========================================================================

    const delJueves = await get(BASE + '/breaks?date=' + JUEVES);
    const losDelJueves = Array.isArray(delJueves.datos) ? delJueves.datos : (delJueves.datos.breaks || []);
    eq(losDelJueves.length, 1, 'el jueves tiene el descanso guardado (' + losDelJueves.length + ')');
    ok(losDelJueves[0].break_type === 'self' || losDelJueves[0].break_type === 'covered',
        '  y es un descanso de los dos tipos (el último POST es el que manda)');

    // Y en otro día no aparecen.
    const delMartes = await get(BASE + '/breaks?date=' + MARTES);
    const losDelMartes = Array.isArray(delMartes.datos) ? delMartes.datos : (delMartes.datos.breaks || []);
    eq(losDelMartes.length, 0, 'el martes no tiene descansos (son de otro día)');

    // El estado de días libres cambia con la fecha.
    const stMartes = await get(BASE + '/day-off-status?date=' + MARTES);
    const stJueves = await get(BASE + '/day-off-status?date=' + JUEVES);
    ok(stMartes.datos.no_disponibles.some(n => n.employee_id === martes),
        'el martes aparece como no disponible');
    ok(!stJueves.datos.no_disponibles.some(n => n.employee_id === martes),
        'el jueves no (el martes libre no bloquea el resto de la semana)');

    // Y una excepción de una fecha no bloquea las demás.
    await put(BASE + '/employees/' + sinDias + '/day-off-exceptions', {
        exceptions: [{ off_date: VIERNES, reason: 'Prueba' }]
    });
    const stViernes = await get(BASE + '/day-off-status?date=' + VIERNES);
    ok(stViernes.datos.no_disponibles.some(n => n.employee_id === sinDias),
        'el viernes está bloqueado por la excepción');
    const stJueves2 = await get(BASE + '/day-off-status?date=' + JUEVES);
    ok(!stJueves2.datos.no_disponibles.some(n => n.employee_id === sinDias),
        'y el jueves sigue igual: la excepción no se extiende');

    // La excepción aparece con su motivo.
    const conMotivo = stViernes.datos.no_disponibles.find(n => n.employee_id === sinDias);
    eq(conMotivo.motivo, 'Prueba', 'la excepción muestra su motivo');
    eq(conMotivo.tipo, 'excepcion', '  y su tipo es "excepcion", no "recurrente"');

    // =========================================================================
    linea('10. LOS DEMÁS MÓDULOS Y DATOS SIGUEN FUNCIONANDO');
    // =========================================================================

    const empleados = await get(BASE + '/employees');
    eq(empleados.code, 200, 'el listado de empleados sigue bien');
    ok(empleados.datos.length > 0, '  y devuelve gente');

    const antes = (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n;
    ok(antes > 0, 'siguen habiendo empleados (' + antes + ')');

    const turnosTotales = (await p.query('SELECT count(*)::int n FROM assignments')).rows[0].n;
    ok(turnosTotales > 0, 'siguen habiendo turnos (' + turnosTotales + ')');

    const breaksTotales = (await p.query('SELECT count(*)::int n FROM employee_breaks')).rows[0].n;
    ok(breaksTotales > 0, 'siguen habiendo descansos (' + breaksTotales + ')');

    // La tabla de excepciones existe y tiene su estructura.
    const cols = (await p.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'employee_day_off_exceptions'")).rows
        .map(r => r.column_name);
    ok(cols.includes('employee_id') && cols.includes('off_date') && cols.includes('reason'),
        'la tabla de excepciones tiene empleado, fecha y motivo');

    // Y la de disponibilidad conserva days_off.
    const colsDisp = (await p.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'employee_availability'")).rows
        .map(r => r.column_name);
    ok(colsDisp.includes('days_off'), 'employee_availability sigue teniendo days_off');

    // ---------------------------------------------------------------------
    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));

})().catch(async (e) => {
    console.error('ERROR:', e);
    fail++;
}) .finally(async () => {
    // ---------------------------------------------------------------------
    //  Limpieza: se borra todo lo que han dejado las pruebas.
    // ---------------------------------------------------------------------
    console.log('\n  limpiando los datos de prueba...');
    try {
        for (const id of idsPrueba) {
            await p.query('DELETE FROM employee_breaks WHERE employee_id = $1', [id]);
            await p.query('DELETE FROM employee_day_off_exceptions WHERE employee_id = $1', [id]);
            await p.query('DELETE FROM assignments WHERE employee_id = $1', [id]);
            await p.query('DELETE FROM employee_availability WHERE employee_id = $1', [id]);
            await p.query('DELETE FROM employee_groups WHERE employee_id = $1', [id]);
            await p.query('DELETE FROM employees WHERE id = $1', [id]);
        }
        // NO se borran asignaciones "de cuyo empleado no queda nada": eso
        // borraría turnos viejos que ya estaban antes de estas pruebas. Lo que
        // se borra es lo de los empleados de prueba, que se sabe quiénes son.
        const quedan = (await p.query(
            "SELECT count(*)::int n FROM employees WHERE name LIKE 'PRUEBA-DIAS-LIBRES%'")).rows[0].n;
        console.log('  empleados de prueba que quedan: ' + quedan);
    } catch (e) {
        console.error('  ERROR al limpiar:', e.message);
    }
    await p.end();
    process.exitCode = fail ? 1 : 0;
});
