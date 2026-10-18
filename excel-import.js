// ============================================================================
//  IMPORTADOR DE EXCEL — análisis, mapeo y normalización  (§1-§6, §15-§18)
// ============================================================================
//  No guarda nada: sólo analiza y propone. La escritura la hace el servidor
//  tras la confirmación del usuario.
//
//  CAPA DE IMPORT SOURCES (§17)
//    source = 'excel'  -> este módulo (parsea con SheetJS)
//    source = 'quinyx' -> futuro: llamará a normalizeRows() con los datos de
//                         la API v3 de Quinyx y reutilizará TODO lo de abajo.
//  Ambos terminan en el mismo contrato de datos normalizados.
// ============================================================================

// Parser del formato real de horario (Quinyx / Story Land). Vive en su propio
// archivo para poder probarlo con node sin navegador.
const QPARSER = (typeof window !== 'undefined' && window.QuinyxParser) ? window.QuinyxParser
  : (typeof globalThis !== 'undefined' && globalThis.QuinyxParser) ? globalThis.QuinyxParser
  : (typeof QuinyxParser !== 'undefined') ? QuinyxParser
  : (typeof require === 'function' && typeof __dirname !== 'undefined')
      ? require(__dirname + '/quinyx-parser.js')
      : null;

const ExcelImport = (() => {

  // -------------------------------------------------------------------------
  //  SINÓNIMOS DE COLUMNAS (§2, §6)
  //  La detección se basa en el CONTENIDO, no en el nombre del archivo.
  // -------------------------------------------------------------------------
  const FIELD_ALIASES = {
    employee:      ['employee', 'employe', 'employee name', 'staff', 'staff name', 'name',
                    'worker', 'empleado', 'nombre', 'nombre empleado', 'empleados', 'staff member'],
    employee_id:   ['employee id', 'emp id', 'id', 'employee #', 'staff id', 'id empleado',
                    'quinyx id', 'employeeid', 'empid'],
    badge:         ['badge', 'badge number', 'badge #', 'badge id', 'numero de badge', 'b.number'],
    first_name:    ['first name', 'firstname', 'nombre', 'given name'],
    last_name:     ['last name', 'lastname', 'apellido', 'surname', 'family name'],
    location:      ['location', 'site', 'work location', 'store', 'building', 'locacion',
                    'punto de venta', 'restaurante', 'establishment'],
    date:          ['date', 'work date', 'shift date', 'fecha', 'fecha de trabajo', 'day', 'dia'],
    start_time:    ['start', 'start time', 'shift start', 'in', 'clock in', 'time in',
                    'hora inicio', 'inicio', 'entrada'],
    end_time:      ['end', 'end time', 'shift end', 'out', 'clock out', 'time out',
                    'hora fin', 'fin', 'salida'],
    hours:         ['hours', 'worked hours', 'total hours', 'horas', 'horas trabajadas', 'hrs'],
    regular_hours: ['regular hours', 'regular', 'horas regulares', 'horas normales'],
    overtime:      ['overtime', 'ot', 'horas extra', 'extra hours', 'over time'],
    break:         ['break', 'break minutes', 'break time', 'descanso', 'descanso (min)'],
    department:    ['department', 'dept', 'section', 'departamento', 'seccion', 'area', 'área']
  };

  // Campos que Distinguen un HORARIO de un REPORTE DE HORAS (§2)
  const SCHEDULE_HINTS = ['start', 'end', 'shift start', 'shift end', 'start time', 'end time',
                          'hora inicio', 'hora fin', 'inicio', 'fin'];
  const TIMESHEET_HINTS = ['clock in', 'clock out', 'clockin', 'clockout', 'worked hours',
                           'regular hours', 'overtime', 'total hours', 'time in', 'time out'];

  const normHeader = (h) => String(h == null ? '' : h).toLowerCase().replace(/[\s_\-.]+/g, ' ').trim();

  // -------------------------------------------------------------------------
  //  LECTURA DEL ARCHIVO (§1)
  // -------------------------------------------------------------------------
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read_error'));
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), {
            type: 'array',
            cellDates: true,      // devuelve Date en vez de serial cuando puede
            raw: false
          });
          const sheets = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
            return { name, rows };
          });
          resolve({ sheetNames: wb.SheetNames, sheets });
        } catch (err) {
          reject(new Error('parse_error: ' + err.message));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // La fila de encabezados es la primera fila con >= 3 celdas no vacías.
  function findHeaderRow(rows) {
    const limit = Math.min(rows.length, 12);
    let best = { index: 0, score: -1 };
    for (let i = 0; i < limit; i++) {
      const filled = (rows[i] || []).filter((c) => String(c).trim() !== '').length;
      const texty = (rows[i] || []).filter((c) => typeof c === 'string' && String(c).trim() !== '').length;
      const score = filled + texty;
      if (filled >= 3 && score > best.score) best = { index: i, score };
    }
    return best.index;
  }

  // -------------------------------------------------------------------------
  //  MAPEO DE COLUMNAS (§6)
  // -------------------------------------------------------------------------
  function guessMapping(headers) {
    const mapping = {};
    const used = new Set();
    headers.forEach((raw, idx) => {
      const h = normHeader(raw);
      if (!h) return;
      let best = null, bestLen = 0;
      for (const field of Object.keys(FIELD_ALIASES)) {
        for (const alias of FIELD_ALIASES[field]) {
          // coincidencia exacta o el alias contenido en el encabezado
          if (h === alias || (h.includes(alias) && alias.length > bestLen) ||
              (alias.includes(h) && h.length >= 4 && h.length > bestLen)) {
            if (alias.length > bestLen && !used.has(field)) { best = field; bestLen = alias.length; }
          }
        }
      }
      if (best) { mapping[best] = idx; used.add(best); }
    });
    return mapping;
  }

  // -------------------------------------------------------------------------
  //  DETECCIÓN DEL TIPO (§2) — por contenido de encabezados y de datos
  // -------------------------------------------------------------------------
  function detectType(headers, sampleRows) {
    const normed = headers.map(normHeader);
    const has = (list) => list.some((a) => normed.some((h) => h === a || h.includes(a)));

    const scheduleSignals = has(SCHEDULE_HINTS);
    const timesheetSignals = has(TIMESHEET_HINTS);

    // Señales en los DATOS: si "start"/"end" contienen horas tipo 10:00 / 10:00 AM
    let timeLike = 0, dateLike = 0;
    const idxStart = guessMapping(headers).start_time;
    const idxDate = guessMapping(headers).date;
    if (idxStart !== undefined) {
      sampleRows.slice(0, 25).forEach((r) => {
        if (looksLikeTime(r[idxStart])) timeLike++;
      });
    }
    if (idxDate !== undefined) {
      sampleRows.slice(0, 25).forEach((r) => {
        if (looksLikeDate(r[idxDate])) dateLike++;
      });
    }

    if (timesheetSignals && !scheduleSignals) return 'timesheet';
    if (scheduleSignals && !timesheetSignals) return 'schedule';
    if (timeLike >= 3 && dateLike >= 3) return 'schedule';
    if (timesheetSignals) return 'timesheet';
    if (scheduleSignals) return 'schedule';
    return 'unknown';
  }

  function looksLikeTime(v) {
    if (v === null || v === undefined || v === '') return false;
    if (v instanceof Date) return true;
    const s = String(v).trim();
    return /^(\d{1,2}[:.]\d{2})|(\d{1,2}\s*[AaPp]\.?[Mm]\.?)$/.test(s) || /^\d{1,2}:\d{2}:\d{2}$/.test(s);
  }
  function looksLikeDate(v) {
    if (v === null || v === undefined || v === '') return false;
    if (v instanceof Date) return true;
    const s = String(v).trim();
    return /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s) || /\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(s);
  }

  // -------------------------------------------------------------------------
  //  NORMALIZACIÓN DE FECHA/HORA en el cliente (§15, §16)
  //  Mismo criterio que backend/import-service.js.
  // -------------------------------------------------------------------------
  const pad = (n) => String(n).padStart(2, '0');

  function normDate(v) {
    if (v === null || v === undefined || v === '') return { value: null };
    if (v instanceof Date && !isNaN(v)) {
      return { value: `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}` };
    }
    const s = String(v).trim();
    if (!s) return { value: null };

    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return { value: `${m[1]}-${pad(m[2])}-${pad(m[3])}` };

    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) {
      const a = +m[1], b = +m[2];
      let y = +m[3];
      if (y < 100) y += y < 70 ? 2000 : 1900;
      if (a > 12 && b <= 12) return { value: `${y}-${pad(b)}-${pad(a)}` };
      if (b > 12 && a <= 12) return { value: `${y}-${pad(a)}-${pad(b)}` };
      // ambiguo: se asume MM/DD (convención de Quinyx) pero se marca
      return { value: `${y}-${pad(a)}-${pad(b)}`, ambiguous: true };
    }
    return { value: null };
  }

  function normTime(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date && !isNaN(v)) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
    if (typeof v === 'number' && v >= 0 && v < 1) {
      const m = Math.round(v * 1440);
      return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]?\.?$/);
    if (m) {
      let h = +m[1];
      const pm = /p/i.test(m[3]);
      if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12;
      return `${pad(h)}:${m[2]}`;
    }
    m = s.match(/^(\d{1,2})[:.](\d{2})(:\d{2})?$/);
    if (m) return `${pad(+m[1])}:${m[2]}`;
    m = s.match(/^(\d{1,2})\s*([AaPp])[Mm]?\.?$/);
    if (m) {
      let h = +m[1];
      const pm = /p/i.test(m[2]);
      if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12;
      return `${pad(h)}:00`;
    }
    return null;
  }

  function normHours(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return Math.round(v * 100) / 100;
    const s = String(v).trim();
    let m = s.match(/^(\d+):(\d{2})$/);
    if (m) return Math.round((+m[1] + +m[2] / 60) * 100) / 100;
    m = s.match(/^(\d+)[.,](\d+)$/);
    if (m) return Math.round(parseFloat(m[1] + '.' + m[2]) * 100) / 100;
    const n = parseFloat(s.replace(',', '.'));
    return isFinite(n) ? Math.round(n * 100) / 100 : null;
  }

  // -------------------------------------------------------------------------
  //  MATCHING DE EMPLEADOS (§4)
  //  Orden: external ID > badge > email > nombre+apellido > aproximado.
  //  NUNCA crea empleados. Si hay ambigüedad, la marca para que el usuario elija.
  // -------------------------------------------------------------------------
  const stripAccents = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const squish = (s) => stripAccents(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // normaliza plurales posingivos: 'dippins' ~ 'dippin'
  const sing = (t) => (t.length > 3 && /s$/.test(t) ? t.slice(0, -1) : t);

  function similarity(a, b) {
    const x = squish(a), y = squish(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    // token set
    const tx = new Set(x.split(' ')), ty = new Set(y.split(' '));
    let inter = 0;
    tx.forEach((t) => { if (ty.has(t)) inter++; });
    if (!inter) return 0;
    return (2 * inter) / (tx.size + ty.size);
  }

  // Similitud por caracteres (Levenshtein). La de tokens no sirve para
  // distinguir "Nadia Castro" de "Nadia Castroa" (0.5 en ambos casos), pero
  // §11 exige avisar cuando la BD tiene dos nombres casi iguales.
  function editSimilarity(a, b) {
    const x = squish(a), y = squish(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    const m = x.length, n = y.length;
    let prev = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(
          prev[j] + 1,                                  // borrar
          cur[j - 1] + 1,                                // insertar
          prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1)  // sustituir
        );
      }
      prev = cur;
    }
    return 1 - prev[n] / Math.max(m, n);
  }

  // Nombres "casi identicos" al buscado, sin ser el mismo (§11).
  function nearDuplicates(name, employees, exclude) {
    return employees.filter((e) => {
      if (exclude && String(e.id) === String(exclude.id)) return false;
      if (squish(e.name) === squish(name)) return false;
      return editSimilarity(name, e.name) >= 0.9;
    });
  }

  function matchEmployee(row, employees) {
    // 1) external ID
    if (row.external_id) {
      const hit = employees.find((e) => e.external_id && String(e.external_id) === String(row.external_id));
      if (hit) return { employee: hit, method: 'external_id', confident: true };
    }
    // 2) badge
    if (row.badge) {
      const hits = employees.filter((e) => e.badge_number && String(e.badge_number) === String(row.badge));
      if (hits.length === 1) return { employee: hits[0], method: 'badge', confident: true };
      if (hits.length > 1) return { employee: null, method: 'badge', ambiguous: hits };
    }
    // 3) email
    if (row.email) {
      const hit = employees.find((e) => e.email && squish(e.email) === squish(row.email));
      if (hit) return { employee: hit, method: 'email', confident: true };
    }
    // 4) nombre completo exacto (o first/last si no hay 'name')
    const name = squish(row.name || [row.first_name, row.last_name].filter(Boolean).join(' '));
    if (!name) return { employee: null, method: null };
    const exact = employees.filter((e) => squish(e.name) === name);
    if (exact.length === 1) {
      // §11: si además existen nombres casi idénticos ("Nadia Castro" y
      // "Nadia Castroa"), no decide solo: avisa y deja elegir.
      const twins = nearDuplicates(row.name, employees, exact[0]);
      if (twins.length) {
        return {
          employee: null, method: 'name_exact_ambiguous',
          ambiguous: [exact[0]].concat(twins)
        };
      }
      return { employee: exact[0], method: 'name_exact', confident: true };
    }
    if (exact.length > 1) return { employee: null, method: 'name_exact', ambiguous: exact };

    // 5) nombre + apellido por separado
    if (row.first_name || row.last_name) {
      const full = squish([row.first_name, row.last_name].filter(Boolean).join(' '));
      const byName = employees.filter((e) => {
        const parts = squish(e.name).split(' ');
        return parts[0] === squish(row.first_name || '') &&
               (parts[parts.length - 1] === squish(row.last_name || ''));
      });
      if (byName.length === 1) return { employee: byName[0], method: 'name_parts', confident: true };
      if (byName.length > 1) return { employee: null, method: 'name_parts', ambiguous: byName };
      if (full) {
        const ex2 = employees.filter((e) => squish(e.name) === full);
        if (ex2.length === 1) return { employee: ex2[0], method: 'name_parts', confident: true };
      }
    }

    // 6) aproximado — NUNCA decide solo: propone candidatos
    const scored = employees
      .map((e) => ({ e, s: similarity(name, e.name) }))
      .filter((x) => x.s >= 0.6)
      .sort((a, b) => b.s - a.s);
    if (scored.length === 0) return { employee: null, method: null };
    const top = scored[0];
    const second = scored[1];
    if (top.s >= 0.95 && (!second || top.s - second.s >= 0.1)) {
      return { employee: top.e, method: 'fuzzy', confident: true, score: top.s };
    }
    return { employee: null, method: 'fuzzy_suggest', candidates: scored.slice(0, 5), score: top.s };
  }

  // -------------------------------------------------------------------------
  //  MATCHING DE LOCATIONS (§5) — NUNCA crea locations
  // -------------------------------------------------------------------------
  function matchLocation(rawName, locations) {
    if (!rawName) return { location: null, method: null };
    const q = squish(rawName);

    // coincidencia por id exacto
    const byId = locations.find((l) => squish(l.id) === q);
    if (byId) return { location: byId, method: 'id', confident: true };

    // coincidencia por nombre exacto
    const byName = locations.filter((l) => squish(l.name) === q);
    if (byName.length === 1) return { location: byName[0], method: 'name_exact', confident: true };
    if (byName.length > 1) return { location: null, method: 'name_exact', ambiguous: byName };

    // El id contiene todos los tokens de la búsqueda, ya singularizados:
    //   "Pixie/DD Kitchen" -> pixie-kitchen   (pixie, kitchen)
    //   "Dippins Dots"     -> dippin-dots     (dippin, dots)
    //   "Oasis"            -> teddys-oasis
    //   "Pavilion Support" -> NO hace match con world-pavilion (falta "support")
    const toks = q.split(' ').filter((t) => t.length > 2).map(sing);
    if (toks.length) {
      const scored = locations
        .map((l) => {
          const idTokens = new Set(squish(l.id).split(' ').map(sing));
          const idHit = toks.every((t) => idTokens.has(t));
          return { l, s: Math.max(similarity(q, l.name), similarity(q, l.id)), idHit };
        })
        .filter((x) => x.idHit || x.s >= 0.5)
        .sort((a, b) => b.s - a.s);
      if (scored.length) {
        const top = scored[0];
        const second = scored[1];
        // Un acierto por tokens del id ("Pixie/DD Kitchen" -> "pixie-kitchen")
        // es fiable. Un acierto solo por similitud necesita un listón alto:
        // si no, "Pavilion Support" se asignaría a "World Pavilion" sin avisar.
        if (top.idHit) {
          return { location: top.l, method: 'id_tokens', confident: true, score: top.s };
        }
        const clearFuzzy = top.s >= 0.8 && (!second || top.s - second.s >= 0.15);
        if (clearFuzzy) {
          return { location: top.l, method: 'fuzzy', confident: true, score: top.s };
        }
        return { location: null, method: 'fuzzy_suggest', candidates: scored.slice(0, 5).map((x) => x.l), score: top.s };
      }
    }
    return { location: null, method: null };
  }

  // -------------------------------------------------------------------------
  //  CONSTRUCCIÓN DE FILAS NORMALIZADAS (contrato común Excel/Quinyx)
  // -------------------------------------------------------------------------
  function buildRows(sheet, headerIndex, mapping, detected) {
    const out = [];
    const data = sheet.rows.slice(headerIndex + 1);
    data.forEach((r, i) => {
      const cells = Array.isArray(r) ? r : [r];
      const get = (f) => (mapping[f] === undefined || mapping[f] === null ? null : cells[mapping[f]]);

      const rawDate = get('date');
      const d = normDate(rawDate);
      const rawTime = String(get('start_time') == null ? '' : get('start_time')).trim();
      const rawEnd = String(get('end_time') == null ? '' : get('end_time')).trim();

      const row = {
        __index: out.length,
        __excelRow: headerIndex + 2 + i,           // +2: 1-based + header
        __raw: cells,
        kind: detected === 'timesheet' ? 'hours' : 'schedule',
        name: cell(get('employee')),
        first_name: cell(get('first_name')),
        last_name: cell(get('last_name')),
        employee_id: cell(get('employee_id')),
        badge: cell(get('badge')),
        email: cell(get('email')),
        department: cell(get('department')),
        location_name: cell(get('location')),
        work_date: d.value,
        date_ambiguous: !!d.ambiguous,
        start_time: normTime(get('start_time')),
        end_time: normTime(get('end_time')),
        clock_in: normTime(get('start_time')),
        clock_out: normTime(get('end_time')),
        worked_hours: normHours(get('hours')),
        regular_hours: normHours(get('regular_hours')),
        overtime_hours: normHours(get('overtime')),
        break_minutes: get('break') === null || get('break') === '' ? null : Math.round(+get('break') || 0)
      };
      // si no se reconoció start/end pero hay valores, reintenta una vez
      if (!row.start_time && rawTime) row.start_time = normTime(rawTime);
      if (!row.end_time && rawEnd) row.end_time = normTime(rawEnd);
      out.push(row);
    });
    // descarta filas totalmente vacías
    return out.filter((r) => Object.values(r.__raw).some((c) => String(c == null ? '' : c).trim() !== ''));
  }

  function cell(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  }

  // -------------------------------------------------------------------------
  //  FORMATO REAL DE HORARIO (Quinyx / Story Land)
  //  Traduce el layout visual de la hoja "Schedule" al MISMO contrato de
  //  filas que usa la tabla plana, para que el resto del importador
  //  (matching, validacion, previsualizacion, commit) no cambie.
  //
  //  Differences con la tabla plana:
  //    - la fecha NO viene en el archivo -> queda en null y la pide el usuario
  //    - la location se hereda de la seccion, no se repite en cada fila
  //    - una fila puede generar VARIAS asignaciones (empleados x rangos)
  // -------------------------------------------------------------------------
  function isQuinyxSchedule(rows) {
    if (!QPARSER) return false;
    return QPARSER.looksLikeQuinyxSchedule(rows);
  }

  function buildQuinyxScheduleRows(rows, sheetName) {
    const parsed = QPARSER.parseScheduleSheet(rows, sheetName);

    const out = parsed.records.map((rec, i) => ({
      // __index es la posicion DENTRO de este array, igual que hace buildRows.
      // El servidor y la vista previa lo usan para indexar, asi que no puede
      // tener huecos aunque algunas filas queden marcadas para revision.
      __index: i,
      __excelRow: rec.excel_row,
      __block: rec.block,
      __rawTime: rec.raw_time,
      kind: 'schedule',
      name: rec.employee_name,
      first_name: null,
      last_name: null,
      employee_id: null,
      badge: null,
      email: null,
      department: null,
      location_name: cell(rec.location_name),
      role: cell(rec.role),
      shift_label: cell(rec.shift_label),
      work_date: null,            // §8: lo pregunta el usuario
      date_ambiguous: false,
      start_time: rec.start_time,
      end_time: rec.end_time,
      clock_in: rec.start_time,
      clock_out: rec.end_time,
      worked_hours: null,
      regular_hours: null,
      overtime_hours: null,
      break_minutes: null,
      needs_review: rec.needs_review || null
    }));

    return {
      rows: out,
      meta: {
        format: parsed.format,
        blocks: parsed.blocks,
        sections: parsed.sections,
        issues: parsed.issues,
        skipped: parsed.skipped,
        employees: []
      }
    };
  }

  // -------------------------------------------------------------------------
  //  HOJA DE EMPLEADOS (export de Quinyx) — soloMatching (§11)
  //  No crea empleados: alimenta el matching y la resolución de ambigüedades.
  // -------------------------------------------------------------------------
  function buildEmployeesReference(rows, sheetName) {
    if (!QPARSER) return [];
    return QPARSER.parseEmployeesSheet(rows, sheetName).employees;
  }

  return {
    readFile,
    findHeaderRow,
    guessMapping,
    detectType,
    buildRows,
    isQuinyxSchedule,
    buildQuinyxScheduleRows,
    buildEmployeesReference,
    matchEmployee,
    matchLocation,
    normDate,
    normTime,
    normHours,
    similarity,
    FIELD_ALIASES
  };
})();

// El parser del formato real vive aparte (quinyx-parser.js) para poder
// probarlo con node sin navegador.
if (typeof module !== 'undefined' && module.exports) module.exports = ExcelImport;

