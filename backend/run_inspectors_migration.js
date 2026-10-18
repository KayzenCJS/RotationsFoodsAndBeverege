// Aplica database/inspectors_entity.sql y comprueba, antes y despues, que no se
// ha perdido ni modificado ninguna inspeccion.
//
// Lo importante del este script es la comparacion "antes/despues": si una fila
// cambia, se ve exactamente cual y como.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SQL = path.join(__dirname, '..', 'database', 'inspectors_entity.sql');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

// Instantanea completa de inspections, campo por campo. Es lo que permite
// afirmar que nada cambio.
const foto = async () => (await p.query(
    `SELECT id, inspection_number, inspection_date::text, inspection_time::text,
            inspector_id, inspector_name, inspection_type, location_id,
            general_notes, status
       FROM inspections ORDER BY id`)).rows;

(async () => {
    console.log('=== estado antes ===');
    const antes = await foto();
    console.log('  inspecciones: ' + antes.length);
    antes.forEach(r => console.log('    ' + JSON.stringify(r)));

    try {
        await p.query(fs.readFileSync(SQL, 'utf8'));
        console.log('\nmigracion aplicada');
    } catch (e) {
        console.error('\nERROR: ' + e.message);
        await p.end();
        process.exit(1);
    }

    console.log('\n=== estado despues ===');
    const despues = await foto();
    console.log('  inspecciones: ' + despues.length);

    // Comparacion campo a campo.
    let cambios = 0;
    if (antes.length !== despues.length) {
        console.log('\n  ALERTA: cambio el numero de filas (' + antes.length + ' -> ' + despues.length + ')');
        cambios++;
    }
    for (const a of antes) {
        const b = despues.find(x => x.id === a.id);
        if (!b) { console.log('\n  ALERTA: la inspeccion ' + a.id + ' desaparecio'); cambios++; continue; }
        for (const k of Object.keys(a)) {
            const av = a[k] === null ? null : String(a[k]);
            const bv = b[k] === null ? null : String(b[k]);
            if (av !== bv) {
                console.log('\n  ALERTA: inspeccion ' + a.id + ' campo ' + k + ': ' + av + ' -> ' + bv);
                cambios++;
            }
        }
    }
    console.log(cambios
        ? '\n  HAY CAMBIOS en las inspecciones existentes'
        : '\n  ok   ninguna inspeccion cambio: mismo numero y mismos valores en todos los campos');

    console.log('\n=== inspectores ===');
    (await p.query(
        `SELECT x.id, x.name, x.is_active,
                (SELECT count(*)::int FROM inspections i WHERE i.inspector_id = x.id) AS usos
           FROM inspectors x ORDER BY x.id`)).rows
        .forEach(r => console.log('  ' + JSON.stringify(r)));

    const serie = (await p.query(
        `SELECT last_value, is_called FROM inspectors_id_seq`)).rows[0];
    console.log('\n  serie de ids: last_value=' + serie.last_value + ' is_called=' + serie.is_called);

    const historicos = (await p.query(
        `SELECT count(*)::int n FROM inspections i
          WHERE i.inspector_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM inspectors x WHERE x.id = i.inspector_id)`)).rows[0].n;
    console.log('  inspecciones con id de la epoca de los empleados (conservadas): ' + historicos);

    console.log('\n=== proximo id de inspector ===');
    const maximo = Math.max(...antes.map(a => a.inspector_id || 0), 0);
    const sig = (await p.query(`SELECT nextval('inspectors_id_seq') AS n`)).rows[0].n;
    console.log('  ' + sig + '   maximo historico: ' + maximo);
    if (sig > maximo) console.log('  ok   no puede colisionar con ningun id historico');
    else { console.log('  ALERTA: podria colisionar'); cambios++; }

    // La prueba anterior consumio un id. Se devuelve para no dejar la serie
    // saltada, dejandola justo en el valor anterior.
    await p.query(`SELECT setval('inspectors_id_seq', $1, false)`, [sig]);

    await p.end();
    process.exitCode = cambios ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
