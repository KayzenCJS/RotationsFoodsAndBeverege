// Limpia las filas de demo de las secciones del horario (2026-10-15) y
// backfillea category en las filas LOCATION que se importaron sin ella.
const db = require('./db');
(async () => {
  const p = db.foods;
  const d = (await p.query(
    "DELETE FROM assignments WHERE work_date = '2026-10-15' AND location_id IS NULL")).rowCount;
  console.log('demo de secciones eliminada: ' + d + ' filas');
  const n = (await p.query(
    'SELECT count(*)::int n FROM assignments WHERE location_id IS NULL')).rows[0].n;
  console.log('asignaciones sin location_id que quedan: ' + n);

  const antes = (await p.query(
    "SELECT count(*)::int n FROM assignments WHERE category IS NULL AND location_id IS NOT NULL")).rows[0].n;
  console.log('LOCATION sin category antes: ' + antes);
  if (antes > 0) {
    const b = (await p.query(
      'UPDATE assignments SET category = location_id ' +
      'WHERE category IS NULL AND location_id IS NOT NULL AND assignment_type = $1', ['LOCATION'])).rowCount;
    console.log('backfill: ' + b + ' filas actualizadas');
  }
  const despues = (await p.query(
    "SELECT count(*)::int n FROM assignments WHERE category IS NULL")).rows[0].n;
  console.log('filas sin category que quedan: ' + despues);

  const cls = (await p.query(
    `SELECT COALESCE(assignment_type,'(null)') t, count(*)::int n FROM assignments GROUP BY 1 ORDER BY 1`)).rows;
  console.log('clasificacion final: ' + cls.map(x => x.t + '=' + x.n).join('  '));
  await p.end();
})();