// ============================================================================
//  CAMPO INSPECTOR: entidad propia, separada de los empleados
// ============================================================================
//  Cubre lo pedido:
//    1. El campo Inspector no se llena con empleados.
//    2. Al crear se puede escribir el nombre, y el id se genera solo.
//    3. Se guardan inspeccion + nombre + id de inspector + fecha/hora/tipo/
//       locacion/notas, sin exigir que el inspector existiera.
//    4. El nombre y el id sobreviven a cambios posteriores.
//    5. Las inspecciones anteriores no se tocan.
//
//  Al final retira lo que creo, con borrado fisico, y comprueba que las
//  inspecciones reales siguen exactamente como estaban.
require('dotenv').config();
const { Pool } = require('pg');

const BASE = 'http://localhost:3002/api/foods';
const FECHAS = { inicio: '2097-01-01', fin: '2097-12-31' };
const MARCA_NOTAS = 'Prueba del campo inspector.';

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
    else { fail++; fallos.push(m); console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a)); }
};
const ok = (v, m) => eq(!!v, true, m);
const nodo = async (ruta, opts) => {
    const r = await fetch(BASE + ruta, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    let d = null; try { d = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, data: d };
};

(async () => {
    const p = new Pool({
        host: process.env.DB_HOST, port: +process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.FOODS_DB_NAME
    });

    const foto = async () => ({
        inspecciones: (await p.query('SELECT count(*)::int n FROM inspections')).rows[0].n,
        inspectores: (await p.query('SELECT count(*)::int n FROM inspectors')).rows[0].n,
        empleados: (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n,
        hallazgos: (await p.query('SELECT count(*)::int n FROM inspection_findings')).rows[0].n,
        correcciones: (await p.query('SELECT count(*)::int n FROM corrections')).rows[0].n
    });

    // Limpieza previa, solo de la fecha y la marca de la prueba.
    const previas = (await p.query(
        `SELECT id FROM inspections
          WHERE inspection_date >= $1 AND inspection_date <= $2 OR general_notes = $3`,
        [FECHAS.inicio, FECHAS.fin, MARCA_NOTAS])).rows.map(r => r.id);
    if (previas.length) {
        await p.query('DELETE FROM inspection_status_history WHERE inspection_id = ANY($1::int[])', [previas]);
        await p.query('DELETE FROM inspection_findings WHERE inspection_id = ANY($1::int[])', [previas]);
        await p.query('DELETE FROM inspections WHERE id = ANY($1::int[])', [previas]);
    }

    const partida = await foto();
    // Que inspectores habia ANTES de que este test creara ninguno. La limpieza
    // usa esta lista: si la tomara al final, incluiria los inspectores de la
    // propia prueba y no borraria ninguno.
    const inspectoresPreexistentes = (await p.query('SELECT id FROM inspectors')).rows.map(r => r.id);
    console.log('estado de partida: ' + JSON.stringify(partida) + '\n');

    // ======================================================================
    console.log('=== 1. EL CAMPO NO USA LA TABLA DE EMPLEADOS ===');
    const inspectores = (await nodo('/inspectors')).data;
    ok(Array.isArray(inspectores), '/inspectors responde una lista');
    const empleados = (await nodo('/employees')).data;
    ok(empleados.length > 0, 'hay ' + empleados.length + ' empleados en el sistema');

    // Ningun nombre de inspector puede ser en realidad un empleado.
    const nombresEmpleado = new Set(empleados.map(e => String(e.name).trim().toLowerCase()));
    const nombresInspector = inspectores.map(i => String(i.name).trim().toLowerCase());
    const coinciden = nombresInspector.filter(n => nombresEmpleado.has(n));
    eq(coinciden, [], 'ningun inspector registrado coincide con un empleado');

    // El endpoint de inspectores no trae datos de empleado (ni rol, ni id de
    // empleado, ni nada que solo exista en la tabla employees).
    const formaInspector = Object.keys(inspectores[0] || {}).sort();
    ok(formaInspector.indexOf('role') < 0, '/inspectors no devuelve un campo "role"');
    ok(formaInspector.indexOf('ops_group') < 0, '/inspectors no devuelve "ops_group"');
    ok(formaInspector.indexOf('badge_number') < 0, '/inspectors no devuelve "badge_number"');
    console.log('       campos que devuelve: ' + formaInspector.join(', '));

    // ======================================================================
    console.log('\n=== 2. CREAR ESCRIBIENDO EL NOMBRE, ID GENERADO SOLO ===');
    const empleadosAntes = (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n;

    const creada = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({
            inspection_date: '2097-03-10',
            inspection_time: '11:30',
            inspection_type: 'food_safety',
            location_id: 'pixie-kitchen',
            inspector_name: 'Maria Fernanda Lopez',
            general_notes: MARCA_NOTAS
        })
    });
    eq(creada.status, 201, 'inspección creada escribiendo solo el nombre');
    const inspId = creada.data.id;

    ok(creada.data.inspection_number, 'ID de inspección generado: ' + creada.data.inspection_number);
    ok(/^INS-/.test(creada.data.inspection_number), 'el ID de inspección tiene formato INS-...');

    // El ID de inspección y el de inspector son cosas distintas.
    ok(creada.data.inspector_id, 'ID de inspector generado: ' + creada.data.inspector_id);
    ok(creada.data.inspector_id !== creada.data.id,
       'el ID de inspector es DISTINTO del ID de inspección (' + creada.data.inspector_id + ' vs ' + creada.data.id + ')');

    const empleadosDespues = (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n;
    eq(empleadosDespues, empleadosAntes, 'no se creó ningún empleado al registrar el inspector');

    // ======================================================================
    console.log('\n=== 3. SE GUARDA TODO LO PEDIDO ===');
    const d = (await nodo('/inspections/' + inspId)).data;
    ok(d.inspection_number, 'ID de inspección guardado');
    eq(d.inspector_name, 'Maria Fernanda Lopez', 'nombre del inspector guardado tal cual');
    eq(d.inspector_id, creada.data.inspector_id, 'ID del inspector guardado');
    eq(d.inspection_date, '2097-03-10', 'fecha guardada');
    eq(String(d.inspection_time).slice(0, 5), '11:30', 'hora guardada');
    eq(d.inspection_type, 'food_safety', 'tipo guardado');
    eq(d.location_id, 'pixie-kitchen', 'locación guardada');
    eq(d.general_notes, MARCA_NOTAS, 'notas generales guardadas');

    const enDb = (await p.query(
        'SELECT inspector_id, inspector_name FROM inspections WHERE id = $1', [inspId])).rows[0];
    eq(enDb.inspector_id, creada.data.inspector_id, 'el ID del inspector esta en la base');
    eq(enDb.inspector_name, 'Maria Fernanda Lopez', 'el nombre del inspector esta en la base');

    // No hace falta que existiera de antemano: se dio de alta al guardar.
    const enRegistro = (await p.query(
        'SELECT id, name FROM inspectors WHERE id = $1', [creada.data.inspector_id])).rows[0];
    ok(enRegistro, 'el inspector quedo registrado con id propio');
    eq(enRegistro.name, 'Maria Fernanda Lopez', 'con el nombre escrito');

    // ======================================================================
    console.log('\n=== 4. EL MISMO NOMBRE NO SE REGISTRA DOS VECES ===');
    const misma = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({
            inspection_date: '2097-03-11', inspection_type: 'general',
            location_id: 'pixie-kitchen', inspector_name: '  maria   fernanda LOPEZ  '
        })
    });
    eq(misma.status, 201, 'segunda inspección con el mismo nombre');
    eq(misma.data.inspector_id, creada.data.inspector_id,
       'reutiliza el mismo inspector (ignora mayúsculas y espacios)');
    eq(misma.data.inspector_name, 'Maria Fernanda Lopez',
       'guarda el nombre del registro, no la grafía tecleada');

    // ======================================================================
    console.log('\n=== 5. EL NOMBRE SOBREVIVE A CAMBIOS POSTERIORES ===');
    // Se renombra el inspector en el registro y se desactiva.
    await p.query(
        `UPDATE inspectors SET name = 'Nombre Cambiado Despues', is_active = false
          WHERE id = $1`, [creada.data.inspector_id]);

    const despues = (await nodo('/inspections/' + inspId)).data;
    eq(despues.inspector_name, 'Maria Fernanda Lopez',
       'la inspección sigue mostrando el nombre con el que se hizo');
    eq(despues.inspector_display, 'Maria Fernanda Lopez',
       'y el listado tambien');

    const listado = (await nodo('/inspections')).data;
    const enListado = listado.find(i => i.id === inspId);
    eq(enListado.inspector_display, 'Maria Fernanda Lopez',
       'el listado de inspecciones lo sigue mostrando');
    eq(enListado.inspector_display, despues.inspector_name,
       'el snapshot manda sobre el nombre actual del registro');

    const porLoc = (await nodo('/inspections-by-location')).data;
    const pixie = porLoc.find(x => x.location_id === 'pixie-kitchen');
    eq(pixie.inspector_display, 'Maria Fernanda Lopez',
       'el panel de locaciones lo sigue mostrando');

    // El PDF tambien.
    const pdf = await fetch(BASE + '/inspections-audit.pdf?date_from=2097-01-01&date_to=2097-12-31');
    const buf = Buffer.from(await pdf.arrayBuffer());
    eq(pdf.status, 200, 'el PDF se genera');
    ok(buf.slice(0, 5).toString() === '%PDF-', 'es un PDF válido');

    // Se devuelve el nombre del registro, para dejarlo como estaba.
    await p.query('UPDATE inspectors SET name = $2, is_active = true WHERE id = $1',
        [creada.data.inspector_id, 'Maria Fernanda Lopez']);

    // ======================================================================
    console.log('\n=== 6. VALIDACIONES DEL CAMPO ===');
    const sinNombre = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({ inspection_date: '2097-03-12', inspection_type: 'general', location_id: 'pixie-kitchen' })
    });
    eq(sinNombre.status, 400, 'sin nombre de inspector se rechaza');
    eq(sinNombre.data.error, 'inspector_name_required', '  con el motivo inspector_name_required');

    const vacio = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({ inspection_date: '2097-03-12', inspection_type: 'general',
                                location_id: 'pixie-kitchen', inspector_name: '    ' })
    });
    eq(vacio.status, 400, 'con el nombre en blanco tambien se rechaza');

    // Un id de inspector inventado no se crea: manda el nombre.
    const idFalso = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({ inspection_date: '2097-03-13', inspection_type: 'general',
                               location_id: 'pixie-kitchen', inspector_id: 999999999,
                               inspector_name: 'Inspector Con Id Falso' })
    });
    eq(idFalso.status, 201, 'un id de inspector inexistente no rompe el alta');
    ok(idFalso.data.inspector_id !== 999999999, 'no se usa el id inventado');
    eq(idFalso.data.inspector_name, 'Inspector Con Id Falso', 'manda el nombre escrito');

    // Editar: se puede cambiar el inspector
    const editada = await nodo('/inspections/' + inspId, {
        method: 'PUT', body: JSON.stringify({ inspector_name: 'Otro Inspector Distinto' })
    });
    eq(editada.status, 200, 'se puede cambiar el inspector al editar');
    eq(editada.data.inspector_name, 'Otro Inspector Distinto', 'queda el nombre nuevo');
    ok(editada.data.inspector_id !== creada.data.inspector_id, 'con id de inspector nuevo');

    const vaciar = await nodo('/inspections/' + inspId, {
        method: 'PUT', body: JSON.stringify({ inspector_name: '  ' })
    });
    eq(vaciar.status, 400, 'no se puede dejar el inspector vacío al editar');
    eq(vaciar.data.error, 'inspector_name_required', '  con el motivo inspector_name_required');

    // ======================================================================
    console.log('\n=== 7. LAS INSPECCIONES ANTERIORES INTACTAS ===');
    const idsAntiguos = [];
    for (const id of [1, 2, 3]) {
        if ((await p.query('SELECT 1 FROM inspections WHERE id = $1', [id])).rows.length) idsAntiguos.push(id);
    }
    const antesDeEso = (await p.query(
        `SELECT id, inspection_number, inspector_id, inspector_name, location_id
           FROM inspections WHERE id = ANY($1::int[]) ORDER BY id`, [idsAntiguos])).rows;
    ok(antesDeEso.length === idsAntiguos.length, 'las inspecciones antiguas siguen existiendo');

    // Sus ids de inspector de la epoca de los empleados se conservan tal cual.
    const conIdAntiguo = antesDeEso.filter(r => r.inspector_id !== null);
    ok(conIdAntiguo.length > 0, conIdAntiguo.length + ' inspección(es) conservan su ID de inspector anterior');
    ok(conIdAntiguo.some(r => r.inspector_name === null),
       'y su inspector_name sigue vacío: no se ha rellenado nada a la fuerza');

    // Se muestran con una aviso, no con un null ni con el nombre de un empleado.
    for (const r of conIdAntiguo) {
        const v = (await nodo('/inspections/' + r.id)).data;
        ok(v.inspector_display && v.inspector_display.indexOf(String(r.inspector_id)) >= 0,
           'inspección ' + r.id + ' explica su ID de inspector anterior: "' + v.inspector_display + '"');
    }

    // El id nuevo nunca puede pisar uno antiguo.
    const maxAntiguo = Math.max(...conIdAntiguo.map(r => r.inspector_id || 0));
    ok(idFalso.data.inspector_id > maxAntiguo,
       'el ID de inspector generado (' + idFalso.data.inspector_id + ') esta por encima del máximo antiguo (' + maxAntiguo + ')');

    // ======================================================================
    console.log('\n=== 8. LIMPIEZA ===');
    const creadas = (await p.query(
        `SELECT id FROM inspections
          WHERE inspection_date >= $1 AND inspection_date <= $2 OR general_notes = $3
             OR inspector_name IN ('Inspector Con Id Falso','Otro Inspector Distinto')`,
        [FECHAS.inicio, FECHAS.fin, MARCA_NOTAS])).rows.map(r => r.id);
    if (creadas.length) {
        await p.query('DELETE FROM inspection_status_history WHERE inspection_id = ANY($1::int[])', [creadas]);
        await p.query('DELETE FROM inspection_findings WHERE inspection_id = ANY($1::int[])', [creadas]);
        await p.query('DELETE FROM inspections WHERE id = ANY($1::int[])', [creadas]);
    }
    // Los inspectores de la prueba: SOLO los que creo esta corrida, es decir
    // los que no estaban en la lista de partida. Los previos se dejan intactos.
    const nuevos = (await p.query('SELECT id FROM inspectors x'
        + ' WHERE NOT (x.id = ANY($1::int[]))', [inspectoresPreexistentes])).rows.map(r => r.id);
    if (nuevos.length) await p.query('DELETE FROM inspectors WHERE id = ANY($1::int[])', [nuevos]);
    console.log('  retiradas ' + creadas.length + ' inspeccion(es) y ' + nuevos.length + ' inspector(es)');

    const fin = await foto();
    console.log('  partida: ' + JSON.stringify(partida));
    console.log('  final:   ' + JSON.stringify(fin));
    const iguales = Object.keys(partida).filter(k => partida[k] === fin[k]);
    eq(iguales.length, Object.keys(partida).length, 'todas las tablas volvieron a su número original');

    // Las 3 inspecciones historicas, campo por campo.
    const despuesDeEso = (await p.query(
        `SELECT id, inspection_number, inspector_id, inspector_name, location_id
           FROM inspections WHERE id = ANY($1::int[]) ORDER BY id`, [idsAntiguos])).rows;
    eq(despuesDeEso, antesDeEso, 'las inspecciones antiguas no han cambiado ni un campo');

    console.log('\n' + '='.repeat(66));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(66));
    await p.end();
    process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR:', e); process.exitCode = 1; });
