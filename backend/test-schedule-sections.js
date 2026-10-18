// ============================================================================
//  PRUEBA DE LA EXTENSIÓN DEL HORARIO
//  OPS · EXTRA HOURS · SUPPORT · EXTRA TASKS · NOTAS · Living Shores
//  Verifica que las nuevas secciones funcionan, que las reglas de conflicto se
//  respetan, y que NO se pierde ni modifica ningún dato previo.
// ============================================================================
const db = require('./db');

const BASE = 'http://localhost:3002/api/foods';
const TEST_DATE = '2099-11-11';       // fecha lejana: no toca datos reales

let pass = 0, fail = 0; const fails = [];
const short = (v) => {
  const s = JSON.stringify(v);
  return s && s.length > 160 ? s.slice(0, 160) + '...(' + s.length + ' chars)' : s;
};
// Al comparar objetos grandes solo se muestran las claves que difieren.
const diff = (a, e) => {
  if (a === e) return null;
  try {
    const A = JSON.parse(JSON.stringify(a)), E = JSON.parse(JSON.stringify(e));
    if (A && E && typeof A === 'object' && typeof E === 'object' && !Array.isArray(A)) {
      const out = [];
      Object.keys(E).forEach((k) => {
        if (JSON.stringify(A[k]) !== JSON.stringify(E[k])) out.push(k + ': ' + short(E[k]) + '  ->  ' + short(A[k]));
      });
      Object.keys(A).forEach((k) => { if (!(k in E)) out.push('+' + k + ': ' + short(A[k])); });
      return out.slice(0, 6).join('\n         ');
    }
    if (Array.isArray(A) && Array.isArray(E)) {
      const setA = new Set(A.map((x) => JSON.stringify(x)));
      const setE = new Set(E.map((x) => JSON.stringify(x)));
      const onlyE = E.filter((x) => !setA.has(JSON.stringify(x)));
      const onlyA = A.filter((x) => !setE.has(JSON.stringify(x)));
      return 'solo en esperado (' + onlyE.length + '): ' + onlyE.slice(0, 2).map(short).join(' , ') +
             '\n         solo en obtenido (' + onlyA.length + '): ' + onlyA.slice(0, 2).map(short).join(' , ');
    }
  } catch (e) { /* falls through */ }
  return 'esperado: ' + short(e) + '\n         obtenido: ' + short(a);
};
const eq = (a, e, m) => {
  if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
  else {
    fail++;
    const d = diff(a, e);
    fails.push(m + '\n         ' + d);
    console.log('  FAIL ' + m + '\n         ' + d);
  }
};
const ok = (v, m) => eq(!!v, true, m);

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* sin cuerpo */ }
  return { status: res.status, ok: res.ok, data };
}

const snapshot = async () => {
  const p = db.foods;
  const a = (await p.query(
    `SELECT id, location_id, employee_id, work_date::text d, start_time::text st,
            end_time::text en, source, external_id
       FROM assignments ORDER BY id`)).rows;
  const e = (await p.query(
    'SELECT id, name, nationality, age, role, group_id, hire_date::text h, is_versatile FROM employees ORDER BY id')).rows;
  const l = (await p.query('SELECT id, name, type, category FROM locations ORDER BY id')).rows;
  const s = (await p.query(
    'SELECT id, supervisor_id, location_id, assigned_date::text d, role FROM supervisor_assignments ORDER BY id')).rows;
  const t = (await p.query('SELECT id, title, assigned_to, due_date::text d, status FROM tasks ORDER BY id')).rows;
  return JSON.stringify({ a, e, l, s, t });
};

(async () => {
  const pool = db.foods;

  // Limpieza previa por si se corta una ejecución
  await pool.query('DELETE FROM assignments WHERE work_date = $1', [TEST_DATE]);
  await pool.query('DELETE FROM schedule_notes WHERE work_date = $1', [TEST_DATE]);

  const before = await snapshot();
  const cats = (await api('GET', '/schedule-categories')).data;
  const employees = (await api('GET', '/employees')).data;
  const locations = (await api('GET', '/locations')).data;

  console.log('\n=== 1. Estructura creada sin perder datos ===');
  ok(cats.length >= 16, cats.length + ' categorías de sección en el catálogo');
  const bySec = {};
  cats.forEach(c => { bySec[c.section] = (bySec[c.section] || 0) + 1; });
  // Se comparan las claves ordenadas: JSON.stringify respeta el orden.
  // El reparto no va codificado a proposito: las secciones son datos y crecen
  // con el catalogo (NOSTALGIA_NIGHT se anadio despues). Lo que se comprueba es
  // que las secciones del horario original siguen estan todas.
  const sorted = (o) => Object.keys(o).sort().reduce((a, k) => (a[k] = o[k], a), {});
  Object.keys(bySec).forEach(k => ok(k, 'seccion presente: ' + k));
  ['OPS', 'EXTRA_HOURS', 'SUPPORT', 'EXTRA_TASK'].forEach(s =>
    ok(bySec[s] > 0, s + ' sigue con sus actividades (' + bySec[s] + ')'));
  ok(cats.length >= 18, cats.length + ' actividades en total');
  ok(locations.some(l => l.id === 'living-shores'), 'Living Shores añadida como location (§5)');
  // No se codifica el numero de locations: grows con el catalogo (Living
  // Shores, Bistro, Dunkin'...). Lo que importa es que esten las esperadas.
  ['living-shores', 'bistro', 'dunkin-donuts'].forEach(id =>
    ok(locations.some(l => l.id === id), 'location ' + id + ' presente'));
  ok(locations.length >= 12, locations.length + ' locations en el catalogo');

  console.log('\n=== 2. Clasificación OPS del empleado (§1) ===');
  const opsRoles = employees.filter(e => ['supervisor', 'assistant-supervisor', 'op'].includes(e.role));
  ok(opsRoles.length > 0, opsRoles.length + ' empleados con rol supervisor/assistant-supervisor/op');
  // Se elige uno que TENGA capacitaciones: si no, la comprobacion de que el PUT
  // no las destruye no probaria nada.
  const target = opsRoles.find(e => (e.trainings || []).filter(Boolean).length > 0) || opsRoles[0];
  const opsGroupOriginal = target.ops_group || null;
  // Se parte siempre de NULL para que el test sea repetible, y se restaura al
  // final whatever partida.
  if (opsGroupOriginal) {
    await api('PUT', '/employees/' + target.id, {
      name: target.name, nationality: target.nationality, age: target.age,
      role: target.role, group_id: target.group_id,
      hire_date: (target.hire_date || '').slice(0, 10), ops_group: null,
      trainings: target.trainings || [], availability: target
    });
  }
  ok(true, 'empleado de prueba: ' + target.name + ' (ops_group original = ' + opsGroupOriginal + ')');
  // Se manda el array tal cual vuelve del GET (puede traer null) para
  // comprobar el viaje completo, y además se mide que no se pierdan
  // capacitaciones por el camino (fue un fallo real del PUT /employees).
  const nTrainingsAntes = (target.trainings || []).filter(Boolean).length;
  const upd = await api('PUT', '/employees/' + target.id, {
    name: target.name, nationality: target.nationality, age: target.age,
    role: target.role, group_id: target.group_id,
    hire_date: (target.hire_date || '').slice(0, 10), ops_group: 'front_ops',
    trainings: target.trainings || [], availability: target
  });
  eq(upd.ok, true, 'empleado actualizado con ops_group' + (upd.ok ? '' : ' -> ' + JSON.stringify(upd.data)));
  const reread = (await api('GET', '/employees')).data.find(e => e.id === target.id);
  eq(reread.ops_group, 'front_ops', target.name + ' -> ops_group = front_ops');
  eq((reread.trainings || []).filter(Boolean).length, nTrainingsAntes,
     'las ' + nTrainingsAntes + ' capacitaciones sobreviven al PUT');
  // Un grupo OPS que no existe en el catalogo no debe guardarse.
  const badOps = await api('PUT', '/employees/' + target.id, {
    name: target.name, nationality: target.nationality, age: target.age,
    role: target.role, group_id: target.group_id,
    hire_date: (target.hire_date || '').slice(0, 10),
    ops_group: 'grupo-inventado', trainings: target.trainings || [], availability: target
  });
  ok(badOps.ok, 'el PUT con un grupo inválido no da error, simplemente no lo guarda');
  const reread2 = (await api('GET', '/employees')).data.find(e => e.id === target.id);
  eq(reread2.ops_group, null, 'un grupo OPS inválido se descarta (vuelve a NULL)');
  eq((reread2.trainings || []).filter(Boolean).length, nTrainingsAntes,
     'las capacitaciones siguen intactas tras el segundo PUT');

  console.log('\n=== 3. Asignaciones en cada sección nueva ===');
  // Front OPS: un OPS de ejemplo
  const opsEmp = target;
  const other = employees.find(e => e.id !== opsEmp.id);
  const r1 = await api('POST', '/assignments', {
    employee_id: opsEmp.id, work_date: TEST_DATE,
    start_time: '09:00', end_time: '17:00',
    assignment_type: 'OPS', category: 'front_ops',
    role: 'Supervisor', notes: 'Turno de apertura'
  });
  eq(r1.ok, true, 'OPS -> Front OPS creada');

  // El mismo rol, otra sección no geográfica: también sin location_id
  const r2 = await api('POST', '/assignments', {
    employee_id: other.id, work_date: TEST_DATE,
    start_time: '07:00', end_time: '09:00',
    assignment_type: 'EXTRA_HOURS', category: 'character-breakfast', role: 'Server'
  });
  eq(r2.ok, true, 'EXTRA HOURS -> Character Breakfast creada');

  const r3 = await api('POST', '/assignments', {
    employee_id: employees.find(e => e.id !== other.id && e.id !== opsEmp.id).id,
    work_date: TEST_DATE, start_time: '17:30', end_time: '22:00',
    assignment_type: 'SUPPORT', category: 'pavilion-support', notes: 'Apoyo de cierre'
  });
  eq(r3.ok, true, 'SUPPORT -> Pavilion Support creada');

  const r4 = await api('POST', '/assignments', {
    employee_id: employees[3].id, work_date: TEST_DATE,
    start_time: '06:00', end_time: '07:00',
    assignment_type: 'EXTRA_TASK', category: 'ipr-opener', notes: 'Apertura'
  });
  eq(r4.ok, true, 'EXTRA TASKS -> IPR Opener creada');

  console.log('\n=== 4. Se guardan sin location_id pero con categoría (§4) ===');
  const stored = (await pool.query(
    'SELECT assignment_type, category, location_id, role, notes FROM assignments WHERE work_date = $1 ORDER BY id',
    [TEST_DATE])).rows;
  eq(stored.length, 4, '4 asignaciones nuevas guardadas');
  eq(stored.map(x => x.assignment_type), ['OPS', 'EXTRA_HOURS', 'SUPPORT', 'EXTRA_TASK'], 'tipos correctos');
  eq(stored.map(x => x.category), ['front_ops', 'character-breakfast', 'pavilion-support', 'ipr-opener'], 'categorías correctas');
  eq(stored.every(x => x.location_id === null), true, 'ninguna tiene location_id (no son locations)');
  eq(stored[0].notes, 'Turno de apertura', 'nota guardada');
  eq(stored[0].role, 'Supervisor', 'rol por asignación guardado');

  console.log('\n=== 5. El GET las devuelve (LEFT JOIN, no desaparecen) ===');
  const list = (await api('GET', '/assignments?date=' + TEST_DATE)).data;
  eq(list.length, 4, 'las 4 salen en GET /assignments');
  const frontOps = list.find(a => a.category === 'front_ops');
  ok(frontOps.section_name === 'Front OPS', 'trae el nombre de la sección: ' + frontOps.section_name);
  eq(frontOps.section, 'OPS', 'trae la sección');
  eq(frontOps.location_name, null, 'sin location_name (correcto: no es una location)');
  const cb = list.find(a => a.category === 'character-breakfast');
  eq(cb.section_name, 'Character Breakfast', 'Character Breakfast correcto');

  console.log('\n=== 6. Reglas de conflicto: mismas que las locations (§19) ===');
  // Solapado con Front OPS -> conflicto
  const c1 = await api('POST', '/assignments', {
    employee_id: opsEmp.id, work_date: TEST_DATE, start_time: '12:00', end_time: '16:00',
    assignment_type: 'LOCATION', location_id: 'food-fair'
  });
  eq(c1.status, 400, 'Front OPS 09:00-17:00 + Food Fair 12:00-16:00 -> RECHAZADO');
  eq(c1.data.error, 'schedule_conflict', 'error = schedule_conflict');
  ok(/front ops/i.test(c1.data.message), 'el mensaje nombra la sección: ' + c1.data.message);

  // Contiguo -> válido
  const c2 = await api('POST', '/assignments', {
    employee_id: opsEmp.id, work_date: TEST_DATE, start_time: '17:00', end_time: '18:00',
    assignment_type: 'LOCATION', location_id: 'food-fair'
  });
  eq(c2.ok, true, 'Front OPS 09:00-17:00 + Food Fair 17:00-18:00 -> VÁLIDO (consecutivos)');

  // Conflicto entre dos secciones no geográficas
  const c3 = await api('POST', '/assignments', {
    employee_id: opsEmp.id, work_date: TEST_DATE, start_time: '14:00', end_time: '15:00',
    assignment_type: 'EXTRA_HOURS', category: 'student-dining'
  });
  eq(c3.status, 400, 'Front OPS + Student Dining solapados -> RECHAZADO');

  // El mismo empleado en dos secciones el mismo día pero en horarios distintos
  const c4 = await api('POST', '/assignments', {
    employee_id: opsEmp.id, work_date: TEST_DATE, start_time: '19:00', end_time: '21:00',
    assignment_type: 'SUPPORT', category: 'pixie-support'
  });
  eq(c4.ok, true, 'Front OPS 09-17 + Pixie Support 19-21 -> VÁLIDO');

  console.log('\n=== 7. Notas del día (§14) ===');
  const n1 = await api('POST', '/schedule-notes', { work_date: TEST_DATE, note: 'Cesar no puede trabajar después de las 10 PM.', created_by: 'test' });
  eq(n1.ok, true, 'nota creada');
  const n2 = await api('POST', '/schedule-notes', { work_date: TEST_DATE, note: 'Student Dining needs additional support.' });
  await api('POST', '/schedule-notes', { work_date: '2099-11-12', note: 'Nota del dia siguiente' });
  const notes = (await api('GET', '/schedule-notes?date=' + TEST_DATE)).data;
  eq(notes.length, 2, '2 notas en ' + TEST_DATE);
  eq(notes.map(n => n.note).sort(), ['Cesar no puede trabajar después de las 10 PM.', 'Student Dining needs additional support.'].sort(), 'contenido correcto');
  const notesNext = (await api('GET', '/schedule-notes?date=2099-11-12')).data;
  eq(notesNext.length, 1, 'la nota del día siguiente está separada (§18)');
  const ed = await api('PUT', '/schedule-notes/' + n1.data.id, { note: 'Cesar no shift after 10pm.' });
  eq(ed.ok, true, 'nota editada');
  eq((await api('GET', '/schedule-notes?date=' + TEST_DATE)).data.find(n => n.id === n1.data.id).note,
     'Cesar no shift after 10pm.', 'texto actualizado');
  await api('DELETE', '/schedule-notes/' + n2.data.id);
  eq((await api('GET', '/schedule-notes?date=' + TEST_DATE)).data.length, 1, 'nota eliminada');
  eq((await api('GET', '/schedule-notes?date=2099-11-12')).data.length, 1, 'borrar una nota no toca la del otro día');

  console.log('\n=== 8. Edición de una asignación de sección ===');
  const put = await api('PUT', '/assignments/' + r1.data.id, {
    employee_id: opsEmp.id, work_date: TEST_DATE,
    start_time: '08:00', end_time: '16:00',
    assignment_type: 'OPS', category: 'front_ops', role: 'OP', notes: 'Editado'
  });
  eq(put.ok, true, 'asignación OPS editada');
  eq([String(put.data.start_time).slice(0, 5), String(put.data.end_time).slice(0, 5)], ['08:00', '16:00'], 'horas actualizadas');
  eq(put.data.role, 'OP', 'rol actualizado');
  eq(put.data.notes, 'Editado', 'nota actualizada');

  console.log('\n=== 9. Living Shores se comporta como location normal (§5) ===');
  ok(locations.some(l => l.id === 'living-shores'), 'Living Shores añadida como location (§5)');
  const ls = await api('POST', '/assignments', {
    employee_id: employees[5].id, work_date: TEST_DATE,
    start_time: '10:00', end_time: '19:00', location_id: 'living-shores'
  });
  eq(ls.ok, true, 'asignación creada en Living Shores');
  const lsRow = (await pool.query(
    `SELECT assignment_type, category, location_id FROM assignments
      WHERE work_date=$1 AND location_id='living-shores'`, [TEST_DATE])).rows[0];
  eq(lsRow.assignment_type, 'LOCATION', 'se clasifica como LOCATION');
  eq(lsRow.category, 'living-shores', 'su category es su location_id (regla uniforme)');
  eq(lsRow.location_id, 'living-shores', 'location_id informado');
  const lsList = (await api('GET', '/assignments?date=' + TEST_DATE)).data.filter(a => a.location_id === 'living-shores');
  eq(lsList.length, 1, 'aparece en el GET como cualquier location');
  eq(lsList[0].location_name, 'Living Shores', 'con su nombre');

  console.log('\n=== 10. Las asignaciones previas siguen intactas ===');
  // No se codifica el numero: se compara con la foto del principio del test,
  // para que siga siendo valido conforme se importen horarios reales.
  const prevTotales = (await pool.query(
    'SELECT count(*)::int n FROM assignments WHERE work_date <> $1', [TEST_DATE])).rows[0].n;
  const prevBienClasificadas = (await pool.query(
    `SELECT count(*)::int n FROM assignments
      WHERE work_date <> $1 AND assignment_type = 'LOCATION' AND category = location_id`,
    [TEST_DATE])).rows[0].n;
  ok(prevTotales > 0, prevTotales + ' asignaciones previas, ninguna tocada');
  eq(prevBienClasificadas, prevTotales,
     'las ' + prevTotales + ' previas siguen siendo LOCATION con category = location_id');
  const huerfanas = (await pool.query(
    `SELECT count(*)::int n FROM assignments
      WHERE work_date <> $1 AND (assignment_type IS NULL OR category IS NULL)`,
    [TEST_DATE])).rows[0].n;
  eq(huerfanas, 0, 'ninguna asignacion previa sin clasificar');

  console.log('\n=== 11. Nada existente se modifica (§17) ===');
  // Se compara contra la foto inicial, ignorando lo añadido por la prueba.
  const now = JSON.parse(await snapshot());
  const orig = JSON.parse(before);
  const stripTest = (arr) => arr.filter(x => x.d !== TEST_DATE);
  eq(JSON.stringify(stripTest(now.a)), JSON.stringify(stripTest(orig.a)), 'assignments previas sin cambios');
  eq(JSON.stringify(stripTest(now.s)), JSON.stringify(stripTest(orig.s)), 'supervisor_assignments sin cambios');
  eq(JSON.stringify(stripTest(now.t)), JSON.stringify(stripTest(orig.t)), 'tasks sin cambios');
  // Los empleados: solo cambia ops_group del que se editó a proposito.
  const empNow = now.e.filter(x => x.id !== opsEmp.id);
  const empOrig = orig.e.filter(x => x.id !== opsEmp.id);
  eq(JSON.stringify(empNow), JSON.stringify(empOrig), 'los otros 42 empleados sin cambios');
  const opsEmpOrig = orig.e.find(x => x.id === opsEmp.id);
  const opsEmpNow = now.e.find(x => x.id === opsEmp.id);
  eq(JSON.stringify({ ...opsEmpNow, ops_group: opsEmpOrig.ops_group }),
     JSON.stringify({ ...opsEmpOrig, ops_group: opsEmpOrig.ops_group }), 'el empleado OPS solo cambió en ops_group');
  // locations: solo se añadió Living Shores; se excluye de ambos lados
  eq(JSON.stringify(now.l.filter(x => x.id !== 'living-shores')),
     JSON.stringify(orig.l.filter(x => x.id !== 'living-shores')), 'locations existentes intactas');

  console.log('\n=== 12. Limpieza ===');
  const del = await pool.query('DELETE FROM assignments WHERE work_date = $1', [TEST_DATE]);
  await pool.query('DELETE FROM schedule_notes WHERE work_date IN ($1, $2)', [TEST_DATE, '2099-11-12']);
  eq(del.rowCount, now.a.length - orig.a.length, del.rowCount + ' asignaciones de prueba eliminadas');
  const left = (await pool.query('SELECT count(*)::int n FROM assignments WHERE work_date = $1', [TEST_DATE])).rows[0].n;
  eq(left, 0, 'no queda nada de la prueba');

  // Restaurar el ops_group del empleado tocado (al valor original)
  if (opsGroupOriginal) {
    await api('PUT', '/employees/' + opsEmp.id, {
      name: opsEmp.name, nationality: opsEmp.nationality, age: opsEmp.age,
      role: opsEmp.role, group_id: opsEmp.group_id,
      hire_date: (opsEmp.hire_date || '').slice(0, 10), ops_group: opsGroupOriginal,
      trainings: opsEmp.trainings || [], availability: opsEmp
    });
  } else {
    await pool.query('UPDATE employees SET ops_group = NULL WHERE id = $1', [opsEmp.id]);
  }

  const final = await snapshot();
  eq(final, before, 'la base de datos vuelve EXACTAMENTE al estado inicial');

  console.log('\n' + '='.repeat(66));
  console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
  if (fail) { console.log('\nFALLOS:'); fails.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
  console.log('='.repeat(66));
  await pool.end();
})().catch((e) => { console.error('ERROR:', e); process.exitCode = 1; });