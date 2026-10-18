const { foods, retail } = require('./db');
async function checkTables() {
    const q = "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'inspection%' OR table_name IN ('corrections','inspection_evidence','inspection_status_history') ORDER BY table_name";
    try {
        const f = await foods.query(q);
        console.log('foods:', f.rows.map(r => r.table_name));
        const r = await retail.query(q);
        console.log('retail:', r.rows.map(r => r.table_name));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
checkTables();
