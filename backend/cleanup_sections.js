// Borra solo las filas de seccion (sin location_id) que se crearon al hacer
// clic en las pruebas del navegador. NO toca las asignaciones de locations.
const db = require('./db');
(async () => {
  const p = db.foods;
  const antes = (await p.query(
    'SELECT count(*)::int n FROM assignments WHERE location_id IS NULL')).rows[0].n;
  const d = (await p.query('DELETE FROM assignments WHERE location_id IS NULL')).rowCount;
  console.log('filas de seccion eliminadas: ' + d + ' (habia ' + antes + ')');

  const porFecha = (await p.query(
    `SELECT work_date::text d, source, count(*)::int n
       FROM assignments GROUP BY 1,2 ORDER BY 1,2`)).rows;
  console.log('\nreparto actual de assignments:');
  let total = 0;
  porFecha.forEach(x => { total += x.n; console.log('  ' + x.d + '  ' + String(x.source).padEnd(9) + x.n); });
  console.log('  TOTAL: ' + total);

  console.log('\nasignaciones que导入 el Excel real (source=excel):');
  const ex = (await p.query(
    `SELECT work_date::text d, count(*)::int n FROM assignments
      WHERE source = 'excel' GROUP BY 1 ORDER BY 1`)).rows;
  ex.forEach(x => console.log('  ' + x.d + '  ' + x.n + ' filas'));
  await p.end();
})();