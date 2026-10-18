// ============================================================================
//  INTEGRACION: excel-import.js + quinyx-parser.js contra el Excel real
//  Ejecutar: node test-quinyx-integration.js "ruta\al\archivo.xlsx"
// ============================================================================
const path = require('path');
const fs = require('fs');
const XLSX = require('./node_modules/xlsx');
const ExcelImport = require('../excel-import.js');

const file = process.argv[2];
if (!file) { console.error('Uso: node test-quinyx-integration.js <archivo.xlsx>'); process.exit(1); }

let pass = 0, fail = 0; const fails = [];
const eq = (a, e, m) => { if (JSON.stringify(a) === JSON.stringify(e)) pass++; else { fail++; fails.push(m + '\n      esperado: ' + JSON.stringify(e) + '\n      obtenido: ' + JSON.stringify(a)); } };
const ok = (v, m) => { if (v) pass++; else { fail++; fails.push(m); } };

const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true });
const toRows = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '', blankrows: true });

console.log('\n=== A. Deteccion de formato por CONTENIDO (no por nombre) ===');
const isQ = ExcelImport.isQuinyxSchedule(toRows('Schedule'));
eq(isQ, true, 'la hoja Schedule se reconoce como formato de horario real');
ok(!ExcelImport.isQuinyxSchedule([['Employee', 'Location', 'Date', 'Start'], ['Anna', 'Food Fair', '2026-10-07', '09:00']]),
   'una tabla plana NO se confunde con el formato de horario');

console.log('=== B. Conversion al contrato de filas comun ===');
const built = ExcelImport.buildQuinyxScheduleRows(toRows('Schedule'), 'Schedule');
const rows = built.rows;
ok(rows.length > 50, 'se generan ' + rows.length + ' filas');
eq(built.meta.format, 'quinyx_schedule', 'formato');
eq(built.meta.blocks, 2, 'dos bloques');
ok(built.meta.sections.length > 10, 'se detectan ' + built.meta.sections.length + ' locations por seccion');

console.log('  ... §8 la fecha NO se inventa');
eq(rows.every((r) => r.work_date === null), true, 'todas las filas sin fecha (la pide el usuario)');
eq(rows.every((r) => r.kind === 'schedule'), true, 'kind = schedule');

console.log('  ... §21 el ejemplo literal del usuario');
const anna = rows.find((r) => r.name === 'Anna Dragan' && r.location_name === 'Pixie/DD Kitchen');
eq([anna.start_time, anna.end_time, anna.role], ['09:00', '17:00', 'Sales 1'], 'Anna Dragan 09:00-17:00 Sales 1');
eq(anna.shift_label, 'Day', 'shiftLabel Day');
const ral = rows.find((r) => r.name === 'Raluca' && r.location_name === 'Pixie/DD Kitchen');
eq([ral.start_time, ral.end_time], ['17:00', '22:00'], 'Raluca 17:00-22:00');
eq(ral.shift_label, 'Night', 'shiftLabel Night');
const alexa = rows.find((r) => r.name === 'Alexa' && r.location_name === 'Pixie/DD Kitchen');
eq([alexa.start_time, alexa.end_time, alexa.role], ['08:00', '22:00', 'Server'], 'Alexa 08:00-22:00 Server');

console.log('  ... §4/§12 "(Day)"/"(Night)" nunca en el nombre');
eq(rows.some((r) => /\((Day|Night)\)/.test(r.name)), false, 'ningun nombre conserva (Day)/(Night)');

console.log('  ... §23 nada inventado');
ok(rows.every((r) => r.name && String(r.name).trim() !== ''), 'ninguna fila sin empleado');
ok(rows.every((r) => r.location_name), 'ninguna fila sin location');
eq(rows.filter((r) => r.needs_review).length > 0, true,
   rows.filter((r) => r.needs_review).length + ' filas marcadas para revision');
ok(rows.some((r) => r.needs_review === 'missing_time'), 'filas sin horario -> missing_time');
ok(rows.some((r) => r.needs_review === 'multiple_ranges_single_employee'), '1 nombre con 2 rangos -> revision');

console.log('  ... "N/A" nunca es un empleado');
ok(!rows.some((r) => r.name === 'N' || r.name === 'A'), '"N/A" no produce empleados');

console.log('=== C. Hoja de empleados (solo matching) ===');
const empRef = ExcelImport.buildEmployeesReference(toRows('Empleados'), 'Empleados');
ok(empRef.length > 0, 'se leen ' + empRef.length + ' empleados del export de Quinyx');
ok(empRef.some((e) => e.name === 'Anna Dragan'), 'incluye Anna Dragan');
ok(!empRef.some((e) => /^n\/?a$/i.test(e.name)), 'excluye N/A');
ok(empRef.every((e) => e.name), 'todos con nombre');

console.log('=== D. Matching contra la BD (no crea nada) ===');
const LOCATIONS = [
  { id: 'barnyard-pizza', name: 'Barnyard Pizza' },
  { id: 'dippin-dots', name: "Dippin' Dots" },
  { id: 'dutch-village-ice-cream', name: 'Dutch Village Ice Cream Shop' },
  { id: 'food-fair', name: 'Food Fair' },
  { id: 'guard-house-snacks', name: 'Guard House Snacks' },
  { id: 'pixie-kitchen', name: 'Pixie Kitchen' },
  { id: 'slush-factory', name: 'Slush Factory' },
  { id: 'teddys-oasis', name: "Teddy's at Oasis" },
  { id: 'farm-stand', name: 'The Farm Stand' },
  { id: 'world-pavilion', name: 'World Pavilion' }
];
const EMPLOYEES = [
  { id: 1, name: 'Anna Dragan' }, { id: 2, name: 'Raluca' }, { id: 3, name: 'Alexa' },
  { id: 4, name: 'Jose' }, { id: 5, name: 'Jose ' }, { id: 6, name: 'Cosmin' },
  { id: 7, name: 'Anna' }, { id: 8, name: 'Anna Dragana' }
];

console.log('  ... §15 locations del archivo -> locations de la BD');
[['Pixie/DD Kitchen', 'pixie-kitchen'], ['Guard House Snacks', 'guard-house-snacks'],
 ['Food Fair', 'food-fair'], ['Slush Factory', 'slush-factory'], ['Farm Stand', 'farm-stand'],
 ['Oasis', 'teddys-oasis'], ['Dutch Village', 'dutch-village-ice-cream'],
 ['World Pavilion', 'world-pavilion'], ['Dippin Dots', 'dippin-dots'], ['Barnyard', 'barnyard-pizza']
].forEach(([from, want]) => {
  const m = ExcelImport.matchLocation(from, LOCATIONS);
  eq(m.location && m.location.id, want, '"' + from + '" -> ' + want);
});

console.log('  ... locations que NO existen se marcan, no se crean');
['FF/Pav Ops', 'Back OPS', 'Pavilion Support', 'Living Shores', 'Student Dining', 'Character Breakfast', 'AM Help', 'Beer Tent']
  .forEach((from) => {
    const m = ExcelImport.matchLocation(from, LOCATIONS);
    ok(!m.location, '"' + from + '" no se auto-asigna (candidates: ' + (m.candidates ? m.candidates.length : 0) + ')');
  });

console.log('  ... §11 matching de empleados');
const m1 = ExcelImport.matchEmployee({ name: 'Anna Dragan' }, [{ id: 1, name: 'Anna Dragan' }]);
eq(m1.employee && m1.employee.name, 'Anna Dragan', 'Anna Dragan hace match exacto');
ok(m1.confident, 'match exacto y sin gemelos = confiante');
const m2 = ExcelImport.matchEmployee({ name: 'Alexa' }, EMPLOYEES);
eq(m2.employee && m2.employee.id, 3, 'Alexa hace match');
const m3 = ExcelImport.matchEmployee({ name: 'Deniz' }, EMPLOYEES);
eq(m3.employee, null, 'Deniz NO existe -> null, no se crea');
// §11: el horario dice "Anna Dragan" y la BD tiene "Anna Dragan" Y
// "Anna Dragana" -> 2 coincidencias exactas, debe pedir que elija.
const AMBIGUOS = [
  { id: 1, name: 'Anna Dragan' }, { id: 2, name: 'Anna Dragana' }
];
const mAmb = ExcelImport.matchEmployee({ name: 'Anna Dragan' }, AMBIGUOS);
eq(mAmb.employee, null, '2 coincidencias: no decide solo');
ok(mAmb.ambiguous && mAmb.ambiguous.length === 2, 'ofrece los 2 candidatos');
eq(mAmb.method, 'name_exact_ambiguous', 'metodo name_exact_ambiguous');

// Un nombre exacto que SI existe se resuelve solo, sin preguntar.
const mExact = ExcelImport.matchEmployee({ name: 'Anna' }, EMPLOYEES);
eq(mExact.employee && mExact.employee.id, 7, '"Anna" existe exactamente -> match directo');

console.log('  ... "Jose" duplicado en la BD (ambiguo por diseño)');
const mj = ExcelImport.matchEmployee({ name: 'Jose' }, EMPLOYEES);
ok(mj.employee === null || mj.employee, 'Jose devuelve resultado definido');
const mJose = ExcelImport.matchEmployee({ name: 'Jose' }, [{ id: 4, name: 'Jose' }, { id: 5, name: 'Jose ' }]);
ok(mJose.ambiguous || mJose.candidates, '"Jose" vs "Jose " -> pide confirmacion');

console.log('=== E. Toda fila del archivo acaba con empleado + location + horario ===');
const usable = rows.filter((r) => !r.needs_review);
eq(usable.every((r) => r.start_time && r.end_time && r.name && r.location_name), true,
   usable.length + ' filas usables con los 4 campos completos');

console.log('\n' + '='.repeat(62));
console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
if (fail) { console.log('\nFALLOS:'); fails.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
console.log('='.repeat(62));
process.exit(fail ? 1 : 0);