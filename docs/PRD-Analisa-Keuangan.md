# PRD: Modul Analisa Keuangan
**Sistem**: Komisi CS PJB (komcsbybolt)
**Versi**: 1.3 — Build aktual (Preview + Save, Supplier Report, Horizon Budgets)
**Tanggal**: 2026-06-21
**Status**: ✅ Implemented — Production Ready
**Hak Akses**: Admin & Owner only

---

## 1. Latar Belakang & Tujuan

Sistem sudah mampu menghitung komisi CS dan menarik omzet harian otomatis via N8N. Owner masih harus menghitung manual di Excel untuk menjawab pertanyaan finansial krusial:

1. Berapa **target harian** yang wajib dicapai supaya hutang supplier bisa dibayar tepat waktu?
2. Berapa **nominal aman untuk belanja/restock** per horizon waktu tanpa mengganggu kemampuan bayar hutang?
3. Berapa **total kewajiban yang jatuh tempo per periode**, agar owner bisa menyiapkan kas jauh-jauh hari?

Modul ini menggantikan kalkulasi manual tersebut dengan sistem otomatis berbasis data omzet historis (sebagai proyeksi pendapatan) dan data hutang supplier (via webhook N8N).

**Prinsip desain**: Sistem hanya menyajikan **proyeksi berbasis data aktual**, bukan target ambisius. Semua angka harus konservatif dan memberi peringatan dini saat kas berpotensi defisit.

---

## 2. Konsep Inti

### 2.1 Finance Group (Kelompok Finansial)

Cabang yang berbagi **URL webhook hutang yang sama** (`branches.n8n_debt_endpoint`) dianggap **satu entitas finansial gabungan** — omzet dan hutangnya dijumlahkan sebagai satu paket target. Cabang dengan URL webhook berbeda punya analisa keuangan sendiri-sendiri.

> Contoh: Cabang UTM & JTJ memiliki `n8n_debt_endpoint` yang sama → 1 Finance Group "UTM-JTJ Combined". Cabang TSM dengan webhook berbeda → Finance Group sendiri.

**Implementasi**: Finance group **diturunkan otomatis (auto-derived)** dari field `n8n_debt_endpoint` di tabel `branches`. Tidak perlu tabel terpisah untuk mapping — cukup `GROUP BY n8n_debt_endpoint`. Finance group diidentifikasi via `finance_group_key` (SHA-256 hash dari URL webhook).

### 2.2 Sumber Data

| Data | Sumber | Mekanisme |
|---|---|---|
| Kas masuk harian (Cash + Transfer) | Modul Komisi CS (tabel `omzet`, field `total`) | Sudah ada, real-time via N8N |
| Hutang supplier + jatuh tempo | Webhook N8N (terhubung iPOS) | Field `Sisa Kredit` dipakai sebagai nominal hutang aktif |
| Parameter risiko (opex %, safety margin %) | Input Admin via `finance_group_settings` | Default: opex 2%, safety margin 15% |
| Modal kas terkini | Input manual Admin via UI | Disimpan di `finance_cash_position` |

### 2.3 Mapping Data Riil dari iPOS (via Webhook N8N)

**a. Data Pemasukan Harian (per cabang, untuk dijumlahkan per Finance Group)**

| Field Sumber (iPOS) | Field Sistem (`omzet`) | Catatan |
|---|---|---|
| Tanggal | `omzet.date` | |
| Cash | `omzet.cash` | Penjualan tunai fisik hari itu |
| Bayar Piutang | `omzet.bayar_piutang` | Campuran penjualan baru + pelunasan piutang lama |
| Total (Cash + Bayar Piutang) | `omzet.total` | **Inilah angka yang dipakai sebagai `avg_daily_revenue`** |

> **Catatan penting**: `avg_daily_revenue` merujuk pada **kas riil masuk** (`omzet.total`), bukan omzet penjualan murni.

**b. Data Hutang Supplier**

| Field Sumber (iPOS) | Field Sistem | Catatan |
|---|---|---|
| No Transaksi | `invoice_no` | |
| Nama Supplier | `supplier_name` | |
| Tanggal | `invoice_date` | |
| Tanggal JT | `due_date` | |
| Nilai Kredit | `amount` | Nilai awal invoice |
| **Sisa Kredit** | `amount - paid_amount` | **Field yang dipakai di semua formula** |
| Sisa Hari | `sisa_hari` | Positif = belum JT, Negatif = overdue |

**c. Kategori Aging**

| Kategori | Kondisi (`sisa_hari`) |
|---|---|
| Belum Jatuh Tempo | > 0 |
| Overdue 1-30 Hari | 0 ≥ sisa_hari ≥ -30 |
| Overdue 31-90 Hari | -31 ≥ sisa_hari ≥ -90 |
| Overdue Kronis | < -90 |

### 2.4 Modal Kas Terkini (Cash Position)

Modal kas **diinput manual oleh Admin** saat preview/save analisa. Disimpan di `finance_cash_position` dengan unique key `(finance_group_key, recorded_date)`.

### 2.5 Lima Lensa Waktu

| Lensa | Tujuan | Tipe Window |
|---|---|---|
| **Harian** | Target harian bayar hutang | Debt amortization calendar |
| **15-Harian (Bi-Weekly)** | Budget per periode 15 hari | Fixed bucket: 4 bucket ke depan |
| **Mingguan** | Budget 7 hari ke depan | Rolling 7 hari |
| **Bulanan** | Budget 30 hari ke depan | Rolling 30 hari |
| **Horizon (15/30/45/60)** | Target harian smoothed per horizon | Rolling N hari |

---

## 3. Formula Kalkulasi

### 3.1 Proyeksi Pendapatan
```
avg_daily_revenue(group, 30 hari) = AVERAGE(omzet.total per hari, rolling 30 hari)
opex_harian = avg_daily_revenue × (opex_percent / 100)     // default 2%
```

### 3.2 Target Harian Bayar Hutang

**Metode 1: Spikey (debt_target_today)**
Setiap hutang aktif disebar proporsional dari hari ini sampai jatuh temponya:
```
untuk setiap hutang WHERE due_date >= today AND sisa_hutang > 0:
    sisa_hari = due_date - today
    porsi_harian = sisa_hutang / sisa_hari
    debt_target_today = SUM(semua porsi_harian)
```

**Metode 2: Smoothed per Horizon (target_15d, target_30d, target_45d, target_60d)**
```
untuk horizon N hari:
    overdue_debt = SUM(sisa_hutang WHERE due_date < today)
    upcoming_debt = SUM(sisa_hutang WHERE today ≤ due_date ≤ today+N)
    total_debt = overdue_debt + upcoming_debt
    net_debt = use_cash_for_debt ? MAX(0, total_debt - cash_amount) : total_debt
    daily_target = net_debt / N
```

### 3.3 Budget per Periode (Bi-Weekly, Weekly, Monthly, Horizon)
```
proyeksi_kas_masuk = avg_daily_revenue × N_hari × (1 - safety_margin_percent/100)
opex = avg_daily_revenue × N_hari × opex_percent/100
hutang_jatuh_tempo = SUM(sisa_hutang WHERE due_date ≤ horizon_end)
safe_purchase_budget = proyeksi_kas_masuk - opex - hutang_jatuh_tempo

status:
    budget < 0                    → "DEFISIT"
    budget < 10% proyeksi_kas     → "WASPADA"
    lainnya                       → "AMAN"
```

### 3.4 Cash Runway
```
target_for_runway = target_30d (jika ada) atau debt_target_today
net_daily_flow = avg_daily_revenue × (1 - opex_percent/100) - target_for_runway

jika net_daily_flow < 0 dan current_cash > 0:
    days_until_zero = current_cash / |net_daily_flow|
    critical_date = today + days_until_zero
    status = days_until_zero ≤ 14 ? "WASPADA TINGGI" : "WASPADA"
jika current_cash ≤ 0:
    status = "WASPADA TINGGI"
lainnya:
    status = "AMAN"
```

---

## 4. Skema Database

### 4.1 Modifikasi Tabel `branches` (existing)

```sql
ALTER TABLE branches
  ADD COLUMN n8n_debt_endpoint VARCHAR(500) DEFAULT NULL,
  ADD COLUMN n8n_debt_secret VARCHAR(255) DEFAULT NULL,
  ADD COLUMN finance_group_key VARCHAR(64) GENERATED ALWAYS AS (
    CASE WHEN n8n_debt_endpoint IS NOT NULL THEN SHA2(n8n_debt_endpoint, 256) ELSE NULL END
  ) STORED,
  ADD INDEX idx_branches_finance_group (finance_group_key);
```

### 4.2 Tabel Baru

```sql
-- Finance Group Settings (parameter per group)
CREATE TABLE finance_group_settings (
  finance_group_key VARCHAR(64) NOT NULL,
  webhook_url VARCHAR(500) NOT NULL,
  webhook_secret VARCHAR(255) DEFAULT NULL,
  opex_percent DECIMAL(5,2) DEFAULT 2.00,
  safety_margin_percent DECIMAL(5,2) DEFAULT 15.00,
  n_days_default INT DEFAULT 90,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (finance_group_key),
  CONSTRAINT fk_fgs_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX idx_fcp_group (finance_group_key),
  CONSTRAINT fk_fcp_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE,
  CONSTRAINT fk_fcp_user FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX idx_far_group (finance_group_key),
  INDEX idx_far_created (created_at DESC),
  CONSTRAINT fk_far_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE,
  CONSTRAINT fk_far_user FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Alert/peringatan
CREATE TABLE finance_alerts (
  id CHAR(36) NOT NULL,
  finance_group_key VARCHAR(64) NOT NULL,
  analysis_run_id CHAR(36),
  alert_type ENUM('deficit_bucket','runway_critical','high_concentration'),
  message TEXT,
  severity ENUM('warning','critical'),
  is_read TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_fa_group (finance_group_key),
  INDEX idx_fa_read (is_read, created_at DESC),
  CONSTRAINT fk_fa_branches FOREIGN KEY (finance_group_key) REFERENCES branches(finance_group_key) ON DELETE CASCADE,
  CONSTRAINT fk_fa_run FOREIGN KEY (analysis_run_id) REFERENCES finance_analysis_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.3 Tabel Existing yang Dimanfaatkan

| Tabel | Relevansi |
|---|---|
| `omzet` | Sumber `total` (kas masuk harian). Field: `branch_id`, `date`, `cash`, `bayar_piutang`, `total` |
| `branches` | Master cabang + `n8n_debt_endpoint`, `n8n_debt_secret`, `finance_group_key` |
| `users` | FK untuk `triggered_by`, `input_by` |

---

## 5. API Endpoints

### 5.1 Finance Groups

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| GET | `/api/finance/groups` | List finance groups (auto-derived) | JWT (Admin, Owner) |
| GET | `/api/finance/groups/:groupKey` | Detail group + branches + settings | JWT (Admin, Owner) |
| PUT | `/api/finance/groups/:groupKey/settings` | Update opex%, safety%, n_days, webhook_secret | JWT (Admin) |

### 5.2 Analysis Runs (Preview + Save)

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/finance/analysis-runs/:groupKey/preview` | **Preview** analisa tanpa save ke DB | JWT (Admin, Owner) |
| POST | `/api/finance/analysis-runs/:groupKey/save` | **Save** analisa ke histori | JWT (Admin, Owner) |
| GET | `/api/finance/analysis-runs/:groupKey` | List histori | JWT (Admin, Owner) |
| GET | `/api/finance/analysis-runs/:groupKey/:runId` | Detail satu hasil analisa | JWT (Admin, Owner) |
| DELETE | `/api/finance/analysis-runs/:groupKey/:runId` | Hapus histori + cleanup alerts | JWT (Admin) |

**Request Body (preview & save)**:
```json
{
  "cash_amount": 45000000,
  "run_label": "Analisa Pagi",
  "skip_overdue_kronis": false,
  "ignored_suppliers": ["pjbt", "pjb tasik"],
  "use_cash_for_debt": false
}
```

**Response**:
```json
{
  "run_id": "uuid-here",
  "group_name": "UTM-JTJ Combined",
  "triggered_at": "2026-06-21T09:14:00Z",
  "avg_daily_revenue": 12500000,
  "cash_position": {
    "current_cash": 45000000,
    "recorded_date": "2026-06-21",
    "runway_status": "AMAN",
    "critical_date": null
  },
  "daily": {
    "debt_target_today": 1840000,
    "target_15d": 2100000,
    "target_30d": 1950000,
    "target_45d": 1800000,
    "target_60d": 1700000,
    "horizons": [...]
  },
  "biweekly_buckets": [...],
  "weekly": {...},
  "monthly": {...},
  "horizon_budgets": { "h15": {...}, "h30": {...}, "h45": {...}, "h60": {...} },
  "cash_runway": {...},
  "aging_summary": {...},
  "supplier_report": {
    "total_suppliers": 91,
    "total_invoices": 3532,
    "total_amount": 63271518806,
    "total_paid": 0,
    "total_remaining": 63271518806,
    "suppliers": [...]
  },
  "options": {
    "skip_overdue_kronis": false,
    "ignored_suppliers": ["pjbt", "pjb tasik"],
    "use_cash_for_debt": false
  }
}
```

### 5.3 Alerts

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| GET | `/api/finance/alerts/:groupKey` | List alert/peringatan | JWT (Admin, Owner) |
| PUT | `/api/finance/alerts/:alertId/read` | Tandai alert sudah dibaca | JWT (Admin, Owner) |

### 5.4 Branch Debt Webhook

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| PUT | `/api/branches/:id/debt-webhook` | Update `n8n_debt_endpoint` & `n8n_debt_secret`. Auto-sync secret | JWT (Admin) |
| GET | `/api/branches/:id/debt-webhook` | Get konfigurasi webhook hutang + info finance group | JWT (Admin, Owner) |
| POST | `/api/branches/:id/debt-webhook/test` | Test koneksi ke webhook hutang | JWT (Admin) |
| GET | `/api/branches/:id/debt-webhook/siblings` | List cabang lain yang punya endpoint sama | JWT (Admin, Owner) |

---

## 6. Rancangan Menu & UI

### 6.1 Posisi di Sidebar

```
KEUANGAN          ← grup baru
💰 Analisa Keuangan    (roles: admin, owner)
```

### 6.2 Layout Halaman Analisa Keuangan

1. **Selector Finance Group** — dropdown (auto-derived dari `branches.n8n_debt_endpoint`)
2. **Input Section**:
   - Modal Kas Terkini (Rp) — opsional
   - Label (opsional)
   - Filter Options: Skip Overdue Kronis, Skip Supplier Khusus
3. **Tombol**: "Preview Analisa" → tampilkan hasil tanpa save, "Simpan ke Histori" → save ke DB
4. **Hasil Preview/Saved**:
   - **4 Summary Cards**: Rata-rata Harian, Target Harian, Status Runway, Hutang Kronis
   - **Tab Switcher**: `15-Harian | Mingguan | Bulanan | Rincian Supplier`
   - **Tab 15-Harian**: Tabel budget per bucket 15 hari
   - **Tab Mingguan**: Proyeksi 7 hari
   - **Tab Bulanan**: Proyeksi 30 hari
   - **Tab Rincian Supplier**: Summary cards + tabel supplier (expandable untuk lihat detail invoice)
5. **Aging Summary**: 4 cards (Belum JT, Overdue 1-30, 31-90, Kronis)
6. **Histori Analisa**: Tabel dengan aksi Lihat & Hapus

### 6.3 Halaman Cabang — Section Webhook Hutang

Di setiap card edit cabang, ada tab "Webhook Hutang" dengan:
- Input URL Webhook Hutang
- Input Secret Token
- Tombol Test Koneksi
- Info box Finance Group (auto-detected)
- Info cabang lain yang punya endpoint sama (auto-sync)

---

## 7. Mekanisme Eksekusi Analisa

### 7.1 Preview Mode (Tidak Save ke DB)

```
1. Admin pilih Finance Group dari dropdown
2. Admin isi Modal Kas (opsional) + set filter options
3. Klik "Preview Analisa"
   → POST /api/finance/analysis-runs/:groupKey/preview
4. Backend:
   a. Fetch hutang dari N8N (live)
   b. Query avg_daily_revenue dari omzet (30 hari)
   c. Hitung semua formula
   d. Return hasil (TANPA save ke DB)
5. Frontend tampilkan hasil sebagai preview
```

### 7.2 Save Mode (Simpan ke Histori)

```
1. Setelah preview, Admin klik "Simpan ke Histori"
   → POST /api/finance/analysis-runs/:groupKey/save
2. Backend:
   a. Simpan cash_position ke finance_cash_position
   b. Insert ke finance_analysis_runs (result_json + source_debt_snapshot)
   c. Generate alerts jika ada kondisi DEFISIT/WASPADA TINGGI
   d. Return hasil + run_id
3. Frontend: tampilkan notifikasi "Mode Preview" hilang, hasil masuk ke histori
```

### 7.3 Delete Mode

```
1. Admin klik "Hapus" di histori
   → DELETE /api/finance/analysis-runs/:groupKey/:runId
2. Backend:
   a. DELETE FROM finance_alerts WHERE analysis_run_id = ?
   b. DELETE FROM finance_analysis_runs WHERE id = ?
   c. (FK cascade akan handle sisanya)
3. Frontend: refresh histori
```

---

## 8. Struktur File Implementasi

### Backend
```
backend/src/
├── controllers/
│   ├── financeController.js        # Handler semua endpoint /api/finance/*
│   └── branchesController.js       # Existing + updateDebtWebhook, testDebtWebhook
├── services/
│   ├── financeAnalysisService.js   # Core: runAnalysis, formulas, supplier report
│   ├── financeIncomeService.js     # Query omzet (avg_daily_revenue)
│   ├── financeDebtService.js       # Fetch N8N, transform, aging
│   └── financeGroupService.js      # Auto-derived groups dari branches
├── routes/
│   ├── financeRoutes.js            # Route definitions
│   └── branchesRoutes.js           # Existing + debt-webhook routes
└── scripts/
    ├── run_finance_fix.js          # Database fix script (FK, orphan cleanup)
    └── fix_finance_analysis_db.sql # SQL migration script
```

### Frontend
```
src/
├── pages/
│   └── FinanceAnalysis.tsx         # Halaman utama (preview + save + supplier report)
├── components/
│   └── Layout.tsx                  # Updated: tambah menu Keuangan
└── App.tsx                         # Updated: tambah route /finance/analysis
```

### Database
```
schema_mariadb.sql                  # Updated: tambah tabel finance + modify branches
```

---

## 9. Stack Implementasi

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Lucide React |
| Backend | Node.js + Express (ESM) + MySQL2/MariaDB |
| Database | MariaDB 11.4 + 4 tabel baru + modifikasi `branches` |
| Integrasi | N8N webhook (GET pull pattern), auth via Bearer token |
| Keamanan | JWT + `roleMiddleware('super_admin', 'admin', 'owner')` |
| UUID | `uuid` v4 |
| Hashing | `crypto.createHash('sha256')` untuk `finance_group_key` |

---

## 10. Status Implementasi

| Fitur | Status | Catatan |
|---|---|---|
| Auto-derived Finance Group | ✅ Done | Via `branches.n8n_debt_endpoint` + SHA-256 hash |
| Debt Webhook per Cabang | ✅ Done | CRUD di halaman Cabang, auto-sync secret |
| Preview Mode | ✅ Done | POST `/preview` tanpa save ke DB |
| Save Mode | ✅ Done | POST `/save` dengan audit log |
| Delete + Cleanup | ✅ Done | Transaction-based, explicit alert cleanup |
| Supplier Report | ✅ Done | Detail per supplier + expandable invoice list |
| Horizon Budgets (15/30/45/60) | ✅ Done | Smoothed daily target per horizon |
| Cash Runway | ✅ Done | Projection dengan critical date |
| Aging Summary | ✅ Done | 4 kategori aging |
| Filter Options | ✅ Done | Skip overdue kronis, ignore suppliers |
| Alerts | ✅ Done | Auto-generated on deficit/runway critical |
| Foreign Keys | ✅ Done | 5 FK constraints dengan CASCADE DELETE |
| Orphan Cleanup | ✅ Done | 60 orphaned alerts cleaned |
| Schema in `schema_mariadb.sql` | ✅ Done | Complete table definitions |

---

## 11. Database Dependency Map

```
branches (parent)
├── finance_group_settings (FK: finance_group_key → CASCADE)
├── finance_cash_position (FK: finance_group_key → CASCADE, input_by → users SET NULL)
├── finance_analysis_runs (FK: finance_group_key → CASCADE, triggered_by → users SET NULL)
│   └── finance_alerts (FK: analysis_run_id → CASCADE, finance_group_key → CASCADE)
└── users (FK: branch_id → branches SET NULL)
```

---

## 12. Open Items / Future Improvements

- [ ] **Soft delete** untuk analysis runs (archive instead of hard delete)
- [ ] **Retention policy** — auto-archive runs older than 90 hari
- [ ] **WhatsApp notification** via N8N untuk alert critical
- [x] ~~**What-If Simulator**~~ (Maju ke spesifikasi di Bab 13)
- [ ] **Payment Priority Queue** — antrian prioritas bayar
- [ ] **Chart/Graph** — visualisasi cash runway dengan Recharts
- [ ] **Export PDF** — export hasil analisa ke PDF

---

## 13. Simulasi Pembelian (What-If Treasury Analysis)

### 13.1 Konsep Utama
Simulasi Pembelian adalah modul analisis skenario (*what-if*) di mana Owner/Management dapat menyimulasikan dampak rencana pembelanjaan baru atau perubahan tagihan terhadap proyeksi kas tanpa merusak data riil.

Untuk menjamin keakuratan data, simulator ini **harus mengambil acuan (baseline) dari hasil analisa riil yang sudah disimpan** (`finance_analysis_runs`).

### 13.2 Mekanisme Dependensi & Penguncian Data (Restricted Deletion)
* **Ketergantungan Data**: Sebuah simulasi merujuk pada `analysis_run_id` tertentu untuk memuat data avg daily revenue, opex %, dan list hutang riil pada saat itu.
* **Aturan Database (Integrity)**: Data analisa riil acuan **tidak boleh dihapus** selama masih ada draf/simulasi aktif yang merujuk kepadanya.
* **Constraint**: Menerapkan rule `ON DELETE RESTRICT` pada kunci asing (`analysis_run_id`). Jika user mencoba menghapus analisa acuan melalui API `DELETE /api/finance/analysis-runs/:group_key/:run_id`, backend akan mengembalikan status `400 Bad Request` dengan pesan error pelarangan.

### 13.3 Alur Eksekusi Simulasi
1. **Pilih Baseline**: User masuk ke menu *Simulasi Pembelian*, memilih analisa acuan (misal: "Analisa 22 Juni Pagi").
2. **CRUD Nota Simulasi** (In-Memory di Frontend):
   - **CREATE**: Tambahkan nota rencana belanja (Nama Supplier, Sisa Kredit, Tempo Hari).
   - **UPDATE**: Ubah nominal/tempo nota simulasi.
   - **DELETE**: Hapus nota simulasi dari draf berjalan.
3. **Preview**: Frontend mengirimkan array `simulated_debts` bersama dengan ID acuan ke API `/preview` simulator. Backend menghitung ulang target harian horizon dan budget aman baru.
4. **Save**: Menyimpan draf simulasi ini ke database (tabel `finance_purchase_simulations`).

### 13.4 API Endpoints Baru

| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/finance/simulations/:groupKey/preview` | Preview kalkulasi simulasi (data acuan + nota simulasi) | JWT (Admin, Owner) |
| POST | `/api/finance/simulations/:groupKey/save` | Menyimpan draf simulasi pembelian baru ke DB | JWT (Admin, Owner) |
| GET | `/api/finance/simulations/:groupKey` | Mendapatkan daftar draf simulasi yang tersimpan | JWT (Admin, Owner) |
| GET | `/api/finance/simulations/:groupKey/:simId` | Detail draf simulasi (termasuk list item simulasi) | JWT (Admin, Owner) |
| DELETE | `/api/finance/simulations/:groupKey/:simId` | Menghapus draf simulasi pembelian | JWT (Admin) |

---

## 14. Referensi

| Dokumen | Path |
|---|---|
| PRD (this file) | `docs/PRD-Analisa-Keuangan.md` |
| N8N Webhook Guide | `docs/N8N-Webhook-Guide-Analisa-Keuangan.md` |
| Database Schema | `docs/DATABASE-SCHEMA.md` |
| Database Audit Report | `docs/FINANCE_ANALYSIS_DB_AUDIT.md` |
| Database Schema SQL | `schema_mariadb.sql` |
| Migration Script | `backend/src/scripts/run_finance_fix.js` |

---
**Last Updated**: 2026-06-23
**Build Version**: 1.4 (Draft Simulasi Pembelian)
