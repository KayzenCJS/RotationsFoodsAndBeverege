const { foods, retail } = require('./db');

async function deleteSandwichOasis() {
    try {
        // Delete from foods database
        console.log('Deleting sandwich-oasis from foods database...');
        await foods.query('DELETE FROM locations WHERE id = $1', ['sandwich-oasis']);
        await foods.query('DELETE FROM location_required_roles WHERE location_id = $1', ['sandwich-oasis']);
        console.log('✅ Deleted from foods database');

        // Delete from retail database (if exists)
        console.log('Checking retail database...');
        await retail.query('DELETE FROM locations WHERE id = $1', ['sandwich-oasis']);
        await retail.query('DELETE FROM location_required_roles WHERE location_id = $1', ['sandwich-oasis']);
        console.log('✅ Deleted from retail database');

        console.log('\n✅ Sandwich Oasis deleted successfully from both databases!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error deleting Sandwich Oasis:', error);
        process.exit(1);
    }
}

deleteSandwichOasis();
