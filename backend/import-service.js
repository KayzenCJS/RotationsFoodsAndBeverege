// ============================================================================
//  IMPORT SERVICE — capa común para Excel y (futuro) Quinyx  (§17)
// ============================================================================
//  Flujo:  Source -> Adapter -> Normalized rows -> Validation -> Commit
//
//  IMPORT SOURCES
//    excel   : archivo .xlsx/.xls procesado en el cliente (SheetJS)
//    quinyx  : reservado; usará el MISMO contrato de datos normalizados
//
//  Este módulo contiene SOLO lo que debe ser autoritativo en el servidor:
//    - normalización/validación de fecha y hora (§15, §16)
//    - detección de solapamiento con la MISMA semántica que la UI (§8)
//    - escritura transaccional (§14)
//  La resolución de empleados/locations la hace el cliente con los datos que
//  ya tiene en memoria, y aquí se revalida por seguridad.
// ============================================================================

const TZ = 'America/Santo_Domingo'; // misma zona que usa script.js

// ---------------------------------------------------------------------------
// Fechas (§15): Excel entrega MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD o un
// serial de fecha. NO usamos el formato del navegador.
// ---------------------------------------------------------------------------

// Serial de Excel: días desde 1899-12-30 (con el bug del año bisiesto de 1900).
function excelSerialToDate(serial) {
  const days = Math.floor(serial);
  const ms = (days - 25569) * 86400000; // 25569 = serial de 1970-01-01
  return new Date(ms);
}

/**
 * Normaliza cualquier entrada de fecha de Excel a 'YYYY-MM-DD'.
 * Devuelve null si no se puede interpretar.
 */
function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return null;

  // 1) Date nativo (cuando SheetJS entrega celda de fecha)
  if (value instanceof Date && !isNaN(value)) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  // 2) Serial numérico de Excel
  if (typeof value === 'number' && isFinite(value)) {
    if (value > 20000 && value < 60000) { // rango plausible de seriales
      const d = excelSerialToDate(value);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    return null;
  }

  const s = String(value).trim();
  if (!s) return null;

  // 3) ISO completo: YYYY-MM-DD (con o sin hora)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  // 4) DD/MM/YYYY o MM/DD/YYYY — se decide por el valor, no por el locale.
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let a = parseInt(m[1], 10);
    let b = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += y < 70 ? 2000 : 1900;
    // Si el primer componente > 12, no puede ser mes => es DD/MM.
    if (a > 12 && b <= 12) return `${y}-${pad(b)}-${pad(a)}`;
    // Si el segundo > 12, es MM/DD.
    if (b > 12 && a <= 12) return `${y}-${pad(a)}-${pad(b)}`;
    return { value: `${y}-${pad(a)}-${pad(b)}`, ambiguous: true };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Horas (§16): "10:00 AM" -> "10:00";  "18:00" -> "18:00". Sin conversiones UTC.
// ---------------------------------------------------------------------------
function normalizeTime(value) {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !isNaN(value)) {
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  // Fracción de día de Excel (0.5 = 12:00)
  if (typeof value === 'number' && isFinite(value)) {
    if (value >= 0 && value < 1) {
      const totalMin = Math.round(value * 24 * 60);
      return `${pad(Math.floor(totalMin / 60))}:${pad(totalMin % 60)}`;
    }
    // 45300 = 12:30 en formato numérico de Excel
    if (value > 0 && value < 1) return null;
  }

  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]?\.?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2];
    const pm = /p/i.test(m[3]);
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
    return `${pad(h)}:${min}`;
  }

  m = s.match(/^(\d{1,2})[:.](\d{2})$/);
  if (m) return `${pad(parseInt(m[1], 10))}:${m[2]}`;

  // Postgres devuelve las columnas `time` como "HH:MM:SS"; Excel puede
  // devolver "HH:MM:SS AM/PM". Sin esto, un horario ya guardado en la base de
  // datos llega como null al comparar y se perdería la validación.
  m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*([AaPp])?[Mm]?\.?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const mer = m[4];
    if (mer) {
      if (/p/i.test(mer) && h < 12) h += 12;
      if (/a/i.test(mer) && h === 12) h = 0;
    }
    if (h > 24 || parseInt(m[3], 10) > 59) return null;
    return `${pad(h)}:${m[2]}`;
  }

  // "10 AM" sin minutos
  m = s.match(/^(\d{1,2})\s*([AaPp])[Mm]?\.?$/);
  if (m) {
    let h = parseInt(m[1], 10);
    const pm = /p/i.test(m[2]);
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
    return `${pad(h)}:00`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Números decimales (horas): "8.10", "8,10", "8:10", 8.1 -> 8.1
// ---------------------------------------------------------------------------
function normalizeHours(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && isFinite(value)) return round2(value);
  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/^(\d+):(\d{2})$/); // "8:10" -> 8.1667 -> se redondea a 8.17
  if (m) return round2(parseInt(m[1], 10) + parseInt(m[2], 10) / 60);

  m = s.match(/^(\d+)[.,](\d+)$/);
  if (m) return round2(parseFloat(m[1] + '.' + m[2]));

  const n = parseFloat(s.replace(',', '.'));
  return isFinite(n) ? round2(n) : null;
}

function round2(n) { return Math.round(n * 100) / 100; }
function pad(n) { return String(n).padStart(2, '0'); }

// ---------------------------------------------------------------------------
// Solapamiento (§8) — MISMA semántica que hasTimeOverlap() del frontend:
//   solapa  <=>  inicio1 < fin2  &&  fin1 > inicio2
// Es un intervalo SEMIABIERTO: 10:00-14:00 y 14:00-18:00 NO solapan.
// ---------------------------------------------------------------------------
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  if (isNaN(h)) return null;
  return h * 60 + (m || 0);
}

function hasTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  return s1 < e2 && e1 > s2;
}

module.exports = {
  TZ,
  normalizeDate,
  normalizeTime,
  normalizeHours,
  timeToMinutes,
  hasTimeOverlap,
  excelSerialToDate
};