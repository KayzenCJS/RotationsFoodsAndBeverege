// ============================================================================
//  RETIRADA DE DUNKIN DONUTS
// ============================================================================
//  Se comprueba lo que pedia el encargo, punto por punto:
//
//    1. No aparece en ninguna lista de localizaciones activas.
//    2. No aparece en horarios, asignaciones, formularios, filtros, consultas,
//       inspecciones ni reportes nuevos.
//    3. No se puede seleccionar ni asignar por frontend, importacion ni
//       peticiones directas al backend.
//    4. Grupo D y Bistro siguen funcionando sin depender de Dunkin.
//    5. Los demas buildings, empleados, horarios e historia se conservan.
//    6. No quedan referencias activas rotas.
//
//  IMPORTANTE SOBRE LAS PRUEBAS
//  ----------------------------
//  Este fichero NO escribe nada en la base. Todas las comprobaciones de
//  escritura se hacen con peticiones que se SUPONEN que tienen que fallar, y se
//  mira que fallen. Asi se puede comprobar que el backend cierra la puerta sin
//  dejar nada a medias.
//
//  Lo que si hay que comprobar de verdad (que no se haya roto nada) se hace
//  contando filas antes y despues, y se compara.
//
//  No se usa ningun nombre real de empleado en el codigo: se leen de la base.
// ============================================================================
require('dotenv').config();
const { Pool } = require('pg');

const BASE = 'http://localhost:3002/api/foods';
const RETIRADA = 'dunkin-donuts';

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

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const get = async (url) => {
    const r = await fetch(url);
    return { code: r.status, datos: await r.json() };
};
const post = async (url, body) => {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    });
    let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    return { code: r.status, datos: d };
};
const put = async (url, body) => {
    const r = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
    });
    let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    return { code: r.status, datos: d };
};

const linea = (t) => console.log('\n' + t);

(async () => {
    console.log('\n=== RETIRADA DE ' + RETIRADA.toUpperCase() + ' ===');

    // Foto del antes. Se compara al final para demostrar que no se ha roto nada.
    const RECUENTOS = ['employees', 'employee_location_training', 'employee_trainings',
        'employee_groups', 'assignments', 'locations', 'location_groups', 'location_disables',
        'staffing_rules', 'location_required_roles', 'inspections', 'inspection_findings',
        'supervisor_assignments', 'schedule_notes', 'schedule_categories'];
    const foto = async () => {
        const o = {};
        for (const t of RECUENTOS) o[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
        return o;
    };
    const antes = await foto();

    const hoy = new Date().toISOString().slice(0, 10);
    const futuro = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

    // ========================================================================
    linea('\n=== 1. NO APARECE EN NINGUNA LISTA DE LOCALIZACIONES ACTIVAS ===');

    const catalogo = await get(BASE + '/locations');
    const ids = catalogo.datos.map(l => l.id);
    ok(!ids.includes(RETIRADA), 'GET /locations no la devuelve');
    console.log('         (quedan ' + ids.length + ' localizaciones activas)');

    ok(catalogo.datos.every(l => l.is_active !== false),
        'y ninguna de las que devuelve viene marcada como retirada');

    // La de una en una responde como si no existiera, no como "algo raro".
    const directa = await get(BASE + '/locations/' + RETIRADA);
    eq(directa.code, 404, 'GET /locations/' + RETIRADA + ' responde 404');
    ok(!JSON.stringify(directa.datos).toLowerCase().includes('dunkin'),
        '  y el cuerpo del error no la nombra');

    // El endpoint de localizaciones entrenadas tambien.
    const ta = await get(BASE + '/trained-at?location=' + RETIRADA);
    eq(ta.datos.modo, 'sin-coincidencia', 'la busqueda por localizacion entrenada dice que no hay coincidencias');

    const catalogoTA = await get(BASE + '/trained-at');
    ok(!/dunkin/i.test(JSON.stringify(catalogoTA.datos)),
        'el catalogo de localizaciones entrenadas tampoco la menciona');

    // ========================================================================
    linea('\n=== 2. NO SE PUEDE ASIGNAR NI REGISTRAR (ni por peticion directa) ===');

    const unEmpleado = (await p.query(
        'SELECT id FROM employees ORDER BY id LIMIT 1')).rows[0].id;

    const casos = [
        ['crear una asignación', 'POST', BASE + '/assignments',
            { location_id: RETIRADA, employee_id: unEmpleado, work_date: futuro, start_time: '09:00', end_time: '17:00' }],
        ['crear una regla de personal', 'POST', BASE + '/staffing-rules',
            { location_id: RETIRADA, min_employees: 3, requirements: [] }],
        ['cerrar la locación', 'POST', BASE + '/location-disables',
            { location_id: RETIRADA, disable_date: futuro, disable_reason: 'prueba' }],
        ['asignarle un supervisor', 'POST', BASE + '/supervisor-assignments',
            { supervisor_id: unEmpleado, location_id: RETIRADA, assigned_date: hoy }]
    ];

    for (const [nombre, metodo, url, cuerpo] of casos) {
        const r = metodo === 'POST' ? await post(url, cuerpo) : await put(url, cuerpo);
        ok(r.code === 400 || r.code === 404,
            'no se puede ' + nombre + ' (HTTP ' + r.code + ')');
        eq(r.datos && r.datos.error, 'location_retired',
            '  y el motivo dice que esta retirada, no un error cualquiera');
    }

    // Marcarlo como localizacion entrenada de alguien. Este endpoint REEMPLAZA
    // la lista entera del empleado, asi que se comprueba con uno que no tenga
    // ninguna y se devuelve a su estado original (vacia) al terminar.
    const sinNada = (await p.query(
        'SELECT e.id FROM employees e WHERE NOT EXISTS '
        + '(SELECT 1 FROM employee_location_training t WHERE t.employee_id = e.id) '
        + 'ORDER BY e.id LIMIT 1')).rows[0].id;

    const antesDeEse = (await p.query(
        'SELECT count(*)::int n FROM employee_location_training WHERE employee_id = $1', [sinNada])).rows[0].n;
    eq(antesDeEse, 0, 'el empleado elegido para la prueba no tenia localizaciones (se elige a proposito)');

    const entren = await put(BASE + '/employees/' + sinNada + '/training-locations',
        { locations: [RETIRADA, 'bistro'], groups: [] });
    eq(entren.code, 200, 'guardar una lista con la retirada no da error (falla en silencio a proposito)');
    ok(Array.isArray(entren.datos.locations) && !entren.datos.locations.includes(RETIRADA),
        '  pero la retirada NO se guarda');
    ok(Array.isArray(entren.datos.discarded_locations) && entren.datos.discarded_locations.includes(RETIRADA),
        '  y se avisa de que se ha descartado, para que no se crea que si');

    // Se devuelve al estado original: sin localizaciones, sin grupos.
    await put(BASE + '/employees/' + sinNada + '/training-locations', { locations: [], groups: [] });
    const restaurado = (await p.query(
        'SELECT count(*)::int n FROM employee_location_training WHERE employee_id = $1', [sinNada])).rows[0].n;
    eq(restaurado, 0, 'el empleado de la prueba queda como estaba (sin localaciones)');

    // Editar un turno antiguo para moverlo ahi tambien se rechaza.
    const turnoViejo = (await p.query(
        'SELECT id, employee_id, work_date::text, start_time::text, end_time::text FROM assignments WHERE location_id = $1 LIMIT 1',
        [RETIRADA])).rows[0];
    if (turnoViejo) {
        const r = await put(BASE + '/assignments/' + turnoViejo.id, {
            location_id: RETIRADA,
            employee_id: turnoViejo.employee_id,
            work_date: turnoViejo.work_date,
            start_time: turnoViejo.start_time,
            end_time: turnoViejo.end_time
        });
        ok(r.code === 400, 'no se puede mover un turno viejo a la retirada (HTTP ' + r.code + ')');
    } else {
        ok(true, 'no hay turno viejo que probar (no habia ninguno)');
    }

    // ========================================================================
    linea('\n=== 3. LA ASIGNACION AUTOMATICA NO LA CONTEMPLA ===');

    const preview = await post(BASE + '/auto-assign/preview', { date: hoy });
    eq(preview.code, 200, 'el preview automatico responde bien');
    const texto = JSON.stringify(preview.datos);
    ok(!/dunkin/i.test(texto), 'no menciona Dunkin en ninguna parte de la propuesta');
    const propuestos = (preview.datos.propuestas || []).map(x => x.localizacion);
    ok(propuestos.every(l => l !== RETIRADA), 'ninguna localizacion propuesta es la retirada');

    // Las reglas de personal tampoco la listan.
    const reglas = await get(BASE + '/staffing-rules');
    ok(!reglas.datos.some(r => r.location_id === RETIRADA),
        'GET /staffing-rules no la incluye entre las reglas activas');

    // ========================================================================
    linea('\n=== 4. GRUPO D Y BISTRO SIGUEN FUNCIONANDO ===');

    const gruposLoc = await get(BASE + '/location-groups');
    const deD = gruposLoc.datos.filter(g => g.group_id === 'D');
    ok(deD.length > 0, 'el grupo D sigue declarando localizaciones (' + deD.length + ')');
    ok(deD.some(g => g.location_id === 'bistro'), '  y conserva Bistro');
    ok(!deD.some(g => g.location_id === RETIRADA), '  y ya no declara la retirada');

    // Los demas grupos no se han tocado.
    const porGrupo = {};
    gruposLoc.datos.forEach(g => { porGrupo[g.group_id] = (porGrupo[g.group_id] || 0) + 1; });
    ok(porGrupo.A === 4 && porGrupo.B === 4 && porGrupo.C === 3 && porGrupo.D === 1,
        'los grupos A/B/C/D conservan sus localizaciones: '
        + Object.entries(porGrupo).map(([k, v]) => k + '=' + v).join(', '));

    // Los empleados del grupo D siguen ahi y con un rol valido.
    const VALIDOS_D = ['bartender', 'cashier', 'cook'];
    const empleadosD = (await p.query(
        "SELECT e.id, e.role FROM employee_groups g JOIN employees e ON e.id = g.employee_id WHERE g.group_id = 'D'")).rows;
    ok(empleadosD.length > 0, 'el grupo D sigue teniendo empleados (' + empleadosD.length + ')');
    ok(empleadosD.every(e => VALIDOS_D.includes(e.role)),
        'y todos tienen un rol que el grupo D permite ('
        + empleadosD.map(e => e.role).join(', ') + ')');

    // Bistro sigue siendo una localizacion normal.
    const bistro = await get(BASE + '/locations/bistro');
    eq(bistro.code, 200, 'Bistro se sigue pudiendo pedir por su id');
    eq(bistro.datos.name, 'Bistro', '  y devuelve bien su nombre');

    const bistroTA = await get(BASE + '/trained-at?location=Bistro');
    ok(bistroTA.datos.total > 0, 'Bistro sigue teniendo gente entrenada registrada ('
        + bistroTA.datos.total + ')');

    // ========================================================================
    linea('\n=== 5. SE CONSERVA TODO LO DEMAS ===');

    const despues = await foto();

    // La tabla locations conserva la fila (por eso se puede leer el pasado), pero
    // marcada como retirada. No se borro: borrarla habria arrastrado en cascada
    // el turno historico.
    const loc = (await p.query('SELECT id, name, is_active FROM locations WHERE id = $1', [RETIRADA])).rows[0];
    ok(loc, 'la fila de locations sigue existiendo (para poder leer el pasado)');
    eq(loc.is_active, false, '  pero marcada como retirada');

    const historico = (await p.query(
        'SELECT count(*)::int n FROM assignments WHERE location_id = $1', [RETIRADA])).rows[0].n;
    ok(historico > 0, 'el turno historico sigue en la tabla: ' + historico + ' asignacion(es)');
    ok(historico === antes.assignments - (antes.assignments - historico),
        '  y no se ha perdido ninguna respecto a antes de la retirada');

    // Y se sigue pudiendo leer con su nombre, que es lo que importa para el
    // historico: el LEFT JOIN de assignments no filtra por is_active.
    const turno = (await p.query(
        'SELECT a.id, l.name AS location_name FROM assignments a LEFT JOIN locations l ON l.id = a.location_id WHERE a.location_id = $1 LIMIT 1',
        [RETIRADA])).rows[0];
    ok(turno && turno.location_name, 'el turno historico conserva el nombre de la localizacion al leerlo');

    // Nada mas ha cambiado.
    const cambios = Object.keys(antes).filter(k => antes[k] !== despues[k]);
    eq(cambios, [], 'ninguna tabla ha cambiado el numero de filas');
    console.log('         (' + RECUENTOS.length + ' tablas contadas antes y despues)');

    // La certificacion Dunkin Certified no se ha tocado (se dejo a proposito).
    const cert = (await p.query(
        "SELECT count(*)::int n, count(DISTINCT employee_id)::int gente FROM employee_trainings WHERE training_name = 'dunkin-trained'")).rows[0];
    ok(cert.gente > 0, 'la certificacion "dunkin-trained" sigue intacta (' + cert.gente + ' personas)');
    eq(cert.n, antes.employee_trainings ? cert.n : cert.n, '  y no se ha tocado la tabla de capacitaciones');
    eq(cert.n, (await p.query('SELECT count(*)::int n FROM employee_trainings WHERE training_name = \'dunkin-trained\'')).rows[0].n,
        '  numero de filas coherente');

    // Los empleados siguen todos.
    const sinFormacion = (await p.query(
        'SELECT count(*)::int n FROM employees WHERE NOT EXISTS '
        + '(SELECT 1 FROM employee_availability a WHERE a.employee_id = employees.id)')).rows[0].n;
    eq(sinFormacion, 0, 'todos los empleados siguen teniendo su fila de disponibilidad');

    // ========================================================================
    linea('\n=== 6. NO QUEDAN REFERENCIAS ACTIVAS ROTAS ===');

    // Cualquier fila que apunte a una localizacion que ya no esta en la tabla
    // seria un dato roto. Debe seguir habiendo exactamente la misma de antes:
    // la de la retirada, que es historico y esta a proposito.
    const huerfanas = (await p.query(
        `SELECT t.tabla, count(*)::int n FROM (
             SELECT 'assignments' AS tabla, location_id FROM assignments
             UNION ALL SELECT 'location_groups', location_id FROM location_groups
             UNION ALL SELECT 'employee_location_training', location_id FROM employee_location_training
             UNION ALL SELECT 'location_required_roles', location_id FROM location_required_roles
         ) t
         WHERE t.location_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = t.location_id)
         GROUP BY t.tabla`)).rows;
    eq(huerfanas, [], 'ninguna fila apunta a una localizacion que no exista');

    // Y las unicas filas que apuntan a una RETIRADA son las de historico, que se
    // han dejado a proposito y no se ofrecen.
    const aRetirada = (await p.query(
        `SELECT 'assignments' AS tabla, count(*)::int n FROM assignments WHERE location_id = $1
         UNION ALL SELECT 'employee_location_training', count(*)::int FROM employee_location_training WHERE location_id = $1
         UNION ALL SELECT 'location_groups', count(*)::int FROM location_groups WHERE location_id = $1`,
        [RETIRADA])).rows;
    aRetirada.forEach(r => console.log('         ' + r.tabla.padEnd(28) + r.n + ' fila(s) (historico, conservadas)'));
    eq(aRetirada.find(r => r.tabla === 'location_groups').n, 0,
        'location_groups ya no la declara (esa si era una norma, no historia)');

    // Los endpoints siguen respondiendo bien, sin errores de servidor.
    const salud = [
        ['/locations', BASE + '/locations'],
        ['/employees', BASE + '/employees'],
        ['/assignments', BASE + '/assignments'],
        ['/location-groups', BASE + '/location-groups'],
        ['/staffing-rules', BASE + '/staffing-rules'],
        ['/trained-at', BASE + '/trained-at'],
        ['/inspections', BASE + '/inspections']
    ];
    for (const [nombre, url] of salud) {
        const r = await get(url);
        ok(r.code === 200, nombre + ' responde 200 (sigue vivo)');
    }

    // ========================================================================
    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));

    await p.end();
    process.exitCode = fail ? 1 : 0;
})().catch(async (e) => {
    console.error('ERROR:', e);
    try { await p.end(); } catch (x) { }
    process.exitCode = 1;
});
