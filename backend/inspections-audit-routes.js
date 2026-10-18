// ============================================================================
//  ENDPOINTS DEL HISTORIAL DE AUDITORIA Y LA EVIDENCIA
// ============================================================================
//  Estos cuatro endpoints estaban dentro del bloque de inspecciones que se
//  movio de server.js a inspections-routes.js, y no se habían vuelto a
//  declarar. Sin ellos, el panel de auditoría salia siempre vacío y el
//  "cambio rápido de estado" de un hallazgo se guardaba sin dejar rastro.
//
//  Se montan aparte para que quede claro que son un bloque propio y no una
//  reinvencion: hacen lo mismo que antes, con dos mejoras:
//    - el historial se devuelve con los nombres resueltos (quien cambio, que
//      inspeccion, que hallazgo, que locacion), para no tener que buscar en
//      tres tablas al pintarlo
//    - la inspeccion se deduce del hallazgo o de la correccion, en vez de
//      fiarse del id que mande el cliente
// ============================================================================

function montarRutasAuditoria(app, getPool) {

    const textoVacio = (v) => v === undefined || v === null || String(v).trim() === '';
    const enteroONulo = (v) => (textoVacio(v) ? null : (Number.isInteger(Number(v)) ? Number(v) : NaN));

    // =========================================================================
    //  HISTORIAL DE AUDITORIA
    // =========================================================================
    app.get('/api/:type/status-history', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { inspection_id, finding_id, correction_id } = req.query;
            const cond = [];
            const params = [];
            if (inspection_id) { params.push(Number(inspection_id)); cond.push('sh.inspection_id = $' + params.length); }
            if (finding_id)     { params.push(Number(finding_id));     cond.push('sh.finding_id = $' + params.length); }
            if (correction_id)  { params.push(Number(correction_id));  cond.push('sh.correction_id = $' + params.length); }
            const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

            const r = await pool.query(
                `SELECT sh.*,
                        e.name AS changed_by_name,
                        i.inspection_number,
                        f.title AS finding_title,
                        l.name AS location_name
                   FROM inspection_status_history sh
                   LEFT JOIN employees e ON e.id = sh.changed_by
                   LEFT JOIN inspections i ON i.id = sh.inspection_id
                   LEFT JOIN inspection_findings f ON f.id = sh.finding_id
                   LEFT JOIN locations l ON l.id = COALESCE(f.location_id, i.location_id)
                   ${where}
                  ORDER BY sh.changed_at DESC, sh.id DESC`, params);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/:type/status-history', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const {
                inspection_id, finding_id, correction_id,
                previous_status, new_status, changed_by, comment
            } = req.body || {};

            if (textoVacio(new_status)) {
                return res.status(400).json({ error: 'new_status_required',
                    message: 'Indica el estado nuevo.' });
            }

            // Si viene un hallazgo o una correccion, la inspeccion se deduce de
            // ahi: es la relacion que importa para el historial, y no tiene
            // sentido que el cliente pueda decir una distinta.
            let inspId = enteroONulo(inspection_id);
            const hallId = enteroONulo(finding_id);
            const corrId = enteroONulo(correction_id);

            if (hallId) {
                const f = (await pool.query(
                    'SELECT inspection_id FROM inspection_findings WHERE id = $1', [hallId])).rows[0];
                if (f) inspId = f.inspection_id;
            } else if (corrId) {
                const c = (await pool.query(
                    `SELECT f.inspection_id FROM corrections c
                       JOIN inspection_findings f ON f.id = c.finding_id
                      WHERE c.id = $1`, [corrId])).rows[0];
                if (c) inspId = c.inspection_id;
            }

            const r = await pool.query(
                `INSERT INTO inspection_status_history
                    (inspection_id, finding_id, correction_id, previous_status, new_status, changed_by, comment)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
                [inspId, hallId, corrId,
                 textoVacio(previous_status) ? null : String(previous_status),
                 String(new_status), enteroONulo(changed_by),
                 textoVacio(comment) ? null : String(comment).slice(0, 1000)]);
            res.status(201).json(r.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // =========================================================================
    //  EVIDENCIA (archivos adjuntos)
    // =========================================================================
    app.get('/api/:type/evidence', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { inspection_id, finding_id, correction_id } = req.query;
            const cond = [];
            const params = [];
            if (inspection_id) { params.push(Number(inspection_id)); cond.push('inspection_id = $' + params.length); }
            if (finding_id)     { params.push(Number(finding_id));     cond.push('finding_id = $' + params.length); }
            if (correction_id)  { params.push(Number(correction_id));  cond.push('correction_id = $' + params.length); }
            const r = await pool.query(
                'SELECT * FROM inspection_evidence '
                + (cond.length ? 'WHERE ' + cond.join(' AND ') : '')
                + ' ORDER BY uploaded_at DESC', params);
            res.json(r.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/:type/evidence', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const { inspection_id, finding_id, correction_id, file_name,
                    file_type, file_url, file_size, uploaded_by, description } = req.body || {};
            if (textoVacio(file_name) || textoVacio(file_url)) {
                return res.status(400).json({ error: 'file_name_and_url_required',
                    message: 'La evidencia necesita un nombre y una ruta de archivo.' });
            }
            const r = await pool.query(
                `INSERT INTO inspection_evidence
                    (inspection_id, finding_id, correction_id, file_name, file_type,
                     file_url, file_size, uploaded_by, description)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
                [enteroONulo(inspection_id), enteroONulo(finding_id), enteroONulo(correction_id),
                 String(file_name).slice(0, 255),
                 textoVacio(file_type) ? null : String(file_type).slice(0, 120),
                 String(file_url).slice(0, 1000),
                 enteroONulo(file_size), enteroONulo(uploaded_by),
                 textoVacio(description) ? null : String(description).slice(0, 1000)]);
            res.status(201).json(r.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

module.exports = { montarRutasAuditoria };
