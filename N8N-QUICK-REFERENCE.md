# N8N Integration - Quick Reference

Cheat sheet untuk N8N workflow integration dengan CS Commission System (MariaDB).

## 🚀 Quick Start
- **Endpoint**: `POST https://your-domain.com/api/omzet/webhook/n8n`
- **Auth**: `token` field in JSON payload (N8N_WEBHOOK_SECRET)

## 📊 Payload
```json
{
  "branchId": "uuid-cabang",
  "token": "secret-token",
  "data": [
    {
      "tanggal": "2024-01-15",
      "cash": 5000000,
      "piutang": 0
    }
  ]
}
```

## 💾 MariaDB Table: omzet
- **Columns**: `id`, `branch_id`, `user_id`, `amount`, `date`, `description`
- **Conflict**: `ON DUPLICATE KEY UPDATE`

## 🔐 Security
Pastikan `N8N_WEBHOOK_SECRET` di `.env` backend sama dengan token yang dikirim dari N8N.
