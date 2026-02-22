-- Create tables for MariaDB
CREATE TABLE IF NOT EXISTS branches (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(255),
  target_min DECIMAL(15, 2) DEFAULT 5000000.00,
  target_max DECIMAL(15, 2) DEFAULT 10000000.00,
  comm_perc_min DECIMAL(5, 2) DEFAULT 0.2,
  comm_perc_max DECIMAL(5, 2) DEFAULT 0.4,
  last_sync_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'hrd', 'cs') NOT NULL,
  branch_id CHAR(36),
  faktor_pengali DECIMAL(5, 2) DEFAULT 1.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS omzet (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) DEFAULT NULL,
  branch_id CHAR(36) NOT NULL,
  date DATE NOT NULL,
  cash DECIMAL(15, 2) DEFAULT 0.00,
  bayar_piutang DECIMAL(15, 2) DEFAULT 0.00,
  total DECIMAL(15, 2) DEFAULT 0.00,
  -- Snapshot: target cabang saat tanggal tersebut
  min_omzet DECIMAL(15, 2) DEFAULT 0.00,
  max_omzet DECIMAL(15, 2) DEFAULT 0.00,
  description TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  source ENUM('AUTO', 'MANUAL_UPDATE', 'IMPORT') DEFAULT 'IMPORT',
  last_synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_omzet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_omzet_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE KEY uk_branch_date (branch_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_data (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  tanggal DATE NOT NULL,
  kehadiran DECIMAL(3, 1) DEFAULT 1.0,
  status_kehadiran ENUM('hadir', 'setengah', 'izin', 'alpha') DEFAULT 'hadir',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attn_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_branch_tanggal (user_id, branch_id, tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id CHAR(36) PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS omzetbulanan (
  id CHAR(36) PRIMARY KEY,
  branch_id CHAR(36) NOT NULL,
  month TINYINT NOT NULL,
  year SMALLINT NOT NULL,
  min_omzet DECIMAL(15, 2) NOT NULL,
  max_omzet DECIMAL(15, 2) NOT NULL,
  comm_perc_min DECIMAL(5, 2),
  comm_perc_max DECIMAL(5, 2),
  updated_by CHAR(36),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ob_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_ob_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_branch_month_year (branch_id, month, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commissions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  omzet_total DECIMAL(15, 2) NOT NULL,
  commission_amount DECIMAL(15, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  -- Snapshot: porsi & kehadiran saat kalkulasi
  porsi_percent DECIMAL(5, 2) DEFAULT NULL,
  kehadiran DECIMAL(3, 1) DEFAULT 1.0,
  snapshot_meta JSON DEFAULT NULL,
  status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  paid_date DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE KEY uk_commissions_user_branch_date (user_id, branch_id, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histori cabang user per tanggal (untuk mendukung mutasi sementara)
CREATE TABLE IF NOT EXISTS user_cabang_history (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  cabang_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uch_user_date (user_id, start_date),
  INDEX idx_uch_cabang_date (cabang_id, start_date),
  CONSTRAINT fk_uch_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uch_cabang FOREIGN KEY (cabang_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_uch_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alokasi porsi komisi user di cabang pada periode tertentu
CREATE TABLE IF NOT EXISTS cabang_user_allocation (
  id CHAR(36) PRIMARY KEY,
  cabang_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE DEFAULT NULL,
  porsi_percent DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
  created_by CHAR(36) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alloc_cabang_date (cabang_id, start_date),
  INDEX idx_alloc_user_date (user_id, start_date),
  CONSTRAINT fk_alloc_cabang FOREIGN KEY (cabang_id) REFERENCES branches(id) ON DELETE CASCADE,
  CONSTRAINT fk_alloc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_alloc_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255),
  entity_id CHAR(36),
  ip_address VARCHAR(45),
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36),
  nominal DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  catatan TEXT,
  tanggal DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wd_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wd_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS commission_mutations (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36),
  tanggal DATE NOT NULL,
  tipe ENUM('masuk', 'keluar') NOT NULL,
  nominal DECIMAL(15, 2) NOT NULL,
  saldo_setelah DECIMAL(15, 2) NOT NULL,
  keterangan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mut_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mut_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Data
INSERT INTO branches (id, name, city) VALUES
  ('UTM', 'Puncak Jaya Baja UTM', 'Puncak Jaya Baja UTM'),
  ('JTJ', 'Puncak Jaya Baja JTJ', 'Puncak Jaya Baja JTJ'),
  ('TSM', 'Puncak Jaya Baja TSM', 'Puncak Jaya Baja TSM')
ON DUPLICATE KEY UPDATE name = VALUES(name), city = VALUES(city);
