const { foods, retail } = require('./db');

async function createBreaksTable() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS employee_breaks (
            id SERIAL PRIMARY KEY,
            assignment_id INTEGER NOT NULL,
            employee_id INTEGER NOT NULL,
            work_date DATE NOT NULL,
            location_id VARCHAR(50) NOT NULL,
            break_type VARCHAR(20) NOT NULL CHECK (break_type IN ('self', 'covered')),
            covered_by_employee_id INTEGER,
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
    `;

    try {
        // Create table in foods database
        console.log('Creating employee_breaks table in storyland_foods...');
        await foods.query(createTableSQL);
        console.log('✅ Table created in storyland_foods');

        // Create table in retail database
        console.log('Creating employee_breaks table in storyland_retail...');
        await retail.query(createTableSQL);
        console.log('✅ Table created in storyland_retail');

        console.log('\n✅ All employee_breaks tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

createBreaksTable();
