// Deja las tablas de la entrega vacias de datos de prueba.
// Solo toca employee_location_training y employee_groups (las de esta entrega):
// las capacitaciones y todo lo demas no se rozan.
const db = require('./db');
(async () => {
  const p = db.foods;
  const antes = {
    locs: (await p.query('SELECT count(*)::int n FROM employee_location_training')).rows[0].n,
    groups: (await p.query('SELECT count(*)::int n FROM employee_groups')).rows[0].n
  };
  const dl = (await p.query('DELETE FROM employee_location_training')).rowCount;
  const dg = (await p.query('DELETE FROM employee_groups')).rowCount;
  const quedan = {
    locs: (await p.query('SELECT count(*)::int n FROM employee_location_training')).rows[0].n,
    groups: (await p.query('SELECT count(*)::int n FROM employee_groups')).rows[0].n
  };
  console.log('employee_location_training: ' + antes.locs + ' filas -> borradas ' + dl + ', quedan ' + quedan.locs);
  console.log('employee_groups:           ' + antes.groups + ' filas -> borradas ' + dg + ', quedan ' + quedan.groups);

  const fin = {
    employees: (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n,
    trainings: (await p.query('SELECT count(*)::int n FROM employee_trainings')).rows[0].n,
    assignments: (await p.query('SELECT count(*)::int n FROM assignments')).rows[0].n,
    locations: (await p.query('SELECT count(*)::int n FROM locations')).rows[0].n
  };
  console.log('\nintactos: ' + JSON.stringify(fin));
  await p.end();
})();