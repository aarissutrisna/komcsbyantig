import '../config/env.js';
import pool from '../config/database.js';

async function run() {
  try {
    const claimId = 8;
    console.log(`Attempting to delete claim ID ${claimId}...`);
    const [result] = await pool.execute('DELETE FROM bonus_transfer_claims WHERE id = ?', [claimId]);
    console.log('Delete result:', result);
  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await pool.end();
  }
}
run();
