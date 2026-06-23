import '../config/env.js';
import pool from '../config/database.js';

async function run() {
  try {
    console.log(' Starting database migration for Purchase Simulation...');
    
    // 1. Create finance_purchase_simulations table
    console.log('Creating table: finance_purchase_simulations');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_purchase_simulations (
        id CHAR(36) NOT NULL,
        analysis_run_id CHAR(36) NOT NULL,
        sim_label VARCHAR(150) NOT NULL,
        created_by CHAR(36) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_fps_analysis_run (analysis_run_id),
        CONSTRAINT fk_fps_analysis_run FOREIGN KEY (analysis_run_id) REFERENCES finance_analysis_runs(id) ON DELETE RESTRICT,
        CONSTRAINT fk_fps_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table finance_purchase_simulations created successfully.');

    // 2. Create finance_simulation_items table
    console.log('Creating table: finance_simulation_items');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS finance_simulation_items (
        id INT(11) NOT NULL AUTO_INCREMENT,
        simulation_id CHAR(36) NOT NULL,
        supplier_name VARCHAR(150) NOT NULL,
        invoice_no VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        due_days INT(11) NOT NULL,
        notes VARCHAR(255) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY idx_fsi_simulation (simulation_id),
        CONSTRAINT fk_fsi_simulation FOREIGN KEY (simulation_id) REFERENCES finance_purchase_simulations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table finance_simulation_items created successfully.');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
