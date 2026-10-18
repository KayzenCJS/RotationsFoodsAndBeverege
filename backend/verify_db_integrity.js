// Verificacion final: la base de datos conserva todos los datos originales.
const db = require('./db');

// Las cifras de arriba son la foto DESPUES de la migracion del horario y de
// esta entrega (10 cualidades retiradas + locations/grupos). El catalogo de
// locations crece a proposito (Living Shores, Bistro, Dunkin'), asi que se
// comprueba que las esperadas estan, no que el total sea uno fijo.
// employees y employee_availability NO van fijos a proposito: crecen cada vez
// que se da de alta a alguien desde la interfaz. Lo que no puede pasar es que
// un empleado exista sin su fila de disponibilidad, y eso se comprueba mas
// abajo. El resto de tablas si son de configuracion y se comparan exactas.
const EXPECTED = {
  supervisor_assignments: 50, tasks: 0, employee_breaks: 4,
  location_disables: 6,
  location_required_roles: 26, staffing_rules: 10, work_hours: 0
};

(async () => {
  const p = db.foods;
  console.log('=== foods ===');
  let bad = 0;
  for (const [t, n] of Object.entries(EXPECTED)) {
    const got = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
    const mark = got === n ? 'ok   ' : 'DIF  ';
    if (got !== n) bad++;
    console.log('  ' + mark + t.padEnd(24) + got + '  (esperado ' + n + ')');
  }

  // Tablas que crecen con el uso diario: se avisa del numero, pero no es un
  // error. Lo que si se comprueba es que no haya quedaron a medias.
  const vivos = {};
  for (const t of ['employees', 'employee_availability', 'employee_trainings', 'assignments']) {
    vivos[t] = (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;
    console.log('  ---  ' + t.padEnd(24) + vivos[t] + '  (crece con el uso)');
  }
  const sinDisponibilidad = (await p.query(
    `SELECT count(*)::int n FROM employees e
      WHERE NOT EXISTS (SELECT 1 FROM employee_availability a WHERE a.employee_id = e.id)`)).rows[0].n;
  if (sinDisponibilidad) {
    console.log('  DIF  ' + sinDisponibilidad + ' empleados sin fila de disponibilidad'); bad++;
  } else {
    console.log('  ok   todos los empleados tienen su disponibilidad');
  }
  const catalogoQuals = (await p.query(
    'SELECT count(DISTINCT training_name)::int n FROM employee_trainings')).rows[0].n;
  console.log('  ---  catalogo de quals: ' + catalogoQuals);
  const letras = (await p.query(
    `SELECT count(DISTINCT training_name)::int n FROM employee_trainings
      WHERE upper(btrim(training_name)) IN ('A','B','C','D')
        AND btrim(training_name) = upper(btrim(training_name))`)).rows[0].n;
  if (letras) { console.log('  DIF  ' + letras + ' letras de grupo guardadas como capacitacion'); bad++; }
  else console.log('  ok   sin letras de grupo en las capacitaciones');

  console.log('\n=== catalogo de locations ===');
  const locs = (await p.query('SELECT id, name, type FROM locations ORDER BY id')).rows;
  const esperadas = ['pixie-kitchen', 'food-fair', 'slush-factory', 'teddys-oasis',
    'guard-house-snacks', 'poblano-cantina', 'world-pavilion', 'dutch-village-ice-cream',
    'barnyard-pizza', 'dippin-dots', 'farm-stand',
    'living-shores',            // §5 de la extension del horario
    'bistro', 'dunkin-donuts'];  // Grupo D de esta entrega
  locs.forEach(r => console.log('  ' + r.id.padEnd(20) + r.name.padEnd(24) + r.type));
  const faltan = esperadas.filter(id => !locs.some(l => l.id === id));
  if (faltan.length) { console.log('  ATENCION: faltan ' + faltan.join(', ')); bad++; }
  else console.log('  ok   las ' + esperadas.length + ' esperadas estan (total ' + locs.length + ')');

  console.log('\n=== asignaciones: clasificacion ===');
  const cls = (await p.query(
    `SELECT assignment_type, count(*)::int n,
            count(*) FILTER (WHERE location_id IS NULL)::int sin_location,
            count(*) FILTER (WHERE category IS NULL)::int sin_category
       FROM assignments GROUP BY assignment_type ORDER BY assignment_type`)).rows;
  cls.forEach(r => console.log('  ' + String(r.assignment_type).padEnd(14) + r.n + '  sin location_id=' + r.sin_location + '  sin category=' + r.sin_category));
  // Toda fila debe estar clasificada. LOCATION lleva category = location_id;
  // el resto lleva la seccion correspondiente y no necesita location.
  const malClasificadas = (await p.query(
    `SELECT count(*)::int n FROM assignments
      WHERE category IS NULL
         OR (assignment_type = 'LOCATION' AND category IS DISTINCT FROM location_id)
         OR (assignment_type <> 'LOCATION' AND location_id IS NOT NULL)`)).rows[0].n;
  if (malClasificadas) { console.log('  ATENCION: ' + malClasificadas + ' filas mal clasificadas'); bad++; }
  else console.log('  ok   todas clasificadas: LOCATION con category = location_id, secciones sin location');

  console.log('\n=== estructura nueva ===');
  const cats = (await p.query('SELECT section, count(*)::int n FROM schedule_categories GROUP BY section ORDER BY section')).rows;
  cats.forEach(r => console.log('  ' + r.section.padEnd(16) + r.n + ' categorías'));
  const notes = (await p.query('SELECT count(*)::int n FROM schedule_notes')).rows[0].n;
  console.log('  schedule_notes  ' + notes + ' filas (0 tras la limpieza)');
  if (notes !== 0) { console.log('  ATENCION: quedan notas de prueba'); bad++; }
  const ls = (await p.query("SELECT * FROM locations WHERE id='living-shores'")).rows[0];
  console.log('  Living Shores   ' + (ls ? ls.name + ' / ' + ls.type + ' / ' + ls.category : 'NO EXISTE'));
  if (!ls) bad++;

  console.log('\n=== columnas nuevas (solo aditivas) ===');
  const cols = (await p.query(
    `SELECT table_name, column_name, data_type, column_default
       FROM information_schema.columns WHERE table_schema='public'
        AND ((table_name='assignments' AND column_name IN
              ('assignment_type','category','role','notes','task_id'))
          OR (table_name='employees' AND column_name='ops_group'))
      ORDER BY table_name, column_name`)).rows;
  cols.forEach(c => console.log('  ' + c.table_name + '.' + c.column_name.padEnd(16) + c.data_type + (c.column_default ? '  default=' + c.column_default : '')));
  if (cols.length !== 6) { console.log('  ATENCION: se esperaban 6 columnas nuevas'); bad++; }

  console.log('\n=== empleados sin capacitaciones ===');
  const cero = (await p.query(
    `SELECT e.id, e.name, e.role FROM employees e
      WHERE NOT EXISTS (SELECT 1 FROM employee_trainings et WHERE et.employee_id = e.id)`)).rows;
  cero.forEach(r => console.log('  ' + r.id + '  ' + r.name + '  rol=' + r.role));
  if (!cero.length) console.log('  (ninguno)');

  console.log('\n=== ubicaciones-trained y grupos multiples ===');
  const lg = (await p.query(
    'SELECT group_id, count(*)::int n FROM location_groups GROUP BY 1 ORDER BY 1')).rows;
  lg.forEach(r => console.log('  Grupo ' + r.group_id + ': ' + r.n + ' locations'));
  if (lg.length !== 4) { console.log('  ATENCION: se esperaban los grupos A, B, C y D'); bad++; }
  const lgTablas = {
    employee_location_training: (await p.query('SELECT count(*)::int n FROM employee_location_training')).rows[0].n,
    employee_groups: (await p.query('SELECT count(*)::int n FROM employee_groups')).rows[0].n
  };
  console.log('  registros de entrenamiento por location: ' + lgTablas.employee_location_training);
  console.log('  grupos adicionales asignados: ' + lgTablas.employee_groups);
  // El dominio de group_id y role debe admitir lo que el formulario envia.
  const dominio = (await p.query(
    `SELECT conname, pg_get_constraintdef(oid) def FROM pg_constraint
      WHERE conrelid = 'employees'::regclass AND contype = 'c' ORDER BY conname`)).rows;
  dominio.forEach(c => console.log('  ' + c.conname + '\n      ' + c.def));
  const gdef = (dominio.find(c => c.conname === 'employees_group_id_check') || {}).def || '';
  const rdef = (dominio.find(c => c.conname === 'employees_role_check') || {}).def || '';
  if (!/'D'/.test(gdef) || !/' '::bpchar/.test(gdef)) {
    console.log('  ATENCION: employees_group_id_check no admite el Grupo D ni "sin grupo"'); bad++;
  }
  if (!/admin/.test(rdef)) {
    console.log('  ATENCION: employees_role_check no admite el rol admin'); bad++;
  }

  console.log('\n=== Nostalgia Night y Beer Tent ===');
  const beer = (await p.query('SELECT key, is_active FROM schedule_categories WHERE key = $1', ['beer-tent'])).rows[0];
  if (!beer) { console.log('  ATENCION: la fila de Beer Tent ya no existe (debería conservarse)'); bad++; }
  else if (beer.is_active) { console.log('  ATENCION: Beer Tent sigue activo en la interfaz'); bad++; }
  else console.log('  ok   Beer Tent conservado en el catálogo, pero inactivo (fuera de la interfaz)');
  const beerHist = (await p.query('SELECT count(*)::int n FROM assignments WHERE category = $1', ['beer-tent'])).rows[0].n;
  console.log('  ---  asignaciones históricas de Beer Tent conservadas: ' + beerHist);

  const nostalgia = (await p.query(
    `SELECT key, name_es, sort_order FROM schedule_categories
      WHERE section = 'NOSTALGIA_NIGHT' AND is_active ORDER BY sort_order`)).rows;
  if (!nostalgia.length) { console.log('  ATENCION: Nostalgia Night no tiene actividades'); bad++; }
  else nostalgia.forEach(c => console.log('  ok   Nostalgia Night / ' + c.key + ' (' + c.name_es + ')'));
  const nostalgiaAsg = (await p.query(
    `SELECT count(*)::int n FROM assignments WHERE assignment_type = 'NOSTALGIA_NIGHT'`)).rows[0].n;
  console.log('  ---  turnos de Nostalgia Night guardados: ' + nostalgiaAsg);

  // ------------------------------------------------------------------------
  //  Modulo de inspecciones: que las relaciones sigan siendo verdad.
  // ------------------------------------------------------------------------
  console.log('\n=== Modulo de inspecciones ===');

  // 1) Toda inspeccion con hallazgos debe tener su locacion puesta. Antes de la
  //    migracion la dedujo de los hallazgos; si aparece una sin locacion y sin
  //    hallazgos, es una inspeccion real sin relacionar (no un fallo).
  const sinLoc = (await p.query(
    `SELECT count(*)::int n FROM inspections i
      WHERE i.location_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM inspection_findings f
                         WHERE f.inspection_id = i.id AND f.location_id IS NOT NULL)`)).rows[0].n;
  const conHallazgos = (await p.query('SELECT count(*)::int n FROM inspections')).rows[0].n;
  console.log('  ---  inspecciones: ' + conHallazgos + ', de ellas ' + sinLoc + ' sin locacion (ninguna tiene hallazgos)');

  // 2) Ningun hallazgo puede quedar en una locacion que no sea la de su
  //    inspeccion: es la incoherencia que mas caro sale.
  const descuadradas = (await p.query(
    `SELECT count(*)::int n FROM inspection_findings f
       JOIN inspections i ON i.id = f.inspection_id
      WHERE f.location_id IS DISTINCT FROM i.location_id`)).rows[0].n;
  if (descuadradas) {
    console.log('  ATENCION: ' + descuadradas + ' hallazgo(s) en una locacion distinta de la de su inspeccion');
    (await p.query(
      `SELECT f.id, f.inspection_id, f.location_id AS hall_loc, i.location_id AS insp_loc
         FROM inspection_findings f JOIN inspections i ON i.id = f.inspection_id
        WHERE f.location_id IS DISTINCT FROM i.location_id LIMIT 5`)).rows
      .forEach(r => console.log('      hallazgo ' + r.id + ': ' + r.hall_loc + ' vs ' + r.insp_loc));
    bad++;
  } else console.log('  ok   ningun hallazgo en una locacion distinta de la de su inspeccion');

  // 3) Las locaciones referenciadas tienen que existir de verdad.
  const locHuefanas = (await p.query(
    `SELECT count(*)::int n FROM inspection_findings f
      WHERE f.location_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = f.location_id)`)).rows[0].n;
  const locInspHuefanas = (await p.query(
    `SELECT count(*)::int n FROM inspections i
      WHERE i.location_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = i.location_id)`)).rows[0].n;
  if (locHuefanas || locInspHuefanas) {
    console.log('  ATENCION: ' + (locHuefanas + locInspHuefanas) + ' referencia(s) a una locacion inexistente');
    bad++;
  } else console.log('  ok   todas las locaciones referenciadas existen');

  // 4) Correcciones sin hallazgo, o de un hallazgo retirado.
  const corrHuerfanas = (await p.query(
    `SELECT count(*)::int n FROM corrections c
      WHERE NOT EXISTS (SELECT 1 FROM inspection_findings f WHERE f.id = c.finding_id)`)).rows[0].n;
  if (corrHuerfanas) { console.log('  ATENCION: ' + corrHuerfanas + ' correccion(es) sin hallazgo'); bad++; }
  else console.log('  ok   toda correccion cuelga de un hallazgo real');

  // 5) El borrado logico: lo retirado no aparece, pero la fila sigue ahi.
  const borrados = (await p.query('SELECT count(*)::int n FROM inspection_findings WHERE deleted_at IS NOT NULL')).rows[0].n;
  console.log('  ---  hallazgos retirados de la vista (borrado logico): ' + borrados);

  // 6) Los catalogos no pueden tener duplicados por mayusculas o espacios.
  const catsDupes = (await p.query(
    `SELECT count(*)::int n FROM (
       SELECT lower(btrim(name)) FROM finding_categories GROUP BY lower(btrim(name)) HAVING count(*) > 1
     ) x`)).rows[0].n;
  if (catsDupes) { console.log('  ATENCION: ' + catsDupes + ' categoria(s) de hallazgo duplicada(s)'); bad++; }
  else console.log('  ok   sin categorias de hallazgo duplicadas');

  // 7) Un hallazgo retirado no puede seguir contando correcciones vivas.
  const contadoresMal = (await p.query(
    `SELECT count(*)::int n FROM inspection_findings f
      WHERE f.corrections <> (SELECT count(*)::int FROM corrections c
                               WHERE c.finding_id = f.id AND c.deleted_at IS NULL)`)).rows[0].n;
  if (contadoresMal) { console.log('  ATENCION: ' + contadoresMal + ' hallazgo(s) con el contador de correcciones desfasado'); bad++; }
  else console.log('  ok   contadores de correcciones al día');

  // ------------------------------------------------------------------------
  //  Inspectores: entidad propia, separada de los empleados.
  // ------------------------------------------------------------------------
  console.log('\n=== Inspectores ===');

  // 1) Ningun inspector puede coincidir con un empleado. Si coincidiera, el campo
  //    habria vuelto a mirar la tabla de empleados por la puerta de atras.
  const solapados = (await p.query(
    `SELECT count(*)::int n FROM inspectors x
      WHERE EXISTS (SELECT 1 FROM employees e WHERE lower(btrim(e.name)) = lower(btrim(x.name)))`)).rows[0].n;
  if (solapados) { console.log('  ATENCION: ' + solapados + ' inspector(es) con el mismo nombre que un empleado'); bad++; }
  else console.log('  ok   ningun inspector coincide con un empleado');

  // 2) Duplicados por mayusculas o espacios: el indice unico lo impide, pero se
  //    comprueba por si el indice se llegara a quitar.
  const inspectoresDupes = (await p.query(
    `SELECT count(*)::int n FROM (
       SELECT lower(btrim(name)) FROM inspectors GROUP BY lower(btrim(name)) HAVING count(*) > 1
     ) d`)).rows[0].n;
  if (inspectoresDupes) { console.log('  ATENCION: ' + inspectoresDupes + ' inspector(es) duplicado(s)'); bad++; }
  else console.log('  ok   sin inspectores duplicados');

  // 3) Toda inspeccion con inspector registrado debe tener su nombre guardado.
  //    Las antiguas pueden no tenerlo: es lo que se conserva tal cual.
  const sinNombre = (await p.query(
    `SELECT count(*)::int n FROM inspections i
      WHERE i.inspector_id IS NOT NULL
        AND (i.inspector_name IS NULL OR btrim(i.inspector_name) = '')
        AND EXISTS (SELECT 1 FROM inspectors x WHERE x.id = i.inspector_id)`)).rows[0].n;
  if (sinNombre) { console.log('  ATENCION: ' + sinNombre + ' inspeccion(es) con inspector registrado pero sin nombre guardado'); bad++; }
  else console.log('  ok   toda inspeccion con inspector registrado tiene su nombre');

  // 4) La serie de ids nunca puede pisar un id de la epoca de los empleados.
  const maxHuerfano = (await p.query(
    `SELECT count(*)::int n, COALESCE(max(i.inspector_id), 0) AS mx FROM inspections i
      WHERE i.inspector_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM inspectors x WHERE x.id = i.inspector_id)`)).rows[0];
  const siguiente = (await p.query(
    `SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END AS n FROM inspectors_id_seq`)).rows[0].n;
  console.log('  ---  inspecciones con ID de inspector de la epoca de los empleados (conservadas): ' + maxHuerfano.n);
  console.log('  ---  siguiente ID de inspector que se generara: ' + siguiente);
  if (siguiente <= maxHuerfano.mx) {
    console.log('  ATENCION: un inspector nuevo podria coincidir con un ID historico');
    bad++;
  } else console.log('  ok   la serie esta por encima de todos los IDs historicos');

  console.log('\n=== 10 cualidades retiradas ===');
  const retiro = (await p.query(
    `SELECT count(*)::int n FROM employee_trainings WHERE training_name = ANY($1)`,
    [['sundae-training', 'prep-tater-kegs', 'prep-toppings', 'maintain-food-warmer',
      'handle-toppings', 'handle-cones-cups', 'prep-icee', 'change-flavors',
      'mop-floors', 'handle-freezer']])).rows[0].n;
  console.log('  ' + (retiro === 0 ? 'ok   ' : 'DIF  ') + 'filas de las 10 retiradas: ' + retiro);
  if (retiro !== 0) bad++;

  console.log('\n' + (bad ? 'HAY ' + bad + ' PROBLEMAS'
    : 'Base de datos integra: ningun dato original perdido ni alterado.'));
  await p.end();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });