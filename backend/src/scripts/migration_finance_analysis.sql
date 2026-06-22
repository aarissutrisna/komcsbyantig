-- Migration: Finance Analysis Module
-- Date: 2026-06-21
-- Description: Setup tables and columns for finance analysis module

-- 1. Add columns to branches table (if not exists)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we check if columns exist first

-- Check and add n8n_debt_endpoint
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'branches' 
    AND COLUMN_NAME = 'n8n_debt_endpoint');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE branches ADD COLUMN n8n_debt_endpoint VARCHAR(500) DEFAULT NULL COMMENT "URL webhook N8N untuk fetch data hutang supplier"',
    'SELECT "Column n8n_debt_endpoint already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add n8n_debt_secret
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'branches' 
    AND COLUMN_NAME = 'n8n_debt_secret');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE branches ADD COLUMN n8n_debt_secret VARCHAR(255) DEFAULT NULL COMMENT "Secret token untuk auth ke webhook hutang"',
    'SELECT "Column n8n_debt_secret already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add finance_group_key
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'branches' 
    AND COLUMN_NAME = 'finance_group_key');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE branches ADD COLUMN finance_group_key VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN n8n_debt_endpoint IS NOT NULL THEN SHA2(n8n_debt_endpoint, 256) ELSE NULL END) STORED, ADD INDEX idx_branches_finance_group (finance_group_key)',
    'SELECT "Column finance_group_key already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Create finance_group_settings table (if not exists)
CREATE TABLE IF NOT EXISTS finance_group_settings (
  finance_group_key VARCHAR(64) NOT NULL,
  webhook_url VARCHAR(500) NOT NULL,
  webhook_secret VARCHAR(255) DEFAULT NULL,
  opex_percent DECIMAL(5,2) DEFAULT 2.00,
  safety_margin_percent DECIMAL(5,2) DEFAULT 15.00,
  n_days_default INT DEFAULT 90,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (finance_group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create finance_cash_position table (if not exists)
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
  INDEX idx_fcp_group (finance_group_key),
  CONSTRAINT fk_fcp_user FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create finance_analysis_runs table (if not exists)
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
  INDEX idx_far_created (created_at DESC),
  CONSTRAINT fk_far_user FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Create finance_alerts table (if not exists)
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
  INDEX idx_fa_read (is_read, created_at DESC),
  CONSTRAINT fk_fa_run FOREIGN KEY (analysis_run_id) REFERENCES finance_analysis_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Setup webhook URLs for existing branches
UPDATE branches 
SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm',
    n8n_debt_secret = NULL
WHERE id IN ('UTM', 'JTJ');

UPDATE branches 
SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-tsm',
    n8n_debt_secret = NULL
WHERE id = 'TSM';

-- 7. Verify setup
SELECT 
    id,
    name,
    n8n_debt_endpoint,
    finance_group_key,
    CASE 
        WHEN n8n_debt_endpoint IS NULL THEN 'Belum dikonfigurasi'
        ELSE 'Aktif'
    END as status
FROM branches
ORDER BY id;

-- 8. Show finance groups
SELECT 
    finance_group_key,
    n8n_debt_endpoint as webhook_url,
    GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') as branch_ids,
    COUNT(*) as branch_count,
    CASE 
        WHEN COUNT(*) > 1 THEN CONCAT(GROUP_CONCAT(id ORDER BY id SEPARATOR '-'), ' Combined')
        ELSE MAX(name)
    END as group_name
FROM branches
WHERE n8n_debt_endpoint IS NOT NULL
GROUP BY finance_group_key, n8n_debt_endpoint
ORDER BY MIN(id);
