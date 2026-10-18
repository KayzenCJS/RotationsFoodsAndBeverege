// Ver el CHECK de schedule_categories y ampliarlo con NOSTALGIA_NIGHT.
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  host: process.env.DB_HOST, port: +process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.FOODS_DB_NAME
});

(async () => {
  const antes = (await p.query(
    `SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint
      WHERE conrelid = 'schedule_categories'::regclass AND contype = 'c'`
  )).rows;
  console.log('=== CHECK actuales de schedule_categories ===');
  antes.forEach(c => console.log('  ' + c.conname + '\n      ' + c.def));

  const SECCIONES = ['OPS', 'EXTRA_HOURS', 'SUPPORT', 'EXTRA_TASK', 'NOSTALGIA_NIGHT'];
  const expr = 'section = ANY (ARRAY[' + SECCIONES.map(s => `'${s}'::character varying`).join(', ') + '])';

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    // Recrea el CHECK con la sección nueva dentro. Se hace dentro de una
    // transacción: si algo falla, la tabla se queda como estaba.
    const existe = (await client.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'schedule_categories_section_chk'`)).rows.length;
    if (existe) {
      await client.query('ALTER TABLE schedule_categories DROP CONSTRAINT schedule_categories_section_chk');
      console.log('\nreemplazado schedule_categories_section_chk');
    }
    await client.query(
      `ALTER TABLE schedule_categories ADD CONSTRAINT schedule_categories_section_chk CHECK (${expr})`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\nERROR, revertido: ' + e.message);
    await client.end(); await p.end();
    process.exit(1);
  }

  const despues = (await client.query(
    `SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint
      WHERE conrelid = 'schedule_categories'::regclass AND contype = 'c'`
  )).rows;
  console.log('\n=== verificado en la base de datos ===');
  despues.forEach(c => console.log('  ' + c.conname + '\n      ' + c.def));

  const probar = async (sql, debe) => {
    let r;
    try { await client.query('BEGIN'); await client.query(sql); r = true; }
    catch (e) { r = false; }
    await client.query('ROLLBACK');
    return r === debe ? 'ok  ' : 'MAL ';
  };
  console.log('\n=== prueba del dominio ===');
  for (const s of SECCIONES) {
    console.log('  ' + await probar(
      `UPDATE schedule_categories SET section='${s}' WHERE key='setup'`, true) +
      `section='${s}'`);
  }
  console.log('  ' + await probar(
    `UPDATE schedule_categories SET section='INVENTADA' WHERE key='setup'`, false) +
    `section='INVENTADA' -> debe rechazar`);

  await client.end(); await p.end();
})().catch(e => { console.error(e); process.exit(1); });