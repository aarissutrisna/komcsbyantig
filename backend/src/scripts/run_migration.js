import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'kuda4000',
  database: 'cs_commission'
};

async function runMigration() {
  let connection;
  
  try {
    console.log(' Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // 1. Check and add columns to branches table
    console.log('\n📋 Checking branches table columns...');
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branches' 
       AND COLUMN_NAME IN ('n8n_debt_endpoint', 'n8n_debt_secret', 'finance_group_key')`
    );
    
    const existingCols = columns.map(c => c.COLUMN_NAME);
    
    if (!existingCols.includes('n8n_debt_endpoint')) {
      await connection.execute(
        `ALTER TABLE branches ADD COLUMN n8n_debt_endpoint VARCHAR(500) DEFAULT NULL COMMENT 'URL webhook N8N untuk fetch data hutang supplier'`
      );
      console.log('✅ Added column: n8n_debt_endpoint');
    } else {
      console.log('️  Column n8n_debt_endpoint already exists');
    }
    
    if (!existingCols.includes('n8n_debt_secret')) {
      await connection.execute(
        `ALTER TABLE branches ADD COLUMN n8n_debt_secret VARCHAR(255) DEFAULT NULL COMMENT 'Secret token untuk auth ke webhook hutang'`
      );
      console.log('✅ Added column: n8n_debt_secret');
    } else {
      console.log('️  Column n8n_debt_secret already exists');
    }
    
    if (!existingCols.includes('finance_group_key')) {
      await connection.execute(
        `ALTER TABLE branches ADD COLUMN finance_group_key VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN n8n_debt_endpoint IS NOT NULL THEN SHA2(n8n_debt_endpoint, 256) ELSE NULL END) STORED, ADD INDEX idx_branches_finance_group (finance_group_key)`
      );
      console.log('✅ Added column: finance_group_key');
    } else {
      console.log('️  Column finance_group_key already exists');
    }

    // 2. Create tables
    console.log('\n Creating tables...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS finance_group_settings (
        finance_group_key VARCHAR(64) NOT NULL,
        webhook_url VARCHAR(500) NOT NULL,
        webhook_secret VARCHAR(255) DEFAULT NULL,
        opex_percent DECIMAL(5,2) DEFAULT 2.00,
        safety_margin_percent DECIMAL(5,2) DEFAULT 15.00,
        n_days_default INT DEFAULT 90,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (finance_group_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created table: finance_group_settings');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS finance_cash_position (
        id CHAR(36) NOT NULL,
        finance_group_key VARCHAR(64) NOT NULL,
        cash_amount DECIMAL(15,2) NOT NULL,
        recorded_date DATE NOT NULL,
        input_by CHAR(36),
        notes VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_group_date (finance_group_key, recorded_date),
        INDEX idx_fcp_group (finance_group_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created table: finance_cash_position');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS finance_analysis_runs (
        id CHAR(36) NOT NULL,
        finance_group_key VARCHAR(64) NOT NULL,
        triggered_by CHAR(36),
        run_label VARCHAR(150),
        cash_position_used DECIMAL(15,2),
        avg_daily_revenue DECIMAL(15,2),
        result_json JSON NOT NULL,
        source_debt_snapshot JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_far_group (finance_group_key),
        INDEX idx_far_created (created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created table: finance_analysis_runs');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS finance_alerts (
        id CHAR(36) NOT NULL,
        finance_group_key VARCHAR(64) NOT NULL,
        analysis_run_id CHAR(36),
        alert_type ENUM('deficit_bucket','runway_critical','high_concentration'),
        message TEXT,
        severity ENUM('warning','critical'),
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_fa_group (finance_group_key),
        INDEX idx_fa_read (is_read, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created table: finance_alerts');

    // 3. Setup webhook URLs
    console.log('\n Setting up webhook URLs...');
    
    await connection.execute(
      `UPDATE branches SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm', n8n_debt_secret = NULL WHERE id IN ('UTM', 'JTJ')`
    );
    console.log('✅ Set webhook for UTM & JTJ');

    await connection.execute(
      `UPDATE branches SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-tsm', n8n_debt_secret = NULL WHERE id = 'TSM'`
    );
    console.log('✅ Set webhook for TSM');

    // 4. Verify
    console.log('\n📊 Verification...');
    
    const [branches] = await connection.execute(
      `SELECT id, name, n8n_debt_endpoint, finance_group_key,
       CASE WHEN n8n_debt_endpoint IS NULL THEN 'Belum dikonfigurasi' ELSE 'Aktif' END as status
       FROM branches ORDER BY id`
    );
    
    console.log('\nBranches:');
    branches.forEach(b => {
      console.log(`  ${b.id.padEnd(5)} | ${b.name.padEnd(25)} | ${b.status} | ${b.n8n_debt_endpoint || '-'}`);
    });

    const [groups] = await connection.execute(
      `SELECT finance_group_key, n8n_debt_endpoint as webhook_url,
       GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') as branch_ids,
       COUNT(*) as branch_count,
       CASE WHEN COUNT(*) > 1 THEN CONCAT(GROUP_CONCAT(id ORDER BY id SEPARATOR '-'), ' Combined')
            ELSE MAX(name) END as group_name
       FROM branches
       WHERE n8n_debt_endpoint IS NOT NULL
       GROUP BY finance_group_key, n8n_debt_endpoint
       ORDER BY MIN(id)`
    );
    
    console.log('\nFinance Groups:');
    groups.forEach(g => {
      console.log(`  ${g.group_name.padEnd(20)} | ${g.branch_count} cabang | ${g.branch_ids}`);
    });

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runMigration();
