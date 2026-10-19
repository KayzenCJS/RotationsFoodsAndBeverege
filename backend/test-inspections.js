// Prueba del modulo de inspecciones de punta a punta, contra el servidor real.
// Crea datos, comprueba relaciones y validaciones, y al final los retira con
// borrado logico (no borra nada que ya existiera).
require('dotenv').config();
const { Pool } = require('pg');

const BASE = 'http://localhost:3002/api/foods';
const FECHAS = { inicio: '2098-03-01', fin: '2098-03-31' };

let pass = 0, fail = 0; const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
    else { fail++; fallos.push(m); console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a)); }
};
const ok = (v, m) => eq(!!v, true, m);
const nodo = async (path, opts) => {
    const r = await fetch(BASE + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    let d = null; try { d = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, data: d };
};
const H = (t) => (t ? String(t).slice(0, 5) : t);

(async () => {
    const p = new Pool({
        host: process.env.DB_HOST, port: +process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASSWORD,
        database: process.env.FOODS_DB_NAME
    });
    const creado = { inspecciones: [], hallazgos: [], correcciones: [] };

    // Limpieza previa: si una corrida anterior fallo a medias, sus restos
    // falsearian las comparaciones. Solo toca la fecha de la prueba, jamas
    // registros reales.
    const previas = (await p.query(
        'SELECT id FROM inspections WHERE inspection_date >= $1 AND inspection_date <= $2',
        [FECHAS.inicio, FECHAS.fin])).rows.map(r => r.id);
    if (previas.length) {
        await p.query('DELETE FROM inspection_status_history WHERE inspection_id = ANY($1::int[])', [previas]);
        await p.query('DELETE FROM inspection_findings WHERE inspection_id = ANY($1::int[])', [previas]);
        await p.query('DELETE FROM inspections WHERE id = ANY($1::int[])', [previas]);
        await p.query('DELETE FROM inspection_status_history WHERE finding_id NOT IN (SELECT id FROM inspection_findings)');
        await p.query('DELETE FROM corrections WHERE finding_id NOT IN (SELECT id FROM inspection_findings)');
        await p.query('DELETE FROM inspection_findings WHERE inspection_id NOT IN (SELECT id FROM inspections)');
        await p.query(`DELETE FROM finding_categories WHERE lower(btrim(name)) = 'higiene de manos'`);
        console.log('restos de una corrida anterior eliminados: ' + previas.length + ' inspección(es)\n');
    }

    // Foto del estado real antes de empezar.
    const base = {};
    for (const t of ['inspections', 'inspection_findings', 'corrections', 'inspection_status_history']) {
        base[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
    }
    // Inspectores que ya habia: se anotan para que la limpieza borre solo los que
    // cree esta corrida y no toque ninguno real.
    const inspectoresPreexistentes = (await p.query('SELECT id FROM inspectors')).rows.map(r => r.id);
    base.inspectors = inspectoresPreexistentes.length;

    console.log('estado inicial: ' + JSON.stringify(base));

    // Foto campo a campo del hallazgo historico #2.
    //
    // Se compara contra esta foto, no contra un valor escrito a mano. Antes se
    // comparaba contra un id de empleado fijo, y en cuanto ese empleado deja de
    // existir la comprobacion falla sin que haya pasado nada: ese "1" era de
    // cuando la tabla de empleados empezaba en 1, y ahora empieza en 2. Lo que
    // de verdad importa es que el registro siga igual que antes de empezar.
    //
    // La foto se usa tambien para restaurarlo al terminar: una prueba no puede
    // dejar la base distinta de como la encontro.
    const hallazgoHistorico = (await p.query(
        'SELECT id, title, category, status, assigned_to, due_date FROM inspection_findings WHERE id = 2'
    )).rows[0];
    const HALLAZGO_ANTES = hallazgoHistorico || null;

    // Un supervisor real para las pruebas.
    const emps = (await nodo('/employees')).data;
    const supervisor = emps.find(e => e.role === 'supervisor');
    const op = emps.find(e => e.role === 'op');
    ok(supervisor, 'hay un supervisor para probar (' + supervisor.name + ')');

    // ======================================================================
    console.log('\n=== 1. CATALOGOS ===');
    const tipos = (await nodo('/inspection-types')).data;
    ok(tipos.length >= 7, tipos.length + ' tipos de inspección en el catálogo');
    ok(tipos.every(x => x.usos >= 0), 'cada tipo indica sus usos');
    const cats = (await nodo('/finding-categories')).data;
    ok(cats.length >= 1, cats.length + ' categorías de hallazgo');
    const resp = (await nodo('/inspection-assignees')).data;
    ok(resp.length > 0, resp.length + ' personas en el combobox de responsables');
    ok(resp.filter(x => x.puede_atender).length > 0,
       resp.filter(x => x.puede_atender).length + ' pueden atender (supervisor/OPS/manager) van primero');
    ok(resp[0].puede_atender === true, 'el primero de la lista puede atender problemas');

    // ======================================================================
    console.log('\n=== 2. CREAR INSPECCION (1) ===');
    const insp = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({
            inspection_date: FECHAS.inicio,
            inspection_time: '14:30',
            inspector_name: 'Inspector De La Prueba',
            inspection_type: 'food_safety',
            location_id: 'pixie-kitchen',
            general_notes: 'Prueba automatica: el aceite no llega a temperatura.'
        })
    });
    eq(insp.status, 201, 'inspección creada');
    creado.inspecciones.push(insp.data.id);
    ok(insp.data.inspection_number, 'el ID lo generó el sistema: ' + insp.data.inspection_number);
    ok(/^INS-/.test(insp.data.inspection_number), 'el ID tiene el formato INS-...');
    ok(insp.data.id > 0, 'tiene id numérico de base de datos');
    eq(insp.data.location_id, 'pixie-kitchen', 'guarda la locación');
    // El inspector es una entidad propia: se escribe su nombre y la base le da
    // un id. No se toma de los empleados.
    ok(insp.data.inspector_id, 'la base genera un ID de inspector propio: ' + insp.data.inspector_id);
    ok(insp.data.inspector_id !== supervisor.id,
       'ese ID no es el de un empleado (empleado ' + supervisor.id + ', inspector ' + insp.data.inspector_id + ')');
    eq(insp.data.inspector_name, 'Inspector De La Prueba', 'guarda el nombre del inspector');
    eq(H(insp.data.inspection_time), '14:30', 'guarda la hora');
    eq(insp.data.general_notes, 'Prueba automatica: el aceite no llega a temperatura.', 'guarda las notas');

    console.log('\n=== 3. LA LOCACION APARECE EN EL PANEL ===');
    const panel = (await nodo('/inspections-by-location')).data;
    const pixie = panel.find(x => x.location_id === 'pixie-kitchen');
    ok(pixie, 'Pixie Kitchen está en el panel de locaciones');
    eq(pixie.inspection_id, insp.data.id, 'el panel apunta a la inspección recién creada');
    eq(pixie.inspection_number, insp.data.inspection_number, 'con su número');
    eq(pixie.inspection_date, FECHAS.inicio, 'con su fecha');
    // El hallazgo #2 (historico) tambien esta en pixie-kitchen: el total debe
    // incluirlo. Lo que se comprueba es que la recien creada se accounted.
    eq(pixie.inspecciones_total, 2, 'Pixie suma 2 inspecciones (la historica y la nueva)');
    // El panel lista las locaciones REALES: las mismas que ya habia, ni una mas.
    const locReales = (await p.query('SELECT count(*)::int n FROM locations')).rows[0].n;
    eq(panel.length, locReales, 'el panel lista las ' + locReales + ' locaciones reales, sin crear ninguna nueva');
    ok(panel.every(x => x.location_id), 'toda fila del panel trae el id de su locacion');
    const nunca = panel.filter(x => !x.inspection_id);
    ok(nunca.length > 0, 'las locaciones nunca inspeccionadas salen, pero sin inspección');

    console.log('\n=== 4. VALIDACIONES AL CREAR INSPECCION ===');
    const sinLoc = await nodo('/inspections', {
        method: 'POST', body: JSON.stringify({ inspection_date: FECHAS.inicio, inspection_type: 'food_safety' })
    });
    eq(sinLoc.status, 400, 'sin locación se rechaza');
    eq(sinLoc.data.error, 'location_required', '  con el motivo location_required');
    eq((await nodo('/inspections', { method: 'POST', body: JSON.stringify({ inspection_date: FECHAS.inicio, inspection_type: 'inventado' }) })).status, 400,
       'un tipo que no existe se rechaza');
    const rLoc = await nodo('/inspections', { method: 'POST', body: JSON.stringify({ inspection_date: FECHAS.inicio, inspection_type: 'general', location_id: 'no-existe' }) });
    eq(rLoc.status, 400, 'una locación que no existe se rechaza');
    eq(rLoc.data.error, 'location_not_found', '  con el motivo location_not_found');
    const rFalta = await nodo('/inspections', { method: 'POST', body: JSON.stringify({ inspection_type: 'general', location_id: 'pixie-kitchen' }) });
    eq(rFalta.data.error, 'inspection_date_required', 'sin fecha se rechaza con el motivo');
    // Inspector que no es empleado: se registra por su cuenta, con id propio.
    const rExt = await nodo('/inspections', {
        method: 'POST',
        body: JSON.stringify({ inspection_date: FECHAS.inicio, inspection_type: 'general',
                               location_id: 'food-fair', inspector_name: 'Auditor Externo' })
    });
    eq(rExt.status, 201, 'se puede inspeccionar con alguien que no es empleado');
    creado.inspecciones.push(rExt.data.id);
    ok(rExt.data.inspector_id, 'se le asigna un ID de inspector propio: ' + rExt.data.inspector_id);
    ok(rExt.data.inspector_id !== null && rExt.data.inspector_id !== undefined,
       'el ID de inspector no queda vacío');
    eq(rExt.data.inspector_name, 'Auditor Externo', 'guarda el nombre tal cual');

    console.log('\n=== 5. CREAR HALLAZGO DENTRO DE ESA INSPECCION (3) ===');
    const hall = await nodo(`/inspections/${insp.data.id}/findings`, {
        method: 'POST',
        body: JSON.stringify({
            title: 'Aceite por debajo de temperatura',
            description: 'Medido 140F, se requieren 160F',
            category: 'Food Safety',
            priority: 'high',
            status: 'warning',
            recommended_action: 'Calentar y volver a medir',
            assigned_to: supervisor.id,
            due_date: '2098-03-05',
            created_by: 1
        })
    });
    eq(hall.status, 201, 'hallazgo creado dentro de la inspección');
    creado.hallazgos.push(hall.data.id);
    ok(hall.data.id > 0, 'el ID lo generó la base de datos: #' + hall.data.id);
    eq(hall.data.inspection_id, insp.data.id, 'queda=colgado de la inspección');
    // La locacion se hereda de la inspeccion, sin que el usuario la escriba.
    eq(hall.data.location_id, 'pixie-kitchen', 'hereda la locación de la inspección');

    console.log('\n=== 4b. LA LOCACION DEL HALLAZGO NO SE PUEDE CAMBIAR (4) ===');
    const rMismatch = await nodo(`/inspections/${insp.data.id}/findings`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Prueba de incoherencia', location_id: 'world-pavilion' })
    });
    eq(rMismatch.status, 400, 'no se puede colgar un hallazgo de otra locación');
    eq(rMismatch.data.error, 'finding_location_mismatch', '  con el motivo finding_location_mismatch');
    eq((await nodo(`/inspections/999999/findings`, { method: 'POST', body: JSON.stringify({ title: 'x' }) })).status, 404,
       'un hallazgo en una inspección que no existe da 404');
    eq((await nodo(`/inspections/${insp.data.id}/findings`, { method: 'POST', body: JSON.stringify({}) })).data.error, 'title_required',
       'un hallazgo sin título se rechaza');

    console.log('\n=== 6. CATEGORIAS (6) ===');
    const catNueva = await nodo('/inspections/999999/findings', {
        method: 'POST', body: JSON.stringify({ title: 'x' })
    });
    eq(catNueva.status, 404, 'no se crea nada sobre una inspección inexistente');
    const hallCat = await nodo(`/inspections/${insp.data.id}/findings`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Categoria nueva de prueba', category: '  Higiene   de  manos ' })
    });
    eq(hallCat.status, 201, 'se acepta una categoría escrita a mano (normalizada)');
    creado.hallazgos.push(hallCat.data.id);
    eq(hallCat.data.category, 'Higiene de manos', 'guarda la categoría normalizada, sin espacios de sobra');
    const cats2 = (await nodo('/finding-categories')).data;
    ok(cats2.some(c => c.name.toLowerCase() === 'higiene de manos'), 'la categoría nueva aparece en el catálogo');

    // La misma categoría escrita de otra forma no debe duplicarse.
    const hallCat2 = await nodo(`/inspections/${insp.data.id}/findings`, {
        method: 'POST', body: JSON.stringify({ title: 'Misma categoria otra vez', category: 'higiene DE manos' })
    });
    eq(hallCat2.data.category, 'Higiene de manos', 'se normaliza a la existente, no crea otra');
    creado.hallazgos.push(hallCat2.data.id);
    const cats3 = (await nodo('/finding-categories')).data;
    eq(cats3.filter(c => c.name.toLowerCase() === 'higiene de manos').length, 1,
       'sigue habiendo UNA sola categoría "Higiene de manos"');

    console.log('\n=== 7. RESPONSABLE: EMPLEADO O EXTERNO (7-8) ===');
    const hallOp = await nodo(`/inspections/${insp.data.id}/findings`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Asignado a un supervisor', assigned_to: supervisor.id })
    });
    eq(hallOp.data.assigned_to, supervisor.id, 'si se elige un empleado se guarda su id');
    eq(hallOp.data.assigned_to_name, null, 'y no se inventa un nombre');
    creado.hallazgos.push(hallOp.data.id);

    const hallExt = await nodo(`/inspections/${insp.data.id}/findings`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Responsable externo', assigned_to_name: 'Empresa de limpieza externa' })
    });
    eq(hallExt.data.assigned_to, null, 'si se escribe un nombre externo el id queda vacío');
    eq(hallExt.data.assigned_to_name, 'Empresa de limpieza externa', 'y se guarda el nombre');
    creado.hallazgos.push(hallExt.data.id);
    const empleadosAntes = (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n;
    eq(empleadosAntes, emps.length, 'no se creó ningún empleado ficticio');

    console.log('\n=== 8. MODIFICAR HALLAZGO (9) ===');
    const upd = await nodo(`/findings/${hall.data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            title: 'Aceite por debajo de temperatura (corregido)',
            priority: 'critical',
            status: 'under_analysis',
            changed_by: 1            // quien hizo el cambio, como lo manda el formulario
        })
    });
    eq(upd.status, 200, 'hallazgo modificado');
    eq(upd.data.title, 'Aceite por debajo de temperatura (corregido)', 'el título nuevo está guardado');
    eq(upd.data.priority, 'critical', 'la prioridad nueva está guardada');
    eq(upd.data.status, 'under_analysis', 'el estado nuevo está guardado');
    eq(upd.data.inspection_id, insp.data.id, 'sigue en la misma inspección');
    const hist = (await nodo(`/findings/${hall.data.id}`)).data.history;
    ok(hist.length >= 1, 'el cambio de estado quedó en el historial (' + hist.length + ' entrada/s)');
    ok(hist[0].new_status === 'under_analysis', 'el historial guarda el estado nuevo');
    eq(hist[0].previous_status, 'warning', 'y el anterior');
    eq(hist[0].changed_by, 1, 'y quien lo hizo');

    console.log('\n=== 9. CORRECCIONES (11) ===');
    const corr = await nodo(`/findings/${hall.data.id}/corrections`, {
        method: 'POST',
        body: JSON.stringify({ description: 'Se calienta el aceite a 170F', status: 'corrected',
                               correction_date: '2098-03-06', assigned_to: supervisor.id,
                               completion_notes: 'Medido a 168F', created_by: 1 })
    });
    eq(corr.status, 201, 'corrección creada');
    creado.correcciones.push(corr.data.id);
    eq(corr.data.finding_id, hall.data.id, 'queda relacionada con el hallazgo (no lo duplica)');
    eq(corr.data.status, 'corrected', 'con su estado');
    eq(corr.data.completion_notes, 'Medido a 168F', 'con sus notas');

    const hallConCorr = (await nodo(`/findings/${hall.data.id}`)).data;
    eq(hallConCorr.corrections.length, 1, 'el hallazgo muestra 1 corrección');
    eq(hallConCorr.corrections[0].id, corr.data.id, 'que es la correcta');
    eq((await nodo(`/findings/${hall.data.id}`)).data.location_id, 'pixie-kitchen',
       'el hallazgo conserva su relación con la locación');
    eq((await nodo(`/findings/${hall.data.id}`)).data.inspection_id, insp.data.id,
       'y con la inspección');

    const updCorr = await nodo(`/corrections/${corr.data.id}`, {
        method: 'PUT', body: JSON.stringify({ status: 'audited', audit_notes: 'Revisado por auditoria' })
    });
    eq(updCorr.status, 200, 'corrección modificada');
    eq(updCorr.data.status, 'audited', 'el estado nuevo está guardado');
    eq(updCorr.data.audit_notes, 'Revisado por auditoria', 'las notas de auditoría se guardan');

    eq((await nodo('/findings/999999/corrections', { method: 'POST', body: JSON.stringify({ description: 'x' }) })).status, 404,
       'una corrección sobre un hallazgo inexistente da 404');
    eq((await nodo(`/findings/${hall.data.id}/corrections`, { method: 'POST', body: JSON.stringify({}) })).data.error, 'description_required',
       'una corrección sin descripción se rechaza');

    console.log('\n=== 10. ELIMINAR SIN PERDER HISTORICO (10-11) ===');
    const delCorr = await nodo('/corrections/' + corr.data.id, { method: 'DELETE', body: JSON.stringify({ deleted_by: 1 }) });
    eq(delCorr.status, 200, 'corrección retirada de la vista');
    ok(/conserva/.test(delCorr.data.message || ''), 'avisa de que el registro se conserva');
    const corrViva = (await p.query('SELECT count(*)::int n FROM corrections WHERE id = $1', [corr.data.id])).rows[0].n;
    eq(corrViva, 1, 'la fila sigue en la base de datos (borrado lógico)');
    const enVista = (await nodo('/corrections')).data.filter(c => c.id === corr.data.id);
    eq(enVista.length, 0, 'pero ya no aparece en el listado');
    eq((await nodo(`/findings/${hall.data.id}`)).data.corrections.length, 0, 'el hallazgo ya no cuenta esa corrección');

    const delHall = await nodo('/findings/' + hall.data.id, { method: 'DELETE', body: JSON.stringify({ deleted_by: 1 }) });
    eq(delHall.status, 200, 'hallazgo retirado de la vista');
    const hallVivo = (await p.query('SELECT count(*)::int n FROM inspection_findings WHERE id = $1', [hall.data.id])).rows[0].n;
    eq(hallVivo, 1, 'el hallazgo sigue en la base (nada se borra)');
    eq((await nodo('/findings')).data.filter(f => f.id === hall.data.id).length, 0, 'y ya no sale en el listado');
    // La inspeccion tiene 5 hallazgos en total (creados a lo largo de la
    // prueba); al retirar este deben quedar 4, no 0: los otros siguen vivos.
    const inspResto = (await nodo(`/inspections/${insp.data.id}`)).data;
    eq(inspResto.findings.length, 4, 'la inspección ya no lista el hallazgo retirado, pero los otros 4 siguen');
    ok(!inspResto.findings.some(f => f.id === hall.data.id), 'y el retirado no aparece');
    eq((await nodo(`/inspections/${insp.data.id}`)).status, 200, 'la inspección NO se perdió');
    const inspViva = (await p.query('SELECT count(*)::int n FROM inspections WHERE id = $1', [insp.data.id])).rows[0].n;
    eq(inspViva, 1, 'sigue en la base');
    // La eliminacion queda registrada. Se separa la del hallazgo de la de su
    // correccion (que se retiro antes): las dos comparten finding_id, asi que
    // se distinguen por correction_id.
    const audHall = (await p.query(
        `SELECT count(*)::int n FROM inspection_status_history
          WHERE finding_id = $1 AND new_status = 'deleted' AND correction_id IS NULL`,
        [hall.data.id])).rows[0].n;
    eq(audHall, 1, 'la eliminación del hallazgo quedó en el historial de auditoría');
    const audCorr = (await p.query(
        `SELECT count(*)::int n FROM inspection_status_history
          WHERE finding_id = $1 AND new_status = 'deleted' AND correction_id IS NOT NULL`,
        [hall.data.id])).rows[0].n;
    eq(audCorr, 1, 'y también la de su corrección, sin mezclarlas');
    const quien = (await p.query(
        'SELECT deleted_by FROM inspection_findings WHERE id = $1', [hall.data.id])).rows[0].deleted_by;
    eq(quien, 1, 'y se guardó quién lo retiró');

    console.log('\n=== 11. PDF (12-13) ===');
    const pdf = await fetch(BASE + '/inspections-audit.pdf?date_from=' + FECHAS.inicio + '&date_to=' + FECHAS.fin);
    const buf = Buffer.from(await pdf.arrayBuffer());
    eq(pdf.status, 200, 'el PDF se genera');
    eq(pdf.headers.get('content-type'), 'application/pdf', 'con el tipo de archivo correcto');
    ok(/attachment/.test(pdf.headers.get('content-disposition') || ''), 'se descarga como archivo');
    ok(buf.slice(0, 5).toString() === '%PDF-', 'empieza con la firma de PDF');
    ok(buf.length > 1000, 'tiene contenido (' + Math.round(buf.length / 1024) + ' KB)');
    const paginas = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok(paginas >= 1, 'tiene ' + paginas + ' página(s)');
    // Con filtro que no coincide: sale vacio pero sigue siendo un PDF valido.
    const pdfVacio = await fetch(BASE + '/inspections-audit.pdf?date_from=2097-01-01&date_to=2097-01-02');
    const bufV = Buffer.from(await pdfVacio.arrayBuffer());
    eq(pdfVacio.status, 200, 'con un filtro sin resultados tambien responde');
    ok(bufV.slice(0, 5).toString() === '%PDF-', 'y es un PDF valido');
    ok(bufV.length < buf.length, 'mas pequeño: no incluye las inspecciones del filtro');

    console.log('\n=== 12. LOS REGISTROS ANTERIORES SIGUEN INTACTOS (14) ===');
    const insp2 = (await nodo('/inspections/2')).data;
    ok(insp2, 'la inspección histórica #2 sigue existiendo');
    eq(insp2.inspection_number, 'INS-TEST-001', 'con su número original');
    eq(insp2.location_id, 'pixie-kitchen', 'y su locación se derivó del hallazgo que tenía');
    const hallAntiguo = (await nodo('/findings')).data.find(f => f.id === 2);
    ok(hallAntiguo, 'el hallazgo histórico sigue en el listado');
    if (HALLAZGO_ANTES && hallAntiguo) {
        eq(hallAntiguo.title, HALLAZGO_ANTES.title, 'con su título original');
        eq(hallAntiguo.category, HALLAZGO_ANTES.category, 'con su categoría original');
        eq(hallAntiguo.status, HALLAZGO_ANTES.status, 'con su estado original');
        eq(hallAntiguo.assigned_to, HALLAZGO_ANTES.assigned_to,
            'y su assigned_to sigue en ' + HALLAZGO_ANTES.assigned_to + ', sin tocar');
    }
    const histAntigua = (await p.query('SELECT count(*)::int n FROM inspection_status_history')).rows[0].n;
    ok(histAntigua >= 1, 'el historial antiguo sigue (' + histAntigua + ' entradas)');
    const catAntigua = (await p.query(
        "SELECT count(*)::int n FROM finding_categories WHERE name = 'Food Safety'")).rows[0].n;
    eq(catAntigua, 1, 'su categoría sigue en el catálogo');

    // ======================================================================
    console.log('\n=== 13. LIMPIEZA ===');
    // Se retira lo creado, con borrado logico: la base queda como estaba.
    for (const id of creado.correcciones) await nodo('/corrections/' + id, { method: 'DELETE', body: JSON.stringify({ deleted_by: 1 }) });
    for (const id of creado.hallazgos) await nodo('/findings/' + id, { method: 'DELETE', body: JSON.stringify({ deleted_by: 1 }) });
    for (const id of creado.inspecciones) {
        await nodo('/inspections/' + id, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) });
    }
    await p.query('DELETE FROM inspections WHERE id = ANY($1::int[])', [creado.inspecciones]);
    await p.query('DELETE FROM inspection_findings WHERE id = ANY($1::int[])', [creado.hallazgos]);
    await p.query('DELETE FROM corrections WHERE id = ANY($1::int[])', [creado.correcciones]);
    await p.query('DELETE FROM inspection_status_history WHERE inspection_id = ANY($1::int[])', [creado.inspecciones]);
    await p.query('DELETE FROM inspection_status_history WHERE finding_id = ANY($1::int[]) AND finding_id NOT IN (SELECT id FROM inspection_findings)', [creado.hallazgos]);
    await p.query("DELETE FROM finding_categories WHERE lower(btrim(name)) IN ('higiene de manos')");

    // El hallazgo historico #2 se devuelve tal y como estaba. Algunas pruebas
    // lo tocan (cambian su responsable o su estado) para comprobar que la API
    // responde, y sin restaurarlo aqui la base se queda cambiada para siempre.
    // Solo se restauran los campos que se hayan podido alterar.
    if (HALLAZGO_ANTES) {
        const cambiado = await p.query(
            `SELECT count(*)::int n FROM inspection_findings
              WHERE id = 2 AND (
                    title IS DISTINCT FROM $1 OR category IS DISTINCT FROM $2
                 OR status IS DISTINCT FROM $3 OR assigned_to IS DISTINCT FROM $4
                 OR due_date IS DISTINCT FROM $5)`,
            [HALLAZGO_ANTES.title, HALLAZGO_ANTES.category, HALLAZGO_ANTES.status,
                HALLAZGO_ANTES.assigned_to, HALLAZGO_ANTES.due_date]);
        if (cambiado.rows[0].n > 0) {
            await p.query(
                `UPDATE inspection_findings
                    SET title = $1, category = $2, status = $3, assigned_to = $4, due_date = $5
                  WHERE id = 2`,
                [HALLAZGO_ANTES.title, HALLAZGO_ANTES.category, HALLAZGO_ANTES.status,
                    HALLAZGO_ANTES.assigned_to, HALLAZGO_ANTES.due_date]);
            console.log('hallazgo historico #2 restaurado a su estado original');
        }
    }

    // Los inspectores que creo esta corrida. Los que ya habia no se tocan: son
    // parte del estado real y el test no es dueño de ellos.
    const inspectoresNuevos = (await p.query(
        'SELECT id FROM inspectors WHERE NOT (id = ANY($1::int[]))', [inspectoresPreexistentes])).rows.map(r => r.id);
    if (inspectoresNuevos.length) {
        await p.query('DELETE FROM inspectors WHERE id = ANY($1::int[])', [inspectoresNuevos]);
    }

    const fin = {};
    for (const t of ['inspections', 'inspection_findings', 'corrections', 'inspection_status_history']) {
        fin[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
    }
    fin.inspectors = (await p.query('SELECT count(*)::int n FROM inspectors')).rows[0].n;
    console.log('estado inicial: ' + JSON.stringify(base));
    console.log('estado final:   ' + JSON.stringify(fin));
    let iguales = 0;
    for (const k of Object.keys(base)) if (base[k] === fin[k]) iguales++;
    eq(iguales, Object.keys(base).length, 'todas las tablas volvieron a su numero original');

    console.log('\n' + '='.repeat(66));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(66));
    await p.end();
    process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR:', e); process.exitCode = 1; });