// Comprueba que employee_trainings coincide con el respaldo en disco.
// Si difieren, algo se ha modificado desde el respaldo.
const fs = require('fs');
const path = require('path');
const db = require('./db');

(async () => {
  const dir = path.join(__dirname, 'backups');
  const file = fs.readdirSync(dir).filter((f) => f.startsWith('employee_trainings_')).sort().pop();
  const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
  const esperado = [];
  let enCopia = false;
  for (const l of lines) {
    if (l.startsWith('COPY employee_trainings')) { enCopia = true; continue; }
    if (l === '\\.') { enCopia = false; continue; }
    if (!enCopia || l === '') continue;
    const p = l.split('\t');
    esperado.push({ employee_id: +p[1], training_name: p[2] });
  }
  console.log('respaldo ' + file + ': ' + esperado.length + ' filas');

  const p = db.foods;
  const actual = (await p.query('SELECT employee_id, training_name FROM employee_trainings')).rows;
  console.log('base de datos          : ' + actual.length + ' filas');

  const key = (r) => r.employee_id + '|' + r.training_name;
  const setA = new Set(esperado.map(key));
  const setB = new Set(actual.map(key));

  const soloRespaldo = esperado.filter((r) => !setB.has(key(r)));
  const soloBase = actual.filter((r) => !setA.has(key(r)));
  const duplicados = actual.length - setB.size;

  console.log('\nsolo en el respaldo (perdidas): ' + soloRespaldo.length);
  soloRespaldo.slice(0, 10).forEach((r) => console.log('   emp#' + r.employee_id + '  ' + r.training_name));
  console.log('solo en la base (nuevas)     : ' + soloBase.length);
  soloBase.slice(0, 10).forEach((r) => console.log('   emp#' + r.employee_id + '  ' + r.training_name));
  console.log('duplicados en la base        : ' + duplicados);

  // Trazabilidad por empleado
  const porEmp = {};
  for (const k of soloRespaldo) porEmp[k.employee_id] = (porEmp[k.employee_id] || 0) + 1;
  if (Object.keys(porEmp).length) {
    console.log('\nempleados afectados:');
    for (const [id, n] of Object.entries(porEmp)) {
      const e = (await p.query('SELECT name FROM employees WHERE id=$1', [id])).rows[0];
      console.log('   emp#' + id + ' (' + (e ? e.name : '?') + '): ' + n + ' capacitaciones');
    }
  }
  console.log('\n' + (soloRespaldo.length === 0 && soloBase.length === 0 && duplicados === 0
    ? 'IDENTICAS: no se ha modificado nada desde el respaldo'
    : 'HAY DIFERENCIAS respecto al respaldo'));
  await p.end();
})();