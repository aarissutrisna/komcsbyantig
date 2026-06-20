import '../config/env.js';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migration_bonus_transfer_claims.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split statements by semicolon, but handle comment lines
    const statements = sql
      .split(';')
      .map(stmt => {
        // Remove comment lines
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0);

    console.log(`Running migration from ${sqlPath}...`);
    for (const statement of statements) {
      console.log(`Executing: ${statement.split('\n')[0]}...`);
      await pool.query(statement);
    }
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
