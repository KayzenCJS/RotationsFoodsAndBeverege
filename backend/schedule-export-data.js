// ============================================================================
//  DATOS PARA LA EXPORTACION DEL HORARIO
// ============================================================================
//  Lee la base y devuelve la estructura que espera schedule-export.js.
//
//  LO QUE HAY Y LO QUE NO
//  -----------------------
//  En la base actual las 217 asignaciones son todas de tipo LOCATION: no hay
//  turnos de Student Dining, Nostalgia Night, Support ni Extra Tasks guardados.
//  El catálogo de esas secciones SI existe, y el importador ya las sabe
//  importar, asi que el exportador las contempla igual: en cuanto haya un turno
//  de ese tipo, sale en el archivo sin tocar el codigo.
//
//  Del mismo modo, `employees.ops_group` esta vacio para todo el mundo, asi que
//  NO se puede deducir a que area OPS pertenece cada locacion. Se podria
//  adivinar por el nombre, pero adivinar un area es exactamente lo que el
//  encargo prohibe. Lo que se hace es usar la zona SOLO cuando hay dato real, y
//  decir en el informe cuantas locaciones se quedaron sin determinar.
const EXPORT = require('./schedule-export.js');

const normCat = (s) => String(s == null ? '' : s).toLowerCase().replace(/[_\s-]+/g, ' ').trim();

// ===========================================================================
//  Consulta
// ===========================================================================
async function obtenerDatos(pool, fecha) {
    const asignaciones = (await pool.query(
        `SELECT a.id,
                a.location_id,
                l.name AS location_name,
                a.employee_id,
                e.name AS employee_name,
                a.start_time::text AS start_time,
                a.end_time::text   AS end_time,
                a.role,
                a.assignment_type,
                a.category,
                a.source,
                -- Para distinguir una localizacion RETIRADA (que tiene fila y
                -- nombre, pero no se ofrece) de una que no existe. Con el
                -- LEFT JOIN, una inexistente daria NULL y una retirada daria
                -- false: IS NOT FALSE los separa sin ambiguedad.
                (l.is_active IS NOT FALSE) AS location_active
           FROM assignments a
           LEFT JOIN locations l ON l.id = a.location_id
           LEFT JOIN employees e ON e.id = a.employee_id
          WHERE a.work_date = $1
            -- NO se filtra por is_active aqui. La fila tiene que llegar al
            -- agrupador para que pueda decidir si se dibuja o si se informa, y
            -- el informe necesita el recuento.
          ORDER BY COALESCE(l.name, a.category, ''), a.start_time, e.name`, [fecha])).rows;

    // Supervisores del dia. Es la unica fuente real de "quien cubre que".
    const supervisores = (await pool.query(
        `SELECT s.supervisor_id,
                e.name AS supervisor_name,
                e.ops_group,
                e.role AS employee_role,
                s.location_id,
                l.name AS location_name,
                -- Igual que en las asignaciones: distingue una localizacion
                -- RETIRADA de una que no existe (que daria NULL).
                (l.is_active IS NOT FALSE) AS location_active,
                s.role
           FROM supervisor_assignments s
           JOIN employees e ON e.id = s.supervisor_id
           LEFT JOIN locations l ON l.id = s.location_id
          WHERE s.assigned_date = $1
            -- Tampoco se filtra aqui, por el mismo motivo que en las
            -- asignaciones: una supervision hacia una localizacion retirada se
            -- recoge en el informe de supervision sin ubicacion, en vez de
            -- perderse en silencio dentro del Excel.
          ORDER BY l.name, e.name`, [fecha])).rows;

    const categorias = (await pool.query(
        `SELECT key, section, name_es, name_en FROM schedule_categories
          WHERE is_active = true ORDER BY section, sort_order`)).rows;

    const empleados = (await pool.query(
        `SELECT name, nationality, age, role,
                COALESCE(NULLIF(group_id, ' '), '') AS group_id
           FROM employees ORDER BY name`)).rows;

    const catPorClave = new Map();
    const agregarClave = (k, c) => { if (k) catPorClave.set(normCat(k), c); };
    for (const c of categorias) {
        [c.key, c.name_es, c.name_en].forEach(n => agregarClave(n, c));
        agregarClave(String(c.key).replace(/-/g, ' '), c);
    }
    // Nombre real de una seccion del catalogo, o '' si no esta.
//
// Hay dos modos a proposito:
//   - por defecto devuelve la clave cruda cuando la categoria no existe, para
//     que la hoja "Import Data" no pierda el dato (esa hoja guarda
//     identificadores y el importador sabe resolverlos).
//   - con `soloCatalogo` a true devuelve '' en ese caso, que es lo que se usa
//     para las cabeceras de la hoja visual: ahi un identificador escrito como
//     nombre seria un dato que no significa nada para quien lee el archivo.
const nombreCategoria = (clave, soloCatalogo) => {
    if (!clave) return '';
    const c = catPorClave.get(normCat(clave));
    if (c) return c.name_es;
    return soloCatalogo ? '' : String(clave);
};

    // -----------------------------------------------------------------------
    //  Zona de cada locacion
    // -----------------------------------------------------------------------
    // Sale de `ops_group` del supervisor asignado ese dia. Con la base actual
    // sale vacia; si algun dia se rellena, el reparto cambia solo.
    const zonaDeLocacion = new Map();
    for (const s of supervisores) {
        if (!s.location_id) continue;
        const zona = normCat(s.ops_group);
        if (!zona) continue;
        const previa = zonaDeLocacion.get(s.location_id);
        if (previa && previa !== zona) zonaDeLocacion.set(s.location_id, 'conflicto');
        else zonaDeLocacion.set(s.location_id, zona);
    }

    // -----------------------------------------------------------------------
    //  Agrupacion en secciones
    // -----------------------------------------------------------------------
    // Una seccion = una locacion (con su gente) o una categoria sin
    // localizacion (Student Dining, Nostalgia Night, Support, Extra Tasks).
    // Las geograficas van al bloque izquierdo y las demas al derecho: es el
    // mismo reparto en dos columnas que el archivo de referencia.
    const izq = new Map();
    const der = new Map();

    const zonaDeClave = (clave) => {
        const c = (catPorClave.get(normCat(clave)) || {});
        return c.section === 'OPS' ? normCat(c.key).replace(/\s+/g, '_') : '';
    };

    // Turnos cuya cabecera de seccion no se puede escribir con un nombre real.
// Se guardan aparte para no perderlos en la hoja Import Data, que si lleva
// identificadores, y para poder avisar de ellos.
    const asignacionesSinNombre = [];

    for (const a of asignaciones) {
        const nombre = a.location_name || nombreCategoria(a.category);
        // Sin localizacion ni categoria no hay forma honesta de colocarlo.
        if (!nombre) continue;

        const geografica = !!a.location_id;
        const clave = geografica ? 'loc:' + a.location_id : 'cat:' + (a.category || '');

        // Una localizacion RETIRADA (locations.is_active = false) tiene fila y
        // nombre, asi que sin este paso se dibujaria su seccion en el Excel y el
        // archivo ofreceria un edificio que ya no esta en el sistema.
        //
        // No sale en la hoja, pero tampoco se pierde en silencio: se recoge en
        // el informe, igual que las asignaciones sin nombre real. Quien genera el
        // archivo ve que habia turnos ahi y que no se han incluido.
        if (geografica && a.location_active === false) {
            asignacionesSinNombre.push({
                id: a.id,
                employee_name: a.employee_name,
                location_id: a.location_id,
                location_name: a.location_name,
                categoria: 'localizacion_retirada',
                start_time: a.start_time,
                end_time: a.end_time
            });
            continue;
        }

        // Una asignacion puede apuntar a una localizacion que ya no esta en la
        // tabla `locations`. `location_name` sale vacio y el unico texto que
        // queda es el identificador o la clave de categoria. Ese texto se
        // reconoce en la hoja Import Data (que guarda identificadores), pero
        // como cabecera de seccion visual seria un identificador disfrazado de
        // nombre, que es justo lo que hay que evitar. Se registra aparte.
        const nombreReal = geografica ? a.location_name : nombreCategoria(a.category, false);
        const claveSinNombre = !nombreReal || (geografica && !a.location_name);
        if (claveSinNombre) {
            asignacionesSinNombre.push({
                id: a.id,
                employee_name: a.employee_name,
                location_id: a.location_id,
                category: a.category,
                start_time: a.start_time,
                end_time: a.end_time
            });
        }

        const destino = geografica ? izq : der;
        const zona = geografica ? (zonaDeLocacion.get(a.location_id) || '') : zonaDeClave(a.category);

        if (!destino.has(clave)) {
            destino.set(clave, {
                // La hoja visual solo lleva nombres reales. Si no hay ninguno,
                // la seccion se marca y no se dibuja, pero el turno sigue
                // saliendo en Import Data, que guarda identificadores.
                nombre: nombreReal || '',
                sinNombreReal: claveSinNombre,
                clave,
                geografica,
                zona,
                turnos: []
            });
        }
        destino.get(clave).turnos.push({
            empleado: a.employee_name,
            id: a.id,
            inicio: a.start_time,
            fin: a.end_time,
            rol: a.role || '',
            employee_id: a.employee_id
        });
    }

    // -----------------------------------------------------------------------
    //  Supervisores por locacion
    // -----------------------------------------------------------------------
    // Se agrupan por locacion para ponerlos en su seccion. Si el supervisor
    // tiene un turno real ese dia, se anota: se mostrara con sus horas. Si no,
    // se muestra solo el nombre, porque no hay horas inventables.
    const supervisoresPorLoc = new Map();
    const supervisorSinLoc = new Map();
    const supervisoresRetirados = [];
    for (const s of supervisores) {
        // Igual que con los turnos: una supervision hacia una localizacion
        // RETIRADA no genera seccion en el Excel. Si no, el archivo ofreceria un
        // edificio que ya no existe. La fila se queda en la consulta y mas abajo
        // se informa, para que no desaparezca en silencio.
        if (s.location_id && s.location_active === false) {
            supervisoresRetirados.push({
                supervisor_id: s.supervisor_id,
                supervisor_name: s.supervisor_name,
                location_id: s.location_id,
                location_name: s.location_name
            });
            continue;
        }

        const destino = s.location_id ? supervisoresPorLoc : supervisorSinLoc;
        if (!destino.has(s.location_id || '')) destino.set(s.location_id || '', []);
        const lista = destino.get(s.location_id || '');

        // ¿Tiene un turno propio ese dia?
        const turno = asignaciones.find(a =>
            a.employee_id === s.supervisor_id && a.location_id === s.location_id);

        const yaEsta = lista.some(x => x.supervisor_id === s.supervisor_id);
        if (!yaEsta) {
            lista.push({
                supervisor_id: s.supervisor_id,
                nombre: s.supervisor_name,
                rol: s.role || s.employee_role || 'supervisor',
                location_name: s.location_name,
                inicio: turno ? turno.start_time : null,
                fin: turno ? turno.end_time : null,
                turnoPropio: !!turno
            });
        }
    }

    // -----------------------------------------------------------------------
    //  Secciones que solo tienen supervision
    // -----------------------------------------------------------------------
    // Puede haber un supervisor asignado a una locacion que ese dia no tenga
    // ningun turno. Si no se crea la seccion, ese supervisor se pierde del
    // archivo y con el se pierde el dato de quien cubria esa area ese dia.
    //
    // Solo se crea si el importador reconoce el nombre. En caso contrario, la
    // fila de supervision acabaria colgada de la localizacion anterior, que es
    // justo el error que hay que evitar; se pierde y se cuenta en el informe,
    // para que quede constancia en vez de aparecer en el sitio equivocado.
    const supervisionSinSeccion = [];
    for (const [locId, lista] of supervisoresPorLoc) {
        if (!locId) continue;
        const clave = 'loc:' + locId;
        if (izq.has(clave) || der.has(clave)) continue;

        // Sin nombre no hay seccion que crear. Una supervision puede apuntar a
        // una localizacion que ya no esta en la tabla `locations` (hay al menos
        // una: "sandwich-oasis"); en ese caso lo unico que se tiene es el
        // identificador, y un identificador no es un nombre: escribirlo como
        // cabecera de seccion pondria en el archivo algo que no significa nada
        // para quien lo lea. Se sale de la exportacion y se cuenta aparte.
        const nombre = lista[0].location_name;
        if (!nombre || !EXPORT.elParserLoReconoce(nombre)) {
            supervisionSinSeccion.push({
                localizacion: nombre || locId,
                existeEnLocaciones: !!nombre,
                supervisores: lista.map(x => x.nombre)
            });
            continue;
        }
        izq.set(clave, {
            nombre,
            clave,
            geografica: true,
            zona: zonaDeLocacion.get(locId) || '',
            turnos: []
        });
    }

    // Las supervisiones hacia localizaciones RETIRADAS se suman al informe de
    // supervision sin seccion, para que se vean juntas las dos causas por las que
    // una supervision no ha podido colocarse: que la localizacion ya no exista, o
    // que exista pero se haya retirado.
    for (const s of supervisoresRetirados) {
        supervisionSinSeccion.push({
            localizacion: s.location_name || s.location_id,
            existeEnLocaciones: true,
            retirada: true,
            supervisores: [s.supervisor_name]
        });
    }

    // -----------------------------------------------------------------------
    //  Filas de la hoja visual
    // -----------------------------------------------------------------------
    // Orden: primero las locaciones con zona conocida, luego el resto, y dentro
    // de cada grupo por nombre. Asi la hoja se lee por areas sin que el orden
    // dependa de como se haya escrito la consulta.
    const ORDEN_ZONA = { front_ops: 1, ff_pav_ops: 2, back_ops: 3, oasis_dutch_ops: 4 };

    // Se dibujan solo las secciones con nombre real. Las que no lo tienen (una
    // asignacion que apunta a una localizacion que ya no existe en `locations`)
    // se quedan fuera de la hoja visual, porque ahi no hay nada honesto que
    // escribir como cabecera. Sus turnos siguen en Import Data y aparecen en
    // el informe, de modo que el dato no se pierde ni se disfraza.
    const secciones = (m, conSupervisores) => [...m.values()]
        .filter(s => !s.sinNombreReal && s.nombre)
        .map(s => ({ ...s, sup: conSupervisores ? (supervisoresPorLoc.get(s.clave.slice(4)) || []) : [] }))
        .sort((x, y) => {
            const ox = ORDEN_ZONA[x.zona] || (x.zona === 'conflicto' ? 5 : 0);
            const oy = ORDEN_ZONA[y.zona] || (y.zona === 'conflicto' ? 5 : 0);
            return (ox - oy) || x.nombre.localeCompare(y.nombre, 'es');
        })
        .map(s => {
            const turnos = s.turnos
                .filter(t => t.empleado)
                .sort((x, y) =>
                    String(x.inicio || '').localeCompare(String(y.inicio || ''))
                    || String(x.empleado).localeCompare(String(y.empleado), 'es'));

            const filas = [];
            const primero = turnos[0];
            // La fila marcadora lleva la hora en 24h, sin meridieo: es el
            // unico formato que la separacion del parser admite, y esa hora no
            // llega a interpretarse nunca.
            filas.push(EXPORT.filaSeccion(s.nombre, primero
                ? EXPORT.rango24(primero.inicio, primero.fin)
                : null));

            for (const t of turnos) {
                filas.push(EXPORT.filaTurno('izq', t.rol, EXPORT.rangoTurno(t.inicio, t.fin), t.empleado));
            }

            // Supervisores de esa locacion, al final de su seccion.
            //
            // Si el supervisor tiene turno real ese dia, su fila ya esta mas
            // arriba (es una asignacion mas) y no se repite aqui: repetirla
            // duplicaria el turno al reimportar. Lo que se añade es su
            // Supervision, que NO es un turno.
            for (const sp of s.sup) {
                if (sp.turnoPropio) continue;
                filas.push(EXPORT.filaSupervisor(sp.rol, '', sp.nombre));
            }

            return { nombre: s.nombre, filas, supervisorConTurno: s.sup.filter(x => x.turnoPropio).length };
        });

    // -----------------------------------------------------------------------
    //  Etiquetas de los bloques
    // -----------------------------------------------------------------------
    // El texto de la cabecera es decorativo: el parser empieza a leer en la fila
    // siguiente. Pero tiene que decir la verdad sobre lo que hay debajo.
    //
    // Cuando el area OPS de una locacion se puede determinar, se pone el nombre
    // real del area, con la misma grafia del catalogo ("Front OPS",
    // "Oasis/Dutch OPS"), que es como las llama el archivo de referencia.
    //
    // Cuando NO se puede determinar se pone una palabra neutra, no el nombre de
    // un area inventada. Hoy `employees.ops_group` esta vacio, asi que las
    // cabeceras salen neutras; en cuanto se rellene, solas pasan a decir las
    // areas. Lo que no se hace nunca es afirmar un area que no se sabe.
    const NOMBRE_SECCION = {
        OPS: 'OPS',
        EXTRA_HOURS: 'Horas Extra',
        SUPPORT: 'Soporte',
        EXTRA_TASK: 'Tareas Extra',
        NOSTALGIA_NIGHT: 'Nostalgia Night'
    };

    // Zonas OPS conocidas de un bloque, con el nombre del catalogo.
    const areasDe = (m) => {
        const zs = [...new Set([...m.values()].map(s => s.zona).filter(Boolean))];
        return zs.map(z => {
            const c = catPorClave.get(normCat(z.replace(/_/g, ' ')));
            return c ? c.name_es : z;
        }).filter(Boolean);
    };

    // Tipos de seccion no geografica de un bloque (Horas Extra, Nostalgia
    // Night...), con el nombre que ya usa la interfaz para cada uno.
    const tiposDe = (m) => {
        const tipos = new Set();
        for (const s of m.values()) {
            const c = catPorClave.get(normCat(String(s.clave).replace(/^cat:/, '')));
            if (c && c.section !== 'OPS' && NOMBRE_SECCION[c.section]) tipos.add(NOMBRE_SECCION[c.section]);
        }
        return [...tipos];
    };

    // Un bloque puede mezclar areas OPS con secciones de otro tipo: se nombran
    // ambas cosas, que es lo que hay escrito debajo.
    const etiqueta = (m) => {
        const partes = areasDe(m).concat(tiposDe(m));
        return partes.length ? [...new Set(partes)].join(' / ') : '';
    };

    const izqAreas = areasDe(izq);
    const derAreas = areasDe(der);
    const izqTipos = tiposDe(izq);
    const derTipos = tiposDe(der);

    const izqEtiqueta = etiqueta(izq) || 'Locaciones';
    const derEtiqueta = etiqueta(der) || 'Secciones';

    // -----------------------------------------------------------------------
    //  Import Data: una fila por asignacion, horas individuales
    // -----------------------------------------------------------------------
    const importData = asignaciones.filter(a => a.employee_name).map(a => ({
        empleado: a.employee_name,
        localizacion: a.location_name || nombreCategoria(a.category),
        fecha,
        inicio: a.start_time,
        fin: a.end_time,
        rol: a.role || '',
        seccion: a.location_name
            ? (nombreCategoria(a.category) || a.location_name)
            : (nombreCategoria(a.category) || ''),
        // Marca de que turno cruza la medianoche. No es una columna del archivo
        // de referencia, asi que NO se escribe en el .xlsx: se usa para que el
        // informe de la exportacion pueda avisar, porque en la hoja visual un
        // turno de 20:00 a 01:00 parece el mismo que uno de 20:00 a 13:00.
        cruzaMedianoche: (() => {
            const i = EXPORT.minutos(EXPORT.hhmm(a.start_time));
            const f = EXPORT.minutos(EXPORT.hhmm(a.end_time));
            return i !== null && f !== null && f <= i;
        })()
    }));

    const empleadosHoja = empleados.map(e => ({
        nombre: e.name,
        nacionalidad: e.nationality || '',
        edad: e.age === null || e.age === undefined ? '' : e.age,
        rol: e.role || '',
        grupo: e.group_id || ''
    }));

    // -----------------------------------------------------------------------
    //  Informe: que se exporto y que no se pudo determinar
    // -----------------------------------------------------------------------
    const seccionesConPersonal = [...izq.values(), ...der.values()].filter(s =>
        s.turnos.some(t => t.empleado)).length;

    return {
        fecha,
        izq: {
            etiqueta: izqEtiqueta,
            secciones: secciones(izq, true)
        },
        der: {
            etiqueta: derEtiqueta,
            secciones: secciones(der, false)
        },
        importData,
        empleados: empleadosHoja,
        informe: {
            asignaciones: asignaciones.length,
            enImportData: importData.length,
            sinEmpleado: asignaciones.filter(a => !a.employee_name).length,
            sinLugarNiSeccion: asignaciones.filter(a => !a.location_name && !nombreCategoria(a.category)).length,
            seccionesConPersonal,
            localizaciones: izq.size,
            seccionesSinLocalizacion: der.size,
            supervisoresAsignados: supervisores.length,
            supervisoresConTurnoEseDia: [...supervisoresPorLoc.values()].flat().filter(x => x.turnoPropio).length,
            locacionesConZonaConocida: [...izq.values()].filter(s => s.zona && s.zona !== 'conflicto').length,
            locacionesSinZona: [...izq.values()].filter(s => !s.zona).length,
            zonasEnConflicto: [...izq.values()].filter(s => s.zona === 'conflicto').length,
            // Supervision real que no se ha podido colocar en el archivo porque
            // el nombre de la localizacion no lo reconoce el importador y no
            // hay turnos a los que colgarse. Se informa en vez de exportarla mal.
            supervisionSinUbicacion: supervisionSinSeccion,
            // Turnos que salen en Import Data pero no en la hoja visual, porque
            // no hay ningun nombre real con el que abrir su seccion.
            asignacionesSinNombre: asignacionesSinNombre,
            areasIzq: izqAreas,
            areasDer: derAreas,
            tiposIzq: izqTipos,
            tiposDer: derTipos,
            etiquetaIzq: izqEtiqueta,
            etiquetaDer: derEtiqueta,
            beerTentIncluido: false,
            // Las dos cosas que un turno de este dia no puede representar en el
            // formato del importador. Con los datos de hoy no hay ninguna, pero
            // si apareciera, el boton avisa en vez de exportar una hora mala.
            turnosInrepresentables: importData.filter(a =>
                EXPORT.minutos(EXPORT.hhmm(a.inicio)) === 0
            ).map(a => a.empleado + ' ' + a.inicio + '-' + a.fin),
            turnosCruzanMedianoche: importData.filter(a => a.cruzaMedianoche)
                .map(a => a.empleado + ' ' + a.inicio + '-' + a.fin + ' @ ' + a.localizacion)
        }
    };
}

module.exports = { obtenerDatos };
