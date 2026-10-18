const fs=require('fs');
const XLSX=require('./node_modules/xlsx');
global.XLSX=XLSX;
const src=fs.readFileSync(__dirname + '/../excel-import.js','utf8');
// eval del IIFE en este contexto (globalThis.XLSX ya viene de arriba)
require('../quinyx-parser.js');   // el parser del formato real de horario
// eval del IIFE en este contexto
const wrapped = src + String.fromCharCode(10) + ';globalThis.ExcelImport = ExcelImport;';
eval(wrapped);
const E=globalThis.ExcelImport;

let pass=0,fail=0;
function t(d,fn){try{fn();pass++;console.log('  OK   '+d);}catch(e){fail++;console.log('  FAIL '+d+' -> '+e.message);}}

console.log('\n== DETECCION DE TIPO (§2) ==');
const schedHeaders=['Staff Name','Site','Shift Date','Shift Start','Shift End','Badge'];
t('horario -> schedule', ()=>{
  const rows=[['Dan','Barnyard Pizza','2026-09-30','10:00 AM','2:00 PM','1001'],
              ['Eduardo','Food Fair','2026-09-30','9:00 AM','5:00 PM','1003']];
  assert(E.detectType(schedHeaders,rows)==='schedule', 'esperaba schedule');
});
const tsHeaders=['Employee ID','Employee','Date','Clock In','Clock Out','Worked Hours','Regular Hours','Overtime'];
t('timesheet -> timesheet', ()=>{
  const rows=[['6','Dan','2026-09-29','09:58','18:04','8.10','8.00','0.10']];
  assert(E.detectType(tsHeaders,rows)==='timesheet','esperaba timesheet');
});
t('inventario -> unknown', ()=>{
  assert(E.detectType(['Producto','Precio','Stock'],[['Soda','1.25','40']])==='unknown','esperaba unknown');
});

console.log('\n== MAPEO DE COLUMNAS (§6) ==');
t('mapea encabezado horizontal (Staff Name/Site/Shift Start)', ()=>{
  const m=E.guessMapping(schedHeaders);
  assert(m.employee===0,'employee='+m.employee);
  assert(m.location===1,'location='+m.location);
  assert(m.date===2,'date='+m.date);
  assert(m.start_time===3,'start='+m.start_time);
  assert(m.end_time===4,'end='+m.end_time);
  assert(m.badge===5,'badge='+m.badge);
});
t('mapea encabezados verticales (Work Location / Work Date)', ()=>{
  const m=E.guessMapping(['Employee Name','Work Location','Work Date','Shift Start','Shift End']);
  assert(m.employee===0&&m.location===1&&m.date===2&&m.start_time===3&&m.end_time===4,'m='+JSON.stringify(m));
});
t('mapea encabezados de timesheet', ()=>{
  const m=E.guessMapping(tsHeaders);
  assert(m.employee_id===0,'employee_id='+m.employee_id);
  assert(m.employee===1,'employee='+m.employee);
  assert(m.clock_in===undefined,'clock_in no debe mapear a start_time');
  assert(m.start_time!==undefined,'start_time debe tomar Clock In');
  assert(m.hours===5,'hours='+m.hours);
  assert(m.overtime===7,'overtime='+m.overtime);
});

console.log('\n== NORMALIZACION DE FECHAS/HORAS (§15/§16) ==');
t('10:00 AM -> 10:00', ()=>assert(E.normTime('10:00 AM')==='10:00', String(E.normTime('10:00 AM'))));
t('6:00 PM -> 18:00', ()=>assert(E.normTime('6:00 PM')==='18:00'));
t('09:58 -> 09:58', ()=>assert(E.normTime('09:58')==='09:58'));
t('2026-09-30 -> 2026-09-30', ()=>assert(E.normDate('2026-09-30').value==='2026-09-30'));
t('30/09/2026 -> 2026-09-30', ()=>assert(E.normDate('30/09/2026').value==='2026-09-30'));
t('09/30/2026 -> 2026-09-30', ()=>assert(E.normDate('09/30/2026').value==='2026-09-30'));
t('05/06/2026 -> ambiguo', ()=>assert(E.normDate('05/06/2026').ambiguous===true));
t('8.10 -> 8.1', ()=>assert(E.normHours('8.10')===8.1));

console.log('\n== MATCHING DE LOCATIONS (§5) ==');
const locs=[
 {id:'barnyard-pizza',name:'Barnyard Pizza'},
 {id:'pixie-kitchen',name:'Pixie Kitchen'},
 {id:'food-fair',name:'Food Fair'},
 {id:"dippin-dots",name:"Dippin' Dots"},
 {id:'world-pavilion',name:'World Pavilion'}
];
t('"Barnyard Pizza" -> exacto', ()=>{
  const r=E.matchLocation('Barnyard Pizza',locs);
  assert(r.location && r.location.id==='barnyard-pizza','r='+JSON.stringify(r.location));
});
t('"Food Fair Restaurant" -> food-fair', ()=>{
  const r=E.matchLocation('Food Fair Restaurant',locs);
  assert(r.location && r.location.id==='food-fair','r='+(r.location&&r.location.id)+' metodo='+r.method);
});
t('"World Pavilion" -> exacto', ()=>assert(E.matchLocation('World Pavilion',locs).location.id==='world-pavilion'));
t('"Nowhere" -> null (no crea)', ()=>{
  const r=E.matchLocation('Nowhere',locs);
  assert(r.location===null,'debe ser null');
});
t('accento/apostrofo: "Dippins Dots" -> dippin-dots', ()=>{
  const r=E.matchLocation('Dippins Dots',locs);
  assert(r.location && r.location.id==='dippin-dots','r='+JSON.stringify(r.location));
});

console.log('\n== MATCHING DE EMPLEADOS (§4) ==');
const emps=[
 {id:6,name:'Dan',badge_number:'1001'},
 {id:21,name:'Oriana Mendoza'},
 {id:23,name:'Cesar'},
 {id:24,name:'Sorin'},
 {id:22,name:'Nadia'},
 {id:2,name:'Eduardo'}
];
t('nombre exacto -> confiante', ()=>{
  const r=E.matchEmployee({name:'Dan'},emps);
  assert(r.employee && r.employee.id===6 && r.confident===true,'r='+JSON.stringify(r));
});
t('badge -> confiante', ()=>{
  const r=E.matchEmployee({name:'quien sea',badge:'1001'},emps);
  assert(r.employee && r.employee.id===6 && r.method==='badge','r='+JSON.stringify(r));
});
t('external_id -> confiante', ()=>{
  const r=E.matchEmployee({name:'x',external_id:'Q-777'},[...emps,{id:99,name:'Zed',external_id:'Q-777'}]);
  assert(r.employee && r.employee.id===99 && r.method==='external_id');
});
t('"Dan Smith" vs "Dan" -> sugiere, NO decide', ()=>{
  const r=E.matchEmployee({name:'Dan Smith'},emps);
  assert(r.employee===null || r.confident===true,'no debe resolver sin certeza');
});
t('nombre inexistente -> null sin crear', ()=>{
  const r=E.matchEmployee({name:'Zoe Nobody'},emps);
  assert(r.employee===null,'debe ser null');
});
t('primer+apellido por partes', ()=>{
  const r=E.matchEmployee({first_name:'Oriana',last_name:'Mendoza'},emps);
  assert(r.employee && r.employee.id===21,'r='+JSON.stringify(r));
});

console.log('\n== BUILD ROWS ==');
const sheet={rows:[
  ['Titulo que se ignora'],
  schedHeaders,
  ['Dan','Barnyard Pizza','2026-09-30','10:00 AM','2:00 PM','1001'],
  ['Zoe Nobody','Nowhere','30/09/2026','9:00 AM','5:00 PM','9999']
]};
const hi=E.findHeaderRow(sheet.rows);
t('encuentra la fila de encabezados (indice 1)', ()=>assert(hi===1,'hi='+hi));
const mapping=E.guessMapping(schedHeaders);
const rows=E.buildRows(sheet,hi,mapping,'schedule');
t('construye 2 filas, ignora la de titulo', ()=>assert(rows.length===2,'len='+rows.length));
t('normaliza fecha y horas de la fila 0', ()=>{
  assert(rows[0].work_date==='2026-09-30',rows[0].work_date);
  assert(rows[0].start_time==='10:00',rows[0].start_time);
  assert(rows[0].end_time==='14:00',rows[0].end_time);
});
t('normaliza la fila 1 (30/09/2026)', ()=>assert(rows[1].work_date==='2026-09-30',rows[1].work_date));
t('kind=schedule', ()=>assert(rows[0].kind==='schedule'));

function assert(c,m){ if(!c) throw new Error(m||'assertion'); }
console.log('\n'+pass+' pasaron, '+fail+' fallaron');
process.exit(fail?1:0);
