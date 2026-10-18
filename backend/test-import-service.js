// Pruebas de la normalización de fechas, horas y solapamiento.
// Herramienta de desarrollo.
const assert = require('assert');
const S = require('./import-service');

let pass = 0, fail = 0;
function t(desc, fn) {
  try { fn(); pass++; console.log('  OK   ' + desc); }
  catch (e) { fail++; console.log('  FAIL ' + desc + '  -> ' + e.message); }
}
const v = (x) => (x && typeof x === 'object' && 'value' in x ? x.value : x);

console.log('\n== FECHAS (§15) ==');
t('YYYY-MM-DD', () => assert.strictEqual(v(S.normalizeDate('2026-09-30')), '2026-09-30'));
t('MM/DD/YYYY -> 09/30/2026', () => assert.strictEqual(v(S.normalizeDate('09/30/2026')), '2026-09-30'));
t('DD/MM/YYYY -> 30/09/2026', () => assert.strictEqual(v(S.normalizeDate('30/09/2026')), '2026-09-30'));
t('DD/MM con año 2 dígitos', () => assert.strictEqual(v(S.normalizeDate('30/09/26')), '2026-09-30'));
t('ambiguo 05/06/2026 marca ambiguous', () => {
  const r = S.normalizeDate('05/06/2026');
  assert.ok(r && r.ambiguous === true, 'debe marcar ambiguous');
  assert.strictEqual(r.value, '2026-05-06');
});
t('serial Excel 46295 -> 2026-09-30', () => assert.strictEqual(v(S.normalizeDate(46295)), '2026-09-30'));
t('serial Excel 45658 -> 2025-01-01', () => assert.strictEqual(v(S.normalizeDate(45658)), '2025-01-01'));
t('ISO con hora', () => assert.strictEqual(v(S.normalizeDate('2026-09-30T14:00:00Z')), '2026-09-30'));
t('basura -> null', () => assert.strictEqual(S.normalizeDate('N/A'), null));
t('vacio -> null', () => assert.strictEqual(S.normalizeDate(''), null));

console.log('\n== HORAS (§16) ==');
t('"10:00 AM" -> 10:00', () => assert.strictEqual(S.normalizeTime('10:00 AM'), '10:00'));
t('"6:00 PM"  -> 18:00', () => assert.strictEqual(S.normalizeTime('6:00 PM'), '18:00'));
t('"12:00 AM" -> 00:00', () => assert.strictEqual(S.normalizeTime('12:00 AM'), '00:00'));
t('"12:00 PM" -> 12:00', () => assert.strictEqual(S.normalizeTime('12:00 PM'), '12:00'));
t('"18:30"    -> 18:30', () => assert.strictEqual(S.normalizeTime('18:30'), '18:30'));
t('"9:05 am"  -> 09:05', () => assert.strictEqual(S.normalizeTime('9:05 am'), '09:05'));
t('"9 AM"     -> 09:00', () => assert.strictEqual(S.normalizeTime('9 AM'), '09:00'));
t('fraccion 0.5 -> 12:00', () => assert.strictEqual(S.normalizeTime(0.5), '12:00'));
t('basura -> null', () => assert.strictEqual(S.normalizeTime('N/A'), null));

console.log('\n== HORAS DECIMALES ==');
t('"8.10" -> 8.1', () => assert.strictEqual(S.normalizeHours('8.10'), 8.1));
t('"8,10" -> 8.1', () => assert.strictEqual(S.normalizeHours('8,10'), 8.1));
t('"8:10" -> 8.17', () => assert.strictEqual(S.normalizeHours('8:10'), 8.17));
t('8.1 -> 8.1', () => assert.strictEqual(S.normalizeHours(8.1), 8.1));

console.log('\n== SOLAPAMIENTO (§8) — intervalo semiabierto ==');
t('10-14 vs 14-18: NO solapa (toque valido)', () =>
  assert.strictEqual(S.hasTimeOverlap('10:00', '14:00', '14:00', '18:00'), false));
t('10-14 vs 12-16: SI solapa', () =>
  assert.strictEqual(S.hasTimeOverlap('10:00', '14:00', '12:00', '16:00'), true));
t('10-14 vs 09-13: SI solapa', () =>
  assert.strictEqual(S.hasTimeOverlap('10:00', '14:00', '09:00', '13:00'), true));
t('10-14 vs 15-18: NO solapa', () =>
  assert.strictEqual(S.hasTimeOverlap('10:00', '14:00', '15:00', '18:00'), false));
t('mismo horario: SI solapa', () =>
  assert.strictEqual(S.hasTimeOverlap('10:00', '14:00', '10:00', '14:00'), true));
t('14-18 vs 10-14 (invertido): NO solapa', () =>
  assert.strictEqual(S.hasTimeOverlap('14:00', '18:00', '10:00', '14:00'), false));
t('sin horas: NO solapa', () =>
  assert.strictEqual(S.hasTimeOverlap(null, null, '10:00', '14:00'), false));

console.log('\n== timeToMinutes ==');
t('10:00 -> 600', () => assert.strictEqual(S.timeToMinutes('10:00'), 600));
t('14:30 -> 870', () => assert.strictEqual(S.timeToMinutes('14:30'), 870));

console.log('\n' + pass + ' pasaron, ' + fail + ' fallaron');
process.exit(fail ? 1 : 0);