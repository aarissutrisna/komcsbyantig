## Update 22 Juni 2026: Modul Analisa Keuangan & Target N-Hari

Rilis ini menambahkan Modul Analisa Keuangan untuk memproyeksikan arus kas (cash flow) treasury perusahaan dan menganalisis serta mengelola kewajiban hutang supplier.

### 1. Modul Analisa Keuangan & Arus Kas
* **Rincian Kas Awal (Modal)**: Form input terperinci berisi 9 akun (Kas Toko + 8 rekening bank/lainnya) yang disusun dalam layout 3x3 kolom dan baris.
* **Proyeksi Kas & Budget Pembelian Aman**: Visualisasi dan perhitungan budget pembelian aman pada horizon 15, 30, 45, dan 60 hari. Dilengkapi dengan status kelayakan kas (AMAN, WASPADA, DEFISIT).
* **Cash Runway & Analisa Likuiditas**: Menghitung sisa waktu bertahannya kas perusahaan (runway) berdasarkan cash flow harian bersih dan tanggal kritis kehabisan kas.

### 2. Metode Amortisasi Hutang Merata (Horizon N-Hari)
* Menggantikan target harian iPOS yang spikey. Hutang yang overdue dan jatuh tempo disebar merata sepanjang periode horizon treasury (15, 30, 45, 60 hari) untuk memberikan target yang lebih stabil dan rasional.
* Penambahan opsi filter:
  - **Skip Overdue Kronis**: Mengabaikan hutang berumur >90 hari.
  - **Skip Supplier Khusus**: Mengabaikan transaksi dari supplier tertentu (misal: PJBT).
  - **Gunakan Kas Awal**: Memperhitungkan saldo kas awal sebagai modal pengurang target hutang.

--UPDATE_HOOK:22062026>DATABASE--

#### SQL Migrasi (jalankan di server sebelum pull):
```sql
-- 1. Tambah kolom ke tabel branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS n8n_debt_endpoint VARCHAR(500) DEFAULT NULL COMMENT "URL webhook N8N untuk fetch data hutang supplier";
ALTER TABLE branches ADD COLUMN IF NOT EXISTS n8n_debt_secret VARCHAR(255) DEFAULT NULL COMMENT "Secret token untuk auth ke webhook hutang";
ALTER TABLE branches ADD COLUMN IF NOT EXISTS finance_group_key VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN n8n_debt_endpoint IS NOT NULL THEN SHA2(n8n_debt_endpoint, 256) ELSE NULL END) STORED;
ALTER TABLE branches ADD INDEX IF NOT EXISTS idx_branches_finance_group (finance_group_key);

-- 2. Buat tabel finance_group_settings
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

-- 3. Buat tabel finance_cash_position
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Buat tabel finance_analysis_runs
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Buat tabel finance_alerts
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Setup endpoint webhook awal untuk cabang UTM, JTJ, dan TSM
UPDATE branches 
SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm'
WHERE id IN ('UTM', 'JTJ');

UPDATE branches 
SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-tsm'
WHERE id = 'TSM';
```

> **Deploy**:
> 1. Jalankan SQL migrasi di atas pada database produksi.
> 2. Lakukan sync repository: `git pull origin main`
> 3. Lakukan build frontend: `npm run build`
> 4. Restart aplikasi: `pm2 restart all`

---

## Update 21 Juni 2026: Fitur Klaim Bonus Transfer Item
--UPDATE_HOOK:21062026>DATABASE--

#### SQL Migrasi (jalankan di server sebelum pull):
```sql
CREATE TABLE IF NOT EXISTS bonus_transfer_claims (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  keterangan      TEXT,
  start_date      DATE         NOT NULL,
  end_date        DATE         NOT NULL,
  direction       VARCHAR(50)  NOT NULL DEFAULT 'All',
  pembagi         INT          NOT NULL,
  pengali         INT          NOT NULL,
  total_nilai     DECIMAL(18,2) NOT NULL DEFAULT 0,
  bonus_amount    DECIMAL(18,2) NOT NULL DEFAULT 0,
  item_count      INT          NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_claim_items_notransaksi ON bonus_transfer_claim_items(notransaksi);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON bonus_transfer_claims(created_at DESC);
```

> **Deploy**:
> 1. Jalankan SQL migrasi di atas
> 2. `git pull origin main`
> 3. `npm run build`
> 4. `pm2 restart all`

---

## Update 27 Februari 2026: Dashboard Redesign & Branch-Scoped Access
--UPDATE_HOOK:27022026>NONEED--

Rilis ini fokus pada penyederhanaan antarmuka utama dan penguatan kontrol akses berbasis cabang (Multi-Branch Security).

### 1. Dashboard Redesign (Penyederhanaan)
* **Target & Win Rate**: Dashboard diperbarui dengan fokus pada **Target Harian (Min/Max)** dan **Analisa Pencapaian** (% Win Rate untuk bulan tersebut).
* **Visual Premium**: Penambahan blok analitik bertema gelap (*Dark Mode Design*) untuk visualisasi probabilitas kesuksesan target harian.
* **Layout Efisien**: Informasi sesi dan profil pengguna dipindah ke footer yang lebih bersih, memberikan ruang utama untuk data performa.

### 2. Branch-Scoped Access (Keamanan Multi-Cabang)
* **Penyaring HRD Cabang**: HRD kini hanya dapat melihat data kehadiran/komisi karyawan pada saat karyawan tersebut memang sedang ditugaskan di cabang HRD tersebut.
* **Warning N/A**: Jika HRD membuka user yang sedang bertugas di cabang lain, sistem akan menampilkan banner peringatan: *"Data tidak tersedia di cabang ini — bertugas di [Cabang]..."*.
* **Badge Konteks**: Admin dan CS mendapatkan **📍 Badge Lokasi Bertugas** di atas tabel yang menunjukkan cabang penugasan untuk periode tersebut.

### 3. Redistribusi Komisi (Fase 2-Orang)
* **Keadilan bagi yang Hadir**: Implementasi logika otomatis untuk redistribusi jatah komisi jika salah satu CS absen (50:50 atau 75:25). Jatah CS yang hadir didobelkan (maks 50% atau 100% tergantung jatah asli).

---

### 🚀 Protokol Update & Rilis (Agreed)

Gunakan langkah ini setiap kali melakukan pembaruan di server produksi:

1. **Sinkronisasi Kode**:
   ```bash
   git pull origin main
   ```
2. **Build Frontend**:
   ```bash
   npm run build
   ```
3. **Restart Service**:
   ```bash
   pm2 restart all
   ```
4. **Verifikasi**: Buka dashboard dan cek versi terbaru di footer atau menu Update.

---

## Update 25 Februari 2026 (Sesi 2): Fitur Analisa & Simulasi Target

Penambahan modul analitik berbasis data historis untuk membantu penetapan target omzet yang lebih akurat.

### 1. Halaman Baru: Analisa & Simulasi Target (Admin)
* **Tren Bulanan**: Grafik batang total omzet dengan slider rentang 3–12 bulan terakhir, dilengkapi garis rata-rata periode.
* **Perbandingan Tahunan (YoY)**: Grafik batang tergrouping per bulan (Jan–Des), pilih 1–5 tahun untuk melihat tren pertumbuhan antar tahun.
* **Statistik Harian**: Grafik garis Rata-rata vs Median harian — basis penentuan target.
* **Kartu Saran Target**: Slider % (50–200%) untuk Saran Min/Max. Tombol "← Pakai di Simulator" mengisi panel simulasi otomatis.
* **Riwayat Performa Bulanan**: Selector tab tahun (2023 s/d tahun berjalan) untuk memfilter tabel histori bulanan.

### 3. Logika Redistribusi Komisi (Fase Awal 2 Orang)
Sistem otomatis menyesuaikan porsi komisi jika ada salah satu CS yang absen:
- **Porsi 50:50** → Jika satu absen, CS yang hadir otomatis mendapat **100%**.
- **Porsi 75:25** → Jika porsi 25% hadir sendiri, jatahnya naik menjadi **50%** (sisa 50% masuk toko). 
- **Porsi 75:25** → Jika porsi 75% hadir sendiri, jatahnya naik menjadi **100%**.

### 4. Ringkasan Strategi Masa Depan
Konsep **Layer-Based Redistribution** sudah didokumentasikan untuk pertumbuhan tim (Layer Management vs Layer Staff).

### 5. Simulator Target
* Pilih Cabang, Bulan, Tahun acuan → input angka Min/Max → **Jalankan Simulasi** → lihat Win Rate (% hari tembus target).
* Analisa otomatis: apakah target terlalu berat, ringan, atau seimbang.

### 3. Terapkan Target Langsung
* Tombol **✓ Terapkan Target ke [Bulan] [Tahun]** muncul setelah simulasi dijalankan.
* Peringatan merah & konfirmasi dialog sebelum diterapkan.
* Setelah dikonfirmasi → target tersimpan ke `omzetbulanan` dan **komisi direkalkukasi otomatis**.

### 4. Backend & Database
* Tabel baru: `omzet_stats_monthly` — statistik agregat bulanan (avg, median, min, max, win rate).
* Service/API baru: `omzetAnalysisService.js`, endpoint `/api/omzet-analysis/trends`, `/simulate`, `/rebuild`.
* Data historis 2023–2026 (34 periode) sudah di-rebuild.

--UPDATE_HOOK:25022026>DATABASE--

#### SQL Migrasi (jalankan di server sebelum pull):
```sql
CREATE TABLE IF NOT EXISTS omzet_stats_monthly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  month INT NOT NULL,
  total_omzet DECIMAL(20,2) DEFAULT 0,
  avg_daily DECIMAL(15,2) DEFAULT 0,
  median_daily DECIMAL(15,2) DEFAULT 0,
  min_daily DECIMAL(15,2) DEFAULT 0,
  max_daily DECIMAL(15,2) DEFAULT 0,
  win_rate_max DECIMAL(5,2) DEFAULT 0,
  win_rate_min DECIMAL(5,2) DEFAULT 0,
  days_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_branch_period (branch_id, year, month)
);
```

> **Deploy**:
> 1. Jalankan SQL migrasi di atas
> 2. `git pull origin main`
> 3. `npm run build`
> 4. `pm2 restart all`
> 5. `node backend/src/config/rebuild_all_stats.js` — isi data statistik historis

---

## Update 25 Februari 2026: Rekap Histori & Manajemen Pengguna (Saldo Awal)

Terdapat tiga pembaruan utama pada rilis ini:

### 1. Perbaikan Rekap & Histori Penugasan
* **Rekap Terakhir**: Logika diperbaiki untuk mengambil semua CS yang aktif berdasarkan penugasan terbaru secara global. Ini memastikan total persentase cabang akurat dan tidak ada "user hantu" dari periode lama.
* **Histori Penugasan**: Menggunakan `GROUP_CONCAT DISTINCT` untuk mencegah duplikasi nama user dalam satu baris histori.

### 2. Manajemen Pengguna & Keamanan Data
* **Proteksi Hapus User**: Tombol "Hapus Permanen" tetap tersedia namun dengan **proteksi ketat**. Jika user sudah memiliki riwayat (Komisi, Penugasan, Mutasi, dsb), penghapusan akan diblokir oleh sistem untuk menjaga integritas data.
* **Fitur Resign (Lock)**: Untuk user yang memiliki riwayat data, wajib menggunakan menu **Nonaktifkan (Resign)**. Ini akan menutup penugasan aktif dan memblokir login tanpa menghapus data histori.

### 3. Fitur Saldo Awal (Migrasi Database)
* **Saldo Awal**: Menambahkan kolom `saldo_awal` pada tabel `users`. Berguna untuk memasukkan saldo dari sistem lama (misal: iPos) ke sistem baru.
* **Akumulasi Saldo**: Perhitungan saldo tersedia kas user kini mengikuti rumus: `Saldo Awal + Total Komisi + Total Mutasi Masuk - Total Mutasi Keluar`.

--UPDATE_HOOK:25022026>DATABASE--

#### SQL Migrasi (jalankan di server sebelum pull):
```sql
ALTER TABLE users ADD COLUMN saldo_awal DECIMAL(15,2) DEFAULT 0.00 AFTER faktor_pengali;
```

> **Deploy**:
> 1. Jalankan SQL migrasi di atas (via phpMyAdmin / mysql cli)
> 2. `git pull origin main`
> 3. `npm run build`
> 4. `pm2 restart all`

---

## Update 24 Februari 2026: Perbaikan Logika Absensi & Rekap Total
... (sisanya tetap)
