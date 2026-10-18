// Aplica database/employee_training_groups.sql a foods y retail y verifica
// que ningun dato existente cambia. Idempotente.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const SQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'employee_training_groups.sql'), 'utf8');

function splitStatements(sql) {
  const out = []; let buf = ''; let inD = false;
  for (const line of sql.split('\n')) {
    if (line.includes('$$')) inD = !inD;
    buf += line + '\n';
    if (!inD && line.trim().endsWith(';')) { out.push(buf.trim()); buf = ''; }
  }
  return out.filter((s) => s && !/^--/.test(s.replace(/--.*$/gm, '').trim()));
}

const snap = async (p) => JSON.stringify({
  a: (await p.query('SELECT id,location_id,employee_id,work_date::text d,start_time::text st,end_time::text en,source FROM assignments ORDER BY id')).rows,
  e: (await p.query('SELECT id,name,nationality,age,role,group_id,is_versatile FROM employees ORDER BY id')).rows,
  l: (await p.query('SELECT id,name,type,category FROM locations ORDER BY id')).rows,
  t: (await p.query('SELECT id,employee_id,training_name FROM employee_trainings ORDER BY id')).rows,
  s: (await p.query('SELECT id,supervisor_id,location_id,assigned_date::text d,role FROM supervisor_assignments ORDER BY id')).rows
});

(async () => {
  const stmts = splitStatements(SQL);
  console.log('sentencias: ' + stmts.length);
  for (const [name, pool] of [['foods', db.foods], ['retail', db.retail]]) {
    console.log('\n==== ' + name + ' ====');
    const before = await snap(pool);
    for (const s of stmts) {
      try { await pool.query(s); }
      catch (e) { console.error('ERROR: ' + s.slice(0,80).replace(/\s+/g,' ') + '\n  ' + e.message); throw e; }
    }
    const after = await snap(pool);
    const b = JSON.parse(before), a = JSON.parse(after);
    // locations: solo se permiten las nuevas
    const nuevasL = a.l.filter(x => !b.l.some(y => y.id === x.id));
    const lIguales = JSON.stringify(a.l.filter(x => nuevasL.every(n => n.id !== x.id))) === JSON.stringify(b.l);
    const eIguales = JSON.stringify(a.e) === JSON.stringify(b.e);
    const tIguales = JSON.stringify(a.t) === JSON.stringify(b.t);
    const aIguales = JSON.stringify(a.a) === JSON.stringify(b.a);
    const sIguales = JSON.stringify(a.s) === JSON.stringify(b.s);
    console.log('  employees          ' + (eIguales ? 'INTACTOS (' + b.e.length + ')' : 'MODIFICADOS!'));
    console.log('  employee_trainings ' + (tIguales ? 'INTACTAS (' + b.t.length + ')' : 'MODIFICADAS!'));
    console.log('  assignments        ' + (aIguales ? 'INTACTAS (' + b.a.length + ')' : 'MODIFICADAS!'));
    console.log('  supervisor_assign  ' + (sIguales ? 'INTACTAS (' + b.s.length + ')' : 'MODIFICADAS!'));
    console.log('  locations          ' + (lIguales ? 'las existentes intactas (' + b.l.length + ')' : 'MODIFICADAS!') +
                '  + nuevas: ' + (nuevasL.map(x => x.id).join(', ') || 'ninguna'));
    const lg = (await pool.query('SELECT group_id, count(*)::int n FROM location_groups GROUP BY group_id ORDER BY group_id')).rows;
    console.log('  location_groups    ' + lg.map(r => r.group_id + '=' + r.n).join('  '));
    if (!eIguales || !tIguales || !aIguales || !sIguales || !lIguales) process.exitCode = 1;
  }
  console.log('\nmigracion aplicada');
  await db.foods.end(); await db.retail.end();
})().catch((e) => { console.error(e); process.exit(1); });