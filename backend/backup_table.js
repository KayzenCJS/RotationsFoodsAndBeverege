// Respaldo de UNA tabla con SQL VALIDO.
// Los backups programados del servidor salen vacios (0 KB), asi que antes de
// cualquier cambio que borre datos hay que tener copia. Este volcado se puede
// ejecutar tal cual en psql.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const TABLE = process.argv[2] || 'employee_trainings';

const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) {
    // pg devuelve las fechas en UTC; se guarda en UTC (timestamp sin tz).
    return "'" + v.toISOString().replace('T', ' ').slice(0, 19) + "'";
  }
  return "'" + String(v).replace(/'/g, "''") + "'";
};

(async () => {
  const out = [
    '-- Respaldo de ' + TABLE + ' previo a cambios de capacitaciones',
    '-- ' + new Date().toISOString(),
    '-- Para restaurar: psql -d storyland_foods -f <este archivo>',
    '', 'BEGIN;', 'SET client_encoding = \'UTF8\';', ''
  ];
  let total = 0;
  for (const [name, pool] of [['foods', db.foods], ['retail', db.retail]]) {
    let r;
    try { r = await pool.query('SELECT * FROM ' + TABLE); }
    catch (e) { out.push('-- ' + name + '.' + TABLE + ': no existe'); continue; }
    if (!r.rows.length) { out.push('-- ' + name + '.' + TABLE + ': vacia'); continue; }

    const cols = Object.keys(r.rows[0]);
    out.push('-- ' + name + '.' + TABLE + ': ' + r.rows.length + ' filas');
    // COPY es mas rapido y valido de verdad.
    out.push('COPY ' + TABLE + ' (' + cols.join(', ') + ') FROM stdin;');
    r.rows.forEach((row) => {
      out.push(cols.map((c) => row[c] === null || row[c] === undefined
        ? '\\N'
        : (row[c] instanceof Date
            ? row[c].toISOString().replace('T', ' ').slice(0, 19)
            : String(row[c]).replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n'))).join('\t'));
    });
    out.push('\\.');
    out.push('');
    total += r.rows.length;
    console.log(name + '.' + TABLE + ': ' + r.rows.length + ' filas');
  }
  out.push('COMMIT;');

  const dir = path.join(__dirname, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, TABLE + '_' + new Date().toISOString().slice(0, 10) + '.sql');
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log('\ntotal: ' + total + ' filas');
  console.log('respaldo: ' + file + '  (' + Math.round(fs.statSync(file).size / 1024) + ' KB)');
  console.log('formato: COPY ... FROM stdin (ejecutable con psql)');
  await db.foods.end(); await db.retail.end();
})();