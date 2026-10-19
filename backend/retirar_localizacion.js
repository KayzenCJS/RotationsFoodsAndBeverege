// ============================================================================
//  RETIRAR UNA LOCALIZACION
// ============================================================================
//  Deja una localizacion fuera del sistema sin perder nada de lo que ya paso en
//  ella.
//
//  POR QUE NO SE BORRA
//  -------------------
//  En la base, cuatro tablas apuntan a locations con ON DELETE CASCADE:
//
//      assignments                   el turno se borra solo
//      location_groups               la pertenencia al grupo se borra
//      employee_location_training    el entrenamiento se borra
//      location_required_roles       los roles exigidos se borran
//
//  Borrar la fila de locations arrastraria el turno historico sin avisar. En vez
//  de eso se marca is_active = false: sigue existiendo para poder leer el
//  pasado, pero no sale de ningun catalogo ni admite nada nuevo.
//
//  LO QUE SI SE BORRA
//  ------------------
//  Las Filas que son Normas y no Historia. Un grupo que declara una localizacion
//  retirada se queda con datos incoherentes (apuntando a un edificio que ya no
//  se ofrece), asi que se limpian. Aqui solo affects a location_groups.
//
//  LO QUE NO SE TOCA
//  -----------------
//  Todo lo demas. Empleados, certificaciones, horarios de otros dias, Bistro y
//  el resto del grupo D siguen exactamente como estaban.
//
//  COMO SE USA
//  -----------
//      node retirar_localizacion.js dunkin-donuts
//      node retirar_localizacion.js dunkin-donuts --reactivar
//
//  Es idempotente: llamarlo dos veces no cambia nada la segunda vez. Y antes de
//  tocar nada hace una copia en backend/backups/ con lo que va a modificar, por
//  si hay que volver atras.
//
// ============================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const arg = process.argv[2];
const reactivar = process.argv.includes('--reactivar');

if (!arg) {
    console.log('  uso: node retirar_localizacion.js <location_id> [--reactivar]');
    process.exit(1);
}

const id = String(arg).trim();
const linea = (t) => console.log('\n' + t + '\n' + '-'.repeat(t.length));

(async () => {
    // -------------------------------------------------------------------------
    linea('1. ¿Existe esa localizacion?');
    const loc = (await p.query('SELECT * FROM locations WHERE id = $1', [id])).rows[0];
    if (!loc) {
        console.log('  No existe ninguna localizacion con id "' + id + '". No se hace nada.');
        await p.end();
        return;
    }
    console.log('  ' + loc.name + '  (id=' + id + ', is_active=' + loc.is_active + ')');

    // -------------------------------------------------------------------------
    linea('2. Que hay alrededor (lo que se va a tocar o preservar)');
    const antes = {
        asignaciones: (await p.query(
            "SELECT count(*)::int n FROM assignments WHERE location_id=$1", [id])).rows[0].n,
        entrenamiento: (await p.query(
            "SELECT count(*)::int n FROM employee_location_training WHERE location_id=$1", [id])).rows[0].n,
        grupos: (await p.query(
            "SELECT count(*)::int n FROM location_groups WHERE location_id=$1", [id])).rows[0].n,
        roles: (await p.query(
            "SELECT count(*)::int n FROM location_required_roles WHERE location_id=$1", [id])).rows[0].n,
        cierres: (await p.query(
            "SELECT count(*)::int n FROM location_disables WHERE location_id=$1", [id])).rows[0].n,
        reglas: (await p.query(
            "SELECT count(*)::int n FROM staffing_rules WHERE location_id=$1", [id])).rows[0].n,
        inspecciones: (await p.query(
            "SELECT count(*)::int n FROM inspections WHERE location_id=$1", [id])).rows[0].n
    };
    for (const [k, v] of Object.entries(antes)) {
        console.log('  ' + k.padEnd(18) + v);
    }

    // -------------------------------------------------------------------------
    linea('3. Copia de seguridad de lo que se va a modificar');
    const dir = path.join(__dirname, 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const sello = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const destino = path.join(dir, `retirada_${id.replace(/[^a-z0-9-]/gi, '_')}_${sello}.sql`);

    const copia = [];
    copia.push(`-- Copia de lo retirado de "${id}" (${loc.name})`);
    copia.push(`-- Generada el ${new Date().toISOString()}`);
    copia.push('-- Sirve para deshacer la retirada a mano si hiciera falta.\n');

    copia.push('-- locations');
    copia.push(
        (await p.query('SELECT * FROM locations WHERE id = $1', [id])).rows
            .map(r => `UPDATE locations SET is_active = true WHERE id = '${r.id}';`).join('\n'));

    const filasGrupo = (await p.query(
        'SELECT * FROM location_groups WHERE location_id = $1', [id])).rows;
    if (filasGrupo.length) {
        copia.push('\n-- location_groups (estas filas se BORRAN al retirar)');
        filasGrupo.forEach(r => copia.push(
            `INSERT INTO location_groups (location_id, group_id) VALUES ('${r.location_id}', '${r.group_id}');`));
    }

    fs.writeFileSync(destino, copia.join('\n') + '\n', 'utf8');
    console.log('  escrito: ' + path.relative(path.join(__dirname, '..'), destino));
    console.log('  contiene como deshacer: volver a poner is_active = true y, si hace');
    console.log('  falta, reinsertar las filas de location_groups que se borren.');

    // -------------------------------------------------------------------------
    if (reactivar) {
        linea('4. Reactivando (deshaciendo la retirada)');
        await p.query('UPDATE locations SET is_active = true WHERE id = $1', [id]);
        for (const r of filasGrupo) {
            await p.query(
                'INSERT INTO location_groups (location_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [r.location_id, r.group_id]);
        }
        console.log('  ok   ' + loc.name + ' vuelve a estar activa, con sus grupos');
        await p.end();
        return;
    }

    linea('4. Aplicando la retirada');
    const client = await p.connect();
    try {
        await client.query('BEGIN');

        // a) Marca la localizacion como retirada. Es el cambio de verdad.
        await client.query('UPDATE locations SET is_active = false WHERE id = $1', [id]);
        console.log('  ok   locations.is_active = false');

        // b) Se quitan las filas de location_groups. Son NORMAS (a que grupo
        //    pertenece cada edificio), no historial: dejar el grupo apuntando a
        //    una localizacion que ya no se ofrece deja el grupo incoherente.
        //    Solo se toca ESTA localizacion; los demas grupos siguen igual.
        const borradas = await client.query(
            'DELETE FROM location_groups WHERE location_id = $1 RETURNING group_id', [id]);
        console.log('  ok   location_groups: ' + borradas.rows.length + ' fila(s) quitada(s)'
            + (borradas.rows.length ? ' (grupo ' + borradas.rows.map(r => r.group_id).join(', ') + ')' : ''));

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }

    // -------------------------------------------------------------------------
    linea('5. Que se conserva y que ha cambiado');
    const despues = {
        asignaciones: (await p.query(
            "SELECT count(*)::int n FROM assignments WHERE location_id=$1", [id])).rows[0].n,
        entrenamiento: (await p.query(
            "SELECT count(*)::int n FROM employee_location_training WHERE location_id=$1", [id])).rows[0].n,
        grupos: (await p.query(
            "SELECT count(*)::int n FROM location_groups WHERE location_id=$1", [id])).rows[0].n,
        reglas: (await p.query(
            "SELECT count(*)::int n FROM staffing_rules WHERE location_id=$1", [id])).rows[0].n,
        inspecciones: (await p.query(
            "SELECT count(*)::int n FROM inspections WHERE location_id=$1", [id])).rows[0].n
    };

    console.log('  CONSERVADO (sigue en la base, invisible en los catalogos):');
    console.log('    asignaciones historicas   ' + despues.asignaciones + '  (antes ' + antes.asignaciones + ')');
    console.log('    registros de entrenamiento ' + despues.entrenamiento + '  (antes ' + antes.entrenamiento + ')');
    console.log('    inspecciones               ' + despues.inspecciones + '  (antes ' + antes.inspecciones + ')');
    console.log('    reglas de personal         ' + despues.reglas + '  (antes ' + antes.reglas + ')');
    console.log('\n  CAMBIADO:');
    console.log('    la localizacion queda marcada como retirada (is_active = false)');
    console.log('    se quitan sus filas de location_groups: ' + antes.grupos + ' -> ' + despues.grupos);

    // El resto de localizaciones, intactas.
    const otras = (await p.query(
        'SELECT count(*)::int n FROM locations WHERE is_active IS TRUE')).rows[0].n;
    console.log('\n  locations activas ahora mismo: ' + otras);

    await p.end();
})().catch(async (e) => {
    console.error('ERROR:', e);
    try { await p.end(); } catch (x) { }
    process.exit(1);
});
