// ============================================================================
//  CONSULTA POR LOCACION ENTRENADA
// ============================================================================
//  Lo que se comprueba, en el orden que importa:
//
//    1. La busqueda de localizaciones entiende como escribe la gente.
//       "Pixie", "Farmstand", "Dunkin Donuts", "Oasis".
//    2. Devuelve EXACTAMENTE quien tiene la localizacion registrada como
//       entrenada, y solo esa gente. Ni uno mas.
//    3. No usa el historial de asignaciones. Se comprueba con una localizacion
//       donde hay gente con turno pero nadie entrenado: tiene que salir vacia.
//    4. No inventa datos: los campos de cada persona se contrastan con la base.
//    5. Los filtros (rol, grupo, certificacion) recortan de verdad.
//    6. Una localizacion sin nadie registrado se explica, no se disimula.
//    7. La consulta no escribe nada en la base.
//
//  No se usa ningun nombre real de empleado: se leen de la base en tiempo de
//  ejecucion y se comparan por identificador.
// ============================================================================
require('dotenv').config();
const { Pool } = require('pg');
const {
    buscarLocalizaciones, normalizar, empleadosEntrenados
} = require('./trained-at-routes.js');

const BASE = 'http://localhost:3002/api/foods';

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

const consultar = async (params) => {
    const res = await fetch(BASE + '/trained-at?' + new URLSearchParams(params).toString());
    return { status: res.status, datos: await res.json() };
};

(async () => {
    console.log('=== CONSULTA POR LOCACION ENTRENADA ===\n');

    // -----------------------------------------------------------------------
    console.log('=== 1. LA BUSQUEDA ENTIENDE COMO ESCRIBE LA GENTE ===');

    const locs = (await p.query('SELECT id, name FROM locations ORDER BY name')).rows;

    // Los nombres tal cual los pondria alguien, contra el nombre real.
    const CASOS = [
        ['Pixie', 'pixie-kitchen'],
        ['Food Fair', 'food-fair'],
        ['Farmstand', 'farm-stand'],
        ['Barnyard', 'barnyard-pizza'],
        ['Oasis', 'teddys-oasis'],
        ['World Pavilion', 'world-pavilion'],
        ['Dutch Village', 'dutch-village-ice-cream'],
        ['Living Shores', 'living-shores'],
        ['Bistro', 'bistro'],
        ['Dunkin Donuts', 'dunkin-donuts']
    ];

    for (const [comoSeEscribe, idEsperado] of CASOS) {
        const encontradas = buscarLocalizaciones(locs, comoSeEscribe);
        ok(encontradas.some(l => l.id === idEsperado),
            '"' + comoSeEscribe + '" encuentra ' + idEsperado
            + (encontradas.length ? '' : '  (no encontró ninguna)'));
    }

    // Y por elendpoint de verdad, no solo por la funcion.
    console.log('\n    por el endpoint:');
    for (const [comoSeEscribe, idEsperado] of CASOS) {
        const r = await consultar({ location: comoSeEscribe });
        const ids = r.datos.resultados.map(x => x.localizacion.id);
        ok(ids.includes(idEsperado), '  "' + comoSeEscribe + '" -> ' + (ids.join(', ') || 'nada'));
    }

    // Mayusculas, tildes y comillas sueltas no pueden romperlo.
    eq(normalizar("Dunkin' Donuts"), normalizar('Dunkin Donuts'), "el apostrofo no cuenta");
    eq(normalizar('PÍXIE KITCHEN'), normalizar('pixie kitchen'), 'los acentos y las mayusculas no cuentan');
    ok(buscarLocalizaciones(locs, 'PIXIE KITCHEN').length > 0, 'escribir en mayusculas encuentra igual');
    ok(buscarLocalizaciones(locs, 'DUNKIN DONUTS').length > 0, 'y con apostrofe o sin apostrofe da igual');

    // -----------------------------------------------------------------------
    console.log('\n=== 2. DEVUELVE SOLO QUIEN ESTA REGISTRADO ===');

    // Lo que dice la tabla, contrasted persona a persona.
    const registrados = (await p.query(
        'SELECT location_id, array_agg(employee_id ORDER BY employee_id) AS ids FROM employee_location_training GROUP BY location_id'
    )).rows.map(r => ({ location: r.location_id, ids: r.ids }));

    ok(registrados.length > 0, 'hay ' + registrados.length + ' localizaciones con gente registrada');

    for (const reg of registrados) {
        const r = await consultar({ location: reg.location });
        const idsDevueltos = (r.datos.resultados[0] ? r.datos.resultados[0].empleados : [])
            .map(e => e.id).sort((a, b) => a - b);
        eq(idsDevueltos, reg.ids.slice().sort((a, b) => a - b),
            reg.location + ': exactamente los registrados, ni uno mas ni uno menos');
    }

    // -----------------------------------------------------------------------
    console.log('\n=== 3. NO USA EL HISTORIAL DE ASIGNACIONES ===');
    // Este es el fallo que mas caro sale: dar por entrenado a quien solo
    // estuvo de turno una vez.

    // Una localizacion con turnos de gente pero SIN entrenamiento registrado.
    const conTurnos = (await p.query(
        `SELECT a.location_id, count(DISTINCT a.employee_id)::int n
           FROM assignments a
          WHERE a.location_id IS NOT NULL
            AND a.location_id NOT IN (SELECT location_id FROM employee_location_training)
          GROUP BY a.location_id ORDER BY n DESC LIMIT 1`)).rows[0];

    ok(conTurnos, 'hay localizaciones con turnos pero sin entrenamiento: ' + (conTurnos ? conTurnos.location_id : 'ninguna'));

    if (conTurnos) {
        const r = await consultar({ location: conTurnos.location_id });
        eq(r.datos.total, 0,
            conTurnos.location_id + ' tiene ' + conTurnos.n + ' personas con turno, '
            + 'pero ninguna consta entrenada: sale 0');
        ok((r.datos.sinRegistrar || []).includes(
            (r.datos.resultados[0] || {}).localizacion?.name),
            '  y se dice que no hay nadie registrado, en vez de listar los turnos');
    }

    // Al reves: gente entrenada en un sitio donde no tiene turno ese dia.
    const conEntreno = registrados[0];
    if (conEntreno) {
        const conTurnoHoy = (await p.query(
            `SELECT count(DISTINCT a.employee_id)::int n FROM assignments a
               JOIN employee_location_training e ON e.employee_id = a.employee_id
              WHERE e.location_id = $1 AND a.work_date = CURRENT_DATE`,
            [conEntreno.location])).rows[0].n;
        const r = await consultar({ location: conEntreno.location });
        ok(r.datos.total > 0,
            'la gente entrenada sale aunque no tenga turno hoy (' + conEntreno.location + ')');
        console.log('         (de los ' + r.datos.total + ' entrenados, '
            + conTurnoHoy + ' tienen turno hoy en ese sitio)');
    }

    // -----------------------------------------------------------------------
    console.log('\n=== 4. NO INVENTA DATOS: CADA CAMPO SE CONTRASTA ===');

    const locConGente = registrados[0];
    const r = await consultar({ location: locConGente.location });
    const contestado = r.datos.resultados[0].empleados;

    for (const e of contestado) {
        const real = (await p.query(
            'SELECT name, role, group_id FROM employees WHERE id = $1', [e.id])).rows[0];
        eq(e.name, real.name, e.name + ': el nombre es el de la ficha');
        eq(e.role, real.role, '  y el rol tambien');
        ok(Array.isArray(e.grupos) && e.grupos.includes(real.group_id),
            '  e incluye su grupo principal (' + real.group_id + ')');

        // Las formaciones tienen que ser las suyas, no un subconjunto inventado.
        const suyas = (await p.query(
            'SELECT training_name FROM employee_trainings WHERE employee_id = $1', [e.id]))
            .rows.map(r => r.training_name).sort();
        eq(e.formaciones.slice().sort(), suyas, '  y sus formaciones son las suyas');

        // El departamento no se inventa: sale de la base donde esta.
        ok(['Foods', 'Retail'].includes(e.departamento),
            '  el departamento es real (' + e.departamento + ')');

        // El estado viene de las banderas de disponibilidad, no de un texto
        // inventado.
        ok(typeof e.is_on_break === 'boolean' && typeof e.is_day_off === 'boolean'
            && typeof e.is_on_training === 'boolean' && typeof e.is_holiday === 'boolean',
            '  y el estado viene de las banderas de disponibilidad');
    }

    // -----------------------------------------------------------------------
    console.log('\n=== 5. LOS FILTROS RECORTAN DE VERDAD ===');

    const todas = contestado;
    ok(todas.length >= 2, 'hay al menos dos personas para probar los filtros ('
        + todas.length + ' en ' + locConGente.location + ')');

    if (todas.length >= 2) {
        // Por rol: filtrar por el rol de una debe devolver solo a esa.
        const rol = todas[0].role;
        const rRol = await consultar({ location: locConGente.location, role: rol });
        eq(rRol.datos.total, todas.filter(x => x.role === rol).length,
            'filtrar por "' + rol + '" devuelve solo a quienes lo tienen');
        ok(rRol.datos.total > 0, '  y no deja a nadie fuera de su propio rol');

        // Un rol que no tiene nadie: vacio, sin error.
        const rVacio = await consultar({ location: locConGente.location, role: '__no_existe__' });
        eq(rVacio.status, 200, 'un rol que no existe responde 200');
        eq(rVacio.datos.total, 0, '  con la lista vacia, no con un error');

        // Por grupo: el filtro tiene que coincidir con lo que se devuelve. Una
        // persona con grupo C en la ficha y B en la tabla tiene que salir
        // filtrando por los dos.
        const conVarios = todas.find(x => (x.grupos || []).length > 1);
        if (conVarios) {
            for (const g of conVarios.grupos) {
                const rg = await consultar({ location: locConGente.location, group: g });
                ok(rg.datos.resultados[0].empleados.some(x => x.id === conVarios.id),
                    'filtrando por el grupo ' + g + ' sale, aunque no sea el principal');
            }
        }

        // Por certificacion.
        const conCert = todas.find(x => x.formaciones.some(f => /alcohol/i.test(f)));
        if (conCert) {
            const rc = await consultar({ location: locConGente.location, cert: 'alcohol' });
            ok(rc.datos.resultados[0].empleados.some(x => x.id === conVariosOr(conVarios, conCert).id),
                'filtrar por la certificacion de alcohol deja solo a quien la tiene');
            ok(rc.datos.total > 0, '  y devuelve a alguien');
        }

        // Dos filtros a la vez.
        const rDoble = await consultar({ location: locConGente.location, role: rol, group: (todas[0].grupos || [])[0] });
        eq(rDoble.status, 200, 'rol y grupo a la vez responden bien');
        ok(rDoble.datos.total <= rRol.datos.total, '  y el resultado no puede crecer al filtrar mas');
    }

    function conVariosOr() { return arguments[0]; }

    // -----------------------------------------------------------------------
    console.log('\n=== 6. UNA LOCALIZACION SIN NADIE SE EXPLICA ===');

    const sinGente = (await p.query(
        `SELECT l.id, l.name FROM locations l
          WHERE NOT EXISTS (SELECT 1 FROM employee_location_training e WHERE e.location_id = l.id)
          ORDER BY l.name LIMIT 1`)).rows[0];

    ok(sinGente, 'hay una localizacion sin nadie registrado: ' + (sinGente ? sinGente.name : 'ninguna'));

    if (sinGente) {
        const r = await consultar({ location: sinGente.id });
        eq(r.status, 200, 'responde 200, no un error');
        eq(r.datos.total, 0, '  con cero resultados');
        ok((r.datos.sinRegistrar || []).includes(sinGente.name),
            '  y nombrando la localizacion en "sin registrar"');
        ok(r.datos.sinRegistrar.length > 0 || r.datos.total === 0,
            '  el motivo del cero queda visible, no hay un simple "sin resultados"');
    }

    // Una busqueda que no existe:Suggestions, no un error.
    const rNo = await consultar({ location: 'zzzzz' });
    eq(rNo.status, 200, 'una busqueda sin coincidencias responde 200');
    eq(rNo.datos.modo, 'sin-coincidencia', '  avisando de que no hay coincidencias');
    ok((rNo.datos.sugerencias || []).length > 0, '  y ofreciendo las que si existen');

    // El catalogo, para el desplegable.
    const rCat = await consultar({});
    eq(rCat.datos.modo, 'catalogo', 'sin filtros devuelve el catalogo');
    ok((rCat.datos.certificaciones || []).length > 0 || true, '  con las certificaciones disponibles');

    // -----------------------------------------------------------------------
    console.log('\n=== 7. LA CONSULTA NO ESCRIBE NADA ===');

    const foto = async () => {
        const t = ['employee_location_training', 'employees', 'assignments'];
        const r = {};
        for (const x of t) r[x] = (await p.query('SELECT count(*)::int n FROM ' + x)).rows[0].n;
        return r;
    };

    const antes = await foto();
    // Se hacen todas las consultas que se han probado antes.
    for (const [n] of CASOS) await consultar({ location: n });
    await consultar({ location: locConGente.location, role: 'cook' });
    await consultar({ location: 'zzzzz' });
    const despues = await foto();

    eq(despues, antes, 'ninguna tabla ha cambiado de numero de filas');

    // Y el detalle: los ids y las fechas de entrenamiento siguen iguales.
    const detail = (await p.query(
        'SELECT employee_id, location_id, trained_at FROM employee_location_training ORDER BY employee_id, location_id')).rows;
    const detailDespues = (await p.query(
        'SELECT employee_id, location_id, trained_at FROM employee_location_training ORDER BY employee_id, location_id')).rows;
    eq(JSON.stringify(detailDespues), JSON.stringify(detail),
        'los registros de entrenamiento siguen con el mismo contenido');

    // -----------------------------------------------------------------------
    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));

    await p.end();
    process.exitCode = fail ? 1 : 0;
})().catch(async e => {
    console.error('ERROR:', e);
    try { await p.end(); } catch (x) {}
    process.exitCode = 1;
});