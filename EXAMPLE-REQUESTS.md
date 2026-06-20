# API Examples - cURL

Contoh request cURL untuk backend CS Commission (MariaDB).

## Authentication

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'

# Response:
# { "token": "jwt_token_here", "user": {...} }

# Get Profile (Auth Required)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

## Branches

```bash
# List all branches
curl -X GET http://localhost:3000/api/branches \
  -H "Authorization: Bearer $TOKEN"

# Create branch
curl -X POST http://localhost:3000/api/branches \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "UTM",
    "name": "Puncak Jaya Baja UTM",
    "city": "Surabaya",
    "target_min": 5000000,
    "target_max": 10000000,
    "comm_perc_min": 0.20,
    "comm_perc_max": 0.40
  }'
```

## Omzet (Sales)

```bash
# Simpan Omzet Harian (via N8N Webhook)
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $N8N_WEBHOOK_SECRET" \
  -d '{
    "branchId": "UTM",
    "tanggal": "2026-06-20",
    "cash": 5000000,
    "piutang": 1000000
  }'

# Lihat Omzet per Tanggal
curl -X GET "http://localhost:3000/api/omzet/by-date?date=2026-06-20&branchId=UTM" \
  -H "Authorization: Bearer $TOKEN"

# Import Historical Data
curl -X POST http://localhost:3000/api/omzet/import-historical \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "UTM",
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "isOverride": false
  }'

# Import Attendance CSV
curl -X POST http://localhost:3000/api/omzet/import-attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "csvData": "TANGGAL;USERNAME;CABANG;KEHADIRAN\n20/06/2026;cs_utm;UTM;1\n20/06/2026;cs_jtj;JTJ;0.5"
  }'
```

## Commissions

```bash
# Hitung Komisi Harian
curl -X POST http://localhost:3000/api/commissions/calculate-by-date \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tanggal": "2026-06-20", "branchId": "UTM"}'

# Hitung Komisi per Cabang & Periode
curl -X POST http://localhost:3000/api/commissions/calculate-by-branch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "UTM",
    "periodStart": "2026-06-01",
    "periodEnd": "2026-06-30"
  }'

# Rekalkulasi Semua Komisi
curl -X POST http://localhost:3000/api/commissions/recalculate-all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Lihat Komisi Saya
curl -X GET http://localhost:3000/api/commissions/by-user \
  -H "Authorization: Bearer $TOKEN"
```

## Withdrawals

```bash
# Request Tarik Komisi
curl -X POST http://localhost:3000/api/withdrawals/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nominal": 1000000}'

# Approve Tarik Komisi (Admin)
curl -X POST http://localhost:3000/api/withdrawals/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"withdrawalId": "uuid-withdrawal", "approved": true}'

# Cek Saldo
curl -X GET http://localhost:3000/api/withdrawals/balance \
  -H "Authorization: Bearer $TOKEN"
```

## Penugasan (CS Allocation)

```bash
# List Penugasan
curl -X GET http://localhost:3000/api/penugasan \
  -H "Authorization: Bearer $TOKEN"

# Buat Penugasan Baru
curl -X POST http://localhost:3000/api/penugasan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-user",
    "cabangId": "UTM",
    "startDate": "2026-06-01",
    "endDate": null
  }'

# Lihat Riwayat Mutasi
curl -X GET http://localhost:3000/api/penugasan/history \
  -H "Authorization: Bearer $TOKEN"

# Lihat Alokasi per Cabang
curl -X GET "http://localhost:3000/api/penugasan/allocations/UTM?tanggal=2026-06-20" \
  -H "Authorization: Bearer $TOKEN"

# Update Porsi Alokasi
curl -X PUT http://localhost:3000/api/penugasan/allocations/uuid-allocation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"porsiPercent": 50}'
```

## Transfer Bonus

```bash
# Ambil Data Transfer Bonus
curl -X GET "http://localhost:3000/api/transfer-bonus?startDate=2026-06-01&endDate=2026-06-30&direction=All" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "transfers": [
#     {
#       "notransaksi": "0001/TRF/UTM/0626",
#       "tanggal": "2026-06-01 09:31:09",
#       "kantordari": "UTM",
#       "kantortujuan": "JTJ",
#       "keterangan": "transfer bonus",
#       "total_nilai": 5730000
#     }
#   ],
#   "grand_total": 1055553500
# }
```

## Settings

```bash
# Get Bonus Calculation Settings
curl -X GET http://localhost:3000/api/settings/bonus-transfer \
  -H "Authorization: Bearer $TOKEN"

# Response:
# { "pembagi": 10000000, "pengali": 5000 }

# Update Bonus Calculation Settings (Admin only)
curl -X POST http://localhost:3000/api/settings/bonus-transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pembagi": 10000000,
    "pengali": 5000
  }'

# Get Webhook Transfer Bonus URL
curl -X GET http://localhost:3000/api/settings/webhook-transfer-bonus \
  -H "Authorization: Bearer $TOKEN"

# Update Webhook URL (Admin only)
curl -X POST http://localhost:3000/api/settings/webhook-transfer-bonus \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://192.168.100.12:5678/webhook/transfer-bonus-v2"}'

# Get Scheduler Config
curl -X GET http://localhost:3000/api/settings/scheduler \
  -H "Authorization: Bearer $TOKEN"

# Update Scheduler (Admin only)
curl -X POST http://localhost:3000/api/settings/scheduler \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "time": "23:30"}'
```

## Users

```bash
# List Users
curl -X GET http://localhost:3000/api/auth/users \
  -H "Authorization: Bearer $TOKEN"

# Create User
curl -X POST http://localhost:3000/api/auth/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cs_utm",
    "email": "cs_utm@example.com",
    "password": "password123",
    "nama": "CS UTM",
    "role": "cs",
    "branch_id": "UTM",
    "faktor_pengali": 1.0
  }'

# Update User
curl -X PUT http://localhost:3000/api/auth/users/uuid-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nama": "Updated Name"}'

# Delete User
curl -X DELETE http://localhost:3000/api/auth/users/uuid-user \
  -H "Authorization: Bearer $TOKEN"
```

---
**Last Updated**: 2026-06-20
