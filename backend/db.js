const { Pool } = require('pg');
require('dotenv').config();

// ============================================
// DATABASE CONNECTIONS
// ============================================

// Food & Beverage Database
const foodsPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.FOODS_DB_NAME || 'storyland_foods',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Retail Database
const retailPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.RETAIL_DB_NAME || 'storyland_retail',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// ============================================
// CONNECTION TEST
// ============================================

async function testConnections() {
    try {
        await foodsPool.query('SELECT NOW()');
        console.log('✅ Connected to storyland_foods database');
    } catch (err) {
        console.error('❌ Failed to connect to storyland_foods:', err.message);
    }

    try {
        await retailPool.query('SELECT NOW()');
        console.log('✅ Connected to storyland_retail database');
    } catch (err) {
        console.error('❌ Failed to connect to storyland_retail:', err.message);
    }
}

// ============================================
// EXPORT POOLS
// ============================================

module.exports = {
    foods: foodsPool,
    retail: retailPool,
    testConnections
};
