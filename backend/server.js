const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { foods, retail, testConnections } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
        const result = await pool.query(`
            SELECT e.*, 
                   array_agg(DISTINCT et.training_name) as trainings,
                   ea.is_on_break, ea.is_on_training, ea.is_day_off, ea.is_holiday,
                   ea.schedule_start_time, ea.schedule_end_time, ea.days_off, ea.holidays
            FROM employees e
            LEFT JOIN employee_trainings et ON e.id = et.employee_id
            LEFT JOIN employee_availability ea ON e.id = ea.employee_id
            GROUP BY e.id, ea.id
            ORDER BY e.id
        `);
        res.json(result.rows);
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
                   array_agg(DISTINCT et.training_name) as trainings,
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
    const client = getPool(req.params.type);
    try {
        const { name, nationality, age, role, group_id, hire_date, trainings, availability } = req.body;

        // Automatically determine if employee is versatile based on trainings
        const trainingsArray = trainings || [];
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
            'INSERT INTO employees (name, nationality, age, role, group_id, hire_date, is_versatile) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [name, nationality, age, role, group_id, hire_date || new Date().toISOString().split('T')[0], is_versatile]
        );
        
        const empId = empResult.rows[0].id;
        
        // Insert trainings
        if (trainings && trainings.length > 0) {
            // Insert trainings one by one to avoid parameter limit
            for (const training of trainings) {
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
                   array_agg(DISTINCT et.training_name) as trainings,
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
    const client = getPool(req.params.type);
    try {
        const { name, nationality, age, role, group_id, hire_date, trainings, availability } = req.body;

        // Automatically determine if employee is versatile based on trainings
        const trainingsArray = trainings || [];
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
        
        console.log('Update employee request:', { id: req.params.id, name, nationality, age, role, group_id, trainingsCount: trainings?.length });
        
        await client.query('BEGIN');
        
        await client.query(
            'UPDATE employees SET name = $1, nationality = $2, age = $3, role = $4, group_id = $5, hire_date = $6, is_versatile = $7, updated_at = NOW() WHERE id = $8',
            [name, nationality, age, role, group_id, hire_date, is_versatile, req.params.id]
        );
        
        // Update trainings
        await client.query('DELETE FROM employee_trainings WHERE employee_id = $1', [req.params.id]);
        if (trainings && trainings.length > 0) {
            console.log('Inserting trainings:', trainings.length);
            // Insert trainings one by one to avoid parameter limit
            for (const training of trainings) {
                await client.query(
                    'INSERT INTO employee_trainings (employee_id, training_name) VALUES ($1, $2) ON CONFLICT (employee_id, training_name) DO NOTHING',
                    [req.params.id, training]
                );
            }
        }
        
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
                   array_agg(DISTINCT et.training_name) as trainings,
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

// Get all assignments
app.get('/api/:type/assignments', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { date } = req.query;
        let query = `
            SELECT a.*, e.name as employee_name, e.role as employee_role, e.group_id,
                   l.name as location_name
            FROM assignments a
            JOIN employees e ON a.employee_id = e.id
            JOIN locations l ON a.location_id = l.id
        `;
        const params = [];
        if (date) {
            query += ' WHERE a.work_date = $1';
            params.push(date);
        }
        query += ' ORDER BY a.work_date DESC, l.name';
        
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

        // Check for time conflicts with existing assignments
        const conflictCheck = await pool.query(
            `SELECT location_id, start_time, end_time
             FROM assignments
             WHERE employee_id = $1
             AND work_date = $2
             AND location_id = $3
             AND (
                 (start_time < $4 AND end_time > $5) OR
                 (start_time < $4 AND end_time >= $4) OR
                 (start_time <= $5 AND end_time > $5)
             )`,
            [employee_id, work_date, location_id, end_time, start_time]
        );

        if (conflictCheck.rows.length > 0) {
            const conflict = conflictCheck.rows[0];
            return res.status(400).json({
                error: 'schedule_conflict',
                message: `El empleado ya tiene una asignación en esta locación durante el horario ${conflict.start_time} - ${conflict.end_time}`
            });
        }

        const result = await pool.query(
            'INSERT INTO assignments (location_id, employee_id, work_date, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [location_id, employee_id, work_date, start_time, end_time]
        );

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

        // Check for time conflicts with existing assignments (excluding current assignment)
        const conflictCheck = await pool.query(
            `SELECT location_id, start_time, end_time
             FROM assignments
             WHERE employee_id = $1
             AND work_date = $2
             AND location_id = $3
             AND id != $4
             AND (
                 (start_time < $5 AND end_time > $6) OR
                 (start_time < $5 AND end_time >= $5) OR
                 (start_time <= $6 AND end_time > $6)
             )`,
            [employee_id, work_date, location_id, assignmentId, end_time, start_time]
        );

        if (conflictCheck.rows.length > 0) {
            const conflict = conflictCheck.rows[0];
            return res.status(400).json({
                error: 'schedule_conflict',
                message: `El empleado ya tiene una asignación en esta locación durante el horario ${conflict.start_time} - ${conflict.end_time}`
            });
        }

        const result = await pool.query(
            'UPDATE assignments SET location_id = $1, employee_id = $2, work_date = $3, start_time = $4, end_time = $5 WHERE id = $6 RETURNING *',
            [location_id, employee_id, work_date, start_time, end_time, assignmentId]
        );

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
// BACKUP ENDPOINT
// ============================================

app.post('/api/:type/backup', async (req, res) => {
    try {
        const pool = getPool(req.params.type);
        const { exec } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupDir = path.join(__dirname, 'backups');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFile = path.join(backupDir, `${req.params.type}_backup_${timestamp}.sql`);
        
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            database: req.params.type === 'foods' ? 'storyland_foods' : 'storyland_retail'
        };
        
        const pgDumpCmd = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.database} > "${backupFile}"`;
        
        exec(pgDumpCmd, { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (error, stdout, stderr) => {
            if (error) {
                console.error('Backup error:', error);
                res.status(500).json({ error: 'Backup failed' });
                return;
            }
            res.json({ message: 'Backup created successfully', file: backupFile });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
