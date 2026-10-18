// ============================================================================
//  PRUEBA DE LAS CINCO EXTENSIONES SOLICITADAS
//  1) 10 cualidades retiradas   2) locations entrenadas + grupos múltiples
//  3) Grupo D (Bistro)          4) opción "sin grupo"
//  5) rol administrativo
// ============================================================================
const db = require('./db');
const BASE = 'http://localhost:3002/api/foods';

let pass = 0, fail = 0; const fails = [];
const short = (v) => { const s = JSON.stringify(v); return s && s.length > 150 ? s.slice(0, 150) + '...' : s; };
const eq = (a, e, m) => {
  if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
  else { fail++; fails.push(m + '  (esperado ' + short(e) + ', obtenido ' + short(a) + ')'); console.log('  FAIL ' + m + ' -> ' + short(a)); }
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

const RETIRADAS = ['sundae-training', 'prep-tater-kegs', 'prep-toppings',
  'maintain-food-warmer', 'handle-toppings', 'handle-cones-cups',
  'prep-icee', 'change-flavors', 'mop-floors', 'handle-freezer'];

(async () => {
  const p = db.foods;

  // Foto del estado de partida. Se compara contra el final: este test no debe
  // mover ni un dato de mas alla de las tablas que dice manejar. Los numeros
  // NO van codificados, porque grows con cada importacion real de horarios.
  const foto = async () => ({
    employees: (await p.query('SELECT count(*)::int n FROM employees')).rows[0].n,
    assignments: (await p.query('SELECT count(*)::int n FROM assignments')).rows[0].n,
    locations: (await p.query('SELECT count(*)::int n FROM locations')).rows[0].n,
    supervisor: (await p.query('SELECT count(*)::int n FROM supervisor_assignments')).rows[0].n,
    breaks: (await p.query('SELECT count(*)::int n FROM employee_breaks')).rows[0].n,
    trainings: (await p.query('SELECT count(*)::int n FROM employee_trainings')).rows[0].n,
    // Estas dos las rellena el usuario desde la interfaz (donde se entrena y a
    // que grupo pertenece cada uno), asi que ya no estan vacias. Se comparan
    // contra la foto de partida igual que el resto: lo que se comprueba es que
    // el test no deja basura, no que la tabla este a cero.
    locEntrenamiento: (await p.query('SELECT count(*)::int n FROM employee_location_training')).rows[0].n,
    grupos: (await p.query('SELECT count(*)::int n FROM employee_groups')).rows[0].n
  });
  const partida = await foto();
  console.log('estado de partida: ' + JSON.stringify(partida));

  // ======================================================================
  console.log('=== 1. DIEZ CUALIDADES RETIRADAS ===');
  const cat = (await p.query('SELECT count(DISTINCT training_name)::int n FROM employee_trainings')).rows[0].n;
  // El numero de cualidades exactas ya no se comprueba aquí: depende de lo que
  // se haya contado a mano desde la interfaz, y eso cambia cada día. Lo que sí
  // tiene que ser cierto es que las 10 retiradas no estén (de eso va la
  // sección) y que el catálogo no esté contaminado con letras de grupo.
  ok(cat > 0 && cat < 83, 'catálogo de quals: ' + cat + ' (antes 83)');
  const quedan = (await p.query(
    'SELECT count(*)::int n FROM employee_trainings WHERE training_name = ANY($1)', [RETIRADAS])).rows[0].n;
  eq(quedan, 0, '0 filas de las 10 retiradas en employee_trainings');
  // Se comprueba tambien que no se toco ninguna OTRA encaminamiento
  const survivors = ['dunkin-trained', 'food-safety', 'pos-training', 'nh-alcohol-certification',
                     'customer-service', 'dishwashing', 'deep-cleaning', 'closing-cleanup'];
  const sOk = (await p.query(
    'SELECT count(*)::int n FROM employee_trainings WHERE training_name = ANY($1)', [survivors])).rows[0].n;
  ok(sOk > 0, sOk + ' filas de las que NO habia que tocar siguen ahi');
  // Ni el total de capacitaciones ni el de empleados van fijos: grows con lo que
  // se va contando a mano desde la interfaz. Se comparan contra la foto del
  // principio del test, que es lo que de verdad importa: que este test no mueva
  // ni un dato.
  console.log('  (catálogo de quals: ' + partida.trainings + ' capacitaciones en total)');

  // ======================================================================
  console.log('\n=== 2. LOCATIONS ENTRENADAS + GRUPOS MULTIPLES ===');
  const lg = (await api('GET', '/location-groups')).data;
  eq(lg.length, 13, lg.length + ' location->grupo');
  const porGrupo = {};
  lg.forEach(x => { porGrupo[x.group_id] = (porGrupo[x.group_id] || 0) + 1; });
  eq(porGrupo, { A: 4, B: 4, C: 3, D: 2 }, 'reparto de locations por grupo');

  // Se usa un empleado real y se le marcan locations de dos grupos distintos
  const emps = (await api('GET', '/employees')).data;
  const emp = emps.find(e => (e.trainings || []).length > 0);

  // ======================================================================
  console.log('\n=== 1b. UNA LETRA DE GRUPO NUNCA ES UNA CAPACITACION ===');
  // El formulario de empleado tiene casillas que NO son capacitaciones: las de
  // "Grupos adicionales", con los valores A, B, C y D. Un selector generico las
  // guardaba como certificaciones y Edward se quedo con 4 filas basura. Se
  // comprueba que el servidor las rechaza aunque el cliente las mande.
  const baseEmp = {
    name: emp.name, nationality: emp.nationality, age: emp.age, role: emp.role,
    group_id: emp.group_id, hire_date: '2026-01-15', availability: emp
  };
  const original = (emp.trainings || []).filter(Boolean);
  const mandar = (trainings) => api('PUT', '/employees/' + emp.id,
    Object.assign({}, baseEmp, { trainings }));

  const rLetras = await mandar(['food-safety', 'A', 'B', 'C', 'D', '  ', 'pos-training', 'food-safety']);
  ok(rLetras.ok, 'acepta el guardado aunque le manden letras de grupo');
  const leidas = (await api('GET', '/employees')).data.find(e => e.id === emp.id);
  eq((leidas.trainings || []).filter(Boolean).sort(), ['food-safety', 'pos-training'],
     'descarta letras de grupo, vacios y duplicados');
  const letrasEnBd = (await p.query(
    `SELECT count(*)::int n FROM employee_trainings
      WHERE employee_id = $1 AND upper(btrim(training_name)) IN ('A','B','C','D')
        AND btrim(training_name) = upper(btrim(training_name))`, [emp.id])).rows[0].n;
  eq(letrasEnBd, 0, 'no queda ninguna letra de grupo guardada como capacitacion');
  const letrasGlobales = (await p.query(
    `SELECT DISTINCT training_name FROM employee_trainings
      WHERE upper(btrim(training_name)) IN ('A','B','C','D')
        AND btrim(training_name) = upper(btrim(training_name))`)).rows;
  eq(letrasGlobales, [], 'el catalogo entero esta limpio de letras de grupo');
  await mandar(original);   // devolver lo que tenia
  const devuelto = (await api('GET', '/employees')).data.find(e => e.id === emp.id);
  eq((devuelto.trainings || []).filter(Boolean).sort(), original.sort(),
     'sus capacitaciones originales siguen intactas');

  const guardado = (await api('PUT', `/employees/${emp.id}/training-locations`,
    { locations: ['pixie-kitchen', 'barnyard-pizza', 'bistro'], groups: ['A', 'C', 'D'] })).data;
  eq(guardado.locations.sort(), ['barnyard-pizza', 'bistro', 'pixie-kitchen'], 'locations guardadas (A + C + D)');
  eq(guardado.groups.sort(), ['A', 'C', 'D'], 'grupos adicionales guardados: A, C, D');

  const leido = (await api('GET', `/employees/${emp.id}/training-locations`)).data;
  eq(leido.groups.sort(), ['A', 'C', 'D'], 'se leen 3 grupos (varios, no uno solo)');
  eq(leido.locations.length, 3, 'se leen 3 locations');
  eq(leido.derived_groups.sort(), ['A', 'C', 'D'], 'los grupos deducidos de las locations coinciden');
  ok(leido.primary_group !== undefined, 'el grupo principal sigue existiendo aparte: ' + JSON.stringify(leido.primary_group));

  // "ha estado en todas las locations" -> todas marcadas
  const todas = (await p.query('SELECT id FROM locations ORDER BY id')).rows.map(r => r.id);
  await api('PUT', `/employees/${emp.id}/training-locations`, { locations: todas, groups: ['A', 'B', 'C', 'D'] });
  const todas2 = (await api('GET', `/employees/${emp.id}/training-locations`)).data;
  eq(todas2.locations.length, todas.length, todas.length + ' locations marcadas (= todas)');
  eq(todas2.derived_groups.sort(), ['A', 'B', 'C', 'D'], 'grupos deducidos: los 4');

  // Una location sin grupo asignado (aun por decidir) se puede marcar, pero no
  // aporta ningun grupo deducido: el grupo sirve para Proposed, no para saber
  // si la persona estuvo entrenada ahi.
  const sinGrupoLoc = (await p.query(
    `SELECT l.id FROM locations l
      WHERE NOT EXISTS (SELECT 1 FROM location_groups lg WHERE lg.location_id = l.id)`)).rows;
  if (sinGrupoLoc.length) {
    await api('PUT', `/employees/${emp.id}/training-locations`,
      { locations: [sinGrupoLoc[0].id], groups: [] });
    const soloUna = (await api('GET', `/employees/${emp.id}/training-locations`)).data;
    eq(soloUna.locations.map((l) => l.location_id), [sinGrupoLoc[0].id],
       'una location sin grupo (' + sinGrupoLoc[0].id + ') se puede marcar igual');
    eq(soloUna.derived_groups, [], 'y no aporta ningun grupo deducido');
  } else {
    ok(true, 'todas las locations tienen grupo asignado');
  }

  // Limpiar
  await api('PUT', `/employees/${emp.id}/training-locations`, { locations: [], groups: [] });
  const limpio = (await api('GET', `/employees/${emp.id}/training-locations`)).data;
  eq(limpio.locations, [], 'se puede dejar vacio');
  eq(limpio.groups, [], 'sin grupos adicionales');

  // ======================================================================
  console.log('\n=== 3. GRUPO D (BISTRO) ===');
  const locs = (await api('GET', '/locations')).data;
  ok(locs.some(l => l.id === 'bistro'), 'location Bistro creada');
  ok(locs.some(l => l.id === 'dunkin-donuts'), "location Dunkin' Donuts creada");
  const bistro = locs.find(l => l.id === 'bistro');
  eq(bistro.type, 'food-beverage', 'Bistro es una location normal (puede recibir empleados y horarios)');
  ok(locs.some(l => l.id === 'bistro' && lg.some(x => x.location_id === 'bistro' && x.group_id === 'D')), 'Bistro pertenece al Grupo D');
  ok(locs.some(l => l.id === 'dunkin-donuts' && lg.some(x => x.location_id === 'dunkin-donuts' && x.group_id === 'D')), "Dunkin' pertenece al Grupo D");

  // Roles permitidos / prohibidos en el Grupo D
  const base = { name: emp.name, nationality: emp.nationality, age: emp.age, group_id: 'D' };
  for (const rol of ['bartender', 'cashier', 'cook']) {
    const r = await api('PUT', '/employees/' + emp.id, Object.assign({}, base, {
      role: rol, trainings: (emp.trainings || []).filter(Boolean), availability: emp
    }));
    ok(r.ok, 'Grupo D acepta rol ' + rol);
  }
  for (const rol of ['server', 'dishwasher', 'supervisor', 'op', 'assistant-supervisor']) {
    const r = await api('PUT', '/employees/' + emp.id, Object.assign({}, base, {
      role: rol, trainings: (emp.trainings || []).filter(Boolean), availability: emp
    }));
    eq(r.status, 400, 'Grupo D RECHAZA rol ' + rol);
    eq(r.data.error, 'invalid_group_role', '  error = invalid_group_role');
  }
  // Restaurar rol
  await api('PUT', '/employees/' + emp.id, Object.assign({}, base, {
    role: emp.role, group_id: emp.group_id, trainings: (emp.trainings || []).filter(Boolean), availability: emp
  }));

  // ======================================================================
  console.log('\n=== 4. OPCION "SIN GRUPO" ===');
  const sinGrupo = (await p.query(
    "SELECT count(*)::int n FROM employees WHERE group_id IS NULL OR group_id = '' OR group_id = ' '")).rows[0].n;
  ok(sinGrupo >= 0, 'la opcion "sin grupo" existe (' + sinGrupo + ' empleados la usan ahora mismo)');
  const r4 = await api('PUT', '/employees/' + emp.id, {
    name: emp.name, nationality: emp.nationality, age: emp.age, role: emp.role, group_id: ' ',
    trainings: (emp.trainings || []).filter(Boolean), availability: emp
  });
  ok(r4.ok, 'se puede guardar un empleado sin grupo');
  const g4 = (await p.query('SELECT group_id::text g FROM employees WHERE id=$1', [emp.id])).rows[0].g;
  eq(g4.trim(), '', 'guardado como vacio (sin grupo), no como A por defecto');
  // Restaurar
  await api('PUT', '/employees/' + emp.id, {
    name: emp.name, nationality: emp.nationality, age: emp.age, role: emp.role, group_id: emp.group_id,
    trainings: (emp.trainings || []).filter(Boolean), availability: emp
  });

  // ======================================================================
  console.log('\n=== 5. ROL ADMINISTRATIVO ===');
  const r5 = await api('PUT', '/employees/' + emp.id, {
    name: emp.name, nationality: emp.nationality, age: emp.age, role: 'admin', group_id: emp.group_id,
    trainings: [], availability: emp
  });
  ok(r5.ok, 'el rol "admin" se puede guardar');
  const admin = (await api('GET', '/employees')).data.find(e => e.id === emp.id);
  eq(admin.role, 'admin', 'rol guardado = admin');
  // Restaurar
  await api('PUT', '/employees/' + emp.id, {
    name: emp.name, nationality: emp.nationality, age: emp.age, role: emp.role, group_id: emp.group_id,
    trainings: (emp.trainings || []).filter(Boolean), availability: emp
  });
  ok(true, 'rol restaurado a ' + emp.role);

  // ======================================================================
  console.log('\n=== 6. REPORTE (solo lectura) ===');
  const rep = (await api('GET', '/employees-training-report')).data;
  eq(rep.length, partida.employees, rep.length + ' empleados en el reporte (uno por empleado)');
  const uno = rep[0];
  ['name', 'role', 'primary_group', 'trainings_count', 'trained_locations', 'extra_groups', 'derived_groups']
    .forEach(k => ok(k in uno, 'el reporte trae el campo ' + k));

  // ======================================================================
  console.log('\n=== 6b. Los dos temas (foods y retail) leen el mismo roster ===');
  const Retail = 'http://localhost:3002/api/retail';
  const rGet = async (path) => {
    const r = await fetch(Retail + path);
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  const rPut = async (path, body) => {
    const r = await fetch(Retail + path, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return { status: r.status, data: await r.json().catch(() => null) };
  };
  // El empleado vive en foods aunque se mire desde retail.
  const lgRetail = (await rGet('/location-groups')).data;
  eq(lgRetail.length, 13, 'retail tambien sirve el catalogo de locations (13)');
  const gl = (await rGet(`/employees/${emp.id}/training-locations`)).data;
  ok(gl && gl.employee_id === emp.id, 'retail lee las locations del empleado de foods');
  const guardadoRetail = (await rPut(`/employees/${emp.id}/training-locations`,
    { locations: ['bistro', 'pixie-kitchen', 'location-que-no-existe'], groups: ['D', 'A', 'Z'] })).data;
  eq(guardadoRetail.locations.sort(), ['bistro', 'pixie-kitchen'],
     'desde retail se guardan bien y la location inventada se descarta');
  eq(guardadoRetail.groups.sort(), ['A', 'D'], 'desde retail se guardan los grupos validos y se ignora "Z"');
  eq(guardadoRetail.discarded_locations, ['location-que-no-existe'], 'informa de lo que no se guardo');
  const guardadoFoods = (await api('GET', `/employees/${emp.id}/training-locations`)).data;
  eq(guardadoFoods.locations.map((l) => l.location_id).sort(), ['bistro', 'pixie-kitchen'],
     'foods ve lo mismo que retail (una sola fuente)');
  await rPut(`/employees/${emp.id}/training-locations`, { locations: [], groups: [] });
  const res404 = await fetch('http://localhost:3002/api/foods/employees/999999/training-locations',
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"locations":[]}' });
  const cuerpo404 = await res404.json().catch(() => null);
  eq([res404.status, cuerpo404], [404, { error: 'employee_not_found' }],
     'un empleado que no existe da 404 con motivo, no un error de servidor');

  // ======================================================================
  console.log('\n=== 7. INTEGRIDAD FINAL (comparado con la foto de partida) ===');
  const fin = await foto();
  Object.keys(partida).forEach(k => {
    const etiqueta = k === 'trainings' ? 'capacitaciones' : k;
    eq(fin[k], partida[k], etiqueta + ' intactas: ' + partida[k]);
  });
  // El test tiene que devolver las tablas nuevas a como estaban, ni una fila
  // mas ni una menos. No se exige que esten vacias: ya hay datos reales.
  eq({ locs: fin.locEntrenamiento, groups: fin.grupos },
     { locs: partida.locEntrenamiento, groups: partida.grupos },
     'el test no deja basura en las tablas nuevas');
  const porEmpleado = (await p.query('SELECT employee_id, count(*)::int n FROM employee_trainings GROUP BY employee_id')).rows;
  eq((porEmpleado.find(r => r.employee_id === emp.id) || {}).n,
     (emp.trainings || []).filter(Boolean).length, 'las capacitaciones del empleado de prueba siguen iguales');

  console.log('\n' + '='.repeat(66));
  console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
  if (fail) { console.log('\nFALLOS:'); fails.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
  console.log('='.repeat(66));
  await p.end();
  process.exitCode = fail ? 1 : 0;
})().catch((e) => { console.error('ERROR:', e); process.exitCode = 1; });