// Rebuild stats for all months with omzet data that haven't been aggregated
import './env.js';
import * as omzetAnalysisService from '../services/omzetAnalysisService.js';
import pool from './database.js';

const rebuildAll = async () => {
    // Find all year+month combos that exist in omzet table
    const [months] = await pool.execute(
        'SELECT DISTINCT YEAR(date) as year, MONTH(date) as month FROM omzet ORDER BY year, month'
    );
    console.log(`Found ${months.length} month-periods to process...`);
    for (const { year, month } of months) {
        try {
            const result = await omzetAnalysisService.rebuildAggregation(year, month);
            console.log(`✓ ${month}/${year}: ${result.processedBranches} branches`);
        } catch (e) {
            console.error(`✗ ${month}/${year}:`, e.message);
        }
    }
    process.exit(0);
};

rebuildAll();
