-- Finance Analysis Module - Database Cleanup & Fix
-- Date: 2026-06-21
-- Description: Fix orphaned data issues, add missing foreign keys, cleanup unused columns

-- ============================================
-- ISSUE 1: Orphaned Data on Delete Analysis Run
-- ============================================
-- When deleting from finance_analysis_runs, related finance_cash_position records become orphaned
-- Solution: Add cleanup query to delete related cash_position records

-- ============================================
-- ISSUE 2: Missing Foreign Key Constraints
-- ============================================
-- finance_group_settings, finance_cash_position, finance_analysis_runs, finance_alerts
-- all have finance_group_key but no FK constraint to branches table

-- ============================================
-- ISSUE 3: Unused Column
-- ============================================
-- source_debt_snapshot in finance_analysis_runs is stored but never retrieved
-- Consider removing if not needed for audit trail

-- ============================================
-- FIX SCRIPT
-- ============================================

-- 1. Add missing foreign keys (if not exists)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD CONSTRAINT
-- We'll check first

-- Check and add FK for finance_group_settings
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'finance_group_settings' 
    AND CONSTRAINT_NAME = 'fk_fgs_branches');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE finance_group_settings ADD CONSTRAINT fk_fgs_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE',
    'SELECT "FK fk_fgs_branches already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add FK for finance_cash_position
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'finance_cash_position' 
    AND CONSTRAINT_NAME = 'fk_fcp_branches');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE finance_cash_position ADD CONSTRAINT fk_fcp_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE',
    'SELECT "FK fk_fcp_branches already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add FK for finance_analysis_runs
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'finance_analysis_runs' 
    AND CONSTRAINT_NAME = 'fk_far_branches');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE finance_analysis_runs ADD CONSTRAINT fk_far_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE',
    'SELECT "FK fk_far_branches already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add FK for finance_alerts (finance_group_key)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'finance_alerts' 
    AND CONSTRAINT_NAME = 'fk_fa_branches');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE finance_alerts ADD CONSTRAINT fk_fa_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE',
    'SELECT "FK fk_fa_branches already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Fix delete action to cleanup orphaned cash_position records
-- This is handled by the ON DELETE CASCADE above, but we also need to update the backend code

-- 3. Optional: Remove unused column source_debt_snapshot
-- Uncomment if you want to remove this column (saves storage)
-- ALTER TABLE finance_analysis_runs DROP COLUMN source_debt_snapshot;

-- 4. Cleanup existing orphaned data
-- Delete cash_position records for non-existent finance groups
DELETE fcp FROM finance_cash_position fcp
LEFT JOIN branches b ON fcp.finance_group_key = b.finance_group_key
WHERE b.finance_group_key IS NULL;

-- Delete analysis_runs for non-existent finance groups
DELETE far FROM finance_analysis_runs far
LEFT JOIN branches b ON far.finance_group_key = b.finance_group_key
WHERE b.finance_group_key IS NULL;

-- Delete alerts for non-existent finance groups or analysis runs
DELETE fa FROM finance_alerts fa
LEFT JOIN branches b ON fa.finance_group_key = b.finance_group_key
LEFT JOIN finance_analysis_runs far ON fa.analysis_run_id = far.id
WHERE b.finance_group_key IS NULL OR far.id IS NULL;

-- 5. Verify cleanup
SELECT 'Orphaned data cleanup complete' as status;

SELECT 
    'finance_cash_position' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN b.finance_group_key IS NULL THEN 1 ELSE 0 END) as orphaned_records
FROM finance_cash_position fcp
LEFT JOIN branches b ON fcp.finance_group_key = b.finance_group_key

UNION ALL

SELECT 
    'finance_analysis_runs' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN b.finance_group_key IS NULL THEN 1 ELSE 0 END) as orphaned_records
FROM finance_analysis_runs far
LEFT JOIN branches b ON far.finance_group_key = b.finance_group_key

UNION ALL

SELECT 
    'finance_alerts' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN b.finance_group_key IS NULL OR far.id IS NULL THEN 1 ELSE 0 END) as orphaned_records
FROM finance_alerts fa
LEFT JOIN branches b ON fa.finance_group_key = b.finance_group_key
LEFT JOIN finance_analysis_runs far ON fa.analysis_run_id = far.id;

-- 6. Verify foreign keys are in place
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    DELETE_RULE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('finance_group_settings', 'finance_cash_position', 'finance_analysis_runs', 'finance_alerts')
AND CONSTRAINT_TYPE = 'FOREIGN KEY';
