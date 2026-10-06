const { foods, retail } = require('./db');

async function updateBreaksTable() {
    const updateTableSQL = `
        -- Add columns for break relief
        ALTER TABLE employee_breaks ADD COLUMN IF NOT EXISTS origin_location_id VARCHAR(50);
        ALTER TABLE employee_breaks ADD COLUMN IF NOT EXISTS origin_assignment_id INTEGER;
        ALTER TABLE employee_breaks ADD COLUMN IF NOT EXISTS is_break_relief BOOLEAN DEFAULT FALSE;
        
        -- Update break_type enum to include new values
        ALTER TABLE employee_breaks ALTER COLUMN break_type SET DATA TYPE VARCHAR(20);
        
        -- Update existing break_type values
        UPDATE employee_breaks SET break_type = 'SELF_BREAK' WHERE break_type = 'self';
        UPDATE employee_breaks SET break_type = 'COVERED_BREAK' WHERE break_type = 'covered';
    `;

    try {
        // Update foods database
        console.log('Updating employee_breaks table in storyland_foods...');
        await foods.query(updateTableSQL);
        console.log('✅ Table updated in storyland_foods');

        // Update retail database
        console.log('Updating employee_breaks table in storyland_retail...');
        await retail.query(updateTableSQL);
        console.log('✅ Table updated in storyland_retail');

        console.log('\n✅ All employee_breaks tables updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating tables:', error);
        process.exit(1);
    }
}

updateBreaksTable();
