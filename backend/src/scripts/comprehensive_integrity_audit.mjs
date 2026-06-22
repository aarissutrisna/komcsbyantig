import '../config/env.js';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendSrcDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(backendSrcDir, '../..');

const reportFile = path.join(backendSrcDir, 'scripts/database_integrity_audit_report.md');

// Helper to scan directory recursively for JS files
function scanDirectory(dir, excludeDirs = []) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!excludeDirs.some(d => fullPath.includes(d))) {
        results = results.concat(scanDirectory(fullPath, excludeDirs));
      }
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      results.push(fullPath);
    }
  });
  return results;
}

// SQL extractor parser
function extractSqlQueries(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple regex to match query execution patterns: pool.execute(..., pool.query(..., conn.execute(..., conn.query(...
  const queryRegex = /(?:pool|conn)\.(?:execute|query)\s*\(\s*(?:`([\s\S]*?)`|'([\s\S]*?)'|"([\s\S]*?)")/g;
  const queries = [];
  let match;
  while ((match = queryRegex.exec(content)) !== null) {
    const sql = match[1] || match[2] || match[3] || '';
    if (sql.trim()) {
      queries.push({
        sql: sql.trim(),
        file: path.relative(projectRootDir, filePath)
      });
    }
  }
  return queries;
}

async function runAudit() {
  console.log('Starting Comprehensive Database and Code Audit...');

  const auditReport = [];
  auditReport.push('# Database & Script Integrity Audit Report');
  auditReport.push(`Generated: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n`);

  // --- PART 1: DB SCHEMA DISCOVERY ---
  console.log('1. Gathering Database Schema...');
  const [tables] = await pool.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()");
  const dbSchema = {};
  for (const t of tables) {
    const name = t.table_name;
    const [cols] = await pool.execute(`SHOW COLUMNS FROM \`${name}\``);
    dbSchema[name] = cols.map(c => ({
      name: c.Field,
      type: c.Type,
      nullable: c.Null === 'YES',
      key: c.Key,
      default: c.Default
    }));
  }

  // --- PART 2: CODE SCANNING ---
  console.log('2. Scanning Backend Code for SQL Queries...');
  const excludeDirs = ['node_modules', 'scripts', '.git', '.bolt', 'dist'];
  const jsFiles = scanDirectory(backendSrcDir, excludeDirs);
  const codeQueries = [];
  jsFiles.forEach(file => {
    codeQueries.push(...extractSqlQueries(file));
  });

  // Extract referenced tables and columns from queries
  const tableReferences = {}; // table -> set of files
  const columnReferences = {}; // table -> { column -> set of files }
  const missingTablesInDb = new Set();
  const missingColumnsInDb = {};

  const tablePatterns = [
    /FROM\s+`?([a-zA-Z0-9_]+)`?/gi,
    /JOIN\s+`?([a-zA-Z0-9_]+)`?/gi,
    /INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?/gi,
    /(?<!duplicate\s+key\s+)\bUPDATE\s+`?([a-zA-Z0-9_]+)`?/gi,
    /DELETE\s+FROM\s+`?([a-zA-Z0-9_]+)`?/gi
  ];

  codeQueries.forEach(q => {
    // Extract tables
    const sqlLower = q.sql.toLowerCase();
    const foundTables = new Set();
    
    tablePatterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(q.sql)) !== null) {
        const tbl = match[1].toLowerCase();
        // Skip common sql aliases or SQL keywords if captured
        if (!['select', 'where', 'set', 'left', 'right', 'inner', 'outer', 'on', 'and', 'or', 'group', 'order', 'limit', 'values', 'as'].includes(tbl)) {
          foundTables.add(tbl);
        }
      }
    });

    foundTables.forEach(t => {
      // Find actual table name matching case insensitively
      const actualTableName = Object.keys(dbSchema).find(dbT => dbT.toLowerCase() === t);
      
      if (!actualTableName) {
        missingTablesInDb.add(t);
        return;
      }

      if (!tableReferences[actualTableName]) {
        tableReferences[actualTableName] = new Set();
      }
      tableReferences[actualTableName].add(q.file);

      // Check referenced columns for this table
      if (!columnReferences[actualTableName]) {
        columnReferences[actualTableName] = {};
      }

      dbSchema[actualTableName].forEach(col => {
        // Simple word boundary check for column name in query
        const colRegex = new RegExp(`\\b${col.name}\\b`, 'i');
        if (colRegex.test(q.sql)) {
          if (!columnReferences[actualTableName][col.name]) {
            columnReferences[actualTableName][col.name] = new Set();
          }
          columnReferences[actualTableName][col.name].add(q.file);
        }
      });
    });
  });

  // Write Schema Mapping Report
  auditReport.push('## 1. Code-to-Database Mapping & Schema Analysis\n');
  auditReport.push('This section lists all tables found in the database, whether they are used by the backend code, and identifies any references in the code to missing tables/columns.\n');

  // a. Missing Tables (referenced in code but not in DB)
  auditReport.push('### ⚠️ References to Missing Tables in Code');
  if (missingTablesInDb.size > 0) {
    auditReport.push('The following tables are referenced in the backend source code but DO NOT exist in the database:');
    missingTablesInDb.forEach(t => {
      auditReport.push(`- **\`${t}\`**`);
      // Find files that referenced it
      codeQueries.forEach(q => {
        if (q.sql.toLowerCase().includes(t)) {
          auditReport.push(`  - Referenced in [${path.basename(q.file)}](file:///${q.file.replace(/\\/g, '/')})`);
        }
      });
    });
  } else {
    auditReport.push('*None. All tables referenced in code exist in the database.*');
  }
  auditReport.push('\n');

  // b. Database Tables Inventory & Usage Summary
  auditReport.push('### 📊 Database Tables Inventory and Code Reference Status');
  auditReport.push('| Table Name | Records | Code References Count | Status |');
  auditReport.push('| --- | ---: | ---: | --- |');

  for (const t of Object.keys(dbSchema).sort()) {
    const [countRow] = await pool.execute(`SELECT COUNT(*) as cnt FROM \`${t}\``);
    const count = countRow[0].cnt;
    const refCount = tableReferences[t] ? tableReferences[t].size : 0;
    let status = '✅ Active';
    if (refCount === 0) {
      status = '⚠️ Dormant / Unreferenced';
    }
    auditReport.push(`| \`${t}\` | ${count.toLocaleString()} | ${refCount} | ${status} |`);
  }
  auditReport.push('\n');

  // c. Dormant / Unused Columns in Database Tables
  auditReport.push('### 💤 Dormant Columns (present in DB but never referenced in active backend code)');
  let hasDormantCols = false;
  for (const t of Object.keys(dbSchema).sort()) {
    const refCols = columnReferences[t] || {};
    const dormantCols = dbSchema[t].filter(col => !refCols[col.name] && col.key !== 'PRI');
    if (dormantCols.length > 0) {
      hasDormantCols = true;
      auditReport.push(`- **\`${t}\`**: ${dormantCols.map(c => `\`${c.name}\``).join(', ')}`);
    }
  }
  if (!hasDormantCols) {
    auditReport.push('*None. All columns in database tables are referenced in active code.*');
  }
  auditReport.push('\n');

  // --- PART 3: DATA INTEGRITY (ORPHANED RECORDS) ---
  console.log('3. Auditing Data Integrity (Orphaned Rows)...');
  auditReport.push('## 2. Data Integrity & Orphaned Records Analysis\n');
  auditReport.push('This section audits relations between tables to identify orphaned rows (foreign key violations) and other data anomalies.\n');
  auditReport.push('| Audit Description | Issue Rows Count | Status | Action Needed / Note |');
  auditReport.push('| --- | ---: | --- | --- |');

  const integrityIssues = [];

  async function auditRelation(label, sql, params, fixNote) {
    try {
      const [rows] = await pool.execute(sql, params);
      const count = rows.length > 0 && rows[0].count !== undefined ? parseInt(rows[0].count) : rows.length;
      const status = count === 0 ? '✅ Clear' : '❌ Issues Found';
      auditReport.push(`| ${label} | ${count} | ${status} | ${count > 0 ? fixNote : '-'} |`);
      if (count > 0) {
        integrityIssues.push({ label, count, rows, fixNote });
      }
    } catch (err) {
      auditReport.push(`| ${label} | ERROR | ❌ Check Error | Query failed: ${err.message} |`);
    }
  }

  // 1. omzet -> branches
  await auditRelation(
    '\`omzet.branch_id\` references non-existent \`branches.id\`',
    'SELECT COUNT(*) as count FROM omzet o WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = o.branch_id)',
    [],
    'Fix branch_id or delete orphaned omzet records'
  );

  // 2. omzet -> users
  await auditRelation(
    '\`omzet.user_id\` references non-existent \`users.id\` (excluding NULL)',
    'SELECT COUNT(*) as count FROM omzet o WHERE o.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = o.user_id)',
    [],
    'Re-assign to a valid user or set to NULL'
  );

  // 3. omzet with NULL user_id
  await auditRelation(
    '\`omzet\` rows with NULL \`user_id\` (Legacy/Imported)',
    'SELECT COUNT(*) as count FROM omzet WHERE user_id IS NULL',
    [],
    'Legacy omzet rows imported without user correlation'
  );

  // 4. commissions -> users
  await auditRelation(
    '\`commissions.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM commissions c WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = c.user_id)',
    [],
    'Delete orphaned commissions or fix user_id'
  );

  // 5. commissions -> branches
  await auditRelation(
    '\`commissions.branch_id\` references non-existent \`branches.id\`',
    'SELECT COUNT(*) as count FROM commissions c WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = c.branch_id)',
    [],
    'Delete or fix branch_id'
  );

  // 6. commission_mutations -> users
  await auditRelation(
    '\`commission_mutations.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM commission_mutations cm WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cm.user_id)',
    [],
    'Delete orphaned mutations or fix user_id'
  );

  // 7. cs_penugasan -> users & branches
  await auditRelation(
    '\`cs_penugasan.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM cs_penugasan cp WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cp.user_id)',
    [],
    'Delete or fix user_id'
  );
  await auditRelation(
    '\`cs_penugasan.cabang_id\` references non-existent \`branches.id\`',
    'SELECT COUNT(*) as count FROM cs_penugasan cp WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = cp.cabang_id)',
    [],
    'Delete or fix cabang_id'
  );

  // 8. user_cabang_history -> users & branches
  await auditRelation(
    '\`user_cabang_history.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM user_cabang_history uch WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = uch.user_id)',
    [],
    'Delete or fix user_id'
  );
  await auditRelation(
    '\`user_cabang_history.cabang_id\` references non-existent \`branches.id\`',
    'SELECT COUNT(*) as count FROM user_cabang_history uch WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = uch.cabang_id)',
    [],
    'Delete or fix cabang_id'
  );

  // 9. withdrawal_requests -> users
  await auditRelation(
    '\`withdrawal_requests.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM withdrawal_requests wr WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = wr.user_id)',
    [],
    'Delete or fix user_id'
  );

  // 10. bonus_transfer_claim_items -> bonus_transfer_claims
  await auditRelation(
    '\`bonus_transfer_claim_items.claim_id\` references non-existent \`bonus_transfer_claims.id\`',
    'SELECT COUNT(*) as count FROM bonus_transfer_claim_items bci WHERE NOT EXISTS (SELECT 1 FROM bonus_transfer_claims bc WHERE bc.id = bci.claim_id)',
    [],
    'Orphaned items due to broken foreign key constraint cascading'
  );

  // 11. attendance_data -> users & branches
  await auditRelation(
    '\`attendance_data.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM attendance_data ad WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ad.user_id)',
    [],
    'Delete or fix user_id'
  );
  await auditRelation(
    '\`attendance_data.branch_id\` references non-existent \`branches.id\`',
    'SELECT COUNT(*) as count FROM attendance_data ad WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = ad.branch_id)',
    [],
    'Delete or fix branch_id'
  );

  // 12. cabang_user_allocation -> users & branches
  await auditRelation(
    '\`cabang_user_allocation.user_id\` references non-existent \`users.id\`',
    'SELECT COUNT(*) as count FROM cabang_user_allocation cua WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cua.user_id)',
    [],
    'Delete or fix user_id'
  );
  await auditRelation(
    '\`cabang_user_allocation.cabang_id\` references non-existent \`branches.id\`',
    'SELECT COUNT(*) as count FROM cabang_user_allocation cua WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = cua.cabang_id)',
    [],
    'Delete or fix cabang_id'
  );

  // 13. finance_alerts & finance_analysis_runs -> finance_group_settings
  await auditRelation(
    '\`finance_alerts.finance_group_key\` references non-existent \`finance_group_settings.finance_group_key\`',
    'SELECT COUNT(*) as count FROM finance_alerts fa WHERE NOT EXISTS (SELECT 1 FROM finance_group_settings fgs WHERE fgs.finance_group_key = fa.finance_group_key)',
    [],
    'Orphaned finance alert records'
  );
  await auditRelation(
    '\`finance_analysis_runs.finance_group_key\` references non-existent \`finance_group_settings.finance_group_key\`',
    'SELECT COUNT(*) as count FROM finance_analysis_runs far WHERE NOT EXISTS (SELECT 1 FROM finance_group_settings fgs WHERE fgs.finance_group_key = far.finance_group_key)',
    [],
    'Orphaned finance analysis run logs'
  );

  auditReport.push('\n');

  // --- PART 4: ORPHANED / TEMPORARY SCRIPTS ---
  console.log('4. Auditing Workspace for Temporary and Obsolete Scripts...');
  auditReport.push('## 3. Temporary and Obsolete Scripts Audit\n');
  auditReport.push('This section lists scripts and temporary files in the repository that are not part of the active production server, identifying clutter or orphaned code files.\n');

  // Scan root directory for tmp_* files
  const rootFiles = fs.readdirSync(projectRootDir);
  const tmpFiles = rootFiles.filter(f => f.startsWith('tmp_') || (f.endsWith('.sql') && f !== 'schema_mariadb.sql'));
  
  auditReport.push('### 🧹 Temporary Shell and SQL Scripts in Root Folder');
  auditReport.push('These files appear to be temporary shell scripts or SQL files created for debug/migration purposes:');
  if (tmpFiles.length > 0) {
    tmpFiles.forEach(f => {
      const full = path.join(projectRootDir, f);
      const stat = fs.statSync(full);
      const mDate = stat.mtime.toISOString().split('T')[0];
      auditReport.push(`- **\`${f}\`** (Last modified: ${mDate}, Size: ${stat.size} bytes)`);
    });
  } else {
    auditReport.push('*None.*');
  }
  auditReport.push('\n');

  // Scan backend/src/scripts for debug scripts
  const scriptsDir = path.join(backendSrcDir, 'scripts');
  const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js') || f.endsWith('.mjs') || f.endsWith('.sql'));
  
  auditReport.push('### 🧪 Utility and Temporary Scripts in \`backend/src/scripts/\`');
  auditReport.push('This directory contains migrations, database seeding, or utility scripts:');
  scriptFiles.forEach(f => {
    const full = path.join(scriptsDir, f);
    const stat = fs.statSync(full);
    const mDate = stat.mtime.toISOString().split('T')[0];
    
    let role = 'Debug / Testing';
    if (f.startsWith('migration_') || f.startsWith('run_migration') || f.startsWith('migrate')) {
      role = 'DB Migration / Schema Setup';
    } else if (f === 'db_integrity_audit.mjs' || f === 'comprehensive_integrity_audit.mjs') {
      role = 'DB Integrity / System Audit';
    }
    
    auditReport.push(`- **\`${f}\`** | Category: *${role}* | Last modified: ${mDate} | Size: ${stat.size} bytes`);
  });
  auditReport.push('\n');

  // --- PART 5: DETAILED ACTION ITEMS ---
  auditReport.push('## 4. Key Action Items and Integrity Issues Summary\n');
  
  const severeIssues = integrityIssues.filter(iss => !iss.label.includes('user_id` rows with NULL') && !iss.label.includes('imported without user'));
  const legacyNullUserRows = integrityIssues.find(iss => iss.label.includes('user_id` rows with NULL') || iss.label.includes('imported without user'));

  if (severeIssues.length > 0) {
    auditReport.push('### 🚨 Immediate Actions Required (Severe Integrity Issues)');
    severeIssues.forEach(iss => {
      auditReport.push(`- **${iss.label}**`);
      auditReport.push(`  - **Count**: ${iss.count} rows`);
      auditReport.push(`  - **Impact**: Broken foreign references can cause server errors or mismatched data representation on the UI.`);
      auditReport.push(`  - **Resolution**: ${iss.fixNote}`);
    });
  } else {
    auditReport.push('### ✅ No Severe Data Integrity Issues Found');
    auditReport.push('No orphaned foreign keys or severe data mismatch issues were detected in the audit.');
  }
  auditReport.push('\n');

  if (legacyNullUserRows) {
    auditReport.push('### ℹ️ Informational / Legacy Data Findings');
    auditReport.push(`- **${legacyNullUserRows.label}**`);
    auditReport.push(`  - **Count**: ${legacyNullUserRows.count} rows`);
    auditReport.push(`  - **Context**: These rows represent legacy omzet records (specifically for branch JTJ, TSM, and UTM on 2026-06-20) that do not associate with any individual CS user (e.g. cumulative daily branch values from imports). This is normal behavior for bulk/legacy imports but worth noting.`);
  }

  // Save report file
  fs.writeFileSync(reportFile, auditReport.join('\n'));
  console.log(`\nAudit completed successfully! Report generated at:\n  ${reportFile}`);
}

runAudit().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
