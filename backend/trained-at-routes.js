// ============================================================================
//  QUIEN ESTA ENTRENADO EN UNA LOCALIZACION
// ============================================================================
//  GET /api/:type/trained-at?location=<nombre o id>
//  GET /api/:type/trained-at?q=<texto>&role=&group=&department=&cert=
//
//  DE DONDE SALE LA RESPUESTA
//  -------------------------
//  De la tabla employee_location_training, que es el apartado "Locaciones
//  entrenadas" del perfil de cada persona. Es la unica fuente que significa
//  exactamente "esta persona esta entrenada aqui".
//
//  Lo que NO se usa, y por que:
//    - El historial de asignaciones. Que alguien haya trabajado una vez en una
//      localizacion no significa que este entrenada en ella: puede haber
//     podría haber ido para otra cosa. El encargo lo pide asi.
//    - Pertenecer a Foods o Retail. Que todo el mundo sea del parque no dice
//      nada de donde sabe trabajar cada uno.
//    - Las formaciones (employee_trainings). Son habilidades y
//      certificaciones: "pos-training" dice que sabe usar la caja,
//      no que pueda llevar la pantalla de una localizacion concreta.
//
//  LA RELACION ES ESCASA, Y SE DICE
//  --------------------------------
//  En la base hay 12 registros de entrenamiento para 14 localizaciones, y 7 de
//  esas localizaciones no tienen a nadie. La consulta NO se rellena con
//  supuestos ni con gente que "deberia" estar: si no hay nadie registrado, se
//  devuelve vacio y se explica por que, para que quien pregunta sepa que falta
//  informacion y no que no haya nadie disponible.
//
//  DEPARTAMENTO
//  ------------
//  Se determina mirando en que base esta la persona, no por un campo. Hoy las
//  dos bases comparten la misma tabla de empleados y Retail esta vacia, asi que
//  todo el mundo sale como Foods. Si mañana hay gente en Retail, saldra como
//  Retail sin tocar nada.
//
//  ESTADO
//  ------
//  El sistema no tiene una columna de estado. Lo que hay son cuatro banderas de
//  disponibilidad (descanso, formacion, dia libre, festivo) y un horario. El
//  estado se deriva de ahi, que es lo mismo que hace el resto de la aplicacion.
// ============================================================================

// ---------------------------------------------------------------------------
//  Normalizacion de nombres
// ---------------------------------------------------------------------------
// La gente escribe como le suena: "Pixie", "Farmstand", "Oasis", "Dunkin
// Donuts". En la base están "Pixie Kitchen", "The Farm Stand", "Teddy's at
// Oasis" y "Dunkin' Donuts".
//
// Se quitan los acentos, los apostrofos, el "the" inicial y los signos, de modo
// que "Dunkin' Donuts" y "Dunkin Donuts" sean lo mismo.
function normalizar(texto) {
    return String(texto == null ? '' : texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')       // acentos
        .toLowerCase()
        .replace(/[''`´]/g, '')                 // apostrofos: Dunkin' -> dunkin
        .replace(/[^a-z0-9]+/g, ' ')             // todo lo demas a espacios
        .replace(/\bthe\b/g, ' ')                // "The Farm Stand" -> farm stand
        .replace(/\s+/g, ' ')
        .trim();
}

// Busca la localizacion a la que se refiere un texto.
//
// Se prueban tres cosas, de mas fuerte a mas debil:
//   1. Que coincida con el id exacto.              "pixie-kitchen"
//   2. Que el texto este contenido en el nombre.   "pixie" -> "pixie kitchen"
//   3. Que las palabras del texto esten en el nombre, aunque el texto tenga
//      palabras de mas.                            "kitchen pixie food" -> pixie
//
// La 3 es la que hace que "Dunkin Donuts" encuentre a "Dunkin' Donuts" sin
// depender del apostrofo.
//
// Cuando varias localizaciones encajan, se devuelven todas: preguntar por
// "ice" puede ser legitimo, y elegir una por debajo seria inventar. El
// frontend deja que se elija.
function buscarLocalizaciones(locations, texto) {
    const q = normalizar(texto);
    if (!q) return [];

    const exactas = locations.filter(l => normalizar(l.id) === q);
    if (exactas.length) return exactas;

    // El nombre contiene el texto entero, o el texto contiene el nombre.
    const porNombre = locations.filter(l => {
        const n = normalizar(l.name);
        return n === q || n.includes(q) || q.includes(n);
    });
    if (porNombre.length) return porNombre;

    // Todas las palabras del texto aparecen en el nombre (en cualquier orden).
    const palabras = q.split(' ').filter(x => x.length > 2);
    if (palabras.length) {
        const porPalabras = locations.filter(l => {
            const n = normalizar(l.name) + ' ' + normalizar(l.id);
            return palabras.every(p => n.includes(p));
        });
        if (porPalabras.length) return porPalabras;
    }

    // Ultimo recurso: comparar sin espacios, porque la gente escribe "Farmstand"
    // seguido y en la base esta "The Farm Stand". Sin esto, esas dos cadenas no
    // se parecen en nada.
    const pegado = q.replace(/\s+/g, '');
    if (pegado.length > 2) {
        return locations.filter(l => {
            const n = normalizar(l.name).replace(/\s+/g, '') + ' ' + normalizar(l.id).replace(/\s+/g, '');
            return n.includes(pegado);
        });
    }

    return [];
}

// ---------------------------------------------------------------------------
//  Consulta
// ---------------------------------------------------------------------------
// Una sola consulta con arrays agregados: traer el entrenamiento de persona por
// persona haria un viaje por cada empleado, que es justo lo que hay que evitar.
async function empleadosEntrenados(pool, locationId, filtros = {}) {
    const params = [locationId];
    const donde = ['elt.location_id = $1'];

    // Los filtros se aceptan en las dosgrafias. Antes la funcion miraba
    // filtros.rol y quien llamaba pasaba filtros.role: el filtro se ignoraba en
    // silencio y la consulta salia como si no hubiera ninguno. Aceptar las dos
    // quita esa trampa.
    const rol = filtros.rol || filtros.role;
    const grupo = filtros.grupo || filtros.group;
    const certificacion = filtros.certificacion || filtros.cert;
    const nombre = filtros.nombre;

    if (rol) { params.push(rol); donde.push('lower(e.role) = lower($' + params.length + ')'); }

    // El filtro de grupo mira el principal Y los adicionales, que es lo mismo
    // que se devuelve en la respuesta. Si solo mirase el principal, un empleado
    // con grupo C en la ficha y B en la tabla apareceria en la lista al buscar
    // por C pero no apareceria al filtrar por B: dos listas distintas para la
    // misma pregunta.
    if (grupo) {
        params.push(grupo);
        const n = params.length;
        donde.push('(upper(e.group_id) = upper($' + n + ') OR EXISTS ('
            + 'SELECT 1 FROM employee_groups g '
            + 'WHERE g.employee_id = e.id AND upper(g.group_id) = upper($' + n + ')))');
    }
    // La certificacion se busca por coincidencia parcial en el nombre, porque
    // "bartender" debe encontrar "nh-alcohol-certification" sin que haya que
    // escribirla entera.
    if (certificacion) {
        params.push('%' + String(certificacion).toLowerCase() + '%');
        donde.push('EXISTS (SELECT 1 FROM employee_trainings t '
            + 'WHERE t.employee_id = e.id AND lower(t.training_name) LIKE $' + params.length + ')');
    }
    if (nombre) {
        params.push('%' + String(nombre).toLowerCase() + '%');
        donde.push('lower(e.name) LIKE $' + params.length);
    }

    const base = `
        SELECT e.id, e.name, e.role, e.group_id, e.age, e.nationality,
               elt.trained_at,
               array_remove(array_agg(DISTINCT et.training_name), NULL) AS formaciones,
               array_remove(array_agg(DISTINCT eg.group_id), NULL)      AS grupos_extra
          FROM employee_location_training elt
          JOIN employees e ON e.id = elt.employee_id
          LEFT JOIN employee_trainings et  ON et.employee_id = e.id
          LEFT JOIN employee_groups  eg   ON eg.employee_id = e.id
         WHERE ${donde.join(' AND ')}
         GROUP BY e.id, e.name, e.role, e.group_id, e.age, e.nationality, elt.trained_at
         ORDER BY lower(e.name)`;

    const [filas, disponibilidad] = await Promise.all([
        pool.query(base, params),
        pool.query(
            `SELECT employee_id, is_on_break, is_on_training, is_day_off, is_holiday,
                    schedule_start_time, schedule_end_time
               FROM employee_availability`)
    ]);

    const disp = new Map(disponibilidad.rows.map(d => [d.employee_id, d]));
    return filas.rows.map(f => ({
        id: f.id,
        name: f.name,
        role: f.role,
        age: f.age,
        nationality: f.nationality,
        // El grupo principal mas los adicionales. Un empleado con grupo B en la
        // ficha y D en la tabla es de los dos.
        grupos: [...new Set([f.group_id, ...(f.grupos_extra || [])].filter(Boolean))],
        formadoEn: f.trained_at,
        formaciones: f.formaciones || [],
        ...estadoDe(disp.get(f.id))
    }));
}

// El estado no es una columna: se deriva de las banderas de disponibilidad,
// igual que hace el resto de la aplicacion. Se devuelven los datos en crudo
// para que el frontend los pase por su propio getEmployeeStatus(), que ya
// sabe escribirlo en el idioma activo.
function estadoDe(d) {
    if (!d) {
        return { is_on_break: false, is_on_training: false, is_day_off: false, is_holiday: false, schedule: null };
    }
    return {
        is_on_break: !!d.is_on_break,
        is_on_training: !!d.is_on_training,
        is_day_off: !!d.is_day_off,
        is_holiday: !!d.is_holiday,
        schedule: (d.schedule_start_time && d.schedule_end_time)
            ? { startTime: d.schedule_start_time, endTime: d.schedule_end_time }
            : null
    };
}

// Que certificaciones tienen y cuantas personas las tienen. Sirve para el
// desplegable de filtros: si no hay ninguna certificacion en el sistema, el
// desplegable sale vacio en vez de dejar elegir algo que no existe.
async function catalogoCertificaciones(pool) {
    const r = await pool.query(
        `SELECT training_name, count(DISTINCT employee_id)::int AS personas
           FROM employee_trainings
          WHERE training_name ~* 'certif|bartend|alcohol|licen'
          GROUP BY training_name ORDER BY lower(training_name)`);
    return r.rows.map(x => ({ nombre: x.training_name, personas: x.personas }));
}

// ============================================================================
//  RUTAS
// ============================================================================
function montarRutasEntrenados(app, getPool, getPools) {

    // Estado de la localizacion: quien esta entrenado y quien no. Se usa para
    // poder decir "aqui no hay nadie registrado" con motivo, en vez de una
    // lista vacia que no explica nada.
    app.get('/api/:type/trained-at', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { location, q, role, group, department, cert } = req.query;

            // Sin localizacion: se devuelve el catalogo, que es lo que pinta el
            // desplegable. Es mas util que un error.
            if (!location && !q) {
                return res.json({
                    modo: 'catalogo',
                    certificaciones: await catalogoCertificaciones(pool)
                });
            }

            const locs = (await pool.query(
                'SELECT id, name, type, category, serves_alcohol FROM locations ORDER BY name')).rows;

            const texto = location || q;
            const encontradas = buscarLocalizaciones(locs, texto);

            if (!encontradas.length) {
                return res.json({
                    modo: 'sin-coincidencia',
                    consulta: texto,
                    mensaje: 'Ninguna locación se parece a "' + texto + '"',
                    sugerencias: locs.map(l => l.name)
                });
            }

            // Que localizaciones de las que han salido no tienen a nadie
            // registrado. Se lista aunque haya resultados, porque es
            // información que quien pregunta necesita: si el resultado está vacío,
            // la razon puede ser esa y no que no haya nadie disponible.
            const sinRegistrar = [];
            const resultados = [];
            for (const loc of encontradas) {
                const filas = await empleadosEntrenados(pool, loc.id, { role, group, cert });
                if (!filas.length && !role && !group && !cert) sinRegistrar.push(loc.name);
                resultados.push({ localizacion: loc, empleados: filas });
            }

            // El departamento se determina por la base donde esta cada persona.
            const pools = getPools ? getPools() : null;
            let retailIds = new Set();
            if (pools && pools.retail && pools.retail !== pools.foods) {
                try {
                    const rr = await pools.retail.query('SELECT id FROM employees');
                    retailIds = new Set(rr.rows.map(x => x.id));
                } catch (e) {
                    // Si no se puede leer Retail, no se inventa el departamento:
                    // se deja como Foods, que es donde esta casi toda la gente.
                }
            }
            for (const r of resultados) {
                for (const e of r.empleados) {
                    e.departamento = retailIds.has(e.id) ? 'Retail' : 'Foods';
                }
            }

            const total = resultados.reduce((s, r) => s + r.empleados.length, 0);
            const empleadosRetail = retailIds.size;

            res.json({
                modo: 'resultados',
                consulta: texto,
                resultados,
                total,
                sinRegistrar,
                totalEmpleados: (await pool.query('SELECT count(*)::int n FROM employees')).rows[0].n,
                // Se dice si hay alguien en Retail, para que un total de 0 no
                // parezca un fallo.
                departamentos: {
                    foods: (await pool.query('SELECT count(*)::int n FROM employees')).rows[0].n - empleadosRetail,
                    retail: empleadosRetail
                },
                filtros: { role: role || null, group: group || null, cert: cert || null },
                certificaciones: await catalogoCertificaciones(pool),
                nota: resultados.length > 1 && !role && !group && !cert
                    ? 'La búsqueda coincide con varias localizaciones: se muestran todas.'
                    : null
            });
        } catch (err) {
            console.error('Error en la consulta de entrenados:', err);
            res.status(500).json({ error: err.message });
        }
    });
}

module.exports = {
    montarRutasEntrenados,
    buscarLocalizaciones,
    normalizar,
    empleadosEntrenados,
    estadoDe
};