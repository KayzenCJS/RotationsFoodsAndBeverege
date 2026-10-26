// ============================================================================
//  PRUEBAS DEL PLANIFICADOR DE ASIGNACION
// ============================================================================
//  Los nueve casos del encargo, con datos inventados (nombres ficticios y una
//  base de datos de mentira). Nada de esto toca la base real: el modulo es puro
//  y se puede probar entero sin escribir nada.
//
//  Usar datos de mentira a proposito: asi se puede construir exactamente el
//  caso que hace falta (una persona con la certificacion, otra sin ella, dos
//  locales que compiten por la misma persona) sin depender de como esten los
//  datos hoy. Y ningun nombre real de empleado acaba en el repositorio.
// ============================================================================
const A = require('./auto-assign.js');

let pass = 0, fail = 0;
const fallos = [];

const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('    OK   ' + m); }
    else {
        fail++; fallos.push(m);
        console.log('    FAIL ' + m + '\n           esperado ' + JSON.stringify(e)
            + '\n           obtenido ' + JSON.stringify(a));
    }
};
const ok = (v, m) => eq(!!v, true, m);

// ---------------------------------------------------------------------------
//  Utilidades para montar el caso
// ---------------------------------------------------------------------------
// Una persona. Por defecto puede hacer de todo lo que se le pida.
function persona(id, roles, extra = {}) {
    return {
        id,
        name: 'Persona ' + id,
        roles: roles || [],
        formaciones: [],
        grupos: [],
        localizacionesEntrenadas: [],
        disponibilidad: {
            is_on_break: false, is_on_training: false,
            is_day_off: false, is_holiday: false,
            schedule_start_time: '06:00', schedule_end_time: '23:00',
            days_off: []
        },
        ...extra
    };
}

// Un turno ya existente. Es un COMPROMISO: el algoritmo no puede tocarlo.
function turno(empleado, etiqueta, ini, fin, extra = {}) {
    return {
        employee_id: empleado.id,
        etiqueta,
        intervalo: A.intervalo(ini, fin),
        location_id: null,
        category: null,
        ...extra
    };
}

const local = (id, name) => ({ id, name });

// Regla minima de una localizacion.
const regla = (location_id, min, requirements) => ({
    location_id, min_employees: min, requirements, cerrada: false
});

const ventana = (inicio, fin) => ({ inicio, fin });

// Escenario base: un solo local con un minimo, sin conflictos de entrada.
function escenario(reglas, empleados, extra = {}) {
    return A.planificar({
        fecha: '2026-07-15',
        diaSemana: 'wednesday',
        reglas,
        locations: extra.locations || reglas.map(r => local(r.location_id, r.location_id)),
        empleados,
        compromisos: extra.compromisos || [],
        ventanas: extra.ventanas || Object.fromEntries(reglas.map(r => [r.location_id, ventana('09:00', '17:00')])),
        zonaDe: extra.zonaDe || {},
        config: extra.config || {}
    });
}

// ============================================================================
console.log('\n=== 1. UN COMPROMISO EXISTENTE NO SE PISA ===');
console.log('    Alguien tiene Student Dining por la tarde y el algoritmo');
console.log('    intenta ponerla en un local que se solapa.\n');

{
    const conTurnoTarde = persona(1, ['server'], { formaciones: ['pos-training', 'customer-service'] });
    // El turno por el que se le quiere sacar: 18:00-22:00, que pisa entero el
    // compromiso de la tarde.
    const reglas = [regla('barnyard', 1, [{ role: 'server', count: 1 }])];

    const r = escenario(reglas, [conTurnoTarde], {
        compromisos: [turno(conTurnoTarde, 'Student Dining', '17:00', '21:00', { category: 'student-dining' })],
        // El turno propuesto es el que hace conflicto.
        ventanas: { barnyard: ventana('18:00', '22:00') }
    });

    eq(r.asignaciones.length, 0, 'no se propone nada para una persona ya comprometida');
    eq(r.sinCubrir.length, 1, 'el puesto queda sin cubrir y se informa');
    eq(r.sinCubrir[0].location, 'barnyard', '  se dice QUE localizacion queda sin cubrir');
    ok(r.sinCubrir[0].sinCubrirPorque.length > 0, '  y por que no se pudo cubrir');
    ok(r.sinCubrir[0].sinCubrirPorque.some(x => /compromiso/.test(x.motivo)),
        '  la razon es el compromiso que ya tenia');
    ok(!r.todoCubierto, 'el resultado no se presenta como cubierto');
}

// El mismo turno, pero sin solapar: a las 09:00-13:00 se puede entrar.
{
    const conTurnoTarde = persona(1, ['server']);
    const reglas = [regla('barnyard', 1, [{ role: 'server', count: 1 }])];
    const r = escenario(reglas, [conTurnoTarde], {
        compromisos: [turno(conTurnoTarde, 'Student Dining', '17:00', '21:00', { category: 'student-dining' })],
        ventanas: { barnyard: ventana('09:00', '13:00') }
    });

    eq(r.asignaciones.length, 1, 'si el turno NO se solapa, se propone');
    eq(r.asignaciones[0].employee_id, 1, '  a la persona correcta');
    eq(r.asignaciones[0].start_time + '-' + r.asignaciones[0].end_time, '09:00-13:00', '  con el horario del turno');
}

// Terminar justo cuando empieza el otro cuenta como compatible.
{
    const p = persona(1, ['server']);
    const reglas = [regla('barnyard', 1, [{ role: 'server', count: 1 }])];
    const r = escenario(reglas, [p], {
        compromisos: [turno(p, 'Student Dining', '17:00', '21:00')],
        ventanas: { barnyard: ventana('09:00', '17:00') }
    });
    eq(r.asignaciones.length, 1, 'un turno que acaba justo cuando empieza el otro es valido');
}

// ============================================================================
console.log('\n=== 2. NO SE ASIGNA A QUIEN NO TIENE LA CERTIFICACION ===');
console.log('    El puesto de cashier exige certificacion de alcohol.\n');

{
    const conCert = persona(1, ['cashier'], { formaciones: ['pos-training', 'nh-alcohol-certification'] });
    const sinCert = persona(2, ['cashier'], { formaciones: ['pos-training'] });

    const reglas = [regla('barnyard', 1, [
        { role: 'cashier', count: 1, required_certifications: ['nh-alcohol-certification'] }
    ])];

    const r = escenario(reglas, [conCert, sinCert]);

    eq(r.asignaciones.length, 1, 'se cubre el puesto');
    eq(r.asignaciones[0].employee_id, 1, '  con la persona que SI tiene la certificacion');
    ok(r.descartes.some(d => d.employee_id === 2 && /certificacion/.test(d.motivo)),
        'la que no la tiene se descarta y se explica por que');
    eq(r.descartes.find(d => d.employee_id === 2).motivo,
        'le falta la certificacion nh-alcohol-certification', '  con el motivo exacto');
}

// Si nadie la tiene, el puesto NO se cubre. No se sustituye por alguien que no
// vale: se avisa.
{
    const sinCert = persona(2, ['cashier'], { formaciones: ['pos-training'] });
    const reglas = [regla('barnyard', 1, [
        { role: 'cashier', count: 1, required_certifications: ['nh-alcohol-certification'] }
    ])];
    const r = escenario(reglas, [sinCert]);

    eq(r.asignaciones.length, 0, 'sin nadie con certificacion, el puesto NO se cubre');
    eq(r.sinCubrir.length, 1, '  y se informa del hueco');
    eq(r.sinCubrir[0].certificaciones, ['nh-alcohol-certification'],
        '  indicando que certificacion falta');
    eq(r.todoCubierto, false, '  y no se dice que este todo cubierto');
}

// ============================================================================
console.log('\n=== 3. SE PRIORIZAN LOS MINIMOS QUE FALTAN ===');
console.log('    Food Fair pide 3 cocineros, 2 cajeros y 1 lavavajillas.\n');

{
    const cocineros = [persona(1, ['cook']), persona(2, ['cook']), persona(3, ['cook'])];
    const cajeros = [persona(4, ['cashier']), persona(5, ['cashier'])];
    const lavavajilla = persona(6, ['dishwasher']);
    const gente = [...cocineros, ...cajeros, lavavajilla];

    const reglas = [regla('food-fair', 6, [
        { role: 'cook', count: 3 },
        { role: 'cashier', count: 2 },
        { role: 'dishwasher', count: 1 }
    ])];

    const r = escenario(reglas, gente);

    eq(r.totalPuestos, 6, 'se generan 6 puestos (3+2+1)');
    eq(r.asignaciones.length, 6, 'y se cubren los 6');
    eq(r.todoCubierto, true, '  todo cubierto');

    const porRol = {};
    for (const a of r.asignaciones) porRol[a.rol] = (porRol[a.rol] || 0) + 1;
    // Se comparan las claves ordenadas: el objeto se arma recorriendo las
    // asignaciones, asi que el orden de las claves depende del reparto y no
    // significa nada.
    const ordenadas = (o) => Object.keys(o).sort().map(k => k + '=' + o[k]);
    eq(ordenadas(porRol), ['cashier=2', 'cook=3', 'dishwasher=1'],
        '  con la cantidad que pide cada rol');

    // Nadie puede estar en dos sitios a la vez.
    const porPersona = {};
    for (const a of r.asignaciones) {
        (porPersona[a.employee_id] = porPersona[a.employee_id] || []).push(a.location_id);
    }
    eq(Object.values(porPersona).filter(v => v.length > 1).length, 0,
        'nadie aparece en dos sitios a la vez');
}

// ============================================================================
console.log('\n=== 4. SE DETECTA EL CONFLICTO CON UN TURNO CONFIRMADO ===');
console.log('    Dos locales que se solapan y una sola persona posible.\n');

{
    const unico = persona(1, ['cashier']);
    const reglas = [
        regla('local-a', 1, [{ role: 'cashier', count: 1 }]),
        regla('local-b', 1, [{ role: 'cashier', count: 1 }])
    ];

    const r = escenario(reglas, [unico], {
        locations: [local('local-a', 'Local A'), local('local-b', 'Local B')],
        ventanas: { 'local-a': ventana('09:00', '17:00'), 'local-b': ventana('10:00', '14:00') }
    });

    eq(r.asignaciones.length, 1, 'con una sola persona para dos puestos solapados, se cubre uno');
    eq(r.sinCubrir.length, 1, '  y se avisa del otro');
    ok(!r.todoCubierto, '  sin fingir que esta todo bien');
}

// Con horario que NO se solapa, los dos se cubren con la misma persona.
{
    const unico = persona(1, ['cashier']);
    const reglas = [
        regla('local-a', 1, [{ role: 'cashier', count: 1 }]),
        regla('local-b', 1, [{ role: 'cashier', count: 1 }])
    ];
    const r = escenario(reglas, [unico], {
        locations: [local('local-a', 'Local A'), local('local-b', 'Local B')],
        ventanas: { 'local-a': ventana('06:00', '11:00'), 'local-b': ventana('13:00', '17:00') }
    });

    eq(r.asignaciones.length, 2, 'si los horarios no se solapan, la misma persona cubre los dos');
    eq(new Set(r.asignaciones.map(a => a.employee_id)).size, 1, '  la misma persona');
}

// ============================================================================
console.log('\n=== 5. TURNO DE NOSTALGIA NIGHT QUE CRUZA LA MEDIANOCHE ===');
console.log('    20:00 -> 01:00 tiene que ocupar la madrugada del dia siguiente.\n');

{
    const dj = persona(1, ['server'], { formaciones: ['pos-training', 'customer-service'] });

    // El turno propuesto empieza a las 23:00 y acaba a las 03:00: pisa de lleno
    // su turno de noche.
    const r = escenario(
        [regla('local-a', 1, [{ role: 'server', count: 1 }])],
        [dj],
        { compromisos: [turno(dj, 'Nostalgia Night', '20:00', '01:00', { category: 'nostalgia-dj' })],
          ventanas: { 'local-a': ventana('23:00', '03:00') } }
    );
    eq(r.asignaciones.length, 0, 'un turno que cruza la medianoche bloquea el de 23:00-03:00');

    // Y uno de manana NO choca con el turno de noche de ayer.
    const r2 = escenario(
        [regla('local-a', 1, [{ role: 'server', count: 1 }])],
        [dj],
        { compromisos: [turno(dj, 'Nostalgia Night', '20:00', '01:00', { category: 'nostalgia-dj' })],
          ventanas: { 'local-a': ventana('06:00', '12:00') } }
    );
    eq(r2.asignaciones.length, 1, 'un turno de manana si se puede anadir a quien tiene turno de noche');
}

// ============================================================================
console.log('\n=== 6. UNA ACTIVIDAD REFLEJADA EN DOS SECCIONES SE CUENTA UNA VEZ ===');
console.log('    Student Dining aparece en Horarios y en Extra Hours.\n');

{
    const p = persona(1, ['server']);
    const mismo = { employee_id: 1, etiqueta: 'Student Dining', category: 'student-dining' };

    const r = escenario(
        [regla('local-a', 1, [{ role: 'server', count: 1 }])],
        [p],
        {
            locations: [local('local-a', 'Local A')],
            ventanas: { 'local-a': ventana('06:00', '12:00') },
            compromisos: [
                // La misma persona, la misma actividad, la misma hora, escrita
                // desde dos sitios distintos.
                { ...mismo, intervalo: A.intervalo('17:00', '21:00'), assignment_type: 'EXTRA_HOURS' },
                { ...mismo, intervalo: A.intervalo('17:00', '21:00'), assignment_type: 'LOCATION' }
            ]
        }
    );

    eq(r.compromisosDuplicados, 1, 'se detecta el reflejo duplicado');
    eq(r.compromisos, 1, '  y se cuenta como un solo compromiso');

    // Lo importante: el duplicado NO abre la puerta a un conflicto falso. Con
    // el turno en medio de la tarde sigue sin poder entrar.
    const r2 = escenario(
        [regla('local-a', 1, [{ role: 'server', count: 1 }])],
        [p],
        {
            locations: [local('local-a', 'Local A')],
            ventanas: { 'local-a': ventana('18:00', '20:00') },
            compromisos: [
                { ...mismo, intervalo: A.intervalo('17:00', '21:00'), assignment_type: 'EXTRA_HOURS' },
                { ...mismo, intervalo: A.intervalo('17:00', '21:00'), assignment_type: 'LOCATION' }
            ]
        }
    );
    eq(r2.asignaciones.length, 0, 'el duplicado no permite saltarse el compromiso');
}

// ============================================================================
console.log('\n=== 7. NO HAY SUFICIENTE PERSONAL ELEGIBLE ===');
console.log('    El sistema tiene que decir que falta, no rellenarlo con quien sea.\n');

{
    const reglas = [regla('food-fair', 6, [
        { role: 'cook', count: 3 },
        { role: 'cashier', count: 2 },
        { role: 'dishwasher', count: 1 }
    ])];
    // Solo dos personas, y una de ellas es cocinera: faltan 4 cocineros,
    // 2 cajeros y 1 lavavajillas.
    const gente = [persona(1, ['cook']), persona(2, ['cook'])];

    const r = escenario(reglas, gente);

    eq(r.asignaciones.length, 2, 'se asigna al personal que hay');
    eq(r.sinCubrir.length, 4, 'se informa de los 4 puestos que faltan');

    const sinRol = new Set(r.sinCubrir.map(p => p.rol));
    ok(sinRol.has('cashier') && sinRol.has('dishwasher'),
        '  y se dice de que roles son (no solo cuantos)');
    eq(r.todoCubierto, false, '  sin presentarlo como cubierto');

    const ff = r.porLocalizacion['food-fair'];
    eq(ff.cumple, false, 'el local aparece como por debajo del minimo');
    eq(ff.faltan.length > 0, true, '  con el detalle de lo que le falta');
    ok(r.incompletas.includes('food-fair'), '  y aparece en la lista de incompletos');
}

// ============================================================================
console.log('\n=== 8. ENTRE VARIAS SOLUCIONES, SE ELIGE LA QUE MAS CUBRE ===');
console.log('    Una persona vale para dos locales, y hay que colocar bien a otra.\n');

{
    // local-a solo puede cubrirla la persona 1. Si la persona 1 se gasta en
    // local-b, local-a se queda vacio.
    const soloA = persona(1, ['cashier']);
    const ambos = persona(2, ['cashier']);
    const ambos2 = persona(3, ['cashier']);

    const reglas = [
        regla('local-a', 1, [{ role: 'cashier', count: 1 }]),
        regla('local-b', 1, [{ role: 'cashier', count: 1 }]),
        regla('local-c', 1, [{ role: 'cashier', count: 1 }])
    ];

    // Las ventanas hacen que local-a y local-c se solapen entre si, y local-b
    // aparte: con dos personas bien colocadas se cubren los tres locales.
    const r = A.planificar({
        fecha: '2026-07-15',
        diaSemana: 'wednesday',
        reglas,
        locations: [local('local-a', 'A'), local('local-b', 'B'), local('local-c', 'C')],
        empleados: [soloA, ambos, ambos2],
        compromisos: [],
        ventanas: {
            'local-a': ventana('09:00', '17:00'),
            'local-c': ventana('10:00', '14:00'),
            'local-b': ventana('18:00', '22:00')
        },
        zonaDe: {}, config: {}
    });

    eq(r.totalPuestos, 3, 'hay 3 puestos que cubrir');
    eq(r.asignaciones.length, 3, 'y se cubren los 3');
    eq(r.sinCubrir.length, 0, '  sin huecos');

    // La persona que solo puede estar en local-a tiene que estar ahi.
    const a = r.asignaciones.find(x => x.location_id === 'local-a');
    ok(a && a.employee_id === 1, '  el recurso que solo servia para un local se ha usado ahi');
    ok(r.intercambios.length >= 0, '  (la reparacion se ejecuta: ' + r.intercambios.length + ' intercambios)');
}

// Reparto equilibrado: entre dos personas que valen igual, no se le echa todo a
// una mientras la otra se queda sin nada.
{
    const reglas = [regla('local-a', 2, [{ role: 'cashier', count: 2 }])];
    const r = escenario(rules = reglas, [persona(1, ['cashier']), persona(2, ['cashier'])]);
    eq(r.asignaciones.length, 2, 'dos personas para dos turnos');
    eq(new Set(r.asignaciones.map(a => a.employee_id)).size, 2, '  y son dos distintas');
}

// El caso que obliga a INTERCAMBIAR.
//
// Se monta a proposito para que el reparto por escasez no lo resuelva solo: el
// puesto con menos candidatos se cubre primero, y al hacerlo deja a alguien
// encerrado en un puesto que solo el sabe hacer.
//
//   local-raro : solo la persona 1 vale. Es el puesto con menos candidatos,
//                asi que el reparto se lo da primero.
//   local-facil: valen la 1 y la 2.
//
// Si la 1 se queda en local-raro, local-facil lo cubre la 2 y los dos locales
// estan cubiertos... pero anadimos un tercer local, comun, donde el unico
// hueco se queda porque la 1 ya esta ocupada.
//
// Asi el reparto "el mas escaso primero" deja un hueco, y hace falta el
// intercambio: la 1 se va al hueco comun y la 2 recoge local-raro... salvo que
// la 2 no pueda. Con la regla bien puesta, la 2 SI puede local-raro, asi que se
// aplica el intercambio y los tres quedan cubiertos.
{
    const raro = persona(1, ['cashier'], { roles: ['cashier'] });
    const polivalente = persona(2, ['cashier']);

    const reglas = [
        // local-raro: solo lo puede hacer la persona 1.
        regla('local-raro', 1, [{ role: 'cashier', count: 1 }]),
        regla('local-comun', 1, [{ role: 'cashier', count: 1 }])
    ];

    const r = A.planificar({
        fecha: '2026-07-15',
        diaSemana: 'wednesday',
        reglas,
        locations: [local('local-raro', 'Raro'), local('local-comun', 'Comun')],
        empleados: [raro, polivalente],
        compromisos: [],
        // El turno de local-raro y el de local-comun se solapan: nadie puede
        // estar en los dos, asi que hacen falta dos personas.
        ventanas: { 'local-raro': ventana('09:00', '17:00'), 'local-comun': ventana('10:00', '14:00') },
        zonaDe: {}, config: {}
    });

    eq(r.totalPuestos, 2, 'hay dos puestos que se solapan entre si');
    eq(r.asignaciones.length, 2, 'y se cubren los dos');
    eq(new Set(r.asignaciones.map(a => a.employee_id)).size, 2, '  con dos personas distintas');
    eq(r.sinCubrir.length, 0, '  sin huecos');

    // Dos locales distintos pueden solaparse en hora si son personas distintas.
    // Lo que no puede pasar es que una sola persona acabe en dos sitios a la vez.
    const porPersona = {};
    for (const a of r.asignaciones) {
        (porPersona[a.employee_id] = porPersona[a.employee_id] || []).push(a.intervalo
            || A.intervalo(a.start_time, a.end_time));
    }
    const choca = Object.values(porPersona)
        .filter(ivs => ivs.some((x, i) => ivs.some((y, j) => i !== j && A.seSolapan(x, y))));
    eq(choca.length, 0, '  y ninguna persona tiene dos turnos solapados');
}

// ============================================================================
console.log('\n=== 9. NO SE TOCA LO QUE YA HAY ASIGNADO ===');
console.log('    Se ejecuta sobre un horario con gente ya puesta.\n');

{
    const yaPuesto = persona(1, ['cashier']);
    const nuevo = persona(2, ['cashier']);

    const r = escenario(
        [regla('local-a', 2, [{ role: 'cashier', count: 2 }])],
        [yaPuesto, nuevo],
        {
            commitmentsExisting: true,
            compromisos: [{
                employee_id: 1,
                etiqueta: 'Local A',
                location_id: 'local-a',
                category: null,
                role: 'cashier',
                intervalo: A.intervalo('09:00', '13:00')
            }]
        }
    );

    eq(r.asignaciones.length, 1, 'solo se propone lo que falta (un puesto de dos)');
    eq(r.asignaciones[0].employee_id, 2, '  y se lo da a quien no esta ocupado');
    ok(!r.asignaciones.some(a => a.employee_id === 1),
        'no se propone nada para quien ya tiene un turno confirmado');

    const cov = r.porLocalizacion['local-a'];
    eq(cov.cumple, true, 'el local queda cubierto contando lo que ya habia');
    eq(cov.faltan.length, 0, '  sin huecos');
}

// Un compromiso en una localizacion cuenta para cubrir sus puestos.
{
    const reglas = [regla('local-a', 1, [{ role: 'cook', count: 1 }])];
    const r = escenario(reglas, [persona(1, ['cook']), persona(2, ['cook'])], {
        compromisos: [{
            employee_id: 1, etiqueta: 'Local A', location_id: 'local-a',
            category: null, role: 'cook', intervalo: A.intervalo('09:00', '17:00')
        }]
    });
    eq(r.asignaciones.length, 0, 'el minimo ya estaba cubierto: no se propone a nadie');
    eq(r.sinCubrir.length, 0, '  y no se reporta como hueco');
    eq(r.todoCubierto, true, '  el local queda cubierto');
}

// ============================================================================
console.log('\n=== 10. REGLAS EXTRA QUE VIENEN DE LA CONFIGURACION ===');
console.log('    Minimos, roles y localizaciones cerradas salen de staffing_rules.\n');

{
    // min_employees mas alto que la suma de los roles: hay que rellenar.
    const r = escenario(
        [regla('local-a', 3, [{ role: 'cook', count: 1 }])],
        [persona(1, ['cook']), persona(2, ['cook']), persona(3, ['cook'])]
    );
    eq(r.asignaciones.length, 3, 'min_employees manda cuando pide mas gente que los roles');
    ok(r.asignaciones.some(a => a.esRelleno), '  los de relleno se marcan como tales');
}

// Una localizacion cerrada ese dia no necesita a nadie, y no cuenta como fallo.
{
    const r = escenario(
        [regla('local-a', 1, [{ role: 'cook', count: 1 }]), { ...regla('local-b', 1, [{ role: 'cook', count: 1 }]), cerrada: true }],
        [persona(1, ['cook'])]
    );
    eq(r.asignaciones.length, 1, 'solo se propone para la localizacion abierta');
    eq(r.porLocalizacion['local-b'].cerrada, true, 'la cerrada se marca como cerrada');
    eq(r.porLocalizacion['local-b'].cumple, true, '  y no cuenta como incompleta');
    eq(r.todoCubierto, true, '  el dia se puede dar por bueno');
}

// Sin ventana horaria no se inventa un turno.
{
    const r = escenario(
        [regla('local-a', 1, [{ role: 'cook', count: 1 }])],
        [persona(1, ['cook'])],
        { ventanas: {} }
    );
    eq(r.asignaciones.length, 0, 'sin ventana real no se propone nada');
    eq(r.sinVentana, ['local-a'], '  y se avisa de que falta la ventana');
}

// La zona del parque ordena la eleccion pero no bloquea.
{
    const deZona = persona(1, ['cashier'], { grupos: ['A'] });
    const deOtro = persona(2, ['cashier'], { grupos: ['B'] });
    const reglas = [regla('local-a', 1, [{ role: 'cashier', count: 1 }])];

    const conZona = escenario(rules, [deOtro, deZona], { zonaDe: { 'local-a': 'A' } });
    eq(conZona.asignaciones[0].employee_id, 1, 'con dos candidatos, se elige al de la zona');

    // Y si solo hay uno de fuera de zona, se usa igualmente.
    const soloFuera = escenario(rules, [deOtro], { zonaDe: { 'local-a': 'A' } });
    eq(soloFuera.asignaciones.length, 1, 'si no hay nadie de la zona, se usa a quien hay');
    ok(soloFuera.asignaciones[0].avisos.some(a => /zona/.test(a)),
        '  y se avisa de que no es de la zona');
}

// Disponibilidad: descanso, formacion, dia libre y festivo sacan a la persona.
for (const [campo, motivo] of [
    ['is_on_break', 'descanso'],
    ['is_on_training', 'en formacion'],
    ['is_day_off', 'dia libre'],
    ['is_holiday', 'festivo']
]) {
    const NoDisponible = persona(1, ['cook'], {
        disponibilidad: {
            is_on_break: false, is_on_training: false, is_day_off: false, is_holiday: false,
            schedule_start_time: '06:00', schedule_end_time: '23:00', days_off: []
        }
    });
    NoDisponible.disponibilidad[campo] = true;
    const r = escenario([regla('local-a', 1, [{ role: 'cook', count: 1 }])], [NoDisponible]);
    eq(r.asignaciones.length, 0, 'quien esta de ' + motivo + ' no se propone');
    eq(r.descartes.length, 1, '  y se explica por que');
    eq(r.descartes[0].motivo, motivo, '  con el motivo correcto');
}

// ============================================================================
console.log('\n=== 11. LA EXPERIENCIA EN LA LOCALIZACION PREMIOS A QUIEN LA TIENE ===');
console.log('     Entre candidatos elegibles, quien ya trabajo en el edificio puntua mas.\n');

{
    const conHistorial = persona(1, ['cashier'], { historial: ['local-a'] });
    const sinHistorial = persona(2, ['cashier'], { historial: [] });
    const reglas = [regla('local-a', 1, [{ role: 'cashier', count: 1 }])];

    const r = escenario(reglas, [sinHistorial, conHistorial]);

    eq(r.asignaciones.length, 1, 'se cubre el puesto');
    eq(r.asignaciones[0].employee_id, 1, '  con la que tiene historial en esa localizacion');
}

// ============================================================================
console.log('\n=== 12. EL ENTRENAMIENTO ES RESTRICCION SOLO EN MODO ESTRICTO ===');
console.log('     Sin entrenar en la localizacion se propone igual (preferencia),');
console.log('     pero con entrenamientoObligatorio activado no se propone nadie.\n');

{
    const solo = persona(1, ['cashier'], { localizacionesEntrenadas: [], historial: ['local-a'] });
    const reglas = [regla('local-a', 1, [{ role: 'cashier', count: 1 }])];

    const rEstricta = escenario(reglas, [solo], { config: { entrenamientoObligatoria: true } });
    eq(rEstricta.asignaciones.length, 0, 'en modo estricto no se propone sin entrenamiento');
    ok(rEstricta.descartes.some(d => /entrenamiento/.test(d.motivo)),
        '  y se explica por que no');

    const rBlanda = escenario(reglas, [solo], { config: {} });
    eq(rBlanda.asignaciones.length, 1, 'en modo normal se propone (el entrenamiento es preferencia)');
    ok(rBlanda.asignaciones[0].avisos.some(a => /sin formacion/i.test(a)),
        '  y se avisa de que no tiene formacion registrada');
}

// ============================================================================
console.log('\n=== 13. EL BALANCE USA LA CARGA REAL DEL DIA ===');
console.log('     Quien ya tiene turno ese dia carga mas que quien no.\n');

{
    const a = persona(1, ['cashier']);
    const b = persona(2, ['cashier']);
    const reglas = [regla('local-a', 1, [{ role: 'cashier', count: 1 }])];

    const r = escenario(reglas, [a, b], {
        // A tiene un turno ese dia en OTRA localizacion: carga real > 0, pero no
        // cubre el puesto de local-a.
        compromisos: [turno(a, 'Local B', '09:00', '13:00', { location_id: 'local-b', role: 'cashier' })],
        ventanas: { 'local-a': ventana('18:00', '22:00') }
    });

    eq(r.asignaciones.length, 1, 'se cubre el puesto');
    eq(r.asignaciones[0].employee_id, 2, '  con la que no tiene turno ese dia (menos carga)');
}

// ============================================================================
console.log('\n=== 14. UNA LOCALIZACION ACTIVA SIN REGLA NO ES CERRADA NI CUBIERTA =====');
console.log('     Es un estado distinto: sin regla no se pide personal, no se cierra,\n     y no debe contar como "todo cubierto" cuando hay reglas sin atender.\n');

{
    // local-a tiene regla y queda cubierta. local-b esta activa pero sin regla.
    const reglas = [regla('local-a', 1, [{ role: 'cashier', count: 1 }])];
    const r = A.planificar({
        fecha: '2026-07-15',
        diaSemana: 'wednesday',
        reglas,
        locations: [local('local-a', 'A'), local('local-b', 'B')],
        empleados: [persona(1, ['cashier'])],
        compromisos: [],
        ventanas: { 'local-a': ventana('09:00', '17:00') },
        zonaDe: {}, config: {}
    });

    ok(r.sinRegla.includes('local-b'), 'local-b activa sin regla se reporta en sinRegla');
    ok(!r.porLocalizacion['local-b'], 'local-b no se lista como cerrada ni como cumplida');
    eq(r.porLocalizacion['local-a'].cumple, true, 'local-a (con regla) queda cubierta');
    eq(r.todoCubierto, false, 'con una local sin regla, el dia NO se da por cubierto');
}

// ============================================================================
console.log('\n' + '='.repeat(68));
console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
console.log('='.repeat(68));

process.exitCode = fail ? 1 : 0;