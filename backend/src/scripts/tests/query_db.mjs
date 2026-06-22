import '../config/env.js';
import pool from '../config/database.js';

async function run() {
  try {
    const [tables] = await pool.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()");
    console.log('--- DATABASE TABLES AND COLUMNS ---');
    for (const t of tables) {
      const name = t.table_name;
      const [cols] = await pool.execute(`SHOW COLUMNS FROM \`${name}\``);
      console.log(`Table: ${name}`);
      cols.forEach(c => {
        console.log(`  - ${c.Field} (${c.Type}) | Null: ${c.Null} | Key: ${c.Key} | Default: ${c.Default}`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();

