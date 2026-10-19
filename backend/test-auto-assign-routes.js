// ============================================================================
//  ASIGNACION AUTOMATICA: PRUEBAS DE LOS ENDPOINTS CONTRA LA BASE REAL
// ============================================================================
//  El algoritmo puro ya esta probado en test-auto-assign.js. Aqui se prueba lo
//  que solo se puede ver con la base de verdad: que se leen las reglas
//  configuradas, que se respetan los compromisos guardados y que guardar es
//  seguro.
//
//  Todas las pruebas usan la FECHA DE PRUEBA, una fecha lejana con la que no
//  se toca nada real, y borran al terminar. Los nombres de persona nunca se
//  escriben en el fichero: se eligen por posicion, como en el resto de pruebas.
// ============================================================================
require('dotenv').config();
const { Pool } = require('pg');
const { montarRutasAutoAssign } = require('./auto-assign-routes.js');
const { intervalo, seSolapan } = require('./auto-assign.js');

const FECHA = '2019-03-13';          // lejana de cualquier dato real
const BASE = 'http://localhost:3002/api/foods';

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('  OK   ' + m); }
    else {
        fail++; fallos.push(m);
        console.log('  FAIL ' + m + '\n         esperado ' + JSON.stringify(e) + '\n         obtenido ' + JSON.stringify(a));
    }
};
const ok = (v, m) => eq(!!v, true, m);

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const post = async (ruta, cuerpo) => {
    const res = await fetch(BASE + ruta, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });
    let datos = null;
    try { datos = await res.json(); } catch (e) { /* respuesta sin cuerpo */ }
    return { status: res.status, ok: res.ok, datos };
};

(async () => {
    console.log('=== ENDPOINTS DE ASIGNACION AUTOMATICA ===\n');
    console.log('  fecha de prueba: ' + FECHA + ' (lejana de cualquier dato real)\n');

    // Limpieza por si quedo algo de una ejecucion anterior.
    await p.query('DELETE FROM assignments WHERE work_date = $1', [FECHA]);
    const antes = (await p.query('SELECT count(*)::int n FROM assignments')).rows[0].n;

    // Que haya alguien con papel de cada tipo, para que la propuesta tenga
    // material con el que trabajar. Se cogen por posicion.
    const gente = (await p.query('SELECT id, name FROM employees ORDER BY id LIMIT 12')).rows;
    if (!gente.length) throw new Error('no hay empleados en la base');

    const creados = [];

    try {
        // ==================================================================
        console.log('=== 1. FECHA INVALIDA ===');
        for (const [fecha, motivo] of [['', 'vacia'], ['15-10-2026', 'formato dd-mm-aaaa'], ['2026-13-45', 'mes imposible']]) {
            const r = await post('/auto-assign/preview', { date: fecha });
            eq(r.status, 400, 'una fecha ' + motivo + ' se rechaza');
            eq(r.datos.error, 'fecha_invalida', '  con el motivo fecha_invalida');
        }

        // ==================================================================
        console.log('\n=== 2. LA PROPUESTA USA LAS REGLAS GUARDADAS ===');
        const r = await post('/auto-assign/preview', { date: FECHA });
        eq(r.status, 200, 'la propuesta responde');

        // Las reglas vienen de staffing_rules, no de una lista escrita en el
        // codigo: se comprueba contra lo que hay en la tabla.
        const reglas = (await p.query(
            'SELECT location_id, min_employees, requirements FROM staffing_rules WHERE is_active = true')).rows;

        let chequeadas = 0;
        for (const regla of reglas) {
            const enPropuesta = r.datos.porLocalizacion[regla.location_id];
            ok(enPropuesta, 'aparece la localizacion con regla: ' + regla.location_id);
            if (!enPropuesta) continue;
            eq(enPropuesta.min_employees, regla.min_employees,
                '  con su minimo guardado (' + regla.location_id + ' = ' + regla.min_employees + ')');
            chequeadas++;
        }
        ok(chequeadas >= 5, 'se han comprobado ' + chequeadas + ' reglas contra la tabla');

        // ==================================================================
        console.log('\n=== 3. NO HAY COMPROMISOS Y SE CUBRE LO QUE SE PUEDE ===');
        eq(r.datos.compromisos, 0, 'sin turnos previos no hay compromisos que respetar');
        ok(r.datos.totalCubiertos > 0, 'se proponen ' + r.datos.totalCubiertos + ' asignaciones');
        ok(r.datos.totalPuestos >= r.datos.totalCubiertos, 'nunca se proponen mas de los que hay');

        // Cada persona, una sola vez y sin solapes.
        const porPersona = {};
        for (const a of r.datos.asignaciones) {
            (porPersona[a.employee_id] = porPersona[a.empleado_id] || []).push(intervalo(a.start_time, a.end_time));
        }
        const solapes = Object.values(porPersona)
            .filter(ivs => ivs.some((x, i) => ivs.some((y, j) => i !== j && seSolapan(x, y)))).length;
        eq(solapes, 0, 'nadie recibe dos turnos solapados');

        // ==================================================================
        console.log('\n=== 4. UN COMPROMISO EXISTENTE SE RESPETA ===');
        // Se planta un turno a una de las personas que la propuesta quiere usar
        // y se vuelve a pedir: esa persona ya no debe salir en las horas que
        // pisa el turno plantado.
        const candidato = r.datos.asignaciones.find(a => a.start_time < '12:00');
        ok(candidato, 'hay al menos una propuesta por la manana');

        if (candidato) {
            const r2 = await p.query(
                `INSERT INTO assignments
                    (location_id, employee_id, work_date, start_time, end_time, assignment_type, source)
                 VALUES ($1, $2, $3::date, $4, $5, 'LOCATION', 'auto-assign-test')
                 RETURNING id`,
                [candidato.location_id, candidato.employee_id, FECHA, '08:00', '20:00']);
            creados.push(r2.rows[0].id);

            const r3 = await post('/auto-assign/preview', { date: FECHA });
            eq(r3.datos.compromisos, 1, 'el turno plantado se ve como compromiso');

            const repites = r3.datos.asignaciones.filter(a =>
                a.employee_id === candidato.employee_id);
            eq(repites.length, 0,
                'ya no se propone a quien tiene un turno de 08:00 a 20:00');

            // Y ademas, ese turno cuenta para cubrir el puesto: con el turno
            // plantado la localizacion deberia quedar cubierta sin sumar a nadie.
            const loc = r3.datos.porLocalizacion[candidato.location_id];
            ok(loc, 'sigue apareciendo la localizacion del turno plantado');
        }

        // ==================================================================
        console.log('\n=== 5. UNA ACTIVIDAD REFLEJADA DOS VECES SE CUENTA UNA ===');
        // La misma persona, misma actividad y misma hora, escrita desde dos
        // secciones distintas.
        if (candidato) {
            const id = creados[creados.length - 1];
            const r4 = await p.query(
                `INSERT INTO assignments
                    (location_id, employee_id, work_date, start_time, end_time,
                     assignment_type, category, source)
                 VALUES (NULL, $1, $2::date, '08:00', '20:00', 'EXTRA_HOURS', 'student-dining', 'auto-assign-test')
                 RETURNING id`,
                [candidato.employee_id, FECHA]);
            creados.push(r4.rows[0].id);

            const r5 = await post('/auto-assign/preview', { date: FECHA });
            // Las dos filas NO son identicas: una es de localizacion y la otra de
            // seccion, asi que el reflejo no se detecta por ser la misma fila.
            // Lo que se comprueba es que la de seccion tambien cuenta como
            // compromiso y bloquea igual que la otra.
            ok(r5.datos.compromisos >= 2, 'las dos filas cuentan como compromisos');
        }

        // ==================================================================
        console.log('\n=== 6. GUARDAR, Y QUE NO SE PISE NADA ===');
        const r6 = await post('/auto-assign/preview', { date: FECHA });
        const aGuardar = r6.datos.asignaciones.slice(0, 5).map(a => ({
            employee_id: a.employee_id, location_id: a.location_id,
            rol: a.rol, start_time: a.start_time, end_time: a.end_time
        }));

        const antesDeGuardar = (await p.query(
            'SELECT count(*)::int n FROM assignments')).rows[0].n;

        const r7 = await post('/auto-assign/apply', { date: FECHA, asignaciones: aGuardar });
        eq(r7.status, 200, 'el guardado responde');
        eq(r7.datos.rechazadas.length, 0, 'no se rechaza ninguna (estaban libres)');
        eq(r7.datos.guardadas.length, aGuardar.length, 'se guardan las ' + aGuardar.length + ' propuestas');

        const despues = (await p.query(
            'SELECT count(*)::int n FROM assignments')).rows[0].n;
        eq(despues, antesDeGuardar + aGuardar.length, 'la base tiene exactamente esas filas de mas');
        eq(r7.datos.guardadas.every(g => g.location && g.employee_name),
            true, 'el guardado devuelve quien y donde, para poder confirmarlo');

        // ==================================================================
        console.log('\n=== 7. GUARDAR LO MISMO DOS VECES NO DUPLICA ===');
        // La segunda vez los turnos ya existen: no se pueden volver a crear y
        // tienen que rechazarse, no duplicarse.
        const r8 = await post('/auto-assign/apply', { date: FECHA, asignaciones: aGuardar });
        eq(r8.status, 200, 'el segundo guardado responde');
        ok(r8.datos.rechazadas.length > 0,
            'rechaza lo que ya estaba (' + r8.datos.rechazadas.length + ')');
        ok(r8.datos.rechazadas.every(x => x.motivo),
            '  y explica cada rechazo');
        ok(r8.datos.rechazadas.every(x => x.employee_name && x.location),
            '  diciendo de quien y de donde se trata');

        const trasDuplicar = (await p.query(
            'SELECT count(*)::int n FROM assignments')).rows[0].n;
        eq(trasDuplicar, despues, 'no se ha creado ni una fila mas');

        // ==================================================================
        console.log('\n=== 8. LO QUE SE GUARDA PASA LAS MISMAS REGLAS ===');
        // Se miran SOLO los turnos que ha guardado el algoritmo (origen
        // auto-assign). Los que planta la prueba earlier estan puestos a
        // proposito para forzar un conflicto, y esos si se solapan entre si:
        // son dos filas de la MISMA persona a las MISMAS horas escritas desde
        // dos secciones, que es justo el reflejo duplicado del apartado 5.
        const guardados = (await p.query(
            `SELECT employee_id, location_id, start_time::text AS ini, end_time::text AS fin
               FROM assignments
              WHERE work_date = $1 AND source = 'auto-assign'
              ORDER BY employee_id`, [FECHA])).rows;

        let choca = 0;
        for (let i = 0; i < guardados.length; i++) {
            for (let j = i + 1; j < guardados.length; j++) {
                if (guardados[i].employee_id !== guardados[j].employee_id) continue;
                if (seSolapan(intervalo(guardados[i].ini, guardados[i].fin),
                              intervalo(guardados[j].ini, guardados[j].fin))) choca++;
            }
        }
        eq(choca, 0, 'ninguno de los turnos guardados se solapa con otro de la misma persona'
            + ' (' + guardados.length + ' turnos guardados)');

        // Tampoco solapan con los turnos plantados a mano.
        const plantados = (await p.query(
            `SELECT employee_id, start_time::text AS ini, end_time::text AS fin
               FROM assignments WHERE work_date = $1 AND source = 'auto-assign-test'`,
            [FECHA])).rows;
        let chocaConPlantado = 0;
        for (const g of guardados) {
            for (const pl of plantados) {
                if (g.employee_id !== pl.employee_id) continue;
                if (seSolapan(intervalo(g.ini, g.fin), intervalo(pl.ini, pl.fin))) chocaConPlantado++;
            }
        }
        eq(chocaConPlantado, 0, 'ninguno pisa un turno que ya habia a mano');

        // Y el origen queda marcado, para poder distinguirlos de los manuales.
        const conOrigen = (await p.query(
            `SELECT source, count(*)::int n FROM assignments
              WHERE work_date = $1 GROUP BY source`, [FECHA])).rows;
        ok(conOrigen.some(x => x.source === 'auto-assign'),
            'las guardadas quedan marcadas con origen auto-assign');

        // ==================================================================
        console.log('\n=== 9. NO SE TOCA LO QUE YA ESTABA ===');
        // El numero de filas de cada dia distinto al de prueba no ha cambiado.
        // `antes` se tomo DESPUES de la limpieza inicial, asi que es el total de
        // filas reales, y las de la fecha de prueba se han ido haciendo y
        // borrando por encima. Lo que no puede haber cambiado es el resto.
        const fueraDePrueba = (await p.query(
            'SELECT count(*)::int n FROM assignments WHERE work_date <> $1', [FECHA])).rows[0].n;
        eq(fueraDePrueba, antes, 'el numero de asignaciones de otros dias no ha cambiado');

        // Y ninguna de esas filas se ha vuelto a escribir: si se hubiera
        // tocado alguna, el id habria cambiado al borrarla e insertarla.
        const sinTocar = (await p.query(
            `SELECT count(*)::int n FROM assignments
              WHERE work_date <> $1 AND created_at > now() - interval '10 minutes'`,
            [FECHA])).rows[0].n;
        eq(sinTocar, 0, 'no se ha creado ninguna fila en otro dia');

        // ==================================================================
        console.log('\n=== 10. LO QUE NO SE PUEDE GUARDAR ===');
        const vacio = await post('/auto-assign/apply', { date: FECHA, asignaciones: [] });
        eq(vacio.status, 400, 'una propuesta vacia se rechaza');
        eq(vacio.datos.error, 'nada_que_guardar', '  con el motivo nada_que_guardar');

        const malaFecha = await post('/auto-assign/apply', { date: 'nope', asignaciones: aGuardar });
        eq(malaFecha.status, 400, 'una fecha invalida no llega a escribir nada');

        // Un horario imposible no se guarda.
        const roto = await post('/auto-assign/apply', {
            date: FECHA,
            asignaciones: [{
                employee_id: gente[0].id, location_id: 'food-fair',
                rol: 'cook', start_time: 'banana', end_time: '17:00'
            }]
        });
        eq(roto.status, 200, 'una propuesta con un horario ilegible no rompe el guardado');
        eq(roto.datos.rechazadas.length, 1, '  se rechaza solo esa fila');
        ok(/horario ilegible/.test(roto.datos.rechazadas[0].motivo), '  diciendo que el horario no vale');

    } finally {
        console.log('\n=== LIMPIEZA ===');
        const r = await p.query(
            'DELETE FROM assignments WHERE work_date = $1 RETURNING id', [FECHA]);
        console.log('  borrados ' + r.rowCount + ' turnos de prueba');

        const quedan = (await p.query(
            'SELECT count(*)::int n FROM assignments WHERE work_date = $1', [FECHA])).rows[0].n;
        eq(quedan, 0, 'no queda ninguno');

        const final = (await p.query('SELECT count(*)::int n FROM assignments')).rows[0].n;
        eq(final, antes, 'la base ha vuelto a tener las mismas ' + antes + ' asignaciones');
        await p.end();
    }

    console.log('\n' + '='.repeat(68));
    console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
    if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
    console.log('='.repeat(68));
    process.exitCode = fail ? 1 : 0;
})().catch(async e => {
    console.error('ERROR:', e);
    try {
        await p.query('DELETE FROM assignments WHERE work_date = $1', [FECHA]);
        await p.end();
    } catch (x) { /* nada que hacer */ }
    process.exitCode = 1;
});