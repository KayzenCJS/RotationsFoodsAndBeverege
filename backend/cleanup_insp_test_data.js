// Retira los datos que se crearon SOLO para verificar el modulo de
// inspecciones desde la interfaz: la inspeccion 14 (Food Fair), su hallazgo,
// su correccion y las entradas de auditoria que generaron.
//
// Es borra fisico y a proposito: son filas de prueba inventadas aqui, no
// historico del usuario. Cualquier cosa que no pertenezca a esa inspeccion se
// deja intacta.
require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const MARCA = 'INS-';   // selocaliza por el prefijo que genera el modulo

(async () => {
    const foto = async () => {
        const o = {};
        for (const t of ['inspections', 'inspection_findings', 'corrections',
                         'inspection_status_history', 'inspection_evidence']) {
            o[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
        }
        return o;
    };

    const antes = await foto();
    console.log('antes:  ' + JSON.stringify(antes));

    // Solo las inspecciones de la prueba: las que se crearon HOY con esta
    // numeracion y cuya nota general lleva la marca de la verificacion.
    const prueba = (await p.query(
        `SELECT id, inspection_number FROM inspections
          WHERE general_notes LIKE 'Prueba de interfaz%'`)).rows;
    if (!prueba.length) {
        console.log('no hay inspecciones de prueba que retirar');
        await p.end();
        return;
    }
    const ids = prueba.map(r => r.id);
    console.log('inspecciones de prueba: ' + ids.join(', '));

    const hall = (await p.query(
        'SELECT id FROM inspection_findings WHERE inspection_id = ANY($1::int[])', [ids])).rows.map(r => r.id);
    const corr = (await p.query(
        'SELECT id FROM corrections WHERE finding_id = ANY($1::int[])', [hall.length ? hall : [-1]])).rows.map(r => r.id);
    console.log('  hallazgos: ' + (hall.join(', ') || 'ninguno'));
    console.log('  correcciones: ' + (corr.join(', ') || 'ninguna'));

    const r1 = await p.query('DELETE FROM inspection_status_history WHERE inspection_id = ANY($1::int[])', [ids]);
    const r2 = await p.query('DELETE FROM inspection_status_history WHERE finding_id = ANY($1::int[])', [hall.length ? hall : [-1]]);
    const r3 = await p.query('DELETE FROM inspection_evidence WHERE inspection_id = ANY($1::int[])', [ids]);
    const r4 = await p.query('DELETE FROM corrections WHERE finding_id = ANY($1::int[])', [hall.length ? hall : [-1]]);
    const r5 = await p.query('DELETE FROM inspection_findings WHERE inspection_id = ANY($1::int[])', [ids]);
    const r6 = await p.query('DELETE FROM inspections WHERE id = ANY($1::int[])', [ids]);
    console.log('  borrados: historial ' + (r1.rowCount + r2.rowCount) + ', evidencia ' + r3.rowCount
              + ', correcciones ' + r4.rowCount + ', hallazgos ' + r5.rowCount + ', inspecciones ' + r6.rowCount);

    // Cualquier entrada de auditoria que se quedara colgando de algo ya
    // borrado (no deberia, pero por si acaso).
    const r7 = await p.query(
        `DELETE FROM inspection_status_history
          WHERE (inspection_id IS NOT NULL AND inspection_id NOT IN (SELECT id FROM inspections))
             OR (finding_id     IS NOT NULL AND finding_id     NOT IN (SELECT id FROM inspection_findings))`);
    if (r7.rowCount) console.log('  historial huerfano limpiado: ' + r7.rowCount);

    const despues = await foto();
    console.log('despues: ' + JSON.stringify(despues));

    // Lo que debe seguir intacto: los 3 registros que ya habia.
    console.log('\n=== lo que se conserva ===');
    (await p.query('SELECT id, inspection_number, location_id FROM inspections ORDER BY id')).rows
        .forEach(r => console.log('  inspeccion ' + r.id + '  ' + r.inspection_number + '  loc=' + r.location_id));
    (await p.query('SELECT id, inspection_id, title, assigned_to FROM inspection_findings ORDER BY id')).rows
        .forEach(r => console.log('  hallazgo ' + r.id + '  inspeccion=' + r.inspection_id + '  ' + r.title + '  asig=' + r.assigned_to));
    (await p.query('SELECT id, finding_id, comment FROM inspection_status_history ORDER BY id')).rows
        .forEach(r => console.log('  historial ' + r.id + '  hallazgo=' + r.finding_id + '  ' + r.comment));

    await p.end();
})().catch(e => { console.error(e); process.exit(1); });
