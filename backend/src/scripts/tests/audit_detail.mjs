import '../config/env.js';
import pool from '../config/database.js';

// Detail omzet with NULL user_id
const [nullRows] = await pool.execute(
  'SELECT id, branch_id, date, total, cash, bayar_piutang, user_id FROM omzet WHERE user_id IS NULL ORDER BY date DESC'
);
console.log('\n=== omzet with NULL user_id ===');
nullRows.forEach(r => {
  const d = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date;
  console.log(`  id=${r.id} | branch=${r.branch_id} | date=${d} | total=${r.total}`);
});

// commissions columns
const [cols] = await pool.execute('SHOW COLUMNS FROM commissions');
console.log('\n=== commissions columns ===');
console.log(cols.map(c => c.Field).join(', '));

// finance_group_settings content
const [fgs] = await pool.execute('SELECT * FROM finance_group_settings LIMIT 5');
console.log('\n=== finance_group_settings ===');
fgs.forEach(r => console.log(`  key=${r.finance_group_key} | webhook=${r.webhook_url || '-'}`));

// All distinct group keys referenced across tables
const [faKeys] = await pool.execute('SELECT DISTINCT finance_group_key FROM finance_alerts');
const [farKeys] = await pool.execute('SELECT DISTINCT finance_group_key FROM finance_analysis_runs');
const [fgsKeys] = await pool.execute('SELECT DISTINCT finance_group_key FROM finance_group_settings');
const [brKeys] = await pool.execute('SELECT DISTINCT finance_group_key FROM branches WHERE finance_group_key IS NOT NULL');

console.log('\n=== finance_group_key references ===');
console.log('  finance_alerts:         ', faKeys.map(r => r.finance_group_key.substring(0,12)+'...'));
console.log('  finance_analysis_runs:  ', farKeys.map(r => r.finance_group_key.substring(0,12)+'...'));
console.log('  finance_group_settings: ', fgsKeys.map(r => r.finance_group_key.substring(0,12)+'...'));
console.log('  branches:               ', brKeys.map(r => r.finance_group_key.substring(0,12)+'...'));

// Check if there's a finance_groups or similar table under different name
const [tbls] = await pool.execute(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name"
);
console.log('\n=== ALL tables in DB ===');
tbls.forEach(r => console.log(`  ${r.table_name}`));

process.exit(0);
