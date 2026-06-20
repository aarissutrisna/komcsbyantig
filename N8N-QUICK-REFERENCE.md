# N8N Integration - Quick Reference

Cheat sheet untuk N8N workflow integration dengan CS Commission System (MariaDB).

## 🚀 Quick Start

### Omzet Webhook (Push dari N8N)
- **Endpoint**: `POST https://your-domain.com/api/omzet/webhook/n8n`
- **Auth**: `Authorization: Bearer <N8N_WEBHOOK_SECRET>`
- **Content-Type**: `application/json`

### Transfer Bonus Webhook (Pull dari Backend)
- **Endpoint**: `GET http://192.168.100.12:5678/webhook/transfer-bonus-v2`
- **Parameters**: `startDate`, `endDate`, `direction`
- **Note**: Saat ini bersifat asynchronous

## 📊 Payload Format - Omzet

### Single Record
```json
{
  "branchId": "UTM",
  "tanggal": "2026-06-20",
  "cash": 5000000,
  "piutang": 1000000
}
```

### Bulk Records
```json
{
  "data": [
    {
      "branchId": "UTM",
      "tanggal": "2026-06-20",
      "cash": 5000000,
      "piutang": 1000000
    },
    {
      "branchId": "JTJ",
      "tanggal": "2026-06-20",
      "cash": 3000000,
      "piutang": 500000
    }
  ]
}
```

## 💾 MariaDB Tables

### omzet
- **Columns**: `id`, `branch_id`, `date`, `cash`, `piutang`, `created_at`, `updated_at`
- **Unique Constraint**: `(branch_id, date)`
- **Conflict**: `ON DUPLICATE KEY UPDATE`

### branches
- **Columns**: `id`, `name`, `city`, `target_min`, `target_max`, `comm_perc_min`, `comm_perc_max`, `n8n_endpoint`, `n8n_secret`

### commissions
- **Columns**: `id`, `user_id`, `branch_id`, `omzet_total`, `commission_amount`, `komisi_percent`, `porsi_percent`, `kehadiran`, `period_start`, `period_end`
- **Auto-calculated**: Setelah omzet di-insert

## 🔐 Security

### Webhook Secret
Pastikan `N8N_WEBHOOK_SECRET` di `.env` backend sama dengan token yang dikirim dari N8N.

```env
# Backend .env
N8N_WEBHOOK_SECRET=your_secret_token_here
```

### Header Format
```
Authorization: Bearer your_secret_token_here
```

## 🔄 Response Format

### Success
```json
{
  "success": true,
  "count": 1,
  "message": "Omzet recorded successfully"
}
```

### Error
```json
{
  "error": "Invalid or missing webhook token"
}
```

## ⏰ Cron Schedule

Disarankan:
- **Schedule**: Setiap hari jam 23:55
- **Retry**: On Error: Retry On Fail (3 Tries, 5 minute wait)

### N8N Schedule Trigger Configuration
```json
{
  "triggerAtHour": 23,
  "triggerAtMinute": 55
}
```

## 🧪 Testing

### Test dengan cURL
```bash
curl -X POST https://your-domain.com/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{
    "branchId": "UTM",
    "tanggal": "2026-06-20",
    "cash": 5000000,
    "piutang": 1000000
  }'
```

### Test di N8N UI
1. Buat HTTP Request node
2. Method: POST
3. URL: `https://your-domain.com/api/omzet/webhook/n8n`
4. Headers: `Authorization: Bearer YOUR_SECRET`
5. Body: JSON payload
6. Execute node

## 📝 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check N8N_WEBHOOK_SECRET di .env |
| 400 Bad Request | Check payload format (required fields) |
| 500 Internal Error | Check database connection |
| Duplicate entry | Normal - data akan di-update |

## 🔗 Related Docs

- [docs/N8N-GUIDE.md](docs/N8N-GUIDE.md) - Complete N8N integration guide
- [docs/webhook-transfer-bonus.md](docs/webhook-transfer-bonus.md) - Transfer bonus webhook
- [EXAMPLE-REQUESTS.md](EXAMPLE-REQUESTS.md) - More API examples

---
**Last Updated**: 2026-06-20
