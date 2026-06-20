# Ringkasan Hak Akses (Access Control)

Sistem Komisi CS PJB menggunakan **Role-Based Access Control (RBAC)** untuk memastikan keamanan data dan pembagian tugas yang tepat. Terdapat lima tingkatan role: **Super Admin**, **Admin**, **HRD**, **CS**, dan **Owner**.

---

## 🔑 Level Hak Akses

### 1. Super Admin / Admin
Role dengan tingkat akses tertinggi, bertanggung jawab atas konfigurasi sistem dan manajemen entitas.
- **Menu Navigasi**: Akses ke seluruh menu (Dashboard, Data & Kehadiran, Mutasi, Penugasan, Transfer Bonus, Cabang, Pengguna, Analisa Target, Admin Settings).
- **Manajemen Cabang**: Full CRUD (Tambah, Edit, Hapus) cabang dan pengaturan Webhook n8n.
- **Manajemen Pengguna**: Full CRUD (Tambah, Edit, Hapus) akun pengguna, pengaturan role, dan penempatan cabang.
- **Otomasi**: Melakukan sinkronisasi data omzet dari n8n untuk **semua cabang**.
- **Admin Settings**: Konfigurasi webhook URL, bonus calculation settings, scheduler, force re-import, rekalkulasi total.
- **Data**: Melihat dan memfilter data omzet dari seluruh cabang.

### 2. HRD (Human Resources)
Role yang berfokus pada pengawasan performa dan data keuangan tanpa akses manajemen infrastruktur.
- **Menu Navigasi**: Dashboard, Data & Kehadiran, Mutasi, Penugasan, Transfer Bonus, Pengaturan.
- **Menu Tersembunyi**: Cabang, Pengguna, Analisa Target, Admin Settings (Tidak memiliki akses).
- **Penugasan**: Dapat mengelola penugasan CS ke cabang.
- **Otomasi**: Melakukan sinkronisasi data omzet dari n8n untuk **semua cabang**.
- **Data**: Melihat dan memfilter data omzet dari seluruh cabang untuk keperluan audit/laporan.

### 3. CS (Customer Service)
Role operasional dengan akses terbatas hanya pada data internal mereka masing-masing.
- **Menu Navigasi**: Dashboard, Data & Kehadiran, Mutasi, Transfer Bonus, Pengaturan.
- **Menu Tersembunyi**: Cabang, Pengguna, Penugasan, Analisa Target, Admin Settings (Tidak memiliki akses).
- **Otomasi**: **Dilarang** melakukan sinkronisasi data n8n.
- **Data**: 
    - Hanya dapat melihat data omzet pada cabang tempat mereka ditugaskan.
    - Fitur filter cabang dikunci (ReadOnly).
    - Hanya dapat melihat mutasi dan saldo milik akun sendiri.
    - Dapat mengakses Transfer Bonus (read-only).

### 4. Owner
Role pemilik bisnis dengan akses serupa Admin namun dengan perspektif berbeda.

---

## 🛠️ Implementasi Teknis

| Komponen | Metode Keamanan |
|----------|-----------------|
| **Backend API** | Middleware `authMiddleware` (JWT) & `roleMiddleware`. |
| **Frontend Menu** | Filtering array `navigation` berdasarkan properti `roles` di `Layout.tsx`. |
| **Halaman (Page)** | Kondisional rendering (e.g., `user.role === 'cs'`) untuk tombol aksi dan input filter. |
| **Protected Routes** | Component `ProtectedRoute` memverifikasi token dan role sebelum render. |

---

## 📊 Matrix Akses Menu

| Menu | Super Admin | Admin | HRD | CS | Owner |
|------|:-----------:|:-----:|:---:|:--:|:-----:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data & Kehadiran | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mutasi Komisi | ✅ | ✅ | ✅ | ✅ | ✅ |
| Penugasan | ✅ | ✅ | ✅ | ❌ | ✅ |
| Transfer Item Bonus | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cabang | ✅ | ✅ | ❌ | ❌ | ✅ |
| Pengguna | ✅ | ✅ | ❌ | ❌ | ✅ |
| Analisa Target | ✅ | ✅ | ❌ | ❌ | ✅ |
| Pengaturan Profil | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Settings | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 📊 Matrix Akses API Endpoints

| Endpoint | Super Admin | Admin | HRD | CS |
|----------|:-----------:|:-----:|:---:|:--:|
| `/api/settings/bonus-transfer` (GET) | ✅ | ✅ | ✅ | ✅ |
| `/api/settings/bonus-transfer` (POST) | ✅ | ✅ | ❌ | ❌ |
| `/api/transfer-bonus` (GET) | ✅ | ✅ | ✅ | ✅ |
| `/api/commissions/recalculate-all` | ✅ | ✅ | ❌ | ❌ |
| `/api/omzet/import-*` | ✅ | ✅ | ❌ | ❌ |
| `/api/branches` (POST/PUT/DELETE) | ✅ | ✅ | ❌ | ❌ |
| `/api/auth/users` (POST/PUT/DELETE) | ✅ | ✅ | ❌ | ❌ |
| `/api/penugasan` (POST/PUT) | ✅ | ✅ | ✅ | ❌ |

---

## 🏗️ Struktur Database & Keamanan Data (Level Storage)

Sistem menerapkan integritas data yang ketat melalui constraint database:

### Tabel Inti
- **`branches`**: Master data cabang, target omzet, dan endpoint n8n.
- **`users`**: Data user, role, penempatan `branch_id`, dan `faktor_pengali`.
- **`omzet`**: Data omzet harian per cabang. **Unique Constraint**: `(branch_id, date)`.
- **`attendance_data`**: Kehadiran CS harian. **Unique Constraint**: `(user_id, branch_id, tanggal)`.
- **`commissions`**: Hasil perhitungan komisi. **Unique Constraint**: `(user_id, period_start)`.
- **`user_cabang_history`**: Riwayat penugasan CS ke cabang.
- **`cabang_user_allocation`**: Alokasi porsi komisi CS per cabang.
- **`withdrawal_requests`**: Pengajuan dana dari CS.
- **`system_settings`**: Konfigurasi sistem global (webhook URL, bonus settings, dll).
- **`audit_logs`**: Mencatat aktivitas kritikal (Sync, Edit Attendance, WD Approval).

### Integritas Data
1.  **Unique Constraints**: Mencegah duplikasi perhitungan omzet atau komisi pada tanggal yang sama.
2.  **Foreign Keys**: Menjamin hubungan relasional antara user, cabang, dan data transaksi tetap konsisten (CASCADE/SET NULL).
3.  **Transactions (ACID)**: Semua operasi mutasi saldo dan penarikan dilakukan dalam satu unit transaksi untuk mencegah inconsistensi data (race conditions).
4.  **CHECK Constraints**: Validasi data di level database (contoh: `porsi_percent` harus antara 0-100).

---

> [!TIP]
> Perubahan hak akses atau penugasan cabang pengguna hanya dapat dilakukan oleh role **Admin** melalui menu **Manajemen Pengguna**.

---
**Last Updated**: 2026-06-20
