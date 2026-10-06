const { foods, retail } = require('./db');

async function recreateBreaksTable() {
    try {
        // Drop existing table in foods
        console.log('Dropping employee_breaks table in storyland_foods...');
        await foods.query('DROP TABLE IF EXISTS employee_breaks CASCADE');
        console.log('✅ Dropped table in storyland_foods');

        // Drop existing table in retail
        console.log('Dropping employee_breaks table in storyland_retail...');
        await retail.query('DROP TABLE IF EXISTS employee_breaks CASCADE');
        console.log('✅ Dropped table in storyland_retail');

        // Create new table with improved structure
        const createTableSQL = `
            CREATE TABLE employee_breaks (
                id SERIAL PRIMARY KEY,
                assignment_id INTEGER NOT NULL,
                employee_id INTEGER NOT NULL,
                work_date DATE NOT NULL,
                location_id VARCHAR(50) NOT NULL,
                break_type VARCHAR(20) NOT NULL CHECK (break_type IN ('SELF_BREAK', 'COVERED_BREAK', 'BREAK_RELIEF')),
                covered_by_employee_id INTEGER,
                origin_location_id VARCHAR(50),
                origin_assignment_id INTEGER,
                break_start_time VARCHAR(5),
                break_end_time VARCHAR(5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(assignment_id)
            );

            CREATE INDEX IF NOT EXISTS idx_employee_breaks_assignment ON employee_breaks(assignment_id);
            CREATE INDEX IF NOT EXISTS idx_employee_breaks_employee ON employee_breaks(employee_id);
            CREATE INDEX IF NOT EXISTS idx_employee_breaks_date ON employee_breaks(work_date);
            CREATE INDEX IF NOT EXISTS idx_employee_breaks_location ON employee_breaks(location_id);
            CREATE INDEX IF NOT EXISTS idx_employee_breaks_break_type ON employee_breaks(break_type);
        `;

        // Create table in foods database
        console.log('Creating employee_breaks table in storyland_foods...');
        await foods.query(createTableSQL);
        console.log('✅ Table created in storyland_foods');

        // Create table in retail database
        console.log('Creating employee_breaks table in storyland_retail...');
        await retail.query(createTableSQL);
        console.log('✅ Table created in storyland_retail');

        console.log('\n✅ All employee_breaks tables recreated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error recreating tables:', error);
        process.exit(1);
    }
}

recreateBreaksTable();
