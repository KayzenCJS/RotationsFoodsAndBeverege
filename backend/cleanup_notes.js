// Borra las notas del horario que dejo el script de demo y mis pruebas.
// Solo toca filas con created_by NULL: cualquier nota escrita por una persona
// desde la interfaz (que si lo guarda) queda intacta.
const db = require('./db');
(async () => {
  const p = db.foods;
  const antes = (await p.query(
    "SELECT count(*)::int n FROM schedule_notes WHERE created_by IS NULL")).rows[0].n;
  const d = (await p.query('DELETE FROM schedule_notes WHERE created_by IS NULL')).rowCount;
  const conAutor = (await p.query(
    "SELECT count(*)::int n FROM schedule_notes WHERE created_by IS NOT NULL")).rows[0].n;
  console.log('notas de demo eliminadas: ' + d + ' (habia ' + antes + ')');
  console.log('quedan ' + conAutor + ' notas escritas por una persona');
  await p.end();
})();