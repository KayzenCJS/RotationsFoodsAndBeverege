// ============================================================================
//  ENDPOINTS DEL MODULO DE INSPECCIONES
// ============================================================================
//  Se montan desde server.js. Solo el bloque de inspecciones de server.js se
//  retira: el resto de la API no se toca.
//
//  A diferencia de la version anterior, aqui TODA escritura valida antes de
//  guardar:
//    - que la inspeccion, el hallazgo y la locacion existan de verdad
//    - que el hallazgo pertenezca a la inspeccion indicada
//    - que la locacion del hallazgo sea la de su inspeccion
//    - que el responsable exista, o que venga un nombre externo
//
//  Lo que ya no existe NO se borra: hallazgos y correcciones se retiran con
//  borrado logico (deleted_at), de modo que conservan su historial y las
//  relaciones con inspecciones y auditoria siguen intactas.
// ============================================================================

const INSPECTION_ASSIGNER_ROLES = ['supervisor', 'op', 'manager', 'assistant-supervisor'];

const INSPECTION_TYPES = ['food_safety', 'health', 'safety', 'equipment',
                          'maintenance', 'general', 'other'];

const INSPECTION_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const FINDING_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const FINDING_STATUSES = ['warning', 'pending_review', 'under_analysis',
                          'correction_in_progress', 'corrected', 'supervised',
                          'audited', 'closed', 'requires_rework'];

const CORRECTION_STATUSES = ['pending', 'in_progress', 'corrected', 'supervised',
                             'audited', 'closed', 'requires_rework'];

// --- Utilidades de validacion -----------------------------------------------

const normTexto = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
const textoVacio = (v) => v === undefined || v === null || String(v).trim() === '';
const enteroONulo = (v) => (textoVacio(v) ? null : (Number.isInteger(Number(v)) ? Number(v) : NaN));
// Para la cabecera del PDF: lo no informado se omite, no se inventa.
const valor = (v) => (v === undefined || v === null || String(v) === '' ? null : String(v));

// Generador del PDF del historial de auditoria.
const { generarPDF } = require('./inspections-pdf');
const retiradas = require('./locations-retiradas');

async function existeInspeccion(pool, id) {
    if (!Number.isInteger(Number(id))) return false;
    return (await pool.query('SELECT 1 FROM inspections WHERE id = $1', [Number(id)])).rows.length > 0;
}

async function existeHallazgo(pool, id) {
    if (!Number.isInteger(Number(id))) return false;
    return (await pool.query(
        'SELECT 1 FROM inspection_findings WHERE id = $1 AND deleted_at IS NULL', [Number(id)])).rows.length > 0;
}

// Una localizacion RETIRADA cuenta como si no existiera. Asi no se puede crear
// una inspeccion, una tarea ni una correccion sobre un edificio que ya no esta
// en el sistema. La fila sigue en la tabla para poder leer el pasado.
async function existeLocacion(pool, id) {
    if (textoVacio(id)) return false;
    return (await pool.query(
        `SELECT 1 FROM locations l WHERE l.id = $1 AND ${retiradas.activaDe('l')}`,
        [String(id)])).rows.length > 0;
}

async function existeEmpleado(pool, id) {
    if (!Number.isInteger(Number(id))) return false;
    return (await pool.query('SELECT 1 FROM employees WHERE id = $1', [Number(id)])).rows.length > 0;
}

// ===========================================================================
//  COMO SE MUESTRA EL INSPECTOR
// ===========================================================================
//  Una sola expresion para el listado, el detalle, el panel de locaciones y el
//  PDF, para que el inspector se lea igual en todos ellos.
//
//  El orden importa:
//
//    1. inspections.inspector_name es la FOTO del nombre en el momento de la
//       inspeccion. Gana siempre que exista: es la garantia de que la
//       inspeccion sigue mostrando lo que se escribio, aunque el inspector se
//       renombre o se desactive despues.
//    2. Si no hay foto (inspecciones antiguas), se usa el nombre que tenga
//       ahora en el registro de inspectores.
//    3. Si tampoco, se dice que el id es de una epoca anterior en la que se
//       guardaba el id de un empleado. Se conserva y se explica; no se borra
//       ni se reasigna.
//
//  Nota: antes este nombre salia de un LEFT JOIN a employees. Eso ademas de
//  estar equivocado (los inspectores no son empleados) machacaba el snapshot,
//  porque en una fila con dos columnas del mismo nombre gana la ultima.
const EXPR_INSPECTOR = `CASE
        WHEN i.inspector_name IS NOT NULL AND btrim(i.inspector_name) <> ''
            THEN i.inspector_name
        WHEN insp.id IS NOT NULL
            THEN insp.name
        WHEN i.inspector_id IS NOT NULL
            THEN 'ID ' || i.inspector_id || ' — registro anterior, sin nombre guardado'
        ELSE NULL
    END`;

// El JOIN al registro de inspectores. Se puede usar en cualquier consulta que
// ya tenga la tabla inspections con alias "i".
const JOIN_INSPECTOR = 'LEFT JOIN inspectors insp ON insp.id = i.inspector_id';

// ===========================================================================
//  INSPECTORES
// ===========================================================================
//  Los inspectores NO son los empleados del Gestor de Empleados. Se registran
//  por su cuenta en la tabla `inspectors`, con su propio identificador, y no
//  se relacionan con `employees` en ningun sentido.
//
//  Lo que hace esta funcion, cuando se guarda una inspeccion:
//
//    1. Si se eligio un inspector que ya existe (viene su id), se reutiliza.
//    2. Si se escribio un nombre, se busca ese mismo nombre entre los ya
//       registrados, ignorando mayusculas y espacios sobrantes. Si esta, se
//       reutiliza ese: la misma persona no queda registrada dos veces.
//    3. Si no esta, se da de alta con el id que genera la base de datos.
//
//  En los tres casos se devuelve tambien el nombre, que la inspeccion guarda
//  como foto. Asi el listado, el detalle, el PDF y el historial siguen
//  mostrando el nombre con el que se hizo la inspeccion, aunque luego se
//  renombre o se desactive el inspector en el registro.
//
//  Nunca se crea un empleado a partir de un inspector, y nunca se exige que el
//  inspector exista de antemano.
async function resolverInspector(pool, idCrudo, nombreCrudo) {
    const nombre = textoVacio(nombreCrudo)
        ? null
        : String(nombreCrudo).replace(/\s+/g, ' ').trim().slice(0, 120);

    // 1) Inspector elegido de la lista: se usa ese id.
    if (!textoVacio(idCrudo)) {
        const n = Number(idCrudo);
        if (Number.isInteger(n)) {
            const x = (await pool.query('SELECT id, name FROM inspectors WHERE id = $1', [n])).rows[0];
            // El nombre snapshot es el que se escribio; si no se escribio
            // ninguno, se conserva el que tiene el inspector en el registro.
            if (x) return { id: x.id, nombre: nombre || x.name, nuevo: false };
        }
        // Un id que no existe en el registro no se inventa: se ignora y se
        // resuelve por nombre, que es lo que sabe el usuario.
    }

    if (!nombre) return { id: null, nombre: null, nuevo: false };

    // 2) Mismo nombre ya registrado (sin distinguir mayusculas ni espacios).
    //    Se copia el nombre del registro, no el que se acaba de escribir: si
    //    alguien teclea "ana lopez" y ya esta como "Ana López", la
    //    inspeccion guardaria la grafia buena y no una tercera variante. Da igual
    //    que luego se renombre el inspector en el registro: lo que se guarda
    //    aqui ya queda congelado en esta inspeccion.
    const existente = (await pool.query(
        'SELECT id, name FROM inspectors WHERE lower(btrim(name)) = lower(btrim($1)) LIMIT 1',
        [nombre])).rows[0];
    if (existente) return { id: existente.id, nombre: existente.name, nuevo: false };

    // 3) Alta nueva. Si la carrera con otra peticion hace que el nombre ya
    //    exista (indice unico), se recupera el que se creo en el otro intento.
    try {
        const r = await pool.query(
            'INSERT INTO inspectors (name) VALUES ($1) RETURNING id, name', [nombre]);
        return { id: r.rows[0].id, nombre: r.rows[0].name, nuevo: true };
    } catch (e) {
        if (e.code === '23505') {
            const otra = (await pool.query(
                'SELECT id, name FROM inspectors WHERE lower(btrim(name)) = lower(btrim($1)) LIMIT 1',
                [nombre])).rows[0];
            if (otra) return { id: otra.id, nombre: otra.name, nuevo: false };
        }
        throw e;
    }
}

// Responsable: id de empleado si existe; si no, el nombre escrito a mano.
// Nunca se inventa un empleado.
async function resolverResponsable(pool, idCrudo, nombreCrudo) {
    const nombre = textoVacio(nombreCrudo) ? null : String(nombreCrudo).trim().slice(0, 120);
    if (!textoVacio(idCrudo)) {
        const n = Number(idCrudo);
        if (Number.isInteger(n) && await existeEmpleado(pool, n)) return { id: n, nombre: null };
        if (nombre) return { id: null, nombre };
        return { id: null, nombre: null, aviso: 'assigned_to_unknown' };
    }
    if (nombre) return { id: null, nombre };
    return { id: null, nombre: null };
}

// Nombre canonico de una categoria: si ya existe escrita de otra forma, se
// devuelve tal como esta guardada; si no, el texto limpio.
async function canonizarCategoria(pool, nombreCrudo) {
    if (textoVacio(nombreCrudo)) return null;
    const limpio = String(nombreCrudo).replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!limpio) return null;
    const r = await pool.query(
        'SELECT name FROM finding_categories WHERE lower(btrim(name)) = lower(btrim($1))', [limpio]);
    return r.rows.length ? r.rows[0].name : limpio;
}

// Alta de categoria escrita a mano, para que la proxima vez aparezca en el
// combobox. El indice unico sobre lower(btrim(name)) evita duplicados.
async function registrarCategoriaSiFalta(pool, nombre, typeKey) {
    if (!nombre) return;
    try {
        await pool.query(
            `INSERT INTO finding_categories (name, type_key, is_active)
             VALUES ($1, $2, true) ON CONFLICT DO NOTHING`,
            [nombre, typeKey || null]);
    } catch (e) {
        console.warn('No se pudo registrar la categoría:', e.message);
    }
}

// El numero lo genera la base, no el navegador: 'INS-' + Date.now() colisionaba
// si se Guards dos inspecciones en el mismo milisegundo (y es UNIQUE).
function nuevoNumeroInspeccion() {
    return 'INS-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ---------------------------------------------------------------------------
//  Rutas
// ---------------------------------------------------------------------------
function montarRutasInspecciones(app, getPool) {

    // =========================================================================
    //  CATALOGOS
    // =========================================================================

    // Tipos de inspeccion. Alimenta el combobox; anadir uno nuevo es una fila.
    app.get('/api/:type/inspection-types', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const r = await pool.query(
                `SELECT t.*,
                        (SELECT count(*)::int FROM inspections i
                          WHERE i.inspection_type = t.key) AS usos
                   FROM inspection_types t
                  WHERE t.is_active
                  ORDER BY t.sort_order, t.key`);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Alta de un tipo nuevo. No modifica los anteriores.
    app.post('/api/:type/inspection-types', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { key, name_es, name_en, description } = req.body;
            if (textoVacio(key) || textoVacio(name_es)) {
                return res.status(400).json({ error: 'key_and_name_required' });
            }
            const k = String(key).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 50);
            if (textoVacio(k)) {
                return res.status(400).json({ error: 'key_invalid' });
            }
            const r = await pool.query(
                `INSERT INTO inspection_types (key, name_es, name_en, description, sort_order)
                 VALUES ($1, $2, $3, $4,
                         COALESCE((SELECT max(sort_order) + 10 FROM inspection_types), 100))
                 ON CONFLICT (key) DO UPDATE
                    SET name_es = EXCLUDED.name_es, name_en = EXCLUDED.name_en,
                        description = EXCLUDED.description, is_active = true
                 RETURNING *`,
                [k, String(name_es).trim().slice(0, 80), String(name_en || name_es).trim().slice(0, 80),
                 textoVacio(description) ? null : String(description).slice(0, 500)]);
            res.status(201).json(r.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Categorias de hallazgo. Con ?type_key= se priorizan las de ese tipo.
    app.get('/api/:type/finding-categories', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { type_key } = req.query;
            const r = await pool.query(
                `SELECT c.*,
                        (SELECT count(*)::int FROM inspection_findings f
                          WHERE lower(btrim(f.category)) = lower(btrim(c.name))
                            AND f.deleted_at IS NULL) AS usos
                   FROM finding_categories c
                  WHERE c.is_active
                  ORDER BY (c.type_key IS NOT NULL AND c.type_key <> $1) ASC,
                           (c.type_key IS NULL) ASC, lower(c.name)`,
                [type_key || '']);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  INSPECTORES
    // =========================================================================
    //  Alimenta el combobox del campo Inspector.
    //
    //  Viene de la tabla `inspectors`, NO de `employees`: los inspectores se
    //  registran por su cuenta y no tienen por qué estar dados de alta como
    //  empleados. Aqui no se consulta la tabla de empleados en absoluto.
    //
    //  El campo del formulario admite escribir un nombre que no esté en esta
    //  lista; en ese caso el alta la hace el servidor al guardar.
    app.get('/api/:type/inspectors', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { solo_activos } = req.query;
            const cond = solo_activos === '1' ? 'WHERE x.is_active' : '';
            const r = await pool.query(
                `SELECT x.id, x.name, x.is_active, x.created_at,
                        (SELECT count(*)::int FROM inspections i
                          WHERE i.inspector_id = x.id) AS inspecciones,
                        (SELECT max(i.inspection_date)::text FROM inspections i
                          WHERE i.inspector_id = x.id) AS ultima_inspeccion
                   FROM inspectors x
                   ${cond}
                  ORDER BY (x.is_active = false), lower(x.name)`);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  INSPECCIONES
    // =========================================================================

    // Listado con todo lo que pide el panel. La locación sale de la propia
    // inspección (columna location_id), no de sus hallazgos, para que una
    // inspección sin hallazgos también aparezca.
    app.get('/api/:type/inspections', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { date, location_id, status, inspection_type, inspector_id } = req.query;
            const params = [];
            const cond = [];

            if (date)           { params.push(date);           cond.push('i.inspection_date = $' + params.length); }
            if (location_id)    { params.push(String(location_id)); cond.push('i.location_id = $' + params.length); }
            if (status)         { params.push(status);         cond.push('i.status = $' + params.length); }
            if (inspection_type){ params.push(inspection_type);cond.push('i.inspection_type = $' + params.length); }
            if (inspector_id)   { params.push(Number(inspector_id)); cond.push('i.inspector_id = $' + params.length); }

            // Los filtros pueden ser rangos de fecha: date_from / date_to
            const { date_from, date_to } = req.query;
            if (date_from) { params.push(date_from); cond.push('i.inspection_date >= $' + params.length); }
            if (date_to)   { params.push(date_to);   cond.push('i.inspection_date <= $' + params.length); }

            const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
            const r = await pool.query(
                `SELECT i.*,
                        l.name AS location_name,
                        ${EXPR_INSPECTOR} AS inspector_display,
                        (i.inspector_name IS NOT NULL) AS inspector_tiene_foto,
                        -- Se repiten fecha y hora como texto por una razon concreta:
                        -- una columna DATE que llega suelta al driver vuelve como
                        -- fecha-hora en la zona horaria de quien la lee, y se
                        -- desplazaba un dia al pintarla. Con ::text sale "2026-10-19"
                        -- y no depende del huso. Se repite despues de i.* porque en
                        -- una fila con dos columnas del mismo nombre gana la ultima.
                        i.inspection_date::text AS inspection_date,
                        i.inspection_time::text AS inspection_time,
                        (SELECT count(*)::int FROM inspection_findings f
                          WHERE f.inspection_id = i.id AND f.deleted_at IS NULL) AS findings_count,
                        (SELECT count(*)::int FROM inspection_findings f
                          WHERE f.inspection_id = i.id AND f.deleted_at IS NULL
                            AND f.status NOT IN ('closed','audited','corrected')) AS findings_open
                   FROM inspections i
                   LEFT JOIN locations l ON l.id = i.location_id
                   ${JOIN_INSPECTOR}
                   ${where}
                  ORDER BY i.inspection_date DESC, i.created_at DESC`, params);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Una inspeccion con su detalle. Alimenta el boton "Visualizar".
    app.get('/api/:type/inspections/:id', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const id = Number(req.params.id);
            if (!(await existeInspeccion(pool, id))) {
                return res.status(404).json({ error: 'inspection_not_found' });
            }
            const insp = (await pool.query(
                `SELECT i.*, l.name AS location_name,
                        ${EXPR_INSPECTOR} AS inspector_display,
                        (i.inspector_name IS NOT NULL) AS inspector_tiene_foto,
                        i.inspection_date::text AS inspection_date,
                        i.inspection_time::text AS inspection_time
                   FROM inspections i
                   LEFT JOIN locations l ON l.id = i.location_id
                   ${JOIN_INSPECTOR}
                  WHERE i.id = $1`, [id])).rows[0];

            const findings = (await pool.query(
                `SELECT f.*,
                        emp.name AS assigned_name,
                        f.assigned_to_name AS assigned_text,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                                     WHEN f.assigned_to_name IS NOT NULL THEN f.assigned_to_name
                                     WHEN f.assigned_to IS NOT NULL
                                          THEN 'ID ' || f.assigned_to || ' (no está en la lista de empleados)'
                                     ELSE NULL END AS assigned_display,
                        l.name AS location_name
                   FROM inspection_findings f
                   LEFT JOIN employees emp ON emp.id = f.assigned_to
                   LEFT JOIN locations l ON l.id = f.location_id
                  WHERE f.inspection_id = $1 AND f.deleted_at IS NULL
                  ORDER BY f.created_at`, [id])).rows;

            const history = (await pool.query(
                'SELECT * FROM inspection_status_history WHERE inspection_id = $1 ORDER BY changed_at DESC',
                [id])).rows;

            res.json({ ...insp, findings, history });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Crear inspeccion.
    app.post('/api/:type/inspections', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const {
                inspection_date, inspection_time, inspector_id, inspector_name,
                inspection_type, location_id, general_notes, status, created_by
            } = req.body;

            if (textoVacio(inspection_date)) {
                return res.status(400).json({ error: 'inspection_date_required',
                    message: 'La fecha de inspección es obligatoria.' });
            }
            if (textoVacio(inspection_type) || !INSPECTION_TYPES.includes(String(inspection_type))) {
                return res.status(400).json({ error: 'invalid_inspection_type',
                    message: 'Tipo de inspección no válido.' });
            }
            // La locacion es obligatoria: sin ella la inspeccion no se puede
            // relacionar con nada y el panel de locaciones no la mostraria.
            if (textoVacio(location_id)) {
                return res.status(400).json({ error: 'location_required',
                    message: 'Elige la locación inspeccionada.' });
            }
            if (!(await existeLocacion(pool, location_id))) {
                return res.status(400).json({ error: 'location_not_found',
                    message: 'La locación indicada no existe.' });
            }
            if (!textoVacio(status) && !INSPECTION_STATUSES.includes(String(status))) {
                return res.status(400).json({ error: 'invalid_status' });
            }

            // El inspector se escribe en el formulario. No hace falta que este
            // registrado de antemano, ni que sea empleado, ni que se elija de
            // una lista: se resuelve aqui y, si es nuevo, la base le da un id.
            if (textoVacio(inspector_name) && textoVacio(inspector_id)) {
                return res.status(400).json({ error: 'inspector_name_required',
                    message: 'Escribe el nombre de quien hizo la inspección.' });
            }
            const insp = await resolverInspector(pool, inspector_id, inspector_name);

            // El numero se genera en la base con un reintento por si colisiona.
            let row = null;
            for (let intento = 0; intento < 5 && !row; intento++) {
                try {
                    row = (await pool.query(
                        `INSERT INTO inspections
                            (inspection_number, inspection_date, inspection_time, inspector_id,
                             inspector_name, inspection_type, location_id, general_notes, status, created_by)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
                        [nuevoNumeroInspeccion(), inspection_date,
                         textoVacio(inspection_time) ? null : inspection_time,
                         insp.id, insp.nombre,
                         String(inspection_type), String(location_id),
                         textoVacio(general_notes) ? null : String(general_notes).slice(0, 5000),
                         status || 'pending', enteroONulo(created_by)])).rows[0];
                } catch (e) {
                    // 23505 = violacion de clave unica: otro numero no vale.
                    if (e.code === '23505' && intento < 4) continue;
                    throw e;
                }
            }
            if (!row) {
                return res.status(500).json({ error: 'inspection_number_generation_failed' });
            }

            // Se devuelve tambien si el inspector se dio de alta ahora, para que
            // la interfaz pueda avisar sin tener que volver a preguntar.
            res.status(201).json({ ...row, inspector_registrado: !!insp.nuevo });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Modificar inspeccion.
    app.put('/api/:type/inspections/:id', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const id = Number(req.params.id);
            if (!(await existeInspeccion(pool, id))) {
                return res.status(404).json({ error: 'inspection_not_found' });
            }
            const b = req.body;
            const act = [];

            if (b.inspection_type !== undefined) {
                if (textoVacio(b.inspection_type) || !INSPECTION_TYPES.includes(String(b.inspection_type))) {
                    return res.status(400).json({ error: 'invalid_inspection_type' });
                }
                act.push(['inspection_type', String(b.inspection_type)]);
            }
            if (b.location_id !== undefined) {
                // No se puede dejar una inspeccion sin locacion: es lo que la
                // relaciona con el panel y con sus hallazgos.
                if (textoVacio(b.location_id)) {
                    return res.status(400).json({ error: 'location_required',
                        message: 'Una inspección no puede quedar sin locación.' });
                }
                if (!(await existeLocacion(pool, b.location_id))) {
                    return res.status(400).json({ error: 'location_not_found',
                        message: 'La locación indicada no existe.' });
                }
                act.push(['location_id', String(b.location_id)]);
            }
            if (b.inspection_date !== undefined) {
                if (textoVacio(b.inspection_date)) return res.status(400).json({ error: 'inspection_date_required' });
                act.push(['inspection_date', b.inspection_date]);
            }
            if (b.inspection_time !== undefined) act.push(['inspection_time', textoVacio(b.inspection_time) ? null : b.inspection_time]);
            if (b.general_notes !== undefined) act.push(['general_notes', textoVacio(b.general_notes) ? null : String(b.general_notes).slice(0, 5000)]);
            if (b.status !== undefined) {
                if (!INSPECTION_STATUSES.includes(String(b.status))) return res.status(400).json({ error: 'invalid_status' });
                act.push(['status', String(b.status)]);
            }
            // Igual que en el alta: el inspector se escribe, no se busca entre
            // empleados. Si viene un id, se comprueba que exista en el registro
            // de inspectores; si no existe, se ignora y manda el nombre.
            if (b.inspector_id !== undefined || b.inspector_name !== undefined) {
                if (textoVacio(b.inspector_name) && textoVacio(b.inspector_id)) {
                    return res.status(400).json({ error: 'inspector_name_required',
                        message: 'El inspector no puede quedar vacío: escribe su nombre.' });
                }
                const insp = await resolverInspector(pool, b.inspector_id, b.inspector_name);
                act.push(['inspector_id', insp.id], ['inspector_name', insp.nombre]);
            }

            if (!act.length) return res.status(400).json({ error: 'no_fields_to_update' });

            const sets = act.map(([c], i) => `${c} = $${i + 1}`).join(', ');
            const vals = act.map(([, v]) => v);
            vals.push(id);
            const r = await pool.query(
                `UPDATE inspections SET ${sets}, updated_at = NOW()
                  WHERE id = $${vals.length} RETURNING *`, vals);
            res.json(r.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Hallazgos de una inspeccion. GET /inspections/:id ya los devuelve junto
    // al resto del detalle; esta se conserva porque es la que consultaba el
    // frontend antes, y no cuesta nada tener las dos.
    app.get('/api/:type/inspections/:id/findings', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const id = Number(req.params.id);
            if (!(await existeInspeccion(pool, id))) {
                return res.status(404).json({ error: 'inspection_not_found' });
            }
            const r = await pool.query(
                `SELECT f.*, l.name AS location_name,
                        emp.name AS assigned_name,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                             WHEN f.assigned_to_name IS NOT NULL THEN f.assigned_to_name
                             WHEN f.assigned_to IS NOT NULL
                                  THEN 'ID ' || f.assigned_to || ' (no está en la lista de empleados)'
                             ELSE NULL END AS assigned_display
                   FROM inspection_findings f
                   LEFT JOIN locations l   ON l.id = f.location_id
                   LEFT JOIN employees emp ON emp.id = f.assigned_to
                  WHERE f.inspection_id = $1 AND f.deleted_at IS NULL
                  ORDER BY f.created_at`, [id]);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  HALLAZGOS
    // =========================================================================

    // Listado de hallazgos (los borrados logicamente quedan fuera).
    app.get('/api/:type/findings', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { status, priority, location_id, inspection_id, category, assigned_to } = req.query;
            const params = [];
            const cond = ['f.deleted_at IS NULL'];

            const an = (col, val) => { params.push(val); cond.push(col + ' = $' + params.length); };
            if (status) an('f.status', status);
            if (priority) an('f.priority', priority);
            if (location_id) an('f.location_id', String(location_id));
            if (inspection_id) an('f.inspection_id', Number(inspection_id));
            if (assigned_to) an('f.assigned_to', Number(assigned_to));
            if (category) { params.push(category); cond.push('lower(btrim(f.category)) = lower(btrim($' + params.length + '))'); }

            const r = await pool.query(
                `SELECT f.*, l.name AS location_name, i.inspection_number, i.inspection_date::text AS inspection_date,
                        emp.name AS assigned_name,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                             WHEN f.assigned_to_name IS NOT NULL THEN f.assigned_to_name
                             WHEN f.assigned_to IS NOT NULL
                                  THEN 'ID ' || f.assigned_to || ' (no está en la lista de empleados)'
                             ELSE NULL END AS assigned_display
                   FROM inspection_findings f
                   LEFT JOIN locations l ON l.id = f.location_id
                   LEFT JOIN inspections i ON i.id = f.inspection_id
                   LEFT JOIN employees emp ON emp.id = f.assigned_to
                  WHERE ${cond.join(' AND ')}
                  ORDER BY f.created_at DESC`, params);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Detalle de un hallazgo, con sus correcciones. Alimenta "Visualizar".
    app.get('/api/:type/findings/:findingId', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const id = Number(req.params.findingId);
            const f = (await pool.query(
                `SELECT f.*, l.name AS location_name, i.inspection_number,
                        i.inspection_date::text AS inspection_date, i.inspection_type,
                        emp.name AS assigned_name,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                             WHEN f.assigned_to_name IS NOT NULL THEN f.assigned_to_name
                             WHEN f.assigned_to IS NOT NULL
                                  THEN 'ID ' || f.assigned_to || ' (no está en la lista de empleados)'
                             ELSE NULL END AS assigned_display
                   FROM inspection_findings f
                   LEFT JOIN locations l ON l.id = f.location_id
                   LEFT JOIN inspections i ON i.id = f.inspection_id
                   LEFT JOIN employees emp ON emp.id = f.assigned_to
                  WHERE f.id = $1 AND f.deleted_at IS NULL`, [id])).rows[0];
            if (!f) return res.status(404).json({ error: 'finding_not_found' });

            const corrections = (await pool.query(
                `SELECT c.*, emp.name AS assigned_name,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                                     WHEN c.assigned_to_name IS NOT NULL THEN c.assigned_to_name
                                     WHEN c.assigned_to IS NOT NULL
                                          THEN 'ID ' || c.assigned_to || ' (no está en la lista de empleados)'
                                     ELSE NULL END AS assigned_display
                   FROM corrections c
                   LEFT JOIN employees emp ON emp.id = c.assigned_to
                  WHERE c.finding_id = $1 AND c.deleted_at IS NULL
                  ORDER BY COALESCE(c.correction_date, c.created_at::date), c.id`, [id])).rows;

            const history = (await pool.query(
                `SELECT * FROM inspection_status_history
                  WHERE finding_id = $1 ORDER BY changed_at DESC`, [id])).rows;

            res.json({ ...f, corrections, history });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Crear hallazgo dentro de una inspeccion.
    app.post('/api/:type/inspections/:id/findings', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const inspId = Number(req.params.id);
            if (!(await existeInspeccion(pool, inspId))) {
                return res.status(404).json({ error: 'inspection_not_found',
                    message: 'La inspección seleccionada no existe.' });
            }
            const b = req.body;
            if (textoVacio(b.title)) {
                return res.status(400).json({ error: 'title_required',
                    message: 'El hallazgo necesita un título.' });
            }

            // La locación del hallazgo es la de su inspección. Si viene otra, se
            // rechaza: es la incoherencia que mas caro sale (un hallazgo de Pixie
            // colgado de una inspección de otra locacion).
            const insp = (await pool.query('SELECT location_id FROM inspections WHERE id = $1', [inspId])).rows[0];
            let locationId = insp.location_id;
            if (!textoVacio(b.location_id) && b.location_id !== insp.location_id) {
                if (!(await existeLocacion(pool, b.location_id))) {
                    return res.status(400).json({ error: 'location_not_found' });
                }
                const conHallazgos = (await pool.query(
                    `SELECT 1 FROM inspection_findings
                      WHERE inspection_id = $1 AND location_id = $2 AND deleted_at IS NULL LIMIT 1`,
                    [inspId, String(b.location_id)])).rows.length;
                if (!conHallazgos && insp.location_id) {
                    return res.status(400).json({
                        error: 'finding_location_mismatch',
                        message: 'La inspección pertenece a otra locación. El hallazgo se guardaría en un sitio que no corresponde.'
                    });
                }
                locationId = String(b.location_id);
            }
            if (!locationId) locationId = textoVacio(b.location_id) ? null : String(b.location_id);
            if (!locationId) {
                return res.status(400).json({ error: 'inspection_has_no_location',
                    message: 'La inspección no tiene locación asignada: no se puede crear el hallazgo sin saber dónde es.' });
            }
            if (!(await existeLocacion(pool, locationId))) {
                return res.status(400).json({ error: 'location_not_found' });
            }

            if (!textoVacio(b.priority) && !FINDING_PRIORITIES.includes(String(b.priority))) {
                return res.status(400).json({ error: 'invalid_priority' });
            }
            if (!textoVacio(b.status) && !FINDING_STATUSES.includes(String(b.status))) {
                return res.status(400).json({ error: 'invalid_status' });
            }

            const categoria = await canonizarCategoria(pool, b.category);
            const resp = await resolverResponsable(pool, b.assigned_to, b.assigned_to_name);

            const r = await pool.query(
                `INSERT INTO inspection_findings
                    (inspection_id, location_id, title, description, category, priority, status,
                     inspector_notes, recommended_action, assigned_to, assigned_to_name,
                     due_date, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
                [inspId, locationId, String(b.title).trim().slice(0, 200),
                 textoVacio(b.description) ? null : String(b.description).slice(0, 5000),
                 categoria, b.priority || 'medium', b.status || 'warning',
                 textoVacio(b.inspector_notes) ? null : String(b.inspector_notes).slice(0, 5000),
                 textoVacio(b.recommended_action) ? null : String(b.recommended_action).slice(0, 2000),
                 resp.id, resp.nombre,
                 textoVacio(b.due_date) ? null : b.due_date,
                 enteroONulo(b.created_by)]);

            // Si la categoria era nueva, se registra para el combobox.
            if (categoria) await registrarCategoriaSiFalta(pool, categoria, insp.inspection_type || null);

            res.status(201).json(r.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Modificar hallazgo. Se guarda el estado anterior en el historial.
    app.put('/api/:type/findings/:findingId', async (req, res) => {
        const pool = getPool(req.params.type);
        const client = await pool.connect();
        try {
            const id = Number(req.params.findingId);
            const actual = (await client.query(
                'SELECT * FROM inspection_findings WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [id])).rows[0];
            if (!actual) return res.status(404).json({ error: 'finding_not_found' });

            const b = req.body;
            const act = [];
            const historial = [];

            if (b.title !== undefined) {
                if (textoVacio(b.title)) return res.status(400).json({ error: 'title_required' });
                act.push(['title', String(b.title).trim().slice(0, 200)]);
            }
            if (b.description !== undefined) act.push(['description', textoVacio(b.description) ? null : String(b.description).slice(0, 5000)]);
            if (b.priority !== undefined) {
                if (!FINDING_PRIORITIES.includes(String(b.priority))) return res.status(400).json({ error: 'invalid_priority' });
                act.push(['priority', String(b.priority)]);
            }
            if (b.status !== undefined) {
                if (!FINDING_STATUSES.includes(String(b.status))) return res.status(400).json({ error: 'invalid_status' });
                act.push(['status', String(b.status)]);
                if (actual.status !== String(b.status)) {
                    historial.push([actual.status, String(b.status)]);
                }
            }
            if (b.category !== undefined) {
                const c = await canonizarCategoria(pool, b.category);
                act.push(['category', c]);
                if (c) registrarCategoriaSiFalta(pool, c, null);
            }
            if (b.recommended_action !== undefined) act.push(['recommended_action', textoVacio(b.recommended_action) ? null : String(b.recommended_action).slice(0, 2000)]);
            if (b.due_date !== undefined) act.push(['due_date', textoVacio(b.due_date) ? null : b.due_date]);
            if (b.assigned_to !== undefined || b.assigned_to_name !== undefined) {
                const resp = await resolverResponsable(pool, b.assigned_to, b.assigned_to_name);
                act.push(['assigned_to', resp.id], ['assigned_to_name', resp.nombre]);
            }
            if (b.location_id !== undefined && !textoVacio(b.location_id)) {
                if (!(await existeLocacion(pool, b.location_id))) {
                    return res.status(400).json({ error: 'location_not_found' });
                }
                act.push(['location_id', String(b.location_id)]);
            }

            if (!act.length) return res.status(400).json({ error: 'no_fields_to_update' });

            await client.query('BEGIN');
            const sets = act.map(([c], i) => `${c} = $${i + 1}`).join(', ');
            const vals = act.map(([, v]) => v);
            vals.push(id);
            const upd = await client.query(
                `UPDATE inspection_findings SET ${sets}, updated_at = NOW()
                  WHERE id = $${vals.length} RETURNING *`, vals);

            // Trazabilidad: queda registrado quien y cuando cambio el estado.
            for (const [prev, nuevo] of historial) {
                await client.query(
                    `INSERT INTO inspection_status_history
                        (inspection_id, finding_id, previous_status, new_status, changed_by, comment)
                     VALUES ($1,$2,$3,$4,$5,$6)`,
                    [actual.inspection_id, id, prev, nuevo, enteroONulo(b.changed_by),
                     textoVacio(b.comment) ? null : String(b.comment).slice(0, 1000)]);
            }
            await client.query('COMMIT');
            res.json(upd.rows[0]);
        } catch (err) {
            try { await client.query('ROLLBACK'); } catch (e) {}
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    });

    // Borrado LOGICO de un hallazgo: sale de la vista pero no se pierde, ni sus
    // correcciones ni su historial. Queda constancia de quien lo retiro y cuando.
    app.delete('/api/:type/findings/:findingId', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const id = Number(req.params.findingId);
            const f = (await pool.query(
                'SELECT * FROM inspection_findings WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
            if (!f) return res.status(404).json({ error: 'finding_not_found' });

            const { deleted_by } = req.body || {};
            await pool.query(
                `UPDATE inspection_findings
                    SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
                  WHERE id = $1`, [id, enteroONulo(deleted_by)]);

            await pool.query(
                `INSERT INTO inspection_status_history
                    (inspection_id, finding_id, previous_status, new_status, changed_by, comment)
                 VALUES ($1,$2,$3,'deleted',$4,$5)`,
                [f.inspection_id, id, f.status, enteroONulo(deleted_by),
                 'Hallazgo retirado de la vista. El registro se conserva.']);

            res.json({
                ok: true, deleted_at: new Date().toISOString(),
                message: 'Hallazgo retirado de la vista. Sus correcciones y su historial se conservan.'
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  CORRECCIONES
    // =========================================================================

    // Listado de correcciones.
    app.get('/api/:type/corrections', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { finding_id, status } = req.query;
            const params = [];
            const cond = ['c.deleted_at IS NULL'];
            if (finding_id) { params.push(Number(finding_id)); cond.push('c.finding_id = $' + params.length); }
            if (status) { params.push(status); cond.push('c.status = $' + params.length); }
            const r = await pool.query(
                `SELECT c.*, f.title AS finding_title, f.inspection_id, f.location_id,
                        l.name AS location_name, i.inspection_number,
                        emp.name AS assigned_name,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                                     WHEN c.assigned_to_name IS NOT NULL THEN c.assigned_to_name
                                     WHEN c.assigned_to IS NOT NULL
                                          THEN 'ID ' || c.assigned_to || ' (no está en la lista de empleados)'
                                     ELSE NULL END AS assigned_display
                   FROM corrections c
                   LEFT JOIN inspection_findings f ON f.id = c.finding_id
                   LEFT JOIN locations l ON l.id = f.location_id
                   LEFT JOIN inspections i ON i.id = f.inspection_id
                   LEFT JOIN employees emp ON emp.id = c.assigned_to
                  WHERE ${cond.join(' AND ')}
                  ORDER BY COALESCE(c.correction_date, c.created_at::date) DESC, c.id DESC`, params);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Crear correccion sobre un hallazgo. No duplica el hallazgo: solo guarda
    // la accion correctiva y se apoya en finding_id.
    app.post('/api/:type/findings/:findingId/corrections', async (req, res) => {
        const pool = getPool(req.params.type);
        const client = await pool.connect();
        try {
            const findingId = Number(req.params.findingId);
            if (!(await existeHallazgo(pool, findingId))) {
                return res.status(404).json({ error: 'finding_not_found',
                    message: 'El hallazgo indicado no existe (o ya fue retirado).' });
            }
            const b = req.body;
            if (textoVacio(b.description)) {
                return res.status(400).json({ error: 'description_required',
                    message: 'Describe la acción correctiva.' });
            }
            if (!textoVacio(b.status) && !CORRECTION_STATUSES.includes(String(b.status))) {
                return res.status(400).json({ error: 'invalid_status' });
            }
            const resp = await resolverResponsable(pool, b.assigned_to, b.assigned_to_name);

            await client.query('BEGIN');
            const r = await client.query(
                `INSERT INTO corrections
                    (finding_id, description, assigned_to, assigned_to_name, status,
                     correction_date, completed_by, completion_notes,
                     supervised_by, supervised_at, audit_by, audited_at, audit_notes)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
                [findingId, String(b.description).trim().slice(0, 5000),
                 resp.id, resp.nombre, b.status || 'pending',
                 textoVacio(b.correction_date) ? null : b.correction_date,
                 enteroONulo(b.completed_by),
                 textoVacio(b.completion_notes) ? null : String(b.completion_notes).slice(0, 5000),
                 enteroONulo(b.supervised_by), b.supervised_at || null,
                 enteroONulo(b.audit_by), b.audited_at || null,
                 textoVacio(b.audit_notes) ? null : String(b.audit_notes).slice(0, 2000)]);

            // Contador e historial de correcciones del hallazgo.
            await client.query(
                `UPDATE inspection_findings
                    SET corrections = (SELECT count(*)::int FROM corrections
                                        WHERE finding_id = $1 AND deleted_at IS NULL),
                        correction_history_ids = (
                            SELECT COALESCE(array_agg(id ORDER BY COALESCE(correction_date, created_at::date), id), '{}')
                              FROM corrections WHERE finding_id = $1),
                        updated_at = NOW()
                  WHERE id = $1`, [findingId]);

            await client.query(
                `INSERT INTO inspection_status_history
                    (inspection_id, finding_id, correction_id, previous_status, new_status, changed_by, comment)
                 SELECT inspection_id, $1, $2, NULL, $3, $4, $5 FROM inspection_findings WHERE id = $1`,
                [findingId, r.rows[0].id, r.rows[0].status, enteroONulo(b.created_by),
                 'Corrección registrada.']);
            await client.query('COMMIT');

            res.status(201).json(r.rows[0]);
        } catch (err) {
            try { await client.query('ROLLBACK'); } catch (e) {}
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    });

    // Modificar correccion.
    app.put('/api/:type/corrections/:id', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const id = Number(req.params.id);
            const act = (await pool.query(
                'SELECT * FROM corrections WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
            if (!act) return res.status(404).json({ error: 'correction_not_found' });

            const b = req.body;
            const sets = [];
            const params = [];
            const add = (col, val) => { params.push(val); sets.push(col + ' = $' + params.length); };

            if (b.description !== undefined) {
                if (textoVacio(b.description)) return res.status(400).json({ error: 'description_required' });
                add('description', String(b.description).trim().slice(0, 5000));
            }
            if (b.status !== undefined) {
                if (!CORRECTION_STATUSES.includes(String(b.status))) return res.status(400).json({ error: 'invalid_status' });
                add('status', String(b.status));
            }
            if (b.correction_date !== undefined) add('correction_date', textoVacio(b.correction_date) ? null : b.correction_date);
            if (b.completion_notes !== undefined) add('completion_notes', textoVacio(b.completion_notes) ? null : String(b.completion_notes).slice(0, 5000));
            if (b.audit_notes !== undefined) add('audit_notes', textoVacio(b.audit_notes) ? null : String(b.audit_notes).slice(0, 2000));
            if (b.assigned_to !== undefined || b.assigned_to_name !== undefined) {
                const resp = await resolverResponsable(pool, b.assigned_to, b.assigned_to_name);
                add('assigned_to', resp.id); add('assigned_to_name', resp.nombre);
            }
            if (b.completed_by !== undefined) add('completed_by', enteroONulo(b.completed_by));
            if (b.supervised_by !== undefined) add('supervised_by', enteroONulo(b.supervised_by));
            if (b.audit_by !== undefined) add('audit_by', enteroONulo(b.audit_by));

            if (!sets.length) return res.status(400).json({ error: 'no_fields_to_update' });

            params.push(id);
            const r = await pool.query(
                `UPDATE corrections SET ${sets.join(', ')}, updated_at = NOW()
                  WHERE id = $${params.length} RETURNING *`, params);

            if (b.status !== undefined && act.status !== String(b.status)) {
                await pool.query(
                    `INSERT INTO inspection_status_history
                        (inspection_id, finding_id, correction_id, previous_status, new_status, changed_by, comment)
                    SELECT f.inspection_id, f.id, $1, $2, $3, $4, $5
                      FROM inspection_findings f WHERE f.id = $6`,
                    [id, act.status, String(b.status), enteroONulo(b.changed_by),
                     textoVacio(b.comment) ? null : String(b.comment).slice(0, 1000), act.finding_id]);
            }
            res.json(r.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Borrado LOGICO de una correccion.
    app.delete('/api/:type/corrections/:id', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const id = Number(req.params.id);
            const c = (await pool.query(
                'SELECT * FROM corrections WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
            if (!c) return res.status(404).json({ error: 'correction_not_found' });

            const { deleted_by } = req.body || {};
            await pool.query(
                `UPDATE corrections SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
                  WHERE id = $1`, [id, enteroONulo(deleted_by)]);

            // Se actualiza el contador del hallazgo: sigue siendo coherente.
            await pool.query(
                `UPDATE inspection_findings
                    SET corrections = (SELECT count(*)::int FROM corrections
                                        WHERE finding_id = $1 AND deleted_at IS NULL)
                  WHERE id = $1`, [c.finding_id]);

            await pool.query(
                `INSERT INTO inspection_status_history
                    (inspection_id, finding_id, correction_id, previous_status, new_status, changed_by, comment)
                SELECT f.inspection_id, f.id, $1, $2, 'deleted', $3, $4
                  FROM inspection_findings f WHERE f.id = $5`,
                [id, c.status, enteroONulo(deleted_by),
                 'Corrección retirada de la vista. El registro se conserva.', c.finding_id]);

            res.json({ ok: true, message: 'Corrección retirada de la vista. El registro se conserva.' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  EXPORTAR EL HISTORIAL A PDF
    // =========================================================================
    //  Devuelve el archivo. Acepta los mismos filtros que el listado, de modo
    //  que "Exportar" exporta lo que se esta viendo. Sin filtros, sale todo.
    app.get('/api/:type/inspections-audit.pdf', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const { date_from, date_to, location_id, inspector_id, status, inspection_type } = req.query;
            const params = [];
            const cond = [];

            if (date_from)      { params.push(date_from);             cond.push('i.inspection_date >= $' + params.length); }
            if (date_to)        { params.push(date_to);               cond.push('i.inspection_date <= $' + params.length); }
            if (location_id)    { params.push(String(location_id));    cond.push('i.location_id = $' + params.length); }
            if (inspector_id)   { params.push(Number(inspector_id));   cond.push('i.inspector_id = $' + params.length); }
            if (status)         { params.push(status);                cond.push('i.status = $' + params.length); }
            if (inspection_type){ params.push(inspection_type);       cond.push('i.inspection_type = $' + params.length); }

            const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
            const inspRows = (await pool.query(
                `SELECT i.*, l.name AS location_name,
                        ${EXPR_INSPECTOR} AS inspector_display,
                        (i.inspector_name IS NOT NULL) AS inspector_tiene_foto,
                        (insp.id IS NOT NULL) AS inspector_registrado
                   FROM inspections i
                   LEFT JOIN locations l ON l.id = i.location_id
                   ${JOIN_INSPECTOR}
                   ${where}
                  ORDER BY i.inspection_date DESC, i.created_at DESC`, params)).rows;

            let totalHallazgos = 0, totalCorrecciones = 0;
            for (const insp of inspRows) {
                insp.findings = (await pool.query(
                    `SELECT f.*,
                        CASE WHEN emp.name IS NOT NULL THEN emp.name
                             WHEN f.assigned_to_name IS NOT NULL THEN f.assigned_to_name
                             WHEN f.assigned_to IS NOT NULL
                                  THEN 'ID ' || f.assigned_to || ' (no está en la lista de empleados)'
                             ELSE NULL END AS assigned_display
                       FROM inspection_findings f
                       LEFT JOIN employees emp ON emp.id = f.assigned_to
                      WHERE f.inspection_id = $1 AND f.deleted_at IS NULL
                      ORDER BY f.created_at`, [insp.id])).rows;

                insp.history = (await pool.query(
                    `SELECT * FROM inspection_status_history
                      WHERE inspection_id = $1 ORDER BY changed_at DESC`, [insp.id])).rows;

                for (const h of insp.findings) {
                    h.corrections = (await pool.query(
                        `SELECT c.*, CASE WHEN emp.name IS NOT NULL THEN emp.name
                                     WHEN c.assigned_to_name IS NOT NULL THEN c.assigned_to_name
                                     WHEN c.assigned_to IS NOT NULL
                                          THEN 'ID ' || c.assigned_to || ' (no está en la lista de empleados)'
                                     ELSE NULL END AS assigned_display
                           FROM corrections c
                           LEFT JOIN employees emp ON emp.id = c.assigned_to
                          WHERE c.finding_id = $1 AND c.deleted_at IS NULL
                          ORDER BY COALESCE(c.correction_date, c.created_at::date), c.id`, [h.id])).rows;
                    totalCorrecciones += h.corrections.length;
                }
                totalHallazgos += insp.findings.length;
            }

            const filtros = { date_from, date_to, location_id, inspector_id, status, inspection_type };

            const doc = generarPDF({
                inspecciones: inspRows,
                filtros,
                generadoPor: valor(req.query.por) || null,
                resumen: { inspecciones: inspRows.length, hallazgos: totalHallazgos, correcciones: totalCorrecciones }
            });

            const nombre = 'inspecciones-auditoria-' + new Date().toISOString().slice(0, 10) + '.pdf';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="' + nombre + '"');
            doc.pipe(res);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================

    // =========================================================================
    //  PERSONAS QUE PUEDEN ATENDER UN PROBLEMA
    // =========================================================================
    //  Alimenta el combobox de "Asignado a". Primero los que pueden atender
    //  (supervisor / OP / manager), despues el resto.
    app.get('/api/:type/inspection-assignees', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const r = await pool.query(
                `SELECT e.id, e.name, e.role,
                        (e.role = ANY($1::text[])) AS puede_atender,
                        (SELECT count(*)::int FROM inspection_findings f
                          WHERE f.assigned_to = e.id AND f.deleted_at IS NULL
                            AND f.status NOT IN ('closed','audited','corrected')) AS pendientes
                   FROM employees e
                  ORDER BY (e.role = ANY($1::text[])) DESC,
                           pendientes DESC NULLS LAST,
                           e.name`, [INSPECTION_ASSIGNER_ROLES]);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  INSPECCIONES POR LOCACION  (el panel de locaciones)
    // =========================================================================
    //  Una fila por location, con la inspeccion MAS RECIENTE. Sale de
    //  inspections.location_id y no de los hallazgos, para que tambien aparezca
    //  la inspeccion que todavia no tiene ninguno.
    app.get('/api/:type/inspections-by-location', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const r = await pool.query(
                `SELECT l.id AS location_id, l.name AS location_name, l.type, l.category,
                        i.id AS inspection_id, i.inspection_number,
                        i.inspection_date::text AS inspection_date,
                        i.inspection_time::text AS inspection_time,
                        i.inspection_type, i.status,
                        i.inspector_id, i.inspector_name,
                        CASE
                            WHEN i.inspector_name IS NOT NULL AND btrim(i.inspector_name) <> ''
                                THEN i.inspector_name
                            WHEN insp.id IS NOT NULL
                                THEN insp.name
                            WHEN i.inspector_id IS NOT NULL
                                THEN 'ID ' || i.inspector_id || ' — registro anterior, sin nombre guardado'
                            ELSE NULL
                        END AS inspector_display,
                        (SELECT count(*)::int FROM inspections x WHERE x.location_id = l.id) AS inspecciones_total,
                        (SELECT count(*)::int FROM inspection_findings f
                          WHERE f.location_id = l.id AND f.deleted_at IS NULL) AS hallazgos_total,
                        (SELECT count(*)::int FROM inspection_findings f
                          WHERE f.location_id = l.id AND f.deleted_at IS NULL
                            AND f.status NOT IN ('closed','audited','corrected')) AS hallazgos_abiertos
                   FROM locations l
                   LEFT JOIN LATERAL (
                        SELECT * FROM inspections x
                         WHERE x.location_id = l.id
                         ORDER BY x.inspection_date DESC, x.created_at DESC
                         LIMIT 1) i ON true
                   LEFT JOIN inspectors insp ON insp.id = i.inspector_id
                  WHERE ${retiradas.activaDe('l')}
                  ORDER BY l.name`);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

module.exports = { montarRutasInspecciones, INSPECTION_ASSIGNER_ROLES, INSPECTION_TYPES };
