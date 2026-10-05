const { foods, retail } = require('./db');

async function createMissingTables() {
    const supervisorAssignmentsSQL = `
        CREATE TABLE IF NOT EXISTS supervisor_assignments (
            id SERIAL PRIMARY KEY,
            supervisor_id INTEGER NOT NULL,
            location_id VARCHAR(50) NOT NULL,
            assigned_date DATE NOT NULL,
            role VARCHAR(50) DEFAULT 'supervisor',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(supervisor_id, location_id, assigned_date)
        );

        CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor ON supervisor_assignments(supervisor_id);
        CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_location ON supervisor_assignments(location_id);
        CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_date ON supervisor_assignments(assigned_date);
    `;

    const staffingRulesSQL = `
        CREATE TABLE IF NOT EXISTS staffing_rules (
            id SERIAL PRIMARY KEY,
            location_id VARCHAR(50) NOT NULL UNIQUE,
            min_employees INTEGER DEFAULT 1,
            requirements JSONB DEFAULT '[]'::jsonb,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_staffing_rules_location ON staffing_rules(location_id);
        CREATE INDEX IF NOT EXISTS idx_staffing_rules_active ON staffing_rules(is_active);
    `;

    const addAssignmentTimesSQL = `
        ALTER TABLE assignments ADD COLUMN IF NOT EXISTS start_time VARCHAR(5);
        ALTER TABLE assignments ADD COLUMN IF NOT EXISTS end_time VARCHAR(5);
    `;

    const addEmployeeHireDateSQL = `
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_versatile BOOLEAN DEFAULT FALSE;
    `;

    try {
        // Create tables in foods database
        console.log('Creating missing tables in storyland_foods...');
        await foods.query(supervisorAssignmentsSQL);
        console.log('✅ supervisor_assignments created in storyland_foods');

        await foods.query(staffingRulesSQL);
        console.log('✅ staffing_rules created in storyland_foods');

        await foods.query(addAssignmentTimesSQL);
        console.log('✅ start_time and end_time added to assignments in storyland_foods');

        await foods.query(addEmployeeHireDateSQL);
        console.log('✅ hire_date and is_versatile added to employees in storyland_foods');

        // Create tables in retail database
        console.log('\nCreating missing tables in storyland_retail...');
        await retail.query(supervisorAssignmentsSQL);
        console.log('✅ supervisor_assignments created in storyland_retail');

        await retail.query(staffingRulesSQL);
        console.log('✅ staffing_rules created in storyland_retail');

        await retail.query(addAssignmentTimesSQL);
        console.log('✅ start_time and end_time added to assignments in storyland_retail');

        await retail.query(addEmployeeHireDateSQL);
        console.log('✅ hire_date and is_versatile added to employees in storyland_retail');

        console.log('\n✅ All missing tables and columns created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

createMissingTables();
