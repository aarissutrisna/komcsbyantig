## Update 23 Juni 2026 (Sesi 3): Horizon Perencanaan Bulanan (M0, M1, M2) & Asumsi Libur

Rilis ini mengubah horizon perencanaan treasury dan perhitungan target amortisasi hutang dari model hari tetap (15, 30, 45, 60 hari) menjadi model bulanan dinamis (M0, M1, M2) ditambah dengan opsi input Asumsi Hari Libur (Hari Non-Aktif) per bulan.

### 1. Horizon Bulanan Dinamis (M0, M1, M2)
* **Bulan Ini (M0)**: Proyeksi dari hari ini sampai akhir bulan berjalan.
* **Bulan Depan (M1)**: Proyeksi dari hari ini sampai akhir bulan berikutnya.
* **2 Bulan Depan (M2)**: Proyeksi dari hari ini sampai akhir 2 bulan berikutnya.
* **Nama Bulan Dinamis**: Label tab dan breakdown target menggunakan nama bulan riil terjemahan bahasa Indonesia (misal: "Juni 2026 (M0)").

### 2. Asumsi Hari Libur (Hari Non-Aktif) sebagai Pengurang Hari Kerja
* Panel input untuk hari libur Bulan Ini (M0), Bulan Depan (M1), dan 2 Bulan Depan (M2) disediakan di panel parameter analisa.
* **Divisor Aktif**: Hari libur mengurangi hari kalender secara kumulatif untuk mendapatkan hari kerja aktif. Target harian merata dihitung dengan membagi total kewajiban bersih dengan jumlah hari kerja aktif.
* **Proyeksi Pembelian Aman**: Hari kerja aktif juga digunakan untuk menskalakan proyeksi pemasukan dan opex, sementara kewajiban hutang tetap ditarik penuh hingga akhir horizon kalender.

### 3. Sinkronisasi What-If Simulasi Pembelian
* Pemuatan baseline analisa otomatis membaca asumsi hari libur (`options.holidays`) dari basis data run baseline.
* Hasil simulasi menampilkan perbandingan target harian sebelum/sesudah simulasi dan budget aman horizon perencanaan dalam model horizon bulanan (M0, M1, M2) secara konsisten.

---

## Update 23 Juni 2026 (Sesi 2): Fitur Horizon Proyeksi Kustom N-Hari (Analisa & Simulasi Keuangan)

Rilis ini menambahkan opsi untuk menentukan jangka waktu proyeksi kustom N-Hari (N-Days Horizon) dalam Analisa Keuangan dan Simulasi Pembelian.

### 1. Kustomisasi Parameter Horizon (Admin Input)
* **Horizon Kustom (N-Hari)**: Form input kustom berupa input angka (1-365 hari) ditambahkan pada bagian **Opsi Filter & Parameter Analisa** di halaman Analisa Keuangan.
* **Target Harian Merata Kustom**: Menghitung secara dinamis target harian amortisasi hutang merata berdasarkan jangka waktu `N` hari yang ditentukan (`target_custom` / `custom_days`).
* **Budget Pembelian Aman Kustom (HN)**: Menambahkan tab horizon perencanaan baru (`hn`) yang menghitung budget pembelian aman untuk jangka waktu kustom `N` hari tersebut.

### 2. Integrasi What-If Simulasi Pembelian
* **Deteksi Otomatis Baseline**: Simulasi What-If otomatis mendeteksi setting `n_days` kustom yang tersimpan pada baseline run acuan.
* **Perbandingan Skenario Target & Budget**: Halaman Simulasi Pembelian menampilkan perbandingan target harian merata kustom dan budget aman HN sebelum dan sesudah penambahan nota belanja simulasi.

### 3. Otomatisasi Database & Penyimpanan
* Nilai `n_days` disimpan di dalam field `result_json->options` di tabel `finance_analysis_runs` sehingga sejarah kalkulasi dan draf simulasi yang memuatnya selalu konsisten.

---

## Update 23 Juni 2026: Spesifikasi Simulasi Pembelian (What-If Treasury Analysis)

Spesifikasi modul baru Simulasi Pembelian untuk melakukan simulasi rencana belanja supplier (*what-if*) tanpa mengubah database aktual.

### 1. Desain Database & Integrasi Baseline
* **Proteksi Baseline (`ON DELETE RESTRICT`)**: Mencegah penghapusan data run analisa riil (`finance_analysis_runs`) jika data tersebut sedang dirujuk oleh draf simulasi aktif.
* **Tabel Baru**:
  - `finance_purchase_simulations`: Menyimpan draf simulasi pembelian.
  - `finance_simulation_items`: Menyimpan item rincian nota simulasi (Supplier, Nominal, Tempo Hari).

--UPDATE_HOOK:23062026>DATABASE--

#### SQL Migrasi (jalankan di server sebelum pull):
```sql
-- 1. Buat tabel finance_purchase_simulations
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Buat tabel finance_simulation_items
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Deploy**:
> 1. Jalankan SQL migrasi di atas pada database produksi.
> 2. Lakukan sync repository: `git pull origin main`

---

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
