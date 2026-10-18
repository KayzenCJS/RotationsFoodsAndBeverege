// Aplica database/excel_import_tables.sql a ambas bases de datos.
// Herramienta de mantenimiento: es idempotente, se puede ejecutar varias veces.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const sql = fs.readFileSync(
  path.join(__dirname, '..', 'database', 'excel_import_tables.sql'), 'utf8'
);

const targets = [
  ['foods', process.env.FOODS_DB_NAME || 'storyland_foods'],
  ['retail', process.env.RETAIL_DB_NAME || 'storyland_retail']
];

(async () => {
  let failed = false;

  for (const [label, dbName] of targets) {
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      connectionTimeoutMillis: 5000
    });
    try {
      await pool.query(sql);
      console.log('OK  ' + label + ' (' + dbName + ')');

      // Verificación
      const cols = await pool.query(`
        SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema='public'
          AND (table_name IN ('work_hours','import_history')
               OR (table_name='employees' AND column_name IN ('external_id','badge_number','email'))
               OR (table_name='assignments' AND column_name IN ('source','external_id')))
        ORDER BY table_name, column_name`);
      console.log('    ' + cols.rows.map(r => r.table_name + '.' + r.column_name).join(', '));
      await pool.end();
    } catch (e) {
      failed = true;
      console.error('ERR ' + label + ': ' + e.message);
      try { await pool.end(); } catch (_) {}
    }
  }
  process.exit(failed ? 1 : 0);
})();