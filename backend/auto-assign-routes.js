// ============================================================================
//  ASIGNACION AUTOMATICA: ENDPOINTS
// ============================================================================
//  POST /api/:type/auto-assign/preview   -> propuesta. NO escribe nada.
//  POST /api/:type/auto-assign/apply     -> guarda la propuesta, revalidando.
//
//  Son dos pasos a proposito. La propuesta se puede revisar, discutir y
//  modificar antes de que exista en la base; y al guardar se vuelve a
//  comprobar todo, porque entre la propuesta y el guardado puede haber
//  cambiado el horario. Sin esa segunda comprobacion, dos personas que abriran
//  la pantalla a la vez se quedaron con el mismo turno.
//
//  LO QUE NO HACE
//  --------------
//  No toca ni una fila de lo que ya esta asignado. Los Compromisos son
//  intocables: el algoritmo trabaja alrededor de ellos, nunca por encima.
// ============================================================================

const { planificar, intervalo, papelesDe, FORMACIONES_POR_PAPEL } = require('./auto-assign.js');

// ---------------------------------------------------------------------------
//  Dias de la semana
// ---------------------------------------------------------------------------
// La columna days_off guarda nombres de dia en ingles ("sunday"). Se calcula el
// nombre en ingles del dia que se esta planificando para poder comparar.
const DIAS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function diaSemanaDe(fechaISO) {
    // A mediodia en UTC para que el cambio de dia no mueva el nombre del dia.
    const d = new Date(String(fechaISO) + 'T12:00:00Z');
    return DIAS[d.getUTCDay()];
}

function diaAnterior(fechaISO) {
    const d = new Date(String(fechaISO) + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
//  Validacion de fecha
// ---------------------------------------------------------------------------
// La forma no basta: "2026-13-45" tiene la forma correcta pero no es una fecha,
// y si se deja pasar llega a Date, que devuelve un objeto invalido, y de ahi
// sale un error de servidor en lugar de un mensaje util.
//
// Se comprueba que la fecha exista de verdad en el calendario. Se hace en UTC y
// al mediodia, para que el cambio de dia no mueva nada.
function fechaValida(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [y, m, d] = iso.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const fecha = new Date(Date.UTC(y, m - 1, d, 12));
    return fecha.getUTCFullYear() === y
        && fecha.getUTCMonth() === m - 1
        && fecha.getUTCDate() === d;
}

const ERROR_FECHA = { status: 400, json: () => ({ error: 'fecha_invalida' }) };

// ---------------------------------------------------------------------------
//  Ventana horaria por localizacion
// ---------------------------------------------------------------------------
// No hay horarios de apertura ni de cierre guardados en ninguna tabla. En vez de
// inventarlos, se deduce la ventana de cada localizacion de los turnos que de
// verdad se le han hecho: se coge la hora de inicio y la de fin mas frecuentes.
//
// Se avisa de que es una deduccion y no un dato configurado, porque quien
// configure de verdad los horarios deberia poder mandarlos sobre esto.
function deducirVentanas(turnos) {
    const porLocal = new Map();

    for (const t of turnos) {
        if (!t.location_id) continue;
        if (!porLocal.has(t.location_id)) porLocal.set(t.location_id, { inicios: new Map(), fines: new Map() });
        const v = porLocal.get(t.location_id);

        const ini = String(t.start_time).slice(0, 5);
        const fin = String(t.end_time).slice(0, 5);
        v.inicios.set(ini, (v.inicios.get(ini) || 0) + 1);
        v.fines.set(fin, (v.fines.get(fin) || 0) + 1);
    }

    const masFrecuente = (mapa) => {
        let mejor = null, n = -1;
        for (const [valor, veces] of mapa) {
            // A igualdad de veces se queda con la hora mas tardia: para cubrir
            // un turno hace falta empezar tarde, no pronto.
            if (veces > n || (veces === n && valor > mejor)) { mejor = valor; n = veces; }
        }
        return mejor;
    };

    const ventanas = {};
    for (const [loc, v] of porLocal) {
        ventanas[loc] = { inicio: masFrecuente(v.inicios), fin: masFrecuente(v.fines) };
    }

    // Respaldo global: si una localizacion no tiene turnos, se usa la ventana
    // mas usada de todo el parque. Es mejor que no proponer nada, siempre que
    // se avise de que se ha resortedo.
    const globalInicio = masFrecuente([...porLocal.values()].reduce((m, v) => {
        for (const [k, c] of v.inicios) m.set(k, (m.get(k) || 0) + c);
        return m;
    }, new Map()));
    const globalFin = masFrecuente([...porLocal.values()].reduce((m, v) => {
        for (const [k, c] of v.fines) m.set(k, (m.get(k) || 0) + c);
        return m;
    }, new Map()));

    const resorting = [];
    for (const loc of Object.keys(ventanas)) {
        if (ventanas[loc].inicio && ventanas[loc].fin) continue;
        ventanas[loc] = { inicio: globalInicio, fin: globalFin };
        resorting.push(loc);
    }

    return { ventanas, resorting, global: { inicio: globalInicio, fin: globalFin } };
}

// ---------------------------------------------------------------------------
//  Carga del estado del dia
// ---------------------------------------------------------------------------
// Una pasada de pocas consultas. Todo lo que el algoritmo necesita cabe en
// memoria para un dia, y se carga de golpe: ir pregunta por pregunta haria
// decenas de viajes por persona.
async function cargarEstado(pool, fecha, opcionales = {}) {
    const ayer = diaAnterior(fecha);

    // --- Reglas de personal: el minimo de cada localizacion ---------------
    const reglas = (await pool.query(
        `SELECT location_id, min_employees, requirements, is_active
           FROM staffing_rules WHERE is_active = true ORDER BY location_id`)).rows
        .map(r => ({
            location_id: r.location_id,
            min_employees: r.min_employees || 0,
            requirements: Array.isArray(r.requirements) ? r.requirements : [],
            cerrada: false
        }));

    const locations = (await pool.query(
        `SELECT id, name, serves_alcohol FROM locations ORDER BY id`)).rows;

    // --- Personas, con todo lo que decide si pueden trabajar ---------------
    // Una sola consulta con losTraining y la disponibilidad agrupados. El
    // array_agg evita una consulta por persona.
    const empleados = (await pool.query(
        `SELECT e.id, e.name, e.role, e.group_id,
                ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                ea.schedule_start_time, ea.schedule_end_time, ea.days_off,
                array_remove(array_agg(DISTINCT et.training_name), NULL) AS formaciones,
                array_remove(array_agg(DISTINCT eg.group_id), NULL) AS grupos_extra,
                array_remove(array_agg(DISTINCT elt.location_id), NULL) AS entrenadas
           FROM employees e
           LEFT JOIN employee_trainings et        ON et.employee_id = e.id
           LEFT JOIN employee_availability ea     ON ea.employee_id = e.id
           LEFT JOIN employee_groups eg           ON eg.employee_id = e.id
           LEFT JOIN employee_location_training elt ON elt.employee_id = e.id
          GROUP BY e.id, ea.id`)).rows.map(e => {
        const roles = e.role ? [e.role] : [];
        const formaciones = e.formaciones || [];
        // Los grupos: el principal de la ficha mas los adicionales. Sin
        // estos dos juntos, un empleado con grupo B en la ficha y D en la tabla
        // se contaria solo una vez.
        const grupos = [...new Set([e.group_id, ...(e.grupos_extra || [])].filter(Boolean))];
        return {
            id: e.id,
            name: e.name,
            roles,
            formaciones,
            grupos,
            localizacionesEntrenadas: e.entrenadas || [],
            papeles: [...papelesDe({ roles, formaciones })],
            disponibilidad: {
                is_on_break: !!e.is_on_break,
                is_on_training: !!e.is_on_training,
                is_day_off: !!e.is_day_off,
                is_holiday: !!e.is_holiday,
                schedule_start_time: e.schedule_start_time,
                schedule_end_time: e.schedule_end_time,
                days_off: e.days_off || []
            }
        };
    });

    // --- Zona del parque (PREFERENCIA, no restriccion) ----------------------
    const zonaDe = {};
    for (const z of (await pool.query('SELECT location_id, group_id FROM location_groups')).rows) {
        zonaDe[z.location_id] = z.group_id;
    }

    // --- Localizaciones cerradas ese dia -----------------------------------
    const cerradas = new Set((await pool.query(
        `SELECT DISTINCT location_id FROM location_disables
          WHERE disable_date <= $1::date
            AND (enabled_at IS NULL OR enabled_at::date > $1::date)
            AND (reactivation_date IS NULL OR reactivation_date::date > $1::date)`,
        [fecha])).rows.map(r => r.location_id));
    for (const r of reglas) if (cerradas.has(r.location_id)) r.cerrada = true;

    // --- COMPROMISOS: todo lo ya confirmado de ese dia ---------------------
    // Se trae tambien el dia anterior porque un turno de noche de ayer sigue
    // ocupando parte de la madrugada de hoy.
    const filasCompromiso = (await pool.query(
        `SELECT a.id, a.employee_id, a.location_id, a.category, a.role,
                a.assignment_type, a.start_time, a.end_time, a.work_date::text AS work_date,
                sc.name_es AS seccion_nombre
           FROM assignments a
           LEFT JOIN schedule_categories sc ON sc.key = a.category
          WHERE a.work_date IN ($1::date, $2::date)`,
        [fecha, ayer])).rows;

    // Los de ayer solo cuentan si se prolongan hasta hoy, es decir, si cruzan
    // la medianoche. Un turno de ayer que acaba a las 18:00 no estorba hoy.
    const compromisos = [];
    for (const f of filasCompromiso) {
        const iv = intervalo(f.start_time, f.end_time);
        if (!iv) continue;

        if (f.work_date === ayer) {
            // Del dia anterior solo interesa la parte que cae hoy.
            if (iv.fin <= 1440) continue;
            compromisos.push(compromisoDe(f, iv, 1440));
            continue;
        }
        compromisos.push(compromisoDe(f, iv, 0));
    }

    // --- Ventanas deducidas de los turnos reales ---------------------------
    const historico = (await pool.query(
        `SELECT location_id, start_time, end_time FROM assignments
          WHERE location_id IS NOT NULL`)).rows;
    const { ventanas, resorting, global } = deducirVentanas(historico);

    return {
        fecha,
        diaSemana: diaSemanaDe(fecha),
        reglas,
        locations,
        empleados,
        compromisos,
        zonaDe,
        ventanas,
        cerradas: [...cerradas],
        _ventanasResorting: resorting,
        _ventanaGlobal: global,
        _opcionales: opcionales
    };
}

function compromisoDe(f, iv, recorte) {
    // Un compromiso de ayer que sigue vivo hoy empieza, para estos efectos, a
    // las 00:00 de hoy.
    const inicio = recorte ? 0 : iv.inicio;
    const fin = recorte ? iv.fin - recorte : iv.fin;
    return {
        id: f.id,
        employee_id: f.employee_id,
        location_id: f.location_id,
        category: f.category,
        role: f.role,
        assignment_type: f.assignment_type,
        work_date: f.work_date,
        intervalo: { inicio, fin, cruzaMedianoche: iv.cruzaMedianoche },
        etiqueta: f.location_id
            || f.seccion_nombre
            || f.category
            || (f.assignment_type === 'NOSTALGIA_NIGHT' ? 'Nostalgia Night' : 'turno')
    };
}

// ---------------------------------------------------------------------------
//  Avisos sobre los datos
// ---------------------------------------------------------------------------
// Lo que el algoritmo NO sabe y quien lo usa tiene que saberlo. Se devuelve
// junto a la propuesta y se enseña en la pantalla antes de confirmar.
function avisosSobre(estado, propuesta) {
    const avisos = [];

    if (propuesta.sinVentana.length) {
        avisos.push({
            tipo: 'sin_ventana',
            texto: 'No hay ningun turno previo del que deducir el horario de: '
                + propuesta.sinVentana.join(', ') + '. No se propone nada para esas localizaciones.',
            porque: 'No hay horarios de apertura ni de cierre configurados en el sistema. '
                + 'La ventana se deduce de los turnos reales de cada localizacion.'
        });
    }
    if (estado._ventanasResorting.length) {
        avisos.push({
            tipo: 'ventana_genérica',
            texto: 'Se ha usado la ventana general del parque ('
                + estado._ventanaGlobal.inicio + '-' + estado._ventanaGlobal.fin
                + ') para: ' + estado._ventanasResorting.join(', ') + '.',
            porque: 'Esas localizaciones no tienen turnos suficientes para deducir su propia ventana.'
        });
    }

    const sinZona = estado.reglas.filter(r => !estado.zonaDe[r.location_id]).map(r => r.location_id);
    if (sinZona.length) {
        avisos.push({
            tipo: 'sin_zona',
            texto: 'Estas localizaciones no tienen zona asignada: ' + sinZona.join(', ') + '.',
            porque: 'Sin zona no se puede preferir a nadie en concreto. No bloquea a nadie.'
        });
    }

    const sinRegla = estado.locations
        .map(l => l.id)
        .filter(id => !estado.reglas.some(r => r.location_id === id));
    if (sinRegla.length) {
        avisos.push({
            tipo: 'sin_regla',
            texto: 'Localizaciones sin regla de personal: ' + sinRegla.join(', ') + '.',
            porque: 'No se les pide a nadie porque no hay minimo configurado para ellas. '
                + 'Si deberian tener personal, hay que crear su regla.'
        });
    }

    const sinDisponibilidad = estado.empleados.filter(e =>
        !e.disponibilidad.schedule_start_time).length;
    if (sinDisponibilidad) {
        avisos.push({
            tipo: 'sin_disponibilidad',
            texto: sinDisponibilidad + ' personas no tienen horario de trabajo configurado.',
            porque: 'Para esas no se puede comprobar que el turno este dentro de su jornada.'
        });
    }

    return avisos;
}

// ============================================================================
//  RUTAS
// ============================================================================
function montarRutasAutoAssign(app, getPool) {

    // --- Propuesta: no escribe nada --------------------------------------
    app.post('/api/:type/auto-assign/preview', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const fecha = String(req.body.date || '').trim();

            if (!fechaValida(fecha)) {
                return res.status(400).json({ error: 'fecha_invalida' });
            }

            const estado = await cargarEstado(pool, fecha);
            const propuesta = planificar(estado);
            const avisos = avisosSobre(estado, propuesta);

            res.json({
                fecha,
                ...propuesta,
                avisos,
                reglasUsadas: {
                    formacionesPorPapel: FORMACIONES_POR_PAPEL,
                    zonaComoPreferencia: true,
                    ventanaDeducida: true
                },
                // Lo que no se guarda. Se devuelve para poder comparar con lo
                // que hay ahora mismo.
                intactos: estado.compromisos.map(c => ({
                    employee_id: c.employee_id,
                    etiqueta: c.etiqueta,
                    inicio: hhmmDe(c.intervalo.inicio),
                    fin: hhmmDe(c.intervalo.fin),
                    work_date: c.work_date
                }))
            });
        } catch (err) {
            console.error('Error en la propuesta de asignacion automatica:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // --- Guardar: revalidando antes de escribir -------------------------
    app.post('/api/:type/auto-assign/apply', async (req, res) => {
        const client = await getPool(req.params.type).connect();
        try {
            const fecha = String(req.body.date || '').trim();
            const propuestas = Array.isArray(req.body.asignaciones) ? req.body.asignaciones : [];

            if (!fechaValida(fecha)) {
                return res.status(400).json({ error: 'fecha_invalida' });
            }
            if (!propuestas.length) {
                return res.status(400).json({ error: 'nada_que_guardar' });
            }

            await client.query('BEGIN');

            // Se vuelve a cargar el estado DENTRO de la transaccion. Entre la
            // propuesta y el guardado el horario puede haber cambiado, y si se
            // guardara lo que se propuso sin mirar, se pisarian turnos ajenos.
            const estado = await cargarEstado(client, fecha);

            // Resolucion de nombres para poder hablar de los rechazos.
            const porId = new Map(estado.empleados.map(e => [e.id, e.name]));
            const locPorId = new Map(estado.locations.map(l => [l.id, l.name]));
            const nombreDe = (v) => (v === null || v === undefined
                ? 'desconocido'
                : (porId.get(Number(v)) || locPorId.get(v) || String(v)));

            // Los compromisos que se respetaron al proponer.
            const respetados = new Set(estado.compromisos.map(c => c.id));

            const guardadas = [];
            const rechazadas = [];

            for (const p of propuestas) {
                const iv = intervalo(p.start_time, p.end_time);

                // El nombre de la persona y el de la localizacion se resuelven
                // aqui: quien recibe el rechazo los necesita para poder
                // explicarle a alguien cual de los turnos no se ha guardado.
                const quien = nombreDe(p.employee_id);
                const donde = nombreDe(p.location_id);

                if (!iv) {
                    rechazadas.push({ ...p, employee_name: quien, location: donde, motivo: 'horario ilegible' });
                    continue;
                }

                // Conflicto con lo que ya habia al proponer.
                const chocaCompromiso = estado.compromisos.find(c =>
                    c.employee_id === Number(p.employee_id)
                    && respetados.has(c.id)
                    && solapan(iv, c.intervalo));
                if (chocaCompromiso) {
                    rechazadas.push({
                        ...p, employee_name: quien, location: donde,
                        motivo: 'choca con ' + chocaCompromiso.etiqueta
                    });
                    continue;
                }

                // Conflicto con lo ya guardado en ESTA misma transaccion.
                const chocaPropia = guardadas.find(g =>
                    g.employee_id === Number(p.employee_id) && solapan(iv, g.intervalo));
                if (chocaPropia) {
                    rechazadas.push({
                        ...p, employee_name: quien, location: donde,
                        motivo: 'choca con otra asignacion de esta propuesta'
                    });
                    continue;
                }

                const r = await client.query(
                    `INSERT INTO assignments
                        (location_id, employee_id, work_date, start_time, end_time,
                         role, assignment_type, category, source)
                     VALUES ($1, $2, $3::date, $4, $5, $6, 'LOCATION', $1, 'auto-assign')
                     RETURNING id`,
                    [p.location_id, Number(p.employee_id), fecha, p.start_time, p.end_time,
                        p.rol || null]);
                guardadas.push({ ...p, employee_name: quien, location: donde, id: r.rows[0].id, intervalo: iv });
            }

            await client.query('COMMIT');

            res.json({
                fecha,
                guardadas: guardadas.map(g => ({ ...g, intervalo: undefined })),
                rechazadas,
                mensaje: rechazadas.length
                    ? 'Se han guardado ' + guardadas.length + ' y se han descartado '
                        + rechazadas.length + ' por conflicto. No se ha guardado nada a medias.'
                    : 'Se han guardado ' + guardadas.length + ' asignaciones.'
            });
        } catch (err) {
            // Todo o nada: si algo falla a mitad, no queda ni una fila suelta.
            try { await client.query('ROLLBACK'); } catch (x) { /* la transaccion ya estaba muerta */ }
            console.error('Error guardando la asignacion automatica:', err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    });
}

function solapan(a, b) {
    return a.inicio < b.fin && b.inicio < a.fin;
}

function hhmmDe(m) {
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

module.exports = { montarRutasAutoAssign, cargarEstado, deducirVentanas, diaSemanaDe, fechaValida, avisosSobre };