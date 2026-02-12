# Backend Setup Guide - Supabase Edge Functions

Dokumentasi lengkap untuk backend system yang dibangun menggunakan Supabase Edge Functions (serverless).

## Overview

Backend system terdiri dari 4 Edge Functions yang handle:

1. **sync-omzet-n8n** - Sync omzet data dari N8N endpoint
2. **calculate-commissions** - Kalkulasi komisi otomatis
3. **n8n-webhook** - Receive real-time data dari N8N
4. **manage-withdrawals** - Handle penarikan komisi CS

Tidak ada backend server yang perlu di-manage. Semua logic berjalan di Supabase Edge Functions (serverless).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ N8N Workflow (External)                                      │
│ - Sync daily omzet from POS/ERP system                      │
└────────────┬────────────────────────────────────────────────┘
             │ POST /functions/v1/n8n-webhook
             ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase Edge Function: n8n-webhook                          │
│ - Validate payload                                           │
│ - Save omzet to database                                     │
│ - Trigger commission calculation                            │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─► Save to `omzet` table
             │
             └─► POST /functions/v1/calculate-commissions
                    ▼
             ┌──────────────────────────────────┐
             │ Edge Function: calculate-commissions
             │ - Get omzet data                 │
             │ - Get CS users & attendance     │
             │ - Calculate based on formula    │
             │ - Save to `commissions` table   │
             └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Supabase PostgreSQL Database                                 │
├─────────────────────────────────────────────────────────────┤
│ Tables:                                                       │
│ - branches (target_min, target_max, n8n_endpoint)           │
│ - users (CS, HRD, Admin with roles & factors)              │
│ - omzet (daily revenue per branch)                          │
│ - attendance_data (CS attendance status)                    │
│ - commissions (calculated commissions)                      │
│ - commission_mutations (transactions in/out)                │
│ - withdrawal_requests (penarikan komisi)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                      │
│ - User authentication via Supabase Auth                     │
│ - Direct database queries with Row Level Security           │
│ - Call edge functions for complex operations                │
└─────────────────────────────────────────────────────────────┘
```

## Edge Functions Deployed

### 1. sync-omzet-n8n

**Purpose**: Manual trigger untuk sync historical omzet data dari N8N endpoint.

**File**: `supabase/functions/sync-omzet-n8n/index.ts`

**Endpoint**: `POST /functions/v1/sync-omzet-n8n`

**Request**:
```json
{
  "branchId": "uuid-of-branch",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Logic**:
1. Get branch N8N endpoint dari database
2. Fetch data dari N8N
3. Transform data sesuai schema
4. Upsert ke `omzet` table
5. Update `last_sync_at` timestamp

**Permissions**: Requires Supabase service role

---

### 2. calculate-commissions

**Purpose**: Kalkulasi komisi otomatis setiap ada omzet baru.

**File**: `supabase/functions/calculate-commissions/index.ts`

**Endpoint**: `POST /functions/v1/calculate-commissions`

**Request**:
```json
{
  "branchId": "uuid-of-branch",
  "tanggal": "2024-01-15"
}
```

**Logic**:
1. Get omzet data untuk tanggal tersebut
2. Get branch target info (target_min, target_max)
3. Determine komisi persen:
   - >= target_max → 0.4%
   - >= target_min → 0.2%
   - < target_min → 0%
4. Get all CS users di branch
5. Get attendance status per CS
6. Calculate komisi = omzet × % × faktor × attendance_multiplier
7. Upsert ke `commissions` table

**Permissions**: Requires Supabase service role

---

### 3. n8n-webhook

**Purpose**: Real-time webhook receiver dari N8N untuk push omzet updates.

**File**: `supabase/functions/n8n-webhook/index.ts`

**Endpoint**: `POST /functions/v1/n8n-webhook`

**Request**:
```json
{
  "branchId": "uuid-of-branch",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000,
  "token": "optional-secret"
}
```

**Logic**:
1. Validate webhook token (if configured)
2. Verify branch exists
3. Upsert omzet data
4. Trigger commission calculation
5. Return success response

**Used By**: N8N workflows untuk send data real-time

**Security**:
- Optional token validation
- Verify branch exists
- CORS enabled for cross-origin requests

---

### 4. manage-withdrawals

**Purpose**: Handle CS withdrawal requests & approvals.

**File**: `supabase/functions/manage-withdrawals/index.ts`

**Endpoint**: `POST /functions/v1/manage-withdrawals?action=create`

**Create Withdrawal**:

```json
{
  "userId": "uuid-of-cs",
  "nominal": 500000
}
```

Response:
```json
{
  "success": true,
  "message": "Withdrawal request created",
  "availableBalance": 5000000
}
```

**Approve Withdrawal**: `PUT /functions/v1/manage-withdrawals?action=approve`

```json
{
  "withdrawalId": "uuid-of-request",
  "approved": true,
  "catatan": "Sudah ditransfer"
}
```

**Logic**:
1. Validate request
2. Check available balance:
   - Sum all commissions
   - Subtract all mutations
   - Compare with requested nominal
3. Create/update withdrawal_requests record
4. If approved, create commission_mutations record
5. Return status

**Permissions**: Requires Supabase JWT token

## Database Schema

### Main Tables

#### branches
```sql
id (uuid, pk)
name (text) - Branch name
target_min (bigint) - Target untuk 0.2% komisi
target_max (bigint) - Target untuk 0.4% komisi
n8n_endpoint (text) - Webhook URL dari N8N
created_at (timestamptz)
```

#### users
```sql
id (uuid, pk, FK to auth.users)
username (text, unique)
nama (text)
role (enum: admin, hrd, cs)
branch_id (uuid, FK to branches)
faktor_pengali (decimal 10,2) - 0.75, 0.50, 0.25 untuk CS
created_at (timestamptz)
```

#### omzet
```sql
id (uuid, pk)
branch_id (uuid, FK)
tanggal (date)
cash (bigint) - Cash received
piutang (bigint) - Debt/receivable
total (bigint, GENERATED) = cash + piutang
created_at (timestamptz)
unique(branch_id, tanggal)
```

#### attendance_data
```sql
id (uuid, pk)
user_id (uuid, FK)
branch_id (uuid, FK)
tanggal (date)
status_kehadiran (enum: hadir, izin, sakit, alpha)
created_at (timestamptz)
unique(user_id, tanggal)
```

#### commissions
```sql
id (uuid, pk)
user_id (uuid, FK)
branch_id (uuid, FK)
tanggal (date)
omzet (bigint) - Total omzet for that day
attendance_status (enum)
faktor_pengali (decimal) - User's factor
komisi_persen (decimal) - 0.2 or 0.4 based on target
komisi_nominal (bigint) = omzet × komisi_persen
total_komisi (bigint) = komisi_nominal × faktor × attendance
created_at (timestamptz)
unique(user_id, tanggal)
```

#### commission_mutations
```sql
id (uuid, pk)
user_id (uuid, FK)
tanggal (date)
tipe (enum: masuk, keluar) - In/Out
nominal (bigint)
saldo_after (bigint) - Balance after transaction
keterangan (text) - Description
created_at (timestamptz)
```

#### withdrawal_requests
```sql
id (uuid, pk)
user_id (uuid, FK)
tanggal (date)
nominal (bigint)
status (enum: pending, approved, rejected)
approved_by (uuid, FK) - Admin/HRD who approved
approved_at (timestamptz)
created_at (timestamptz)
```

## Row Level Security (RLS)

Semua tabel dilindungi dengan RLS policies:

### Admin Policies
- Admin dapat read/write/delete semua data

### HRD Policies
- View branches & users
- Manage omzet di cabang mereka
- View & approve withdrawals di cabang mereka
- Manage commission mutations

### CS Policies
- View komisi mereka sendiri
- View attendance mereka sendiri
- Create withdrawal requests
- View mutations mereka sendiri

### Public/Authenticated
- Everyone (authenticated) dapat view branches

## Commission Calculation Formula

```
Step 1: Determine Komisi Persen (%)
├─ if omzet >= target_max → 0.4%
├─ if omzet >= target_min → 0.2%
└─ if omzet < target_min → 0%

Step 2: Calculate Komisi Nominal (Rp)
└─ Komisi Nominal = Omzet × Komisi Persen / 100

Step 3: Calculate Per-CS Total (Rp)
├─ Get CS faktor_pengali (0.75, 0.50, 0.25)
├─ Get attendance status:
│  ├─ hadir → 1.0
│  ├─ izin/setengah → 0.5
│  └─ sakit/alpha → 0
└─ Total Komisi = Komisi Nominal × Faktor × Attendance
```

### Example

```
Omzet: Rp 80 juta
Target Min: Rp 50 juta
Target Max: Rp 100 juta

1. Komisi % = 0.2% (80M >= 50M)
2. Komisi Nominal = 80,000,000 × 0.2% = Rp 160,000
3. CS1 (faktor 0.75, hadir):
   Total = 160,000 × 0.75 × 1.0 = Rp 120,000
4. CS2 (faktor 0.50, hadir):
   Total = 160,000 × 0.50 × 1.0 = Rp 80,000
```

## API Integration

### From N8N to KomCS

N8N sends webhook POST:
```
POST https://supabase-project.functions.supabase.co/functions/v1/n8n-webhook
Content-Type: application/json

{
  "branchId": "12345678-...",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000
}
```

KomCS:
1. Receives webhook
2. Saves omzet
3. Calculates commissions
4. Returns result

### From KomCS Frontend to Backend

Frontend calls edge functions:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-commissions`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      branchId: 'branch-uuid',
      tanggal: '2024-01-15'
    })
  }
);
```

## Deployment Status

All edge functions deployed to Supabase production:

✓ sync-omzet-n8n
✓ calculate-commissions
✓ n8n-webhook
✓ manage-withdrawals

## Testing Edge Functions

### Via cURL

```bash
# Test webhook
curl -X POST https://your-project.functions.supabase.co/functions/v1/n8n-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "YOUR_BRANCH_ID",
    "tanggal": "2024-01-15",
    "cash": 5000000,
    "piutang": 2000000
  }'

# Test commission calculation
curl -X POST https://your-project.functions.supabase.co/functions/v1/calculate-commissions \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "YOUR_BRANCH_ID",
    "tanggal": "2024-01-15"
  }'
```

### Via Supabase Dashboard

1. Go to Edge Functions
2. Click function name
3. Test tab
4. Set payload
5. Click "Invoke"

### Check Logs

```
Supabase Dashboard → Edge Functions → [function-name] → Logs tab
```

## Monitoring

### Log Locations

1. **Supabase Dashboard**
   - Edge Functions → Select function → Logs tab
   - Real-time logs dari edge function executions

2. **Database Activity**
   ```sql
   -- Check recent omzet inserts
   SELECT * FROM omzet
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;

   -- Check commission calculations
   SELECT user_id, tanggal, total_komisi
   FROM commissions
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

### Alerts to Setup

Consider setting up monitoring untuk:
- Failed webhook calls
- Missing attendance data
- Unusual omzet values
- High withdrawal requests
- Edge function errors

## Scaling & Performance

### Edge Functions Scaling
- Auto-scales dengan Deno
- No server management needed
- Pay per execution

### Database Scaling
- PostgreSQL auto-scaling di Supabase
- Indexes configured untuk performance
- Connection pooling enabled

### Optimization Tips
1. Batch omzet updates dalam satu webhook call
2. Cache branch data di frontend
3. Use database indexes untuk tanggal queries
4. Implement pagination untuk large result sets

## Troubleshooting

### Webhook Not Received

1. Check URL is correct
2. Verify branch_id exists
3. Check firewall allows HTTPS
4. Review edge function logs

### Commission Not Calculated

1. Verify omzet data exists
2. Check attendance data
3. Verify CS users exist
4. Check target_min/max configured

### Authorization Errors

1. Verify RLS policies
2. Check user role
3. Verify branch_id matches
4. Review Supabase logs

## Next Steps

1. ✓ Backend deployed & tested
2. → Setup N8N workflow
3. → Configure branch N8N endpoints
4. → Test full flow: N8N → Webhook → Commissions
5. → Monitor production performance
6. → Setup automated backups

## Support

For issues:
1. Check Supabase edge function logs
2. Verify webhook payload format
3. Test database queries directly
4. Review RLS policies
5. Check network connectivity to N8N
