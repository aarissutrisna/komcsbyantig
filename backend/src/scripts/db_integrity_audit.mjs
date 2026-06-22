/**
 * Database Integrity Audit Script
 * Checks for orphaned data, broken foreign key references,
 * and data inconsistencies across all application tables.
 */
import '../config/env.js';
import pool from '../config/database.js';

const DIVIDER = '─'.repeat(60);
const issues = [];
let totalChecks = 0;

async function check(label, sql, params = [], descFn = null) {
  totalChecks++;
  try {
    const [rows] = await pool.execute(sql, params);
    const count = rows[0]?.count !== undefined
      ? parseInt(rows[0].count)
      : rows.length;
    const status = count === 0 ? '✅ OK' : '⚠️  ISSUE';
    if (count > 0) {
      issues.push({ label, count, rows, descFn });
    }
    console.log(`  ${status.padEnd(12)} ${label.padEnd(55)} ${count > 0 ? `[${count} rows]` : ''}`);
    return rows;
  } catch (err) {
    console.log(`  ❌ ERROR     ${label}: ${err.message}`);
    issues.push({ label, count: -1, error: err.message });
    return [];
  }
}

async function singleValue(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows[0]?.[Object.keys(rows[0] || {})[0]] || 0;
}

// ─── TABLE EXISTS CHECK ────────────────────────────────────────────────────────
async function checkTableExists(tableName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.tables 
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName]
  );
  return parseInt(rows[0].cnt) > 0;
}

async function getTableRowCount(tableName) {
  try {
    const [rows] = await pool.execute(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    return parseInt(rows[0].cnt);
  } catch { return -1; }
}

console.log('\n' + '═'.repeat(65));
console.log('  DATABASE INTEGRITY AUDIT REPORT');
console.log(`  Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
console.log('═'.repeat(65));

// ─── 1. TABLE INVENTORY ────────────────────────────────────────────────────────
console.log('\n📦 SECTION 1: TABLE INVENTORY\n');
const knownTables = [
  'users', 'branches', 'omzet', 'omzetbulanan', 'commissions',
  'commission_mutations', 'withdrawal_requests', 'cs_penugasan',
  'bonus_claims', 'audit_logs', 'system_settings', 'finance_groups',
  'finance_group_settings', 'finance_alerts', 'finance_analysis_runs',
  'supplier_debts'
];

const tableStatus = {};
for (const t of knownTables) {
  const exists = await checkTableExists(t);
  const count = exists ? await getTableRowCount(t) : -1;
  tableStatus[t] = { exists, count };
  const icon = exists ? '✅' : '❌ MISSING';
  const countStr = exists ? `(${count.toLocaleString()} rows)` : '';
  console.log(`  ${icon.padEnd(12)} ${t.padEnd(35)} ${countStr}`);
}

// ─── 2. FOREIGN KEY / ORPHAN CHECKS ────────────────────────────────────────────
console.log('\n\n🔗 SECTION 2: FOREIGN KEY / ORPHAN DATA CHECKS\n');

// 2.1 Omzet → Branches
await check(
  'omzet.branch_id → branches.id',
  `SELECT COUNT(*) as count FROM omzet o
   WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = o.branch_id)`
);

// 2.2 Commissions → Users
await check(
  'commissions.user_id → users.id',
  `SELECT COUNT(*) as count FROM commissions c
   WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)`
);

// 2.3 Commissions → Branches
await check(
  'commissions.branch_id → branches.id',
  `SELECT COUNT(*) as count FROM commissions c
   WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = c.branch_id)`
);

// 2.4 Commissions → Omzet
await check(
  'commissions.omzet_id → omzet.id',
  `SELECT COUNT(*) as count FROM commissions c
   WHERE c.omzet_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM omzet o WHERE o.id = c.omzet_id)`
);

// 2.5 commission_mutations → Users
await check(
  'commission_mutations.user_id → users.id',
  `SELECT COUNT(*) as count FROM commission_mutations cm
   WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cm.user_id)`
);

// 2.6 commission_mutations → Branches
await check(
  'commission_mutations.branch_id → branches.id',
  `SELECT COUNT(*) as count FROM commission_mutations cm
   WHERE cm.branch_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = cm.branch_id)`
);

// 2.7 withdrawal_requests → Users
await check(
  'withdrawal_requests.user_id → users.id',
  `SELECT COUNT(*) as count FROM withdrawal_requests wr
   WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = wr.user_id)`
);

// 2.8 withdrawal_requests → Branches
await check(
  'withdrawal_requests.branch_id → branches.id',
  `SELECT COUNT(*) as count FROM withdrawal_requests wr
   WHERE wr.branch_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = wr.branch_id)`
);

// 2.9 cs_penugasan → Users
await check(
  'cs_penugasan.user_id → users.id',
  `SELECT COUNT(*) as count FROM cs_penugasan cp
   WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cp.user_id)`
);

// 2.10 cs_penugasan → Branches
await check(
  'cs_penugasan.cabang_id → branches.id',
  `SELECT COUNT(*) as count FROM cs_penugasan cp
   WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = cp.cabang_id)`
);

// 2.11 bonus_claims → Users
if (tableStatus['bonus_claims']?.exists) {
  await check(
    'bonus_claims.user_id → users.id',
    `SELECT COUNT(*) as count FROM bonus_claims bc
     WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = bc.user_id)`
  );
  await check(
    'bonus_claims.branch_id → branches.id',
    `SELECT COUNT(*) as count FROM bonus_claims bc
     WHERE bc.branch_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = bc.branch_id)`
  );
}

// 2.12 omzetbulanan → Branches
await check(
  'omzetbulanan.branch_id → branches.id',
  `SELECT COUNT(*) as count FROM omzetbulanan ob
   WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = ob.branch_id)`
);

// 2.13 audit_logs → Users
if (tableStatus['audit_logs']?.exists) {
  await check(
    'audit_logs.user_id → users.id (non-null)',
    `SELECT COUNT(*) as count FROM audit_logs al
     WHERE al.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = al.user_id)`
  );
}

// 2.14 finance_analysis_runs → finance_group_key
if (tableStatus['finance_analysis_runs']?.exists) {
  const hasFG = tableStatus['finance_groups']?.exists;
  if (hasFG) {
    await check(
      'finance_analysis_runs.finance_group_key → finance_groups',
      `SELECT COUNT(*) as count FROM finance_analysis_runs far
       WHERE NOT EXISTS (SELECT 1 FROM finance_groups fg WHERE fg.finance_group_key = far.finance_group_key)`
    );
  }
  await check(
    'finance_analysis_runs.triggered_by → users.id (non-null)',
    `SELECT COUNT(*) as count FROM finance_analysis_runs far
     WHERE far.triggered_by IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = far.triggered_by)`
  );
}

// 2.15 finance_alerts → finance_groups
if (tableStatus['finance_alerts']?.exists && tableStatus['finance_groups']?.exists) {
  await check(
    'finance_alerts.finance_group_key → finance_groups',
    `SELECT COUNT(*) as count FROM finance_alerts fa
     WHERE NOT EXISTS (SELECT 1 FROM finance_groups fg WHERE fg.finance_group_key = fa.finance_group_key)`
  );
}

// 2.16 branches.finance_group_key → finance_groups (nullable)
if (tableStatus['finance_groups']?.exists) {
  await check(
    'branches.finance_group_key → finance_groups (non-null)',
    `SELECT COUNT(*) as count FROM branches b
     WHERE b.finance_group_key IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM finance_groups fg WHERE fg.finance_group_key = b.finance_group_key)`
  );
}

// ─── 3. DATA CONSISTENCY CHECKS ────────────────────────────────────────────────
console.log('\n\n🔍 SECTION 3: DATA CONSISTENCY CHECKS\n');

// 3.1 Users with role but no assignments in cs_penugasan
await check(
  'Users (role=cs) with NO cs_penugasan entry',
  `SELECT COUNT(*) as count FROM users u
   WHERE u.role = 'cs'
   AND NOT EXISTS (SELECT 1 FROM cs_penugasan cp WHERE cp.user_id = u.id)`
);

// 3.2 Active penugasan without valid branch
await check(
  'cs_penugasan with NULL cabang_id',
  `SELECT COUNT(*) as count FROM cs_penugasan WHERE cabang_id IS NULL`
);

// 3.3 Omzet with NULL or zero user_id
await check(
  'omzet with NULL user_id',
  `SELECT COUNT(*) as count FROM omzet WHERE user_id IS NULL`
);

// 3.4 Omzet date sanity (future dates)
await check(
  'omzet with future date (> today)',
  `SELECT COUNT(*) as count FROM omzet WHERE date > CURDATE()`
);

// 3.5 Commissions with negative amount
await check(
  'commissions with negative commission_amount',
  `SELECT COUNT(*) as count FROM commissions WHERE commission_amount < 0`
);

// 3.6 Duplicate omzet per branch+date+user
await check(
  'Duplicate omzet (same branch+date+user_id)',
  `SELECT COUNT(*) as count FROM (
     SELECT branch_id, date, user_id, COUNT(*) as n
     FROM omzet
     GROUP BY branch_id, date, user_id
     HAVING n > 1
   ) as dups`
);

// 3.7 Withdrawal with unknown status
await check(
  'withdrawal_requests with invalid status',
  `SELECT COUNT(*) as count FROM withdrawal_requests
   WHERE status NOT IN ('pending','approved','rejected','cancelled')`
);

// 3.8 Withdrawal approved but no commission_mutations debit
await check(
  'Approved withdrawals missing commission_mutations entry',
  `SELECT COUNT(*) as count FROM withdrawal_requests wr
   WHERE wr.status = 'approved'
   AND NOT EXISTS (
     SELECT 1 FROM commission_mutations cm
     WHERE cm.user_id = wr.user_id
     AND cm.tipe = 'keluar'
     AND cm.nominal = wr.nominal
   )`
);

// 3.9 commission_mutations with tipe not in expected values
await check(
  'commission_mutations with invalid tipe',
  `SELECT COUNT(*) as count FROM commission_mutations
   WHERE tipe NOT IN ('masuk','keluar')`
);

// 3.10 Users with branch_id that doesn't exist
await check(
  'users.branch_id → branches.id (non-null)',
  `SELECT COUNT(*) as count FROM users u
   WHERE u.branch_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = u.branch_id)`
);

// 3.11 Duplicate finance_group_key in branches (if applicable)
if (tableStatus['finance_groups']?.exists) {
  await check(
    'branches: multiple finance_group_key assignments (same key, >1 unique values)',
    `SELECT COUNT(*) as count FROM (
       SELECT finance_group_key, COUNT(DISTINCT id) as branch_count
       FROM branches
       WHERE finance_group_key IS NOT NULL
       GROUP BY finance_group_key
     ) t WHERE branch_count > 5`
  );
}

// 3.12 finance_analysis_runs with malformed result_json
if (tableStatus['finance_analysis_runs']?.exists) {
  const [jsonRows] = await pool.execute(
    `SELECT id, result_json FROM finance_analysis_runs 
     WHERE result_json IS NOT NULL LIMIT 200`
  );
  let malformed = 0;
  for (const r of jsonRows) {
    try {
      const parsed = typeof r.result_json === 'string'
        ? JSON.parse(r.result_json) : r.result_json;
      if (!parsed?.daily || !parsed?.biweekly_buckets) malformed++;
    } catch { malformed++; }
  }
  const status = malformed === 0 ? '✅ OK' : '⚠️  ISSUE';
  console.log(`  ${status.padEnd(12)} ${'finance_analysis_runs: malformed result_json'.padEnd(55)} ${malformed > 0 ? `[${malformed} rows]` : ''}`);
  if (malformed > 0) issues.push({ label: 'finance_analysis_runs: malformed result_json', count: malformed });
  totalChecks++;
}

// ─── 4. SALDO CONSISTENCY ──────────────────────────────────────────────────────
console.log('\n\n💰 SECTION 4: SALDO CONSISTENCY CHECKS\n');

// 4.1 Find users where calculated saldo != expected
const [users] = await pool.execute(
  `SELECT id, nama, saldo_awal FROM users WHERE role = 'cs' LIMIT 100`
);
let saldoMismatch = 0;
const saldoIssues = [];
for (const user of users) {
  const [cRow] = await pool.execute(
    `SELECT COALESCE(SUM(commission_amount),0) as total FROM commissions WHERE user_id = ?`,
    [user.id]
  );
  const [mRow] = await pool.execute(
    `SELECT COALESCE(SUM(CASE WHEN tipe='masuk' THEN nominal ELSE -nominal END),0) as net
     FROM commission_mutations WHERE user_id = ?`,
    [user.id]
  );
  const totalKomisi = parseFloat(cRow[0].total);
  const netMutasi = parseFloat(mRow[0].net);
  const expectedSaldo = (parseFloat(user.saldo_awal) || 0) + totalKomisi + netMutasi;
  // Tolerance 1 IDR for floating point
  if (Math.abs(expectedSaldo) < -1) {
    saldoMismatch++;
    saldoIssues.push({ nama: user.nama, expected: expectedSaldo });
  }
}
const saldoStatus = saldoMismatch === 0 ? '✅ OK' : '⚠️  ISSUE';
console.log(`  ${saldoStatus.padEnd(12)} ${'CS saldo calculation consistency'.padEnd(55)} ${saldoMismatch > 0 ? `[${saldoMismatch} users]` : ''}`);
totalChecks++;

// ─── 5. NULL CRITICAL FIELDS ──────────────────────────────────────────────────
console.log('\n\n🔎 SECTION 5: NULL / EMPTY CRITICAL FIELDS\n');

await check(
  'users with NULL nama',
  `SELECT COUNT(*) as count FROM users WHERE nama IS NULL OR nama = ''`
);
await check(
  'users with NULL role',
  `SELECT COUNT(*) as count FROM users WHERE role IS NULL OR role = ''`
);
await check(
  'branches with NULL name',
  `SELECT COUNT(*) as count FROM branches WHERE name IS NULL OR name = ''`
);
await check(
  'omzet with NULL total',
  `SELECT COUNT(*) as count FROM omzet WHERE total IS NULL`
);
await check(
  'commissions with NULL period_start',
  `SELECT COUNT(*) as count FROM commissions WHERE period_start IS NULL`
);

// ─── 6. DUPLICATE KEY CHECKS ──────────────────────────────────────────────────
console.log('\n\n🔄 SECTION 6: DUPLICATE / UNIQUE CONSTRAINT CHECKS\n');

await check(
  'Duplicate users.email',
  `SELECT COUNT(*) as count FROM (
     SELECT email, COUNT(*) as n FROM users
     WHERE email IS NOT NULL GROUP BY email HAVING n > 1
   ) as dups`
);
await check(
  'Duplicate branches.id',
  `SELECT COUNT(*) as count FROM (
     SELECT id, COUNT(*) as n FROM branches GROUP BY id HAVING n > 1
   ) as dups`
);
await check(
  'Duplicate omzetbulanan (branch_id+month+year)',
  `SELECT COUNT(*) as count FROM (
     SELECT branch_id, month, year, COUNT(*) as n FROM omzetbulanan
     GROUP BY branch_id, month, year HAVING n > 1
   ) as dups`
);

// ─── SUMMARY REPORT ───────────────────────────────────────────────────────────
console.log('\n\n' + '═'.repeat(65));
console.log('  AUDIT SUMMARY');
console.log('═'.repeat(65));

const missingTables = Object.entries(tableStatus).filter(([, v]) => !v.exists);
const errorChecks = issues.filter(i => i.count === -1);
const failedChecks = issues.filter(i => i.count > 0);

console.log(`\n  Total checks run  : ${totalChecks}`);
console.log(`  Missing tables    : ${missingTables.length}`);
console.log(`  Issues found      : ${failedChecks.length}`);
console.log(`  Check errors      : ${errorChecks.length}`);
console.log(`  Status            : ${failedChecks.length === 0 && missingTables.length === 0 ? '✅ CLEAN' : '⚠️  NEEDS ATTENTION'}`);

if (missingTables.length > 0) {
  console.log('\n  ❌ MISSING TABLES:');
  missingTables.forEach(([t]) => console.log(`     - ${t}`));
}

if (failedChecks.length > 0) {
  console.log('\n  ⚠️  ISSUES REQUIRING ATTENTION:');
  failedChecks.forEach(i => {
    console.log(`\n  [${i.count} rows] ${i.label}`);
    if (i.rows && i.rows.length <= 5 && i.rows[0]) {
      console.log('  Sample data:', JSON.stringify(i.rows.slice(0, 3), null, 2).split('\n').map(l => '    ' + l).join('\n'));
    }
  });
}

console.log('\n' + '═'.repeat(65) + '\n');
process.exit(0);
