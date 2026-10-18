const { foods, retail } = require('./db');
const fs = require('fs');
const path = require('path');

async function run() {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'inspections_tables.sql'), 'utf8');
    try {
        console.log('Running inspections tables on storyland_foods...');
        await foods.query(sql);
        console.log('Running inspections tables on storyland_retail...');
        await retail.query(sql);
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
