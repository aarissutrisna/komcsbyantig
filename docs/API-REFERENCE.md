# API Reference (Production)

Dokumentasi lengkap endpoint API yang aktif digunakan oleh UI Frontend dan integrasi N8N.

**Base URL**: `http://localhost:3000/api` (dev) / `https://your-domain.com/api` (prod)

---

## 📌 Auth & Users

### POST `/api/auth/login`
- **Body**: `{ "email": "user@example.com", "password": "xxx" }`
- **Response**: `{ "token": "jwt...", "user": { id, email, nama, role, branch_id } }`
- **Error**: `401 Unauthorized`

### GET `/api/auth/profile`
- **Auth**: JWT required
- **Desc**: Mendapatkan data user yang sedang login.

### POST `/api/auth/change-password`
- **Auth**: JWT required
- **Body**: `{ "oldPassword": "xxx", "newPassword": "yyy" }`

### GET `/api/auth/users`
- **Auth**: JWT (Admin/HRD)
- **Desc**: Mengambil daftar pengguna berdasarkan scope cabang.

### POST `/api/auth/users`
- **Auth**: JWT (Admin)
- **Body**: `{ "username", "email", "password", "nama", "role", "branch_id", "faktor_pengali" }`

### PUT `/api/auth/users/:id`
- **Auth**: JWT (Admin)
- **Desc**: Update data user.

### DELETE `/api/auth/users/:id`
- **Auth**: JWT (Admin)
- **Desc**: Hapus user.

---

## 📌 Branches (Cabang)

### GET `/api/branches`
- **Auth**: JWT required
- **Desc**: Daftar semua cabang.

### POST `/api/branches`
- **Auth**: JWT (Admin)
- **Body**: `{ "id", "name", "city", "target_min", "target_max", "comm_perc_min", "comm_perc_max", "n8n_endpoint", "n8n_secret" }`

### PUT `/api/branches/:id`
- **Auth**: JWT (Admin)
- **Desc**: Update data cabang.

### DELETE `/api/branches/:id`
- **Auth**: JWT (Admin)

---

## 📌 Omzet (Sales)

### POST `/api/omzet/webhook/n8n`
- **Auth**: Header `Authorization: Bearer <N8N_WEBHOOK_SECRET>` (bukan JWT)
- **Body**: `{ "branchId": "JTW", "tanggal": "YYYY-MM-DD", "cash": 100, "piutang": 50 }`
- **Response**: `200 OK { success: true, count: 1 }`
- **Error**: `401 Unauthorized: Invalid or missing webhook token`

### POST `/api/omzet/import-historical`
- **Auth**: JWT (Admin)
- **Body**: `{ "branchId", "startDate", "endDate", "isOverride" }`
- **Desc**: Import data omzet historis dari N8N endpoint cabang.

### POST `/api/omzet/import-attendance`
- **Auth**: JWT (Admin)
- **Body**: `{ "csvData": "TANGGAL;USERNAME;CABANG;KEHADIRAN\n..." }`
- **Response**: `200 OK` (Trigger Recalculate Atomik).

### GET `/api/omzet/by-date`
- **Auth**: JWT required
- **Query**: `?date=YYYY-MM-DD&branchId=xxx`

### GET `/api/omzet/stats`
- **Auth**: JWT required
- **Desc**: Statistik omzet bulanan/mingguan.

---

## 📌 Commissions

### POST `/api/commissions/calculate-by-date`
- **Auth**: JWT (Admin)
- **Body**: `{ "branchId", "tanggal" }`

### POST `/api/commissions/calculate-by-branch`
- **Auth**: JWT (Admin)
- **Body**: `{ "branchId", "periodStart", "periodEnd" }`

### POST `/api/commissions/recalculate-all`
- **Auth**: JWT (Admin)
- **Desc**: Hapus seluruh tabel `commissions` dan bangun ulang. *Heavy transaction*.
- **Response**: `{ "dates_checked", "commissions_calculated", "skipped", "errors" }`

### GET `/api/commissions/by-user`
- **Auth**: JWT required
- **Desc**: Lihat komisi milik sendiri (CS) atau semua (Admin/HRD).

---

## 📌 Withdrawals

### POST `/api/withdrawals/create`
- **Auth**: JWT (CS)
- **Body**: `{ "nominal": 1000000 }`

### POST `/api/withdrawals/approve`
- **Auth**: JWT (Admin)
- **Body**: `{ "withdrawalId", "approved": true/false }`

### GET `/api/withdrawals/balance`
- **Auth**: JWT required
- **Desc**: Cek saldo komisi saat ini.

---

## 📌 Penugasan CS (CS Allocation)

### GET `/api/penugasan`
- **Auth**: JWT required
- **Desc**: Daftar penugasan CS.

### POST `/api/penugasan`
- **Auth**: JWT (Admin/HRD)
- **Body**: `{ "userId", "cabangId", "startDate", "endDate" }`
- **Error**:
  - `400`: "Total porsi komisi cabang melebihi 100%"
  - `400`: "Tanggal mutasi bertabrakan dengan histori yang sudah ada"

### GET `/api/penugasan/history`
- **Auth**: JWT required
- **Desc**: Riwayat mutasi cabang user.

### GET `/api/penugasan/allocations/:branchId`
- **Auth**: JWT (Admin/HRD)
- **Query**: `?tanggal=YYYY-MM-DD`
- **Desc**: Lihat alokasi porsi CS di cabang tertentu.

### PUT `/api/penugasan/allocations/:id`
- **Auth**: JWT (Admin/HRD)
- **Body**: `{ "porsiPercent": 50 }`
- **Desc**: Update porsi alokasi CS.

---

## 📌 Transfer Bonus

### GET `/api/transfer-bonus`
- **Auth**: JWT required (semua role)
- **Query**: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&direction=All|UTMtoJTJ|JTJtoUTM`
- **Desc**: Proxy ke webhook N8N untuk mengambil data transfer item bonus dari database iPOS.
- **Response**:
```json
{
  "transfers": [
    {
      "notransaksi": "0001/TRF/UTM/0526",
      "tanggal": "2026-05-01 09:31:09",
      "kantordari": "UTM",
      "kantortujuan": "JTJ",
      "keterangan": "diambil acil",
      "total_nilai": 5730000
    }
  ],
  "grand_total": 1055553500
}
```

---

## 📌 Settings

### GET `/api/settings/import-status`
- **Auth**: JWT (Admin)
- **Desc**: Status import data awal.

### GET `/api/settings/scheduler`
- **Auth**: JWT (Admin)
- **Desc**: Konfigurasi scheduler auto-fetch.

### POST `/api/settings/scheduler`
- **Auth**: JWT (Admin)
- **Body**: `{ "enabled": true, "time": "23:30" }`

### GET `/api/settings/webhook-transfer-bonus`
- **Auth**: JWT required (semua role)
- **Desc**: URL webhook N8N untuk transfer bonus.

### POST `/api/settings/webhook-transfer-bonus`
- **Auth**: JWT (Admin)
- **Body**: `{ "url": "http://..." }`

### GET `/api/settings/bonus-transfer`
- **Auth**: JWT required (semua role)
- **Desc**: Pengaturan perhitungan bonus transfer (nilai pembagi & pengali).
- **Response**: `{ "pembagi": 10000000, "pengali": 5000 }`

### POST `/api/settings/bonus-transfer`
- **Auth**: JWT (Admin)
- **Body**: `{ "pembagi": 10000000, "pengali": 5000 }`
- **Desc**: Update pengaturan perhitungan bonus. Rumus: `(Total / Pembagi) × Pengali`

---

## 📌 Targets

### GET `/api/targets`
- **Auth**: JWT required
- **Desc**: Data target omzet per cabang.

---

## 📌 Mutasi (Branch History)

### GET `/api/mutasi/history`
- **Auth**: JWT required
- **Desc**: Riwayat mutasi cabang semua user.

### GET `/api/mutasi/history/:userId`
- **Auth**: JWT required
- **Desc**: Riwayat mutasi cabang user tertentu.

### POST `/api/mutasi`
- **Auth**: JWT (Admin/HRD)
- **Body**: `{ "userId", "cabangId", "startDate", "endDate" }`

### GET `/api/mutasi/affected-dates`
- **Auth**: JWT (Admin/HRD)
- **Query**: `?cabangId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

---

## 📌 Omzet Analysis

### GET `/api/omzet-analysis`
- **Auth**: JWT required
- **Desc**: Analisis omzet dengan filter.

---

## 📌 Stable Routes

### GET `/api/stable/health`
- **Desc**: Health check endpoint.

---

## 🔐 Authentication

Semua endpoint (kecuali `/auth/login` dan `/omzet/webhook/n8n`) memerlukan header:
```
Authorization: Bearer <JWT_TOKEN>
```

Token JWT memiliki expiry 7 hari.

---

## 📝 Catatan

- Endpoint `/omzet/webhook/n8n` menggunakan secret token di header, bukan JWT.
- Endpoint `/settings/bonus-transfer` dapat dibaca semua user, namun hanya Admin yang bisa mengubah.
- Endpoint `/transfer-bonus` dapat diakses semua role yang terautentikasi.
- Semua operasi finansial menggunakan ACID transaction untuk mencegah race condition.

---
**Last Updated**: 2026-06-20
