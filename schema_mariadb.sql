-- Create tables for MariaDB
CREATE TABLE IF NOT EXISTS branches (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(255),
  target_min DECIMAL(15, 2) DEFAULT 5000000.00,
  target_max DECIMAL(15, 2) DEFAULT 10000000.00,
  n8n_endpoint VARCHAR(500),
  last_sync_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);

CREATE TABLE IF NOT EXISTS omzet (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_omzet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_omzet_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE KEY (branch_id, date)
);

CREATE TABLE IF NOT EXISTS commissions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  omzet_total DECIMAL(15, 2) NOT NULL,
  commission_amount DECIMAL(15, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  status ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  paid_date DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comm_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id, period_start)
);

CREATE TABLE IF NOT EXISTS commission_config (
  id CHAR(36) PRIMARY KEY,
  min_omzet DECIMAL(15, 2) NOT NULL,
  max_omzet DECIMAL(15, 2),
  percentage DECIMAL(5, 2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_data (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  tanggal DATE NOT NULL,
  status_kehadiran ENUM('hadir', 'setengah', 'izin', 'alpha'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attn_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attn_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  UNIQUE KEY (user_id, tanggal)
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36),
  nominal DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  tanggal DATE NOT NULL,
  catatan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wd_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wd_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS commission_mutations (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36),
  tanggal DATE NOT NULL,
  tipe ENUM('masuk', 'keluar') NOT NULL,
  nominal DECIMAL(15, 2) NOT NULL,
  keterangan TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mut_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mut_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mutations (
  id CHAR(36) PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id CHAR(36) NOT NULL,
  action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  changes JSON,
  user_id CHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_omzet_date ON omzet(date);
CREATE INDEX idx_commissions_status ON commissions(status);

-- Initial Data
INSERT INTO commission_config (id, min_omzet, max_omzet, percentage) VALUES
  (UUID(), 0, 5000000, 2.5),
  (UUID(), 5000000, 10000000, 3.5),
  (UUID(), 10000000, NULL, 5.0);

INSERT INTO branches (id, name, city) VALUES
  (UUID(), 'Jakarta', 'Jakarta'),
  (UUID(), 'Surabaya', 'Surabaya'),
  (UUID(), 'Bandung', 'Bandung');
