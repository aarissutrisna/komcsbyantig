-- Migration: Bonus Transfer Claims
-- Jalankan sekali di MariaDB

CREATE TABLE IF NOT EXISTS bonus_transfer_claims (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  keterangan      TEXT,
  start_date      DATE         NOT NULL,
  end_date        DATE         NOT NULL,
  direction       VARCHAR(50)  NOT NULL DEFAULT 'All',
  -- Snapshot immutable: nilai pembagi/pengali saat klaim dilakukan
  pembagi         INT          NOT NULL,
  pengali         INT          NOT NULL,
  -- Hasil kalkulasi yang disimpan permanen
  total_nilai     DECIMAL(18,2) NOT NULL DEFAULT 0,
  bonus_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,
  item_count      INT          NOT NULL DEFAULT 0,
  -- Metadata
  created_by_id   VARCHAR(36),
  created_by_name VARCHAR(255),
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bonus_transfer_claim_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  claim_id     INT UNSIGNED NOT NULL,
  notransaksi  VARCHAR(100) NOT NULL,
  tanggal      VARCHAR(50),
  kantordari   VARCHAR(100),
  kantortujuan VARCHAR(100),
  keterangan   TEXT,
  total_nilai  DECIMAL(18,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (claim_id) REFERENCES bonus_transfer_claims(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_claim_items_notransaksi ON bonus_transfer_claim_items(notransaksi);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON bonus_transfer_claims(created_at DESC);
