// ============================================================================
//  ENDPOINTS DE IMPORTACIÓN  (§9, §10, §13, §14, §17)
// ============================================================================
//  Se montan desde server.js. No tocan los endpoints existentes.
//
//  POST /api/:type/import/validate   -> preview autoritativo (sin escribir)
//  POST /api/:type/import/commit     -> escritura transaccional
//  GET  /api/:type/import/history    -> historial (§13)
// ============================================================================

const S = require('./import-service');   // normalizeDate/Time/Hours + hasTimeOverlap

// ---------------------------------------------------------------------------
// Reutiliza las MISMAS fuentes de verdad que ya usa la app (§21):
//   - location_disables  : la location debe estar activa en esa fecha
//   - staffing_rules     : requisitos mínimos (solo informativo)
//   - assignments        : conflictos
// ---------------------------------------------------------------------------

const DISABLED_ON_DATE_SQL = `
    SELECT 1 FROM location_disables
    WHERE location_id = $1
      AND disable_date = $2
      AND enabled_at IS NULL
      AND (reactivation_date IS NULL OR reactivation_date > $2)
    LIMIT 1
`;

// Mismo criterio que location_disables, pero por rango (una location puede
// estar cerrada varios dias seguidos).
// Semiabierto: solapa <=> a.start < b.end AND a.end > b.start  (§8)
// ---------------------------------------------------------------------------
// VALIDATE — no escribe nada. Devuelve el estado de cada fila.
// ---------------------------------------------------------------------------
async function validateRows(ctx, pool, rows, opts) {
  const results = [];
  const employeeIds = new Set();
  const locationIds = new Set();
  rows.forEach((r) => {
    if (r.employee_id) employeeIds.add(Number(r.employee_id));
    if (r.location_id) locationIds.add(String(r.location_id));
  });

  // CatálogosCacheados en una sola consulta
  const empIds = [...employeeIds];
  const locIds = [...locationIds];
  const employees = empIds.length
    ? (await pool.query('SELECT id, name, role FROM employees WHERE id = ANY($1::int[])', [empIds])).rows
    : [];
  const locations = locIds.length
    ? (await pool.query('SELECT id, name FROM locations WHERE id = ANY($1::varchar[])', [locIds])).rows
    : [];
  const empById = new Map(employees.map((e) => [Number(e.id), e]));
  const locById = new Map(locations.map((l) => [String(l.id), l]));

  // Catálogo de secciones NO geográficas (Extra Hours, OPS, Nostalgia Night...).
  //
  // En el Excel de Quinyx, "Student Dining" y "Character Breakfast" son SECCIONES
  // del horario, no locations: no están en la tabla `locations` y por eso sus
  // filas salían como `location_not_found` y no se importaban. Ahora se
  // resuelven contra este catálogo y se guardan como asignaciones de la sección
  // correspondiente, que es justo lo que las muestra en la interfaz.
  //
  // Beer Tent se excluye a proposito (is_active = false): sus turnos no entran,
  // pero la fila del catálogo y cualquier asignación antigua se conservan.
  const catSections = (await pool.query(
    `SELECT key, section, name_es, name_en FROM schedule_categories WHERE is_active = true`
  )).rows;
  // Se indexa por varias formas de escribir el nombre, porque el Excel escribe
  // "Student Dining", "Student  Dining" o "STUDENT DINING" según el día.
  const catByName = new Map();
  const normCat = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  catSections.forEach((c) => {
    [c.key, c.name_es, c.name_en].forEach((n) => {
      if (n) catByName.set(normCat(n), c);
    });
    // La clave con guiones: "student-dining" -> "student dining"
    catByName.set(normCat(String(c.key).replace(/-/g, ' ')), c);
  });

  // Secciones que existen en el Excel pero se han retirado de la interfaz.
  // Beer Tent está en la lista a proposito: sus turnos no se importan, pero la
  // fila del catálogo (schedule_categories) y cualquier asignación antigua se
  // conservan intactas. Nada se borra.
  const EXCLUIDOS_DE_LA_INTERFAZ = new Set(['beer tent', 'beer-tent', 'beertent']);

  // Resuelve el nombre de una sección del Excel a su clave de categoria.
  // Devuelve null si no es una sección conocida o si está retirada de la
  // interfaz (Beer Tent).
  const buscarSeccion = (nombre) => {
    const n = normCat(nombre);
    if (!n) return null;
    if (EXCLUIDOS_DE_LA_INTERFAZ.has(n) || EXCLUIDOS_DE_LA_INTERFAZ.has(n.replace(/\s+/g, '-'))) {
      return null;
    }
    if (catByName.has(n)) return catByName.get(n);
    // Sin coincidencia exacta se prueba sin palabras sueltas ("AM Help").
    const sinPalabras = n.replace(/\b(the|am|help|de|del|la|el)\b/g, '').replace(/\s+/g, ' ').trim();
    for (const [k, c] of catByName) {
      if (k === sinPalabras && sinPalabras) return c;
    }
    return null;
  };

  // ¿La fila es de una sección retirada? Entonces se descarta en silencio: no
  // se importa, pero tampoco se marca como error del Excel.
  const esRetiradaDeInterfaz = (nombre) => {
    const n = normCat(nombre);
    return EXCLUIDOS_DE_LA_INTERFAZ.has(n) || EXCLUIDOS_DE_LA_INTERFAZ.has(n.replace(/\s+/g, '-'));
  };

  // Normaliza fechas/horas ANTES de tocar la BD: a Postgres nunca se le
  // envia un valor crudo del Excel (p.ej. "30/09/2026" o un serial).
  const norm = rows.map((r) => {
    const kind = r.kind || 'schedule';
    const o = { ...r, kind };
    o.work_date = S.normalizeDate(r.work_date);
    if (kind === 'schedule') {
      o.start_time = S.normalizeTime(r.start_time);
      o.end_time = S.normalizeTime(r.end_time);
    } else {
      o.clock_in = S.normalizeTime(r.clock_in);
      o.clock_out = S.normalizeTime(r.clock_out);
      o.worked_hours = S.normalizeHours(r.worked_hours);
      o.regular_hours = S.normalizeHours(r.regular_hours);
      o.overtime_hours = S.normalizeHours(r.overtime_hours);
    }
    return o;
  });

  // Asignaciones existentes en el rango de fechas del archivo.
  // work_date se proyecta a texto: node-postgres devuelve las columnas date
  // como objetos Date y compararlas con 'YYYY-MM-DD' nunca coincidiría, lo
  // que dejaría la detección de conflictos contra la BD desactivada.
  const dates = [...new Set(norm.map((r) => r.work_date).filter(Boolean))];
  let existingAssignments = [];
  if (dates.length && empIds.length) {
    existingAssignments = (await pool.query(
      `SELECT id, employee_id, location_id, work_date::text AS work_date, start_time, end_time
         FROM assignments
        WHERE employee_id = ANY($1::int[])
          AND work_date = ANY($2::date[])`,
      [empIds, dates]
    )).rows;
  }

  // Si es retail, también puede chocar con foods (mismo criterio que el servidor)
  let foodsAssignments = [];
  const targetType = (opts && opts.type) || 'foods';
  if (targetType === 'retail' && empIds.length && dates.length) {
    try {
      const foods = ctx.foods;
      foodsAssignments = (await foods.query(
        `SELECT id, employee_id, location_id, work_date::text AS work_date, start_time, end_time
           FROM assignments
          WHERE employee_id = ANY($1::int[])
            AND work_date = ANY($2::date[])`,
        [empIds, dates]
      )).rows;
    } catch (e) { /* si falla, se omite el chequeo cruzado */ }
  }

  // Horarios ya aceptados dentro de este mismo archivo (evita falsos positivos
  // entre filas del mismo Excel).
  const staged = new Map(); // employeeId -> [{locationId,start,end}]

  for (const row of norm) {
    const kind = row.kind || 'schedule';

    // Beer Tent y compañía: la fila se salta entera. No se importa y no se
    // cuenta como error, porque retirar la sección de la interfaz es decisión
    // nuestra, no un fallo del archivo. Los datos históricos no se tocan.
    if (kind === 'schedule' && row.location_id && esRetiradaDeInterfaz(row.location_id)) {
      results.push({
        index: row.__index,
        kind,
        status: 'skipped',
        issues: [{ code: 'section_hidden' }],
        changed: null,
        normalized: { employee_id: null, location_id: null, work_date: S.normalizeDate(row.work_date), start_time: null, end_time: null }
      });
      continue;
    }

    const issues = [];
    let status = 'ready';

    const emp = row.employee_id ? empById.get(Number(row.employee_id)) : null;

    // El "lugar" de una fila puede ser una location real (Pixie Kitchen) o una
    // sección del horario (Student Dining, Character Breakfast, Front OPS).
    // Las secciones se resuelven contra `schedule_categories`; si no se
    // reconoce ninguna de las dos cosas, se avisa como antes.
    let loc = null;
    let seccion = null;
    if (row.location_id) {
      loc = locById.get(String(row.location_id)) || null;
      if (!loc) seccion = buscarSeccion(row.location_id);
    }

    if (!emp) issues.push({ code: 'employee_not_found' });
    if (kind === 'schedule' && !loc && !seccion) issues.push({ code: 'location_not_found' });

    // --- Fechas y horas normalizadas ---
    const workDate = S.normalizeDate(row.work_date);
    if (kind === 'schedule' && !workDate) issues.push({ code: 'date_invalid' });

    let startTime = null, endTime = null;
    if (kind === 'schedule') {
      startTime = S.normalizeTime(row.start_time);
      endTime = S.normalizeTime(row.end_time);
      // Una fila sin hora (o con una que no se entiende) NUNCA es importable:
      // se detectaba mal antes, porque solo se marcaba el error si venía un
      // valor ilegible. Un horario vacío pasaba limpio y creaba asignaciones
      // sin hora en el módulo de Schedule.
      if (!startTime) issues.push({ code: 'start_time_invalid' });
      if (!endTime) issues.push({ code: 'end_time_invalid' });
      if (startTime && endTime) {
        const s1 = S.timeToMinutes(startTime);
        const e1 = S.timeToMinutes(endTime);
        // Un turno que termina antes de empezar es un turno de noche que
        // cruza la medianoche (20:00 -> 01:00). Solo es valido en las
        // secciones nocturnas; en las diurnas sigue siendo un error.
        const cruzaMedianoche = e1 <= s1;
        if (cruzaMedianoche && (!seccion || seccion.section !== 'NOSTALGIA_NIGHT')) {
          issues.push({ code: 'end_before_start' });
        }
        if (cruzaMedianoche && seccion) row.__overnight = true;
      }
    }

    // --- Location activa en esa fecha (reutiliza location_disables) ---
    if (loc && workDate) {
      const disabled = await pool.query(DISABLED_ON_DATE_SQL, [String(row.location_id), workDate]);
      if (disabled.rows.length) issues.push({ code: 'location_disabled' });
    }

    // --- Duplicado exacto ya en BD ---
    let duplicate = false;
    if (row.external_id) {
      const table = kind === 'hours' ? 'work_hours' : 'assignments';
      const col = kind === 'hours' ? 'external_id' : 'external_id';
      const dup = await pool.query(
        `SELECT 1 FROM ${table} WHERE source = $1 AND ${col} = $2 LIMIT 1`,
        [opts.source || 'excel', String(row.external_id)]
      );
      duplicate = dup.rows.length > 0;
    } else if (kind === 'hours' && emp && workDate) {
      const dup = await pool.query(
        `SELECT id FROM work_hours
          WHERE employee_id = $1 AND work_date = $2
            AND external_id IS NULL
            AND COALESCE(clock_in,'00:00') = COALESCE($3::time,'00:00')
            AND COALESCE(clock_out,'00:00') = COALESCE($4::time,'00:00')
          LIMIT 1`,
        [Number(row.employee_id), workDate, startTime, endTime]
      );
      duplicate = dup.rows.length > 0;
    } else if (kind === 'schedule' && emp && loc && workDate && startTime) {
      const dup = await pool.query(
        `SELECT id FROM assignments
          WHERE employee_id = $1 AND location_id = $2 AND work_date = $3
            AND COALESCE(start_time,'00:00') = COALESCE($4::time,'00:00')
            AND COALESCE(end_time,'00:00') = COALESCE($5::time,'00:00')
          LIMIT 1`,
        [Number(row.employee_id), String(row.location_id), workDate, startTime, endTime]
      );
      duplicate = dup.rows.length > 0;
    } else if (kind === 'schedule' && emp && seccion && workDate && startTime) {
      // Las secciones se guardan con location_id NULL y la clave en
      // `category`, así que el duplicado se busca por categoría. Es la misma
      // comprobación que hace el índice único, pero avisando antes para que la
      // fila aparezca marcada en la vista previa en vez de fallar al escribir.
      const dup = await pool.query(
        `SELECT id FROM assignments
          WHERE employee_id = $1 AND location_id IS NULL AND category = $2 AND work_date = $3
            AND COALESCE(start_time,'00:00') = COALESCE($4::time,'00:00')
            AND COALESCE(end_time,'00:00') = COALESCE($5::time,'00:00')
          LIMIT 1`,
        [Number(row.employee_id), seccion.key, workDate, startTime, endTime]
      );
      duplicate = dup.rows.length > 0;
    }
    if (duplicate) issues.push({ code: 'duplicate_record' });

    // --- §19 El horario CAMBIÓ: mismo empleado/location/fecha, otras horas ---
    // No se sobrescribe nada en silencio: se informa del antes y del después
    // y el usuario decide (mantener / actualizar / omitir).
    let changed = null;
    if (kind === 'schedule' && !duplicate && emp && loc && workDate && startTime && endTime) {
      const sameDay = existingAssignments.find((a) =>
        Number(a.employee_id) === Number(row.employee_id) &&
        String(a.location_id) === String(row.location_id) &&
        String(a.work_date).slice(0, 10) === workDate
      );
      if (sameDay) {
        changed = {
          assignment_id: Number(sameDay.id),
          existing_start: S.normalizeTime(sameDay.start_time),
          existing_end: S.normalizeTime(sameDay.end_time)
        };
        issues.push({ code: 'schedule_changed', detail: changed });
      }
    }

    // --- Conflictos de horario (§8), contra BD + foods + filas del archivo ---
    let conflict = null;
    if (kind === 'schedule' && emp && workDate && startTime && endTime) {
      const pool2 = existingAssignments.concat(foodsAssignments);
      for (const a of pool2) {
        if (Number(a.employee_id) !== Number(row.employee_id)) continue;
        if (String(a.location_id) === String(row.location_id)) continue;
        if (String(a.work_date).slice(0, 10) !== workDate) continue;
        if (S.hasTimeOverlap(startTime, endTime, a.start_time, a.end_time)) {
          conflict = { location: a.location_id, start: a.start_time, end: a.end_time };
          break;
        }
      }
      // contra filas ya validadas del mismo archivo
      if (!conflict) {
        const list = staged.get(Number(row.employee_id)) || [];
        for (const a of list) {
          if (String(a.locationId) === String(row.location_id)) continue;
          if (S.hasTimeOverlap(startTime, endTime, a.start, a.end)) {
            conflict = { location: a.locationId, start: a.start, end: a.end };
            break;
          }
        }
      }
      if (conflict) issues.push({ code: 'schedule_conflict', detail: conflict });
    }

    const hasConflict = issues.some((i) => i.code === 'schedule_conflict');

    // Toda fila con empleado y horario válidos ocupa ese tramo del día, diga lo
    // que diga su estado final. Si solo se apilaran las que se van a insertar,
    // al reimportar el mismo archivo las filas duplicadas desaparecerían del
    // mapa y las siguientes perderían la detección de conflictos: el mismo
    // Excel importado dos veces terminaría con doble reserva de personal.
    if (kind === 'schedule' && startTime && endTime && row.employee_id && row.location_id) {
      const k = Number(row.employee_id);
      if (!staged.has(k)) staged.set(k, []);
      staged.get(k).push({ locationId: String(row.location_id), start: startTime, end: endTime });
    }

    // Un duplicado no es un error: se reporta como tal y no se reimporta (§10).
    if (duplicate) {
      status = 'duplicate';
    } else if (changed) {
      // Hay un turno previo para ese empleado/location/fecha pero con otras
      // horas: se deja al usuario decidir (§19).
      status = 'changed';
    } else if (issues.length === 0) {
      status = 'ready';
    } else {
      status = hasConflict ? 'conflict' : 'review';
    }

    results.push({
      index: row.__index,
      kind,
      status,
      issues,
      changed,
      normalized: {
        employee_id: emp ? Number(row.employee_id) : null,
        // Una sección no tiene location: se guarda con location_id NULL y la
        // clave de la categoría, que es lo que la dibuja en su tarjeta.
        location_id: loc ? String(row.location_id) : null,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        assignment_type: seccion ? seccion.section : 'LOCATION',
        section_name: seccion ? seccion.name_es : null,
        category: loc ? String(row.location_id) : (seccion ? seccion.key : (row.category || null)),
        overnight: !!row.__overnight,
        clock_in: kind === 'hours' ? S.normalizeTime(row.clock_in) : null,
        clock_out: kind === 'hours' ? S.normalizeTime(row.clock_out) : null,
        worked_hours: S.normalizeHours(row.worked_hours),
        regular_hours: S.normalizeHours(row.regular_hours),
        overtime_hours: S.normalizeHours(row.overtime_hours),
        break_minutes: row.break_minutes == null || row.break_minutes === ''
          ? null : Math.round(Number(row.break_minutes) || 0),
        role: row.role ? String(row.role).slice(0, 80) : null,
        shift_label: row.shift_label ? String(row.shift_label).slice(0, 20) : null
      }
    });
  }

  return results;
}


// ---------------------------------------------------------------------------
// COMMIT — escritura TRANSACCIONAL (§14).
// Revalida dentro de la transaccion: si algo cambio desde el preview,
// la fila se marca 'conflict' y NO se inserta.
// ---------------------------------------------------------------------------
async function commitImport(ctx, pool, body) {
  const { rows = [], file_name = '', detected_type = 'unknown', target_type = 'foods',
          file_format = null, source = 'excel', imported_by = null, allow_review = false } = body;

  const client = await pool.connect();
  const summary = {
    total: rows.length, imported: 0, updated: 0, duplicates: 0, rejected: 0,
    conflicts: 0, kept: 0, errors: [], inserted: []
  };

  try {
    await client.query('BEGIN');

    // 1) Revalidación autoritativa dentro de la transacción
    const checked = await validateRows(ctx, client, rows, { source, type: target_type });

    // validateRows devuelve el índice que envió el cliente, que no siempre
    // coincide con la posición en el array (si se excluyeron filas). Se indexa
    // por ese identificador para no leer la fila equivocada.
    const rowByIndex = new Map();
    rows.forEach((r, i) => {
      const k = (r && r.__index !== undefined && r.__index !== null) ? r.__index : i;
      if (!rowByIndex.has(k)) rowByIndex.set(k, r);
    });

    // 2) Inserción
    for (const c of checked) {
      const n = c.normalized;
      const row = rowByIndex.get(c.index) || {};
      // Decisión del usuario para los turnos que han cambiado (§19):
      //   'keep' -> se conserva lo que ya hay
      //   'update' -> se sobrescribe solo ese turno
      //   'skip' / ausente -> no se toca nada
      const action = row.action || null;

      const blocking = c.issues.some((i) =>
        ['employee_not_found','location_not_found','date_invalid','end_before_start',
         'start_time_invalid','end_time_invalid','location_disabled','schedule_conflict']
        .includes(i.code));

      // Sección retirada de la interfaz (Beer Tent): ni entra ni cuenta como
      // error. Los datos que ya hubiera se dejan como están.
      if (c.status === 'skipped') {
        summary.skipped = (summary.skipped || 0) + 1;
        continue;
      }

      if (c.status === 'duplicate') {
        summary.duplicates++;
        continue;
      }

      // --- Turno modificado: se aplica lo que el usuario haya elegido ---
      if (c.status === 'changed' && c.changed) {
        if (action === 'update') {
          try {
            const r = await client.query(
              `UPDATE assignments
                  SET start_time = $2, end_time = $3, source = $4
                WHERE id = $1`,
              [c.changed.assignment_id, n.start_time, n.end_time, source]
            );
            if (r.rowCount) {
              summary.updated++;
              summary.inserted.push({ index: c.index, id: c.changed.assignment_id, action: 'update' });
            } else {
              summary.rejected++;
              summary.errors.push({ index: c.index, message: 'update_failed' });
            }
          } catch (e) {
            summary.rejected++;
            summary.errors.push({ index: c.index, message: e.message });
          }
        } else if (action === 'keep') {
          summary.kept++;
        } else {
          summary.duplicates++;
        }
        continue;
      }

      if (blocking && !(allow_review && c.status === 'review')) {
        summary.rejected++;
        if (c.status === 'conflict') summary.conflicts++;
        continue;
      }
      if (blocking) { summary.rejected++; if (c.status === 'conflict') summary.conflicts++; continue; }

      try {
        if (c.kind === 'hours') {
          const r = await client.query(
            `INSERT INTO work_hours
                (employee_id, work_date, clock_in, clock_out, worked_hours,
                 regular_hours, overtime_hours, break_minutes, external_id, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [n.employee_id, n.work_date, n.clock_in, n.clock_out, n.worked_hours,
             n.regular_hours, n.overtime_hours, n.break_minutes || 0,
             row.external_id || null, source]
          );
          if (r.rows.length) { summary.imported++; summary.inserted.push({ index: c.index, id: r.rows[0].id }); }
          else summary.duplicates++;
        } else {
          // DosShapes de fila de horario, en la MISMA tabla `assignments`:
          //
          //  1) location real (Pixie Kitchen): location_id = su id y
          //     assignment_type = 'LOCATION'. Para estas filas `category` es el
          //     propio location_id: es el concepto "lugar" que usan las reglas
          //     de conflicto. Si no se rellena, esas filas quedan sin
          //     clasificar y las comparaciones dejan de funcionar.
          //
          //  2) sección (Student Dining, Character Breakfast, Nostalgia
          //     Night...): location_id = NULL y la clave de la sección en
          //     `category`, con su propio assignment_type. Así la fila aparece
          //     en la tarjeta correcta y NO se duplica: es una sola
          //     asignación, no una copia.
          const esSeccion = !n.location_id && !!n.category;
          const assignmentType = esSeccion ? (n.assignment_type || 'EXTRA_HOURS') : 'LOCATION';
          const category = esSeccion ? n.category : (n.location_id || row.category || null);
          const r = await client.query(
            `INSERT INTO assignments
                (location_id, employee_id, work_date, start_time, end_time,
                 assignment_type, category, role, notes, task_id, source, external_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [esSeccion ? null : n.location_id, n.employee_id, n.work_date,
             n.start_time, n.end_time, assignmentType, category,
             n.role || null, n.notes || null, n.task_id || null, source,
             row.external_id || null]
          );
          if (r.rows.length) { summary.imported++; summary.inserted.push({ index: c.index, id: r.rows[0].id }); }
          else summary.duplicates++;
        }
      } catch (e) {
        summary.rejected++;
        summary.errors.push({ index: c.index, message: e.message });
      }
    }

    // 3) Historial (§13)
    await client.query(
      `INSERT INTO import_history
         (file_name, source, detected_type, target_type, imported_by, total_records,
          imported_count, updated_count, duplicate_count, rejected_count, status, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [String(file_name).slice(0,255), source, detected_type, target_type, imported_by,
       summary.total, summary.imported, summary.updated, summary.duplicates,
       summary.rejected + summary.conflicts, 'completed',
       JSON.stringify({
         file_format,
         conflicts: summary.conflicts,
         kept: summary.kept,
         errors: summary.errors
       })]
    );

    await client.query('COMMIT');
    return summary;
  } catch (e) {
    await client.query('ROLLBACK');   // nada queda a medias (§14)
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { validateRows, commitImport, DISABLED_ON_DATE_SQL, S };
