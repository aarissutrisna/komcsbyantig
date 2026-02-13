# N8N Integration Guide

Panduan lengkap untuk mengintegrasikan N8N dengan sistem KomCS untuk otomasi sync data omzet dari sistem POS/keuangan.

## Arsitektur

```
N8N (External System)
  ↓
  └→ Webhook: /functions/v1/n8n-webhook
       ↓
       ├→ Save omzet to database
       └→ Trigger /functions/v1/calculate-commissions
            ↓
            └→ Calculate & save commissions
```

## Setup N8N Workflow

### 1. Create N8N Webhook

Di N8N:

1. **Add Webhook Node**
   - Method: `POST`
   - URL: `https://your-supabase-project.functions.supabase.co/functions/v1/n8n-webhook`
   - Authentication: (opsional) set token if needed

2. **Add Data Transform Node** (if needed)
   - Format data sesuai dengan schema

3. **Test Webhook**
   - Send test data

### 2. Configure in KomCS

Di aplikasi KomCS:

1. **Settings → Branches**
2. **Edit Branch** yang ingin integrate dengan N8N
3. **Isi field "Endpoint N8N"**
   - Contoh: `https://n8n.yourdomain.com/webhook/omzet-sync`
   - Atau webhook URL dari N8N

## API Endpoints

### 1. Webhook: Receive Data from N8N

**Endpoint**: `POST /functions/v1/n8n-webhook`

**Request Body (Format Option 1: Array of Records)**:
```json
{
  "branchId": "uuid-of-branch",
  "data": [
    {
      "tanggal": "01-01-2026",
      "cash": 35000000,
      "piutang": 20000000
    },
    {
      "tanggal": "02-01-2026",
      "cash": 60000000,
      "piutang": 10000000
    }
  ],
  "token": "optional-webhook-secret"
}
```

**Request Body (Format Option 2: Single Record)**:
```json
{
  "branchId": "uuid-of-branch",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000,
  "token": "optional-webhook-secret"
}
```

**Date Format Support**:
- `dd-mm-yyyy` (01-01-2026)
- `dd/mm/yyyy` (01/01/2026)
- `yyyy-mm-dd` (2026-01-01)

**Response**:
```json
{
  "success": true,
  "message": "Received and processed 2 omzet records",
  "recordsProcessed": 2,
  "omzetData": [
    {
      "branch_id": "...",
      "tanggal": "2026-01-01",
      "cash": 35000000,
      "piutang": 20000000,
      "total": 55000000
    },
    {
      "branch_id": "...",
      "tanggal": "2026-01-02",
      "cash": 60000000,
      "piutang": 10000000,
      "total": 70000000
    }
  ],
  "commissionResults": [
    {
      "tanggal": "2026-01-01",
      "result": {
        "success": true,
        "commissions": [...]
      }
    },
    {
      "tanggal": "2026-01-02",
      "result": {
        "success": true,
        "commissions": [...]
      }
    }
  ]
}
```

### 2. Calculate Commissions

**Endpoint**: `POST /functions/v1/calculate-commissions`

**Request Body**:
```json
{
  "branchId": "uuid-of-branch",
  "tanggal": "2024-01-15"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Calculated commissions for 2 CS users",
  "omzet": 7000000,
  "komisiPersen": 0.4,
  "commissions": [
    {
      "user_id": "...",
      "branch_id": "...",
      "tanggal": "2024-01-15",
      "omzet": 7000000,
      "attendance_status": "hadir",
      "faktor_pengali": 0.75,
      "komisi_persen": 0.4,
      "komisi_nominal": 28000,
      "total_komisi": 21000
    },
    ...
  ]
}
```

### 3. Sync Omzet from N8N

**Endpoint**: `POST /functions/v1/sync-omzet-n8n`

Manual trigger untuk sync historical data.

**Request Body**:
```json
{
  "branchId": "uuid-of-branch",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Synced 31 records from N8N",
  "recordsInserted": 31
}
```

### 4. Manage Withdrawals

**Endpoint**: `POST /functions/v1/manage-withdrawals?action=create`

Create withdrawal request.

**Request Body**:
```json
{
  "userId": "uuid-of-user",
  "nominal": 500000
}
```

**Response**:
```json
{
  "success": true,
  "message": "Withdrawal request created",
  "availableBalance": 5000000
}
```

---

**Endpoint**: `PUT /functions/v1/manage-withdrawals?action=approve`

Approve/Reject withdrawal request.

**Request Body**:
```json
{
  "withdrawalId": "uuid-of-request",
  "approved": true,
  "catatan": "Sudah ditransfer"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Withdrawal request approved",
  "status": "approved"
}
```

## Commission Calculation Logic

### Formula

```
1. Tentukan Komisi Persen (berdasarkan omzet total per cabang):
   - Jika Total >= Target Max → 0.4%
   - Jika Total >= Target Min → 0.2%
   - Jika Total < Target Min → 0%

2. Hitung Komisi Nominal:
   Komisi Nominal = Total Omzet × Komisi Persen / 100

3. Hitung Total Komisi per CS:
   Total Komisi = Komisi Nominal × Faktor Pengali × Status Kehadiran

   Status Kehadiran:
   - "hadir" → 1.0
   - "setengah" / "izin" → 0.5
   - "alpha" / "sakit" → 0

   Faktor Pengali (sesuai setting user):
   - CS utama: 0.75
   - CS kedua: 0.50
   - CS ketiga: 0.25
```

### Contoh Calculation

**Scenario**:
- Branch: Cabang Jakarta
- Target Min: Rp 50 juta (0.2%)
- Target Max: Rp 100 juta (0.4%)
- Total Omzet: Rp 80 juta (≥ Target Min, < Target Max)
- 2 CS hadir dengan faktor 0.75 dan 0.50

**Calculation**:
```
1. Komisi Persen = 0.2% (80 juta ≥ 50 juta tapi < 100 juta)

2. Komisi Nominal = 80,000,000 × 0.2% = Rp 160,000

3. CS 1 (faktor 0.75, hadir):
   Total = 160,000 × 0.75 × 1.0 = Rp 120,000

4. CS 2 (faktor 0.50, hadir):
   Total = 160,000 × 0.50 × 1.0 = Rp 80,000
```

## N8N Workflow Example

### Simple Workflow: Daily Omzet Sync

```
Trigger: Cron (daily at 11:00 PM)
  ↓
[1] HTTP Request to POS System
    - Get daily sales data
  ↓
[2] Transform Data
    - Map field names to KomCS schema
  ↓
[3] For Each Branch
    - Make POST request to KomCS webhook
    - Pass: branchId, tanggal, cash, piutang
  ↓
[4] Handle Response
    - Log success/error
```

**N8N HTTP Node Config (Array Format - Recommended)**:

```
Method: POST
URL: https://your-supabase-project.functions.supabase.co/functions/v1/n8n-webhook

Headers:
  Content-Type: application/json

Body (when returning array from POS):
{
  "branchId": "YOUR_BRANCH_ID",
  "data": "{{ $json }}",
  "token": "your-webhook-secret"
}
```

**N8N HTTP Node Config (Single Record Format)**:

```
Method: POST
URL: https://your-supabase-project.functions.supabase.co/functions/v1/n8n-webhook

Headers:
  Content-Type: application/json

Body (when returning single record):
{
  "branchId": "YOUR_BRANCH_ID",
  "tanggal": "{{ $json.tanggal }}",
  "cash": {{ $json.cash }},
  "piutang": {{ $json.piutang }},
  "token": "your-webhook-secret"
}
```

## Testing

### 1. Test Webhook via cURL (Array Format)

```bash
curl -X POST https://your-supabase.functions.supabase.co/functions/v1/n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "YOUR_BRANCH_ID",
    "data": [
      {
        "tanggal": "01-01-2026",
        "cash": 35000000,
        "piutang": 20000000
      },
      {
        "tanggal": "02-01-2026",
        "cash": 60000000,
        "piutang": 10000000
      }
    ]
  }'
```

### Test Webhook via cURL (Single Record)

```bash
curl -X POST https://your-supabase.functions.supabase.co/functions/v1/n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "YOUR_BRANCH_ID",
    "tanggal": "15-01-2026",
    "cash": 5000000,
    "piutang": 2000000
  }'
```

### 2. Test via Postman

1. Create POST request
2. URL: `https://your-supabase.functions.supabase.co/functions/v1/n8n-webhook`
3. Body (JSON):
   ```json
   {
     "branchId": "your-branch-uuid",
     "tanggal": "2024-01-15",
     "cash": 5000000,
     "piutang": 2000000
   }
   ```
4. Send

### 3. Check Results in KomCS

1. Login ke KomCS sebagai Admin atau HRD
2. Go to **Data & Attendance**
3. Verify omzet data sudah masuk
4. Check **Komisi** untuk lihat calculated commissions

## Troubleshooting

### Webhook tidak menerima data

**Check**:
1. URL benar dan accessible
2. Method POST
3. Content-Type: application/json
4. Firewall tidak block webhook

**Debug**:
```bash
# Test koneksi
curl -v https://your-supabase.functions.supabase.co/functions/v1/n8n-webhook

# Check Supabase edge function logs
# Via Supabase Dashboard → Edge Functions → View logs
```

### Commission tidak terhitung

**Check**:
1. Omzet data ada di database (`omzet` table)
2. Attendance data ada (`attendance_data` table)
3. Users exist di branch
4. Target Min/Max sudah set di branch

**Debug**:
```sql
-- Check omzet
SELECT * FROM omzet WHERE branch_id = 'YOUR_BRANCH_ID';

-- Check attendance
SELECT * FROM attendance_data WHERE branch_id = 'YOUR_BRANCH_ID' AND tanggal = '2024-01-15';

-- Check users
SELECT * FROM users WHERE branch_id = 'YOUR_BRANCH_ID' AND role = 'cs';
```

### Authorization Error

**Solution**:
1. Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah set di Supabase secrets
2. Check RLS policies di database
3. Verify user punya akses ke tabel

## Security Considerations

### 1. Webhook Token

Optional: set token untuk validate webhook origin

```typescript
// Dalam edge function
const expectedToken = Deno.env.get("N8N_WEBHOOK_SECRET");
if (expectedToken && token !== expectedToken) {
  return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
}
```

### 2. HTTPS Only

Always use HTTPS untuk webhook URLs.

### 3. RLS Policies

Database sudah protected dengan RLS:
- Admin dapat access semua data
- HRD dapat access data branch mereka
- CS dapat access data mereka saja

### 4. Data Validation

Semua edge function melakukan validation:
- Check required fields
- Verify branch exists
- Check user authorization
- Validate nominal values

## Monitoring & Logging

### 1. Check Supabase Logs

```bash
# Via Supabase Dashboard
1. Go to Edge Functions
2. Select function name
3. View Logs tab
```

### 2. Database Audit

```sql
-- Check recent omzet insertions
SELECT * FROM omzet
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check recent commissions
SELECT * FROM commissions
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check mutations
SELECT * FROM commission_mutations
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### 3. Alert Setup

Consider setup alerts untuk:
- Failed webhook calls
- Unusual omzet values
- Missing attendance data
- High commission requests

## Next Steps

1. ✓ Setup Supabase project dengan edge functions
2. ✓ Deploy functions ke production
3. → Create N8N workflow di N8N instance
4. → Configure webhook URL di branch setup
5. → Test dengan sample data
6. → Monitor first week production
7. → Setup automated daily sync

## Support

Untuk issues atau questions:
1. Check logs di Supabase Dashboard
2. Verify webhook payload format
3. Test edge functions directly via API
4. Check database RLS policies
5. Review commission calculation logic
