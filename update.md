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
