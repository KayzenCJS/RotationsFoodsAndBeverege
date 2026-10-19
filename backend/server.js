const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { foods, retail, testConnections } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Timezone configuration
const TIMEZONE = 'America/Santo_Domingo';

function getCurrentDateInTimezone() {
    const now = new Date();
    const dateInTimezone = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    return dateInTimezone.toISOString().split('T')[0];
}

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend files from project root
//
// Sin cache: durante el desarrollo, si no, el navegador se queda con un
// script.js viejo en memoria y se depura código que ya no existe en disco
// (pasó con un fallo de night's turnos que parecía no estar arreglado).
app.use(express.static(path.join(__dirname, '..'), {
    etag: true,
    lastModified: true,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
}));

// ============================================
// HELPERS
// ============================================

const getPool = (type) => type === 'retail' ? retail : foods;

const getBuildingTable = (locationId) => {
    const tables = {
        'pixie-kitchen': 'pixie_kitchen_assignments',
        'barnyard-pizza': 'barnyard_pizza_assignments',
        'guard-house-snacks': 'guard_house_snacks_assignments',
        'food-fair': 'food_fair_assignments',
        'dutch-village-ice-cream': 'dutch_village_ice_cream_assignments',
        'slush-factory': 'slush_factory_assignments',
        'dippin-dots': 'dippin_dots_assignments',
        'sandwich-oasis': 'sandwich_oasis_assignments',
        'farm-stand': 'farm_stand_assignments',
        'world-pavilion': 'world_pavilion_assignments',
        'teddys-oasis': 'teddys_oasis_assignments',
        'poblano-cantina': 'poblano_cantina_assignments',
        'stockyard': 'stockyard_assignments',
        'lets-pretend': 'lets_pretend_assignments',
        'miss-muffets-market': 'miss_muffets_market_assignments',
        'yum-yum-junction': 'yum_yum_junction_assignments',
        'whistle-stop': 'whistle_stop_assignments'
    };
    return tables[locationId];
};

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
    try {
        await foods.query('SELECT 1');
        await retail.query('SELECT 1');
        res.json({ status: 'ok', databases: ['storyland_foods', 'storyland_retail'] });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ============================================
// EMPLOYEES
// ============================================

// Get all employees
app.get('/api/:type/employees', async (req, res) => {
    try {
        const pool = getPool(req.params.type);

        // If type is 'retail', fetch employees from foods database that have 'retail' training
        if (req.params.type === 'retail') {
            const foodsPool = getPool('foods');
            const result = await foodsPool.query(`
                SELECT e.*,
                       array_agg(DISTINCT et.training_name) FILTER (WHERE et.training_name IS NOT NULL) as trainings,
                       ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                       ea.schedule_start_time, ea.schedule_end_time, ea.days_off, ea.holidays
                FROM employees e
                LEFT JOIN employee_trainings et ON e.id = et.employee_id
                LEFT JOIN employee_availability ea ON e.id = ea.employee_id
                WHERE e.id IN (
                    SELECT DISTINCT employee_id
                    FROM employee_trainings
                    WHERE training_name = 'retail'
                )
                GROUP BY e.id, ea.id
                ORDER BY e.id
            `);
            res.json(result.rows);
        } else {
            const result = await pool.query(`
                SELECT e.*,
                       array_agg(DISTINCT et.training_name) FILTER (WHERE et.training_name IS NOT NULL) as trainings,
                       ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                   ea.schedule_start_time, ea.schedule_end_time, ea.days_off, ea.holidays
                FROM employees e
                LEFT JOIN employee_trainings et ON e.id = et.employee_id
                LEFT JOIN employee_availability ea ON e.id = ea.employee_id
                GROUP BY e.id, ea.id
                ORDER BY e.id
            `);
            res.json(result.rows);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single employee
app.get('/api/:type/employees/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(`
            SELECT e.*, 
                   array_agg(DISTINCT et.training_name) FILTER (WHERE et.training_name IS NOT NULL) as trainings,
                   ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                   ea.schedule_start_time, ea.schedule_end_time, ea.days_off, ea.holidays
            FROM employees e
            LEFT JOIN employee_trainings et ON e.id = et.employee_id
            LEFT JOIN employee_availability ea ON e.id = ea.employee_id
            WHERE e.id = $1
            GROUP BY e.id, ea.id
        `, [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create employee
app.post('/api/:type/employees', async (req, res) => {
    // Always use foods database for employee creation (Retail uses Foods employees)
    const client = getPool('foods');
    try {
        const { name, nationality, age, role, group_id: groupIdRaw, hire_date, trainings, availability } = req.body;
        // char(1): vacio se guarda como espacio = "Sin grupo".
        const group_id = normalizeGroupId(groupIdRaw);

        // hire_date vacio o ausente no debe romper el guardado.
        const hireDateVacio = hire_date === undefined || hire_date === null || String(hire_date).trim() === '';
        const hireDateFinal = hireDateVacio
            ? new Date().toISOString().slice(0, 10)
            : String(hire_date).slice(0, 10);
        // Grupo D (Bistro) solo admite bartender / cashier / cook.
        if (group_id === 'D' && !GROUP_D_ROLES.includes(String(role || '').toLowerCase())) {
            return res.status(400).json({
                error: 'invalid_group_role',
                message: 'El Grupo D (Bistro) solo admite roles bartender, cashier o cook.'
            });
        }
        // Grupo OPS/Supervisor. Si no viene, NULL: el empleado no es OPS.
        const ops_group = normalizeOpsGroup(req.body.ops_group);

        // Una letra de grupo no es una capacitacion (ver sanitizeTrainings).
        const cleanTrainings = sanitizeTrainings(trainings);

        // Automatically determine if employee is versatile based on trainings
        const trainingsArray = cleanTrainings;
        const roleRequirements = {
            'cashier': ['pos-training', 'cash-register'],
            'server': ['customer-service', 'pos-training'],
            'cook': ['grill-training', 'griddle-training', 'fryer-training', 'oven-training'],
            'bartender': ['nh-alcohol-certification', 'pos-training'],
            'dishwasher': ['dishwashing']
        };

        let qualifiedRoles = 0;
        for (const [roleName, requiredTrainings] of Object.entries(roleRequirements)) {
            const hasRequiredTrainings = requiredTrainings.some(training =>
                trainingsArray.includes(training)
            );
            if (hasRequiredTrainings) {
                qualifiedRoles++;
            }
        }

        const is_versatile = qualifiedRoles >= 3;

        await client.query('BEGIN');

        const empResult = await client.query(
            'INSERT INTO employees (name, nationality, age, role, group_id, hire_date, is_versatile, ops_group) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
            [name, nationality, age, role, group_id, hireDateFinal, is_versatile, ops_group]
        );

        const empId = empResult.rows[0].id;

        // Insert trainings
        if (cleanTrainings.length > 0) {
            // Insert trainings one by one to avoid parameter limit
            for (const training of cleanTrainings) {
                await client.query(
                    'INSERT INTO employee_trainings (employee_id, training_name) VALUES ($1, $2) ON CONFLICT (employee_id, training_name) DO NOTHING',
                    [empId, training]
                );
            }
        }

        // Insert availability
        await client.query(`
            INSERT INTO employee_availability (employee_id, is_on_break, is_on_training, is_day_off, is_holiday,
                schedule_start_time, schedule_end_time, days_off, holidays)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            empId,
            availability?.is_on_break || false,
            availability?.is_on_training || false,
            availability?.is_day_off || false,
            availability?.is_holiday || false,
            availability?.schedule?.startTime || '09:00',
            availability?.schedule?.endTime || '18:00',
            availability?.daysOff || ['sunday'],
            availability?.holidays || []
        ]);

        await client.query('COMMIT');

        // Fetch the complete employee data
        const result = await client.query(`
            SELECT e.*,
                   array_agg(DISTINCT et.training_name) FILTER (WHERE et.training_name IS NOT NULL) as trainings,
                   ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                   ea.schedule_start_time, ea.schedule_end_time, ea.days_off, ea.holidays
            FROM employees e
            LEFT JOIN employee_trainings et ON e.id = et.employee_id
            LEFT JOIN employee_availability ea ON e.id = ea.employee_id
            WHERE e.id = $1
            GROUP BY e.id, ea.id
        `, [empId]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Update employee
app.put('/api/:type/employees/:id', async (req, res) => {
    // Always use foods database for employee updates (Retail uses Foods employees)
    const client = getPool('foods');
    try {
        const { name, nationality, age, role, group_id: groupIdRaw, hire_date, trainings, availability } = req.body;
        // char(1): vacio se guarda como espacio = "Sin grupo".
        const group_id = normalizeGroupId(groupIdRaw);

        // hire_date vacio o ausente no debe romper el guardado.
        const hireDateVacio = hire_date === undefined || hire_date === null || String(hire_date).trim() === '';
        const hireDateFinal = hireDateVacio
            ? new Date().toISOString().slice(0, 10)
            : String(hire_date).slice(0, 10);
        // Grupo D (Bistro) solo admite bartender / cashier / cook.
        if (group_id === 'D' && !GROUP_D_ROLES.includes(String(role || '').toLowerCase())) {
            return res.status(400).json({
                error: 'invalid_group_role',
                message: 'El Grupo D (Bistro) solo admite roles bartender, cashier o cook.'
            });
        }
        // Grupo OPS/Supervisor. Si no viene, NULL: el empleado no es OPS.
        const ops_group = normalizeOpsGroup(req.body.ops_group);

        // Una letra de grupo no es una capacitacion (ver sanitizeTrainings).
        const cleanTrainings = sanitizeTrainings(trainings);

        // Automatically determine if employee is versatile based on trainings
        const trainingsArray = cleanTrainings;
        const roleRequirements = {
            'cashier': ['pos-training', 'cash-register'],
            'server': ['customer-service', 'pos-training'],
            'cook': ['grill-training', 'griddle-training', 'fryer-training', 'oven-training'],
            'bartender': ['nh-alcohol-certification', 'pos-training'],
            'dishwasher': ['dishwashing']
        };

        let qualifiedRoles = 0;
        for (const [roleName, requiredTrainings] of Object.entries(roleRequirements)) {
            const hasRequiredTrainings = requiredTrainings.some(training =>
                trainingsArray.includes(training)
            );
            if (hasRequiredTrainings) {
                qualifiedRoles++;
            }
        }

        const is_versatile = qualifiedRoles >= 3;

        console.log('Update employee request:', { id: req.params.id, name, nationality, age, role, group_id, trainingsCount: cleanTrainings.length });

        await client.query('BEGIN');

        const hireFinal = hireDateVacio
            ? ((await client.query('SELECT hire_date FROM employees WHERE id = $1', [req.params.id])).rows[0] || {}).hire_date
            : hireDateFinal;
        await client.query(
            'UPDATE employees SET name = $1, nationality = $2, age = $3, role = $4, group_id = $5, hire_date = $6, is_versatile = $7, ops_group = $8, updated_at = NOW() WHERE id = $9',
            [name, nationality, age, role, group_id, hireFinal, is_versatile, ops_group, req.params.id]
        );

        // Update trainings.
        // ANTES: DELETE de todas y reinserción de las enviadas. Eso destruía las
        // capacitaciones del empleado si el cliente enviaba la lista vacía o no
        // la enviaba (por ejemplo al reenviar el GET, que sin FILTER traía
        // [null]). Ahora solo se sincroniza lo que viene informado, y la
        // diferencia se calcula para no borrar nada por accidente.
        if (Array.isArray(trainings)) {
            const deseadas = cleanTrainings;
            const actuales = (await client.query(
                'SELECT training_name FROM employee_trainings WHERE employee_id = $1',
                [req.params.id])).rows.map((r) => r.training_name);

            const aBorrar = actuales.filter((t) => !deseadas.includes(t));
            const aAnadir = deseadas.filter((t) => !actuales.includes(t));

            for (const t of aBorrar) {
                await client.query(
                    'DELETE FROM employee_trainings WHERE employee_id = $1 AND training_name = $2',
                    [req.params.id, t]);
            }
            for (const t of aAnadir) {
                await client.query(
                    'INSERT INTO employee_trainings (employee_id, training_name) VALUES ($1, $2) ON CONFLICT (employee_id, training_name) DO NOTHING',
                    [req.params.id, t]);
            }
            console.log(`Trainings sync: -${aBorrar.length} +${aAnadir.length} (actual ${actuales.length} -> ${deseadas.length})`);
        }
        // Si trainings no viene (undefined), no se toca nada: las capacitaciones
        // del empleado quedan intactas.

        // Update or insert availability
        const availabilityExists = await client.query(
            'SELECT id FROM employee_availability WHERE employee_id = $1',
            [req.params.id]
        );

        if (availabilityExists.rows.length > 0) {
            await client.query(`
                UPDATE employee_availability
                SET is_on_break = $1, is_on_training = $2, is_day_off = $3, is_holiday = $4,
                    schedule_start_time = $5, schedule_end_time = $6, days_off = $7, holidays = $8, updated_at = NOW()
                WHERE employee_id = $9
            `, [
                availability?.is_on_break || false,
                availability?.is_on_training || false,
                availability?.is_day_off || false,
                availability?.is_holiday || false,
                availability?.schedule_start_time || availability?.schedule?.startTime || '09:00',
                availability?.schedule_end_time || availability?.schedule?.endTime || '18:00',
                availability?.days_off || availability?.daysOff || ['sunday'],
                availability?.holidays || [],
                req.params.id
            ]);
        } else {
            await client.query(`
                INSERT INTO employee_availability (employee_id, is_on_break, is_on_training, is_day_off, is_holiday,
                    schedule_start_time, schedule_end_time, days_off, holidays)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                req.params.id,
                availability?.is_on_break || false,
                availability?.is_on_training || false,
                availability?.is_day_off || false,
                availability?.is_holiday || false,
                availability?.schedule_start_time || availability?.schedule?.startTime || '09:00',
                availability?.schedule_end_time || availability?.schedule?.endTime || '18:00',
                availability?.days_off || availability?.daysOff || ['sunday'],
                availability?.holidays || []
            ]);
        }

        await client.query('COMMIT');

        // Fetch the complete employee data
        const result = await client.query(`
            SELECT e.*,
                   array_agg(DISTINCT et.training_name) FILTER (WHERE et.training_name IS NOT NULL) as trainings,
                   ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                   ea.schedule_start_time, ea.schedule_end_time, ea.days_off, ea.holidays
            FROM employees e
            LEFT JOIN employee_trainings et ON e.id = et.employee_id
            LEFT JOIN employee_availability ea ON e.id = ea.employee_id
            WHERE e.id = $1
            GROUP BY e.id, ea.id
        `, [req.params.id]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating employee:', err);
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Delete employee
app.delete('/api/:type/employees/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
        res.json({ message: 'Employee deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// LOCATIONS
// ============================================

// Get all locations
app.get('/api/:type/locations', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(`
            SELECT l.*, array_agg(DISTINCT lrr.role_name) as required_roles
            FROM locations l
            LEFT JOIN location_required_roles lrr ON l.id = lrr.location_id
            GROUP BY l.id
            ORDER BY l.id
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single location
app.get('/api/:type/locations/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(`
            SELECT l.*, array_agg(DISTINCT lrr.role_name) as required_roles
            FROM locations l
            LEFT JOIN location_required_roles lrr ON l.id = lrr.location_id
            WHERE l.id = $1
            GROUP BY l.id
        `, [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ASSIGNMENTS
// ============================================

// Tipos de asignación. LOCATION es el histórico y el valor por defecto.
// NOSTALGIA_NIGHT son los turnos de tarde/noche: misma tabla `assignments`,
// mismo empleado, misma fecha, pero assignment_type propio para que no se
// mezclen con el horario diurno en la interfaz.
const ASSIGNMENT_TYPES = ['LOCATION', 'OPS', 'EXTRA_HOURS', 'SUPPORT', 'EXTRA_TASK', 'NOSTALGIA_NIGHT'];

// Grupos OPS/Supervisor validos (seccion 1). NULL = el empleado no es OPS.
const OPS_GROUPS = ['front_ops', 'ff-pav_ops', 'back_ops', 'oasis-dutch_ops'];

// Grupo D (Bistro / Dunkin' Donuts). Solo estos tres roles pueden estar en el:
// un bartender, cashier o cook. Cualquier otro rol se rechaza al guardar.
const GROUP_D_ROLES = ['bartender', 'cashier', 'cook'];

// employees.group_id es char(1) y PostgreSQL guarda '' como un espacio.
// Se normaliza siempre a ' ' para que la app muestre "Sin grupo".
function normalizeGroupId(value) {
    const v = String(value == null ? '' : value).trim().toUpperCase().charAt(0);
    if (['A', 'B', 'C', 'D'].includes(v)) return v;
    return ' ';                      // sin grupo
}

function groupIdIsValid(value) {
    return ['A', 'B', 'C', 'D', ' ', ''].includes(String(value == null ? ' ' : value).trim().toUpperCase().charAt(0) || ' ');
}

// Filtra la lista de capacitaciones que llega del cliente.
//
// Necesario porque el formulario de empleado tiene mas casillas que las de
// capacitaciones: las de "Grupos adicionales", con los valores A, B, C y D. Un
// selector generico las guardaba como certificaciones y Eduardo se quedo con
// cuatro filas que en realidad eran letras de grupo. Aqui se corta el problema
// de raiz: una letra de grupo no es una capacitacion, y un valor vacio tampoco.
//
// No se aplica una lista blanca de las capacitaciones conocidas: el catalogo
// son los propios datos, y tiene que poder crecer sin tocar codigo.
function sanitizeTrainings(trainings) {
    if (!Array.isArray(trainings)) return [];
    const vistos = new Set();
    const fuera = [];
    for (const raw of trainings) {
        const t = String(raw == null ? '' : raw).trim();
        if (!t) continue;                                  // vacio
        if (['A', 'B', 'C', 'D'].includes(t.toUpperCase()) && t.length === 1) {
            fuera.push(t); continue;                       // letra de grupo
        }
        if (vistos.has(t)) continue;                       // duplicado
        vistos.add(t);
    }
    if (fuera.length) {
        console.warn('[employees] princípios de grupo descartados de las capacitaciones: ' +
                     fuera.join(', '));
    }
    return [...vistos];
}

// El rol administrativo solo habilita estas certificaciones: nada de
// habilidades operativas, nada de limpieza y seguridad.
const ADMIN_TRAININGS = [
    'dunkin-trained',
    'food-safety',
    'pos-training',
    'nh-alcohol-certification'
];

function normalizeOpsGroup(value) {
    if (value === null || value === undefined || value === '') return null;
    const v = String(value).trim().toLowerCase().replace(/\s+/g, '-');
    return OPS_GROUPS.includes(v) ? v : null;
}

// Normaliza el tipo. Si no viene, o solo viene location_id, es LOCATION:
// exactamente el comportamiento de antes de la extensión.
function normalizeAssignmentType(value, locationId) {
    const v = String(value == null ? '' : value).trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (ASSIGNMENT_TYPES.includes(v)) return v;
    return locationId ? 'LOCATION' : 'LOCATION';
}

// ============================================================================
//  MODULO DE INSPECCIONES — helpers
// Un turno de noche (20:00 -> 01:00) tiene end_time < start_time. PostgreSQL
// compara bien las horas, pero la condición de solapamiento "empieza antes de
// que acabe el otro" da un resultado equivocado: un turno que acaba a la 01:00
// parecería terminar antes de empezar.
//
// Para evitarlo, todo turno con end_time <= start_time se interpreta como que
// termina al día siguiente y se cuenta en minutos con un +24h. La work_date
// sigue siendo SIEMPRE la del inicio: es la fecha en la que se planifica el
// turno, no la del final. Esto permite que un turno de 20:00 a 01:00 se
// registre correctamente y que se detecte el conflicto real con el turno de la
// madrugada siguiente.
function minutos(time) {
    if (time == null) return null;
    const t = String(time).trim();
    if (!t) return null;
    const [h, m] = t.split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
}

// Minutos que ocupa el turno. Si cruza la medianoche, el final lleva +24h.
function minutosTurno(startTime, endTime) {
    const s = minutos(startTime);
    const e = minutos(endTime);
    if (s == null || e == null) return null;
    return { inicio: s, fin: e <= s ? e + 1440 : e, cruzaMedianoche: e <= s };
}

// work_date + 1 dia, en texto. Se usa para buscar los turnos de la madrugada
// siguiente, que es a donde se prolonga un turno nocturno.
function diaSiguiente(fechaISO) {
    const d = new Date(String(fechaISO) + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

// Busca un turno que se solape con el indicado.
//
// Se comparan minutos sobre una linea de tiempo continua: los turnos que
// cruzan la medianoche se prolongan 24h. Por eso hay que mirar tambien los
// turnos del dia siguiente (un turno de 20:00-01:00 pisa la madrugada de
// mañana) y por eso los turnos de mañana que ya cruzan la noche anterior se
// recortan a su parte de hoy antes de compararlos.
//
// Devuelve la fila en conflicto, o null.
async function buscarConflicto(pool, { employee_id, work_date, turno, excludeId }) {
    const manana = diaSiguiente(work_date);
    const ayer = diaSiguiente(work_date) === work_date ? null : diaAnterior(work_date);

    const res = await pool.query(
        `SELECT a.id, a.location_id, a.category, a.assignment_type,
                a.work_date::text AS work_date, a.start_time, a.end_time,
                sc.name_es AS section_name
           FROM assignments a
           LEFT JOIN schedule_categories sc ON sc.key = a.category
          WHERE a.employee_id = $1
            AND a.work_date IN ($2, $3)`,
        [employee_id, work_date, manana]
    );
    // Tambien los turnos del dia anterior que se prolongan hacia hoy.
    if (ayer) {
        const resAyer = await pool.query(
            `SELECT a.id, a.location_id, a.category, a.assignment_type,
                    a.work_date::text AS work_date, a.start_time, a.end_time,
                    sc.name_es AS section_name
               FROM assignments a
               LEFT JOIN schedule_categories sc ON sc.key = a.category
              WHERE a.employee_id = $1
                AND a.work_date = $2`,
            [employee_id, ayer]
        );
        res.rows.push(...resAyer.rows);
    }

    for (const row of res.rows) {
        if (excludeId && Number(row.id) === Number(excludeId)) continue;
        const otro = minutosTurno(row.start_time, row.end_time);
        if (!otro) continue;

        // Tramo que ocupa ESTE turno sobre la linea continua:
        // hoy arranca en 0 y si cruza la medianoche llega a 1440+.
        const miInicio = turno.inicio;
        const miFin = turno.fin;

        // Tramo del turno existente. Si empieza ayer y cruza la medianoche,
        // su parte de HOY empieza en 0.
        const esAyer = ayer && row.work_date === ayer;
        const esHoy = row.work_date === work_date;
        let s = otro.inicio;
        let f = otro.fin;
        if (esAyer) {
            // Solo nos interesa el trozo que invade hoy: de 00:00 a su fin.
            if (!otro.cruzaMedianoche) continue;
            s = 0;
            f = otro.fin - 1440;
            if (f <= 0) continue;
        } else if (!esHoy) {
            // El turno es de manana y el nuevo no cruza: no se solapan.
            if (!turno.cruzaMedianoche) continue;
            s = otro.inicio;
            f = otro.fin;
        } else if (otro.cruzaMedianoche && turno.cruzaMedianoche) {
            // Los dos cruzan la medianoche: se comparan sobre 24h+
            s = otro.inicio;
            f = otro.fin;
        }

        if (miInicio < f && miFin > s) return row;
    }
    return null;
}

function diaAnterior(fechaISO) {
    const d = new Date(String(fechaISO) + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

// Normaliza la categoría ("lugar") de la asignación.
// Para LOCATION la categoría ES el location_id, de modo que las filas que ya
// existían y las nuevas se comportan igual. Para el resto es la clave de la
// sección (front_ops, pavilion-support, ...).
function normalizeCategory(type, locationId, value) {
    if (type === 'LOCATION') return locationId || null;
    const v = String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, '-');
    return v ? v.slice(0, 50) : null;
}

// Nombre legible del "lugar" para los mensajes de conflicto: la location si la
// hay, y si no el nombre real de la sección (Front OPS, Pavilion Support...)
// que es lo que el usuario ve en pantalla. Si no se conoce la sección, se cae
// a la clave para no mostrar un hueco.
function conflictPlaceName(row) {
    if (row.location_id) return row.location_id;
    if (row.section_name) return row.section_name;
    if (row.category) return row.category.replace(/-/g, ' ');
    return 'otra sección';
}

// Get all assignments
app.get('/api/:type/assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date } = req.query;
        // LEFT JOIN en ambos: las asignaciones de OPS / Extra Hours / Support /
        // Extra Tasks no tienen location_id, y con un INNER JOIN desaparecerían
        // del horario sin avisar. sc da el nombre de la sección.
        let query = `
            SELECT a.*, e.name as employee_name, e.role as employee_role, e.group_id,
                   e.ops_group as employee_ops_group,
                   l.name as location_name,
                   sc.name_es as section_name, sc.name_en as section_name_en,
                   sc.section as section, sc.icon as section_icon
            FROM assignments a
            JOIN employees e ON a.employee_id = e.id
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN schedule_categories sc ON sc.key = a.category
        `;
        const params = [];
        if (date) {
            query += ' WHERE a.work_date = $1';
            params.push(date);
        }
        query += ` ORDER BY a.work_date DESC,
                   COALESCE(l.name, sc.name_es, ''), a.start_time NULLS LAST`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get assignments for specific location
app.get('/api/:type/locations/:locationId/assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date } = req.query;
        let query = `
            SELECT a.*, e.name as employee_name, e.role as employee_role, e.group_id
            FROM assignments a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.location_id = $1
        `;
        const params = [req.params.locationId];
        if (date) {
            query += ' AND a.work_date = $2';
            params.push(date);
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get building-specific assignments
app.get('/api/:type/buildings/:locationId/assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const table = getBuildingTable(req.params.locationId);
        const { date } = req.query;
        
        let query = `
            SELECT b.*, e.name as employee_name, e.role as employee_role, e.group_id
            FROM ${table} b
            JOIN employees e ON b.employee_id = e.id
        `;
        const params = [];
        if (date) {
            query += ' WHERE b.work_date = $1';
            params.push(date);
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create assignment
app.post('/api/:type/assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { location_id, employee_id, work_date, start_time, end_time } = req.body;

        // Campos de las secciones nuevas (OPS, Extra Hours, Support, Extra
        // Tasks). Si no vienen, se comporta exactamente como antes.
        const assignment_type = normalizeAssignmentType(req.body.assignment_type, location_id);
        const category = normalizeCategory(assignment_type, location_id, req.body.category);
        const role = req.body.role ? String(req.body.role).slice(0, 50) : null;
        const notes = req.body.notes ? String(req.body.notes).slice(0, 2000) : null;
        const task_id = req.body.task_id ? Number(req.body.task_id) : null;

        // Las secciones no geográficas no son locations: se salta la comprobación
        // de cierre por día, que solo aplica a locations reales.
        if (assignment_type === 'LOCATION') {
            const disableCheck = await pool.query(
                `SELECT * FROM location_disables
                 WHERE location_id = $1
                 AND disable_date = $2
                 AND enabled_at IS NULL
                 AND (reactivation_date IS NULL OR reactivation_date > $2)`,
                [location_id, work_date]
            );

            if (disableCheck.rows.length > 0) {
                const disable = disableCheck.rows[0];
                return res.status(400).json({
                    error: 'location_disabled',
                    message: `La locación ${location_id} está cerrada para la fecha ${work_date}. Motivo: ${disable.disable_reason}. No se pueden crear asignaciones.`
                });
            }
        }

        // Detecta si el empleado se solapa con un turno que ya tiene.
        //
        // Se hace en JavaScript y no con una comparación de horas en SQL porque
        // un turno de noche (20:00 -> 01:00) necesita contar hasta las 25:00, y
        // además ocupa la madrugada del día siguiente: ahí es donde aparecen
        // los conflictos de verdad.
        const turno = minutosTurno(start_time, end_time);
        if (turno) {
            const conflicto = await buscarConflicto(pool, {
                employee_id, work_date, turno, excludeId: null
            });
            if (conflicto) {
                return res.status(400).json({
                    error: 'schedule_conflict',
                    message: `El empleado ya tiene una asignación en ${conflictPlaceName(conflicto)} durante el horario ${conflicto.start_time} - ${conflicto.end_time}. No puede estar en dos lugares al mismo tiempo.`
                });
            }

            // En Retail el mismo empleado puede tener turno en Foods. Se
            // comprueba alli tambien, porque el horario es compartido.
            if (req.params.type === 'retail') {
                const confFoods = await buscarConflicto(getPool('foods'), {
                    employee_id, work_date, turno, excludeId: null
                });
                if (confFoods) {
                    return res.status(400).json({
                        error: 'schedule_conflict',
                        message: `El empleado ya tiene una asignación en Foods (${conflictPlaceName(confFoods)}) durante el horario ${confFoods.start_time} - ${confFoods.end_time}. No puede estar en dos lugares al mismo tiempo.`
                    });
                }
            }
        }

        const result = await pool.query(
            `INSERT INTO assignments
                (location_id, employee_id, work_date, start_time, end_time,
                 assignment_type, category, role, notes, task_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             RETURNING id`,
            [location_id, employee_id, work_date, start_time, end_time,
             assignment_type, category, role, notes, task_id]
        );

        // Trigger automatic backup after assignment creation
        performBackup(req.params.type).catch(err => console.error('Backup failed:', err));

        res.json({ id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update assignment
app.put('/api/:type/assignments/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { location_id, employee_id, work_date, start_time, end_time } = req.body;
        const assignmentId = req.params.id;

        const assignment_type = normalizeAssignmentType(req.body.assignment_type, location_id);
        const category = normalizeCategory(assignment_type, location_id, req.body.category);
        const role = req.body.role ? String(req.body.role).slice(0, 50) : null;
        const notes = req.body.notes ? String(req.body.notes).slice(0, 2000) : null;
        const task_id = req.body.task_id ? Number(req.body.task_id) : null;

        // El cierre por día solo aplica a locations reales.
        if (assignment_type === 'LOCATION') {
            const disableCheck = await pool.query(
                `SELECT * FROM location_disables
                 WHERE location_id = $1
                 AND disable_date = $2
                 AND enabled_at IS NULL
                 AND (reactivation_date IS NULL OR reactivation_date > $2)`,
                [location_id, work_date]
            );

            if (disableCheck.rows.length > 0) {
                const disable = disableCheck.rows[0];
                return res.status(400).json({
                    error: 'location_disabled',
                    message: `La locación ${location_id} está cerrada para la fecha ${work_date}. Motivo: ${disable.disable_reason}. No se pueden crear asignaciones.`
                });
            }
        }

        // Mismo criterio que al crear: minutos continuos y turnos que cruzan la
        // medianoche. Se excluye la propia asignacion que se esta editando.
        const turno = minutosTurno(start_time, end_time);
        if (turno) {
            const conflicto = await buscarConflicto(pool, {
                employee_id, work_date, turno, excludeId: assignmentId
            });
            if (conflicto) {
                return res.status(400).json({
                    error: 'schedule_conflict',
                    message: `El empleado ya tiene una asignación en ${conflictPlaceName(conflicto)} durante el horario ${conflicto.start_time} - ${conflicto.end_time}. No puede estar en dos lugares al mismo tiempo.`
                });
            }
        }

        const result = await pool.query(
            `UPDATE assignments
                SET location_id = $1, employee_id = $2, work_date = $3, start_time = $4, end_time = $5,
                    assignment_type = $6, category = $7, role = $8, notes = $9, task_id = $10
              WHERE id = $11 RETURNING *`,
            [location_id, employee_id, work_date, start_time, end_time,
             assignment_type, category, role, notes, task_id, assignmentId]
        );

        // Trigger automatic backup after assignment update
        performBackup(req.params.type).catch(err => console.error('Backup failed:', err));

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create building-specific assignment
app.post('/api/:type/buildings/:locationId/assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const table = getBuildingTable(req.params.locationId);
        const { employee_id, role, work_date, shift_start, shift_end } = req.body;
        
        const result = await pool.query(
            `INSERT INTO ${table} (employee_id, role, work_date, shift_start, shift_end) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [employee_id, role, work_date, shift_start, shift_end]
        );
        
        res.status(201).json({ id: result.rows[0].id, message: 'Building assignment created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete assignment
app.delete('/api/:type/assignments/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query('DELETE FROM assignments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Assignment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SECCIONES DEL HORARIO (OPS / EXTRA HOURS / SUPPORT / EXTRA TASKS)
// ============================================
// Son datos, no código: añadir una actividad nueva es insertar una fila, sin
// tocar el frontend.

app.get('/api/:type/schedule-categories', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(
            `SELECT sc.*, t.title as task_title, t.status as task_status
               FROM schedule_categories sc
               LEFT JOIN tasks t ON t.id = sc.task_id
              WHERE sc.is_active
              ORDER BY sc.section, sc.sort_order, sc.key`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:type/schedule-categories', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { key, section, name_es, name_en, icon, sort_order, task_id } = req.body;
        if (!key || !section || !name_es) {
            return res.status(400).json({ error: 'missing_fields' });
        }
        if (!['OPS', 'EXTRA_HOURS', 'SUPPORT', 'EXTRA_TASK'].includes(section)) {
            return res.status(400).json({ error: 'invalid_section' });
        }
        const result = await pool.query(
            `INSERT INTO schedule_categories
                (key, section, name_es, name_en, icon, sort_order, task_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (key) DO UPDATE
                SET section = EXCLUDED.section, name_es = EXCLUDED.name_es,
                    name_en = EXCLUDED.name_en, icon = EXCLUDED.icon,
                    sort_order = EXCLUDED.sort_order, task_id = EXCLUDED.task_id
             RETURNING *`,
            [String(key).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50), section,
             String(name_es).slice(0, 100), String(name_en || name_es).slice(0, 100),
             icon ? String(icon).slice(0, 20) : null,
             Number(sort_order) || 100, task_id ? Number(task_id) : null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Baja lógica: una sección con historial no se borra, se desactiva.
app.delete('/api/:type/schedule-categories/:key', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { key } = req.params;
        const used = await pool.query(
            'SELECT count(*)::int n FROM assignments WHERE category = $1', [key]);
        if (used.rows[0].n > 0) {
            await pool.query('UPDATE schedule_categories SET is_active = false WHERE key = $1', [key]);
            return res.json({
                deactivated: true,
                assignments: used.rows[0].n,
                message: 'La sección tiene asignaciones: se desactiva en lugar de borrarse.'
            });
        }
        await pool.query('DELETE FROM schedule_categories WHERE key = $1', [key]);
        res.json({ deleted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// LOCATIONS DONDE HA SIDO ENTRENADO + GRUPOS MULTIPLES
// ============================================
// Fuente de los grupos: el empleado marca las locations en las que se ha
// entrenado, y de ahi se le asignan uno o varios grupos. Quien ha estado en
// todas las locations tiene, simplemente, todas las marcadas.

// Que grupos corresponden a cada location.
//
// El catalogo se sirve siempre desde foods: es donde vive el roster de
// empleados (incluso cuando se consulta desde el tema retail) y, por tanto,
// donde se guardan las locations entrenadas. Servir el mismo catalogo en los
// dos temas evita que el formulario ofrezca locations que luego no se puedan
// guardar (la FK las rechazaria con un error de servidor).
app.get('/api/:type/location-groups', async (req, res) => {
    try {
        const result = await getPool('foods').query(`
            SELECT lg.location_id, lg.group_id, l.name AS location_name
              FROM location_groups lg
              LEFT JOIN locations l ON l.id = lg.location_id
             ORDER BY lg.group_id, l.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET de las locations entrenadas de un empleado + sus grupos.
// Siempre contra foods: el empleado, y su historial de capacitacion, viven
// ahi, se consulte el tema que se consulte.
app.get('/api/:type/employees/:id/training-locations', async (req, res) => {
    try {
        const pool = getPool('foods');
        const id = Number(req.params.id);
        const locs = (await pool.query(
            'SELECT location_id, trained_at::text FROM employee_location_training WHERE employee_id = $1 ORDER BY location_id',
            [id])).rows;
        const groups = (await pool.query(
            'SELECT group_id FROM employee_groups WHERE employee_id = $1 ORDER BY group_id',
            [id])).rows.map((r) => r.group_id);
        const emp = (await pool.query(
            'SELECT id, name, role, group_id FROM employees WHERE id = $1', [id])).rows[0] || null;
        res.json({
            employee_id: id,
            primary_group: emp ? emp.group_id : null,
            groups,
            locations: locs,
            // Todos los grupos que se deducen de las locations marcadas.
            derived_groups: (await pool.query(
                `SELECT DISTINCT lg.group_id FROM employee_location_training elt
                   JOIN location_groups lg ON lg.location_id = elt.location_id
                  WHERE elt.employee_id = $1 ORDER BY lg.group_id`, [id])).rows.map((r) => r.group_id)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reemplaza las locations entrenadas y los grupos adicionales del empleado.
// Va siempre a foods (donde vive el empleado) y descarta en silencio lo que no
// exista, devolviendo 400 en vez de reventar con un 500 de FK.
app.put('/api/:type/employees/:id/training-locations', async (req, res) => {
    try {
        const pool = getPool('foods');
        const id = Number(req.params.id);
        const locations = Array.isArray(req.body.locations) ? req.body.locations : [];
        const groups = Array.isArray(req.body.groups) ? req.body.groups : [];

        const existe = (await pool.query('SELECT 1 FROM employees WHERE id = $1', [id])).rows.length;
        if (!existe) return res.status(404).json({ error: 'employee_not_found' });

        // Los grupos se validan contra el catalogo existente.
        const validos = groups
            .map((g) => String(g).trim().toUpperCase().charAt(0))
            .filter((g) => ['A', 'B', 'C', 'D'].includes(g));

        // Las locations se validan contra el catalogo de locations: se ignora
        // lo que no exista y se avisa, para que un dato equivocado no se pierda
        // en silencio ni aparezca como si se hubiera guardado.
        // Se comprueba `locations` y no `location_groups` porque una location
        // puede existir aun sin grupo asignado (todavia no decided cual es):
        // el grupo solo hace falta para deducir grupos, no para saber si la
        // persona estuvo entrenada ahi.
        const pedidas = [...new Set(locations.map((l) => String(l).trim()).filter(Boolean))];
        const conocidas = pedidas.length
            ? (await pool.query('SELECT id FROM locations WHERE id = ANY($1)',
                [pedidas])).rows.map((r) => r.id)
            : [];
        const descartadas = pedidas.filter((l) => !conocidas.includes(l));
        const aGuardar = pedidas.filter((l) => conocidas.includes(l));

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM employee_location_training WHERE employee_id = $1', [id]);
            for (const loc of aGuardar) {
                await client.query(
                    `INSERT INTO employee_location_training (employee_id, location_id)
                     VALUES ($1,$2) ON CONFLICT (employee_id, location_id) DO NOTHING`, [id, loc]);
            }
            await client.query('DELETE FROM employee_groups WHERE employee_id = $1', [id]);
            for (const g of [...new Set(validos)]) {
                await client.query(
                    'INSERT INTO employee_groups (employee_id, group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                    [id, g]);
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        const out = (await pool.query(
            'SELECT location_id FROM employee_location_training WHERE employee_id = $1 ORDER BY location_id',
            [id])).rows.map((r) => r.location_id);
        const g = (await pool.query(
            'SELECT group_id FROM employee_groups WHERE employee_id = $1 ORDER BY group_id',
            [id])).rows.map((r) => r.group_id);
        res.json({ employee_id: id, locations: out, groups: g, discarded_locations: descartadas });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reporte de capacitaciones por empleado: para el modulo de Reportes.
// NO es el gestor de empleados: aqui solo se consulta, no se edita.
// Se lee de foods porque es ahi donde vive el roster.
app.get('/api/:type/employees-training-report', async (req, res) => {
    try {
        const result = await getPool('foods').query(`
            SELECT e.id, e.name, e.role, e.group_id AS primary_group,
                   e.ops_group, e.is_versatile,
                   COALESCE(t.cnt, 0)::int AS trainings_count,
                   COALESCE(lt.locs, ARRAY[]::text[]) AS trained_locations,
                   COALESCE(g.groups, ARRAY[]::text[]) AS extra_groups,
                   COALESCE(dg.groups, ARRAY[]::text[]) AS derived_groups
              FROM employees e
              LEFT JOIN (SELECT employee_id, count(*)::int cnt FROM employee_trainings
                          GROUP BY employee_id) t ON t.employee_id = e.id
              LEFT JOIN (SELECT employee_id, array_agg(location_id ORDER BY location_id) AS locs
                           FROM employee_location_training GROUP BY employee_id) lt ON lt.employee_id = e.id
              LEFT JOIN (SELECT employee_id, array_agg(group_id ORDER BY group_id) AS groups
                           FROM employee_groups GROUP BY employee_id) g ON g.employee_id = e.id
              LEFT JOIN (SELECT elt.employee_id, array_agg(DISTINCT lg.group_id ORDER BY lg.group_id) AS groups
                           FROM employee_location_training elt
                           JOIN location_groups lg ON lg.location_id = elt.location_id
                          GROUP BY elt.employee_id) dg ON dg.employee_id = e.id
             ORDER BY e.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// NOTAS DEL DÍA
// ============================================

app.get('/api/:type/schedule-notes', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date } = req.query;
        let query = 'SELECT * FROM schedule_notes';
        const params = [];
        if (date) { query += ' WHERE work_date = $1'; params.push(date); }
        query += ' ORDER BY work_date DESC, id';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:type/schedule-notes', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { work_date, note, created_by } = req.body;
        if (!work_date || !note || !String(note).trim()) {
            return res.status(400).json({ error: 'missing_fields' });
        }
        const result = await pool.query(
            `INSERT INTO schedule_notes (work_date, note, created_by)
             VALUES ($1,$2,$3) RETURNING *`,
            [work_date, String(note).trim().slice(0, 2000),
             created_by ? String(created_by).slice(0, 100) : null]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/:type/schedule-notes/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { note } = req.body;
        if (!note || !String(note).trim()) {
            return res.status(400).json({ error: 'missing_fields' });
        }
        const result = await pool.query(
            `UPDATE schedule_notes SET note = $1, updated_at = CURRENT_TIMESTAMP
              WHERE id = $2 RETURNING *`,
            [String(note).trim().slice(0, 2000), Number(req.params.id)]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'not_found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/:type/schedule-notes/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query('DELETE FROM schedule_notes WHERE id = $1', [Number(req.params.id)]);
        res.json({ message: 'Note deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// TASKS
// ============================================

// Get all tasks
app.get('/api/:type/tasks', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(`
            SELECT t.*, e.name as assigned_to_name
            FROM tasks t
            LEFT JOIN employees e ON t.assigned_to = e.id
            ORDER BY t.due_date ASC, t.priority DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create task
app.post('/api/:type/tasks', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { title, description, assigned_to, priority, category, due_date } = req.body;
        
        const result = await pool.query(
            'INSERT INTO tasks (title, description, assigned_to, priority, category, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [title, description, assigned_to, priority, category, due_date]
        );
        
        res.status(201).json({ id: result.rows[0].id, message: 'Task created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task
app.put('/api/:type/tasks/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { title, description, assigned_to, priority, category, due_date, status } = req.body;
        
        await pool.query(
            'UPDATE tasks SET title = $1, description = $2, assigned_to = $3, priority = $4, category = $5, due_date = $6, status = $7, updated_at = NOW() WHERE id = $8',
            [title, description, assigned_to, priority, category, due_date, status, req.params.id]
        );
        
        res.json({ message: 'Task updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task
app.delete('/api/:type/tasks/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// LOCATION DISABLES
// ============================================

// Get location disables
app.get('/api/:type/location-disables', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date } = req.query;
        let query = 'SELECT * FROM location_disables';
        const params = [];

        if (date) {
            query += ' WHERE disable_date = $1';
            params.push(date);
        }

        query += ' ORDER BY disable_date DESC, created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Disable location
app.post('/api/:type/location-disables', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { location_id, disable_date, disable_reason, disabled_by, reactivation_date } = req.body;

        const result = await pool.query(
            `INSERT INTO location_disables (location_id, disable_date, disable_reason, disabled_by, reactivation_date)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (location_id, disable_date)
             DO UPDATE SET disable_reason = $3, disabled_by = $4, reactivation_date = $5, updated_at = NOW()
             RETURNING *`,
            [location_id, disable_date, disable_reason, disabled_by, reactivation_date]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Enable location
app.put('/api/:type/location-disables/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { enable_reason, enabled_by } = req.body;

        const result = await pool.query(
            `UPDATE location_disables
             SET enable_reason = $1, enabled_by = $2, enabled_at = NOW(), updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [enable_reason, enabled_by, req.params.id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SUPERVISOR ASSIGNMENTS
// ============================================

// Get supervisor assignments
app.get('/api/:type/supervisor-assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date, supervisor_id } = req.query;
        let query = `
            SELECT sa.*, e.name as supervisor_name, e.role as supervisor_role, l.name as location_name
            FROM supervisor_assignments sa
            JOIN employees e ON sa.supervisor_id = e.id
            JOIN locations l ON sa.location_id = l.id
        `;
        const params = [];

        if (date) {
            query += ' WHERE sa.assigned_date = $1';
            params.push(date);
        }

        if (supervisor_id) {
            const whereClause = date ? ' AND sa.supervisor_id = $' + (params.length + 1) : ' WHERE sa.supervisor_id = $' + (params.length + 1);
            query += whereClause;
            params.push(supervisor_id);
        }

        query += ' ORDER BY sa.assigned_date DESC, l.name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create supervisor assignment
app.post('/api/:type/supervisor-assignments', async (req, res) => {
    const client = getPool(req.params.type);
    try {
        const { supervisor_id, location_id, assigned_date, role } = req.body;

        // Check if supervisor already has 5 buildings for this date
        const existingCount = await client.query(
            'SELECT COUNT(*) as count FROM supervisor_assignments WHERE supervisor_id = $1 AND assigned_date = $2',
            [supervisor_id, assigned_date]
        );

        if (existingCount.rows[0].count >= 5) {
            return res.status(400).json({ error: 'Supervisor cannot be assigned to more than 5 buildings per day' });
        }

        const result = await client.query(
            `INSERT INTO supervisor_assignments (supervisor_id, location_id, assigned_date, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (supervisor_id, location_id, assigned_date)
             DO UPDATE SET role = $4, updated_at = NOW()
             RETURNING *`,
            [supervisor_id, location_id, assigned_date, role]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete supervisor assignment
app.delete('/api/:type/supervisor-assignments/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query('DELETE FROM supervisor_assignments WHERE id = $1', [req.params.id]);
        res.json({ message: 'Supervisor assignment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// INSPECTIONS & COMPLIANCE
// ============================================
// Los endpoints de inspecciones, hallazgos y correcciones viven en
// inspections-routes.js, que se monta al final de este archivo. Se movieron
// ahi porque el modulo crecio (validaciones de relaciones, borrado logico,
// catalogos y consulta por locacion) y ya no cabia razonablemente junto al
// resto de la API.

// ============================================
// ASSIGNMENT HISTORY
// ============================================

// Get assignment history for a specific date
app.get('/api/:type/assignment-history', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        // Get all assignments for the date
        const assignments = await pool.query(`
            SELECT a.*, e.name as employee_name, e.role as employee_role, e.group_id,
                   l.name as location_name, l.type as location_type
            FROM assignments a
            JOIN employees e ON a.employee_id = e.id
            JOIN locations l ON a.location_id = l.id
            WHERE a.work_date = $1
            ORDER BY l.name, e.name
        `, [date]);

        // Get supervisor assignments for the date
        const supervisors = await pool.query(`
            SELECT sa.*, e.name as supervisor_name, e.role as supervisor_role,
                   l.name as location_name
            FROM supervisor_assignments sa
            JOIN employees e ON sa.supervisor_id = e.id
            JOIN locations l ON sa.location_id = l.id
            WHERE sa.assigned_date = $1
            ORDER BY l.name
        `, [date]);

        // Get disabled locations for the date
        const disabled = await pool.query(`
            SELECT ld.*, l.name as location_name
            FROM location_disables ld
            JOIN locations l ON ld.location_id = l.id
            WHERE ld.disable_date = $1
            ORDER BY l.name
        `, [date]);

        res.json({
            date: date,
            assignments: assignments.rows,
            supervisors: supervisors.rows,
            disabled_locations: disabled.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// STAFFING RULES
// ============================================

// Get all staffing rules
app.get('/api/:type/staffing-rules', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(`
            SELECT sr.*, l.name as location_name
            FROM staffing_rules sr
            LEFT JOIN locations l ON sr.location_id = l.id
            WHERE sr.is_active = true
            ORDER BY l.name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get staffing rule for specific location
app.get('/api/:type/staffing-rules/:locationId', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(
            'SELECT * FROM staffing_rules WHERE location_id = $1 AND is_active = true',
            [req.params.locationId]
        );
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or update staffing rule
app.post('/api/:type/staffing-rules', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { location_id, min_employees, requirements, is_active } = req.body;

        const result = await pool.query(
            `INSERT INTO staffing_rules (location_id, min_employees, requirements, is_active)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (location_id)
             DO UPDATE SET min_employees = $2, requirements = $3, is_active = $4, updated_at = NOW()
             RETURNING *`,
            [location_id, min_employees, requirements, is_active !== undefined ? is_active : true]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete staffing rule
app.delete('/api/:type/staffing-rules/:locationId', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query(
            'UPDATE staffing_rules SET is_active = false, updated_at = NOW() WHERE location_id = $1',
            [req.params.locationId]
        );
        res.json({ message: 'Staffing rule deactivated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate assignment against staffing rules
app.get('/api/:type/staffing-rules/validate/:locationId', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { locationId } = req.params;
        const { assignments } = req.query;

        const rule = await pool.query(
            'SELECT * FROM staffing_rules WHERE location_id = $1 AND is_active = true',
            [locationId]
        );

        if (rule.rows.length === 0) {
            return res.json({ valid: true, message: 'No staffing rules configured for this location' });
        }

        const staffingRule = rule.rows[0];
        const requirements = JSON.parse(staffingRule.requirements);
        const currentAssignments = assignments ? JSON.parse(assignments) : [];

        const validation = validateStaffing(requirements, currentAssignments);
        res.json(validation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper function to validate staffing requirements
function validateStaffing(requirements, currentAssignments) {
    const validation = {
        valid: true,
        message: 'Requirements met',
        missing: [],
        current: {}
    };

    requirements.forEach(req => {
        const currentCount = currentAssignments.filter(a => a.role === req.role).length;
        validation.current[req.role] = currentCount;

        if (currentCount < req.count) {
            validation.valid = false;
            validation.missing.push({
                role: req.role,
                required: req.count,
                current: currentCount,
                missing: req.count - currentCount,
                required_certifications: req.required_certifications
            });
        }
    });

    if (!validation.valid) {
        validation.message = 'Staffing requirements not met';
    }

    return validation;
}

// ============================================
// EMPLOYEE BREAKS
// ============================================

// Get breaks for a specific date and location
app.get('/api/:type/breaks', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date, location_id } = req.query;

        let query = `
            SELECT eb.*, e.name as employee_name, e.role as employee_role,
                   ce.name as covered_by_name, ce.role as covered_by_role
            FROM employee_breaks eb
            JOIN employees e ON eb.employee_id = e.id
            LEFT JOIN employees ce ON eb.covered_by_employee_id = ce.id
        `;
        const params = [];

        if (date) {
            query += ' WHERE eb.work_date = $1';
            params.push(date);
        }

        if (location_id) {
            const whereClause = date ? ' AND eb.location_id = $' + (params.length + 1) : ' WHERE eb.location_id = $' + (params.length + 1);
            query += whereClause;
            params.push(location_id);
        }

        query += ' ORDER BY eb.work_date, eb.location_id';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get break for a specific assignment
app.get('/api/:type/breaks/assignment/:assignmentId', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const result = await pool.query(`
            SELECT eb.*, e.name as employee_name, e.role as employee_role,
                   ce.name as covered_by_name, ce.role as covered_by_role
            FROM employee_breaks eb
            JOIN employees e ON eb.employee_id = e.id
            LEFT JOIN employees ce ON eb.covered_by_employee_id = ce.id
            WHERE eb.assignment_id = $1
        `, [req.params.assignmentId]);

        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create or update break configuration
app.post('/api/:type/breaks', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const {
            assignment_id,
            employee_id,
            work_date,
            location_id,
            break_type,
            covered_by_employee_id,
            break_start_time,
            break_end_time
        } = req.body;

        // Validate break type
        if (!['self', 'covered'].includes(break_type)) {
            return res.status(400).json({ error: 'Invalid break type. Must be "self" or "covered"' });
        }

        // If covered break, validate that covered_by_employee_id is provided
        if (break_type === 'covered' && !covered_by_employee_id) {
            return res.status(400).json({ error: 'covered_by_employee_id is required for covered breaks' });
        }

        // If self break, validate staffing requirements by time interval
        if (break_type === 'self') {
            const staffingRule = await pool.query(
                'SELECT * FROM staffing_rules WHERE location_id = $1 AND is_active = true',
                [location_id]
            );

            if (staffingRule.rows.length > 0) {
                const minEmployees = staffingRule.rows[0].min_employees || 1;

                // Get all assignments for this location and date with their schedules
                const assignments = await pool.query(
                    `SELECT a.employee_id, a.start_time, a.end_time, e.role
                     FROM assignments a
                     JOIN employees e ON a.employee_id = e.id
                     WHERE a.location_id = $1 AND a.work_date = $2`,
                    [location_id, work_date]
                );

                // Count employees who will be working during the break interval
                // An employee is working during the break if their shift overlaps with the break time
                //
                // Se comparan minutos (y no horas crudas) para que un turno de
                // noche que cruza la medianoche cuente tambien: si no, un
                // descanso de 00:30 contaria como "sin cobertura" aunque el
                // turno de 20:00-01:00 siga activo.
                const tramoDescanso = minutosTurno(break_start_time, break_end_time);
                const employeesDuringBreak = assignments.rows.filter(a => {
                    if (a.employee_id === employee_id) return false; // Exclude the employee taking break
                    const tramo = minutosTurno(a.start_time, a.end_time);
                    if (!tramo || !tramoDescanso) return false;
                    const solapa = tramo.inicio < tramoDescanso.fin && tramo.fin > tramoDescanso.inicio;
                    // Un turno que empieza el dia anterior y se prolonga hasta
                    // hoy sigue cubriendo un descanso de madrugada.
                    const invasionMadrugada = tramo.cruzaMedianoche
                        && tramo.fin - 1440 > tramoDescanso.inicio;
                    return solapa || invasionMadrugada;
                });

                const availableCount = employeesDuringBreak.length;

                // Check if location can operate with available employees during break
                if (availableCount < minEmployees) {
                    return res.status(400).json({
                        error: 'insufficient_staffing_during_break',
                        message: `Self break not allowed. Location requires minimum ${minEmployees} employees during ${break_start_time}-${break_end_time}, but only ${availableCount} will be available.`
                    });
                }

                // Optional: Check if location has essential roles covered during break
                // This is a softer check - we only verify that at least one employee has critical skills
                // if required (e.g., alcohol certification for venues that serve alcohol)
                const locationServesAlcohol = await pool.query(
                    'SELECT serves_alcohol FROM locations WHERE id = $1',
                    [location_id]
                );

                if (locationServesAlcohol.rows.length > 0 && locationServesAlcohol.rows[0].serves_alcohol) {
                    // Check if any available employee has alcohol certification
                    const hasAlcoholCert = employeesDuringBreak.some(emp => {
                        return emp.trainings && emp.trainings.includes('nh-alcohol-certification');
                    });

                    if (!hasAlcoholCert) {
                        return res.status(400).json({
                            error: 'no_alcohol_certification_during_break',
                            message: `Self break not allowed. Location serves alcohol but no available employee during ${break_start_time}-${break_end_time} has alcohol certification.`
                        });
                    }
                }
            }
        }

        // If covered break, validate that the covering employee has no scheduling conflicts
        if (break_type === 'covered' && covered_by_employee_id) {
            // Mismo criterio que el resto: minutos continuos, para que un
            // descanso de madrugada se detecte tambien contra un turno de
            // noche que viene del dia anterior.
            const turnoCobertura = minutosTurno(break_start_time, break_end_time);
            const conflicto = turnoCobertura
                ? await buscarConflicto(pool, {
                    employee_id: covered_by_employee_id, work_date,
                    turno: turnoCobertura, excludeId: null
                })
                : null;

            if (conflicto) {
                return res.status(400).json({
                    error: 'schedule_conflict',
                    message: `The employee covering the break has a scheduling conflict with another assignment.`
                });
            }
        }

        // Insert or update break configuration
        const result = await pool.query(
            `INSERT INTO employee_breaks (assignment_id, employee_id, work_date, location_id, break_type, covered_by_employee_id, break_start_time, break_end_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (assignment_id)
             DO UPDATE SET break_type = $5, covered_by_employee_id = $6, break_start_time = $7, break_end_time = $8, updated_at = NOW()
             RETURNING *`,
            [assignment_id, employee_id, work_date, location_id, break_type, covered_by_employee_id, break_start_time, break_end_time]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete break configuration
app.delete('/api/:type/breaks/:id', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        await pool.query('DELETE FROM employee_breaks WHERE id = $1', [req.params.id]);
        res.json({ message: 'Break configuration deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// BACKUP ENDPOINT
// ============================================

// Helper function to perform backup
async function performBackup(type) {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupDir = path.join(__dirname, 'backups');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `${type}_backup_${timestamp}.sql`);

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        database: type === 'foods' ? 'storyland_foods' : 'storyland_retail'
    };

    const pgDumpCmd = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.database} > "${backupFile}"`;

    return new Promise((resolve, reject) => {
        exec(pgDumpCmd, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup error:', error);
                reject(error);
                return;
            }
            console.log(`Backup created successfully: ${backupFile}`);
            resolve({ message: 'Backup created successfully', file: backupFile });
        });
    });
}

app.post('/api/:type/backup', async (req, res) => {
    try {
        const result = await performBackup(req.params.type);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// AUTOMATIC DAILY BACKUP SCHEDULER
// ============================================

// Schedule automatic daily backups at midnight
function scheduleDailyBackups() {
    const cron = require('node-cron');

    // Run backup every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('Starting daily automatic backup...');
        try {
            await performBackup('foods');
            await performBackup('retail');
            console.log('Daily backups completed successfully');
        } catch (error) {
            console.error('Daily backup failed:', error);
        }
    });

    console.log('Daily backup scheduler started (runs at 00:00 daily)');
}

// ============================================
// IMPORTACION INTELIGENTE (Excel / futuro Quinyx)
// ============================================
// Rutas nuevas; no se modifica ningun endpoint existente.

const importRoutes = require('./import-routes');
const IMPORT_CTX = { foods, retail, getPool };

// Modulo de inspecciones (hallazgos, correcciones, catalogos y exportacion).
// Sustituye al bloque que estaba en linea dentro de este archivo: ahora valida
// las relaciones antes de escribir y usa borrado logico en vez de destruir el
// historico. No altera ningun otro endpoint.
const { montarRutasInspecciones } = require('./inspections-routes');
montarRutasInspecciones(app, getPool);

// Historial de auditoria y archivos de evidencia. Van aparte porque son
// transversales: los escribe el sistema al cambiar un estado, pero tambien se
// consultan sueltos (por ejemplo, el "cambio rapido" de un hallazgo).
const { montarRutasAuditoria } = require('./inspections-audit-routes');
montarRutasAuditoria(app, getPool);

// Exportacion del horario a Excel. Solo lee: arma el archivo con el mismo
// formato que el importador ya entiende, para que se pueda volver a subir.
const { montarRutasExportacionHorario } = require('./schedule-export-routes');
montarRutasExportacionHorario(app, getPool);

// Asignacion automatica inteligente. Propone un reparto que respete los
// minimos de staffing_rules, los compromisos ya confirmados y las
// certificaciones, y no guarda nada hasta que el usuario lo confirma.
const { montarRutasAutoAssign } = require('./auto-assign-routes');
montarRutasAutoAssign(app, getPool);

// POST /api/:type/import/validate -> preview autoritativo, no escribe nada
app.post('/api/:type/import/validate', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { rows = [], source = 'excel' } = req.body || {};
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'no_rows', message: 'No rows provided' });
        }
        if (rows.length > 5000) {
            return res.status(400).json({ error: 'too_many_rows', message: 'Max 5000 rows per import' });
        }
        const results = await importRoutes.validateRows(IMPORT_CTX, pool, rows, { source, type: req.params.type });
        const counts = results.reduce((a, r) => {
            a[r.status] = (a[r.status] || 0) + 1;
            return a;
        }, {});
        res.json({ total: results.length, counts, rows: results });
    } catch (err) {
        console.error('Import validate error:', err);
        res.status(500).json({ error: 'validate_failed', message: err.message });
    }
});

// POST /api/:type/import/commit -> escritura transaccional
app.post('/api/:type/import/commit', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const summary = await importRoutes.commitImport(IMPORT_CTX, pool, {
            ...(req.body || {}),
            target_type: req.params.type
        });
        performBackup(req.params.type).catch(e => console.error('Backup failed:', e));
        res.json(summary);
    } catch (err) {
        console.error('Import commit error:', err);
        res.status(500).json({ error: 'commit_failed', message: err.message });
    }
});

// GET /api/:type/import/history -> historial (§13)
app.get('/api/:type/import/history', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
        const r = await pool.query(
            `SELECT id, file_name, source, detected_type, target_type, imported_at,
                    imported_by, total_records, imported_count, updated_count,
                    duplicate_count, rejected_count, status, details
               FROM import_history
              ORDER BY imported_at DESC, id DESC
              LIMIT $1`,
            [limit]
        );
        res.json({ history: r.rows });
    } catch (err) {
        console.error('Import history error:', err);
        res.status(500).json({ error: 'history_failed', message: err.message });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);

    // Start automatic daily backup scheduler
    scheduleDailyBackups();
});
