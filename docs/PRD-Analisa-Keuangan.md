# PRD: Modul Analisa Keuangan
**Sistem**: Komisi CS PJB (komcsbybolt)
**Versi**: 1.2 — Auto-derived finance group dari webhook per cabang
**Tanggal**: 2026-06-21
**Status**: Draft — Siap Implementasi
**Hak Akses**: Admin & Owner only

---

## 1. Latar Belakang & Tujuan

Saat ini sistem sudah mampu menghitung komisi CS dan menarik omzet harian otomatis via N8N. Owner masih harus menghitung manual di Excel untuk menjawab tiga pertanyaan finansial krusial:

1. Berapa **target omzet harian** yang wajib dicapai supaya hutang supplier bisa dibayar tepat waktu?
2. Berapa **nominal aman untuk belanja/restock** per minggu dan per bulan tanpa mengganggu kemampuan bayar hutang?
3. Berapa **total kewajiban yang jatuh tempo per kelompok 15 hari**, agar owner bisa menyiapkan kas jauh-jauh hari?

Modul ini menggantikan kalkulasi manual tersebut dengan sistem otomatis berbasis data omzet historis (sebagai proyeksi pendapatan) dan data hutang supplier (via webhook N8N).

**Prinsip desain**: Sistem hanya menyajikan **proyeksi berbasis data aktual**, bukan target ambisius. Semua angka harus konservatif dan memberi peringatan dini saat kas berpotensi defisit.

---

## 2. Konsep Inti

### 2.1 Finance Group (Kelompok Finansial)

Cabang yang berbagi **URL webhook hutang yang sama** (`branches.n8n_debt_endpoint`) dianggap **satu entitas finansial gabungan** — omzet dan hutangnya dijumlahkan sebagai satu paket target. Cabang dengan URL webhook berbeda punya analisa keuangan sendiri-sendiri.

> Contoh: Cabang UTM & JTJ memiliki `n8n_debt_endpoint` yang sama → dianggap 1 Finance Group "UTM-JTJ Combined". Cabang TSM dengan webhook berbeda → Finance Group sendiri.

**Implementasi**: Finance group **diturunkan otomatis (auto-derived)** dari field `n8n_debt_endpoint` di tabel `branches`. Tidak perlu tabel terpisah untuk mapping — cukup `GROUP BY n8n_debt_endpoint`. Detail implementasi di **Bagian 11**.

### 2.2 Sumber Data
| Data | Sumber | Mekanisme |
|---|---|---|
| Kas masuk harian (Cash + Transfer) | Modul Komisi CS (tabel `omzet`, field `total`) | Sudah ada, real-time via N8N. Lihat detail mapping & batasan di 2.3 |
| Hutang supplier + jatuh tempo | Webhook baru dari N8N (terhubung iPOS) | Field `Sisa Kredit` dipakai sebagai nominal hutang aktif, bukan `Nilai Kredit`. Lihat detail mapping di 2.3 |
| Parameter risiko (opex %, safety margin %) | Input Admin via `system_settings` | Default: opex 2% dari kas masuk, safety margin 15% |

### 2.3 Mapping Data Riil dari iPOS (via Webhook N8N)

Berdasarkan contoh laporan aktual dari sistem iPOS, berikut pemetaan field yang perlu disepakati di N8N sebelum masuk ke database:

**a. Data Pemasukan Harian (per cabang, untuk dijumlahkan per Finance Group)**

| Field Sumber (iPOS) | Field Sistem (`omzet`) | Catatan |
|---|---|---|
| Tanggal | `omzet.date` | |
| Cash | `omzet.cash` | Penjualan tunai fisik hari itu |
| Bayar Piutang | `omzet.bayar_piutang` | **Bucket pembayaran via transfer** — campuran penjualan baru hari itu yang dibayar transfer DAN pelunasan piutang lama. Faktur tidak selalu ditandai "Lunas" saat transfer diterima, sehingga field ini TIDAK bisa dipakai sebagai data umur piutang (AR aging) yang akurat |
| Total (Cash + Bayar Piutang) | `omzet.total` | **Inilah angka yang dipakai sebagai `avg_daily_revenue`** — representasi kas riil masuk ke rekening/kas hari itu, apapun metode bayarnya (tunai atau transfer) |
| Komisi | — (tidak dipakai di modul ini) | Sudah ditangani modul Komisi CS terpisah, **dikecualikan** dari proyeksi kas modul Analisa Keuangan agar tidak dihitung dobel |

> **Catatan penting**: `avg_daily_revenue` pada seluruh formula di PRD ini merujuk pada **kas riil masuk** (`omzet.total`), bukan omzet penjualan murni. Untuk tujuan cash flow forecasting ini sudah tepat karena mencerminkan uang yang benar-benar bisa dipakai bayar hutang/belanja — terlepas dari ambiguitas sumbernya (cash baru vs piutang lama vs transfer baru). **Batasan**: karena `bayar_piutang` bercampur antara penjualan baru dan pelunasan piutang lama, field ini TIDAK valid dipakai sebagai dasar modul AR/piutang terpisah di masa depan tanpa pencatatan ulang di sisi kasir/iPOS.

**b. Data Hutang Supplier**

| Field Sumber (iPOS) | Field Sistem | Catatan |
|---|---|---|
| No Transaksi | `supplier_debts.invoice_no` | |
| Nama Supplier (header grup) | `supplier_debts.supplier_name` | |
| Tanggal | `supplier_debts.invoice_date` | |
| Tanggal JT | `supplier_debts.due_date` | |
| Nilai Kredit | `supplier_debts.amount` | Nilai awal invoice |
| **Sisa Kredit** | `supplier_debts.amount - supplier_debts.paid_amount` | **Field yang dipakai di semua formula**, bukan Nilai Kredit — karena sudah memperhitungkan pembayaran sebagian (partial payment) |
| Umur dari JT | (dipakai validasi + aging, tidak disimpan langsung) | Negatif = belum jatuh tempo (mis. -19 = 19 hari lagi). Positif = overdue (mis. 811 = lewat 811 hari) |

**c. Kategori Aging (turunan dari "Umur dari JT")**

Berguna untuk prioritas pembayaran dan tampilan tabel hutang di UI:

| Kategori | Kondisi |
|---|---|
| Belum Jatuh Tempo | umur < 0 |
| Overdue 1-30 hari | 0 ≤ umur ≤ 30 |
| Overdue 31-90 hari | 31 ≤ umur ≤ 90 |
| Overdue 90+ hari (kritis) | umur > 90 |

> Dari contoh data, ada hutang berumur 811 hari dan beberapa 200-700 hari — ini sinyal hutang macet/disputed yang sebaiknya **dikecualikan dari kalkulasi target harian** (karena tidak realistis dikejar harian) tapi tetap ditampilkan sebagai peringatan terpisah "Hutang Lampau Jatuh Tempo Kronis". Lihat poin open item di bagian 8.

### 2.4 Modal Kas Terkini (Cash Position) & Rincian Kas (Breakdown)
Selain proyeksi omzet masa depan, sistem perlu mengetahui **saldo kas riil hari ini** untuk menjadi titik awal simulasi. Berbeda dari data omzet/hutang yang otomatis via webhook, modal kas **diinput manual oleh Admin** (kas fisik/rekening tidak terhubung otomatis ke sistem).

Untuk meningkatkan transparansi alokasi dana, modal kas awal dirincikan ke dalam **9 pos akun kas/bank** (Kas Toko + 8 rekening bank/lainnya) dalam layout form 3x3:
- Kas Toko (Cash)
- Bank BCA
- Bank BRI
- Bank Mandiri
- Bank BNI
- Bank BSI
- Bank Lainnya 1
- Bank Lainnya 2

Input rincian kas ini akan otomatis dijumlahkan (sum) sebagai total modal kas terpakai, dan dikirimkan serta disimpan secara persisten ke database dalam format JSON di dalam field `result_json.cash_breakdown`.

Fungsinya mengubah modul dari sekadar "proyeksi" menjadi **cash runway simulator**: menjawab "di tanggal berapa kas diperkirakan minus jika tidak ada penyesuaian belanja?"

### 2.5 Empat Lensa Waktu
Modul menyajikan kalkulasi yang sama dalam 4 granularitas, agar owner bisa berpindah dari gambaran besar ke detail harian:

| Lensa | Tujuan | Tipe Window |
|---|---|---|
| **Harian** | Berapa kas yang harus disisihkan hari ini | Rolling, smoothed dari semua hutang aktif |
| **15-Harian (Bi-Weekly)** | Berapa total tagihan riil jatuh tempo per periode, default tab terbuka | Fixed kalender: tgl 1-15 dan 16-akhir bulan |
| **Mingguan** | Granularitas menengah untuk monitoring belanja | Rolling 7 hari |
| **Bulanan** | Ringkasan strategis | Agregasi rolling minggu berjalan (bukan mingguan × 4) |

---

## 3. Formula Kalkulasi

### 3.1 Proyeksi Pendapatan
```
avg_daily_revenue(group, N hari) = AVERAGE(omzet.total per hari untuk grup, rolling window N=30 atau 90 hari)
opex_harian = avg_daily_revenue × (opex_percent / 100)     // default 2%
```

> **Catatan implementasi**: Query ke tabel `omzet` menggunakan field `total` (bukan `cash + bayar_piutang` separately), karena `total` sudah merupakan hasil penjumlahan yang tersimpan. Contoh query:
> ```sql
> SELECT AVG(o.total) as avg_revenue
> FROM omzet o
> WHERE o.branch_id IN (SELECT cabang_id FROM finance_group_branches WHERE group_id = ?)
>   AND o.date >= CURDATE() - INTERVAL ? DAY
> ```

### 3.2 Target Harian Bayar Hutang (Amortisasi & Horizon N-Hari)

Sistem menghitung target harian menggunakan dua metode:
1. **Target Harian Spike (iPOS style)**: Setiap hutang aktif disebar proporsional dari hari ini sampai jatuh temponya:
   ```
   untuk setiap supplier_debts WHERE status != 'paid' AND due_date >= today:
       sisa_hari    = due_date - today
       porsi_harian = (amount - paid_amount) / sisa_hari
       sebar porsi_harian ke setiap tanggal dari today s.d. due_date
   
   required_daily_target(tanggal) = SUM(semua porsi_harian yang overlap tanggal tsb)
   ```
2. **Target Harian Merata Horizon N-Hari (15, 30, 45, 60 Hari)**: Seluruh kewajiban hutang yang jatuh tempo dalam rentang N hari ke depan (termasuk hutang yang sudah overdue) dikumpulkan dan dibagi merata dengan jumlah hari horizon:
   ```
   total_debt(N) = overdue_debt + upcoming_debt_due_in_N_days
   daily_target(N) = total_debt(N) / N
   ```
3. **Net Target Harian (Dengan Kas Awal)**: Jika opsi **"Gunakan Kas Awal (Net Target)"** diaktifkan, total hutang dalam horizon waktu dikurangi terlebih dahulu dengan saldo kas awal terinput sebelum dibagi N-Hari:
   ```
   net_debt(N) = Math.max(0, total_debt(N) - kas_awal)
   daily_target_net(N) = net_debt(N) / N
   ```

### 3.3 Target Pembayaran per Kelompok 15 Hari & Horizon Perencanaan
Perhitungan budget pembelian aman dialihkan ke horizon perencanaan treasury (15, 30, 45, dan 60 Hari) dengan rumus:

```
proyeksi_kas_masuk(N) = avg_daily_revenue × N × (1 - safety_margin_percent/100)
opex(N)               = (avg_daily_revenue × N) × opex_percent/100
hutang_jatuh_tempo(N) = SUM(amount - paid_amount) WHERE due_date <= today + N

// Jika opsi "Gunakan Kas Awal" aktif, kas awal diperhitungkan sebagai tambahan modal:
safe_purchase_budget(N) = proyeksi_kas_masuk(N) - opex(N) - hutang_jatuh_tempo(N) + (use_cash_for_debt ? kas_awal : 0)

status:
    safe_purchase_budget < 0                          → "DEFISIT"
    safe_purchase_budget < 10% proyeksi_kas_masuk     → "WASPADA"
    lainnya                                            → "AMAN"
```

### 3.4 Saldo Kas Berjalan (Cash Runway)
```
modal_kas_terkini = entri terbaru dari finance_cash_position untuk group ini

saldo_kas_proyeksi(tanggal) = modal_kas_terkini
                              + SUM(avg_daily_revenue × (1 - opex_percent/100), dari hari ini s.d. tanggal)
                              - SUM(required_daily_target, dari hari ini s.d. tanggal)

titik_kritis = tanggal pertama dimana saldo_kas_proyeksi(tanggal) < 0   // null jika tidak pernah minus

status_runway:
    jika modal_kas_terkini < kewajiban_hutang_minggu_ini
        → "WASPADA TINGGI - kas saat ini tidak cukup tanpa omzet masuk"
    jika titik_kritis ditemukan dalam 30 hari ke depan
        → "Defisit diperkirakan pada {titik_kritis}"
    lainnya
        → "AMAN"
```

### 3.5 Budget Belanja Aman (Mingguan & Bulanan)
```
proyeksi_kas_masuk_minggu = avg_daily_revenue × 7 × (1 - safety_margin_percent/100)
opex_minggu               = (avg_daily_revenue × 7) × opex_percent/100
kewajiban_hutang_minggu   = SUM(required_daily_target, 7 hari ke depan)

safe_purchase_budget_minggu = proyeksi_kas_masuk_minggu - opex_minggu - kewajiban_hutang_minggu
safe_purchase_budget_bulan  = SUM(per minggu kalender berjalan, BUKAN mingguan × 4)
```

> **Catatan kritikal**: Bulanan tidak boleh dihitung `mingguan × 4` karena akan meratakan lonjakan hutang yang menumpuk di minggu tertentu. Harus dijumlah per minggu kalender riil agar lonjakan tetap terlihat.

---

## 4. Skema Database

> **⚠️ REVISI**: Skema di bawah ini telah direvisi di **Bagian 11** dengan pendekatan **Auto-Derived Finance Group**. Tabel `finance_groups` dan `finance_group_branches` **dihapus**, diganti dengan field baru di tabel `branches` (`n8n_debt_endpoint`, `n8n_debt_secret`, `finance_group_key`). Semua referensi `finance_group_id` diganti menjadi `finance_group_key`. Lihat Bagian 11.6 untuk skema final.

> **Konvensi project**: Mayoritas tabel menggunakan `CHAR(36)` UUID sebagai primary key (generate via `uuid` v4 di backend). Tabel `branches` menggunakan `VARCHAR(10)` sebagai PK (contoh: 'UTM', 'JTJ', 'TSM'). Beberapa tabel baru menggunakan `INT AUTO_INCREMENT`. Untuk tabel baru di modul ini, ikuti konvensi `CHAR(36)` UUID.

```sql
-- Finance Groups: mengelompokkan cabang yang berbagi sumber finansial
CREATE TABLE finance_groups (
  id CHAR(36) NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  webhook_source_key VARCHAR(100) UNIQUE NOT NULL,
  opex_percent DECIMAL(5,2) DEFAULT 2.00,
  safety_margin_percent DECIMAL(5,2) DEFAULT 15.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mapping cabang ke finance group
CREATE TABLE finance_group_branches (
  group_id CHAR(36) NOT NULL,
  cabang_id VARCHAR(10) NOT NULL,
  PRIMARY KEY (group_id, cabang_id),
  CONSTRAINT fk_fgb_group FOREIGN KEY (group_id) REFERENCES finance_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_fgb_branch FOREIGN KEY (cabang_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hutang supplier dari iPOS (via N8N webhook)
CREATE TABLE supplier_debts (
  id CHAR(36) NOT NULL,
  finance_group_id CHAR(36) NOT NULL,
  supplier_name VARCHAR(150),
  invoice_no VARCHAR(100),
  invoice_date DATE,
  amount DECIMAL(15,2),             -- Nilai Kredit awal
  term_days INT,                    -- 30 / 45, informasi saja
  grace_days INT,                   -- 7 / 15, informasi saja
  due_date DATE NOT NULL,           -- final, dari webhook (Tanggal JT)
  status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  paid_amount DECIMAL(15,2) DEFAULT 0,  -- amount - paid_amount = Sisa Kredit, dipakai di semua formula
  aging_category ENUM('belum_jatuh_tempo','overdue_1_30','overdue_31_90','overdue_kronis'),
  is_excluded_from_calc BOOLEAN DEFAULT FALSE,  -- true untuk hutang kronis yang dikecualikan dari target harian
  source_payload JSON,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invoice_supplier (invoice_no, supplier_name),
  CONSTRAINT fk_sd_group FOREIGN KEY (finance_group_id) REFERENCES finance_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Modal kas terkini (input manual Admin)
CREATE TABLE finance_cash_position (
  id CHAR(36) NOT NULL,
  finance_group_id CHAR(36) NOT NULL,
  cash_amount DECIMAL(15,2) NOT NULL,
  recorded_date DATE NOT NULL,
  input_by CHAR(36),                -- FK ke users(id)
  notes VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_group_date (finance_group_id, recorded_date),
  CONSTRAINT fk_fcp_group FOREIGN KEY (finance_group_id) REFERENCES finance_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_fcp_user FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Histori snapshot analisa (bukan cache, setiap run = 1 baris baru)
CREATE TABLE finance_analysis_runs (
  id CHAR(36) NOT NULL,
  finance_group_id CHAR(36) NOT NULL,
  triggered_by CHAR(36),            -- FK ke users(id), Admin/Owner yang menjalankan
  run_label VARCHAR(150),           -- opsional, mis. "Analisa Pagi - Cek Kas Restock"
  cash_position_used DECIMAL(15,2), -- snapshot modal kas terkini saat analisa dijalankan
  avg_daily_revenue DECIMAL(15,2),
  result_json JSON NOT NULL,        -- seluruh hasil kalkulasi: daily, biweekly_buckets, weekly, monthly, cash_runway
  source_debt_snapshot JSON,        -- raw response dari N8N saat itu, untuk audit/reproduce
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_far_group FOREIGN KEY (finance_group_id) REFERENCES finance_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_far_user FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alert/peringatan dari hasil analisa
CREATE TABLE finance_alerts (
  id CHAR(36) NOT NULL,
  finance_group_id CHAR(36) NOT NULL,
  analysis_run_id CHAR(36),         -- FK ke finance_analysis_runs(id)
  alert_type ENUM('deficit_bucket','runway_critical','high_concentration'),
  message TEXT,
  severity ENUM('warning','critical'),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_fa_group FOREIGN KEY (finance_group_id) REFERENCES finance_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_fa_run FOREIGN KEY (analysis_run_id) REFERENCES finance_analysis_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **Catatan desain**: Tabel `finance_analysis_runs` bukan cache yang di-refresh otomatis, melainkan **histori snapshot** — setiap kali Admin menekan "Jalankan Analisa", satu baris baru ditambahkan (bukan update/overwrite). Admin bisa melihat beberapa hasil analisa dalam sehari yang sama untuk membandingkan kondisi (mis. sebelum vs sesudah ada pembayaran besar masuk), dan bisa menghapus entri yang tidak relevan lagi dari daftar histori.

> **Konvensi UUID**: Semua FK ke `users(id)` dan `branches(id)` mengikuti tipe data tabel referensi — `users.id` = `CHAR(36)`, `branches.id` = `VARCHAR(10)`. Backend generate UUID via `import { v4 as uuidv4 } from 'uuid'`.

### 4.1 Tabel Existing yang Sudah Bisa Dimanfaatkan

| Tabel | Relevansi |
|---|---|
| `omzet` | Sumber data `total` (kas masuk harian) per cabang. Field: `branch_id`, `date`, `cash`, `bayar_piutang`, `total` |
| `branches` | Master cabang. PK `VARCHAR(10)`: 'UTM', 'JTJ', 'TSM'. Punya `n8n_endpoint` dan `n8n_secret` |
| `n8n_live_cache` | Cache data omzet live dari N8N. Bisa dipakai sebagai sumber data real-time tambahan |
| `omzet_stats_monthly` | Statistik omzet bulanan (avg, median, min, max). Bisa dipakai untuk validasi `avg_daily_revenue` |
| `system_settings` | Key-value store untuk konfigurasi. Bisa dipakai untuk menyimpan parameter analisa keuangan |
| `audit_logs` | Audit trail. Setiap analisa yang dijalankan bisa dicatat di sini |

---

## 5. API Endpoints

> **⚠️ REVISI**: Endpoint untuk finance groups telah direvisi di **Bagian 11.7**. Endpoint `POST /api/finance/groups` dan `PUT /api/finance/groups/:id` **dihapus** (tidak perlu CRUD manual). Sebagai gantinya, ada endpoint baru untuk manajemen webhook hutang per cabang: `PUT /api/branches/:id/debt-webhook`. Parameter `:group_id` di semua endpoint diganti menjadi `:group_key` (hash SHA-256 dari webhook URL).

> **Konvensi project**: Backend menggunakan Express ESM. Route pattern: `/api/{resource}`. Auth via `authMiddleware` (JWT) + `roleMiddleware('super_admin', 'admin', 'owner')` untuk endpoint admin-only. Service layer terpisah dari controller.

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| GET | `/api/finance/groups` | List finance groups + mapping cabang | JWT (Admin, Owner) |
| POST | `/api/finance/groups` | Buat finance group baru | JWT (Admin) |
| PUT | `/api/finance/groups/:id` | Update finance group | JWT (Admin) |
| POST | `/api/finance/cash-position/:group_id` | Input/update saldo kas terkini | JWT (Admin, Owner) |
| **POST** | `/api/finance/analysis-runs/:group_id` | **Trigger analisa on-demand** — fetch live ke N8N (hutang) + query lokal (omzet), hitung semua formula, simpan sebagai entri histori baru | JWT (Admin, Owner) |
| GET | `/api/finance/analysis-runs/:group_id` | List histori hasil analisa | JWT (Admin, Owner) |
| GET | `/api/finance/analysis-runs/:group_id/:run_id` | Detail satu hasil analisa (full `result_json`) | JWT (Admin, Owner) |
| DELETE | `/api/finance/analysis-runs/:group_id/:run_id` | Hapus satu entri histori analisa | JWT (Admin) |
| PUT | `/api/finance/settings/:group_id` | Update `opex_percent`, `safety_margin_percent` | JWT (Admin) |
| GET | `/api/finance/supplier-concentration/:group_id` | Konsentrasi hutang per supplier | JWT (Admin, Owner) |
| GET | `/api/finance/aging-summary/:group_id` | Ringkasan aging hutang | JWT (Admin, Owner) |
| POST | `/api/finance/simulate-term-change` | What-if simulasi perubahan termin | JWT (Admin, Owner) |
| GET | `/api/finance/alerts/:group_id` | List alert/peringatan | JWT (Admin, Owner) |
| PUT | `/api/finance/alerts/:id/read` | Tandai alert sudah dibaca | JWT (Admin, Owner) |
| GET | `/api/finance/payment-priority/:group_id` | Antrian prioritas bayar | JWT (Admin, Owner) |

> **Catatan**: tidak ada endpoint `/api/finance/debts/webhook` (push) — penarikan data hutang sekarang terjadi **di dalam proses `POST /analysis-runs`**, langsung fetch ke N8N (`hutang-rinci`) saat itu juga, bukan disimpan permanen sebagai master data hutang yang ter-update terus-menerus. Lihat bagian 9 (alur eksekusi) untuk detail.

### Contoh Response `POST /api/finance/analysis-runs/:group_id`
```json
{
  "run_id": "uuid-here",
  "group_name": "UTM-JTJ Combined",
  "triggered_at": "2026-06-21T09:14:00Z",
  "triggered_by": "Admin (arissutrisna)",
  "avg_daily_revenue": 12500000,
  "cash_position": {
    "current_cash": 45000000,
    "recorded_date": "2026-06-20",
    "runway_status": "AMAN",
    "critical_date": null
  },
  "daily": { "debt_target_today": 1840000 },
  "biweekly_buckets": [
    {
      "label": "1-15 Jul 2026",
      "period": "P1",
      "days": 15,
      "projected_income": 159375000,
      "opex": 3750000,
      "debt_due": 28500000,
      "safe_purchase_budget": 127125000,
      "status": "AMAN"
    },
    {
      "label": "16-31 Jul 2026",
      "period": "P2",
      "days": 16,
      "projected_income": 170000000,
      "opex": 4000000,
      "debt_due": 45200000,
      "safe_purchase_budget": -2300000,
      "status": "DEFISIT"
    }
  ],
  "weekly": { "...": "granularitas 7 harian" },
  "monthly": { "...": "ringkasan rolling per minggu kalender" }
}
```

---

## 6. Rancangan Menu & UI

### 6.1 Posisi di Sidebar

Submenu baru ditempatkan di grup khusus `KEUANGAN`, terpisah dari "Master & Analisa" karena sifatnya strategis dan admin-only. Mengikuti struktur `Layout.tsx` yang sudah ada:

```
OPERASIONAL
📋 Data & Kehadiran
🔄 Mutasi Komisi
📌 Penugasan
📦 Transfer Item Bonus

MASTER & ANALISA
🏢 Cabang
👤 Pengguna
📊 Analisa Target

KEUANGAN          ← grup baru
💰 Analisa Keuangan

SISTEM
⚙️ Pengaturan
🛡️ Setting Admin
```

Di `Layout.tsx`, tambahkan grup navigasi baru:
```typescript
{ name: 'Analisa Keuangan', href: '/finance/analysis', icon: TrendingUp, roles: ['super_admin', 'admin', 'owner'] }
```

Di `App.tsx`, tambahkan route:
```typescript
<Route path="/finance/analysis" element={
  <ProtectedRoute allowedRoles={['super_admin', 'admin', 'owner']}>
    <Layout><FinanceAnalysis /></Layout>
  </ProtectedRoute>
} />
```

### 6.2 Layout Halaman
1. **Selector Finance Group** — dropdown di atas (jika ada lebih dari 1 grup)
2. **Form Rincian Kas Awal (3x3 Layout)** — Tabel input berisi 8 pos kas untuk Kas Toko + 7 rekening bank/lainnya yang menjumlahkan secara otomatis (real-time).
3. **Checkbox Opsi Parameter**:
   - **Gunakan Kas Awal (Net Target)**: mengaktifkan pengurangan target hutang & penambahan budget aman dengan kas awal.
   - **Skip Overdue Kronis**: mengabaikan tagihan berumur >90 hari.
   - **Skip Supplier Khusus**: mengecualikan supplier tertentu (misal: PJBT).
4. **Tombol "Jalankan Analisa"** — trigger preview/analisa.
5. **Hasil Analisa Terbaru**:
   - **Card Ringkasan** — Rata-rata Harian, Target Harian (30 Hari), Status Runway, dan total Hutang Kronis.
   - **Display Rincian Kas Awal** — Panel yang menampilkan breakdown saldo kas awal yang terpakai.
   - **Tab Switcher Horizon**: `15 Hari | 30 Hari | 45 Hari | 60 Hari | Target Harian | Rincian Supplier` — default terbuka di tab **15 Hari**.
   - **Visual Distribusi Kas (Stacked Progress Bar)** — Menampilkan persentase alokasi Kas Masuk ke Rencana Opex (Amber), Hutang Terakumulasi (Indigo), dan Budget Aman (Emerald) atau Defisit Kas (Red blinking). Ketika opsi kas awal aktif, menyertakan legenda indikator kas awal (Blue).
5. **Tab "Histori Analisa"** — daftar seluruh hasil analisa yang pernah dijalankan (lihat 7.1), dengan aksi Lihat & Hapus per entri

### 6.3 Halaman Pendukung
- **Halaman Cabang** (`/branches`): tambah section "Webhook Hutang Supplier" di setiap card edit cabang — input `n8n_debt_endpoint` dan `n8n_debt_secret`. Cabang dengan URL webhook sama otomatis tergabung dalam 1 finance group. Lihat Bagian 11.8.
- **Admin Settings** (`/admin/settings`): tambah section "Parameter Analisa Keuangan per Group" (opex %, safety margin %, window rolling average, `n_days` default) — selector finance group yang di-derive dari webhook URL.

---

## 7. Mekanisme Eksekusi Analisa (On-Demand, Bukan Terjadwal)

> **⚠️ REVISI**: Alur eksekusi telah direvisi di **Bagian 11.9** dengan pendekatan auto-derived finance group. Backend sekarang mengambil webhook URL & secret dari tabel `branches` berdasarkan `finance_group_key`, bukan dari tabel `finance_groups` terpisah.

Berbeda dari rancangan cache/cron sebelumnya, modul ini **sepenuhnya on-demand** — tidak ada proses background otomatis yang jalan tanpa aksi Admin.

**Alur saat Admin klik "Jalankan Analisa"**:
```
1. Frontend kirim POST /api/finance/analysis-runs/:group_id
   (opsional: body berisi run_label, dan cash_amount kalau Admin sekalian update modal kas)

2. Backend (financeAnalysisService.js):
   a. Ambil/atau simpan dulu modal_kas_terkini (finance_cash_position) jika dikirim
   b. Fetch live ke N8N: GET hutang-rinci?n_days=90 (dan hutang-subtotal jika perlu ringkasan cepat)
   c. Query lokal: avg_daily_revenue dari tabel omzet (rolling window, default 30 hari)
      → SELECT AVG(total) FROM omzet WHERE branch_id IN (...) AND date >= CURDATE() - INTERVAL ? DAY
   d. Hitung semua formula: target harian, biweekly_buckets, weekly, monthly, cash_runway,
      aging summary, supplier concentration, payment priority
   e. Simpan SATU baris baru ke finance_analysis_runs (result_json + source_debt_snapshot)
   f. Return hasil lengkap ke frontend

3. Frontend tampilkan hasil + otomatis muncul di daftar histori
```

**Karakteristik penting**:
- **Tidak ada cron/scheduler** — kalkulasi hanya terjadi saat di-trigger manual oleh Admin
- **Setiap run = snapshot independen** — data hutang yang dipakai adalah kondisi *saat itu juga* dari iPOS (live fetch), bukan data yang sudah di-cache sebelumnya
- Admin bisa menjalankan analisa **berkali-kali dalam sehari** (mis. pagi sebelum buka toko, sore setelah closing) untuk membandingkan kondisi kas pada titik waktu berbeda
- Proses fetch ke N8N + kalkulasi sebaiknya selesai dalam beberapa detik (bukan proses panjang) — kalau volume data hutang besar, pertimbangkan tampilkan loading state di UI, bukan proses async terpisah

---

## 7.1 Histori Analisa

Halaman terpisah (atau tab di dalam halaman Analisa Keuangan) menampilkan **daftar seluruh hasil analisa yang pernah dijalankan**, terbaru di atas:

```
┌─────────────────────────────────────────────────────────┐
│ Histori Analisa Keuangan — UTM-JTJ Combined               │
├─────────────────────────────────────────────────────────┤
│ 21 Jun 2026, 09:14  | Status: WASPADA TINGGI  | [Lihat] [Hapus] │
│ 20 Jun 2026, 16:30  | Status: AMAN            | [Lihat] [Hapus] │
│ 20 Jun 2026, 08:05  | Status: DEFISIT          | [Lihat] [Hapus] │
└─────────────────────────────────────────────────────────┘
```

- **Lihat** → buka detail hasil analisa pada titik waktu itu (read dari `result_json`, tidak dihitung ulang)
- **Hapus** → `DELETE /api/finance/analysis-runs/:group_id/:run_id`, hard delete (tidak perlu soft-delete karena ini snapshot historis, bukan master data)
- Admin bisa memberi `run_label` opsional saat trigger analisa (mis. "Sebelum keputusan restock besar") supaya histori lebih mudah ditelusuri

---

## 8. Hal yang Masih Perlu Diputuskan

- [x] ~~Apakah mapping cabang→finance_group di-setup manual oleh Admin via UI, atau full auto-derive dari webhook URL?~~ → **Diputuskan**: Auto-derive dari `branches.n8n_debt_endpoint`. Lihat Bagian 11.
- [ ] Hutang yang jatuh tempo di tengah periode 15-harian: dianggap utuh masuk 1 bucket, atau di-split proporsional antar 2 bucket?
- [ ] Window rolling average omzet: default 30 hari atau 90 hari — atau dibuat configurable per grup?
- [ ] Apakah perlu exclude hari libur/anomali (mis. lonjakan omzet saat promo besar) dari perhitungan rata-rata, agar proyeksi tidak bias?
- [ ] Frekuensi input modal kas terkini: wajib diinput ulang tiap hari oleh Admin, atau cukup tetap berlaku sampai diupdate manual (dengan indikator "terakhir diupdate X hari lalu" jika sudah usang)?
- [ ] Hutang overdue kronis (90+ hari, contoh ditemukan: ada yang sudah 811 hari) — dikecualikan total dari kalkulasi target harian, atau tetap dimasukkan tapi dengan porsi harian sangat kecil (disebar ke 1 tahun ke depan, mis.)? Perlu keputusan Admin/Owner karena ini kemungkinan piutang dispute atau sudah dianggap macet.

---

## 9. Fitur Tambahan (Hasil Analisa Kesehatan Keuangan)

Berdasarkan analisa data riil supplier UTM-JTJ (Juni 2026), ditemukan risiko yang tidak tertangani oleh desain awal: konsentrasi hutang ke 1-2 supplier besar, hutang kronis yang mendistorsi kalkulasi harian, dan tidak adanya mekanisme peringatan dini otomatis. Lima fitur berikut ditambahkan untuk menjawab risiko tersebut.

### 9.1 Supplier Concentration Risk Widget
**Tujuan**: Mendeteksi ketergantungan berlebihan pada 1-2 supplier, yang tidak kelihatan kalau hanya melihat laporan per tanggal jatuh tempo.

**Logika**:
```
untuk setiap supplier dalam finance_group:
    persen_dari_total = SUM(sisa_kredit supplier) / SUM(sisa_kredit semua supplier) × 100

flag_konsentrasi_tinggi = persen_dari_total > 25%   // threshold configurable per Admin
```

**UI**: Pie/bar chart top 5-10 supplier berdasarkan % kontribusi hutang. Supplier dengan flag tinggi ditandai badge merah + tooltip "Risiko konsentrasi — pertimbangkan negosiasi termin atau diversifikasi".

**Endpoint**: `GET /api/finance/supplier-concentration/:group_id`

### 9.2 Aging Bucket Dashboard
**Tujuan**: Memisahkan hutang operasional aktif dari hutang kronis/macet, supaya tidak mendistorsi kalkulasi target harian.

**Logika** (memanfaatkan `aging_category` yang sudah ada di skema `supplier_debts`):
```
bucket_summary = GROUP BY aging_category:
    "belum_jatuh_tempo"   -> SUM(sisa_kredit)
    "overdue_1_30"        -> SUM(sisa_kredit)
    "overdue_31_90"       -> SUM(sisa_kredit)
    "overdue_kronis"      -> SUM(sisa_kredit)   // 90+ hari, is_excluded_from_calc default TRUE

// hutang kronis ditampilkan terpisah, TIDAK ikut ke required_daily_target
// kecuali Admin secara eksplisit set is_excluded_from_calc = FALSE per invoice
```

**UI**: Card terpisah di bawah ringkasan utama — "Hutang Kronis Memerlukan Tindak Lanjut" dengan daftar invoice, supplier, dan umur hari, plus aksi cepat: tandai "Sudah Dinegosiasikan" / "Write-off" / "Masukkan ke Kalkulasi Aktif".

**Endpoint**: `GET /api/finance/aging-summary/:group_id`

### 9.3 What-If Negotiation Simulator
**Tujuan**: Memberi owner angka konkret sebelum negosiasi ulang termin dengan supplier besar.

**Logika**:
```
input: invoice_id atau supplier_name, term_days_baru
simulasi:
    due_date_baru = invoice_date + term_days_baru + grace_days
    hitung ulang required_daily_target, biweekly_buckets, cash_runway
    DENGAN due_date_baru menggantikan due_date asli (hanya in-memory, tidak menyimpan ke DB)

output: perbandingan side-by-side "Saat Ini" vs "Skenario Baru"
    - target harian: sebelum vs sesudah
    - titik kritis cash runway: sebelum vs sesudah
```

**UI**: Form sederhana di halaman detail supplier — pilih supplier/invoice, geser slider termin (mis. 30 → 45 hari), hasil kalkulasi update langsung tanpa reload (client-side recompute dari data yang sudah di-fetch).

**Endpoint**: `POST /api/finance/simulate-term-change` (request body: `{ supplier_name, new_term_days }`, response: hasil perbandingan, tidak menulis ke DB)

### 9.4 Defisit Early-Warning Notification
**Tujuan**: Begitu Admin menjalankan analisa dan hasilnya menunjukkan status bermasalah, sistem langsung menonjolkan peringatan — tidak terkubur di tabel/chart.

**Logika** (dijalankan sebagai bagian akhir dari proses `POST /analysis-runs`, bukan cron terpisah):
```
setelah hasil analisa selesai dihitung (lihat bagian 7):
    jika status bucket manapun (15-harian/mingguan) == "DEFISIT"
       ATAU runway_status == "WASPADA TINGGI"
       ATAU titik_kritis ditemukan dalam 14 hari ke depan:
          simpan ke finance_alerts (terhubung ke analysis_run_id terkait)
          tampilkan banner peringatan menonjol di hasil analisa (bukan cuma badge biasa)

channel: in-app (banner di halaman hasil analisa + badge notifikasi) WAJIB
         WhatsApp via N8N OPSIONAL — hanya relevan kalau Admin tidak standby di depan dashboard,
         dikirim saat itu juga setelah analisa selesai (bukan terjadwal)
```

**Endpoint**: `GET /api/finance/alerts/:group_id`, `PUT /api/finance/alerts/:id/read`

### 9.5 Payment Priority Queue
**Tujuan**: Saat kas terbatas, Admin butuh urutan prioritas pembayaran yang bukan cuma berdasar tanggal jatuh tempo, tapi juga mempertimbangkan pentingnya relasi supplier.

**Logika**:
```
priority_score(invoice) = 
    (bobot_urgency × normalisasi(hari_menuju_jatuh_tempo, terbalik))
  + (bobot_strategis × persen_dari_total_hutang_supplier)

default bobot: urgency 60%, strategis 40% (configurable per Admin)

urutkan semua invoice unpaid/partial berdasarkan priority_score DESC
```

**UI**: Tabel "Antrian Prioritas Bayar" di halaman utama — kolom: Supplier, Invoice, Sisa Kredit, Jatuh Tempo, Skor Prioritas, Aksi ("Tandai Dibayar"). Berguna langsung sebagai checklist operasional harian Admin.

**Endpoint**: `GET /api/finance/payment-priority/:group_id`

---

## 10. Rencana Implementasi Teknis

> **⚠️ REVISI**: Struktur file dan stack implementasi tetap sama, tapi dengan penyesuaian:
> - `financeGroupService.js` sekarang query ke `branches` (auto-derived), bukan CRUD ke tabel `finance_groups`
> - Tambah endpoint di `branchesController.js` untuk `PUT /api/branches/:id/debt-webhook`
> - `financeDebtService.js` mengambil webhook URL & secret dari `branches` berdasarkan `finance_group_key`

### 10.1 Struktur File Backend (mengikuti konvensi project)

```
backend/src/
├── controllers/
│   ├── financeController.js        # Handler untuk semua endpoint /api/finance/*
│   └── branchesController.js       # Existing, tambah: updateDebtWebhook, testDebtWebhook
├── services/
│   ├── financeAnalysisService.js   # Logika kalkulasi utama (formula PRD bagian 3)
│   ├── financeIncomeService.js     # Query omzet lokal (avg_daily_revenue)
│   ├── financeDebtService.js       # Fetch hutang dari N8N (URL & secret dari branches)
│   └── financeGroupService.js      # Auto-derived groups dari branches.n8n_debt_endpoint
├── routes/
│   ├── financeRoutes.js            # Definisi route /api/finance/*
│   └── branchesRoutes.js           # Existing, tambah: PUT /:id/debt-webhook
└── server.js                       # Existing, tambah: app.use('/api/finance', financeRoutes)
```

### 10.2 Struktur File Frontend (mengikuti konvensi project)

```
src/
├── pages/
│   └── FinanceAnalysis.tsx         # Halaman utama Analisa Keuangan
├── components/
│   └── finance/                    # Komponen spesifik modul keuangan
│       ├── CashRunwayChart.tsx     # Chart Recharts untuk cash runway
│       ├── BiweeklyBucketTable.tsx # Tabel budget per bucket 15-harian
│       ├── SupplierConcentration.tsx # Pie chart konsentrasi supplier
│       ├── AgingDashboard.tsx      # Dashboard aging hutang
│       ├── PaymentPriority.tsx     # Tabel antrian prioritas bayar
│       └── AnalysisHistory.tsx     # Tab histori analisa
└── services/
    └── api.ts                      # Sudah ada, tambah endpoint /finance/*
```

### 10.3 Stack Implementasi

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts (chart) + Lucide React (ikon) |
| Backend | Node.js + Express (ESM) + MySQL2/MariaDB |
| Database | MariaDB 11.4 (existing `branches` dimodifikasi + 5 tabel baru: `finance_group_settings`, `supplier_debts`, `finance_cash_position`, `finance_analysis_runs`, `finance_alerts`) |
| Integrasi | N8N webhook (hutang supplier), GET pull pattern, auth via Bearer token per cabang |
| Keamanan | `authMiddleware` (JWT) + `roleMiddleware('super_admin', 'admin', 'owner')` |
| UUID | `uuid` v4 (sudah ada di dependencies) |
| Hashing | `crypto.createHash('sha256')` (built-in Node.js) untuk `finance_group_key` |

---

## 11. Integrasi Webhook Hutang per Cabang (Auto-Derived Finance Group)

### 11.1 Konsep Dasar

Alih-alih membuat tabel `finance_groups` dan `finance_group_branches` sebagai entitas terpisah yang di-manual-setup oleh Admin, sistem menggunakan pendekatan yang lebih pragmatis: **finance group diturunkan otomatis (auto-derived) dari URL webhook hutang yang diset per cabang**.

**Prinsip**:
- Setiap cabang bisa memiliki **URL webhook hutang sendiri** di tabel `branches`
- Cabang yang memiliki **URL webhook sama** → otomatis dianggap **satu finance group** (analisa keuangan digabung)
- Cabang yang memiliki **URL webhook berbeda** → **analisa keuangan berdiri sendiri** (independen)
- Security/auth menggunakan **secret per cabang** yang sudah ada di `branches.n8n_secret` (atau field baru `n8n_debt_secret` jika perlu dipisah dari secret omzet)

> **Contoh skenario**:
> - Cabang UTM & JTJ memiliki `n8n_debt_endpoint` = `http://192.168.100.12:5678/webhook/hutang-rinci` → **1 finance group** "UTM-JTJ Combined"
> - Cabang TSM memiliki `n8n_debt_endpoint` = `http://192.168.100.13:5678/webhook/hutang-rinci-tsm` → **finance group sendiri** "TSM"
> - Jika nanti TSM diubah ke URL yang sama dengan UTM-JTJ → otomatis bergabung jadi 1 grup

### 11.2 Modifikasi Tabel `branches`

Tambahkan 2 field baru ke tabel `branches` (existing):

```sql
ALTER TABLE branches
  ADD COLUMN n8n_debt_endpoint VARCHAR(500) DEFAULT NULL 
    COMMENT 'URL webhook N8N untuk fetch data hutang supplier. Cabang dengan URL sama = 1 finance group.',
  ADD COLUMN n8n_debt_secret VARCHAR(255) DEFAULT NULL 
    COMMENT 'Secret token untuk auth ke webhook hutang. Auto-sync ke semua cabang dengan endpoint sama.';
```

**Struktur final tabel `branches`**:

| Field | Tipe | Fungsi |
|---|---|---|
| `id` | VARCHAR(10) PK | Kode cabang (UTM, JTJ, TSM) |
| `name` | VARCHAR(255) | Nama cabang |
| `n8n_endpoint` | VARCHAR(500) | URL webhook omzet (existing, untuk modul Komisi CS) |
| `n8n_secret` | VARCHAR(255) | Secret token omzet (existing) |
| **`n8n_debt_endpoint`** | **VARCHAR(500)** | **URL webhook hutang (BARU)** |
| **`n8n_debt_secret`** | **VARCHAR(255)** | **Secret token hutang (BARU, auto-sync)** |

### 11.3 Auto-Sync Secret untuk Cabang dengan Endpoint Sama

Karena UTM & JTJ share database iPOS yang sama, mereka pasti mengakses N8N instance yang sama → **secret harus sama**. Untuk menghindari inkonsistensi, backend melakukan **auto-sync secret** setiap kali Admin mengubah `n8n_debt_endpoint` atau `n8n_debt_secret`.

**Logika auto-sync di backend** (`branchesController.js`):

```javascript
// Saat Admin update n8n_debt_endpoint atau n8n_debt_secret untuk cabang X:
export const updateDebtWebhook = async (req, res) => {
  const { id } = req.params;
  const { n8n_debt_endpoint, n8n_debt_secret } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Update cabang ini
    await connection.execute(
      `UPDATE branches SET n8n_debt_endpoint = ?, n8n_debt_secret = ? WHERE id = ?`,
      [n8n_debt_endpoint || null, n8n_debt_secret || null, id]
    );
    
    // 2. Auto-sync: jika endpoint tidak null, sync secret ke semua cabang dengan endpoint sama
    let syncedBranches = [];
    if (n8n_debt_endpoint) {
      const [siblings] = await connection.execute(
        `SELECT id FROM branches WHERE n8n_debt_endpoint = ? AND id != ?`,
        [n8n_debt_endpoint, id]
      );
      
      if (siblings.length > 0) {
        await connection.execute(
          `UPDATE branches SET n8n_debt_secret = ? WHERE n8n_debt_endpoint = ? AND id != ?`,
          [n8n_debt_secret || null, n8n_debt_endpoint, id]
        );
        syncedBranches = siblings.map(s => s.id);
      }
    }
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      synced_branches: syncedBranches,  // info ke frontend
      finance_group_key: n8n_debt_endpoint 
        ? crypto.createHash('sha256').update(n8n_debt_endpoint).digest('hex')
        : null
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
```

**Skenario auto-sync**:

| Aksi | Efek |
|---|---|
| Admin set webhook UTM = `http://n8n/webhook/hutang-rinci` | UTM tersimpan |
| Admin set webhook JTJ = `http://n8n/webhook/hutang-rinci` (URL sama) | JTJ tersimpan. Backend deteksi UTM punya URL sama → sync secret UTM ke JTJ (atau sebaliknya) |
| Admin ubah secret UTM | Secret UTM berubah. Backend otomatis sync ke JTJ (karena endpoint sama) |
| Admin ubah endpoint TSM ke URL berbeda | TSM jadi finance group sendiri, secret tidak terpengaruh |
| Admin ubah endpoint TSM ke URL sama dengan UTM-JTJ | TSM bergabung ke group UTM-JTJ, secret otomatis disamakan |

### 11.4 Aturan Auto-Derived Finance Group

```
finance_group = GROUP BY branches.n8n_debt_endpoint WHERE n8n_debt_endpoint IS NOT NULL

-- Setiap unique n8n_debt_endpoint = 1 finance group
-- Cabang dengan n8n_debt_endpoint = NULL → tidak ikut analisa keuangan (tidak punya data hutang)
```

**Query untuk mendapatkan daftar finance group**:
```sql
SELECT 
  b.n8n_debt_endpoint as webhook_url,
  GROUP_CONCAT(b.id ORDER BY b.id SEPARATOR ', ') as branch_ids,
  COUNT(*) as branch_count,
  CASE 
    WHEN COUNT(*) > 1 THEN CONCAT(GROUP_CONCAT(b.id ORDER BY b.id SEPARATOR '-'), ' Combined')
    ELSE MAX(b.name)
  END as group_name
FROM branches b
WHERE b.n8n_debt_endpoint IS NOT NULL
GROUP BY b.n8n_debt_endpoint
ORDER BY MIN(b.id);
```

**Implikasi**:
- **Tidak perlu tabel `finance_groups`** dan **`finance_group_branches`** — cukup query ke `branches`
- `finance_group_id` di tabel lain (`supplier_debts`, `finance_cash_position`, `finance_analysis_runs`, `finance_alerts`) diganti menjadi **`webhook_url`** (VARCHAR 500) atau **hash dari URL** untuk efisiensi
- Atau tetap pakai `finance_groups` sebagai **view/materialized view** yang di-derive dari `branches`

### 11.5 Opsi Implementasi: Virtual Group vs Physical Table

#### Opsi A: Virtual Group (Recommended)

Tidak buat tabel `finance_groups` sama sekali. Semua referensi ke "finance group" menggunakan `n8n_debt_endpoint` sebagai identifier.

**Keuntungan**:
- Lebih simpel, tidak ada data duplikat
- Perubahan webhook URL langsung berdampak (tidak perlu sync)
- Tidak ada risiko data tidak konsisten antara `finance_groups` dan `branches`

**Kerugian**:
- `n8n_debt_endpoint` sebagai FK tidak praktis (VARCHAR 500 terlalu panjang)
- Perlu hash/index untuk efisiensi

**Solusi**: Tambah kolom `finance_group_key` (VARCHAR 64) yang merupakan **SHA-256 hash** dari `n8n_debt_endpoint`. Ini jadi identifier yang stabil dan efisien.

```sql
ALTER TABLE branches
  ADD COLUMN finance_group_key VARCHAR(64) GENERATED ALWAYS AS (SHA2(n8n_debt_endpoint, 256)) STORED,
  ADD INDEX idx_branches_finance_group (finance_group_key);
```

Tabel lain referensi ke `finance_group_key`:
```sql
CREATE TABLE finance_analysis_runs (
  id CHAR(36) NOT NULL,
  finance_group_key VARCHAR(64) NOT NULL,  -- hash dari webhook URL
  -- ...
  INDEX idx_far_group (finance_group_key)
);
```

#### Opsi B: Physical Table (Sync Manual)

Tetap buat tabel `finance_groups` tapi dengan sync otomatis:
- Setiap kali `n8n_debt_endpoint` di `branches` berubah, backend otomatis update `finance_groups`
- Lebih kompleks, tapi FK lebih clean

**Rekomendasi**: **Opsi A** (Virtual Group) karena lebih simpel dan konsisten.

### 11.6 Security Model

Security webhook hutang mengikuti pola yang **sama persis** dengan webhook omzet yang sudah ada, dengan tambahan **auto-sync secret** untuk cabang yang berbagi endpoint.

| Aspek | Webhook Omzet (existing) | Webhook Hutang (baru) |
|---|---|---|
| URL | `branches.n8n_endpoint` | `branches.n8n_debt_endpoint` |
| Secret | `branches.n8n_secret` | `branches.n8n_debt_secret` (auto-sync per finance group) |
| Auth Header | `Authorization: Bearer <secret>` | `Authorization: Bearer <secret>` |
| Pattern | N8N push ke backend | Backend pull dari N8N (GET) |

**Alur auth saat backend fetch hutang**:
```
1. Backend terima request analisa untuk finance_group_key = X
2. Query: SELECT n8n_debt_endpoint, n8n_debt_secret 
          FROM branches WHERE finance_group_key = X LIMIT 1
3. Backend fetch: GET {n8n_debt_endpoint}?n_days=90
   Header: Authorization: Bearer {n8n_debt_secret}
4. N8N validasi secret → return data hutang
```

**Catatan**:
- Secret **disimpan per cabang** di `branches.n8n_debt_secret`, tapi **auto-sync** ke semua cabang dengan `n8n_debt_endpoint` yang sama
- Admin hanya perlu input secret **satu kali** di salah satu cabang — sisanya otomatis tersinkron
- Jika `n8n_debt_secret` = NULL, backend bisa fallback ke `branches.n8n_secret` (secret omzet) — dengan asumsi N8N instance yang sama pakai secret yang sama untuk semua webhook

### 11.7 Modifikasi Skema Database (Revisi Bagian 4)

Dengan pendekatan Virtual Group (Opsi A), skema database direvisi:

```sql
-- Tambah field ke branches (existing table)
ALTER TABLE branches
  ADD COLUMN n8n_debt_endpoint VARCHAR(500) DEFAULT NULL,
  ADD COLUMN n8n_debt_secret VARCHAR(255) DEFAULT NULL,
  ADD COLUMN finance_group_key VARCHAR(64) GENERATED ALWAYS AS (
    CASE WHEN n8n_debt_endpoint IS NOT NULL THEN SHA2(n8n_debt_endpoint, 256) ELSE NULL END
  ) STORED,
  ADD INDEX idx_branches_finance_group (finance_group_key);

-- Finance Group Settings (parameter per group, bukan per cabang)
CREATE TABLE finance_group_settings (
  finance_group_key VARCHAR(64) NOT NULL,
  opex_percent DECIMAL(5,2) DEFAULT 2.00,
  safety_margin_percent DECIMAL(5,2) DEFAULT 15.00,
  n_days_default INT DEFAULT 90,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (finance_group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Hutang supplier dari iPOS (via N8N webhook)
CREATE TABLE supplier_debts (
  id CHAR(36) NOT NULL,
  finance_group_key VARCHAR(64) NOT NULL,  -- hash dari webhook URL
  supplier_name VARCHAR(150),
  invoice_no VARCHAR(100),
  invoice_date DATE,
  amount DECIMAL(15,2),
  due_date DATE NOT NULL,
  status ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  paid_amount DECIMAL(15,2) DEFAULT 0,
  aging_category ENUM('belum_jatuh_tempo','overdue_1_30','overdue_31_90','overdue_kronis'),
  is_excluded_from_calc BOOLEAN DEFAULT FALSE,
  source_payload JSON,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invoice_supplier (invoice_no, supplier_name),
  INDEX idx_sd_group (finance_group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Modal kas terkini (input manual Admin)
CREATE TABLE finance_cash_position (
  id CHAR(36) NOT NULL,
  finance_group_key VARCHAR(64) NOT NULL,
  cash_amount DECIMAL(15,2) NOT NULL,
  recorded_date DATE NOT NULL,
  input_by CHAR(36),
  notes VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_group_date (finance_group_key, recorded_date),
  INDEX idx_fcp_group (finance_group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Histori snapshot analisa
CREATE TABLE finance_analysis_runs (
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
  INDEX idx_far_group (finance_group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Alert/peringatan
CREATE TABLE finance_alerts (
  id CHAR(36) NOT NULL,
  finance_group_key VARCHAR(64) NOT NULL,
  analysis_run_id CHAR(36),
  alert_type ENUM('deficit_bucket','runway_critical','high_concentration'),
  message TEXT,
  severity ENUM('warning','critical'),
  is_read BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_fa_group (finance_group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Perubahan dari versi sebelumnya**:
- ❌ Hapus tabel `finance_groups` dan `finance_group_branches`
- ✅ Tambah field `n8n_debt_endpoint`, `n8n_debt_secret`, `finance_group_key` di `branches`
- ✅ Semua tabel finance referensi ke `finance_group_key` (VARCHAR 64) bukan `finance_group_id` (CHAR 36)
- ✅ Tambah tabel `finance_group_settings` untuk parameter per group

### 11.8 API Endpoints (Revisi)

#### Endpoint untuk Manajemen Webhook Hutang (di halaman Cabang)

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| PUT | `/api/branches/:id/debt-webhook` | Update `n8n_debt_endpoint` & `n8n_debt_secret`. Auto-sync secret ke cabang dengan endpoint sama | JWT (Admin) |
| GET | `/api/branches/:id/debt-webhook` | Get konfigurasi webhook hutang + info finance group | JWT (Admin, Owner) |
| POST | `/api/branches/:id/debt-webhook/test` | Test koneksi ke webhook hutang (ping N8N) | JWT (Admin) |
| GET | `/api/branches/:id/debt-webhook/siblings` | List cabang lain yang punya endpoint sama | JWT (Admin, Owner) |

**Contoh Response `PUT /api/branches/:id/debt-webhook`**:
```json
{
  "success": true,
  "synced_branches": ["JTJ"],
  "finance_group_key": "a1b2c3d4...",
  "finance_group_name": "UTM-JTJ Combined",
  "message": "Webhook updated. Secret auto-synced to: JTJ"
}
```

#### Endpoint Finance Group (Auto-Derived, Read-Only)

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| GET | `/api/finance/groups` | List finance groups (auto-derived dari `branches.n8n_debt_endpoint`) | JWT (Admin, Owner) |
| GET | `/api/finance/groups/:key` | Detail finance group (daftar cabang, webhook info) | JWT (Admin, Owner) |

> **Catatan**: Tidak ada endpoint `PUT /api/finance/groups/:key/settings` karena parameter (opex %, safety margin %) disimpan di `system_settings` dengan key pattern `finance_group_{key}_opex_percent`, atau bisa ditambahkan nanti jika diperlukan.

#### Endpoint Analisa (tetap sama, tapi pakai `finance_group_key`)

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/finance/analysis-runs/:group_key` | Trigger analisa on-demand | JWT (Admin, Owner) |
| GET | `/api/finance/analysis-runs/:group_key` | List histori | JWT (Admin, Owner) |
| GET | `/api/finance/analysis-runs/:group_key/:run_id` | Detail hasil analisa | JWT (Admin, Owner) |
| DELETE | `/api/finance/analysis-runs/:group_key/:run_id` | Hapus histori | JWT (Admin) |

### 11.9 Modifikasi UI

#### Halaman Cabang (`/branches`) — Primary Location

Section **"Webhook Hutang Supplier"** ditambahkan di card detail/edit setiap cabang:

```
┌─────────────────────────────────────────────────────────┐
│ Cabang: UTM — Puncak Jaya Baja UTM                      │
├─────────────────────────────────────────────────────────┤
│ [Existing fields: Name, City, Target, Commission %]     │
│ [Existing fields: N8N Endpoint Omzet, N8N Secret]       │
│                                                          │
│ ─── Webhook Hutang Supplier ────────────────────────── │
│                                                          │
│ URL Webhook Hutang:                                     │
│ [http://192.168.100.12:5678/webhook/hutang-rinci    ]  │
│                                                          │
│ Secret Token:                                           │
│ [***************************************************]  │
│                                                          │
│ [Test Koneksi]                                          │
│                                                          │
│ ┌─ ℹ️ Info Finance Group ─────────────────────────────┐ │
│ │ Finance Group: UTM-JTJ Combined                     │ │
│ │ Cabang dalam group: UTM, JTJ                        │ │
│ │ Secret otomatis tersinkron ke cabang: JTJ           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [Simpan]                                                │
└─────────────────────────────────────────────────────────┘
```

**Perilaku UI**:
- Saat Admin mengetik/mengubah **URL Webhook**, frontend otomatis cek apakah ada cabang lain dengan URL sama (via API call)
- Jika ada → tampilkan info box "Finance Group: UTM-JTJ Combined" + daftar cabang
- Jika tidak ada → tampilkan "Finance Group: UTM (cabang tunggal)"
- Saat Admin mengubah **Secret** → backend auto-sync ke semua cabang dengan endpoint sama, frontend tampilkan "Secret tersinkron ke: JTJ"
- Tombol **Test Koneksi** → `POST /api/branches/:id/debt-webhook/test` → backend coba fetch ke N8N dan tampilkan hasil

#### Halaman Analisa Keuangan (`/finance/analysis`)

Dropdown "Finance Group" menampilkan hasil auto-derived dari `branches.n8n_debt_endpoint`:

```
┌─────────────────────────────────────────────────────────┐
│ Analisa Keuangan                                         │
├─────────────────────────────────────────────────────────┤
│ Finance Group:                                          │
│ [▼ UTM-JTJ Combined (2 cabang)       ]                 │
│     ├─ UTM-JTJ Combined (2 cabang)                     │
│     └─ TSM (1 cabang)                                  │
│                                                          │
│ [Input Modal Kas] [Jalankan Analisa]                    │
└─────────────────────────────────────────────────────────┘
```

### 11.10 Alur Eksekusi (Revisi Bagian 7)

```
1. Admin pilih Finance Group dari dropdown
   → Backend query: SELECT id, name FROM branches WHERE finance_group_key = ?

2. Admin input modal kas + klik "Jalankan Analisa"
   → POST /api/finance/analysis-runs/:group_key

3. Backend:
   a. Ambil webhook URL & secret:
      SELECT n8n_debt_endpoint, COALESCE(n8n_debt_secret, n8n_secret) as secret
      FROM branches WHERE finance_group_key = ? LIMIT 1
   
   b. Fetch hutang dari N8N:
      GET {n8n_debt_endpoint}?n_days=90
      Header: Authorization: Bearer {secret}
   
   c. Query omzet lokal:
      SELECT AVG(total) FROM omzet 
      WHERE branch_id IN (SELECT id FROM branches WHERE finance_group_key = ?)
      AND date >= CURDATE() - INTERVAL 90 DAY
   
   d. Hitung semua formula → simpan ke finance_analysis_runs
   
   e. Return hasil ke frontend
```

### 11.11 Migrasi Data Existing

Untuk cabang yang sudah ada (UTM, JTJ, TSM):

```sql
-- Set webhook hutang untuk UTM & JTJ (same group, same secret)
UPDATE branches SET 
  n8n_debt_endpoint = 'http://192.168.100.12:5678/webhook/hutang-rinci',
  n8n_debt_secret = NULL  -- akan fallback ke n8n_secret yang sudah ada
WHERE id IN ('UTM', 'JTJ');

-- Set webhook hutang untuk TSM (separate group)
UPDATE branches SET 
  n8n_debt_endpoint = 'http://192.168.100.12:5678/webhook/hutang-rinci-tsm',
  n8n_debt_secret = NULL
WHERE id = 'TSM';

-- finance_group_key akan otomatis ter-generate (generated column)
```

**Catatan migrasi**:
- Jika `n8n_debt_secret` = NULL, backend akan fallback ke `n8n_secret` (secret omzet)
- Ini memungkinkan UTM & JTJ langsung jalan tanpa perlu set secret baru (asumsi N8N instance sama)
- Admin bisa set `n8n_debt_secret` terpisah nanti jika diperlukan

### 11.12 Keuntungan Pendekatan Ini

| Aspek | Manual Finance Group | Auto-Derived + Auto-Sync (baru) |
|---|---|---|
| Setup | Admin harus buat group + mapping cabang | Cukup set webhook URL per cabang di halaman Cabang |
| Konsistensi | Risiko data tidak sync antara `finance_groups` dan `finance_group_branches` | Selalu konsisten (derived dari `branches`) |
| Secret management | Admin harus set secret per group | Admin set secret 1x di cabang manapun, auto-sync ke cabang lain dengan endpoint sama |
| Perubahan webhook | Harus update `finance_groups` + `finance_group_branches` | Cukup update `branches.n8n_debt_endpoint` |
| Query | Perlu JOIN ke `finance_group_branches` | Cukup `WHERE finance_group_key = ?` |
| Skalabilitas | Tambah cabang baru = harus mapping manual | Tambah cabang baru = set webhook URL, otomatis masuk group |
| Shared database | Tidak ada mekanisme khusus | UTM & JTJ yang share DB otomatis pakai 1 auth (auto-sync secret) |

---
**Last Updated**: 2026-06-21
