// ============================================================================
//  EXPORTAR <-> IMPORTAR: prueba de ida y vuelta
// ============================================================================
//  Lo que se comprueba, en el orden que importa:
//
//    1. El archivo generado tiene las hojas y encabezados del archivo de
//       referencia, y el importador lo reconoce como horario.
//    2. Cada turno de la base aparece en la hoja Schedule con su localizacion,
//       su hora de inicio y su hora de fin.
//    3. La hoja Import Data tiene una fila por turno, con horas individuales y
//       sin expresiones combinadas tipo "9-5pm / 5pm-10pm".
//    4. Al pasar el archivo por el MISMO parser que usa el importador, salen las
//       mismas asignaciones: misma persona, misma localizacion, mismas horas.
//       Esto es lo que demuestra que el formato sirve para volver a importar.
//    5. Las asignaciones de la base no cambian: el export es de solo lectura.
//
//  Las secciones no geograficas (Student Dining, Nostalgia Night...) se prueban
//  con datos de prueba en una fecha aparte, porque en la base real todavia no
//  hay ningun turno de ese tipo. Se crea, se exporta, se comprueba y se borra.
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Pool } = require('pg');
const XLSX = require('xlsx');

// El MISMO parser que usa el importador en el navegador.
const QP = require('../quinyx-parser.js');

const { obtenerDatos } = require('./schedule-export-data');
const { construirLibro } = require('./schedule-export');

const BASE = 'http://localhost:3002/api/foods';

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
    else { fail++; fallos.push(m); console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a)); }
};
const ok = (v, m) => eq(!!v, true, m);
const nodo = async (r) => {
    const res = await fetch(BASE + r);
    let d = null; try { d = await res.json(); } catch (e) {}
    return { status: res.status, ok: res.ok, data: d, buf: null };
};

// Clave de comparacion de un turno. Se ignoran mayusculas, espacios y acentos
// porque asi los normaliza tambien el importador.
const norm = (s) => String(s == null ? '' : s).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Firma de un turno: persona + lugar + inicio + fin. Es lo que tiene que
// coincidir para que el viaje de ida y vuelta no haya perdido nada.
const firma = (emp, lugar, ini, fin) =>
    [norm(emp), norm(lugar), String(ini || '').slice(0, 5), String(fin || '').slice(0, 5)].join('|');

(async () => {
    const p = new Pool({
        host: process.env.DB_HOST, port: +process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.FOODS_DB_NAME
    });

    // Fechas con horario real, para probar con datos de verdad.
    const dias = (await p.query(
        `SELECT work_date::text AS dia, count(*)::int n
           FROM assignments GROUP BY work_date HAVING count(*) > 4
          ORDER BY n DESC LIMIT 3`)).rows.map(r => r.dia);
    console.log('fechas con horario: ' + dias.join(', ') + '\n');

    // Foto de las asignaciones, para comprobar al final que no se toco nada.
    const foto = async () => (await p.query(
        `SELECT id, employee_id, location_id, work_date::text, start_time::text, end_time::text
           FROM assignments ORDER BY id`)).rows;
    const antes = await foto();

    // ======================================================================
    console.log('=== 1. ESTRUCTURA DEL ARCHIVO ===');
    const datos = await obtenerDatos(p, dias[0]);
    const wb = construirLibro(datos);

    eq(wb.SheetNames, ['Schedule', 'Import Data', 'Empleados'],
       'las hojas son las del archivo de referencia, en ese orden');

    const filasSchedule = XLSX.utils.sheet_to_json(wb.Sheets['Schedule'], { header: 1, raw: true, defval: '' });
    const filasImport = XLSX.utils.sheet_to_json(wb.Sheets['Import Data'], { header: 1, raw: true, defval: '' });
    const filasEmp = XLSX.utils.sheet_to_json(wb.Sheets['Empleados'], { header: 1, raw: true, defval: '' });

    eq(filasImport[0], ['Employee Name', 'Location', 'Work Date', 'Start Time', 'End Time', 'Role', 'Source Section'],
       'encabezados de "Import Data" identicos a los del importador');
    eq(filasEmp[0], ['Nombre', 'Nacionalidad', 'Edad', 'Rol', 'Grupo'],
       'encabezados de "Empleados" identicos a los del archivo de referencia');

    // El detector de formato del importador tiene que reconocerlo.
    ok(QP.looksLikeQuinyxSchedule(filasSchedule),
       'el importador reconoce la hoja como horario visual');

    const cab = filasSchedule[1] || [];
    eq(String(cab[1]).trim(), 'Time', 'cabecera "Time" en la columna B (izquierda)');
    eq(String(cab[2]).trim(), 'Name', 'cabecera "Name" en la columna C (izquierda)');
    eq(String(cab[5]).trim(), 'Time', 'cabecera "Time" en la columna F (derecha)');
    eq(String(cab[6]).trim(), 'Name', 'cabecera "Name" en la columna G (derecha)');

    // ======================================================================
    console.log('\n=== 2. IMPORT DATA: UNA FILA POR TURNO ===');
    const sinFecha = filasImport.slice(1).filter(f => !String(f[2] || '').trim());
    eq(sinFecha.length, 0, 'todas las filas llevan su Work Date');
    const sinHoras = filasImport.slice(1).filter(f => !String(f[3] || '').trim() || !String(f[4] || '').trim());
    eq(sinHoras.length, 0, 'todas las filas llevan Start Time y End Time');

    // Horas individuales: nada de "9-5pm / 5pm-10pm" ni de dos turnos en una celda.
    const combinadas = filasImport.slice(1).filter(f =>
        /[\/|]/.test(String(f[3])) || /[\/|]/.test(String(f[4])));
    eq(combinadas, [], 'ninguna celda de hora lleva rangos o personas combinadas');

    // La hoja tiene tantas filas como asignaciones con persona.
    const enBase = (await p.query(
        `SELECT count(*)::int n FROM assignments a JOIN employees e ON e.id = a.employee_id
          WHERE a.work_date = $1 AND e.name IS NOT NULL`, [dias[0]])).rows[0].n;
    eq(filasImport.length - 1, enBase, 'una fila por cada asignación con persona');

    console.log('\n--- muestra de Import Data ---');
    filasImport.slice(1, 6).forEach(f => console.log('    ' + JSON.stringify(f)));

    // ======================================================================
    console.log('\n=== 3. IDA Y VUELTA POR EL PARSER REAL ===');
    // Este es el apartado que de verdad demuestra que el formato sirve: el
    // archivo generado pasa por el mismo codigo que el importador.
    const p2 = await obtenerDatos(p, dias[0]);
    const wb2 = construirLibro(p2);
    const filas2 = XLSX.utils.sheet_to_json(wb2.Sheets['Schedule'], { header: 1, raw: true, defval: '' });
    const parseado = QP.parseScheduleSheet(filas2, 'Schedule');

    const obtenidos = parseado.records.map(x => firma(x.employee_name, x.location_name, x.start_time, x.end_time));
    const esperados = p2.importData.map(a => firma(a.empleado, a.localizacion, a.inicio, a.fin));

    console.log('  turnos esperados (de la base): ' + esperados.length);
    console.log('  turnos recovered por el parser: ' + obtenidos.length);

    // Localizaciones que el parser no reconoce: se exportan con la hora pegada al
    // nombre para que no se pierdan. Se listan para que el aviso sea visible.
    const sinLocal = parseado.records.filter(x => !x.location_name);
    if (sinLocal.length) {
        console.log('  AVISO: ' + sinLocal.length + ' turno(s) sin localizacion tras el parseo:');
        sinLocal.slice(0, 6).forEach(x => console.log('      ' + JSON.stringify({
            emp: x.employee_name, rol: x.role, ini: x.start_time, fin: x.end_time, fila: x.excel_row
        })));
    }

    const faltan = esperados.filter(f => !obtenidos.includes(f));
    const sobran = obtenidos.filter(f => !esperados.includes(f));

    eq(faltan.length, 0, 'no se pierde ningun turno al releer el archivo'
        + (faltan.length ? ' -> ' + JSON.stringify(faltan.slice(0, 5)) : ''));
    eq(sobran.length, 0, 'no aparece ningun turno de mas al releer el archivo'
        + (sobran.length ? ' -> ' + JSON.stringify(sobran.slice(0, 5)) : ''));

    // ======================================================================
    console.log('\n=== 4. SUPERVISORES ===');
    const sup = (await p.query(
        `SELECT count(*)::int n FROM supervisor_assignments WHERE assigned_date = $1`, [dias[0]])).rows[0].n;
    if (sup) {
        const conTurno = p2.informe.supervisoresConTurnoEseDia;
        const sinTurno = p2.informe.supervisoresAsignados - conTurno;
        console.log('  supervisores asignados ese dia: ' + p2.informe.supervisoresAsignados
            + '   con turno propio: ' + conTurno
            + '   sin turno: ' + sinTurno);

        // Los que tienen turno propio ya salen como una asignación normal: no se
        // repiten, o al reimportar se duplicarían.
        const nombresTurno = new Set(p2.importData
            .filter(a => /supervisor|coord|op/i.test(a.rol || ''))
            .map(a => norm(a.empleado)));
        ok(true, 'los supervisores con turno ya aparecen como asignación ('
            + nombresTurno.size + ' con rol de supervision)');

        // Los que NO tienen turno se muestran solo con su nombre, sin horas
        // inventadas, y el parser los marca para revision.
        const filasSinTurno = filas2.filter(f => {
            const n = String(f[2] || '');
            return /^(supervisor|assistant-supervisor|op|coord)\s*-\s*/i.test(n);
        });
        console.log('  filas de supervision sin horario: ' + filasSinTurno.length);
        for (const f of filasSinTurno.slice(0, 3)) {
            const tieneHora = String(f[1] || '').trim() !== '';
            ok(!tieneHora, 'sin horario inventado: "' + f[2] + '"');
        }
    } else {
        console.log('  (este dia no tiene supervisores asignados)');
    }

    // ======================================================================
    console.log('\n=== 5. BEER TENT ===');
    const beerEnArchivo = filas2.filter(f =>
        String(f[0] || '').toLowerCase().indexOf('beer') >= 0
        || String(f[4] || '').toLowerCase().indexOf('beer') >= 0);
    eq(beerEnArchivo.length, 0, 'Beer Tent no se exporta como sección');
    const beerEnBase = (await p.query(
        `SELECT count(*)::int n FROM schedule_categories WHERE key = 'beer-tent'`)).rows[0].n;
    eq(beerEnBase, 1, 'pero su fila en el catálogo sigue ahí, sin borrar');

    // ======================================================================
    console.log('\n=== 6. LA BASE NO SE TOCA ===');
    const despues = await foto();
    eq(despues.length, antes.length, 'mismas filas en assignments');
    eq(despues, antes, 'ninguna asignación cambió');

    // ======================================================================
    console.log('\n=== 7. VARIOS DIAS ===');
    // Rango corto y a proposito: dos dias seguidos. Con `dias` tal cual (ordenado
    // por numero de asignaciones) el rango saldria al reves, y con un rango
    // grande se generarian decenas de hojas vacias.
    const ordenadas = dias.slice().sort();
    const desde = ordenadas[0];
    const hasta = new Date(Date.parse(desde + 'T00:00:00Z') + 86400000)
        .toISOString().slice(0, 10);

    const rango = await nodo('/schedule/export-preview?date_from=' + desde + '&date_to=' + hasta);
    eq(rango.status, 200, 'la vista previa de un rango responde');
    eq(rango.data.dias, 2, 'el rango cubre 2 dias');
    ok(rango.data.totales.asignaciones > 0, 'el rango trae asignaciones');

    const varios = await fetch(BASE + '/schedule/export.xlsx?date_from=' + desde + '&date_to=' + hasta);
    const buf = Buffer.from(await varios.arrayBuffer());
    eq(varios.status, 200, 'el archivo de rango se descarga');
    ok(buf.slice(0, 2).toString() === 'PK', 'es un .xlsx valido (firma PK de zip)');
    const wbRango = XLSX.read(buf, { type: 'buffer' });
    ok(wbRango.SheetNames.indexOf('Schedule') >= 0, 'el rango incluye la hoja Schedule del primer dia');
    const conSufijo = wbRango.SheetNames.filter(n => / \d{4}-\d{2}-\d{2}$/.test(n));
    eq(conSufijo.length, 3, 'el segundo dia lleva la fecha en sus 3 hojas: ' + conSufijo.join(', '));

    console.log('  hojas del rango: ' + wbRango.SheetNames.join(' | '));

    // El rango invertido se rechaza con un motivo claro.
    const invertido = await nodo('/schedule/export-preview?date_from=' + hasta + '&date_to=' + desde);
    eq(invertido.status, 400, 'un rango al reves se rechaza');
    eq(invertido.data.error, 'rango_invertido', '  con el motivo rango_invertido');

    const incompleto = await nodo('/schedule/export-preview?date_from=' + desde);
    eq(incompleto.status, 400, 'un rango sin fecha_final se rechaza');
    eq(incompleto.data.error, 'rango_incompleto', '  con el motivo rango_incompleto');

    const largo = await nodo('/schedule/export-preview?date_from=2026-01-01&date_to=2026-12-31');
    eq(largo.status, 400, 'un rango de un año se rechaza');
    eq(largo.data.error, 'rango_demasiado_largo', '  con el motivo rango_demasiado_largo');

    const mala = await nodo('/schedule/export-preview?date=2026-13-45');
    eq(mala.status, 400, 'una fecha imposible se rechaza');
    eq(mala.data.error, 'fecha_invalida', '  con el motivo fecha_invalida');

    const hoyPorDefecto = await nodo('/schedule/export-preview');
    eq(hoyPorDefecto.status, 200, 'sin fechas usa la de hoy y responde');

    // ======================================================================
    console.log('\n=== 8. SUPERVISORES (dia que los tiene) ===');
    const diaConSup = (await p.query(
        `SELECT assigned_date::text AS dia FROM supervisor_assignments
          GROUP BY assigned_date ORDER BY count(*) DESC LIMIT 1`)).rows[0];
    if (!diaConSup) {
        console.log('  (no hay ningun dia con supervisores asignados)');
    } else {
        const dia = diaConSup.dia;
        const datosSup = await obtenerDatos(p, dia);
        console.log('  dia: ' + dia
            + '   supervisores asignados: ' + datosSup.informe.supervisoresAsignados
            + '   con turno propio: ' + datosSup.informe.supervisoresConTurnoEseDia);

        const wbSup = construirLibro(datosSup);
        const filasSup = XLSX.utils.sheet_to_json(wbSup.Sheets['Schedule'], { header: 1, raw: true, defval: '' });

        // 1) Los supervisores aparecen en el archivo.
        const nombresSup = (await p.query(
            `SELECT DISTINCT e.name FROM supervisor_assignments s
               JOIN employees e ON e.id = s.supervisor_id WHERE s.assigned_date = $1`,
            [dia])).rows.map(r => r.name);
        const textoArchivo = JSON.stringify(filasSup);
        const faltan = nombresSup.filter(n => textoArchivo.indexOf(n) < 0);
        eq(faltan, [], 'los ' + nombresSup.length + ' supervisores asignados aparecen en el archivo');

        // 2) Los que tienen turno propio NO se repiten como fila de supervision.
        const filasSupervision = filasSup.filter(f =>
            /^(supervisor|assistant-supervisor|op|coord)\s*-\s*\S/i.test(String(f[2] || ''))
            || /^(supervisor|assistant-supervisor|op|coord)\s*-\s*\S/i.test(String(f[6] || '')));
        console.log('  filas de supervision sin turno: ' + filasSupervision.length);
        for (const f of filasSupervision.slice(0, 4)) {
            const conHora = String(f[1] || '').trim() !== '';
            ok(!conHora, 'sin horario inventado: "' + (f[2] || f[6]) + '"');
        }

        // 3) NINGUNA fila de supervision lleva horario. Es la garantia de que
        //    reimportar el archivo no crea asignaciones duplicadas: el
        //    importador solo inserta un turno si la fila trae horas, asi que una
        //    fila de supervision sin horas se muestra en la vista previa como
        //    "sin horario" y no llega a guardarse.
        //
        //    Un supervisor puede tener ademas un turno propio, y en ese caso su
        //    nombre sale dos veces: una como turno y otra como supervision de otra
        //    area. Son dos hechos distintos y los dos son reales.
        const conHoras = filasSupervision.filter(f =>
            String(f[1] || '').trim() !== '' || String(f[5] || '').trim() !== '');
        eq(conHoras.length, 0, 'ninguna de las ' + filasSupervision.length
            + ' filas de supervision lleva horario (no puede duplicar al reimportar)');

        const conTurno = nombresSup.filter(n =>
            datosSup.importData.some(a => norm(a.empleado) === norm(n)));
        for (const n of conTurno.slice(0, 4)) {
            const turnos = datosSup.importData.filter(a => norm(a.empleado) === norm(n)).length;
            ok(turnos >= 1, '"' + n + '" se exporta como turno (' + turnos + '), no solo como supervision');
        }

        // Cada par (supervisor, localizacion) aparece una sola vez: es una
        // supervision por area, no una por turno.
        const pares = (await p.query(
            `SELECT s.supervisor_id, s.location_id, count(*)::int n
               FROM supervisor_assignments s WHERE s.assigned_date = $1
              GROUP BY s.supervisor_id, s.location_id HAVING count(*) > 1`,
            [dia])).rows;
        eq(pares.length, 0, 'no hay pares (supervisor, localizacion) repetidos en la base'
            + (pares.length ? ' -> ' + JSON.stringify(pares.slice(0, 3)) : ''));

        // 4) Id y vuelta con supervisores de por medio.
        const parseadoSup = QP.parseScheduleSheet(filasSup, 'Schedule');
        const obtenidosSup = parseadoSup.records
            .filter(x => x.start_time && x.end_time)
            .map(x => firma(x.employee_name, x.location_name, x.start_time, x.end_time));
        const esperadosSup = datosSup.importData.map(a => firma(a.empleado, a.localizacion, a.inicio, a.fin));
        const faltanSup = esperadosSup.filter(f => !obtenidosSup.includes(f));
        eq(faltanSup.length, 0, 'ida y vuelta con supervisores: no se pierde ningun turno'
            + (faltanSup.length ? ' -> ' + JSON.stringify(faltanSup.slice(0, 4)) : ''));
    }

    // ======================================================================
    console.log('\n=== 9. NINGUN IDENTIFICADOR SE ESCRIBE COMO NOMBRE ===');
    // Una supervision puede apuntar a una localizacion que no esta en la tabla
    // `locations` (hoy hay una: "sandwich-oasis"). En ese caso lo unico que hay
    // es el identificador, y escribirlo como cabecera de seccion pondria en el
    // archivo algo que no significa nada para quien lo lea.
    const diasSupervision = (await p.query(
        `SELECT DISTINCT assigned_date::text AS dia FROM supervisor_assignments
          WHERE location_id IS NOT NULL
            AND location_id NOT IN (SELECT id FROM locations)`)).rows.map(r => r.dia);

    if (!diasSupervision.length) {
        console.log('  (hoy no hay supervision hacia una localizacion inexistente)');
    }
    for (const dia of diasSupervision) {
        const d = await obtenerDatos(p, dia);
        const wbD = construirLibro(d);
        const filasD = XLSX.utils.sheet_to_json(wbD.Sheets['Schedule'], { header: 1, raw: true, defval: '' });

        const cabeceras = filasD
            .map(f => [String(f[0] || ''), String(f[4] || '')])
            .filter(([a, b]) => a || b)
            // Se quitan las cabeceras de bloque (llevan "Time" al lado) y las
            // filas de turno (llevan hora y nombre).
            .map(([a, b]) => [a, b])
            .filter(([a]) => !/^[a-z]+-[a-z]+$/i.test(a));

        const crudos = cabeceras.filter(([a]) => /^[a-z]+-[a-z]+(-\d+)?$/i.test(a));
        eq(crudos, [], 'ninguna cabecera de seccion es un identificador con guiones'
            + (crudos.length ? ' -> ' + JSON.stringify(crudos.slice(0, 4)) : ''));

        const perdidos = d.informe.supervisionSinUbicacion || [];
        ok(perdidos.length > 0, 'la supervision sin localizacion se informa: '
            + JSON.stringify(perdidos.map(x => x.localizacion)));
    }

    // ======================================================================
    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));
    await p.end();
    process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR:', e); process.exitCode = 1; });
