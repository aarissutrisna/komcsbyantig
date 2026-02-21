# API Reference (Production Limits)

Hanya Endpoint yang aktif digunakan oleh UI Frontend Vite dan Eksternal Integrasi N8N yang didokumentasikan. Seluruh `/simulate` dan legacy dummy data telah dihancurkan dari kode production.

## 📌 Auth & Users
### POST `/api/auth/login`
- **Body**: `{ "username": "admin", "password": "xxx" }`
- **Response**: `{ "token": "jwt...", "user": {...} }`
- **Error**: `401 Unauthorized`

### GET `/api/auth/users`
- **Desc**: Mengambil data pengguna berdasarkan cabang (HRD & Admin limit).

## 📌 Omzet & Webhook
### POST `/api/omzet/webhook/n8n`
- **Desc**: Pintu masuk data transaksi N8N (Tidak memvalidasi token JWT pengguna webapp, tapi Header Secret spesifik).
- **Header Security**: `Authorization: Bearer <N8N_WEBHOOK_SECRET>`
- **Body**: `{ "branchId": "JTW", "tanggal": "YYYY-MM-DD", "cash": 100, "piutang": 50 }`
- **Response**: `200 OK { success: true, count: 1 }`
- **Error**: `401 Unauthorized: Invalid or missing webhook token in Header`

### POST `/api/omzet/import-attendance`
- **Header**: JWT Admin
- **Body**: `{ "csvData": "TANGGAL;USERNAME;CABANG;KEHADIRAN\n..." }`
- **Response**: `200 OK` (Trigger Recalculate Atomik).

## 📌 Penugasan CS (CS Allocation Guard)
### POST `/api/penugasan`
- **Header**: JWT HRD / Admin
- **Body**: `{ "userId": "uuid", "cabangId": "JTW", "tanggalMulai": "YYYY-MM-DD", "faktorKomisi": 0.5 }`
- **Response**: `201 Created`
- **Error**:
  - `400 Bad Request`: "Total porsi komisi cabang melebihi 100%" (Hasil Row Lock Database)
  - `400 Bad Request`: "Nilai faktor komisi ditolak sistem" (Hasil Check Constraint DB)
  - `400 Bad Request`: "User sudah memiliki penugasan di cabang tersebut pada tanggal ini" (Hasil Unique DB)

## 📌 Commissions (Read/Rekalkulasi)
### POST `/api/commissions/recalculate-all`
- **Header**: JWT Admin
- **Desc**: Menghapus seluruh tabel `commissions` dan mambangun ulangnya. *Heavy transaction process*. Timeout wajar jika data besar.
- **Response**: `{ success: true, processed: count }`
