// ============================================================================
//  IDA Y VUELTA CON EL IMPORTADOR REAL
// ============================================================================
//  Esta es la prueba que demuestra que el archivo exportado sirve para lo que
//  se quiere: volver a meterlo en el sistema.
//
//  Usa el MISMO codigo que el importador de la interfaz, sin valores fijos
//  darios: no hay nombres de ejemplo ni recuentos inventados. Lo que se compara
//  es lo que hay en la base contra lo que el importador reconoce en el archivo.
//
//  El recorrido completo es:
//    1. El archivo exportado se lee como .xlsx.
//    2. El importador lo detecta como hoja de horario.
//    3. El importador genera una fila por turno.
//    4. Cada persona del archivo se empareja con su empleado real.
//    5. Cada localizacion del archivo se empareja con su localizacion real.
//    6. Cada fila vuelve a ser exactamente el turno que habia en la base.
//
//  El paso 6 es el que importa: si un turno cambia de sitio, cambia de horas o
//  pierde a su persona al pasar por el archivo, esta prueba lo detecta.
//
//  No escribe nada: el emparejado y la conversion son funciones puras. La
//  escritura la hace el endpoint de importacion, que ya tiene sus propias
//  pruebas.
// ============================================================================
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');

// El importador de verdad, el mismo que carga el navegador.
const ExcelImport = require('../excel-import.js');

const { obtenerDatos } = require('./schedule-export-data');
const { construirLibro } = require('./schedule-export');

const BASE = 'http://localhost:3002/api/foods';

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

// Firma de un turno: persona + lugar + inicio + fin.
const firma = (emp, lugar, ini, fin) =>
    [norm(emp), norm(lugar), String(ini || '').slice(0, 5), String(fin || '').slice(0, 5)].join('|');

(async () => {
    const p = new Pool({
        host: process.env.DB_HOST, port: +process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.FOODS_DB_NAME
    });

    // Catalogo de la base, que es contra el que el importador empareja.
    const empleados = (await p.query('SELECT id, name FROM employees ORDER BY id')).rows;
    const locations = (await p.query('SELECT id, name FROM locations ORDER BY id')).rows;

    // Se prueban varios dias, no solo uno: cada fecha tiene una combinacion
    // distinta de locaciones y de gente, y un fallo suele aparecer solo con una.
    const dias = (await p.query(
        `SELECT work_date::text AS dia, count(*)::int n FROM assignments
          GROUP BY work_date HAVING count(*) > 2 ORDER BY n DESC LIMIT 4`)).rows.map(r => r.dia);
    console.log('=== IDA Y VUELTA CON EL IMPORTADOR REAL ===');
    console.log('  fechas probadas: ' + dias.join(', ') + '\n');

    // El archivo se pide al servidor por HTTP, no se construye en memoria: lo
    // que se prueba es exactamente lo que descarga el navegador, con los
    // nombres de hoja y los tipos de celda que lleva el .xlsx de verdad.
    let tmp = null;
    const fechasProbadas = [];
    const firmasEsperadas = [];
    const firmasObtenidas = [];

    try {
        for (const dia of dias) {
            console.log('--- ' + dia + ' ---');

            const res = await fetch(BASE + '/schedule/export.xlsx?date=' + dia);
            eq(res.status, 200, dia + ': el archivo se descarga');
            if (!res.ok) continue;

            const buf = Buffer.from(await res.arrayBuffer());
            tmp = path.join(os.tmpdir(), 'roundtrip_' + dia + '.xlsx');
            fs.writeFileSync(tmp, buf);

            // 1. Lectura como .xlsx
            const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
            ok(wb.SheetNames.indexOf('Schedule') >= 0, dia + ': tiene hoja "Schedule"');
            const rows = XLSX.utils.sheet_to_json(wb.Sheets['Schedule'],
                { header: 1, raw: false, defval: '', blankrows: true });

            // 2. Deteccion por contenido
            ok(ExcelImport.isQuinyxSchedule(rows),
                dia + ': el importador lo reconoce como hoja de horario');

            // 3. Conversion a filas
            const built = ExcelImport.buildQuinyxScheduleRows(rows, 'Schedule');
            ok(built.rows.length > 0, dia + ': se generan ' + built.rows.length + ' filas');

            // 4 y 5. Emparejado contra la base. No crea nada: solo devuelve el
            // empleado o la localizacion que ha encontrado, o null.
            const emparejadas = built.rows.map(r => {
                const m = ExcelImport.matchEmployee(r, empleados);
                const l = ExcelImport.matchLocation(r.location_name, locations);
                return { fila: r, emp: m.employee || null, loc: l.location || null };
            });

            // Solo las filas que el importador da por buenas. Las que marca para
            // revision son las filas de supervision (sin horario) y las secciones
            // sin gente: no son turnos y no deben contarse como tales.
            const turnos = emparejadas.filter(x =>
                !x.fila.needs_review && x.fila.start_time && x.fila.end_time);

            const sinPersona = turnos.filter(x => !x.emp).map(x => x.fila.name);
            const sinLugar = turnos.filter(x => !x.loc).map(x => x.fila.location_name);

            eq(sinPersona, [], dia + ': toda persona del archivo existe en la base'
                + (sinPersona.length ? ' -> ' + JSON.stringify([...new Set(sinPersona)]) : ''));
            eq([...new Set(sinLugar)], [], dia + ': toda localizacion del archivo existe en la base'
                + (sinLugar.length ? ' -> ' + JSON.stringify([...new Set(sinLugar)]) : ''));

            // 6. Cada fila vuelve a ser el turno que habia.
            //    Se comparan los turnos que el importador reconstruye con los que
            //    hay guardados, usando el nombre real de la base para no depender
            //    de como se escribio el texto en el archivo.
            const deLaBase = (await p.query(
                `SELECT e.name AS emp, l.name AS lugar,
                        a.start_time::text AS ini, a.end_time::text AS fin
                   FROM assignments a
                   JOIN employees e ON e.id = a.employee_id
                   JOIN locations  l ON l.id = a.location_id
                  WHERE a.work_date = $1
                  ORDER BY e.name, a.start_time`, [dia])).rows;
            const esperadasDia = deLaBase.map(r => firma(r.emp, r.lugar, r.ini, r.fin));

            const obtenidasDia = turnos
                .filter(x => x.emp && x.loc)
                .map(x => firma(x.emp.name, x.loc.name, x.fila.start_time, x.fila.end_time));

            const faltan = esperadasDia.filter(f => !obtenidasDia.includes(f));
            const sobran = obtenidasDia.filter(f => !esperadasDia.includes(f));

            eq(faltan, [], dia + ': no se pierde ningun turno al reimportar'
                + (faltan.length ? ' -> ' + JSON.stringify(faltan.slice(0, 5)) : ''));
            eq(sobran, [], dia + ': no aparece ningun turno de mas al reimportar'
                + (sobran.length ? ' -> ' + JSON.stringify(sobran.slice(0, 5)) : ''));

            console.log('     turnos en la base: ' + esperadasDia.length
                + '   recuperados por el importador: ' + obtenidasDia.length);

            fechasProbadas.push(dia);
            esperadasDia.forEach(f => firmasEsperadas.push(f));
            obtenidasDia.forEach(f => firmasObtenidas.push(f));
        }

        // -------------------------------------------------------------------
        console.log('\n=== RESUMEN DE TODAS LAS FECHAS ===');
        console.log('  fechas: ' + fechasProbadas.length
            + '   turnos esperados: ' + firmasEsperadas.length
            + '   recuperados: ' + firmasObtenidas.length);
        eq(firmasObtenidas.length, firmasEsperadas.length,
            'el mismo número de turnos en todas las fechas');

        // -------------------------------------------------------------------
        console.log('\n=== LO QUE NO ES UN TURNO ===');
        // Las filas de supervision (persona sin horario) y las secciones sin
        // gente tienen que quedar fuera de los turnos, pero visibles. Se
        // comprueba que el importador las marca para revision en vez de
        // inventarles un horario.
        //
        // Se usa un dia que tenga supervisores asignados: en un dia sin ellos
        // no hay filas sin horario que comprobar y la prueba no diria nada.
        const conSup = (await p.query(
            `SELECT assigned_date::text AS dia FROM supervisor_assignments
              GROUP BY assigned_date ORDER BY count(*) DESC LIMIT 1`)).rows[0];

        if (!conSup) {
            console.log('  (hoy no hay ningun dia con supervisores asignados: nada que comprobar)');
        } else {
            const conSupervisores = conSup.dia;
            console.log('  dia con supervisores: ' + conSupervisores);

            const datos = await obtenerDatos(p, conSupervisores);
            const filasSinTurno = datos.der.secciones.length + datos.izq.secciones.length;
            console.log('  secciones en el archivo: ' + filasSinTurno
                + '   supervisores sin turno: '
                + JSON.stringify((datos.informe.supervisionSinUbicacion || []).map(x => x.localizacion)));

            const wbX = construirLibro(datos);
            const rowsX = XLSX.utils.sheet_to_json(wbX.Sheets['Schedule'],
                { header: 1, raw: false, defval: '', blankrows: true });
            const builtX = ExcelImport.buildQuinyxScheduleRows(rowsX, 'Schedule');

            const sinHorario = builtX.rows.filter(r => !r.start_time || !r.end_time);
            ok(sinHorario.length > 0, 'las filas sin horario se distinguen de los turnos ('
                + sinHorario.length + ' filas)');

            eq(sinHorario.every(r => !!r.needs_review), true,
                'toda fila sin horario queda marcada para revisión, no se guarda como turno');

            // Y al revés: ningun turno real ha quedado sin horas por el camino.
            const conHorario = builtX.rows.filter(r => r.start_time && r.end_time);
            eq(conHorario.length, datos.importData.length,
                'los turnos con horario son exactamente los de la base ('
                + datos.importData.length + ')');

            console.log('\n  motivos de revision que devuelve el importador: '
                + JSON.stringify([...new Set(sinHorario.map(r => r.needs_review))]));
        }

    } finally {
        if (tmp && fs.existsSync(tmp)) fs.unlinkSync(tmp);
        await p.end();
    }

    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));
    process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR:', e); process.exitCode = 1; });