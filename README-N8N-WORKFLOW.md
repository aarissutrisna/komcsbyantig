# N8N Workflow Integration - Complete Guide (MariaDB)

Panduan integrasi N8N untuk sinkronisasi data omzet harian ke MariaDB 11.4.

## 🏗️ Alur Data
1. **N8N** menerima data dari sistem POS/ERP atau source lainnya.
2. **N8N** mengirimkan JSON payload ke Webapp API melalui endpoint webhook.
3. **Webapp API** memproses data:
   - Validasi token.
   - Mapping `branchId`.
   - Simpan ke tabel `omzet`.
   - Menggunakan `ON DUPLICATE KEY UPDATE` untuk menangani update data pada tanggal yang sama.

## 📋 Endpoint Webhook
`POST /api/omzet/webhook/n8n`

### Contoh Payload
```json
{
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "YOUR_N8N_WEBHOOK_SECRET_TOKEN",
  "data": [
    {
      "tanggal": "2024-01-15",
      "cash": 5000000,
      "piutang": 0,
      "description": "Sales UTM"
    }
  ]
}
```

## 🔐 Security
- Otentikasi dilakukan via field `token` di dalam JSON body.
- Field `token` harus sama dengan `N8N_WEBHOOK_SECRET` di file `.env` backend.

## 💾 Skema Database (MariaDB)
Tabel `omzet` digunakan untuk menyimpan data dari N8N:
- `id`: CHAR(36) UUID
- `branch_id`: CHAR(36)
- `amount`: DECIMAL
- `date`: DATE
- `description`: TEXT
