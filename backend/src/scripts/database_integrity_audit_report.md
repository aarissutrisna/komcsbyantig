# Database & Script Integrity Audit Report
Generated: 22/6/2026, 10.29.25 WIB

## 1. Code-to-Database Mapping & Schema Analysis

This section lists all tables found in the database, whether they are used by the backend code, and identifies any references in the code to missing tables/columns.

### ⚠️ References to Missing Tables in Code
*None. All tables referenced in code exist in the database.*


### 📊 Database Tables Inventory and Code Reference Status
| Table Name | Records | Code References Count | Status |
| --- | ---: | ---: | --- |
| `attendance_data` | 6,882 | 2 | ✅ Active |
| `audit_logs` | 141 | 1 | ✅ Active |
| `bonus_transfer_claim_items` | 0 | 1 | ✅ Active |
| `bonus_transfer_claims` | 0 | 1 | ✅ Active |
| `branches` | 3 | 11 | ✅ Active |
| `cabang_user_allocation` | 0 | 1 | ✅ Active |
| `commission_mutations` | 8 | 1 | ✅ Active |
| `commissions` | 2,211 | 3 | ✅ Active |
| `cs_penugasan` | 10 | 5 | ✅ Active |
| `finance_alerts` | 8 | 2 | ✅ Active |
| `finance_analysis_runs` | 3 | 2 | ✅ Active |
| `finance_cash_position` | 2 | 1 | ✅ Active |
| `finance_group_settings` | 2 | 2 | ✅ Active |
| `n8n_live_cache` | 36 | 1 | ✅ Active |
| `omzet` | 3,444 | 6 | ✅ Active |
| `omzet_stats_monthly` | 111 | 1 | ✅ Active |
| `omzetbulanan` | 114 | 2 | ✅ Active |
| `system_settings` | 4 | 1 | ✅ Active |
| `user_cabang_history` | 0 | 1 | ✅ Active |
| `users` | 11 | 7 | ✅ Active |
| `withdrawal_requests` | 0 | 1 | ✅ Active |


### 💤 Dormant Columns (present in DB but never referenced in active backend code)
- **`attendance_data`**: `status_kehadiran`, `created_at`, `updated_at`
- **`audit_logs`**: `created_at`, `timestamp`
- **`branches`**: `last_sync_at`, `updated_at`
- **`cabang_user_allocation`**: `created_by`, `created_at`
- **`commission_mutations`**: `branch_id`, `saldo_setelah`, `created_at`
- **`commissions`**: `omzet_total`, `commission_percentage`, `porsi_percent`, `snapshot_meta`, `status`, `paid_date`, `period_end`, `created_at`, `updated_at`
- **`finance_cash_position`**: `notes`, `created_at`
- **`finance_group_settings`**: `updated_at`
- **`omzet`**: `min_omzet`, `max_omzet`, `created_at`, `updated_at`
- **`omzet_stats_monthly`**: `updated_at`
- **`omzetbulanan`**: `comm_perc_min`, `comm_perc_max`, `updated_by`, `updated_at`
- **`users`**: `updated_at`
- **`withdrawal_requests`**: `catatan`, `created_at`, `updated_at`


## 2. Data Integrity & Orphaned Records Analysis

This section audits relations between tables to identify orphaned rows (foreign key violations) and other data anomalies.

| Audit Description | Issue Rows Count | Status | Action Needed / Note |
| --- | ---: | --- | --- |
| `omzet.branch_id` references non-existent `branches.id` | 0 | ✅ Clear | - |
| `omzet.user_id` references non-existent `users.id` (excluding NULL) | 0 | ✅ Clear | - |
| `omzet` rows with NULL `user_id` (Legacy/Imported) | 3 | ❌ Issues Found | Legacy omzet rows imported without user correlation |
| `commissions.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `commissions.branch_id` references non-existent `branches.id` | 0 | ✅ Clear | - |
| `commission_mutations.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `cs_penugasan.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `cs_penugasan.cabang_id` references non-existent `branches.id` | 0 | ✅ Clear | - |
| `user_cabang_history.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `user_cabang_history.cabang_id` references non-existent `branches.id` | 0 | ✅ Clear | - |
| `withdrawal_requests.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `bonus_transfer_claim_items.claim_id` references non-existent `bonus_transfer_claims.id` | 0 | ✅ Clear | - |
| `attendance_data.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `attendance_data.branch_id` references non-existent `branches.id` | 0 | ✅ Clear | - |
| `cabang_user_allocation.user_id` references non-existent `users.id` | 0 | ✅ Clear | - |
| `cabang_user_allocation.cabang_id` references non-existent `branches.id` | 0 | ✅ Clear | - |
| `finance_alerts.finance_group_key` references non-existent `finance_group_settings.finance_group_key` | 0 | ✅ Clear | - |
| `finance_analysis_runs.finance_group_key` references non-existent `finance_group_settings.finance_group_key` | 0 | ✅ Clear | - |


## 3. Temporary and Obsolete Scripts Audit

This section lists scripts and temporary files in the repository that are not part of the active production server, identifying clutter or orphaned code files.

### 🧹 Temporary Shell and SQL Scripts in Root Folder
These files appear to be temporary shell scripts or SQL files created for debug/migration purposes:
*None.*


### 🧪 Utility and Temporary Scripts in `backend/src/scripts/`
This directory contains migrations, database seeding, or utility scripts:
- **`comprehensive_integrity_audit.mjs`** | Category: *DB Integrity / System Audit* | Last modified: 2026-06-22 | Size: 18523 bytes
- **`db_integrity_audit.mjs`** | Category: *DB Integrity / System Audit* | Last modified: 2026-06-22 | Size: 16350 bytes
- **`migrate.js`** | Category: *DB Migration / Schema Setup* | Last modified: 2026-06-19 | Size: 1160 bytes
- **`migration_bonus_transfer_claims.sql`** | Category: *DB Migration / Schema Setup* | Last modified: 2026-06-19 | Size: 1553 bytes
- **`migration_data_kehadiran.sql`** | Category: *DB Migration / Schema Setup* | Last modified: 2026-02-20 | Size: 1955 bytes
- **`migration_finance_analysis.sql`** | Category: *DB Migration / Schema Setup* | Last modified: 2026-06-21 | Size: 5382 bytes
- **`run_migration.js`** | Category: *DB Migration / Schema Setup* | Last modified: 2026-06-21 | Size: 7059 bytes


## 4. Key Action Items and Integrity Issues Summary

### 🚨 Immediate Actions Required (Severe Integrity Issues)
- **`omzet` rows with NULL `user_id` (Legacy/Imported)**
  - **Count**: 3 rows
  - **Impact**: Broken foreign references can cause server errors or mismatched data representation on the UI.
  - **Resolution**: Legacy omzet rows imported without user correlation

