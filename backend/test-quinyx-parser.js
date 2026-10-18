// ============================================================================
//  TESTS DEL PARSER DEL FORMATO REAL DE HORARIO (Quinyx / Story Land)
//  Ejecutar:  node test-quinyx-parser.js
// ============================================================================
const Q = require('../quinyx-parser.js');

let pass = 0, fail = 0;
const fails = [];

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { pass++; }
  else { fail++; fails.push(msg + '\n      esperado: ' + b + '\n      obtenido: ' + a); }
}
function ok(v, msg) { eq(!!v, true, msg); }

const HH = (s) => { const t = Q.parseTimeCell(s); return t.kind === 'range' ? t.ranges : null; };
const one = (s) => {
  const r = HH(s);
  if (!r) return 'null';
  return r.length + '|' + r.map((x) => Q.toHHMM(x.start) + '-' + Q.toHHMM(x.end)).join(' / ');
};

// ---------------------------------------------------------------------------
console.log('\n--- 1. HORAS (§9) ---');
eq(one('9-5'),        '1|09:00-17:00', '"9-5"');
eq(one('9-5pm'),      '1|09:00-17:00', '"9-5pm"');
eq(one('9:00-5:00pm'),'1|09:00-17:00', '"9:00-5:00pm"');
eq(one('8-6pm'),      '1|08:00-18:00', '"8-6pm"');
eq(one('10:15-9:30pm'),'1|10:15-21:30','"10:15-9:30pm"');
eq(one('10-10pm'),    '1|10:00-22:00', '"10-10pm"');
eq(one('7-9am'),      '1|07:00-09:00', '"7-9am" (ambos am se respetan)');
eq(one('6am-8am'),    '1|06:00-08:00', '"6am-8am"');
eq(one('10-9:30pm'),  '1|10:00-21:30', '"10-9:30pm"');
eq(one('10:30-4:30pm'),'1|10:30-16:30','"10:30-4:30pm"');
eq(one('11-3pm'),     '1|11:00-15:00', '"11-3pm"');
// "6-8pm" aislado es ambiguo: 06:00-20:00 son 14h y "8-10pm" (08:00-22:00)
// tambien, asi que sin contexto no se puede distinguir. El parser asume AM.
// En el archivo real solo aparece como "11-3pm / 6-8pm", donde el pase de
// cronologia si lo resuelve a 18:00-20:00 (ver linea siguiente).
eq(one('6-8pm'),      '1|06:00-20:00', '"6-8pm" aislado -> inicio AM por defecto');
eq(one('11-3pm / 6-8pm'), '2|11:00-15:00 / 18:00-20:00', '"11-3pm / 6-8pm" -> cronologia: 18:00-20:00');
eq(one('8-10pm'),     '1|08:00-22:00', '"8-10pm" (turno largo de jornada completa)');
// El pase de cronologia SOLO toca rangos cuyo inicio no lleva AM/PM. Si el
// autor escribio "4pm-10pm", hay que respetarlo: desplazarlo lo convertiria
// en un turno de madrugada (04:00-10:00) cuando el real es 16:00-22:00.
eq(one('8-5pm / 4pm-10pm'), '2|08:00-17:00 / 16:00-22:00',
   '"8-5pm / 4pm-10pm" -> el 2o rango con "pm" explicito no se mueve');
eq(one('9-5pm / 5pm-10pm'), '2|09:00-17:00 / 17:00-22:00', '"9-5pm / 5pm-10pm" (§5)');
eq(one('10-5:15pm / 5:15-10pm'), '2|10:00-17:15 / 17:15-22:00', '2do rango sin meridiem se corrige a PM');
eq(one('10-10pm'),    '1|10:00-22:00', '"10-10pm"');
eq(one('10:30-5:30'), '1|10:30-17:30', '"10:30-5:30"');
eq(one('9-5'),        '1|09:00-17:00', '"9-5" duplicado');

console.log('  ... inferencia de meridiem sin AM/PM');
eq(one('9-4:30'),    '1|09:00-16:30', '"9-4:30" -> inicio AM, fin PM');
eq(one('9-9:30'),    '1|09:00-21:30', '"9-9:30" -> 09:00-21:30');
eq(one('10:15-10'),  '1|10:15-22:00', '"10:15-10"');
eq(one('9-10'),      '1|09:00-22:00', '"9-10"');
eq(one('5:30-10'),   '1|17:30-22:00', '"5:30-10" -> inicio PM (16.5h es absurdo)');
eq(one('5:30-10pm'), '1|17:30-22:00', '"5:30-10pm" -> inicio corregido a PM');
eq(one('5:15-10pm'), '1|17:15-22:00', '"5:15-10pm"');
eq(one('4-10'),      '1|16:00-22:00', '"4-10" -> inicio PM');
eq(one('9:45-5 / 5-10'), '2|09:45-17:00 / 17:00-22:00', '"9:45-5 / 5-10" dos rangos');
eq(one('10-5:15pm / 5:15-10pm'), '2|10:00-17:15 / 17:15-22:00', 'dos rangos con pm');

console.log('  ... casos invalidos');
eq(Q.parseTimeCell('9:30').kind,        'invalid', '"9:30" sin rango -> invalid');
eq(Q.parseTimeCell('9 Kitchen').kind,   'invalid', '"9 Kitchen" -> invalid');
eq(Q.parseTimeCell('9pm Kitchen').kind, 'invalid', '"9pm Kitchen" -> invalid');
eq(Q.parseTimeCell('9:30pm Alcohol').kind, 'invalid', '"9:30pm Alcohol" -> invalid');
eq(Q.parseTimeCell('9-May').kind,       'invalid', '"9-May" -> invalid (no es una hora)');
eq(Q.parseTimeCell('').kind,             'empty',   'celda vacia -> empty');
eq(Q.parseTimeCell('until 10pm').kind,   'until',   '"until 10pm"');
eq(Q.parseTimeCell('until 10pm').end,    1320,      '"until 10pm" -> 22:00');

// ---------------------------------------------------------------------------
console.log('--- 2. NOMBRES (§4, §12, §13) ---');
const names = (c) => Q.parseEmployeeCell(c).map((p) => p.name + (p.shiftLabel ? '[' + p.shiftLabel + ']' : '')).join(', ');
eq(names('Anna Dragan (Day) / Raluca (Night)'), 'Anna Dragan[Day], Raluca[Night]', 'dos personas con turno');
eq(names('Anna Dragan (Day)'),   'Anna Dragan[Day]',  '(Day) -> shiftLabel, no parte del nombre');
eq(names('Raluca (Night)'),      'Raluca[Night]',     '(Night) -> shiftLabel');
eq(names('Andrew (Day) / Nisa (Night)'), 'Andrew[Day], Nisa[Night]', 'Andrew/Nisa');
eq(names('Cosmin / Ploi'),       'Cosmin, Ploi', 'dos personas simples');
eq(names('Juan Pablo / Raluca'), 'Juan Pablo, Raluca', 'nombre con espacio');
eq(names('Coord - Edward'),      'Edward', '"Coord - Edward" -> solo el nombre');
eq(Q.parseEmployeeCell('Coord - Edward')[0].roleHint, 'Coord', '"Coord - Edward" guarda el rol aparte');
eq(Q.parseEmployeeCell('Front Coord - Edward')[0].name, 'Edward', '"Front Coord - Edward"');
eq(Q.parseEmployeeCell('Front Coord - Edward')[0].roleHint, 'Front Coord', 'rol con dos palabras');
eq(Q.parseEmployeeCell('N/A').length,     0, '"N/A" no genera empleados (ni "N" ni "A")');
eq(Q.parseEmployeeCell('NO FOOD').length, 0, '"NO FOOD" no es una persona');
eq(Q.parseEmployeeCell('').length,        0, 'celda vacia');
eq(Q.parseEmployeeCell('Cosmin')[0].name, 'Cosmin', 'nombre normal intacto');

// ---------------------------------------------------------------------------
console.log('--- 3. HOJA SCHEDULE COMPLETA ---');
// Dos bloques, como en el archivo real
const sched = [
  ['Last Call On Alcohol All Locations 9:30pm!!'],
  ['Front Ops', 'Time', 'Name', '', 'Oasis / Dutch OPS', 'Time', 'Name'],
  ['Pixie/DD Kitchen', '', '', '', 'Oasis', '', ''],
  ['', '9:30', 'Front Coord - Edward', '', '', '9pm Kitchen', 'Coord - Hayleigh'],
  ['Sales 1', '9-5pm / 5pm-10pm', 'Anna Dragan (Day) / Raluca (Night)', '', '', '9:30pm Alcohol', 'Sharon'],
  ['Sales 2', '8-6pm', 'Danna', '', 'Sales', '9:45-5 / 5-10', ''],
  ['Server', '8-10pm', 'Alexa', '', 'Server', '10-10', 'Silviu'],
  ['Server', '9-5pm / 5pm-10pm', 'Claire', '', 'Server', '10-10', 'Markos'],
  ['Cook', '8-10pm', 'Cosmin', '', 'Server/Cook', '10:15-10', 'Deniz (Day) / Yagiz (Night)'],
  ['Cook', '8-5pm / 4pm-10pm', 'Ploi', '', 'Cook', '9-10', 'Ahmet'],
  ['Guard House Snacks', '', '', '', 'Cook', '9:30-10', 'Jose (Day) / Cosmin (Night)'],
  ['Sales', '9-9:30', 'Boonng', '', 'Dutch Village', '', ''],
  ['Sales', '9-9:30pm', 'Jolin', '', '', 'until 10pm', ''],
  ['Sales', '9-9:30pm', 'Tyler', '', 'Cash', '10-5:15pm / 5:15-10pm', 'Anna (Day)'],
  ['Tea', '', '', '', 'Server', '10-10pm', 'Claire'],
  ['Server', '5-10pm', 'Madison', '', '', '', '']
];
const r = Q.parseScheduleSheet(sched, 'Schedule');
const find = (n, loc) => r.records.find((x) => x.employee_name === n && (loc ? x.location_name === loc : true));
const sig = (n, loc) => { const x = find(n, loc); return x ? Q.toHHMM(x.start_time) + '-' + Q.toHHMM(x.end_time) : 'null'; };

eq(r.format, 'quinyx_schedule', 'formato detectado');
eq(r.blocks, 2, 'dos bloques (izquierda y derecha)');

console.log('  ... §5 emparejamiento por posicion');
eq(find('Anna Dragan').start_time, '09:00', 'Anna Dragan -> 09:00');
eq(find('Anna Dragan').end_time,   '17:00', 'Anna Dragan -> 17:00');
eq(find('Raluca').start_time,      '17:00', 'Raluca -> 17:00');
eq(find('Raluca').end_time,        '22:00', 'Raluca -> 22:00');
eq(find('Anna Dragan').shift_label,'Day',   'shiftLabel Day');
eq(find('Raluca').shift_label,     'Night','shiftLabel Night');

console.log('  ... §6 location heredada de la seccion');
eq(find('Alexa').location_name, 'Pixie/DD Kitchen', 'Alexa hereda Pixie/DD Kitchen');
eq(find('Danna').location_name, 'Pixie/DD Kitchen', 'Danna hereda Pixie/DD Kitchen');
eq(find('Silviu').location_name, 'Oasis', 'Silviu hereda Oasis (bloque derecho)');
eq(find('Boonng').location_name, 'Guard House Snacks', 'Boonng hereda Guard House Snacks');
eq(find('Anna').location_name, 'Dutch Village', 'Anna hereda Dutch Village (sin repetir location)');

console.log('  ... §14 roles');
eq(find('Anna Dragan').role, 'Sales 1', 'role "Sales 1"');
eq(find('Danna').role,       'Sales 2', 'role "Sales 2"');
eq(find('Alexa').role,      'Server',  'role "Server"');
eq(find('Deniz').role,       'Server/Cook', 'role compuesto "Server/Cook"');

console.log('  ... §7 dos bloques en paralelo');
eq(find('Silviu').start_time, '10:00', 'Silviu bloque derecho 10:00');
eq(find('Markos').start_time, '10:00', 'Markos bloque derecho 10:00');
eq(find('Deniz').start_time,  '10:15', 'Deniz 10:15');
eq(find('Yagiz').end_time,    '22:00', 'Yagiz 22:00');

console.log('  ... casos que necesitan revision');
eq(find('Edward').needs_review, 'no_separator', 'fila 4: "9:30" sin fin');
eq(find('Hayleigh').needs_review, 'no_separator', '"9pm Kitchen" no es un horario');
eq(find('Sharon', 'Oasis').needs_review, 'no_separator', '"9:30pm Alcohol" no es un horario');
eq(find('Ploi').needs_review, 'multiple_ranges_single_employee', 'Ploi con 2 rangos y 1 nombre');
ok(find('Cosmin', 'Oasis'), 'Cosmin aparece en ambos bloques (Pixie y Oasis)');

console.log('  ... "Tea" no es una location');
eq(find('Madison').location_name, 'Guard House Snacks', 'fila tras "Tea" conserva Guard House Snacks');
ok(!r.sections.some((s) => /tea/i.test(s)), '"Tea" no se registra como location');
ok(!r.records.some((x) => x.location_name === 'Tea'), 'ningun registro queda en location "Tea"');

console.log('  ... "until" y celdas sin personal');
eq(r.records.some((x) => x.employee_name === ''), false, 'ningun registro con nombre vacio');
ok(r.issues.some((i) => i.reason === 'no_employee' && i.excelRow === 6), 'fila 6 derecha sin personal -> issue');

console.log('  ... deteccion de formato');
eq(Q.looksLikeQuinyxSchedule(sched), true, 'layout visual -> schedule real');
eq(Q.looksLikeQuinyxSchedule([
  ['Employee', 'Location', 'Date', 'Start', 'End'],
  ['Anna', 'Food Fair', '2026-10-07', '09:00', '17:00']
]), false, 'tabla plana -> NO es el formato de horario');

console.log('--- 4. HOJA EMPLEADOS (export Quinyx) ---');
const emp = Q.parseEmployeesSheet([
  ['Nombre', 'Nacionalidad', 'Edad', 'Rol', 'Grupo', 'Estado'],
  ['Anna Dragan', 'Romania', 24, 'Sales', 'Front Ops', 'Activo'],
  ['Raluca', 'Romania', 31, 'Sales', 'Front Ops', 'Activo'],
  ['N/A', '', '', '', '', '']
], 'Empleados');
eq(emp.employees.length, 2, '2 empleados (N/A excluido)');
eq(emp.employees[0].name, 'Anna Dragan', 'nombre');
eq(emp.employees[0].nationality, 'Romania', 'nacionalidad');
eq(emp.employees[0].age, 24, 'edad');
eq(emp.employees[0].role, 'Sales', 'rol');
eq(emp.employees[0].group, 'Front Ops', 'grupo');
eq(emp.employees[0].status, 'Activo', 'estado');

console.log('--- 5. LOCATION CON HORARIO EN LA MISMA CELDA ---');
const r2 = Q.parseScheduleSheet([
  ['Front Ops', 'Time', 'Name'],
  ['Slush Factory 10-9:30'],
  ['Sales', '10:30-5:30', 'Danna (Day)'],
  ['Sales', '5:30-10', 'Coral (Night)']
], 'Schedule');
eq(r2.records.length, 2, '2 registros');
eq(r2.records[0].location_name, 'Slush Factory', '"Slush Factory 10-9:30" -> location + horario');
eq(r2.records[0].start_time, '10:30', 'Danna 10:30');
eq(r2.records[1].start_time, '17:30', 'Coral 17:30 (inicio PM corregido)');
eq(r2.records[1].end_time,   '22:00', 'Coral 22:00');

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
if (fail) {
  console.log('\nFALLOS:');
  fails.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f));
}
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);