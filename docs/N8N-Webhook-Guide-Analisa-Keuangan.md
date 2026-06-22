# Panduan N8N Webhook — Modul Analisa Keuangan
**Sistem**: Komisi CS PJB (komcsbybolt)
**Modul terkait**: [PRD-Analisa-Keuangan.md](PRD-Analisa-Keuangan.md)
**Versi**: 2.1 — Disesuaikan dengan konteks project aktual
**Tanggal**: 2026-06-21

---

## 1. Ringkasan Arsitektur Integrasi

| # | Alur | Arah Integrasi | Sumber | Cara Akses |
|---|---|---|---|---|
| 1 | Kas Masuk Harian | **Tidak perlu N8N** | Tabel `omzet` di MariaDB lokal (sudah terisi via webhook omzet eksisting untuk modul Komisi CS) | Query langsung dari backend, tanpa HTTP call |
| 2 | Hutang Supplier (ringkas per supplier) | **N8N Pull (GET)** — backend yang fetch ke N8N | Database iPOS Postgres `i5_DATABARU`, lewat workflow `hutang-subtotal` | `GET {n8n_host}/webhook/hutang-subtotal?n_days=N` |
| 3 | Hutang Supplier (rinci per invoice) | **N8N Pull (GET)** — backend yang fetch ke N8N | Database iPOS Postgres `i5_DATABARU`, lewat workflow `hutang-rinci` | `GET {n8n_host}/webhook/hutang-rinci?n_days=N` |

**Perubahan penting dari rencana awal**: workflow hutang yang sudah dibuat memakai pola **GET dengan query parameter** (pull), bukan N8N mengirim push ke backend kita. Backend yang menjadwalkan fetch on-demand (saat Admin klik "Jalankan Analisa"), N8N hanya menyediakan endpoint query.

---

## 2. Kas Masuk Harian — Tidak Perlu Workflow N8N Baru

Data omzet (Cash + Bayar Piutang) sudah masuk ke tabel `omzet` MariaDB lokal lewat webhook omzet yang sudah berjalan untuk modul Komisi CS. Modul Analisa Keuangan **cukup membaca tabel itu langsung** di level service backend — tidak perlu hit ke iPOS sama sekali untuk kebutuhan ini.

### Struktur Tabel `omzet` (existing)

```sql
-- Tabel omzet sudah ada di schema_mariadb.sql
CREATE TABLE `omzet` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `branch_id` varchar(10) DEFAULT NULL,    -- FK ke branches(id): 'UTM', 'JTJ', 'TSM'
  `date` date NOT NULL,
  `cash` decimal(15,2) DEFAULT 0.00,       -- Penjualan tunai
  `bayar_piutang` decimal(15,2) DEFAULT 0.00,  -- Pembayaran via transfer (campuran penjualan baru + pelunasan piutang lama)
  `total` decimal(15,2) DEFAULT 0.00,      -- cash + bayar_piutang = total kas masuk
  `description` text DEFAULT NULL,
  `source` enum('AUTO','MANUAL_UPDATE','IMPORT') DEFAULT 'IMPORT',
  -- ... other fields
  UNIQUE KEY `uk_branch_date` (`branch_id`,`date`)
);
```

### Contoh Query Backend (ESM + mysql2/promise)

```javascript
// services/financeIncomeService.js
import pool from '../config/database.js';

/**
 * Hitung rata-rata kas masuk harian untuk finance group.
 * Menggunakan field `total` dari tabel omzet (= cash + bayar_piutang).
 */
export const getAvgDailyRevenue = async (financeGroupId, windowDays = 30) => {
  const [rows] = await pool.execute(`
    SELECT AVG(o.total) as avg_revenue
    FROM omzet o
    WHERE o.branch_id IN (
      SELECT fgb.cabang_id 
      FROM finance_group_branches fgb 
      WHERE fgb.group_id = ?
    )
    AND o.date >= CURDATE() - INTERVAL ? DAY
    AND o.total > 0
  `, [financeGroupId, windowDays]);
  
  return rows[0]?.avg_revenue || 0;
};

/**
 * Ambil data omzet harian untuk chart/grafik.
 */
export const getDailyRevenueHistory = async (financeGroupId, days = 90) => {
  const [rows] = await pool.execute(`
    SELECT o.date, o.cash, o.bayar_piutang, o.total, o.branch_id, b.name as branch_name
    FROM omzet o
    JOIN branches b ON b.id = o.branch_id
    WHERE o.branch_id IN (
      SELECT fgb.cabang_id 
      FROM finance_group_branches fgb 
      WHERE fgb.group_id = ?
    )
    AND o.date >= CURDATE() - INTERVAL ? DAY
    ORDER BY o.date DESC
  `, [financeGroupId, days]);
  
  return rows;
};
```

Tidak ada payload webhook baru, tidak ada mapping field tambahan — modul ini sepenuhnya reuse data yang sudah ada.

### Tabel Existing yang Bisa Dimanfaatkan

| Tabel | Field Relevan | Kegunaan |
|---|---|---|
| `omzet` | `branch_id`, `date`, `cash`, `bayar_piutang`, `total` | Sumber utama `avg_daily_revenue` |
| `n8n_live_cache` | `branch_id`, `tanggal`, `cash`, `piutang`, `total` | Cache data live dari N8N, bisa dipakai untuk data real-time |
| `omzet_stats_monthly` | `branch_id`, `avg_daily`, `median_daily`, `min_daily`, `max_daily` | Validasi & perbandingan proyeksi |
| `branches` | `id` (VARCHAR 10), `name`, `n8n_endpoint`, `n8n_secret` | Master cabang & mapping ke finance group |

---

## 3. Workflow Hutang Supplier — Analisa Teknis

### 3.1 Pola Umum Kedua Workflow

```
[Webhook GET] → [Validate Input (n_days)] → [Query Postgres iPOS] → [Format Response]
```

Kedua workflow (`hutang-rinci` dan `hutang-subtotal`) query ke skema iPOS berikut:

```
tbl_imhd          -- header invoice/hutang (notransaksi, kodesupel, tanggal, jmlkredit, byr_krd_jt)
tbl_supel         -- master supplier (kode, nama)
tbl_byrhutangdt   -- histori pembayaran hutang (notransaksi, jmlkredit)
```

`sisa_hutang = jmlkredit - SUM(pembayaran dari tbl_byrhutangdt)` — ini persis konsep "Sisa Kredit" yang sudah dipakai di seluruh formula PRD (bagian 2.3 dan 3.x).

### 3.2 Gap Kritis: Hutang Overdue Tidak Tertangkap

Filter di kedua query:
```sql
WHERE im.byr_krd_jt::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '{{n_days}} days'
```
Filter ini **hanya menangkap hutang yang jatuh tempo dari hari ini ke depan**. Hutang yang `due_date < CURRENT_DATE` (sudah lewat jatuh tempo) **tidak akan pernah muncul** di response — padahal di laporan manual sebelumnya ditemukan hutang overdue sampai 811 hari.

**Dampak ke modul**: Fitur Aging Bucket Dashboard (PRD 9.2) dan deteksi hutang kronis tidak akan berfungsi penuh tanpa data ini.

**Rekomendasi perbaikan** — tambahkan parameter mode di kedua workflow, atau buat varian ke-3:
```sql
-- Tambahan kondisi untuk menangkap overdue, jadi WHERE jadi:
WHERE (im.byr_krd_jt::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '{{n_days}} days')
   OR (im.byr_krd_jt::date < CURRENT_DATE)   -- tangkap semua yang sudah overdue, tanpa batas n_days
```
Saran konkret: ubah parameter jadi `include_overdue` (boolean) di node "Validate Input", atau buat workflow ke-3 `hutang-overdue` yang query khusus `WHERE byr_krd_jt::date < CURRENT_DATE` tanpa batas bawah waktu. Ini perlu disepakati dan ditambal sebelum integrasi backend dimulai — **jangan integrasikan dulu sebelum gap ini diperbaiki**, karena kalkulasi aging dan target harian akan under-count kewajiban riil.

### 3.3 Konvensi Tanda — Beda dari Laporan Manual Sebelumnya

| Sumber | Field | Konvensi |
|---|---|---|
| Laporan Excel "Hutang Beredar" (sebelumnya) | `Umur dari JT` | **Negatif** = belum jatuh tempo, **positif** = overdue |
| Workflow N8N (`sisa_hari_min`) | `jatuh_tempo - CURRENT_DATE` | **Positif** = belum jatuh tempo (hari tersisa), **negatif/0** = sudah/baru jatuh tempo |

Dua sumber ini **kebalikan tanda**. Saat backend menerima data dari N8N, mapping ke `aging_category` harus pakai logika sesuai konvensi N8N (positif = aman), bukan asumsi lama dari laporan Excel manual.

```javascript
// services/financeDebtService.js
export const deriveAgingCategory = (sisaHari) => {
  if (sisaHari > 0) return 'belum_jatuh_tempo';
  const overdueAge = Math.abs(sisaHari);
  if (overdueAge <= 30) return 'overdue_1_30';
  if (overdueAge <= 90) return 'overdue_31_90';
  return 'overdue_kronis';
};
```

### 3.4 Response Workflow `hutang-subtotal`

Cocok untuk: **Aging Bucket Dashboard** (PRD 9.2), **Supplier Concentration Widget** (9.1).

```json
{
  "status": "success",
  "n_days": 30,
  "query_date": "2026-06-21",
  "total_suppliers": 5,
  "total_invoices": 12,
  "grand_total": 450000000,
  "data": [
    {
      "kode_supplier": "SMSSP",
      "nama_supplier": "Sarana Sentral Profilindo (PT)",
      "jumlah_invoice": 4,
      "total_hutang": 180000000,
      "jatuh_tempo_terdekat": "2026-06-25",
      "sisa_hari_min": 4,
      "jatuh_tempo_terjauh": "2026-08-01"
    }
  ]
}
```

### 3.5 Response Workflow `hutang-rinci`

Cocok untuk: **Payment Priority Queue** (PRD 9.5), detail invoice per supplier, dan basis data utama tabel `supplier_debts`.

```json
{
  "status": "success",
  "n_days": 30,
  "query_date": "2026-06-21",
  "total_suppliers": 5,
  "total_invoices": 12,
  "grand_total": 450000000,
  "data": [
    {
      "kode_supplier": "SMSSP",
      "nama_supplier": "Sarana Sentral Profilindo (PT)",
      "jumlah_invoice": 4,
      "total_hutang": 180000000,
      "jatuh_tempo_terdekat": "2026-06-25",
      "sisa_hari_min": 4,
      "detail_invoices": [
        {
          "notransaksi": "0032/BL/UTM/0526",
          "tgl_beli": "2026-05-07",
          "hutang_awal": 36991500,
          "sudah_dibayar": 0,
          "sisa_hutang": 36991500,
          "jatuh_tempo": "2026-06-21",
          "sisa_hari": 0
        }
      ]
    }
  ]
}
```

### 3.6 Mapping ke Skema `supplier_debts`

| Field Response N8N | Field `supplier_debts` | Catatan |
|---|---|---|
| `kode_supplier` + `nama_supplier` | `supplier_name` | |
| `detail_invoices[].notransaksi` | `invoice_no` | |
| `detail_invoices[].tgl_beli` | `invoice_date` | |
| `detail_invoices[].jatuh_tempo` | `due_date` | |
| `detail_invoices[].hutang_awal` | `amount` | |
| `detail_invoices[].sisa_hutang` | `amount - paid_amount` (derive `paid_amount = hutang_awal - sisa_hutang`) | **Field utama** untuk semua formula |
| `detail_invoices[].sisa_hari` | (dipakai derive `aging_category`, lihat 3.3) | Konvensi tanda terbalik dari laporan manual |
| (implisit dari koneksi/kredensial) | `finance_group_id` | Tidak ada field grup di response — mapping fixed di konfigurasi backend, karena 1 database iPOS = 1 Finance Group |

---

## 4. Implementasi Backend — Fetch On-Demand

Mengikuti keputusan di PRD bagian 7, modul Analisa Keuangan **tidak memakai cron/job terjadwal**. Fetch ke N8N (`hutang-rinci`/`hutang-subtotal`) terjadi **live, saat itu juga**, setiap kali Admin menekan tombol "Jalankan Analisa" di UI.

### 4.1 Service: Fetch Hutang dari N8N

```javascript
// services/financeDebtService.js
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import * as settingsService from './settingsService.js';

const DEFAULT_N8N_HOST = 'http://192.168.100.12:5678';
const N_DAYS_WINDOW = 90; // ambil hutang 90 hari ke depan + semua overdue

/**
 * Fetch data hutang dari N8N (hutang-rinci).
 * Dipanggil saat Admin klik "Jalankan Analisa".
 */
export const fetchDebtsFromN8N = async (nDays = N_DAYS_WINDOW) => {
  const n8nHost = await settingsService.getSetting('n8n_finance_host', DEFAULT_N8N_HOST);
  const url = `${n8nHost}/webhook/hutang-rinci?n_days=${nDays}`;
  
  const { default: fetch } = await import('node-fetch');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`N8N returned ${response.status}`);
    }
    
    const payload = await response.json();
    
    if (payload.status !== 'success') {
      throw new Error('Gagal fetch hutang dari N8N: ' + JSON.stringify(payload));
    }
    
    return payload;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('N8N timeout — tidak ada respons dalam 30 detik.');
    }
    throw err;
  }
};

/**
 * Transform response N8N ke format yang bisa dipakai kalkulasi.
 * Tidak menyimpan ke DB — langsung return untuk kalkulasi in-memory.
 */
export const transformN8NResponse = (payload) => {
  const debts = [];
  
  for (const supplier of payload.data) {
    for (const inv of supplier.detail_invoices) {
      debts.push({
        id: uuidv4(),
        supplier_name: `${supplier.nama_supplier}`,
        invoice_no: inv.notransaksi,
        invoice_date: inv.tgl_beli,
        due_date: inv.jatuh_tempo,
        amount: inv.hutang_awal,
        paid_amount: inv.hutang_awal - inv.sisa_hutang,
        sisa_hutang: inv.sisa_hutang,
        sisa_hari: inv.sisa_hari,
        aging_category: deriveAgingCategory(inv.sisa_hari),
      });
    }
  }
  
  return debts;
};

export const deriveAgingCategory = (sisaHari) => {
  if (sisaHari > 0) return 'belum_jatuh_tempo';
  const overdueAge = Math.abs(sisaHari);
  if (overdueAge <= 30) return 'overdue_1_30';
  if (overdueAge <= 90) return 'overdue_31_90';
  return 'overdue_kronis';
};
```

### 4.2 Opsi Penyimpanan: In-Memory vs Persisten

Karena tidak ada proses background terjadwal, ada 2 pendekatan:

- **Opsi A (lebih simpel)**: data hutang dari N8N langsung dipakai untuk kalkulasi saat itu juga, hasilnya disimpan utuh sebagai `source_debt_snapshot` (JSON) di `finance_analysis_runs` — **tidak perlu** tabel `supplier_debts` permanen sama sekali.

- **Opsi B (lebih kaya fitur)**: tetap upsert ke `supplier_debts` di setiap run (untuk dukung fitur Payment Priority Queue yang butuh status "Tandai Dibayar" persisten di luar konteks satu run), plus simpan snapshot ringkas di `finance_analysis_runs`.

> **Rekomendasi**: pakai **Opsi B** kalau fitur 9.5 (Payment Priority Queue) memang akan dipakai aktif sehari-hari oleh Admin (perlu status invoice yang persisten antar sesi). Pakai **Opsi A** kalau modul ini murni untuk keperluan analisa/laporan sesaat tanpa interaksi tandai-bayar.

### 4.3 Upsert per Invoice (jika pakai Opsi B)

```javascript
// services/financeDebtService.js
export const upsertSupplierDebts = async (financeGroupId, debts) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const incomingInvoiceNos = [];
    
    for (const debt of debts) {
      incomingInvoiceNos.push(debt.invoice_no);
      
      await connection.execute(`
        INSERT INTO supplier_debts 
          (id, finance_group_id, supplier_name, invoice_no, invoice_date, due_date, 
           amount, paid_amount, status, aging_category, source_payload, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          due_date = VALUES(due_date),
          paid_amount = VALUES(paid_amount),
          status = VALUES(status),
          aging_category = VALUES(aging_category),
          source_payload = VALUES(source_payload),
          received_at = CURRENT_TIMESTAMP
      `, [
        debt.id,
        financeGroupId,
        debt.supplier_name,
        debt.invoice_no,
        debt.invoice_date,
        debt.due_date,
        debt.amount,
        debt.paid_amount,
        debt.paid_amount >= debt.amount ? 'paid' : (debt.paid_amount > 0 ? 'partial' : 'unpaid'),
        debt.aging_category,
        JSON.stringify(debt),
      ]);
    }
    
    // Tandai invoice yang tidak muncul di response sebagai 'paid' (sudah lunas)
    if (incomingInvoiceNos.length > 0) {
      await connection.execute(`
        UPDATE supplier_debts
        SET status = 'paid', paid_amount = amount
        WHERE finance_group_id = ?
          AND status != 'paid'
          AND invoice_no NOT IN (?)
      `, [financeGroupId, incomingInvoiceNos]);
    }
    
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
```

**Penting**: query `markMissingInvoicesAsPaid` hanya valid kalau `n_days` window yang dipakai cukup besar mencakup semua invoice yang sedang aktif di database lokal. Kalau `n_days=30` tapi ada invoice lokal dengan `due_date` 45 hari lagi, invoice itu akan salah ditandai "paid" padahal cuma belum masuk window. **Gunakan `n_days` yang longgar** (90-180 hari) atau, lebih aman, gabungkan dengan workflow overdue (lihat 3.2) supaya window mencakup seluruh siklus hutang aktif.

---

## 5. Controller & Route (mengikuti konvensi project)

### 5.1 Controller

```javascript
// controllers/financeController.js
import * as financeAnalysisService from '../services/financeAnalysisService.js';
import * as financeGroupService from '../services/financeGroupService.js';
import * as auditService from '../services/auditService.js';

export const getGroups = async (req, res) => {
  try {
    const groups = await financeGroupService.getAllGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const runAnalysis = async (req, res) => {
  try {
    const { group_id } = req.params;
    const { run_label, cash_amount } = req.body;
    
    const result = await financeAnalysisService.runAnalysisNow({
      financeGroupId: group_id,
      triggeredBy: req.user.id,
      runLabel: run_label,
      cashAmount: cash_amount,
    });
    
    // Audit log
    await auditService.recordLog({
      userId: req.user.id,
      action: 'FINANCE_ANALYSIS_RUN',
      entity: 'finance_analysis',
      entityId: group_id,
      ipAddress: req.ip,
      details: { run_label, cash_amount, avg_daily_revenue: result.avg_daily_revenue },
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ... other handlers
```

### 5.2 Route

```javascript
// routes/financeRoutes.js
import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import * as financeController from '../controllers/financeController.js';

const router = express.Router();

const adminOnly = [authMiddleware, roleMiddleware('super_admin', 'admin', 'owner')];

// Finance Groups
router.get('/groups', ...adminOnly, financeController.getGroups);
router.post('/groups', authMiddleware, roleMiddleware('super_admin', 'admin'), financeController.createGroup);
router.put('/groups/:id', authMiddleware, roleMiddleware('super_admin', 'admin'), financeController.updateGroup);

// Cash Position
router.post('/cash-position/:group_id', ...adminOnly, financeController.updateCashPosition);

// Analysis Runs
router.post('/analysis-runs/:group_id', ...adminOnly, financeController.runAnalysis);
router.get('/analysis-runs/:group_id', ...adminOnly, financeController.getAnalysisHistory);
router.get('/analysis-runs/:group_id/:run_id', ...adminOnly, financeController.getAnalysisDetail);
router.delete('/analysis-runs/:group_id/:run_id', authMiddleware, roleMiddleware('super_admin', 'admin'), financeController.deleteAnalysisRun);

// Settings
router.put('/settings/:group_id', authMiddleware, roleMiddleware('super_admin', 'admin'), financeController.updateSettings);

// Additional features (PRD bagian 9)
router.get('/supplier-concentration/:group_id', ...adminOnly, financeController.getSupplierConcentration);
router.get('/aging-summary/:group_id', ...adminOnly, financeController.getAgingSummary);
router.post('/simulate-term-change', ...adminOnly, financeController.simulateTermChange);
router.get('/alerts/:group_id', ...adminOnly, financeController.getAlerts);
router.put('/alerts/:id/read', ...adminOnly, financeController.markAlertRead);
router.get('/payment-priority/:group_id', ...adminOnly, financeController.getPaymentPriority);

export default router;
```

### 5.3 Server Registration

```javascript
// server.js — tambahkan:
import financeRoutes from './routes/financeRoutes.js';
app.use('/api/finance', financeRoutes);
```

---

## 6. Testing

1. **Test manual via browser/Postman dulu**: akses `GET {n8n_host}/webhook/hutang-subtotal?n_days=30` dan `hutang-rinci?n_days=30` langsung, pastikan response sesuai contoh di 3.4/3.5.
2. **Test parameter tidak valid**: akses tanpa `n_days` atau dengan nilai negatif, pastikan node "Validate Input" mengembalikan `{ error: true, message: ... }` dengan benar dan backend menangani error ini (bukan crash saat parsing).
3. **Test idempotency**: fetch 2x berturut-turut, pastikan `supplier_debts` di database tidak dobel (cek jumlah baris sebelum/sesudah).
4. **Test invoice lunas**: bandingkan response sebelum dan sesudah satu invoice dibayar lunas di iPOS, pastikan `markMissingInvoicesAsPaid` mengubah status dengan benar.
5. **Test gap overdue** (setelah perbaikan 3.2 diterapkan): pastikan hutang dengan `due_date` di masa lalu benar-benar ikut tertarik, tidak hilang dari sistem.
6. **Test omzet query**: pastikan `avg_daily_revenue` menghitung dari `omzet.total` (bukan `cash` saja), dan filter per finance group benar.

---

## 7. Catatan Keamanan

- Endpoint N8N (`GET /webhook/hutang-*`) sebaiknya **tidak public** — batasi akses jaringan (mis. hanya bisa diakses dari IP backend, lewat firewall/VPN internal), karena saat ini belum terlihat ada auth header di workflow.
- Kalau N8N berada di jaringan yang sama dengan backend (VM 192.168.100.x), pertimbangkan membatasi webhook ini hanya bisa diakses dari subnet internal, bukan expose ke publik.
- `source_payload` (raw JSON dari N8N) disimpan di `supplier_debts.source_payload` untuk audit trail kalau ada selisih angka di kemudian hari.
- Backend menggunakan `authMiddleware` + `roleMiddleware` untuk melindungi semua endpoint finance — hanya `super_admin`, `admin`, dan `owner` yang bisa akses.

---

## 8. Ringkasan Tindak Lanjut

- [ ] **Prioritas tinggi**: perbaiki gap query overdue di kedua workflow N8N (lihat 3.2) sebelum integrasi backend dimulai
- [ ] Tentukan: tambah parameter `include_overdue` di workflow existing, atau buat workflow ke-3 `hutang-overdue`
- [ ] Tambahkan auth/pembatasan akses jaringan ke webhook N8N (lihat 7)
- [ ] Tentukan `n_days` default yang dipakai backend saat fetch (saran: 90 hari, untuk mencakup termin terpanjang 45+15 hari dengan buffer)
- [ ] Implementasi service `financeIncomeService.js` untuk baca tabel `omzet` lokal langsung (bagian 2)
- [ ] Implementasi service `financeDebtService.js` untuk fetch & transform data N8N (bagian 4)
- [ ] Implementasi service `financeAnalysisService.js` untuk kalkulasi formula PRD bagian 3
- [ ] Implementasi service `financeGroupService.js` untuk CRUD finance groups
- [ ] Implementasi controller & routes (bagian 5)
- [ ] Implementasi frontend page `FinanceAnalysis.tsx` + komponen chart/tabel
- [ ] Tambah route di `App.tsx` dan menu di `Layout.tsx`

---
**Last Updated**: 2026-06-21
