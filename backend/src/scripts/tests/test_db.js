import '../config/env.js';
import pool from '../config/database.js';

async function test() {
  try {
    const [claims] = await pool.execute('SELECT * FROM bonus_transfer_claims');
    console.log('Claims count:', claims.length);
    console.log('Claims:', claims);
    const [items] = await pool.execute('SELECT * FROM bonus_transfer_claim_items');
    console.log('Items count:', items.length);
    console.log('Items:', items);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
test();
