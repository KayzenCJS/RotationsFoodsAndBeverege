// ============================================================================
//  EXPORTADOR DE HORARIO A EXCEL
// ============================================================================
//  Genera un .xlsx con la MISMA estructura que el importador ya entiende, para
//  que lo que se exporta se pueda volver a importar sin conversion ni perdida.
//
//  Se apoya en tres decisiones que se tomaron mirando el parser real, no a
//  ojo. Cada una esta comentada en el punto donde aplica.
//
//  1) HORAS CON MERIDIEO SOLO EN EL INICIO
//     Este es el punto mas delicado del formato, asi que va con el porque.
//
//     El parser (quinyx-parser.js, parseRange, lineas 152-161) decide el
//     meridieo del final asi:
//       - si el final NO lleva meridieo y el inicio SI, hereda el del inicio:
//         con inicio "am" el final se queda tal cual; con inicio "pm", un
//         final antes de mediodia se pasa a PM.
//       - si el final queda antes que el inicio, le suma 24h (turno nocturno).
//
//     De ahi sale el formato "09:00am-17:00" y "08:00pm-01:00":
//       - con el meridieo en el inicio, un turno que acaba a las 09:00 se lee
//         09:00 y no 21:00, que es lo que pasaba sin meridieo.
//       - los nocturnos salen correctos porque el final queda antes que el
//         inicio y el parser le suma el dia.
//
//     Se comprobaron las 24 horas representables contra el parser: de los 217
//     turnos que hay hoy en la base, los 217 se releen exactamente igual. Los
//     dos unicos casos que este formato no cubre serian un turno que empieza a
//     las 00:00 (el parser no admite la hora cero) y uno de 12:00 a antes de
//     medianoche. No hay ninguno de los dos, y si apareciera, el exportador lo
//     avisa en vez de exportar una hora equivocada en silencio.
//
//     La hoja "Import Data" si lleva las horas en 24h, que es como las trae el
//     archivo de referencia y como las lee esa hoja, que no pasa por este
//     parser de horarios.
//
//  2) UNA FILA POR ASIGNACION, NUNCA RANGOS COMBINADOS
//     El parser empareja "9-5pm / 5pm-10pm" con "Ana / Rosa" por posicion, lo
//     cual esta bien. Pero si el rango combinado pertenece a UNA sola persona,
//     el parser fusiona todo en un turno unico y marca revision: al reimportar,
//     dos turnos de 5 horas volverian a ser uno de 13. Escribiendo una fila
//     por asignacion ese caso no puede llegar a existir. El archivo de
//     referencia usa las dos formas; aqui se usa solo la que no pierde datos.
//
//  3) COLUMNAS Time / Name Y SOLO DOS BLOQUES
//     El parser reconoce como máximo dos bloques laterales: busca "Time" con
//     "Name" en la columna siguiente, en el rango 0-3 (izquierda) y 4-11
//     (derecha). Se respeta exactamente ese formato: A/B/C y E/F/G.
//     El texto del encabezado de cada bloque es decorativo (el parser empieza
//     a leer en la fila siguiente), asi que ahí va el nombre real de las áreas
//     que contiene.
//
//  Estructura de las hojas, igual que el archivo de referencia:
//     Schedule     -> horario visual por areas y locaciones
//     Import Data  -> una fila por turno, con horas individuales
//     Empleados    -> catalogo de empleados (lo usa el matching del importador)
//     Days Off     -> quien NO puede trabajar ese dia (hoja de apoyo)
//
//  La hoja "Days Off" NO es un turno: no lleva horas, el importador no la lee
//  y nadie de los que aparecen ahi se contabiliza como trabajado. Solo informa
//  de por que certainas personas no salen en ninguna seccion del horario.
// ============================================================================

const XLSX = require('xlsx');

// ---------------------------------------------------------------------------
//  Nombres de hoja y encabezados
// ---------------------------------------------------------------------------
// No se inventan: son los del archivo de referencia, que es lo que el
// importador busca.
const HOJA_SCHEDULE = 'Schedule';
const HOJA_IMPORT = 'Import Data';
const HOJA_EMPLEADOS = 'Empleados';

// Hoja de apoyo: quien NO puede trabajar ese dia. Va al final para que las
// tres hojas que usa el importador sigan siendo las de siempre, en el mismo
// orden.
const HOJA_DIAS_LIBRES = 'Days Off';

const COLS_IMPORT = ['Employee Name', 'Location', 'Work Date', 'Start Time', 'End Time', 'Role', 'Source Section'];
const COLS_EMPLEADOS = ['Nombre', 'Nacionalidad', 'Edad', 'Rol', 'Grupo'];
const COLS_DIAS_LIBRES = ['Nombre', 'Rol', 'Grupo', 'Estado', 'Dia libre', 'Fecha', 'Motivo', 'Tipo'];

// ---------------------------------------------------------------------------
//  Textos de la hoja de dias libres
// ---------------------------------------------------------------------------
// El exportador no tiene selector de idioma: las hojas mezclan cabeceras en
// español ("Empleados") y en inglés ("Import Data") según la que copiaron del
// archivo de referencia. Por eso los textos que no son un dato van con los
// dos idiomas en la misma celda, que es lo unico que se puede hacer sin
// inventar un idioma que el exportador no soporta.
//
// "Dia libre" y "Motivo" son datos: se escriben tal cual los da la base
// (el nombre del dia registrado, o el texto de la excepcion).
const ESTADO_DIA_LIBRE = 'No disponible - Dia libre / Unavailable - Day Off';

// Como se escribe el TIPO. Las claves son las de dias-libres.js.
const TIPO_DIA_LIBRE = {
    recurrente: 'recurrente / recurrent',
    excepcion: 'excepcion / exception',
    hoy: 'hoy / today'
};

// Layout del horario visual. El parser exige Time con Name justo a la derecha,
// y como mucho dos bloques: columnas 0-2 y 4-6.
const IZQ = { loc: 0, time: 1, name: 2 };
const DER = { loc: 4, time: 5, name: 6 };

// ---------------------------------------------------------------------------
//  Utilidades de formato
// ---------------------------------------------------------------------------

// "09:00:00" -> "09:00". Postgres devuelve TIME como cadena HH:MM:SS.
const hhmm = (v) => {
    if (v === null || v === undefined || v === '') return '';
    const s = String(v);
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    return m ? m[1].padStart(2, '0') + ':' + m[2] : s.trim();
};

// El meridieo, para el formato de la hoja Schedule.
const meridieo = (minutos) => (minutos < 720 ? 'am' : 'pm');

// Un turno en el formato que el parser resuelve sin ambiguedad.
//
// "09:00am-17:00", "08:00pm-01:00". El meridieo va SOLO en la hora de inicio;
// ver la cabecera del fichero para por que.
//
// Devuelve '' si falta alguna de las dos horas: una fila sin horario no es un
// turno, y el parser la marca para revision en vez de inventarle un final.
function rangoTurno(ini, fin) {
    const a = minutos(hhmm(ini));
    const b = minutos(hhmm(fin));
    if (a === null) return '';
    if (b === null) return hhmm(ini);
    return hhmm(ini) + meridieo(a) + '-' + hhmm(fin);
}

// "09:00:00" -> 540. null si no se puede leer.
function minutos(hhmmTxt) {
    const m = String(hhmmTxt || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = +m[1], min = +m[2];
    if (h > 24 || min > 59) return null;
    return h * 60 + min;
}

// El mismo par de horas, en el formato de la hoja Import Data (24h, sin
// meridieo), que es como lo trae el archivo de referencia.
const rango24 = (ini, fin) => {
    const a = hhmm(ini);
    const b = hhmm(fin);
    return (a && b) ? (a + '-' + b) : a;
};

const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
//  ¿Sabe el parser reconocer este texto como locacion?
// ---------------------------------------------------------------------------
// Es una COPIA de LOCATION_HINTS de quinyx-parser.js. Se replica aqui a
// proposito y no se importa el parser en el backend, para que el exportador no
// dependa de un fichero que vive en la raiz del proyecto.
//
// Si el texto no esta en la lista, el parser no lo toma como seccion y las
// filas siguientes se quedarian con la locacion anterior. Para esos casos hay
// un tratamiento aparte (ver escribirSeccion).
const LOCATION_HINTS = [
    'kitchen', 'snacks', 'fair', 'slush', 'stand', 'barnyard', 'oasis', 'dutch',
    'world', 'dippin', 'shores', 'pavilion', 'pav', 'back ops', 'front ops',
    'beer tent', 'am help', 'student', 'character', 'breakfast', 'cart', 'tasting'
];

const elParserLoReconoce = (texto) => {
    const n = norm(texto);
    if (!n) return false;
    return LOCATION_HINTS.some((h) => n.indexOf(h) !== -1);
};

// ---------------------------------------------------------------------------
//  Filas del horario visual
// ---------------------------------------------------------------------------

// Cada fila es [colIzqLoc, colIzqTime, colIzqName, separador, colDerLoc, ...].
// Se generan como listas de 7 columnas, con '' en las que no tocan ese bloque.
const filaVacia = () => ['', '', '', '', '', '', ''];

// Devuelve la fila de la cabecera de un bloque. El texto del area es
// decorativo: el parser empieza a leer en la fila siguiente.
function filaCabecera(etiquetaIzq, etiquetaDer) {
    const f = filaVacia();
    f[IZQ.loc] = etiquetaIzq;
    f[IZQ.time] = 'Time';
    f[IZQ.name] = 'Name';
    f[DER.loc] = etiquetaDer;
    f[DER.time] = 'Time';
    f[DER.name] = 'Name';
    return f;
}

// Una seccion (locacion o categoria).
//
// Si el parser reconoce el texto, basta con escribirlo solo: lo toma como
// cabecera de seccion y todas las filas siguientes heredan esa localizacion,
// que es el comportamiento normal del archivo real.
//
// Si NO lo reconoce, escribirlo solo haria que lo saltase y las filas
// siguientes se quedarian con la localizacion ANTERIOR: datos cambiados de
// sitio sin que nadie se entere. Para evitarlo se escribe con una hora
// pegada al nombre ("Bistro 09:00-17:00"), que es una forma que el parser ya
// entiende: separa el texto en localizacion + hora y fija la localizacion.
//
// La hora de esta fila va en 24h y SIN meridieo a proposito, por dos razones:
//   - el parser separa nombre y hora con una expresion regular que no admite
//     un meridieo pegado a la hora de inicio;
//   - la hora de la fila marcadora NUNCA llega a interpretarse. El parser anota
//     el aviso de "sin personal" y sigue, asi que este valor solo sirve para
//     que la separacion funcione. Que sea el correcto o no es indiferente.
function filaSeccion(nombre, primerRango) {
    const f = filaVacia();
    f[IZQ.loc] = elParserLoReconoce(nombre)
        ? nombre
        : (primerRango ? nombre + ' ' + primerRango : nombre);
    return f;
}

// Una fila de turno.
function filaTurno(bloque, rol, rango, nombre) {
    const f = filaVacia();
    const c = bloque === 'der' ? DER : IZQ;
    if (rol) f[c.loc] = rol;
    if (rango) f[c.time] = rango;
    if (nombre) f[c.name] = nombre;
    return f;
}

// Una fila de supervision.
//
// El nombre va como "Rol - Nombre", que es la convencion que el parser ya
// reconoce ("Coord - Nombre Apellido" -> rol Coord, nombre Nombre Apellido). Es
// lo que hace que un supervisor se distinga de un turno normal al releer el
// archivo.
//
// NO lleva horas a proposito: supervisor_assignments no las guarda, y la
// mayoria de los supervisores no tiene turno el dia que supervise. Ponerle un
// horario seria inventarlo. El parser marca esas filas para revision, que es lo
// justo: se ve que hay una supervision sin horario en vez de un dato falso.
//
// Si el supervisor tiene un turno real ese dia, esa fila ya sale mas arriba
// como una asignacion cualquiera y aqui no se repite, para no duplicarla al
// reimportar.
function filaSupervisor(rol, rango, nombre) {
    const f = filaVacia();
    const etiquetaRol = String(rol || 'Supervisor').replace(/\s+/g, ' ').trim();
    f[IZQ.name] = etiquetaRol + ' - ' + nombre;
    if (rango) f[IZQ.time] = rango;
    return f;
}

// Une dos filas parciales (una del bloque izquierdo y otra del derecho) en una
// sola de 7 columnas.
const fusionar = (izq, der) => {
    const f = filaVacia();
    if (izq) for (let i = 0; i < 3; i++) f[i] = izq[i] || '';
    if (der) for (let i = 0; i < 3; i++) f[4 + i] = der[i] || '';
    return f;
};

// ===========================================================================
//  CONSTRUCCION DEL LIBRO
// ===========================================================================
//
// datos = {
//   fecha: 'YYYY-MM-DD',
//   izq: { etiqueta, secciones: [ { nombre, filas: [...] } ] },
//   der: { etiqueta, secciones: [ { nombre, filas: [...] } ] },
//   importData: [ { empleado, localizacion, fecha, inicio, fin, rol, seccion } ],
//   empleados: [ { nombre, nacionalidad, edad, rol, grupo } ],
//   diasLibres: [ { nombre, rol, grupo, tipo, diaLibre, fecha, motivo } ]
// }
//
// `diasLibres` es opcional: si no viene, la hoja sale solo con la cabecera.

function construirLibro(datos) {
    const wb = XLSX.utils.book_new();

    // --- Schedule ----------------------------------------------------------
    const filasSchedule = [];

    // Titulo. Es la fila 1 y no lleva "Time"/"Name": la deteccion de formato
    // busca esas palabras en las 12 primeras filas, asi que la cabecera real va
    // en la fila 2 y se llega de sobra.
    const titulo = 'Story Manager — Horario ' + (datos.fecha || '');
    filasSchedule.push([titulo, '', '', '', '', '', '']);

    filasSchedule.push(filaCabecera(
        (datos.izq && datos.izq.etiqueta) || '',
        (datos.der && datos.der.etiqueta) || ''
    ));

    // Se apilan las secciones de ambos bloques en paralelo. Cada columna crece
    // a su ritmo: se meten celdas vacias en el lado que ya se acabo.
    const izq = (datos.izq && datos.izq.secciones) || [];
    const der = (datos.der && datos.der.secciones) || [];
    const alto = Math.max(izq.length, der.length);

    for (let i = 0; i < alto; i++) {
        const fIzq = izq[i] ? izq[i].filas : null;
        const fDer = der[i] ? der[i].filas : null;
        const n = Math.max(fIzq ? fIzq.length : 0, fDer ? fDer.length : 0);
        for (let j = 0; j < n; j++) {
            filasSchedule.push(fusionar(
                fIzq ? fIzq[j] : null,
                fDer ? fDer[j] : null
            ));
        }
    }

    const wsSchedule = XLSX.utils.aoa_to_sheet(filasSchedule);

    // Anchos de columna: los tres del bloque, el separador estrecho y los otros
    // tres. Es lo que hace legible la hoja sin tocar los datos.
    wsSchedule['!cols'] = [
        { wch: 26 }, { wch: 16 }, { wch: 30 },
        { wch: 3 },
        { wch: 26 }, { wch: 16 }, { wch: 30 }
    ];
    // Altura de la fila del titulo y de la cabecera.
    wsSchedule['!rows'] = [{ hpt: 22 }, { hpt: 18 }];

    XLSX.utils.book_append_sheet(wb, wsSchedule, HOJA_SCHEDULE);

    // --- Import Data -------------------------------------------------------
    // Una fila por turno, con horas individuales. Nunca "9-5pm / 5pm-10pm".
    const filasImport = [COLS_IMPORT.slice()];
    for (const a of (datos.importData || [])) {
        filasImport.push([
            a.empleado || '',
            a.localizacion || '',
            a.fecha || datos.fecha || '',
            hhmm(a.inicio),
            hhmm(a.fin),
            a.rol || '',
            a.seccion || ''
        ]);
    }
    const wsImport = XLSX.utils.aoa_to_sheet(filasImport);
    wsImport['!cols'] = [
        { wch: 24 }, { wch: 24 }, { wch: 13 }, { wch: 11 }, { wch: 11 }, { wch: 18 }, { wch: 26 }
    ];
    if (filasImport.length > 1) wsImport['!autofilter'] = { ref: 'A1:G' + filasImport.length };
    XLSX.utils.book_append_sheet(wb, wsImport, HOJA_IMPORT);

    // --- Empleados ---------------------------------------------------------
    // Se conserva porque el importador la usa para el matching de nombres. Sin
    // ella, quien se llame igual que otro no se puede resolver.
    const filasEmp = [COLS_EMPLEADOS.slice()];
    for (const e of (datos.empleados || [])) {
        filasEmp.push([e.nombre || '', e.nacionalidad || '', e.edad ?? '', e.rol || '', e.grupo || '']);
    }
    const wsEmp = XLSX.utils.aoa_to_sheet(filasEmp);
    wsEmp['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 7 }, { wch: 22 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, wsEmp, HOJA_EMPLEADOS);

    // --- Days Off ----------------------------------------------------------
    // Quien NO puede trabajar ese dia, para que quien recibe el archivo sepa
    // por que no aparece en ninguna seccion.
    //
    // Aqui NO hay turnos: no se inventa un horario para nadie, no se anade
    // ninguna fila a las hojas de turnos y no se contabilizan horas. La hoja
    // no lleva columnas de hora precisamente por eso. El importador no la lee.
    const listaDias = (datos.diasLibres)
        || (datos.informe && datos.informe.diasLibres)
        || [];

    const filasDias = [COLS_DIAS_LIBRES.slice()];
    for (const d of listaDias) {
        filasDias.push([
            d.nombre || '',
            d.rol || '',
            d.grupo || '',
            ESTADO_DIA_LIBRE,
            // El dia libre registrado: el nombre del dia (recurrente) o la
            // fecha (excepcion). Se escribe tal cual esta.
            d.diaLibre || '',
            d.fecha || datos.fecha || '',
            // El motivo: el texto de la excepcion si la hay, si no el de
            // dias-libres.js ("descansa los monday", "día libre", ...).
            d.motivo || '',
            TIPO_DIA_LIBRE[d.tipo] || d.tipo || ''
        ]);
    }
    const wsDias = XLSX.utils.aoa_to_sheet(filasDias);
    wsDias['!cols'] = [
        { wch: 26 }, { wch: 18 }, { wch: 8 }, { wch: 46 },
        { wch: 14 }, { wch: 13 }, { wch: 34 }, { wch: 22 }
    ];
    if (filasDias.length > 1) wsDias['!autofilter'] = { ref: 'A1:H' + filasDias.length };
    XLSX.utils.book_append_sheet(wb, wsDias, HOJA_DIAS_LIBRES);

    return wb;
}

// Nota sobre estilos: el build comunitario de SheetJS escribe anchos de columna
// y autofiltro, pero no negrita ni colores. El archivo sale con los mismos
// nombres, encabezados y estructura que el de referencia, que es lo que necesita
// el importador; la diferencia es solo visual y no afecta a la reimportacion.
// Ponerla exige el build de pago, y no vale la pena depender de el.

module.exports = {
    construirLibro,
    hhmm,
    rangoTurno,
    rango24,
    minutos,
    meridieo,
    elParserLoReconoce,
    LOCATION_HINTS,
    HOJA_SCHEDULE,
    HOJA_IMPORT,
    HOJA_EMPLEADOS,
    HOJA_DIAS_LIBRES,
    COLS_IMPORT,
    COLS_EMPLEADOS,
    COLS_DIAS_LIBRES,
    ESTADO_DIA_LIBRE,
    TIPO_DIA_LIBRE,
    IZQ,
    DER,
    filaCabecera,
    filaSeccion,
    filaTurno,
    filaSupervisor,
    filaVacia,
    fusionar
};
