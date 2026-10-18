// Borra las filas de prueba de las fechas lejanas que usan los tests.
const db = require('./db');
(async () => {
  const p = db.foods;
  const fechas = ['2099-11-20', '2099-12-01', '2099-12-20', '2099-12-31', '2100-01-01', '2099-11-11'];
  const r = await p.query(
    'DELETE FROM assignments WHERE work_date = ANY($1::date[])', [fechas]);
  console.log('filas de prueba eliminadas: ' + r.rowCount);
  const queda = await p.query(
    'SELECT count(*)::int n FROM assignments WHERE work_date >= $1', ['2099-01-01']);
  console.log('asignaciones en fechas de prueba que quedan: ' + queda.rows[0].n);
  await p.end();
})().catch(e => { console.error(e); process.exit(1); });