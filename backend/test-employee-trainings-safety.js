// Prueba de que el PUT /employees ya NO destruye capacitaciones.
const BASE = 'http://localhost:3002/api/foods';

const get = async (id) => {
  const emps = await (await fetch(BASE + '/employees')).json();
  return emps.find((e) => e.id === id);
};

(async () => {
  let pass = 0, fail = 0;
  const ok = (v, m) => { if (v) { pass++; console.log('  OK   ' + m); } else { fail++; console.log('  FAIL ' + m); } };

  // Se usa un empleado con muitas capacitaciones: Oriana Mendoza (id 21, 82).
  const antes = await get(21);
  const nAntes = (antes.trainings || []).length;
  console.log('  Oriana Mendoza tiene ' + nAntes + ' capacitaciones\n');

  const base = {
    name: antes.name, nationality: antes.nationality, age: antes.age,
    role: antes.role, group_id: antes.group_id,
    hire_date: (antes.hire_date || '').slice(0, 10)
  };
  const put = async (extra) => {
    const r = await fetch(BASE + '/employees/21', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({}, base, extra))
    });
    return { status: r.status, ok: r.ok };
  };

  // 1) PUT sin mencionar trainings -> no debe tocarlas
  await put({ ops_group: 'front_ops' });
  const tras1 = await get(21);
  ok((tras1.trainings || []).length === nAntes,
     'PUT sin "trainings" conserva las ' + nAntes + ' capacitaciones');
  ok(tras1.ops_group === 'front_ops', 'PUT sin "trainings" si guarda ops_group');

  // 2) PUT con la lista tal cual (ida y vuelta del GET)
  await put({ trainings: (antes.trainings || []).filter(Boolean) });
  const tras2 = await get(21);
  ok((tras2.trainings || []).length === nAntes, 'ida y vuelta del GET no pierde ninguna');

  // 3) PUT que quita 1 capacitacion -> quita exactamente 1
  const menosUna = (antes.trainings || []).filter(Boolean).slice(0, -1);
  await put({ trainings: menosUna });
  const tras3 = await get(21);
  ok((tras3.trainings || []).length === nAntes - 1, 'quitar 1 quita exactamente 1');
  ok((tras3.trainings || []).every((t) => menosUna.includes(t)), 'no queda ninguna de más');

  // 4) Restaurar
  await put({ trainings: (antes.trainings || []).filter(Boolean), ops_group: null });
  const tras4 = await get(21);
  ok((tras4.trainings || []).length === nAntes, 'restaurado a ' + nAntes + ' capacitaciones');
  ok(tras4.ops_group === null, 'ops_group restaurado a NULL');

  console.log('\n  ' + pass + ' pasaron, ' + fail + ' fallaron');
  process.exit(fail ? 1 : 0);
})();