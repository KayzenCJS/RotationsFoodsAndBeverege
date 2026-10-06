const { foods, retail } = require('./db');

async function createLocationDisablesTable() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS location_disables (
            id SERIAL PRIMARY KEY,
            location_id VARCHAR(50) NOT NULL,
            disable_date DATE NOT NULL,
            disable_reason TEXT,
            disabled_by VARCHAR(100),
            reactivation_date DATE,
            enabled_at TIMESTAMP,
            enable_reason TEXT,
            enabled_by VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(location_id, disable_date)
        );

        CREATE INDEX IF NOT EXISTS idx_location_disables_location ON location_disables(location_id);
        CREATE INDEX IF NOT EXISTS idx_location_disables_date ON location_disables(disable_date);
        CREATE INDEX IF NOT EXISTS idx_location_disables_enabled ON location_disables(enabled_at);
    `;

    try {
        // Create table in foods database
        console.log('Creating location_disables table in storyland_foods...');
        await foods.query(createTableSQL);
        console.log('✅ Table created in storyland_foods');

        // Create table in retail database
        console.log('Creating location_disables table in storyland_retail...');
        await retail.query(createTableSQL);
        console.log('✅ Table created in storyland_retail');

        console.log('\n✅ All location_disables tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

createLocationDisablesTable();
