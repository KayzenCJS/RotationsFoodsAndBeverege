// ============================================================================
//  PARSER DEL FORMATO REAL DE HORARIO (Quinyx / Story Land)
// ============================================================================
//  Estructura del Excel real (hoja "Schedule"):
//
//      LEFT SIDE                       RIGHT SIDE
//      A = Location / Rol              E = Location / Rol
//      B = Horario                     F = Horario
//      C = Empleado(s)                 G = Empleado(s)
//
//  Caracteristicas que maneja:
//    - La LOCATION se hereda hacia abajo hasta que aparece otra.
//    - La misma celda puede traer location + horario ("Slush Factory 10-9:30").
//    - Varios empleados separados por "/"  -> "Anna Dragan (Day) / Raluca (Night)"
//    - Varios rangos separados por "/"    -> "9-5pm / 5pm-10pm"
//    - Se emparejan por POSICION (§5).
//    - Sufijos (Day)/(Night) -> metadato shiftLabel, nunca parte del nombre.
//    - "Coord - Edward" -> rol Coord + nombre Edward.
//    - "until 10pm" -> hereda el fin del turno anterior.
// ============================================================================

const QuinyxParser = (() => {

  // -------------------------------------------------------------------------
  //  CONSTANTES DEL FORMATO
  // -------------------------------------------------------------------------
  const ROLES = [
    'sales', 'cash', 'server', 'cook', 'dish', 'cashier', 'hostess',
    'barback', 'retail', 'tea', 'am help', 'beer tent', 'student dining',
    'character breakfast', 'kitchen', 'ice cream', 'prep', 'front coord',
    'back ops', 'coord', 'extra tasks', 'ipr opener', 'id scanning',
    'supervisor', 'bartender', 'op', 'dishwasher'
  ];

  // Valores que NO son empleados
  const NOT_EMPLOYEE = ['n/a', 'na', '-', 'no food', 'closed', 'none', 'vacant'];

  // Duracion maxima plausible de un turno. Si la normalizacion AM/PM supera
  // este valor, el inicio era en realidad PM (p.ej. "5:30-10" = 17:30-22:00).
  const MAX_SHIFT_MINUTES = 15 * 60;

  const stripAccents = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = (s) => stripAccents(String(s == null ? '' : s)).toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const split = (s) => String(s == null ? '' : s).split('/').map((x) => x.trim()).filter((x) => x !== '');

  // "N/A" -> "n a" tras normalizar, "NO FOOD" -> "no food"
  function isNotEmployee(s) {
    const a = norm(s);
    const b = a.replace(/\s+/g, '');
    return NOT_EMPLOYEE.some((x) => a === x || b === x.replace(/\s+/g, ''));
  }

  // -------------------------------------------------------------------------
  //  DETECCIÓN DE FORMATO
  //  Un "schedule" real NO tiene una fila de encabezados con
  //  Employee/Location/Date: es un layout visual. Se detecta por la
  //  presencia de las celdas "Time"/"Name" y celdas que parecen ubicación.
  // -------------------------------------------------------------------------
  function looksLikeQuinyxSchedule(rows) {
    if (!rows || rows.length < 4) return false;
    const flat = rows.slice(0, 12).map((r) => norm((r || []).join(' '))).join(' | ');
    if (flat.indexOf('time') === -1) return false;
    if (flat.indexOf('name') === -1) return false;
    // el parser de tabla plana exige encabezados Employee/Location/Date
    const joined = rows.slice(0, 6).map((r) => (r || []).join(' ')).join(' ').toLowerCase();
    const hasFlatHeaders = /employee/.test(joined) && /location/.test(joined) && /date/.test(joined);
    return !hasFlatHeaders;
  }

  // -------------------------------------------------------------------------
  //  HORAS (§9)
  // -------------------------------------------------------------------------
  // "9-5pm", "8-6pm", "9:45-5", "10-10", "10:15-10", "7-9am", "5:30-10pm",
  // "9-9:30pm", "10:30-4:30pm", "11-3pm", "until 10pm"
  function parseTimeCell(cell) {
    const raw = String(cell == null ? '' : cell).trim();
    if (!raw) return { kind: 'empty' };
    const low = raw.toLowerCase();

    if (low.indexOf('until') === 0) {
      const m = low.match(/until\s*(.+)/);
      if (!m) return { kind: 'invalid', reason: 'until_empty', raw };
      const t = parseClock(m[1].trim());
      return t ? { kind: 'until', end: t.total } : { kind: 'invalid', reason: 'until_bad', raw };
    }

    const segs = split(raw);
    const ranges = [];
    for (const seg of segs) {
      const r = parseRange(seg);
      if (r.error) return { kind: 'invalid', reason: r.error, raw: seg };
      ranges.push(r);
    }
    if (!ranges.length) return { kind: 'empty' };
    fixChronology(ranges);
    return { kind: 'range', ranges };
  }

  // Los rangos de una misma celda van en orden cronologico:
  //   "11-3pm / 6-8pm" -> 11:00-15:00 y 18:00-20:00
  // Si un rango empieza antes de que termine el anterior, su "6" no era AM.
  //
  // Solo se toca un rango cuyo INICIO no traía AM/PM: si el autor puso "4pm",
  // hay que respetarlo aunque el rango anterior parezca solaparse. Mover un
  // turno que ya tiene meridiem lo desplazaría de día ("4pm-10pm" -> "04:00").
  function fixChronology(ranges) {
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].startMer) continue;
      const prevEnd = ranges[i - 1].end;
      const orig = { s: ranges[i].start, e: ranges[i].end };
      let guard = 0;
      while (ranges[i].start < prevEnd && guard < 2) {
        ranges[i].start += 720;
        if (ranges[i].end <= ranges[i].start) ranges[i].end += 720;
        guard++;
      }
      // Si el ajuste produce un turno imposible (>24h de diferencia desde el
      // rango anterior, o el inicio se pasa del final del día), se descarta.
      if (ranges[i].start >= 1440 * 2 || ranges[i].end - ranges[i].start > MAX_SHIFT_MINUTES) {
        ranges[i].start = orig.s;
        ranges[i].end = orig.e;
      }
    }
  }

  // Rango "9-5pm" / "9:45-5" / "10-10"
  function parseRange(seg) {
    const s = String(seg).trim();
    const parts = s.split('-').map((x) => x.trim()).filter((x) => x !== '');
    if (parts.length < 2) return { error: 'no_separator' };

    const a = parseClock(parts[0]);
    const b = parseClock(parts[1]);
    if (!a) return { error: 'bad_start' };
    if (!b) return { error: 'bad_end' };

    const aHasMer = hasMeridiem(parts[0]);
    const bHasMer = hasMeridiem(parts[1]);

    // --- INICIO -----------------------------------------------------------
    // Con meridiem explicito se respeta siempre.
    // Sin meridiem se asume AM y luego se corrige si el turno queda absurdo.
    let start;
    if (a.mer) {
      start = a.total;
    } else {
      start = a.h === 12 ? 0 : a.h * 60 + a.min;
    }

    // --- FIN --------------------------------------------------------------
    let end;
    if (b.mer) {
      end = b.total;                                   // "7-9am", "9-5pm"
    } else if (!bHasMer && !aHasMer) {
      end = b.h < 12 ? b.h * 60 + b.min + 720 : b.h * 60 + b.min;
    } else if (!bHasMer) {
      // "5:30-10pm" : hereda el meridiem del inicio
      end = a.mer === 'am' ? b.h * 60 + b.min : (b.h < 12 ? b.h * 60 + b.min + 720 : b.h * 60 + b.min);
    }
    if (end <= start) end += 720;

    // --- CORRECCION DE TURNO ABSURDO --------------------------------------
    // En este formato un turno son entre ~3 y ~14 horas. Si asumir AM/PM
    // produce mas de 15 horas, el inicio era en realidad PM.
    //   "5:30-10"   -> 05:30-22:00 (16.5h, absurdo) -> 17:30-22:00
    //   "9-9:30"    -> 09:00-21:30 (12.5h, valido)  -> se mantiene
    if (!a.mer && end - start > MAX_SHIFT_MINUTES) {
      const startPm = a.h < 12 ? a.h * 60 + a.min + 720 : a.h * 60 + a.min;
      let endPm = end;
      if (endPm <= startPm) endPm += 720;
      if (endPm - startPm <= MAX_SHIFT_MINUTES) { start = startPm; end = endPm; }
    }

    return { start, end, raw: s, startMer: a.mer || null, endMer: b.mer || null };
  }

  function hasMeridiem(s) { return /am|pm/i.test(String(s)); }

  // "9", "5pm", "9:30", "10:15pm" -> { h, min, mer, total }
  function parseClock(s) {
    const t = String(s).trim().toLowerCase();
    const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const mer = m[3] || null;
    if (h > 24 || min > 59) return null;
    if (h === 0) return null;
    let total = h * 60 + min;
    if (mer === 'pm' && h < 12) total += 720;
    if (mer === 'am' && h === 12) total = 0;
    if (!mer && h === 12) total = 720;   // "12-5" -> 12:00-17:00
    return { h, min, mer, total };
  }

  const toHHMM = (mins) => {
    let m = mins % 1440;
    if (m < 0) m += 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  };

  // -------------------------------------------------------------------------
  //  NOMBRES DE EMPLEADO (§4, §12, §13)
  //  "Anna Dragan (Day)"  -> { name: "Anna Dragan", shiftLabel: "Day" }
  //  "Coord - Edward"     -> { name: "Edward", roleHint: "Coord" }
  // -------------------------------------------------------------------------
  const ROLE_PREFIX_RE = /^(.+?)\s*[-–—]\s*(.+)$/;

  function parseEmployeeCell(cell) {
    const out = [];
    const whole = String(cell == null ? '' : cell).trim();
    // "N/A", "NO FOOD", "-"  ->  una sola "persona" que no es una persona.
    // Hay que comprobarlo ANTES de partir por "/" o "N/A" se volveria N + A.
    if (!whole) return out;
    if (isNotEmployee(whole)) return out;

    const segs = split(cell);
    for (let seg of segs) {
      seg = seg.trim();
      if (!seg) continue;

      let shiftLabel = null;
      let roleHint = null;
      let name = seg;

      // sufijo (Day) / (Night) / (D) / (N)
      const m = seg.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      if (m) {
        name = m[1].trim();
        const inner = m[2].trim();
        if (/^(day|d)$/i.test(inner)) shiftLabel = 'Day';
        else if (/^(night|n)$/i.test(inner)) shiftLabel = 'Night';
        else shiftLabel = inner || null;
      }

      // prefijo de rol "Coord - Edward"
      const r = ROLE_PREFIX_RE.exec(name);
      if (r) {
        const left = r[1].trim();
        const right = r[2].trim();
        if (right && isRoleish(left) && !isRoleish(right)) {
          roleHint = left;
          name = right;
        }
      }

      name = name.replace(/\s+/g, ' ').trim();
      if (!name) continue;
      if (isNotEmployee(name)) continue;
      out.push({ name, shiftLabel, roleHint });
    }
    return out;
  }

  function isRoleish(s) {
    const n = norm(s);
    if (ROLES.some((r) => n === r || n.indexOf(r) === 0)) return true;
    return /\b(sales|cash|server|cook|dish|coord|barback|retail|hostess|cashier)\b/.test(n);
  }

  // -------------------------------------------------------------------------
  //  ¿ES LOCATION O ES ROL?
  //  Regla del archivo real: si la fila tiene horario o nombre,
  //  la primera columna es un ROL; si no tiene ninguno, es una LOCATION.
  //  Excepción: la celda puede traer "Slush Factory 10-9:30" (location+hora).
  // -------------------------------------------------------------------------
  const LOCATION_HINTS = [
    'kitchen', 'snacks', 'fair', 'slush', 'stand', 'barnyard', 'oasis', 'dutch',
    'world', 'dippin', 'shores', 'pavilion', 'pav', 'back ops', 'front ops',
    'beer tent', 'am help', 'student', 'character', 'breakfast', 'cart', 'tasting'
  ];

  function splitLocationAndTime(text) {
    const s = String(text == null ? '' : text).trim();
    if (!s) return { location: '', time: '' };
    // "Slush Factory 10-9:30"  /  "Barnyard 10-9"
    const m = s.match(/^(.*?)\s+(\d{1,2}(?::\d{2})?\s*-\s*\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)$/i);
    if (m) return { location: m[1].trim(), time: m[2].trim() };
    return { location: s, time: '' };
  }

  function looksLikeLocation(text) {
    const n = norm(text);
    if (!n) return false;
    return LOCATION_HINTS.some((h) => n.indexOf(h) !== -1);
  }

  // -------------------------------------------------------------------------
  //  PARSER PRINCIPAL DE UN BLOQUE
  // -------------------------------------------------------------------------
  function parseBlock(rows, cLoc, cTime, cName, startRow, blockLabel) {
    const out = [];
    let currentLocation = '';
    let lastRange = null;              // ultimo rango leido, para "until HH"
    const issues = [];
    const skipped = [];

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i] || [];
      const rawLoc = String(row[cLoc] == null ? '' : row[cLoc]).trim();
      const rawTime = String(row[cTime] == null ? '' : row[cTime]).trim();
      const rawName = String(row[cName] == null ? '' : row[cName]).trim();
      const excelRow = i + 1;

      if (!rawLoc && !rawTime && !rawName) continue;

      // "Notes" y secciones sin personal no son locations
      if (/^notes?$/i.test(rawLoc) && !rawName && !rawTime) break;

      const splitLt = splitLocationAndTime(rawLoc);
      const hasTime = rawTime !== '' || splitLt.time !== '';
      const hasName = rawName !== '';

      // --- 1. Es una LOCATION si no trae horario ni nombre ---
      if (!hasTime && !hasName) {
        // Regla del formato real: una celda suelta sin horario ni personal es
        // un encabezado de seccion -> nueva LOCATION heredada por las filas
        // siguientes ("Pixie/DD Kitchen", "Guard House Snacks", "Food Fair"...).
        const cand = splitLt.location;
        if (cand && looksLikeLocation(cand)) {
          currentLocation = cand;
          lastRange = null;
          out.push({ __type: 'section', location: cand, excelRow, block: blockLabel });
        } else {
          // No es una location conocida (p.ej. "Tea", "Extra Tasks").
          // No se inventa nada: se anota y la location anterior sigue vigente.
          skipped.push({ excelRow, block: blockLabel, text: cand || rawLoc });
        }
        continue;
      }

      // --- 2. Si la celda trae location embebida ("Slush Factory 10-9:30") ---
      let timeCell = rawTime;
      if (splitLt.time) {
        currentLocation = splitLt.location;
        lastRange = null;
        timeCell = splitLt.time;
      }

      // La primera columna es el ROL cuando la fila trae horario o personal.
      const role = looksLikeRole(rawLoc) ? rawLoc : (currentLocation && rawLoc === currentLocation ? '' : rawLoc);

      // --- 3. Nombres ---
      const people = parseEmployeeCell(rawName);
      if (!people.length) {
        if (timeCell) {
          // "Extra Tasks | 11-5:30 | N/A"  -> sección sin personal
          issues.push({ excelRow, reason: 'no_employee', detail: role || rawLoc, location: currentLocation });
        }
        continue;
      }

      // --- 4. Horarios ---
      const t = parseTimeCell(timeCell);
      let ranges = [];
      let timeProblem = null;

      if (t.kind === 'range') {
        ranges = t.ranges;
      } else if (t.kind === 'until') {
        // "until 10pm" continua el turno anterior.
        const prev = lastRange;
        if (prev) ranges = [{ start: prev.end, end: t.end, raw: t.raw }];
        else { ranges = []; timeProblem = 'until_without_previous'; }
      } else if (t.kind === 'empty') {
        ranges = [];
      } else {
        ranges = [];
        timeProblem = t.reason || 'bad_time';
      }

      if (ranges.length) lastRange = ranges[ranges.length - 1];

      if (!ranges.length) {
        // Sin horario utilizable: la fila queda para revisión (no se inventa nada)
        people.forEach((p) => {
          out.push(makeRecord({
            employee: p, location: currentLocation, role: p.roleHint || role || '',
            start: null, end: null, excelRow, block: blockLabel,
            _rawTime: timeCell || '',
            _needsReview: timeProblem || 'missing_time'
          }));
        });
        continue;
      }

      // --- 5. Emparejar por posición (§5) ---
      people.forEach((p, idx) => {
        let r;
        let review = null;

        if (people.length === ranges.length) {
          // Caso normal: N empleados / N rangos -> emparejamiento por posicion.
          //   "9-5pm / 5pm-10pm" + "Anna / Raluca"
          //     Anna -> 09:00-17:00 ; Raluca -> 17:00-22:00
          r = ranges[idx];
        } else if (people.length === 1 && ranges.length > 1) {
          // 1 persona y varios rangos: se toma del inicio del primero al fin
          // del ultimo, pero se marca para revision porque casi siempre
          // falta el nombre de la segunda persona.
          //   "8-5pm / 4pm-10pm" + "Ploi" -> 08:00-22:00 (revisar)
          r = { start: ranges[0].start, end: ranges[ranges.length - 1].end, raw: ranges.map((x) => x.raw).join(' / ') };
          review = 'multiple_ranges_single_employee';
        } else if (people.length > ranges.length) {
          // Mas personas que rangos: el ultimo rango se reparte entre los que
          // sobran. Si solo hay UN rango no hay nada raro (varias personas
          // cubriendo el mismo turno, p.ej. "Jay / Jacob / Fabian").
          r = ranges[Math.min(idx, ranges.length - 1)];
          if (ranges.length > 1) review = 'more_employees_than_ranges';
        } else {
          // Mas rangos que personas que no sea 1 vs N.
          r = ranges[idx];
        }

        out.push(makeRecord({
          employee: p,
          location: currentLocation,
          role: p.roleHint || role || '',
          start: toHHMM(r.start),
          end: toHHMM(r.end),
          excelRow,
          block: blockLabel,
          _needsReview: review,
          _rawTime: ranges.length > 1 ? r.raw : null
        }));
      });
    }

    return { records: out, issues, skipped };
  }

  function makeRecord(o) {
    return {
      employee_name: o.employee.name,
      shift_label: o.employee.shiftLabel || null,
      location_name: o.location || '',
      role: o.role || '',
      start_time: o.start,
      end_time: o.end,
      excel_row: o.excelRow,
      block: o.block,
      needs_review: o._needsReview || null,
      raw_time: o._rawTime || null,
      work_date: null            // lo rellena el usuario (§8)
    };
  }

  function looksLikeRole(text) {
    const n = norm(text);
    if (!n) return false;
    if (/^(front ops|back ops)$/.test(n)) return false;   // son titulos de bloque
    return ROLES.some((r) => n === r || n.indexOf(r + ' ') === 0 || n.indexOf(r + '-') === 0);
  }

  // -------------------------------------------------------------------------
  //  ENTRADA PRINCIPAL: hoja Schedule completa (dos bloques)
  // -------------------------------------------------------------------------
  function parseScheduleSheet(rows, sheetName) {
    const blocks = [];

    // Detectar columnas de los dos bloques buscando las cabeceras Time/Name
    const left = findBlockColumns(rows, 0, 4);
    const right = findBlockColumns(rows, 4, 12);

    if (left) blocks.push(parseBlock(rows, left.loc, left.time, left.name, left.startRow, 'left'));
    if (right) blocks.push(parseBlock(rows, right.loc, right.time, right.name, right.startRow, 'right'));

    const records = [];
    const issues = [];
    const skipped = [];
    blocks.forEach((b) => {
      records.push(...b.records);
      issues.push(...b.issues);
      skipped.push(...(b.skipped || []));
    });

    return {
      sheet: sheetName,
      format: 'quinyx_schedule',
      blocks: blocks.length,
      records: records.filter((r) => r.__type !== 'section'),
      sections: records.filter((r) => r.__type === 'section').map((r) => r.location),
      issues,
      skipped
    };
  }

  // Busca "Time" en la columna c y "Name" en c+1
  function findBlockColumns(rows, from, to) {
    const limit = Math.min(rows.length, 8);
    for (let i = 0; i < limit; i++) {
      const r = rows[i] || [];
      for (let c = from; c < to && c < r.length; c++) {
        if (norm(r[c]) === 'time') {
          const nameCol = c + 1;
          if (norm(r[nameCol]) === 'name') {
            return { loc: c - 1, time: c, name: nameCol, startRow: i + 1 };
          }
        }
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  //  HOJA EMPLEADOS (export de empleados de Quinyx) — solo matching
  // -------------------------------------------------------------------------
  function parseEmployeesSheet(rows, sheetName) {
    if (!rows || !rows.length) return { sheet: sheetName, employees: [] };
    const head = (rows[0] || []).map((h) => norm(h));
    const col = (n) => head.findIndex((h) => h.indexOf(norm(n)) !== -1);
    const iName = col('nombre') !== -1 ? col('nombre') : col('name');
    const iNat = col('nacionalidad');
    const iAge = col('edad') !== -1 ? col('edad') : col('age');
    const iRole = col('rol') !== -1 ? col('rol') : col('role');
    const iGroup = col('grupo') !== -1 ? col('grupo') : col('group');
    const iStatus = col('estado') !== -1 ? col('estado') : col('status');
    const iBadge = col('badge');

    const employees = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const name = String(r[iName] || '').trim();
      if (!name || isNotEmployee(name)) continue;
      employees.push({
        name,
        nationality: iNat >= 0 ? String(r[iNat] || '').trim() : null,
        age: iAge >= 0 ? (r[iAge] === '' ? null : r[iAge]) : null,
        role: iRole >= 0 ? String(r[iRole] || '').trim() : null,
        group: iGroup >= 0 ? String(r[iGroup] || '').trim() : null,
        status: iStatus >= 0 ? String(r[iStatus] || '').trim() : null,
        badge: iBadge >= 0 ? String(r[iBadge] || '').trim() : null,
        excelRow: i + 1
      });
    }
    return { sheet: sheetName, employees };
  }

  return {
    parseScheduleSheet,
    parseEmployeesSheet,
    parseEmployeeCell,
    parseTimeCell,
    parseRange,
    looksLikeQuinyxSchedule,
    looksLikeLocation,
    isRoleish,
    toHHMM,
    norm
  };
})();

// Exportacion para Node (tests / herramientas de desarrollo).
// En el navegador se expone en window para que excel-import.js lo use.
if (typeof module !== 'undefined' && module.exports) module.exports = QuinyxParser;
if (typeof window !== 'undefined') window.QuinyxParser = QuinyxParser;
if (typeof globalThis !== 'undefined') globalThis.QuinyxParser = QuinyxParser;