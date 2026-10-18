// Prueba de la sincronizacion de secciones del Excel (Student Dining y
// Character Breakfast) con la seccion Extra Hours.
//
// Lo que se comprueba, de punta a punta:
//   1) Las filas del Excel que son SECCIONES (no locations) se reconocen.
//   2) Se importan como UNA asignacion de la seccion (no se duplican).
//   3) Al verlas se muestran nombre, actividad, fecha y horas del turno.
//   4) Si se cambia la asignacion original, el reflejo cambia con ella.
//   5) Si se borra la original, no queda reflejo.
//   6) La fecha se respeta: una asignacion no aparece en el reporte de otro dia.
//   7) Beer Tent no se importa, pero su fila sigue existindo.
//
// Usa el Excel real del usuario. Al terminar borra TODO lo que creo.
const db = require('./db');
const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');
const P = require(path.join(__dirname, '..', 'quinyx-parser.js'));

const BASE = 'http://localhost:3002/api/foods';
const EXCEL = 'C:\\Users\\white\\Desktop\\StoryManager_Schedule_CORREGIDO.xlsx';
const FECHA = '2099-11-20';           // fecha de prueba, lejos de los datos reales

let pass = 0, fail = 0; const fallos = [];
const eq = (a, e, m) => {
  if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
  else { fail++; fallos.push(m); console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a)); }
};
const ok = (v, m) => eq(!!v, true, m);
const H = (t) => (t ? String(t).slice(0, 5) : t);

const api = async (method, p, body) => {
  const r = await fetch(BASE + p, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let d = null; try { d = await r.json(); } catch (e) {}
  return { status: r.status, ok: r.ok, data: d };
};

(async () => {
  const p = db.foods;
  const creados = [];

  // -----------------------------------------------------------------------
  console.log('=== 1. Lo que trae el Excel real ===');
  ok(fs.existsSync(EXCEL), 'el Excel del usuario está disponible');
  const wb = XLSX.readFile(EXCEL);
  const filas = XLSX.utils.sheet_to_json(wb.Sheets['Schedule'], { header: 1, raw: false, defval: '' });
  const parseado = P.parseScheduleSheet(filas, 'Schedule');

  const secciones = ['Student Dining', 'Character Breakfast', 'Beer Tent'];
  secciones.forEach(s =>
    ok((parseado.sections || []).some(x => String(x).toLowerCase().includes(s.toLowerCase())),
       `el Excel declara la sección "${s}"`));

  const registrosSeccion = (nombre) => parseado.records.filter(
    r => String(r.location_name || '').toLowerCase().includes(nombre.toLowerCase()));
  const sd = registrosSeccion('Student Dining');
  const bt = registrosSeccion('Beer Tent');
  console.log(`  (Student Dining: ${sd.length} turnos, Beer Tent: ${bt.length} turnos)`);
  ok(sd.length > 0, 'Student Dining tiene turnos con personal en el Excel');

  // -----------------------------------------------------------------------
  console.log('\n=== 2. Beer Tent: no se importa, pero se conserva ===');
  const cat = (await p.query('SELECT key, is_active FROM schedule_categories WHERE key = $1', ['beer-tent'])).rows[0];
  eq(cat, { key: 'beer-tent', is_active: false }, 'la fila sigue en el catálogo, marcada inactiva');
  const activas = (await api('GET', '/schedule-categories')).data;
  ok(!activas.some(c => c.key === 'beer-tent'), 'no se ofrece en la interfaz');

  // -----------------------------------------------------------------------
  console.log('\n=== 3. Extra Hours: sus actividades ===');
  const eh = activas.filter(c => c.section === 'EXTRA_HOURS');
  ok(eh.some(c => c.key === 'student-dining'), 'Student Dining es una actividad de Extra Hours');
  ok(eh.some(c => c.key === 'character-breakfast'), 'Character Breakfast es una actividad de Extra Hours');
  ok(!eh.some(c => c.key === 'beer-tent'), 'Beer Tent ya NO es una actividad de Extra Hours');

  // -----------------------------------------------------------------------
  console.log('\n=== 4. Importar un turno de Student Dining ===');
  // Se toma un turno real del Excel y se importa con la fecha de prueba.
  const fila = sd[0];
  const emps = (await api('GET', '/employees')).data;
  const emp = emps.find(e => String(e.name).toLowerCase() === String(fila.employee_name).toLowerCase());
  ok(emp, `el empleado del Excel existe en la app: ${fila.employee_name}`);

  const val = await api('POST', '/import/validate', {
    rows: [{
      __index: 0, kind: 'schedule',
      employee_id: emp.id, location_id: 'Student Dining',
      work_date: FECHA, start_time: fila.start_time, end_time: fila.end_time,
      role: fila.role || 'Server'
    }],
    source: 'excel', target_type: 'foods'
  });
  eq(val.status, 200, 'el preview acepta la fila');
  const vrow = val.data.rows && val.data.rows[0];
  ok(vrow, 'el preview devuelve la fila normalizada');
  eq(vrow.issues.map(i => i.code), [], 'SIN errores: antes salía location_not_found');
  eq(vrow.normalized.location_id, null, 'no se inventa una location');
  eq(vrow.normalized.category, 'student-dining', 'se clasifica en la categoría student-dining');
  eq(vrow.normalized.assignment_type, 'EXTRA_HOURS', 'con tipo EXTRA_HOURS');
  eq(H(vrow.normalized.start_time), H(fila.start_time), 'conserva la hora de inicio');
  eq(H(vrow.normalized.end_time), H(fila.end_time), 'conserva la hora de fin');

  const com = await api('POST', '/import/commit', {
    rows: [{
      __index: 0, kind: 'schedule',
      employee_id: emp.id, location_id: 'Student Dining',
      work_date: FECHA, start_time: fila.start_time, end_time: fila.end_time,
      role: fila.role || 'Server'
    }],
    file_name: 'prueba-secciones.xlsx', source: 'excel', target_type: 'foods'
  });
  eq(com.status, 200, 'el commit responde');
  // El commit devuelve el resumen plano (no envuelto en "summary").
  const res1 = com.data.summary || com.data;
  ok(res1.imported >= 1, 'importa ' + res1.imported + ' fila(s)');
  const id = (res1.inserted || [])[0] && res1.inserted[0].id;
  ok(id, 'devuelve el id de la asignación creada');
  creados.push(id);

  // -----------------------------------------------------------------------
  console.log('\n=== 5. Se ve en Extra Hours con nombre, actividad, fecha y horas ===');
  const guardada = (await p.query(
    `SELECT a.id, a.work_date::text d, a.start_time::text s, a.end_time::text e,
            a.assignment_type, a.category, a.location_id, e.name AS empleado,
            sc.name_es AS seccion
       FROM assignments a
       JOIN employees e ON e.id = a.employee_id
       LEFT JOIN schedule_categories sc ON sc.key = a.category
      WHERE a.id = $1`, [id])).rows[0];
  ok(guardada, 'la asignación existe');
  eq(guardada.empleado, emp.name, 'guarda el nombre del empleado');
  eq(guardada.seccion, 'Student Dining', 'se lee como la actividad "Student Dining"');
  eq(guardada.d, FECHA, 'guarda la fecha');
  eq({ s: H(guardada.s), e: H(guardada.e) },
     { s: H(fila.start_time), e: H(fila.end_time) }, 'guarda las horas del turno');
  eq(guardada.location_id, null, 'no tiene location (es una sección, no un sitio)');

  const enEseDia = (await api('GET', `/assignments?date=${FECHA}`)).data || [];
  const vista = Array.isArray(enEseDia) ? enEseDia.find(a => a.id === id) : null;
  ok(vista, 'aparece en el horario de SU fecha');
  eq(vista.section_name, 'Student Dining', 'el horario lo etiqueta con el nombre de la actividad');
  eq(vista.employee_name, emp.name, 'con el nombre del empleado');

  // -----------------------------------------------------------------------
  console.log('\n=== 6. La fecha se respeta ===');
  const otroDia = (await api('GET', '/assignments?date=2099-11-21')).data || [];
  const fuera = Array.isArray(otroDia) ? otroDia.filter(a => a.id === id) : [];
  eq(fuera.length, 0, 'NO aparece en el reporte de otro día');

  // -----------------------------------------------------------------------
  console.log('\n=== 7. NO hay una segunda asignación: la original es la fuente ===');
  const misma = (await p.query(
    `SELECT count(*)::int n FROM assignments
      WHERE employee_id = $1 AND work_date = $2 AND category = 'student-dining'`,
    [emp.id, FECHA])).rows[0].n;
  eq(misma, 1, 'exactamente 1 fila para ese empleado/fecha/actividad');
  const global = (await p.query(
    'SELECT count(*)::int n FROM assignments WHERE work_date = $1', [FECHA])).rows[0].n;
  eq(global, 1, 'y en total 1 fila en esa fecha (no se duplicó en otra tabla)');

  // -----------------------------------------------------------------------
  console.log('\n=== 8. Importar el MISMO Excel otra vez no duplica ===');
  const com2 = await api('POST', '/import/commit', {
    rows: [{
      __index: 0, kind: 'schedule',
      employee_id: emp.id, location_id: 'Student Dining',
      work_date: FECHA, start_time: fila.start_time, end_time: fila.end_time,
      role: fila.role || 'Server'
    }],
    file_name: 'prueba-secciones.xlsx', source: 'excel', target_type: 'foods'
  });
  const res2 = com2.data.summary || com2.data;
  ok(res2.duplicates >= 1, 'lo marca como duplicado (' + res2.duplicates + ')');
  eq(res2.imported, 0, 'no importa nada nuevo');
  const trasDuplicar = (await p.query(
    'SELECT count(*)::int n FROM assignments WHERE work_date = $1', [FECHA])).rows[0].n;
  eq(trasDuplicar, 1, 'sigue habiendo 1 sola fila');

  // -----------------------------------------------------------------------
  console.log('\n=== 9. Cambiar la asignación original se refleja ===');
  const upd = await api('PUT', '/assignments/' + id, {
    location_id: null, employee_id: emp.id, work_date: FECHA,
    start_time: '05:30', end_time: '09:00',
    assignment_type: 'EXTRA_HOURS', category: 'student-dining', role: 'Server'
  });
  eq(upd.status, 200, 'se puede modificar');
  const tras = (await api('GET', `/assignments?date=${FECHA}`)).data;
  const vista2 = Array.isArray(tras) ? tras.find(a => a.id === id) : null;
  eq({ s: H(vista2.start_time), e: H(vista2.end_time) }, { s: '05:30', e: '09:00' },
     'el horario muestra las horas nuevas');
  eq(vista2.section_name, 'Student Dining', 'sigue siendo Student Dining');
  eq((Array.isArray(tras) ? tras.length : 0), 1, 'sigue siendo UNA sola asignación');

  // -----------------------------------------------------------------------
  console.log('\n=== 10. Borrar la original retira su reflejo ===');
  await api('DELETE', '/assignments/' + id);
  const queda = (await p.query('SELECT count(*)::int n FROM assignments WHERE id = $1', [id])).rows[0].n;
  eq(queda, 0, 'la asignación ya no está');
  const enHorario = (await api('GET', `/assignments?date=${FECHA}`)).data || [];
  eq((Array.isArray(enHorario) ? enHorario.length : 0), 0, 'no queda nada en Extra Hours: no había copia que limpiar');

  // -----------------------------------------------------------------------
  console.log('\n=== 11. Character Breakfast también ===');
  const val2 = await api('POST', '/import/validate', {
    rows: [{
      __index: 0, kind: 'schedule', employee_id: emp.id,
      location_id: 'Character Breakfast', work_date: FECHA,
      start_time: '07:00', end_time: '09:00', role: 'Server'
    }],
    source: 'excel', target_type: 'foods'
  });
  const v2 = val2.data.rows && val2.data.rows[0];
  eq(v2.issues.map(i => i.code), [], 'Character Breakfast también se reconoce');
  eq(v2.normalized.category, 'character-breakfast', 'clasificado en character-breakfast');
  eq(v2.normalized.assignment_type, 'EXTRA_HOURS', 'como parte de Extra Hours');

  // -----------------------------------------------------------------------
  console.log('\n=== 12. Beer Tent se descarta en vez de dar error ===');
  const val3 = await api('POST', '/import/validate', {
    rows: [{
      __index: 0, kind: 'schedule', employee_id: emp.id,
      location_id: 'Beer Tent', work_date: FECHA,
      start_time: '17:00', end_time: '22:00', role: 'Server'
    }],
    source: 'excel', target_type: 'foods'
  });
  const v3 = val3.data.rows && val3.data.rows[0];
  eq(v3.status, 'skipped', 'la fila se marca como "no se importa"');
  eq(v3.issues.map(i => i.code), ['section_hidden'], 'con su motivo, no como error del Excel');
  eq(v3.issues.some(i => i.code === 'location_not_found'), false, 'NO se queja de location desconocida');

  const com3 = await api('POST', '/import/commit', {
    rows: [{
      __index: 0, kind: 'schedule', employee_id: emp.id,
      location_id: 'Beer Tent', work_date: FECHA,
      start_time: '17:00', end_time: '22:00', role: 'Server'
    }],
    file_name: 'prueba-beer.xlsx', source: 'excel', target_type: 'foods'
  });
  const res3 = com3.data.summary || com3.data;
  eq(res3.imported, 0, 'no se importa nada de Beer Tent');
  ok((res3.skipped || 0) >= 1, 'lo cuenta como omitido');
  const beerRows = (await p.query('SELECT count(*)::int n FROM assignments WHERE work_date = $1', [FECHA])).rows[0].n;
  eq(beerRows, 0, 'no queda ninguna fila de Beer Tent');

  // -----------------------------------------------------------------------
  console.log('\n=== 13. Limpieza e integridad ===');
  for (const x of creados) if (x) await api('DELETE', '/assignments/' + x);
  const sobra = (await p.query('SELECT count(*)::int n FROM assignments WHERE work_date = $1', [FECHA])).rows[0].n;
  eq(sobra, 0, 'no queda ninguna asignación de prueba');

  const foto = {};
  for (const t of ['employees', 'locations', 'assignments', 'employee_trainings', 'schedule_categories'])
    foto[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
  console.log('  ' + JSON.stringify(foto));

  console.log('\n' + '='.repeat(64));
  console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
  if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
  console.log('='.repeat(64));
  await p.end();
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error('ERROR:', e); process.exitCode = 1; });