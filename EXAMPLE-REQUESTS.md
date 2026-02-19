# API Examples - cURL

Contoh request cURL untuk backend CS Commission (MariaDB).

## Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'

# Get Profile (Auth Required)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

## Omzet (Sales)
```bash
# Simpan Omzet Harian
curl -X POST http://localhost:3000/api/omzet/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000000,
    "date": "2024-01-15",
    "branch_id": "uuid-cabang",
    "user_id": "uuid-cs"
  }'

# Lihat Omzet per Tanggal
curl -X GET "http://localhost:3000/api/omzet/by-date?date=2024-01-15" \
  -H "Authorization: Bearer $TOKEN"
```

## Commissions
```bash
# Hitung Komisi Harian
curl -X POST http://localhost:3000/api/commissions/calculate-by-date \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tanggal": "2024-01-15", "branchId": "uuid-cabang"}'
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
```

## N8N Webhook
```bash
# Push data dari N8N (Tanpa JWT, gunakan Secret Token jika diaktifkan)
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "uuid-cabang",
    "tanggal": "15-01-2024",
    "cash": 5000000,
    "piutang": 0
  }'
```
