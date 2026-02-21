-- 1. Create omzetbulanan table (replacing or complementing monthly_targets if it exists)
CREATE TABLE IF NOT EXISTS omzetbulanan (
  id CHAR(36) PRIMARY KEY,
  branch_id CHAR(36) NOT NULL,
  month TINYINT NOT NULL,
  year SMALLINT NOT NULL,
  min_omzet DECIMAL(15, 2) NOT NULL,
  max_omzet DECIMAL(15, 2) NOT NULL,
  updated_by CHAR(36),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ob_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_branch_month_year (branch_id, month, year)
);

-- 2. Update omzet table
-- First, check and drop existing unique key if it exists
SET @constraint_name = (SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                       WHERE TABLE_NAME = 'omzet' AND CONSTRAINT_TYPE = 'UNIQUE' AND TABLE_SCHEMA = DATABASE() LIMIT 1);
SET @drop_query = IF(@constraint_name IS NOT NULL, CONCAT('ALTER TABLE omzet DROP INDEX ', @constraint_name), 'SELECT "No unique index to drop"');
PREPARE stmt FROM @drop_query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new columns
ALTER TABLE omzet
ADD COLUMN cash DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN bayar_piutang DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN total DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN min_omzet DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN max_omzet DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN kehadiran DECIMAL(3, 2) DEFAULT 0, -- Store 0, 0.5, or 1.0
ADD COLUMN komisi DECIMAL(15, 2) DEFAULT 0;

-- Update existing records: total = amount (legacy)
UPDATE omzet SET total = amount, cash = amount;

-- Add new unique key: user-date based
ALTER TABLE omzet ADD UNIQUE KEY uk_user_date (user_id, date);

-- 3. Cleanup monthly_targets if it was a legacy table replaced by omzetbulanan
-- (We'll keep it for now unless confirmed redundant to avoid data loss)
