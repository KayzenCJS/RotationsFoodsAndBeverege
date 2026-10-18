// Retira del catalogo las 10 cualidades indicadas y quita esas filas de
// employee_trainings. MODO=simular no borra nada.
//
//   node retire_trainings.js simular
//   node retire_trainings.js aplicar
//   node retire_trainings.js revertir
//
// Hay respaldo en backups/employee_trainings_<fecha>.sql (formato COPY).
const fs = require('fs');
const path = require('path');
const db = require('./db');

const RETIRADAS = [
  ['sundae-training',      'Sundae Preparation'],
  ['prep-tater-kegs',      'Preparar Tater Kegs'],
  ['prep-toppings',        'Preparar Toppings'],
  ['maintain-food-warmer', 'Mantener Food Warmer'],
  ['handle-toppings',      'Manejar Toppings'],
  ['handle-cones-cups',    'Manejar Conos y Cups'],
  ['prep-icee',            'Preparar/Refill ICEE'],
  ['change-flavors',       'Cambiar Sabores'],
  ['mop-floors',           'Trapear pisos'],
  ['handle-freezer',       'Manejar Freezer']
];
const SLUGS = RETIRADAS.map((r) => r[0]);
const MODO = process.argv[2] || 'simular';

(async () => {
  const p = db.foods;
  const before = (await p.query('SELECT count(*)::int n FROM employee_trainings')).rows[0].n;
  const catBefore = (await p.query(
    'SELECT count(DISTINCT training_name)::int n FROM employee_trainings')).rows[0].n;

  console.log('=== Cualidades a retirar ===');
  const per = (await p.query(
    `SELECT training_name, count(*)::int n FROM employee_trainings
      WHERE training_name = ANY($1) GROUP BY training_name ORDER BY training_name`, [SLUGS])).rows;
  const byName = {};
  per.forEach(r => { byName[r.training_name] = r.n; });
  let total = 0;
  RETIRADAS.forEach(([slug, label]) => {
    const n = byName[slug] || 0;
    total += n;
    console.log('  ' + String(n).padStart(4) + ' empleados   ' + slug.padEnd(22) + ' "' + label + '"');
  });
  console.log('  ' + String(total).padStart(4) + ' filas a eliminar en total');

  const notFound = RETIRADAS.filter(([s]) => !byName[s]).map(([, l]) => l);
  if (notFound.length) console.log('  (sin datos: ' + notFound.join(', ') + ')');

  if (MODO === 'simular') {
    console.log('\nSIMULACION: no se ha borrado nada.');
    console.log('employee_trainings: ' + before + ' -> ' + (before - total) + ' filas');
    console.log('catalogo distinto : ' + catBefore + ' -> ' + (catBefore - Object.keys(byName).length) + ' cualidades');
    await p.end();
    return;
  }

  if (MODO === 'revertir') {
    const dir = path.join(__dirname, 'backups');
    const f = fs.readdirSync(dir).filter((x) => x.startsWith('employee_trainings_')).sort().pop();
    if (!f) { console.error('no hay respaldo'); process.exit(1); }
    console.log('Para revertir hay que ejecutar el respaldo con psql:');
    console.log('  psql -d storyland_foods -f ' + path.join(dir, f));
    await p.end();
    return;
  }

  // Solo se borra de employee_trainings; nada mas.
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const del = await client.query(
      'DELETE FROM employee_trainings WHERE training_name = ANY($1) RETURNING training_name', [SLUGS]);
    await client.query('COMMIT');
    console.log('\nAPLICADO: ' + del.rowCount + ' filas eliminadas de employee_trainings');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR, se ha revertido: ' + e.message);
    await client.end(); await p.end();
    process.exit(1);
  }

  const after = (await p.query('SELECT count(*)::int n FROM employee_trainings')).rows[0].n;
  const catAfter = (await p.query(
    'SELECT count(DISTINCT training_name)::int n FROM employee_trainings')).rows[0].n;
  console.log('employee_trainings: ' + before + ' -> ' + after + ' filas');
  console.log('catalogo distinto : ' + catBefore + ' -> ' + catAfter + ' cualidades');

  const left = (await p.query(
    'SELECT count(*)::int n FROM employee_trainings WHERE training_name = ANY($1)', [SLUGS])).rows[0].n;
  console.log('quedan de las retiradas: ' + left);

  // Otras tablas intactas
  const others = {
    employees: (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n,
    assignments: (await p.query('SELECT count(*)::int n FROM assignments')).rows[0].n,
    locations: (await p.query('SELECT count(*)::int n FROM locations')).rows[0].n,
    supervisor_assignments: (await p.query('SELECT count(*)::int n FROM supervisor_assignments')).rows[0].n
  };
  console.log('intactos -> empleados:' + others.employees + ' assignments:' + others.assignments +
              ' locations:' + others.locations + ' supervisor_assignments:' + others.supervisor_assignments);

  await client.end(); await p.end();
})().catch((e) => { console.error(e); process.exit(1); });