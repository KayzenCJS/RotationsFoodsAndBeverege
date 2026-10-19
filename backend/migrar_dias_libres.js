// ============================================================================
//  MIGRACIÓN: DÍAS LIBRES
// ============================================================================
//  Tres cosas, en este orden:
//
//    1. Copia de seguridad de lo que se va a tocar.
//    2. La tabla de excepciones por fecha (employee_day_off_exceptions).
//    3. La limpieza del valor de relleno days_off = ["sunday"].
//
//  POR QUÉ SE LIMPIA EL "sunday"
//  ------------------------------
//  Los 44 empleados tenían days_off = ["sunday"]. El valor no lo había elegido
//  nadie: salía hardcodeado en el formulario de alta (script.js), donde no
//  había ninguna casilla para verlo ni para cambiarlo. Para el que it'diera
//  configurar un día libre, la función nueva habría salido con las 44 fichas
//  ya marcadas en domingo, sin que nadie lo hubiera pedido.
//
//  Con el valor limpio, cada persona configura los suyos, y existe el caso
//  "Empleado sin días libres recurrentes" que hace falta para que el resto de
//  la lógica tenga sentido.
//
//  Si resulta que en el parque el domingo sí se cierra, se marca en cada ficha
//  (o se deja el domingo como cierre general, que es otra cosa) y ya está.
//
//  ES SEGURO
//  ---------
//  - No borra empleados, horarios, asignaciones, breaks ni nada histórico.
//  - Solo toca employee_availability.days_off.
//  - Es idempotente: la segunda vez no hace nada.
//  - Antes de limpiar deja un fichero .sql con el estado anterior, para poder
//    deshacerlo con una línea.
//
//  Cómo se ejecuta:
//      node migrar_dias_libres.js
//      node migrar_dias_libres.js --restaurar
// ============================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dl = require('./dias-libres');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const linea = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));
const dir = path.join(__dirname, 'backups');

(async () => {
    console.log('\n=== MIGRACIÓN: DÍAS LIBRES ===');

    // -------------------------------------------------------------------------
    linea('1. ¿Existe ya la tabla de excepciones?');
    const existe = (await p.query(
        "SELECT to_regclass('public.employee_day_off_exceptions') AS t")).rows[0].t;

    if (!existe) {
        await p.query(`
            CREATE TABLE IF NOT EXISTS employee_day_off_exceptions (
                id          SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                off_date    DATE NOT NULL,
                reason      TEXT,
                created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT employee_day_off_exceptions_uniq UNIQUE (employee_id, off_date)
            )`);

        // Índice por fecha: es la consulta que se hace al pintar un día
        // ("quién no está disponible hoy").
        await p.query(
            'CREATE INDEX IF NOT EXISTS employee_day_off_exceptions_fecha_idx ON employee_day_off_exceptions (off_date)');

        console.log('  ok   tabla employee_day_off_exceptions creada');
        console.log('       (empleado + fecha, única por pareja, con motivo opcional)');
    } else {
        console.log('  ya existe, no se hace nada');
    }

    const cols = (await p.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'employee_day_off_exceptions' ORDER BY ordinal_position")).rows;
    console.log('  columnas: ' + cols.map(c => c.column_name).join(', '));

    // -------------------------------------------------------------------------
    linea('2. ¿Cuántos tienen el valor de relleno?');
    const relleno = (await p.query(
        `SELECT e.id, e.name, a.days_off
           FROM employee_availability a JOIN employees e ON e.id = a.employee_id
          WHERE a.days_off IS NOT NULL
            AND cardinality(a.days_off) = 1
            AND a.days_off[1] = 'sunday'`)).rows;

    const otros = (await p.query(
        `SELECT e.id, e.name, a.days_off
           FROM employee_availability a JOIN employees e ON e.id = a.employee_id
          WHERE a.days_off IS NOT NULL AND cardinality(a.days_off) > 0
            AND NOT (cardinality(a.days_off) = 1 AND a.days_off[1] = 'sunday')`)).rows;

    console.log('  con ["sunday"] (el valor de fábrica): ' + relleno.length);
    console.log('  con otros valores (elegidos a mano):   ' + otros.length);
    if (otros.length) {
        console.log('  estos NO se tocan:');
        otros.forEach(o => console.log('    emp ' + o.id + '  ' + o.name + '  ' + JSON.stringify(o.days_off)));
    }

    // -------------------------------------------------------------------------
    if (process.argv.includes('--restaurar')) {
        linea('3. RESTAURANDO el valor de fábrica');
        for (const r of relleno) {
            await p.query(
                "UPDATE employee_availability SET days_off = ARRAY['sunday']::varchar[] WHERE employee_id = $1",
                [r.id]);
        }
        console.log('  ok   ' + relleno.length + ' empleado(s) vuelven a tener ["sunday"]');
        await p.end();
        return;
    }

    // -------------------------------------------------------------------------
    linea('3. Copia de seguridad antes de limpiar');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const destino = path.join(dir, `days_off_antes_de_limpiar_${sello}.sql`);

    const copia = [
        `-- Estado de days_off antes de la migracion de dias libres.`,
        `-- Generado el ${new Date().toISOString()}`,
        `-- Para restaurar:`,
        `--   UPDATE employee_availability SET days_off = ARRAY['sunday']::varchar[] WHERE employee_id = <id>;`,
        ''
    ];
    relleno.forEach(r => {
        copia.push(`UPDATE employee_availability SET days_off = ARRAY['sunday']::varchar[] WHERE employee_id = ${r.id};  -- ${r.name}`);
    });
    fs.writeFileSync(destino, copia.join('\n') + '\n', 'utf8');
    console.log('  escrito: ' + path.relative(path.join(__dirname, '..'), destino));

    // -------------------------------------------------------------------------
    linea('4. Limpiando el valor de fábrica');
    // Solo se vacía lo que es exactamente ["sunday"] y nada más. Si alguien
    // tuviese ["sunday","tuesday"], se respeta: eso ya es una elección.
    const res = await p.query(
        `UPDATE employee_availability
            SET days_off = '{}'::varchar[], updated_at = NOW()
          WHERE days_off IS NOT NULL
            AND cardinality(days_off) = 1
            AND days_off[1] = 'sunday'`);
    console.log('  ok   ' + res.rowCount + ' disponibilidad(s) con days_off vaciado');

    const quedan = (await p.query(
        `SELECT count(*)::int n FROM employee_availability WHERE cardinality(days_off) > 0`)).rows[0].n;
    console.log('  empleados con algún día libre registrado ahora: ' + quedan);

    // -------------------------------------------------------------------------
    linea('5. Comprobación');
    const tabla = (await p.query(
        "SELECT count(*)::int n FROM employee_day_off_exceptions")).rows[0].n;
    console.log('  excepciones por fecha registradas: ' + tabla);

    const muestra = (await p.query(
        `SELECT e.name, a.days_off FROM employee_availability a
           JOIN employees e ON e.id = a.employee_id ORDER BY e.name LIMIT 5`)).rows;
    console.log('  muestra:');
    muestra.forEach(m => console.log('    ' + m.name.padEnd(18) + JSON.stringify(m.days_off)));

    const prueba = dl.normalizarDias(['tuesday', 'monday', 'martes', 'xyz']);
    console.log('\n  normalizarDias(["tuesday","monday","martes","xyz"]) = ' + JSON.stringify(prueba));
    console.log('  (descarta lo que no es un día y ordena de lunes a domingo)');

    await p.end();
})().catch(async e => {
    console.error('ERROR:', e);
    try { await p.end(); } catch (x) { }
    process.exit(1);
});
