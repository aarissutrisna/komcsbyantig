import '../config/env.js';
import pool from '../config/database.js';

async function run() {
  try {
    const [rows] = await pool.execute(
      `SELECT id, run_label, created_at, 
              LEFT(CAST(source_debt_snapshot AS CHAR), 200) as snapshot_preview,
              JSON_KEYS(result_json) as result_keys
       FROM finance_analysis_runs ORDER BY created_at DESC`
    );
    console.log('Analysis Runs:', rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
