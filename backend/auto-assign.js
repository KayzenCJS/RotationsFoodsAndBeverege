// ============================================================================
//  PLANIFICADOR DE ASIGNACION AUTOMATICA
// ============================================================================
//  Modulo puro: no toca la base de datos. Recibe el estado del dia ya
//  consultation y devuelve una PROPUESTA. Que la propuesta se guarde o no es
//  una decision del backend, aqui no.
//
//  Poder probarlo sin escribir nada es justo lo que permite comprobar los
//  casos que importan: turnos de noche, conflictos, UUUD shortages de personal.
//
//  DE DONDE SALE CADA REGLA
//  ------------------------
//  Los minimos por localizacion NO estan escritos aqui: llegan en `reglas`,
//  que viene de la tabla staffing_rules. Si un building anade un requisito
//  nuevo, este modulo lo cubre sin cambiar una linea.
//
//  Las certificaciones exigidas (por ejemplo nh-alcohol-certification) tambien
//  llegan en `reglas`, dentro de cada requisito. Aqui solo se comprueba que la
//  persona tenga ese entrenamiento.
//
//  `location_groups` NO se usa como veto. El 47% de las asignaciones que hay en
//  la base estan fuera de la zona de su localizacion: tratarlo como restriccion
//  dejaria casi todo sin cubrir. Se usa como preferencia, que es lo que hacen
//  los datos reales. Llega en `zonaDe`.
//
//  Los horarios de apertura y cierre NO estan configurados en ninguna tabla.
//  Llegan en `ventanas`, derivadas de los turnos reales de cada localizacion.
//  Si no hay ventana para una localizacion, se avisa y no se propone nada para
//  ella, en vez de inventar un horario.
//
//  ORDEN DE TRABAJO
//  ----------------
//    1. Compromisos ya confirmados: no se tocan. Entran bloqueados.
//    2. Actividades especiales (secciones sin localizacion): tambien
//       compromisos, por el mismo motivo.
//    3. Se calculan los puestos que faltan en cada localizacion.
//    4. Se descarta a quien no sea elegible (rol, formacion, certificacion,
//       disponibilidad, zona).
//    5. Se reparte, del puesto mas escaso al mas holgado.
//    6. Se reparan huecos intercambiando a quien puede cubrir mas.
//
//  La cobertura es el objetivo, no un adorno: un puesto que se puede cubrir no
//  se deja sin cubrir porque su vacante saliera despues en la lista.
// ============================================================================

// ---------------------------------------------------------------------------
//  Utilidades de tiempo
// ---------------------------------------------------------------------------
// Minutos desde medianoche. Devuelve null si no se puede leer, para que un dato
// sucio no se convierta en un turno de cero minutos.
function minutos(hhmm) {
    if (hhmm === null || hhmm === undefined) return null;
    const m = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = +m[1], min = +m[2];
    if (h > 24 || min > 59) return null;
    return h * 60 + min;
}

// Minutos que ocupa un turno, sobre una linea continua.
//
// Un turno que acaba antes de empezar cruza la medianoche: el final lleva
// +24h. Asi 20:00-01:00 son 1200 -> 1500 y NO 1200 -> 60, que haria que un turno
// de noche pareciera acabar a la una de la tarde. Es el mismo criterio que usa
// el backend al validar conflictos (server.js, minutosTurno).
function intervalo(ini, fin) {
    const a = minutos(ini);
    const b = minutos(fin);
    if (a === null || b === null) return null;
    return { inicio: a, fin: b <= a ? b + 1440 : b, cruzaMedianoche: b <= a };
}

// Dos intervalos se solapan si comparten un momento. Terminar justo cuando
// empieza el otro NO es solapar: [540,1020] y [1020,1320] son compatibles.
function seSolapan(x, y) {
    if (!x || !y) return false;
    return x.inicio < y.fin && y.inicio < x.fin;
}

const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');

// Cuantos intervalos sin solapar caben como maximo. Problema clasico de
// seleccion de intervalos: ordenando por fin y cogiendo el que acaba antes se
// consigue el maximo numero posible.
function maximoSinSolapar(intervalos) {
    const ord = [...intervalos].sort((a, b) => a.fin - b.fin || a.inicio - b.inicio);
    let fin = -Infinity;
    let n = 0;
    for (const iv of ord) {
        if (iv.inicio >= fin) { n++; fin = iv.fin; }
    }
    return n;
}

// ---------------------------------------------------------------------------
//  QUE PAPEL HACE CADA PERSONA
// ---------------------------------------------------------------------------
// "Formacion" es lo que ha aprendido. Un papel no se deduce solo del puesto que
// ocupa la persona en su ficha, sino tambien de lo que tiene aprendido.
//
// Es el mismo mapa que usa el frontend en isEmployeeVersatile/getAvailableRoles,
// y esta duplicado a proposito en lugar de importado: el backend no carga
// ficheros del navegador. Si algun dia cambia en un sitio, tiene que cambiar en
// los dos, y por eso el informe dice que reglas se han usado.
//
// Un papel cuenta si:
//   - lo declara en su ficha (employees.role), o
//   - tiene ALGUNA de las formaciones que dan ese papel.
//
// Importa el "o": en la base hay una sola persona con rol "dishwasher" pero
// dieciseis con la formacion. Si solo se mirase la ficha, Food Fair no se podria
// cubrir nunca.
const FORMACIONES_POR_PAPEL = {
    cashier: ['pos-training', 'cash-register'],
    server: ['customer-service', 'pos-training'],
    cook: ['grill-training', 'griddle-training', 'fryer-training', 'oven-training'],
    bartender: ['nh-alcohol-certification', 'pos-training'],
    dishwasher: ['dishwashing']
};

// Aplica el mapa a una persona: devuelve el conjunto de papeles que puede hacer,
// declarados y deducidos.
function papelesDe(empleado) {
    const papeles = new Set();
    for (const r of (empleado.roles || [])) papeles.add(r);
    for (const f of (empleado.formaciones || [])) {
        for (const [papel, Needed] of Object.entries(FORMACIONES_POR_PAPEL)) {
            if (Needed.indexOf(f) >= 0) papeles.add(papel);
        }
    }
    return papeles;
}

// ============================================================================
//  ELEGIBILIDAD
// ============================================================================
// ¿Puede esta persona cubrir este puesto?
//
// Se separan tres cosas que se confunden a menudo:
//   - bloqueante:   no es elegible y punto. No se propone.
//   - aviso:        se propone, pero quien lo revise debe saberlo.
//   - preferencia:  no impide nada, solo afecta al orden de eleccion.
//
// Devuelve { ok, motivo, avisos, puntuacion } para que el resumen pueda
// explicar cada decision.
function evaluarElegibilidad({ empleado, puesto, compromisos, zonaDe, config }) {
    const avisos = [];
    let puntuacion = 0;

    // --- 1. Estado del dia ----------------------------------------------------
    // Descanso, formacion o dia libre lo sacan directamente. Son banderas que
    // alguien mantiene a mano; no se deducen.
    const d = empleado.disponibilidad || {};
    if (d.is_day_off) return { ok: false, motivo: 'dia libre', avisos, puntuacion };
    if (d.is_on_break) return { ok: false, motivo: 'descanso', avisos, puntuacion };
    if (d.is_on_training) return { ok: false, motivo: 'en formacion', avisos, puntuacion };
    if (d.is_holiday) return { ok: false, motivo: 'festivo', avisos, puntuacion };

    // --- 2. Dia de la semana --------------------------------------------------
    // Los dias libres se guardan por nombre de dia. Solo se miran si la persona
    // tiene lista.
    if (Array.isArray(d.days_off) && d.days_off.length && puesto.diaSemana) {
        const hoy = String(puesto.diaSemana).toLowerCase();
        if (d.days_off.some(x => String(x).toLowerCase() === hoy)) {
            return { ok: false, motivo: 'descansa los ' + hoy, avisos, puntuacion };
        }
    }

    // --- 3. Rol ---------------------------------------------------------------
    // Vale el papel declarado en la ficha O el deducido de la formacion (ver
    // papelesDe). No se mira solo la ficha: hay una sola persona con rol
    // "dishwasher" y dieciseis con la formacion, y Food Fair no se podria
    // cubrir.
    //
    // Los papeles llegan como conjunto o como lista segun quien llame: aqui se
    // normaliza, para que el algoritmo no dependa de como se haya preparado el
    // dato.
    const papeles = empleado.papeles instanceof Set
        ? empleado.papeles
        : new Set(empleado.papeles || papelesDe(empleado));

    if (!papeles.has(puesto.rol)) {
        return { ok: false, motivo: 'no puede hacer de ' + puesto.rol, avisos, puntuacion };
    }

    // El papel declarado pesa mas que "le sale por formacion". No cambia la
    // elegibilidad, solo lo raro que es la eleccion.
    if ((empleado.roles || []).includes(puesto.rol)) puntuacion += 30;

    // --- 4. Certificaciones exigidas -----------------------------------------
    for (const cert of (puesto.certificaciones || [])) {
        if (!empleado.formaciones.includes(cert)) {
            return { ok: false, motivo: 'le falta la certificacion ' + cert, avisos, puntuacion };
        }
    }
    if ((puesto.certificaciones || []).length) puntuacion += 10;

    // --- 5. Ventana de disponibilidad ----------------------------------------
    // Cada persona tiene un horario de trabajo configurado (09:00-18:00 en la
    // base). Si el turno se sale de esa ventana se avisa pero no se descarta: el
    // parque tiene turnos que empiezan a las 06:00, y bloquear aqui dejaria
    // huecos que de verdad se pueden cubrir.
    const iv = puesto.intervalo;
    const ventana = (d.schedule_start_time && d.schedule_end_time)
        ? intervalo(d.schedule_start_time, d.schedule_end_time)
        : null;
    if (ventana && iv) {
        if (iv.inicio < ventana.inicio || iv.fin > ventana.fin) {
            avisos.push('el turno se sale de su horario ('
                + String(d.schedule_start_time).slice(0, 5) + '-'
                + String(d.schedule_end_time).slice(0, 5) + ')');
        }
    }

    // --- 6. Compromisos que ya tiene -----------------------------------------
    // Lo importante: no se pisa nada de lo ya confirmado. Se miran TODOS los
    // compromisos del dia, sean de localizacion o de seccion, porque todos le
    // ocupan el tiempo. Un turno de Student Dining a las 17:00 limita igual que
    // uno en una localizacion.
    for (const c of compromisos) {
        if (c.employee_id !== empleado.id) continue;
        if (seSolapan(iv, c.intervalo)) {
            return {
                ok: false,
                motivo: 'ya tiene ' + (c.etiqueta || 'un turno')
                    + ' (' + hhmm(Math.min(c.intervalo.inicio, 1439)) + '-'
                    + hhmm(c.intervalo.fin <= 1440 ? c.intervalo.fin : c.intervalo.fin - 1440) + ')',
                avisos,
                puntuacion,
                conflicto: c
            };
        }
    }

    // --- 7. Zona del parque (PREFERENCIA, no veto) ---------------------------
    const zona = zonaDe[puesto.location_id];
    if (config && config.zonaObligatoria) {
        // Modo estricto, apagado por defecto. Se deja disponible por si algun
        // dia el grupo pasa a ser una restriccion real de verdad.
        if (zona && !empleado.grupos.includes(zona)) {
            return { ok: false, motivo: 'grupo ' + zona + ' obligatorio en ' + puesto.locationId, avisos, puntuacion };
        }
    } else if (zona && empleado.grupos.includes(zona)) {
        puntuacion += 20;
    } else if (zona) {
        avisos.push('no es de la zona de esta localizacion');
    }

    // --- 8. Entrenamiento en la localizacion (BLOQUEANTE si el modo es
    //      estricto, PREFERENCIA si no lo es) ----------------------------
    // Solo 12 personas tienen localizaciones entrenadas guardadas, asi que no
    // puede ser bloqueante por defecto: casi nadie lo tendria y nadie podria
    // trabajar. Con `entrenamientoObligatorio` activado (config), pasa a ser una
    // restriccion real: nadie sin entrenamiento en la localizacion se propone,
    // aunque tenga experiencia en otros edificios.
    const tieneEntrenamiento = (empleado.localizacionesEntrenadas || [])
        .includes(puesto.location_id);
    if (config && config.entrenamientoObligatoria) {
        if (!tieneEntrenamiento) {
            return { ok: false, motivo: 'sin entrenamiento en ' + puesto.location_id, avisos, puntuacion };
        }
    } else if (tieneEntrenamiento) {
        puntuacion += 15;
    } else {
        avisos.push('sin formacion registrada en ' + puesto.location_id);
    }

    // --- 8b. Experiencia en la localizacion (PREFERENCIA entre elegibles) --
    // El historial en un edificio suma puntos a quien ya ha trabajado alla.
    // Nunca sustituye al entrenamiento: la elegibilidad ya la decidieron la
    // formacion y las certificaciones antes de llegar aqui, y este solo ordena
    // entre los que ya son elegibles.
    const historial = Array.isArray(empleado.historial) ? empleado.historial : [];
    if (historial.indexOf(puesto.location_id) >= 0) {
        puntuacion += 12;
    }

    // --- 9. Cuanta gente ha cargado ya --------------------------------------
    // Reparto equilibrado: se prefiere a quien menos turnos lleva.
    puntuacion -= (empleado.carga || 0) * 5;

    return { ok: true, motivo: null, avisos, puntuacion };
}

// ============================================================================
//  PUESTOS QUE FALTAN
// ============================================================================
// A partir de staffing_rules y de lo ya asignado, devuelve los puestos sueltos
// que hay que cubrir.
//
// Un puesto cuenta como cubierto si alguien ya esta ahi con ese rol, TANTO si
// es una asignacion guardada como si la ha puesto la propia propuesta.
function calcularPuestos({ reglas, locations, cubiertos, ventanas }) {
    const puestos = [];
    const sinVentana = [];

    for (const regla of reglas) {
        const loc = locations.find(l => l.id === regla.location_id);
        if (!loc) continue;                    // la regla apunta a algo que ya no existe

        // Una localizacion cerrada ese dia no necesita a nadie, y no es un fallo
        // de cobertura: es un cierre previsto.
        if (regla.cerrada) continue;

        const ventana = ventanas[regla.location_id];
        if (!ventana || ventana.inicio === null || ventana.fin === null) {
            // Sin ventana real no hay turno que proponer. Se avisa en vez de
            // inventar un horario.
            sinVentana.push(regla.location_id);
            continue;
        }

        const iv = intervalo(ventana.inicio, ventana.fin);
        if (!iv) { sinVentana.push(regla.location_id); continue; }

        for (const req of (regla.requirements || [])) {
            const clave = regla.location_id + '|' + req.role;
            const yaHechos = cubiertos[clave] || 0;
            for (let i = yaHechos; i < (req.count || 0); i++) {
                puestos.push({
                    id: clave + '#' + i,
                    location_id: regla.location_id,
                    locationId: regla.location_id,
                    locationName: loc.name,
                    rol: req.role,
                    certificaciones: req.required_certifications || [],
                    intervalo: iv,
                    inicio: ventana.inicio,
                    fin: ventana.fin,
                    esRelleno: false
                });
            }
        }

        // min_employees marca el suelo de gente. Los roles ya dicen cuantos hacen
        // falta; el suelo solo obliga a cubrir mas si los roles no llegan.
        //
        // Se compara contra la SUMA de lo que piden los roles, no contra lo que
        // hay asignado ahora: si se comparara contra lo cubierto, un local sin
        // nadie asignado recibiria un puesto de relleno extra aunque sus roles
        // ya pidiesen el minimo, y aparecerian huecos que no existen.
        const pidenLosRoles = (regla.requirements || [])
            .reduce((s, r) => s + (r.count || 0), 0);
        const faltan = Math.max(0, (regla.min_employees || 0) - pidenLosRoles);

        if (faltan > 0) {
            const candidatos = (regla.requirements || []).slice()
                .sort((a, b) => (b.count || 0) - (a.count || 0));
            for (let i = 0; i < faltan && candidatos.length; i++) {
                const req = candidatos[i % candidatos.length];
                puestos.push({
                    id: regla.location_id + '|relleno#' + i,
                    location_id: regla.location_id,
                    locationId: regla.location_id,
                    locationName: loc.name,
                    rol: req.role,
                    certificaciones: req.required_certifications || [],
                    intervalo: iv,
                    inicio: ventana.inicio,
                    fin: ventana.fin,
                    // Un puesto de relleno no es tan urgente como uno que la
                    // regla pide por nombre.
                    esRelleno: true
                });
            }
        }
    }

    return { puestos, sinVentana };
}

// ============================================================================
//  EL ALGORITMO
// ============================================================================
function planificar(contexto) {
    const {
        fecha, diaSemana, reglas, locations, empleados, compromisos,
        zonaDe = {}, ventanas = {}, config = {}
    } = contexto;

    // -----------------------------------------------------------------------
    // 1 y 2. COMPROMISOS
    // -----------------------------------------------------------------------
    // Se cuentan los compromisos que ya cubren cada puesto. Se cuentan TODOS,
    // sin mirar si son de localizacion o de seccion, porque todos ocupan a la
    // persona.
    //
    // Los compromisos duplicados (la misma actividad reflejada en dos secciones,
    // como Student Dining en Horarios y en Extra Hours) se cuentan una sola vez.
    // Se distinguen por persona, sitio y hora: dos filas con la misma persona,
    // el mismo sitio y la misma hora son el mismo compromiso visto dos veces.
    const vistos = new Set();
    const unicos = [];
    for (const c of compromisos) {
        const clave = [c.employee_id, c.location_id || c.category || '',
            c.intervalo.inicio, c.intervalo.fin].join('|');
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        unicos.push(c);
    }
    const duplicados = compromisos.length - unicos.length;

    const cubiertos = {};
    for (const c of unicos) {
        if (!c.location_id) continue;          // los de seccion no cubren un puesto de localizacion
        const clave = c.location_id + '|' + String(c.role || 'sin rol').toLowerCase();
        cubiertos[clave] = (cubiertos[clave] || 0) + 1;
    }

    // -----------------------------------------------------------------------
    // 3. PUESTOS QUE FALTAN
    // -----------------------------------------------------------------------
    const { puestos: lista, sinVentana } = calcularPuestos({ reglas, locations, cubiertos, ventanas });

    // -----------------------------------------------------------------------
    // 4. ELEGIBILIDAD
    // -----------------------------------------------------------------------
    // Para cada puesto, quien puede ocuparlo. Se calcula una vez y se
    // reutiliza: es lo que evita repetir el mismo trabajo para treinta puestos.
    const candidatosPorPuesto = new Map();
    const diagnostico = new Map();      // puesto_id -> por que no puede cada persona
    const descartes = [];
    // Carga REAL de cada persona para ese dia. Las que ya tienen turno (o la que
    // se les acaba de proponer) son trabajo que el reparto ya tiene asumido, asi
    // que se premia a quien menos carga. Antes se partia en cero: el balance se
    // hacia solo con lo que la propia propuesta iba acumulando en el reparto.
    const cargas = new Map();
    for (const c of unicos) {
        if (c.employee_id == null) continue;
        cargas.set(c.employee_id, (cargas.get(c.employee_id) || 0) + 1);
    }

    for (const p of lista) {
        const aptos = [];
        // Por que cae cada persona. Hace falta para poder explicar un hueco:
        // "sin personal elegible" no dice nada accionable, pero "las 14 personas
        // que podrian ya tienen turno a esas horas" si.
        const porQueNo = new Map();
        const anotar = (motivo) => porQueNo.set(motivo, (porQueNo.get(motivo) || 0) + 1);

        for (const emp of empleados) {
            const r = evaluarElegibilidad({
                empleado: { ...emp, carga: cargas.get(emp.id) || 0 },
                puesto: { ...p, diaSemana },
                compromisos: unicos,
                zonaDe,
                config
            });
            if (r.ok) {
                aptos.push({ empleado: emp, puntuacion: r.puntuacion, avisos: r.avisos });
            } else {
                anotar(r.motivo);
                // Los descartes por conflicto con un compromiso ya se explican
                // solos: son los que el resumen lista como "compromisos que
                // limitaron la disponibilidad". Aqui solo interesan los que no
                // entran por falta de papel.
                if (!r.conflicto) {
                    descartes.push({
                        employee_id: emp.id,
                        employee_name: emp.name,
                        location: p.locationName,
                        rol: p.rol,
                        motivo: r.motivo
                    });
                }
            }
        }
        candidatosPorPuesto.set(p.id, aptos);
        diagnostico.set(p.id, porQueNo);
    }

    // -----------------------------------------------------------------------
    // 5. REPARTO: del puesto mas escaso al mas holgado
    // -----------------------------------------------------------------------
    // El reparto "el primero que encaja" deja huecos: uno puede encajar en el
    // puesto A y en el B, y si se le da el A el B se queda vacio. Por eso los
    // puestos se ordenan de mas escaso a mas holgado ANTES de repartirlos.
    // Primero los que tienen menos candidatos, que son los que mas costarian
    // cubrir despues.
    const orden = lista.slice().sort((a, b) => {
        const na = candidatosPorPuesto.get(a.id).length;
        const nb = candidatosPorPuesto.get(b.id).length;
        if (na !== nb) return na - nb;
        if (!!a.esRelleno !== !!b.esRelleno) return a.esRelleno ? 1 : -1;
        return String(a.locationName).localeCompare(String(b.locationName));
    });

    const asignados = [];                          // { p: propuesta, puesto, intervalo }
    const intervalosPorEmpleado = new Map();    // employee_id -> intervalos ya usados

    const cabe = (empId, iv) => {
        const usados = intervalosPorEmpleado.get(empId) || [];
        return usados.every(x => !seSolapan(x, iv));
    };
    const ocupa = (empId, iv) => {
        if (!intervalosPorEmpleado.has(empId)) intervalosPorEmpleado.set(empId, []);
        intervalosPorEmpleado.get(empId).push(iv);
        cargas.set(empId, (cargas.get(empId) || 0) + 1);
    };
    const suelta = (empId, iv) => {
        intervalosPorEmpleado.set(empId,
            (intervalosPorEmpleado.get(empId) || []).filter(x => x !== iv));
        cargas.set(empId, Math.max(0, (cargas.get(empId) || 0) - 1));
    };

    for (const puesto of orden) {
        const aptos = candidatosPorPuesto.get(puesto.id)
            .filter(c => cabe(c.empleado.id, puesto.intervalo));
        if (!aptos.length) continue;            // este puesto se queda sin cubrir (se reporta)

        // A mayor puntuacion, mejor. La puntuacion ya descuenta el trabajo que
        // lleva la persona, de modo que el reparto sale equilibrado.
        aptos.sort((x, y) => y.puntuacion - x.puntuacion || x.empleado.id - y.empleado.id);
        const elegido = aptos[0];

        asignados.push({ p: propuesta(elegido, puesto, false), puesto });
        ocupa(elegido.empleado.id, puesto.intervalo);
    }

    // -----------------------------------------------------------------------
    // 6. REPARACION
    // -----------------------------------------------------------------------
    // Repartir bien a la primera no siempre da el maximo. Se buscan
    // intercambios: si un puesto quedo vacio y hay alguien que lo podria coger,
    // pero ese alguien esta en un puesto que otra persona puede cubrir, se
    // cambian. Se repite mientras mejore.
    const intercambios = reparar({
        lista, candidatosPorPuesto, asignados, cabe, ocupa, suelta, propuesta
    });

    // Cada elemento interno lleva el puesto y el intervalo solo para poder
    // responder a las preguntas del reparto; aqui se devuelve solo la propuesta.
    const listaFinal = asignados.map(a => a.p);

    // -----------------------------------------------------------------------
    // INFORME
    // -----------------------------------------------------------------------
    const cubiertosAhora = { ...cubiertos };
    for (const a of listaFinal) {
        const clave = a.location_id + '|' + String(a.rol).toLowerCase();
        cubiertosAhora[clave] = (cubiertosAhora[clave] || 0) + 1;
    }

    const nombreDe = (id) => (locations.find(l => l.id === id) || {}).name || id;

    const porLocalizacion = {};
    for (const regla of reglas) {
        if (regla.cerrada) {
            porLocalizacion[regla.location_id] = {
                nombre: nombreDe(regla.location_id),
                cerrada: true,
                cumple: true,
                min_employees: regla.min_employees || 0,
                faltan: []
            };
            continue;
        }
        const faltan = [];
        for (const req of (regla.requirements || [])) {
            const clave = regla.location_id + '|' + req.role;
            const hay = cubiertosAhora[clave] || 0;
            const deficit = (req.count || 0) - hay;
            if (deficit > 0) {
                faltan.push({
                    rol: req.role,
                    faltan: deficit,
                    motivo: cubiertos[clave]
                        ? 'ya hay ' + cubiertos[clave] + ' y hacen falta ' + req.count
                        : 'sin nadie con este rol asignado',
                    certificaciones: req.required_certifications || []
                });
            }
        }
        porLocalizacion[regla.location_id] = {
            nombre: nombreDe(regla.location_id),
            min_employees: regla.min_employees || 0,
            cumple: faltan.length === 0,
            faltan
        };
    }

    const cubiertosIds = new Set(listaFinal.map(a => a.puesto_id));
    const sinCubrir = lista.filter(p => !cubiertosIds.has(p.id)).map(p => ({
        location: p.locationName,
        location_id: p.location_id,
        rol: p.rol,
        inicio: hhmm(p.intervalo.inicio),
        fin: hhmm(p.intervalo.fin),
        certificaciones: p.certificaciones,
        esRelleno: p.esRelleno,
        // Cuantas personas podian ocupar este puesto y por que se quedaron
        // fuera. Es lo que convierte un hueco negro en algo accionable.
        candidatosQuePodian: (candidatosPorPuesto.get(p.id) || []).length,
        sinCubrirPorque: diagnosticoSinCubrir(diagnostico.get(p.id))
    }));

    const incompletas = Object.values(porLocalizacion).filter(v => !v.cumple);

    // Localizaciones activas sin regla de personal configurada. Es un estado
    // DISTINTO de "cerrada" y de "cumplida": la primera significa "no se pide
    // personal", la segunda "se pide y se cumple". Antes no se devolvia y el
    // resumen podia decir "every minimum is covered" mientras el panel avisa de
    // que existen localizaciones sin reglas.
    const sinRegla = (contexto.locations || [])
        .filter(l => !(contexto.reglas || []).some(r => r.location_id === l.id))
        .map(l => l.id);

    return {
        fecha,
        asignaciones: listaFinal,
        intercambios,
        totalPuestos: lista.length,
        totalCubiertos: listaFinal.length,
        sinCubrir,
        porLocalizacion,
        incompletas: incompletas.map(v => v.nombre),
        sinRegla,
        minimosCubiertos: incompletas.length === 0 && sinCubrir.length === 0,
        todoCubierto: incompletas.length === 0 && sinCubrir.length === 0 && sinRegla.length === 0,
        descartes,
        compromisos: unicos.length,
        compromisosDuplicados: duplicados,
        sinVentana
    };
}

// Resume por que un puesto se ha quedado vacio, ordenado de la causa mas
// frecuente a la menos.
//
// Los motivos que empiezan por "ya tiene" se agrupan bajo uno solo: quien lee
// el resumen no necesita ver quince veces "ya tiene Student Dining", necesita
// saber que la razon de fondo es que la gente ya esta comprometida.
function diagnosticoSinCubrir(porQueNo) {
    if (!porQueNo || !porQueNo.size) {
        return [{ motivo: 'no hay empleados en el sistema', personas: 0 }];
    }

    const agrupado = new Map();
    for (const [motivo, personas] of porQueNo) {
        const clave = /^ya tiene/.test(motivo)
            ? 'ya tienen turno a esas horas (compromisos confirmados)'
            : motivo;
        agrupado.set(clave, (agrupado.get(clave) || 0) + personas);
    }

    return [...agrupado.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([motivo, personas]) => ({ motivo, personas }));
}

function propuesta(elegido, puesto, esIntercambio) {
    return {
        puesto_id: puesto.id,
        employee_id: elegido.empleado.id,
        employee_name: elegido.empleado.name,
        location_id: puesto.location_id,
        locationName: puesto.locationName,
        rol: puesto.rol,
        start_time: hhmm(puesto.intervalo.inicio),
        end_time: hhmm(puesto.intervalo.fin),
        certificaciones: puesto.certificaciones,
        avisos: elegido.avisos || [],
        motivo: (esIntercambio ? 'intercambio para cubrir ' : 'cubre un minimo de ')
            + puesto.locationName
            + (puesto.certificaciones.length ? ' (exige ' + puesto.certificaciones.join(', ') + ')' : ''),
        esRelleno: !!puesto.esRelleno,
        esIntercambio: !!esIntercambio
    };
}

// ============================================================================
//  REPARACION
// ============================================================================
// El caso que resuelve: A puede cubrir el puesto libre y el puesto ocupado, y
// B solo puede cubrir el ocupado. Repartiendo sin mirar mas lejos, A se lleva
// el ocupado y el libre se queda vacio. Aqui A pasa al libre y B recoge el
// ocupado: los mismos dos turnos cubiertos, pero se gana uno.
function reparar({ lista, candidatosPorPuesto, asignados, cabe, ocupa, suelta, propuesta }) {
    const intercambios = [];

    for (let vuelta = 0; vuelta < 10; vuelta++) {
        let mejoro = false;
        const cubiertos = new Set(asignados.map(a => a.p.puesto_id));

        for (const puesto of lista) {
            if (cubiertos.has(puesto.id)) continue;

            for (const candidato of candidatosPorPuesto.get(puesto.id) || []) {
                const emp = candidato.empleado;
                const usados = intervalosPorEmpleadoDe(asignados, emp.id);
                if (usados.length === 0) continue;              // sin nada que soltar
                if (!cabe(emp.id, puesto.intervalo)) continue;   // no le cabe el puesto libre

                // Se prueba a soltar cada uno de los turnos que lleva.
                for (const slot of usados) {
                    for (const otro of candidatosPorPuesto.get(slot.puesto_id) || []) {
                        if (otro.empleado.id === emp.id) continue;
                        if (!cabe(otro.empleado.id, slot.intervalo)) continue;

                        // El intercambio cabe: el de fuera se lleva el puesto
                        // vacio y este otro recoge el turno que se suelta.
                        const suyo = asignados.find(a => a.p.puesto_id === slot.puesto_id
                            && a.p.employee_id === emp.id);

                        intercambios.push({
                            puestoCubierto: puesto.locationName + ' (' + puesto.rol + ')',
                            sale: {
                                employee_id: suyo.p.employee_id,
                                employee_name: suyo.p.employee_name,
                                location: suyo.p.locationName,
                                rol: suyo.p.rol
                            },
                            recoge: {
                                employee_id: otro.empleado.id,
                                employee_name: otro.empleado.name,
                                location: suyo.p.locationName,
                                rol: suyo.p.rol
                            }
                        });

                        suelta(emp.id, slot.intervalo);
                        ocupa(emp.id, puesto.intervalo);
                        ocupa(otro.empleado.id, slot.intervalo);

                        suyo.p = propuesta(otro, slot.puesto, true);
                        asignados.push({ p: propuesta(candidato, puesto, false), puesto });

                        mejoro = true;
                        break;
                    }
                    if (mejoro) break;
                }
                if (mejoro) break;
            }
            if (mejoro) break;
        }

        if (!mejoro) break;
    }

    return intercambios;
}

// Los turnos que lleva ahora mismo una persona, con el puesto al que
// pertenece cada uno.
function intervalosPorEmpleadoDe(asignados, empId) {
    return asignados
        .filter(a => a.p.employee_id === empId)
        .map(a => ({ puesto_id: a.p.puesto_id, puesto: a.puesto, intervalo: a.puesto.intervalo }));
}

module.exports = {
    planificar,
    evaluarElegibilidad,
    calcularPuestos,
    papelesDe,
    FORMACIONES_POR_PAPEL,
    minutos,
    intervalo,
    seSolapan,
    maximoSinSolapar,
    hhmm
};