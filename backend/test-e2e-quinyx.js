// ============================================================================
//  PRUEBA END-TO-END: Excel real -> filas -> validar -> commit -> assignments
//  Ejecutar: node test-e2e-quinyx.js "ruta\al\archivo.xlsx"
//  Usa una fecha lejana (2099) para no tocar datos reales y limpia al final.
// ============================================================================
const fs = require('fs');
const XLSX = require('./node_modules/xlsx');
const ExcelImport = require('../excel-import.js');
const importRoutes = require('./import-routes.js');
const db = require('./db');

const file = process.argv[2];
if (!file) { console.error('Uso: node test-e2e-quinyx.js <archivo.xlsx>'); process.exit(1); }

const TEST_DATE = '2099-12-31';
let pass = 0, fail = 0; const fails = [];
const eq = (a, e, m) => { if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); } else { fail++; fails.push(m + ' (esperado ' + JSON.stringify(e) + ', obtenido ' + JSON.stringify(a) + ')'); console.log('  FAIL ' + m); } };
const ok = (v, m) => eq(!!v, true, m);

(async () => {
  const pool = db.foods;
  console.log('\n=== 0. Limpieza previa (ejecuciones anteriores) ===');
  await pool.query("DELETE FROM assignments WHERE work_date=$1 AND source='excel'", [TEST_DATE]);
  await pool.query("DELETE FROM import_history WHERE file_name LIKE 'E2E_%'");

  console.log('\n=== 1. Carga del Excel real ===');
  const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Schedule'], { header: 1, raw: false, defval: '', blankrows: true });

  console.log('\n=== 1. Detección por contenido ===');
  ok(ExcelImport.isQuinyxSchedule(rows), 'formato de horario real detectado');

  console.log('\n=== 2. Conversión + fecha elegida por el usuario (§8) ===');
  const built = ExcelImport.buildQuinyxScheduleRows(rows, 'Schedule');
  const sched = built.rows.map((r) => Object.assign({}, r, { work_date: TEST_DATE }));
  console.log('     ' + sched.length + ' filas generadas, ' +
    sched.filter((r) => !r.needs_review).length + ' sin necesidad de revisión');
  eq(sched.length, built.rows.length, 'se generan filas para todo el horario');
  ok(sched.length >= 60, sched.length + ' asignaciones generadas del horario real');
  eq(sched.every((r) => r.work_date === TEST_DATE), true, 'la fecha elegida se aplica a todas');

  console.log('\n=== 3. Ejemplo literal del usuario (§21) ===');
  const turno = sched.find((r) => r.name === 'Nadia Castro' && r.location_name === 'Pixie/DD Kitchen');
  const ral = sched.find((r) => r.name === 'Rocio' && r.location_name === 'Pixie/DD Kitchen');
  const nadia = sched.find((r) => r.name === 'Nadia' && r.location_name === 'Pixie/DD Kitchen');
  eq([turno.start_time, turno.end_time, turno.role, turno.shift_label], ['09:00', '17:00', 'Sales 1', 'Day'], 'Nadia Castro 09:00-17:00 Sales 1 [Day]');
  eq([ral.start_time, ral.end_time, ral.role, ral.shift_label], ['17:00', '22:00', 'Sales 1', 'Night'], 'Rocio 17:00-22:00 Sales 1 [Night]');
  eq([nadia.start_time, nadia.end_time, nadia.role], ['08:00', '22:00', 'Server'], 'Nadia 08:00-22:00 Server');

  console.log('\n=== 4. Matching contra la BD (nada se crea) ===');
  const employees = (await pool.query('SELECT id, name FROM employees')).rows;
  const locations = (await pool.query('SELECT id, name FROM locations')).rows;

  const payload = sched
    .filter((r) => !r.needs_review)                    // solo las Fully interpretable (§23)
    .map((r) => {
      const m = ExcelImport.matchEmployee(r, employees);
      const l = ExcelImport.matchLocation(r.location_name, locations);
      return {
        __index: r.__index, kind: 'schedule',
        employee_id: m.employee ? m.employee.id : null,
        location_id: l.location ? l.location.id : null,
        work_date: TEST_DATE,
        start_time: r.start_time, end_time: r.end_time,
        role: r.role, shift_label: r.shift_label
      };
    });

  const noEmp = payload.filter((r) => !r.employee_id);
  const empNames = [...new Set(sched.filter((r) => !r.needs_review && !payload.find((p) => p.__index === r.__index).employee_id).map((r) => r.name))];
  console.log('     empleados del archivo que NO están en la BD: ' + (empNames.join(', ') || 'ninguno'));
  eq(noEmp.every((r) => empNames.length > 0), true, 'los que no existen se marcan, no se crean');
  const locNames = [...new Set(sched.filter((r) => !r.needs_review && !payload.find((p) => p.__index === r.__index).location_id).map((r) => r.location_name))];
  ok(locNames.length > 0, 'locations que NO existen y quedan sin asignar: ' + locNames.join(', '));

  console.log('\n=== 5. Validación en servidor (reglas existentes) ===');
  const checked = await importRoutes.validateRows({}, pool, payload, { source: 'excel', type: 'foods' });
  const byStatus = {};
  checked.forEach((c) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  console.log('     ' + JSON.stringify(byStatus));

  // §10: los conflictos son REALES del archivo (la misma persona aparece en
  // dos locations a la vez). El sistema debe detectarlos, no resolverlos solo.
  const conflicts = checked.filter((c) => c.status === 'conflict');
  conflicts.forEach((c) => {
    const d = c.issues.find((i) => i.code === 'schedule_conflict').detail;
    console.log('     conflicto: #' + c.index + ' choca con ' + d.location + ' ' +
      String(d.start).slice(0, 5) + '-' + String(d.end).slice(0, 5));
  });
  ok(conflicts.length > 0, 'se detectan los conflictos reales del horario');
  const ready = checked.filter((c) => c.status === 'ready');
  ok(ready.length > 0, ready.length + ' filas limpias listas para importar');
  eq(ready.every((c) => c.issues.length === 0), true, 'las filas "ready" no tienen ningún problema');

  console.log('\n=== 5b. Filas SIN horario NUNCA se importan (§23) ===');
  // Se envían también las filas que el parser marcó para revisión, que es lo
  // que hace la interfaz. Ninguna debe acabar en la base de datos.
  const sinHora = sched
    .filter((r) => !r.start_time || !r.end_time)
    .map((r) => {
      const m = ExcelImport.matchEmployee(r, employees);
      const l = ExcelImport.matchLocation(r.location_name, locations);
      return { __index: r.__index, kind: 'schedule',
               employee_id: m.employee ? m.employee.id : null,
               location_id: l.location ? l.location.id : null,
               work_date: TEST_DATE, start_time: r.start_time, end_time: r.end_time };
    });
  console.log('     ' + sinHora.length + ' filas sin horario: ' +
    sinHora.map((r) => (sched.find((s) => s.__index === r.__index) || {}).name).join(', '));
  ok(sinHora.length > 0, 'el archivo tiene filas sin horario utilizable');
  const chk = await importRoutes.validateRows({}, pool, sinHora, { source: 'excel', type: 'foods' });
  eq(chk.every((c) => c.status !== 'ready'), true, 'ninguna se marca como lista');
  ok(chk.every((c) => c.issues.some((i) => i.code === 'start_time_invalid' || i.code === 'end_time_invalid')),
     'todas se marcan con "horario no válido"');
  const sumSin = await importRoutes.commitImport({}, pool, {
    rows: sinHora, source: 'excel', file_name: 'E2E_sin_hora.xlsx', file_format: 'quinyx',
    detected_type: 'schedule', target_type: 'foods', imported_by: 'test-e2e'
  });
  eq(sumSin.imported, 0, '0 importadas de las filas sin horario');
  const nulos = (await pool.query(
    "SELECT count(*)::int n FROM assignments WHERE work_date=$1 AND (start_time IS NULL OR end_time IS NULL)",
    [TEST_DATE])).rows[0].n;
  eq(nulos, 0, '0 asignaciones sin hora en la base de datos');

  console.log('\n=== 6. Importar de verdad (transaccional) ===');
  const usable = payload.filter((r) => r.employee_id && r.location_id);
  const sum = await importRoutes.commitImport({}, pool, {
    rows: usable, source: 'excel', file_name: 'E2E_STORYMANAGER.xlsx',
    file_format: 'quinyx', detected_type: 'schedule', target_type: 'foods', imported_by: 'test-e2e'
  });
  console.log('     ' + JSON.stringify({ imported: sum.imported, duplicates: sum.duplicates, rejected: sum.rejected, conflicts: sum.conflicts, updated: sum.updated }));
  eq(sum.imported, ready.length, 'se importan exactamente las filas limpias (' + ready.length + ')');
  eq(sum.conflicts, conflicts.length, 'las filas en conflicto se rechazan, no se fuerzan');

  console.log('\n=== 7. Verificar en la tabla assignments (§17) ===');
  const inDb = (await pool.query(
    `SELECT a.employee_id, e.name, a.location_id, a.work_date, a.start_time, a.end_time, a.source
       FROM assignments a JOIN employees e ON e.id = a.employee_id
      WHERE a.work_date = $1 AND a.source = 'excel'`, [TEST_DATE])).rows;
  eq(inDb.length, ready.length, inDb.length + ' asignaciones en la BD (solo las limpias)');

  const rowAnna = inDb.find((r) => r.name === 'Nadia Castro' && r.location_id === 'pixie-kitchen');
  eq([String(rowAnna.start_time).slice(0, 5), String(rowAnna.end_time).slice(0, 5)], ['09:00', '17:00'], 'Nadia Castro guardada 09:00-17:00 en pixie-kitchen');
  const rowRal = inDb.find((r) => r.name === 'Rocio' && r.location_id === 'pixie-kitchen');
  eq([String(rowRal.start_time).slice(0, 5), String(rowRal.end_time).slice(0, 5)], ['17:00', '22:00'], 'Rocio guardada 17:00-22:00 en pixie-kitchen');
  eq(rowAnna.source, 'excel', 'source = excel');
  ok(inDb.some((r) => r.name === 'Nadia' && r.location_id === 'pixie-kitchen'), 'Nadia guardada en pixie-kitchen');

  console.log('\n=== 8. Reimportar el mismo archivo -> duplicados, NO doblebooking (§18) ===');
  const sum2 = await importRoutes.commitImport({}, pool, {
    rows: usable, source: 'excel', file_name: 'E2E_STORYMANAGER.xlsx',
    file_format: 'quinyx', detected_type: 'schedule', target_type: 'foods', imported_by: 'test-e2e'
  });
  eq(sum2.imported, 0, '0 importadas la segunda vez');
  eq(sum2.duplicates, inDb.length, inDb.length + ' marcadas como duplicadas');
  const after = (await pool.query('SELECT count(*)::int n FROM assignments WHERE work_date=$1 AND source=$2', [TEST_DATE, 'excel'])).rows[0].n;
  eq(after, inDb.length, 'la BD no creció: ' + after + ' asignaciones');

  console.log('\n=== 9. Horario modificado -> "changed" + actualizar (§19) ===');
  // Cada fila se retrasa 1 h en lugar de fijarla a una misma hora: así siguen
  // siendo turnos distintos y la prueba mide el cambio, no una colisión.
  const plus = (hhmm, mins) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    const t = (h * 60 + m + mins) % 1440;
    return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  };
  const insertedIdx = new Set(sum.inserted.map((i) => i.index));
  const modified = usable
    .filter((r) => insertedIdx.has(r.__index))
    .map((r) => Object.assign({}, r, {
      start_time: plus(r.start_time, 60),
      end_time: plus(r.end_time, 60)
    }));
  eq(modified.length, inDb.length, modified.length + ' filas modificadas para la prueba');
  const checked2 = await importRoutes.validateRows({}, pool, modified, { source: 'excel', type: 'foods' });
  const changedRows = checked2.filter((c) => c.status === 'changed');
  console.log('     filas detectadas como "changed": ' + changedRows.length + ' de ' + modified.length);
  if (changedRows.length !== modified.length) {
    console.log('     DETALLE de las que NO son "changed":');
    for (const c of checked2.filter((x) => x.status !== 'changed')) {
      console.log('       status=' + c.status + '  emp#' + c.normalized.employee_id +
        '  loc=' + c.normalized.location_id + '  ' + c.normalized.start_time + '-' + c.normalized.end_time +
        '  issues=' + JSON.stringify(c.issues.map((i) => i.code)));
      const enBd = (await pool.query(
        'SELECT start_time::text st, end_time::text en FROM assignments WHERE work_date=$1 AND employee_id=$2 AND location_id=$3',
        [TEST_DATE, c.normalized.employee_id, c.normalized.location_id])).rows;
      console.log('         en BD: ' + (enBd.length
        ? enBd.map((d) => String(d.st).slice(0, 5) + '-' + String(d.en).slice(0, 5)).join(', ')
        : 'ninguna'));
    }
  }
  ok(changedRows.length > 0, 'se detecta que el horario cambió');
  const oneChanged = changedRows[0];
  ok(oneChanged && oneChanged.changed && oneChanged.changed.existing_start, 'informa del horario anterior');
  eq(oneChanged.changed.assignment_id > 0, true, 'incluye el id de la asignación a actualizar');
  console.log('     actual: ' + String(oneChanged.changed.existing_start).slice(0, 5) + '-' +
              String(oneChanged.changed.existing_end).slice(0, 5) + '  ->  importado: ' +
              String(oneChanged.normalized.start_time).slice(0, 5) + '-' +
              String(oneChanged.normalized.end_time).slice(0, 5));

  console.log('\n  ... por defecto NO sobrescribe (se omiten)');
  const sumKeep = await importRoutes.commitImport({}, pool, {
    rows: modified, source: 'excel', file_name: 'E2E_v2.xlsx', file_format: 'quinyx',
    detected_type: 'schedule', target_type: 'foods', imported_by: 'test-e2e'
  });
  eq(sumKeep.updated, 0, '0 actualizadas sin permiso explícito');
  const stillOld = (await pool.query(
    `SELECT start_time FROM assignments WHERE work_date=$1 AND employee_id=$2 AND location_id=$3`,
    [TEST_DATE, oneChanged.normalized.employee_id, oneChanged.normalized.location_id])).rows[0];
  eq(String(stillOld.start_time).slice(0, 5), String(oneChanged.changed.existing_start).slice(0, 5), 'el turno original sigue intacto');

  console.log('\n  ... action="keep" conserva y action="update" actualiza');
  const withKeep = modified.map((r) => Object.assign({}, r, { action: 'keep' }));
  const sumKeep2 = await importRoutes.commitImport({}, pool, {
    rows: withKeep, source: 'excel', file_name: 'E2E_v2.xlsx', file_format: 'quinyx',
    detected_type: 'schedule', target_type: 'foods', imported_by: 'test-e2e'
  });
  eq(sumKeep2.kept, modified.length, modified.length + ' conservadas sin tocar');

  const withAction = modified.map((r) => Object.assign({}, r, { action: 'update' }));
  const sumUpd = await importRoutes.commitImport({}, pool, {
    rows: withAction, source: 'excel', file_name: 'E2E_v2.xlsx', file_format: 'quinyx',
    detected_type: 'schedule', target_type: 'foods', imported_by: 'test-e2e'
  });
  eq(sumUpd.updated, modified.length, modified.length + ' actualizadas');
  const nowNew = (await pool.query(
    `SELECT start_time, end_time FROM assignments WHERE work_date=$1 AND employee_id=$2 AND location_id=$3`,
    [TEST_DATE, oneChanged.normalized.employee_id, oneChanged.normalized.location_id])).rows[0];
  eq([String(nowNew.start_time).slice(0, 5), String(nowNew.end_time).slice(0, 5)],
     [String(oneChanged.normalized.start_time).slice(0, 5), String(oneChanged.normalized.end_time).slice(0, 5)],
     'el turno pasa a ' + String(oneChanged.normalized.start_time).slice(0, 5) + '-' +
     String(oneChanged.normalized.end_time).slice(0, 5));
  const afterUpd = (await pool.query('SELECT count(*)::int n FROM assignments WHERE work_date=$1 AND source=$2', [TEST_DATE, 'excel'])).rows[0].n;
  eq(afterUpd, inDb.length, 'actualizar NO crea filas nuevas (sigue habiendo ' + inDb.length + ')');

  console.log('\n=== 10. Historial de importaciones (§13) ===');
  const hist = (await pool.query(
    `SELECT file_name, detected_type, imported_count, updated_count, duplicate_count, status
       FROM import_history WHERE file_name LIKE 'E2E_%' ORDER BY id`)).rows;
  hist.forEach((h) => console.log('     ' + h.file_name + '  importadas=' + h.imported_count +
    '  actualizadas=' + h.updated_count + '  duplicadas=' + h.duplicate_count + '  ' + h.status));
  ok(hist.length >= 4, hist.length + ' importaciones registradas');
  eq(hist.some((h) => h.imported_count === inDb.length), true, 'el historial guarda las importadas');
  eq(hist.some((h) => h.updated_count > 0), true, 'el historial guarda las actualizadas');
  eq(hist.every((h) => h.detected_type === 'schedule'), true, 'detected_type = schedule');
  eq(hist.every((h) => h.status === 'completed'), true, 'todas completadas');

  // ---- limpieza ----
  console.log('\n=== 11. Limpieza de los datos de prueba ===');
  const del = await pool.query('DELETE FROM assignments WHERE work_date=$1 AND source=$2', [TEST_DATE, 'excel']);
  await pool.query("DELETE FROM import_history WHERE file_name LIKE 'E2E_%'");
  console.log('     ' + del.rowCount + ' asignaciones y ' + hist.length + ' entradas de historial eliminadas');
  eq(del.rowCount, inDb.length, 'se eliminaron exactamente las asignaciones de prueba');

  console.log('\n' + '='.repeat(64));
  console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
  if (fail) { console.log('\nFALLOS:'); fails.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
  console.log('='.repeat(64));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('\nERROR:', e.message); console.error(e.stack); process.exit(1); });