// Aplica database/schedule_categories.sql a foods y retail, y verifica que
// ningún dato existente se modifica. Idempotente: se puede repetir.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const SQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'schedule_categories.sql'), 'utf8');

function splitStatements(sql) {
  // Separa por ";" al final de linea, respetando los bloques $$ ... $$
  const out = [];
  let buf = '';
  let inDollar = false;
  for (const line of sql.split('\n')) {
    if (line.includes('$$')) inDollar = !inDollar;
    buf += line + '\n';
    if (!inDollar && line.trim().endsWith(';')) { out.push(buf.trim()); buf = ''; }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter((s) => s && !/^--/.test(s.replace(/--.*$/gm, '').trim()));
}

async function snapshot(pool) {
  const a = await pool.query(
    `SELECT id, location_id, employee_id, work_date::text d, start_time::text st,
            end_time::text en, source, external_id
       FROM assignments ORDER BY id`);
  const e = await pool.query('SELECT id, name, nationality, age, role, group_id FROM employees ORDER BY id');
  const l = await pool.query('SELECT id, name, type, category FROM locations ORDER BY id');
  const s = await pool.query('SELECT id, supervisor_id, location_id, assigned_date::text d, role FROM supervisor_assignments ORDER BY id');
  const t = await pool.query('SELECT id, title, assigned_to, due_date::text d, status FROM tasks ORDER BY id');
  return {
    assignments: a.rows, employees: e.rows, locations: l.rows,
    supervisors: s.rows, tasks: t.rows
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const stmts = splitStatements(SQL);
  console.log('sentencias a ejecutar: ' + stmts.length);

  for (const [name, pool] of [['foods', db.foods], ['retail', db.retail]]) {
    console.log('\n================ ' + name + ' ================');
    const before = await snapshot(pool);
    console.log('  antes -> assignments=' + before.assignments.length +
      ' employees=' + before.employees.length +
      ' locations=' + before.locations.length +
      ' supervisor_assignments=' + before.supervisors.length +
      ' tasks=' + before.tasks.length);

    for (const s of stmts) {
      try { await pool.query(s); }
      catch (e) {
        console.error('  ERROR en: ' + s.slice(0, 90).replace(/\s+/g, ' ') + '\n    ' + e.message);
        throw e;
      }
    }
    console.log('  migración aplicada');

    const after = await snapshot(pool);
    const checks = [
      ['assignments', before.assignments, after.assignments],
      ['employees', before.employees, after.employees],
      ['supervisor_assignments', before.supervisors, after.supervisors],
      ['tasks', before.tasks, after.tasks]
    ];
    let okAll = true;
    checks.forEach(([label, b, a]) => {
      const equal = same(b, a);
      if (!equal) okAll = false;
      console.log('  ' + (equal ? 'INTACTO ' : 'MODIFICADO!') + ' ' + label + ' (' + b.length + ' filas)');
    });
    const newLocs = after.locations.filter((x) => !before.locations.some((y) => y.id === x.id));
    console.log('  locations: ' + before.locations.length + ' -> ' + after.locations.length +
      '  (añadidas: ' + (newLocs.map((x) => x.id).join(', ') || 'ninguna') + ')');

    const cats = await pool.query('SELECT section, count(*)::int n FROM schedule_categories GROUP BY section ORDER BY section');
    console.log('  schedule_categories: ' + cats.rows.map((r) => r.section + '=' + r.n).join('  '));
    const n = await pool.query('SELECT count(*)::int n FROM schedule_notes');
    console.log('  schedule_notes: ' + n.rows[0].n + ' filas');

    const cls = await pool.query(
      `SELECT assignment_type, count(*)::int n,
              count(*) FILTER (WHERE category IS NULL)::int sin_categoria,
              count(*) FILTER (WHERE location_id IS NULL)::int sin_location
         FROM assignments GROUP BY assignment_type ORDER BY assignment_type`);
    console.log('  clasificación: ' + JSON.stringify(cls.rows));
    const ops = await pool.query('SELECT count(*)::int n FROM employees WHERE ops_group IS NOT NULL');
    console.log('  empleados con ops_group: ' + ops.rows[0].n);

    if (!okAll) { console.error('  !! ALGUNA TABLA EXISTENTE CAMBIÓ'); process.exit(1); }
  }
  console.log('\nMigración aplicada sin modificar datos existentes.');
  await db.foods.end(); await db.retail.end();
})().catch((e) => { console.error(e); process.exit(1); });