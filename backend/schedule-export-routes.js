// ============================================================================
//  ENDPOINT DE EXPORTACION DEL HORARIO
// ============================================================================
//  GET /api/:type/schedule/export.xlsx?date=YYYY-MM-DD
//  GET /api/:type/schedule/export.xlsx?date_from=...&date_to=...
//
//  Solo lee. No escribe nada en la base ni toca la logica de asignaciones: el
//  archivo se arma a partir de lo que ya hay guardado.
//
//  El rango de fechas se admite porque el encargo lo pide si existe. Con una
//  sola fecha se exporta ese dia; con un rango, se exportan todos los dias
//  pedidos, cada uno con su hoja Schedule/Import Data. Asi el archivo vuelve a
//  entrar igual que entraria cada dia por separado.
const XLSX = require('xlsx');
const { obtenerDatos } = require('./schedule-export-data');
const { construirLibro } = require('./schedule-export');

// ---------------------------------------------------------------------------
//  Validacion de fecha
// ---------------------------------------------------------------------------
// Se valida aqui y no se deja pasar al SQL: una fecha invalida llegaria a
// Postgres como NULL y devolveria el horario de "hoy" sin avisar.
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(s) {
    if (typeof s !== 'string' || !RE_FECHA.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const FechaError = (motivo) => Object.assign(new Error(motivo), { status: 400 });

// ---------------------------------------------------------------------------
//  Rango de fechas
// ---------------------------------------------------------------------------
// Se limita a 62 dias. Es lo que evita que alguien pida "del 2000 al 2030" y se
// quede el servidor generando un archivo enorme; y de paso avisa en vez de
// fallar por sorpresa.
const MAX_DIAS = 62;

function rangoDeFechas(query) {
    const { date, date_from, date_to } = query;

    if (date) {
        if (!fechaValida(date)) throw FechaError('fecha_invalida');
        return { fechas: [date], rango: false };
    }

    if (date_from || date_to) {
        if (!date_from || !date_to) throw FechaError('rango_incompleto');
        if (!fechaValida(date_from)) throw FechaError('fecha_invalida');
        if (!fechaValida(date_to)) throw FechaError('fecha_invalida');
        if (date_from > date_to) throw FechaError('rango_invertido');

        const desde = new Date(date_from + 'T00:00:00Z');
        const hasta = new Date(date_to + 'T00:00:00Z');
        const dias = Math.round((hasta - desde) / 86400000) + 1;
        if (dias > MAX_DIAS) {
            throw FechaError('rango_demasiado_largo');
        }
        const fechas = [];
        for (let i = 0; i < dias; i++) {
            const d = new Date(desde.getTime() + i * 86400000);
            fechas.push(d.toISOString().slice(0, 10));
        }
        return { fechas, rango: true };
    }

    // Sin fechas: se usa hoy, que es lo que muestra el horario por defecto.
    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-'
        + String(hoy.getMonth() + 1).padStart(2, '0') + '-'
        + String(hoy.getDate()).padStart(2, '0');
    return { fechas: [hoyStr], rango: false };
}

// ---------------------------------------------------------------------------
//  Montaje
// ---------------------------------------------------------------------------
function montarRutasExportacionHorario(app, getPool) {

    // Vista previa en JSON: que se va a exportar y con que avisos. Sirve para
    // las pruebas y para que el boton pueda informar sin abrir el archivo.
    app.get('/api/:type/schedule/export-preview', async (req, res) => {
        try {
            const pool = getPool(req.params.type);
            const { fechas } = rangoDeFechas(req.query);
            const detalle = [];
            for (const f of fechas) {
                const datos = await obtenerDatos(pool, f);
                detalle.push({ fecha: f, ...datos.informe });
            }
            res.json({
                rango: req.query.date_from ? { desde: req.query.date_from, hasta: req.query.date_to } : null,
                dias: fechas.length,
                detalle,
                totales: detalle.reduce((acc, d) => ({
                    asignaciones: acc.asignaciones + d.asignaciones,
                    seccionesConPersonal: acc.seccionesConPersonal + d.seccionesConPersonal,
                    supervisoresAsignados: acc.supervisoresAsignados + d.supervisoresAsignados
                }), { asignaciones: 0, seccionesConPersonal: 0, supervisoresAsignados: 0 })
            });
        } catch (err) {
            res.status(err.status || 500).json({ error: err.message });
        }
    });

    // El archivo.
    app.get('/api/:type/schedule/export.xlsx', async (req, res) => {
        const pool = getPool(req.params.type);
        try {
            const { fechas, rango } = rangoDeFechas(req.query);
            const wb = await armarLibro(pool, fechas);
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            const nombre = rango
                ? ('horario_' + fechas[0] + '_a_' + fechas[fechas.length - 1] + '.xlsx')
                : ('horario_' + fechas[0] + '.xlsx');

            res.setHeader('Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="' + nombre + '"');
            res.setHeader('Content-Length', buf.length);
            res.end(buf);
        } catch (err) {
            if (!res.headersSent) {
                res.status(err.status || 500).json({ error: err.message });
            }
        }
    });

    // Un dia: el libro tal cual, con las tres hojas de siempre y los nombres
    // exactos del archivo de referencia. Varios dias: una terna de hojas por dia.
    async function armarLibro(pool, fechas) {
        if (fechas.length === 1) {
            return construirLibro(await obtenerDatos(pool, fechas[0]));
        }
        return construirLibroVariosDias(pool, fechas);
    }
}

// ---------------------------------------------------------------------------
//  Varios dias en un solo archivo
// ---------------------------------------------------------------------------
// Cada dia tiene su propia terna de hojas, con el dia en el nombre:
// "Schedule", "Import Data", "Empleados" para el primer dia, y
// "Schedule 2026-10-15", "Import Data 2026-10-15" para los siguientes.
//
// En un libro solo puede haber una hoja con cada nombre, de ahi el sufijo. El
// orden es el del archivo de referencia: Schedule, Import Data, Empleados, y se
// repite la terna por dia.
//
// La hoja Empleados se escribe en todos los dias pero lleva el MISMO catalogo:
// es la lista de personas, no cambia entre dias. Se repite para que cada terna
// sea autonoma, que es lo que hace util un archivo de varios dias.
//
// Cada dia se construye con su propio libro intermedio porque XLSX reutiliza el
// objeto de una hoja si se le pasa la misma referencia dos veces: compartirla
// haria que al cambiar de dia se escribieran encima los datos del anterior.
async function construirLibroVariosDias(pool, fechas) {
    const wb = XLSX.utils.book_new();

    for (let i = 0; i < fechas.length; i++) {
        const fecha = fechas[i];
        const datos = await obtenerDatos(pool, fecha);
        const dia = construirLibro(datos);

        const nombre = (base) => (i === 0 ? base : base + ' ' + fecha);

        XLSX.utils.book_append_sheet(wb, dia.Sheets['Schedule'], nombre('Schedule'));
        XLSX.utils.book_append_sheet(wb, dia.Sheets['Import Data'], nombre('Import Data'));
        XLSX.utils.book_append_sheet(wb, dia.Sheets['Empleados'], nombre('Empleados'));

        // La hoja de días libres también sale en el export de varios días.
        // Si no se copiara, quien exportara un rango vería los turnos pero no
        // a la gente que no puede trabajar, que es justo la información que
        // hace falta para entender el hueco.
        if (dia.Sheets['Days Off']) {
            XLSX.utils.book_append_sheet(wb, dia.Sheets['Days Off'], nombre('Days Off'));
        }
    }
    return wb;
}

module.exports = { montarRutasExportacionHorario, rangoDeFechas, fechaValida, MAX_DIAS };
