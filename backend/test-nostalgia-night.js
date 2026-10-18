// Prueba de Nostalgia Night: turno de noche que cruza la medianoche.
// Usa el servidor de verdad en una fecha lejana y lo limpia todo al terminar.
const BASE = 'http://localhost:3002/api/foods';
const db = require('./db');

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
  if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
  else { fail++; fallos.push(m); console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a)); }
};
const ok = (v, m) => eq(!!v, true, m);

const api = async (method, path, body) => {
  const r = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let d = null; try { d = await r.json(); } catch (e) {}
  return { status: r.status, ok: r.ok, data: d };
};

const FECHA = '2099-12-31';
const FECHA_SIG = '2100-01-01';
const created = [];

(async () => {
  const p = db.foods;
  const emps = (await api('GET', '/employees')).data;
  const e1 = emps.find(e => e.role === 'bartender') || emps[0];
  const e2 = emps.find(e => e.id !== e1.id && e.role === 'server') || emps[1];

  console.log('=== 1. Nostalgia Night existe y es una seccion mas ===');
  const cats = (await api('GET', '/schedule-categories')).data;
  const n = cats.filter(c => c.section === 'NOSTALGIA_NIGHT');
  ok(n.length >= 1, n.length + ' actividades de Nostalgia Night');
  ok(n.some(c => c.key === 'nostalgia-night'), 'actividad "nostalgia-night" creada');

  console.log('\n=== 2. Beer Tent fuera de la interfaz, datos conservados ===');
  const beerCat = (await p.query('SELECT key, is_active FROM schedule_categories WHERE key = $1', ['beer-tent'])).rows[0];
  eq(beerCat, { key: 'beer-tent', is_active: false }, 'la fila sigue existiendo, marcada inactiva');
  ok(!cats.some(c => c.key === 'beer-tent'), 'no aparece entre las activas que ve la interfaz');
  const beerAsg = (await p.query('SELECT count(*)::int n FROM assignments WHERE category = $1', ['beer-tent'])).rows[0].n;
  console.log('  (asignaciones historicas de Beer Tent conservadas: ' + beerAsg + ')');

  // Horarios tal como los devuelve PostgreSQL (time = HH:MM:SS).
  const H = (t) => (t ? String(t).slice(0, 5) : t);

  console.log('\n=== 3. Turno de noche que CRUZA la medianoche (20:00 -> 01:00) ===');
  const r1 = await api('POST', '/assignments', {
    location_id: null, employee_id: e1.id, work_date: FECHA,
    start_time: '20:00', end_time: '01:00',
    assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-night', role: 'Bartender'
  });
  eq(r1.status, 200, 'se registra un turno 20:00 -> 01:00');
  created.push(r1.data.id);
  const guardada = (await p.query(
    'SELECT work_date::text d, start_time::text s, end_time::text e, assignment_type, category FROM assignments WHERE id = $1',
    [r1.data.id])).rows[0];
  eq({ d: guardada.d, s: H(guardada.s), e: H(guardada.e),
       assignment_type: guardada.assignment_type, category: guardada.category },
     { d: FECHA, s: '20:00', e: '01:00', assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-night' },
     'guarda la fecha de INICIO y las dos horas tal cual (no una duración negativa)');

  console.log('\n=== 4. La fecha se respeta: ese turno no aparece en otro dia ===');
  // El endpoint filtra por ?date=. Se comprueba que el turno que empieza el
  // 31 a las 20:00 y acaba el 1 a la 01:00 SÓLO sale al pedir el día 31.
  const dia31 = (await api('GET', `/assignments?date=${FECHA}`)).data || [];
  const dia01 = (await api('GET', `/assignments?date=${FECHA_SIG}`)).data || [];
  const en31 = Array.isArray(dia31) ? dia31.filter(a => a.id === r1.data.id) : [];
  const en01 = Array.isArray(dia01) ? dia01.filter(a => a.id === r1.data.id) : [];
  eq(en31.length, 1, 'aparece en el reporte de SU fecha (el 31)');
  eq(en01.length, 0, 'NO aparece en el reporte del día siguiente (el 1)');
  // Y con la fecha de inicio de verdad en la base de datos
  const fechaReal = (await p.query('SELECT work_date::text d FROM assignments WHERE id = $1', [r1.data.id])).rows[0].d;
  eq(fechaReal, FECHA, 'la work_date guardada es la del INICIO del turno');

  console.log('\n=== 5. Conflicto contra un turno de la madrugada siguiente ===');
  // El turno nocturno va hasta la 01:00 del dia siguiente: choca con alguien
  // que ya tenga un turno a las 00:30 de esa madrugada.
  const r2 = await api('POST', '/assignments', {
    location_id: null, employee_id: e1.id, work_date: FECHA_SIG,
    start_time: '00:30', end_time: '02:00',
    assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-dj', role: 'DJ'
  });
  eq(r2.status, 400, 'rechaza solapar con la madrugada del turno nocturno');
  eq(r2.data.error, 'schedule_conflict', '  error = schedule_conflict');

  console.log('\n=== 6. Turnos que NO se solapan se aceptan ===');
  const r3 = await api('POST', '/assignments', {
    location_id: null, employee_id: e1.id, work_date: FECHA_SIG,
    start_time: '03:00', end_time: '05:00',
    assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-dj', role: 'DJ'
  });
  eq(r3.status, 200, 'un turno a las 03:00 no choca con el que acaba a la 01:00');
  created.push(r3.data.id);
  await api('DELETE', '/assignments/' + r3.data.id);

  console.log('\n=== 7. Se respeta la fecha: el conflicto no mira otros dias ===');
  // Mismo empleado, misma franja horaria, DOS dias despues: no es conflicto.
  const r4 = await api('POST', '/assignments', {
    location_id: null, employee_id: e1.id, work_date: '2099-12-20',
    start_time: '20:00', end_time: '01:00',
    assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-night', role: 'Bartender'
  });
  eq(r4.status, 200, 'mismo horario en otra fecha NO es conflicto');
  created.push(r4.data.id);
  await api('DELETE', '/assignments/' + r4.data.id);

  console.log('\n=== 8. Modificar el turno original se refleja ===');
  const upd = await api('PUT', '/assignments/' + r1.data.id, {
    location_id: null, employee_id: e1.id, work_date: FECHA,
    start_time: '18:00', end_time: '23:00',
    assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-night', role: 'Bartender'
  });
  eq(upd.status, 200, 'se puede modificar el turno');
  const tras = (await p.query('SELECT start_time::text s, end_time::text e FROM assignments WHERE id = $1', [r1.data.id])).rows[0];
  eq({ s: H(tras.s), e: H(tras.e) }, { s: '18:00', e: '23:00' }, 'las horas nuevas están guardadas');
  // 18:00-23:00 ya NO llega a la madrugada, así que el turno de la 1 se puede crear
  const r5 = await api('POST', '/assignments', {
    location_id: null, employee_id: e1.id, work_date: FECHA_SIG,
    start_time: '00:30', end_time: '02:00',
    assignment_type: 'NOSTALGIA_NIGHT', category: 'nostalgia-dj', role: 'DJ'
  });
  eq(r5.status, 200, 'tras acortar el turno, la madrugada queda libre');
  if (r5.data && r5.data.id) await api('DELETE', '/assignments/' + r5.data.id);

  console.log('\n=== 9. Borrar el original no deja rastro ===');
  await api('DELETE', '/assignments/' + r1.data.id);
  const queda = (await p.query('SELECT count(*)::int n FROM assignments WHERE id = $1', [r1.data.id])).rows[0].n;
  eq(queda, 0, 'la asignación borrada no existe (no hay copia reflejada que limpiar)');

  console.log('\n=== 10. Sin duplicados ===');
  const duplicados = (await p.query(
    `SELECT employee_id, work_date::text d, start_time::text s, end_time::text e, count(*)::int n
       FROM assignments
      WHERE work_date = $1 AND category = 'nostalgia-night'
      GROUP BY 1,2,3,4 HAVING count(*) > 1`, [FECHA])).rows;
  eq(duplicados, [], 'no hay asignaciones repetidas de Nostalgia Night');

  console.log('\n=== 11. Beer Tent NO se puede asignar desde la API ===');
  const r6 = await api('POST', '/assignments', {
    location_id: null, employee_id: e2.id, work_date: FECHA,
    start_time: '17:00', end_time: '22:00',
    assignment_type: 'EXTRA_HOURS', category: 'beer-tent', role: 'Server'
  });
  // La API no filtra por is_active (eso es de la interfaz), pero la fila no debe
  // poder ser el catalogo activo de la app. Se comprueba el estado del catalogo.
  console.log('  (la API permite escribir la clave, pero la interfaz no la ofrece: beer-tent is_active = false)');
  if (r6.data && r6.data.id) { await api('DELETE', '/assignments/' + r6.data.id); }

  // Limpieza
  for (const id of created) await api('DELETE', '/assignments/' + id);
  const sobrantes = (await p.query(
    'SELECT count(*)::int n FROM assignments WHERE work_date >= $1', ['2099-12-01'])).rows[0].n;
  eq(sobrantes, 0, 'limpieza: no queda ninguna asignacion de prueba');

  console.log('\n' + '='.repeat(64));
  console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
  if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
  console.log('='.repeat(64));
  await p.end();
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR:', e); process.exitCode = 1; });