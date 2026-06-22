import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: 'localhost',
  user: 'root',
  password: 'kuda4000',
  database: 'cs_commission',
  multipleStatements: true
};

async function runFix() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('  FINANCE ANALYSIS DATABASE FIX');
    console.log('═══════════════════════════════════════════════════\n');

    // Step 1: Check current state
    console.log('📊 Step 1: Checking current state...');
    console.log('───────────────────────────────────────────────────');
    
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME LIKE 'finance_%'
       ORDER BY TABLE_NAME`
    );
    console.log('Finance tables found:');
    tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`));
    
    const [fkCount] = await connection.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME IN ('finance_group_settings', 'finance_cash_position', 'finance_analysis_runs', 'finance_alerts')
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
    );
    console.log(`\nExisting foreign keys: ${fkCount[0].count}`);

    // Step 2: Check orphaned records BEFORE fix
    console.log('\n🔍 Step 2: Checking orphaned records BEFORE fix...');
    console.log('───────────────────────────────────────────────────');
    
    const [orphanedCash] = await connection.execute(
      `SELECT COUNT(*) as count FROM finance_cash_position fcp
       LEFT JOIN branches b ON fcp.finance_group_key = b.finance_group_key
       WHERE b.finance_group_key IS NULL`
    );
    console.log(`  finance_cash_position: ${orphanedCash[0].count} orphaned`);

    const [orphanedRuns] = await connection.execute(
      `SELECT COUNT(*) as count FROM finance_analysis_runs far
       LEFT JOIN branches b ON far.finance_group_key = b.finance_group_key
       WHERE b.finance_group_key IS NULL`
    );
    console.log(`  finance_analysis_runs: ${orphanedRuns[0].count} orphaned`);

    const [orphanedAlerts] = await connection.execute(
      `SELECT COUNT(*) as count FROM finance_alerts fa
       LEFT JOIN branches b ON fa.finance_group_key = b.finance_group_key
       LEFT JOIN finance_analysis_runs far ON fa.analysis_run_id = far.id
       WHERE b.finance_group_key IS NULL OR far.id IS NULL`
    );
    console.log(`  finance_alerts: ${orphanedAlerts[0].count} orphaned`);

    // Step 3: Add foreign keys
    console.log('\n🔧 Step 3: Adding foreign key constraints...');
    console.log('───────────────────────────────────────────────────');

    const fkStatements = [
      {
        name: 'fk_fgs_branches',
        table: 'finance_group_settings',
        sql: `ALTER TABLE finance_group_settings ADD CONSTRAINT fk_fgs_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE`
      },
      {
        name: 'fk_fcp_branches',
        table: 'finance_cash_position',
        sql: `ALTER TABLE finance_cash_position ADD CONSTRAINT fk_fcp_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE`
      },
      {
        name: 'fk_far_branches',
        table: 'finance_analysis_runs',
        sql: `ALTER TABLE finance_analysis_runs ADD CONSTRAINT fk_far_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE`
      },
      {
        name: 'fk_fa_branches',
        table: 'finance_alerts',
        sql: `ALTER TABLE finance_alerts ADD CONSTRAINT fk_fa_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE`
      }
    ];

    for (const fk of fkStatements) {
      try {
        await connection.execute(fk.sql);
        console.log(`  ✓ Added FK ${fk.name} to ${fk.table}`);
      } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`   FK ${fk.name} already exists, skipping`);
        } else {
          console.error(`  ✗ Failed to add FK ${fk.name}: ${err.message}`);
        }
      }
    }

    // Step 4: Cleanup orphaned records
    console.log('\n Step 4: Cleaning up orphaned records...');
    console.log('───────────────────────────────────────────────────');

    const [deletedCash] = await connection.execute(
      `DELETE fcp FROM finance_cash_position fcp
       LEFT JOIN branches b ON fcp.finance_group_key = b.finance_group_key
       WHERE b.finance_group_key IS NULL`
    );
    console.log(`  ✓ Deleted ${deletedCash.affectedRows} orphaned finance_cash_position records`);

    const [deletedAlerts] = await connection.execute(
      `DELETE fa FROM finance_alerts fa
       LEFT JOIN branches b ON fa.finance_group_key = b.finance_group_key
       LEFT JOIN finance_analysis_runs far ON fa.analysis_run_id = far.id
       WHERE b.finance_group_key IS NULL OR far.id IS NULL`
    );
    console.log(`  ✓ Deleted ${deletedAlerts.affectedRows} orphaned finance_alerts records`);

    const [deletedRuns] = await connection.execute(
      `DELETE far FROM finance_analysis_runs far
       LEFT JOIN branches b ON far.finance_group_key = b.finance_group_key
       WHERE b.finance_group_key IS NULL`
    );
    console.log(`  ✓ Deleted ${deletedRuns.affectedRows} orphaned finance_analysis_runs records`);

    // Step 5: Verify after fix
    console.log('\n✅ Step 5: Verification AFTER fix...');
    console.log('───────────────────────────────────────────────────');

    const [fkCountAfter] = await connection.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME IN ('finance_group_settings', 'finance_cash_position', 'finance_analysis_runs', 'finance_alerts')
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
    );
    console.log(`Foreign keys: ${fkCount[0].count} → ${fkCountAfter[0].count}`);

    const [orphanedCashAfter] = await connection.execute(
      `SELECT COUNT(*) as count FROM finance_cash_position fcp
       LEFT JOIN branches b ON fcp.finance_group_key = b.finance_group_key
       WHERE b.finance_group_key IS NULL`
    );
    console.log(`finance_cash_position orphaned: ${orphanedCash[0].count} → ${orphanedCashAfter[0].count}`);

    const [orphanedRunsAfter] = await connection.execute(
      `SELECT COUNT(*) as count FROM finance_analysis_runs far
       LEFT JOIN branches b ON far.finance_group_key = b.finance_group_key
       WHERE b.finance_group_key IS NULL`
    );
    console.log(`finance_analysis_runs orphaned: ${orphanedRuns[0].count} → ${orphanedRunsAfter[0].count}`);

    const [orphanedAlertsAfter] = await connection.execute(
      `SELECT COUNT(*) as count FROM finance_alerts fa
       LEFT JOIN branches b ON fa.finance_group_key = b.finance_group_key
       LEFT JOIN finance_analysis_runs far ON fa.analysis_run_id = far.id
       WHERE b.finance_group_key IS NULL OR far.id IS NULL`
    );
    console.log(`finance_alerts orphaned: ${orphanedAlerts[0].count} → ${orphanedAlertsAfter[0].count}`);

    // Step 6: Show final FK list
    console.log('\n📋 Step 6: Final foreign key list...');
    console.log('───────────────────────────────────────────────────');
    
    const [fkList] = await connection.execute(
      `SELECT 
        kcu.TABLE_NAME,
        kcu.CONSTRAINT_NAME,
        kcu.REFERENCED_TABLE_NAME,
        rc.DELETE_RULE
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc 
        ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
        AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE kcu.TABLE_SCHEMA = DATABASE()
      AND kcu.TABLE_NAME IN ('finance_group_settings', 'finance_cash_position', 'finance_analysis_runs', 'finance_alerts')
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME`
    );
    
    console.log('');
    fkList.forEach(fk => {
      console.log(`  ${fk.TABLE_NAME.padEnd(25)} ${fk.CONSTRAINT_NAME.padEnd(20)} → ${fk.REFERENCED_TABLE_NAME.padEnd(10)} ${fk.DELETE_RULE}`);
    });

    // Step 7: Show record counts
    console.log('\n📊 Step 7: Current record counts...');
    console.log('───────────────────────────────────────────────────');
    
    const tableNames = ['finance_group_settings', 'finance_cash_position', 'finance_analysis_runs', 'finance_alerts'];
    for (const tableName of tableNames) {
      const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`  ${tableName.padEnd(30)} ${count[0].count} records`);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  ✅ ALL FIXES COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed\n');
    }
  }
}

runFix();
