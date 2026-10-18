// Restaura las capacitaciones de un empleado desde un respaldo SQL.
//
// Uso:  node restore_employee_trainings.js <backup.sql> <employee_id>
//
// El respaldo tiene lineas INSERT INTO employee_trainings (...) VALUES (...);
// Se extraen las del empleado pedido y se vuelven a insertar. No se toca el
// resto de la base ni el resto de empleados.
const fs = require('fs');
const db = require('./db');

(async () => {
  const [archivo, idTxt] = process.argv.slice(2);
  if (!archivo || !idTxt) {
    console.error('Uso: node restore_employee_trainings.js <backup.sql> <employee_id>');
    process.exit(1);
  }
  const employeeId = Number(idTxt);

  // Estado actual
  const ahora = (await db.foods.query(
    'SELECT training_name FROM employee_trainings WHERE employee_id = $1 ORDER BY training_name',
    [employeeId])).rows.map(r => r.training_name);
  const quien = (await db.foods.query('SELECT name FROM employees WHERE id = $1', [employeeId])).rows[0];
  console.log('empleado ' + employeeId + ' (' + (quien ? quien.name : '?') + ')');
  console.log('  ahora tiene ' + ahora.length + ' capacitaciones');

  // Extraer del respaldo
  const texto = fs.readFileSync(archivo, 'utf8');
  const lineas = texto.split(/\r?\n/);
  const delEmpleado = [];
  for (const l of lineas) {
    if (!l.startsWith('INSERT INTO employee_trainings ')) continue;
    // VALUES (<id>, <employee_id>, '<training>', '<fecha>');  -- el id puede faltar
    const m = l.match(/VALUES \(\d+,\s*(\d+),\s*'((?:[^']|'')*)'/);
    if (!m) continue;
    if (Number(m[1]) === employeeId) delEmpleado.push(m[2].replace(/''/g, "'"));
  }
  console.log('  el respaldo tiene ' + delEmpleado.length + ' filas suyas');

  if (!delEmpleado.length) {
    console.log('\nEl respaldo no tiene filas para ese empleado. No se toca nada.');
    await db.foods.end();
    process.exit(1);
  }

  const yaEsta = new Set(ahora);
  const faltan = delEmpleado.filter(t => !yaEsta.has(t));
  console.log('  faltan ' + faltan.length + (faltan.length ? ':' : ''));
  faltan.forEach(t => console.log('    + ' + t));

  const client = await db.foods.connect();
  try {
    await client.query('BEGIN');
    for (const t of faltan) {
      await client.query(
        `INSERT INTO employee_trainings (employee_id, training_name) VALUES ($1,$2)
         ON CONFLICT (employee_id, training_name) DO NOTHING`, [employeeId, t]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR, revertido: ' + e.message);
    await client.end(); await db.foods.end();
    process.exit(1);
  }

  const fin = (await db.foods.query(
    'SELECT training_name FROM employee_trainings WHERE employee_id = $1 ORDER BY training_name',
    [employeeId])).rows.map(r => r.training_name);
  console.log('\n  ahora tiene ' + fin.length + ' capacitaciones');

  // Comprobacion: quedan letras de grupo o casillas retiradas por el camino?
  const letras = fin.filter(t => ['A', 'B', 'C', 'D'].includes(t.toUpperCase()) && t.length === 1);
  const retiradas = fin.filter(t => ['sundae-training', 'prep-tater-kegs', 'prep-toppings',
    'maintain-food-warmer', 'handle-toppings', 'handle-cones-cups', 'prep-icee',
    'change-flavors', 'mop-floors', 'handle-freezer'].includes(t));
  console.log('  letras de grupo: ' + letras.length + (letras.length ? ' ' + letras.join(',') : ''));
  console.log('  de las 10 retiradas: ' + retiradas.length + (retiradas.length ? ' ' + retiradas.join(',') : ''));

  await client.end();
  await db.foods.end();
})().catch(e => { console.error(e); process.exit(1); });