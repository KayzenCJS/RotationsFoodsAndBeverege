// Retira inspectores huerfanos que dejaron corridas antiguas del test. Solo los
// que no los usa ninguna inspeccion y cuyo nombre lleva una marca reconocible
// de prueba. Un inspector real nunca se toca.
require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

// Nombres que solo usan las pruebas de este repositorio.
const MARCAS = [
    'auditor externo',
    'inspectora prueba externa',
    'inspector de la prueba',
    'inspector con id falso',
    'otro inspector distinto',
    'maria fernanda lopez'
];

(async () => {
    const huerfanos = (await p.query(
        `SELECT id, name FROM inspectors x
          WHERE NOT EXISTS (SELECT 1 FROM inspections i WHERE i.inspector_id = x.id)
            AND lower(name) = ANY($1::text[])`, [MARCAS])).rows;

    if (!huerfanos.length) console.log('  no hay inspectores de prueba huerfanos');
    for (const x of huerfanos) {
        console.log('  retirando #' + x.id + ' ' + x.name);
        await p.query('DELETE FROM inspectors WHERE id = $1', [x.id]);
    }

    console.log('\ninspectores que quedan: ' + (await p.query('SELECT count(*)::int n FROM inspectors')).rows[0].n);
    (await p.query('SELECT id, name, is_active FROM inspectors ORDER BY id')).rows
        .forEach(r => console.log('  ' + JSON.stringify(r)));

    await p.end();
})().catch(e => { console.error(e); process.exit(1); });
