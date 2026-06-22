import '../../config/env.js';
import pool from '../../config/database.js';

async function run() {
  try {
    const [rows] = await pool.execute(
      'SELECT id, finance_group_key, run_label, cash_position_used, avg_daily_revenue, result_json, created_at FROM finance_analysis_runs ORDER BY created_at DESC LIMIT 5'
    );
    console.log(`Found ${rows.length} analysis runs.`);
    for (const r of rows) {
      console.log('--------------------------------------------------');
      console.log(`ID: ${r.id}`);
      console.log(`Label: ${r.run_label}`);
      console.log(`Date: ${r.created_at}`);
      console.log(`Cash Position Used: ${r.cash_position_used}`);
      console.log(`Avg Daily Revenue: ${r.avg_daily_revenue}`);
      
      const parsedResult = typeof r.result_json === 'string' ? JSON.parse(r.result_json) : r.result_json;
      console.log('Result JSON summary:');
      console.log(`  daily_target: ${JSON.stringify(parsedResult?.daily || parsedResult?.daily_target || parsedResult)}`);
      if (parsedResult?.biweekly_buckets) {
        console.log(`  biweekly_buckets: ${JSON.stringify(parsedResult.biweekly_buckets)}`);
      }
      if (parsedResult?.aging_summary) {
        console.log(`  aging_summary: ${JSON.stringify(parsedResult.aging_summary)}`);
      }
      // If we have detail debts or lists inside:
      if (parsedResult?.debt_list) {
        console.log(`  debt_list (first 3): ${JSON.stringify(parsedResult.debt_list.slice(0, 3))}`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
