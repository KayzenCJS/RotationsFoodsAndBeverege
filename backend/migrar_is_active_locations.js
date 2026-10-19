// Agrega locations.is_active, la columna con la que se marca una localizacion
// como retirada.
//
// Es una operacion ADITIVA y segura:
//   - no borra nada
//   - no toca filas existentes: las que ya estan pasan a true, que es lo mismo
//     que decir "activa", o sea lo que ya eran
//   - se puede volver a ejecutar sin efecto (IF NOT EXISTS)
//
// Se ejecuta antes que retirar_localizacion.js, que es quien la usa.
require('dotenv').config();
const { Pool } = require('pg');
const retiradas = require('./locations-retiradas');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

(async () => {
    console.log('=== AGREGAR locations.is_active ===\n');

    const yaExiste = (await p.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='is_active'")).rows.length;

    if (yaExiste) {
        console.log('  la columna ya existe, no se hace nada');
    } else {
        await p.query(retiradas.AGREGAR_COLUMNA);
        console.log('  ok   columna creada con DEFAULT true');
        console.log('       todas las localizaciones existentes quedan activas:');
        console.log('       antes no habia distincion, y ahora "sin marcar" significa activo.');
    }

    // Indice parcial: solo las activas se consultan en casi todas las consultas,
    // asi que el indice es pequeno y no crece con las retiradas.
    await p.query(
        'CREATE INDEX IF NOT EXISTS locations_activas_idx ON locations (id) WHERE is_active IS TRUE');
    console.log('  ok   indice parcial sobre las activas (locations_activas_idx)');

    const t = (await p.query(
        'SELECT count(*) FILTER (WHERE is_active IS TRUE)::int activas, count(*)::int total FROM locations')).rows[0];
    console.log('\n  localizaciones: ' + t.activas + ' activas de ' + t.total);

    const nuevas = (await p.query(
        'SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name=\'locations\' ORDER BY ordinal_position')).rows;
    console.log('\n  columnas de locations ahora:');
    nuevas.forEach(c => console.log('    ' + c.column_name.padEnd(20) + c.data_type
        + (c.column_default ? '  default=' + c.column_default : '')));

    await p.end();
})().catch(async e => {
    console.error('ERROR:', e);
    try { await p.end(); } catch (x) { }
    process.exit(1);
});
