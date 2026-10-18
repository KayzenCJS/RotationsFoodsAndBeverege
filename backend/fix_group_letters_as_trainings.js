// Quita de employee_trainings las filas que en realidad son letras de grupo.
// Aparcieron por un fallo del formulario: las casillas de "Grupos adicionales"
// tienen los valores A, B, C y D, y un selector generico las guardo como si
// fueran certificaciones.
//
// Solo toca valores que son exactamente una letra de grupo: cualquier otra
// fila se deja como esta.
require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
  host: process.env.DB_HOST, port: +process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.FOODS_DB_NAME
});

(async () => {
  const antes = await p.query(
    `SELECT training_name, count(*)::int n FROM employee_trainings
      WHERE upper(btrim(training_name)) IN ('A','B','C','D') AND btrim(training_name) = upper(btrim(training_name))
      GROUP BY training_name ORDER BY training_name`);
  console.log('filas a quitar: ' + (antes.rows.reduce((s, r) => s + r.n, 0)));
  antes.rows.forEach(r => console.log('   "' + r.training_name + '" x' + r.n));

  const affectedByEmployee = await p.query(
    `SELECT et.employee_id, e.name, count(*)::int n
       FROM employee_trainings et JOIN employees e ON e.id = et.employee_id
      WHERE upper(btrim(et.training_name)) IN ('A','B','C','D')
        AND btrim(et.training_name) = upper(btrim(et.training_name))
      GROUP BY 1,2 ORDER BY 1`);
  console.log('\nafectados:');
  affectedByEmployee.rows.forEach(r =>
    console.log('   ' + String(r.employee_id).padStart(3) + '  ' + r.name + '  (' + r.n + ' letras)'));

  const d = await p.query(
    `DELETE FROM employee_trainings
      WHERE upper(btrim(training_name)) IN ('A','B','C','D')
        AND btrim(training_name) = upper(btrim(training_name))`);
  console.log('\nborradas: ' + d.rowCount);

  const fin = await p.query(
    `SELECT count(*)::int total, count(DISTINCT training_name)::int catalogo FROM employee_trainings`);
  console.log('total capacitaciones: ' + fin.rows[0].total + '   catalogo: ' + fin.rows[0].catalogo);
  await p.end();
})().catch(e => { console.error(e); process.exit(1); });