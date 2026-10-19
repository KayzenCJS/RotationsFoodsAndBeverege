// ============================================================================
//  RESTAURAR EL ESTADO DE INSPECCIONES
// ============================================================================
//  Al correr las pruebas de inspecciones se ha accumulatesido basura en la base:
//    - la inspeccion 81, creada hoy por una prueba;
//    - dos inspectores de prueba (101148, 101149);
//    - el hallazgo 95, que duplica el 39 original;
//    - la inspeccion 1, que era heredada (id de inspector 3 y sin nombre) y ha
//      quedado con el inspector de una prueba.
//
//  El estado bueno, al que se vuelve aqui, es el documentado: 4 inspecciones
//  (1, 2, 3 y 19), ninguna con inspector nuevo, y los 2 hallazgos originales.
//
//  NO se borra ninguna inspeccion original: la 81 se comprueba antes de
//  borrarla contra los datos que se认识到 de una prueba, y si no encaja, el
//  script se para. La inspeccion 1 se RESTAURA (se le vuelve a poner su id y su
//  nombre de antes), no se borra ni se recrea.
//
//  Es idempotente: si ya esta en el estado bueno, no hace nada.
// ============================================================================
require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

// Lo que SI se puede tocar. Cualquier otra cosa que aparezca se para.
const INSPECCIONES_DE_PRUEBA = [81];
const HALLAZGOS_DE_PRUEBA = [95];
const INSPECTORES_DE_PRUEBA = [101148, 101149];

// Como estaba la inspeccion 1 antes de que la tocaran: heredada, con el id de
// inspector de la epoca de los empleados y sin nombre guardado.
const INSPECCION_1_ANTES = { inspector_id: 3, inspector_name: null };

(async () => {
    const cuenta = async (t) => (await p.query('SELECT count(*)::int n FROM ' + t)).rows[0].n;

    const antes = {
        inspections: await cuenta('inspections'),
        inspectors: await cuenta('inspectors'),
        inspection_findings: await cuenta('inspection_findings')
    };
    console.log('=== ANTES ===');
    console.log('  ' + JSON.stringify(antes) + '\n');

    const client = await p.connect();
    try {
        await client.query('BEGIN');

        // --- 1. La inspeccion de prueba, solo si de verdad lo es -----------
        for (const id of INSPECCIONES_DE_PRUEBA) {
            const r = await client.query('SELECT * FROM inspections WHERE id = $1', [id]);
            if (!r.rows.length) { console.log('  inspeccion ' + id + ': no existe, nada que hacer'); continue; }

            const f = r.rows[0];
            // Una inspeccion real tiene fecha y tipo recognizibles. Se mira que
            // su inspector sea uno de los de prueba: si no, esta aqui por
            // otra cosa y tocarla seria un error.
            const esDePrueba = INSPECTORES_DE_PRUEBA.includes(Number(f.inspector_id))
                || /bistro/.test(String(f.location_id));

            if (!esDePrueba) {
                throw new Error('la inspeccion ' + id + ' no parece de prueba (inspector '
                    + f.inspector_id + ', ' + f.location_id + '). No se toca.');
            }

            console.log('  borrando la inspeccion ' + id + ' de prueba:'
                + ' ' + f.inspection_date + ' en ' + f.location_id);
            await client.query('DELETE FROM inspection_status_history WHERE inspection_id = $1', [id]);
            await client.query('DELETE FROM inspection_evidence WHERE inspection_id = $1', [id]);
            await client.query('DELETE FROM inspection_findings WHERE inspection_id = $1', [id]);
            await client.query('DELETE FROM inspections WHERE id = $1', [id]);
        }

        // --- 2. El hallazgo de prueba, solo si esta duplicado --------------
        for (const id of HALLAZGOS_DE_PRUEBA) {
            const r = await client.query('SELECT * FROM inspection_findings WHERE id = $1', [id]);
            if (!r.rows.length) { console.log('  hallazgo ' + id + ': no existe, nada que hacer'); continue; }

            const f = r.rows[0];
            const gemelo = (await client.query(
                `SELECT id FROM inspection_findings
                  WHERE inspection_id = $1 AND title = $2 AND id <> $3`,
                [f.inspection_id, f.title, id])).rows;

            if (!gemelo.length) {
                throw new Error('el hallazgo ' + id + ' (' + f.title + ') no tiene gemelo: '
                    + 'puede ser original. No se toca.');
            }
            console.log('  borrando el hallazgo ' + id + ' de prueba (duplica el '
                + gemelo.map(g => g.id).join(', ') + ')');
            await client.query('DELETE FROM corrections WHERE finding_id = $1', [id]);
            await client.query('DELETE FROM inspection_findings WHERE id = $1', [id]);
        }

        // --- 3. La inspeccion 1 se restaura, no se recrea ------------------
        const uno = (await client.query('SELECT * FROM inspections WHERE id = 1')).rows[0];
        if (uno) {
            const cambiado = Number(uno.inspector_id) !== INSPECCION_1_ANTES.inspector_id
                || uno.inspector_name !== INSPECCION_1_ANTES.inspector_name;
            if (cambiado) {
                console.log('  restaurando la inspeccion 1: id de inspector'
                    + ' ' + uno.inspector_id + ' -> ' + INSPECCION_1_ANTES.inspector_id
                    + ', nombre ' + JSON.stringify(uno.inspector_name) + ' -> null');
                await client.query(
                    'UPDATE inspections SET inspector_id = $1, inspector_name = $2 WHERE id = 1',
                    [INSPECCION_1_ANTES.inspector_id, INSPECCION_1_ANTES.inspector_name]);
            } else {
                console.log('  la inspeccion 1 ya estaba como debe');
            }
        }

        // --- 4. Los inspectores de prueba ---------------------------------
        for (const id of INSPECTORES_DE_PRUEBA) {
            // Antes de borrar un inspector, que no se le quede ninguna
            // inspeccion apuntando.
            const usadas = (await client.query(
                'SELECT id FROM inspections WHERE inspector_id = $1', [id])).rows;
            if (usadas.length) {
                throw new Error('el inspector ' + id + ' lo usan ' + usadas.length
                    + ' inspeccion(es). No se borra.');
            }
            const r = await client.query('DELETE FROM inspectors WHERE id = $1 RETURNING id', [id]);
            console.log('  borrado el inspector ' + id + (r.rows.length ? '' : ' (no existia)'));
        }

        // --- 5. La serie, para que el siguiente id siga por encima --------
        // La serie tiene que quedar por encima del mayor id de inspector que
        // aparece en cualquier inspeccion historica. Si no, un inspector nuevo
        // podria recibir un id que ya significo otra cosa.
        const maxHistorico = (await client.query(
            'SELECT COALESCE(max(inspector_id), 0)::bigint AS m FROM inspections')).rows[0].m;
        const seq = (await client.query(
            'SELECT last_value FROM inspectors_id_seq')).rows[0];

        if (Number(seq.last_value) < Number(maxHistorico)) {
            // setval con el tercer argumento false hace que el siguiente nextval
            // devuelva ese valor, no el siguiente. Hay que darle max + 1 para
            // que el siguiente id sea mayor que cualquier historico.
            await client.query('SELECT setval(\'inspectors_id_seq\', $1, false)', [Number(maxHistorico) + 1]);
            console.log('  serie de inspectores subida a ' + (Number(maxHistorico) + 1)
                + ' (maximo historico ' + maxHistorico + ')');
        } else {
            console.log('  la serie de inspectores (' + seq.last_value
                + ') ya esta por encima del maximo historico (' + maxHistorico + ')');
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n  ERROR: ' + err.message);
        console.error('  No se ha cambiado nada: la operacion esta deshecha.');
        await client.release();
        process.exitCode = 1;
        return;
    }
    client.release();

    const despues = {
        inspections: await cuenta('inspections'),
        inspectors: await cuenta('inspectors'),
        inspection_findings: await cuenta('inspection_findings')
    };
    console.log('\n=== DESPUES ===');
    console.log('  ' + JSON.stringify(despues));

    console.log('\n=== COMPROBACION ===');
    const objetivos = { inspections: 4, inspectors: 0, inspection_findings: 2 };
    let mal = 0;
    for (const [k, v] of Object.entries(objetivos)) {
        const ok = despues[k] === v;
        if (!ok) mal++;
        console.log('  ' + (ok ? 'OK  ' : 'MAL ') + k + ': ' + despues[k] + ' (se esperaba ' + v + ')');
    }

    const insp1 = (await p.query(
        'SELECT inspector_id, inspector_name FROM inspections WHERE id = 1')).rows[0];
    const unoOk = insp1 && Number(insp1.inspector_id) === 3 && insp1.inspector_name === null;
    if (!unoOk) mal++;
    console.log('  ' + (unoOk ? 'OK  ' : 'MAL ') + 'la inspeccion 1 vuelve a estar heredada: '
        + JSON.stringify(insp1));

    await p.end();
    process.exitCode = mal ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });