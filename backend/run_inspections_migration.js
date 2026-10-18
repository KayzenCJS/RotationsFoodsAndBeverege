// Aplica database/inspections_improvements.sql en foods.
// Es idempotente: se puede ejecutar mas de una vez.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const SQL = path.join(__dirname, '..', 'database', 'inspections_improvements.sql');

(async () => {
  const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
  });

  // Foto antes de aplicar, para poder comparar al final.
  const foto = async () => {
    const o = {};
    for (const t of ['inspections', 'inspection_findings', 'corrections',
                     'inspection_status_history', 'inspection_evidence']) {
      o[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
    }
    return o;
  };
  const antes = await foto();
  console.log('ANTES: ' + JSON.stringify(antes));

  try {
    await p.query(fs.readFileSync(SQL, 'utf8'));
    console.log('\nmigracion aplicada');
  } catch (e) {
    console.error('\nERROR: ' + e.message);
    await p.end();
    process.exit(1);
  }

  const despues = await foto();
  console.log('DESPUES: ' + JSON.stringify(despues));

  let problemas = 0;
  for (const t of Object.keys(antes)) {
    if (antes[t] !== despues[t]) {
      console.log('  PERDIDA en ' + t + ': ' + antes[t] + ' -> ' + despues[t]);
      problemas++;
    }
  }
  if (!problemas) console.log('\nok   ninguna tabla perdio filas');

  // Detalle de lo nuevo
  console.log('\n=== inspecciones con locacion ===');
  (await p.query(
    `SELECT i.id, i.inspection_number, i.inspection_date::text, i.inspection_type,
            i.location_id, l.name AS locacion
       FROM inspections i LEFT JOIN locations l ON l.id = i.location_id
      ORDER BY i.id`)).rows.forEach(r => console.log('  ' + JSON.stringify(r)));

  console.log('\n=== catalogos ===');
  console.log('  tipos: ' + (await p.query(
    'SELECT count(*)::int n FROM inspection_types WHERE is_active')).rows[0].n);
  (await p.query('SELECT name, type_key FROM finding_categories ORDER BY name')).rows
    .forEach(c => console.log('  categoria: ' + c.name + (c.type_key ? '  (solo ' + c.type_key + ')' : '  (todos los tipos)')));

  console.log('\n=== columnas nuevas ===');
  for (const [t, c] of [['inspections','location_id'],
                        ['inspections','inspector_name'],
                        ['inspection_findings','assigned_to_name'],
                        ['inspection_findings','deleted_at'],
                        ['inspection_findings','deleted_by'],
                        ['inspection_findings','corrections'],
                        ['inspection_findings','correction_history_ids'],
                        ['corrections','assigned_to_name'],
                        ['corrections','deleted_at'],
                        ['corrections','deleted_by']]) {
    const e = (await p.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [t, c])).rows.length;
    console.log('  ' + (e ? 'ok  ' : 'FALTA') + ' ' + t + '.' + c);
  }

  await p.end();
})().catch(e => { console.error(e); process.exit(1); });