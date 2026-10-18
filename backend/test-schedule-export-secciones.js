// Secciones no geograficas del horario: Student Dining, Character Breakfast,
// Support, Extra Tasks y Nostalgia Night.
//
// En la base actual no hay NINGUN turno de estos tipos, asi que el camino de
// codigo existe pero nunca se ha ejecutado. Este fichero lo ejecuta de verdad:
// crea turnos de prueba en una fecha lejana, exporta, comprueba que salen bien
// y que vuelven a entrar, y los borra al terminar.
//
// La fecha es 2019-01-07, muy lejos de cualquier dato real, para que un fallo a
// medio camino no pueda pisar turnos de verdad. Aun asi todo va dentro de un
// try/finally que borra lo que se haya creado.
require('dotenv').config();
const XLSX = require('xlsx');
const QP = require('../quinyx-parser.js');
const { obtenerDatos } = require('./schedule-export-data');
const { construirLibro } = require('./schedule-export');

const { Pool } = require('pg');
const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const FECHA = '2019-01-07';

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
    else {
        fail++; fallos.push(m);
        console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a));
    }
};
const ok = (v, m) => eq(!!v, true, m);

const norm = (s) => String(s == null ? '' : s).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const firma = (emp, lugar, ini, fin) =>
    [norm(emp), norm(lugar), String(ini || '').slice(0, 5), String(fin || '').slice(0, 5)].join('|');

// "09:00:00" -> "09:00", y "09:00" -> 540.
const EXPORT_HHMM = (t) => String(t).slice(0, 5);
const EXPORT_MIN = (t) => {
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    return m ? (+m[1]) * 60 + (+m[2]) : null;
};

// Turnos de prueba: uno por seccion no geografica, con un turno que cruza la
// medianoche para comprobar tambien ese caso aqui.
//   [categoria, indice de persona, inicio, fin, rol, tipo]
//
// La persona se elige POR POSICION dentro de los empleados que ya hay, no por
// nombre. Asi el turno necesita un empleado_id de verdad (el matching del
// importador solo funciona con gente existente) y a la vez ningun nombre real
// queda escrito en este fichero, que es publico.
//
// El indice 1 se usa dos veces a proposito: hay que comprobar que una misma
// persona puede tener dos turnos el mismo dia y que cada uno sale como una fila
// independiente.
const PRUEBA = [
    ['student-dining',       0, '16:00', '20:00', 'Server', 'EXTRA_HOURS'],
    ['character-breakfast',  1, '08:00', '12:00', 'Server', 'EXTRA_HOURS'],
    ['nostalgia-dj',         2, '20:00', '01:00', 'DJ',     'NOSTALGIA_NIGHT'],
    ['ipr-opener',           3, '08:00', '09:00', '',       'EXTRA_TASK'],
    ['id-scanning',          4, '22:00', '23:00', '',       'EXTRA_TASK']
];

(async () => {
    console.log('=== SECCIONES NO GEOGRAFICAS ===\n');
    console.log('  fecha de prueba: ' + FECHA + ' (lejana de cualquier dato real)\n');

    // -----------------------------------------------------------------------
    //  Que claves de categoria existen de verdad y estan activas
    // -----------------------------------------------------------------------
    const cats = (await p.query(
        `SELECT key, section, name_es, is_active FROM schedule_categories
          WHERE is_active = true ORDER BY section, key`)).rows;
    console.log('=== 1. CATALOGO DE SECCIONES ACTIVAS ===');
    for (const c of cats) console.log('  ' + c.section.padEnd(18) + c.key.padEnd(22) + c.name_es);

    const porClave = new Map(cats.map(c => [c.key, c]));

    // Se descartan las claves del catalogo que no existem: el turno se crearia
    // con una categoria desconocida y no habria forma de saber si el exportador
    // o el catalogo hacen su trabajo.
    const validas = PRUEBA.filter(t => porClave.has(t[0]));
    const descartadas = PRUEBA.filter(t => !porClave.has(t[0]));
    if (descartadas.length) {
        console.log('\n  (descartadas por no existir en el catalogo activo: '
            + descartadas.map(t => t[0]).join(', ') + ')');
    }

    // Se necesitan empleados reales para que el matching del importador
    // funcione. Se cogen por posicion: asi el turno aponta a un employee_id de
    // verdad sin que ningun nombre real quede escrito en este fichero.
    const gente = (await p.query(
        `SELECT id, name FROM employees ORDER BY id LIMIT 20`)).rows;
    const necesarios = Math.max(...PRUEBA.map(t => t[1])) + 1;
    if (gente.length < necesarios) {
        throw new Error('hacen falta al menos ' + necesarios + ' empleados para la prueba');
    }

    const creados = [];

    try {
        // -------------------------------------------------------------------
        console.log('\n=== 2. SE CREAN TURNOS DE PRUEBA ===');
        for (const [cat, indice, ini, fin, rol, tipo] of validas) {
            const emp = gente[indice % gente.length];
            const r = await p.query(
                `INSERT INTO assignments
                    (location_id, employee_id, work_date, start_time, end_time,
                     role, assignment_type, category, source)
                 VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, 'export-test')
                 RETURNING id`,
                [emp.id, FECHA, ini, fin, rol || null, tipo, cat]);
            creados.push(r.rows[0].id);
            console.log('  id ' + r.rows[0].id + '  ' + emp.name + '  ' + cat
                + '  ' + ini + '-' + fin + (rol ? '  (' + rol + ')' : ''));
        }
        eq(creados.length, validas.length, 'se crearon ' + validas.length + ' turnos de prueba');

        // -------------------------------------------------------------------
        console.log('\n=== 3. LO QUE DICE EL EXPORTADOR ===');
        const datos = await obtenerDatos(p, FECHA);
        const wb = construirLibro(datos);
        const filasSchedule = XLSX.utils.sheet_to_json(wb.Sheets['Schedule'], { header: 1, raw: true, defval: '' });
        const filasImport = XLSX.utils.sheet_to_json(wb.Sheets['Import Data'], { header: 1, raw: true, defval: '' });

        console.log('  informe: ' + JSON.stringify(datos.informe, null, 0).slice(0, 400));

        ok(datos.informe.seccionesSinLocalizacion >= 1,
            'las secciones sin localizacion se cuentan aparte: ' + datos.informe.seccionesSinLocalizacion);

        // Las secciones no geograficas van al bloque derecho.
        const der = filasSchedule.map(f => String(f[4] || '')).filter(Boolean);
        for (const [cat] of validas) {
            const nombreCat = porClave.get(cat).name_es;
            ok(der.some(t => norm(t).indexOf(norm(nombreCat)) >= 0),
                '"' + nombreCat + '" aparece en el bloque derecho');
        }

        // La cabecera del bloque derecho debe decir algo real, no un nombre fijo.
        const cabDer = String(filasSchedule[1] ? filasSchedule[1][4] : '');
        ok(cabDer && cabDer !== 'Oasis / Dutch OPS',
            'la cabecera del bloque derecho nombra las secciones que contiene: "' + cabDer + '"');

        // -------------------------------------------------------------------
        console.log('\n=== 4. LA HOJA IMPORT DATA ===');
        eq(filasImport[0], ['Employee Name', 'Location', 'Work Date', 'Start Time', 'End Time', 'Role', 'Source Section'],
            'encabezados sin cambios');
        eq(filasImport.length - 1, validas.length, 'una fila por turno de seccion');

        for (const [cat, indice, ini, fin, rol] of validas) {
            const emp = gente[indice % gente.length];
            // Se busca por persona Y hora de inicio, no solo por persona: una
            // misma persona puede tener varios turnos el mismo dia, y buscar
            // solo por el nombre devolveria siempre el primero.
            const fila = filasImport.find(f =>
                norm(f[0]) === norm(emp.name) && String(f[3] || '').slice(0, 5) === ini);
            ok(fila, 'Import Data trae a ' + emp.name + ' en ' + cat + ' (' + ini + ')');
            if (fila) {
                eq(String(fila[1]), porClave.get(cat).name_es,
                    '  Location es el nombre de la seccion: "' + fila[1] + '"');
                eq(String(fila[2]), FECHA, '  Work Date es ' + FECHA);
                eq(String(fila[3]).slice(0, 5), ini, '  Start Time ' + fila[3]);
                eq(String(fila[4]).slice(0, 5), fin, '  End Time ' + fila[4]);
            }
        }

        // -------------------------------------------------------------------
        console.log('\n=== 5. IDA Y VUELTA POR EL PARSER REAL ===');
        const parseado = QP.parseScheduleSheet(filasSchedule, 'Schedule');
        const obtenidos = parseado.records
            .filter(x => x.start_time && x.end_time)
            .map(x => firma(x.employee_name, x.location_name, x.start_time, x.end_time));
        const esperados = datos.importData.map(a => firma(a.empleado, a.localizacion, a.inicio, a.fin));

        eq(esperados.length, obtenidos.length, 'el parser recupera los mismos turnos');
        const faltan = esperados.filter(f => !obtenidos.includes(f));
        eq(faltan, [], 'ninguno se pierde al releer el archivo');

        // El turno de Nostalgia Night cruza la medianoche: tiene que conservarla.
        const nocturna = datos.importData.find(a => a.cruzaMedianoche);
        ok(nocturna, 'se detecta el turno que cruza la medianoche');
        if (nocturna) {
            const enImport = filasImport.find(f =>
                norm(f[0]) === norm(nocturna.empleado)
                && String(f[3] || '').slice(0, 5) === String(nocturna.inicio).slice(0, 5));
            eq(String(enImport ? enImport[4] : '').slice(0, 5), String(nocturna.fin).slice(0, 5),
                'el turno nocturno conserva su hora de fin en Import Data');

            // En la hoja visual puede estar en cualquier lado, asi que se busca
            // por la combinacion de nombre y hora, no solo por el nombre.
            const enArchivo = filasSchedule.find(f => {
                const celdas = [f[2], f[6]].map(c => norm(String(c || '')));
                const horas = [f[1], f[5]].map(c => String(c || ''));
                return celdas.some(c => c.indexOf(norm(nocturna.empleado)) >= 0)
                    && horas.some(h => h.indexOf(EXPORT_HHMM(nocturna.inicio)) >= 0);
            });
            ok(enArchivo, 'el turno nocturno aparece en la hoja visual');
            if (enArchivo) {
                const leido = QP.parseTimeCell(String(enArchivo[1] || enArchivo[5]));
                const r = leido.ranges && leido.ranges[0];
                const iMin = EXPORT_MIN(nocturna.inicio);
                const fMin = EXPORT_MIN(nocturna.fin);
                ok(r && r.start === iMin && r.end === fMin + 1440,
                    'la hoja visual conserva el cruce de medianoche'
                    + (r ? ' (leido como ' + r.start + '->' + r.end + ')' : ''));
            }
        }

        // Lo que el parser no puede colocar sale en `skipped`: hay que verlo,
        // no escondido.
        if (parseado.skipped && parseado.skipped.length) {
            console.log('  filas que el parser no pudo colocar como seccion: '
                + parseado.skipped.length);
            parseado.skipped.slice(0, 8).forEach(s => console.log('      fila ' + s.excelRow + ': ' + s.text));
        }

        // -------------------------------------------------------------------
        console.log('\n=== 6. NINGUN TURNO SE COLOCA EN LA LOCALIZACION DE AL LADO ===');
        // Este es el fallo que mas dano haria: una seccion no reconocida que se
        // queda con la localizacion anterior.
        //
        // La busqueda se hace por persona + hora de inicio, porque una persona
        // puede tener varios turnos y con el nombre solo se compararia siempre
        // contra el primero.
        const malColocados = obtenidos.filter(f => {
            const [emp, lugar, ini] = f.split('|');
            const turno = datos.importData.find(a =>
                norm(a.empleado) === emp && String(a.inicio).slice(0, 5) === ini);
            return !turno || norm(turno.localizacion) !== lugar;
        });
        eq(malColocados, [], 'cada turno conserva su propia seccion' + (malColocados.length
            ? ' -> ' + JSON.stringify(malColocados.slice(0, 4)) : ''));

        console.log('\n=== 7. BEER TENT ===');
        const beer = filasSchedule.filter(f => /beer/i.test(String(f[0]) + String(f[4])));
        eq(beer.length, 0, 'Beer Tent no sale, aunque su categoria siga en el catalogo');
        const beerCat = (await p.query(
            `SELECT is_active FROM schedule_categories WHERE key = 'beer-tent'`)).rows[0];
        ok(beerCat && beerCat.is_active === false,
            'Beer Tent sigue desactivado en el catalogo, sin borrar');

    } finally {
        // -------------------------------------------------------------------
        console.log('\n=== LIMPIEZA ===');
        if (creados.length) {
            const r = await p.query(
                `DELETE FROM assignments WHERE id = ANY($1::int[]) RETURNING id`, [creados]);
            console.log('  borrados ' + r.rowCount + ' turnos de prueba');
            const quedan = (await p.query(
                `SELECT count(*)::int n FROM assignments WHERE work_date = $1`, [FECHA])).rows[0].n;
            eq(quedan, 0, 'no queda ningun turno de prueba en la base');
        }
        await p.end();
    }

    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));
    process.exitCode = fail ? 1 : 0;
})().catch(async e => {
    console.error('ERROR:', e);
    try { await p.end(); } catch (x) {}
    process.exitCode = 1;
});