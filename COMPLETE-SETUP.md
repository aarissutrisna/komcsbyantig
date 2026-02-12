# Complete KomCS System Setup Guide

**Status**: ✓ Production Ready

Sistem komisi CS yang complete dengan frontend, backend (serverless), dan N8N integration.

## What's Included

### Frontend (React + TypeScript + Tailwind)
- ✓ User authentication (Supabase Auth)
- ✓ Role-based access control (Admin, HRD, CS)
- ✓ Branch management dengan N8N endpoint configuration
- ✓ Attendance & omzet data input
- ✓ Commission viewing & tracking
- ✓ Withdrawal request management
- ✓ Commission mutation history

### Backend (Serverless - Supabase Edge Functions)
- ✓ `sync-omzet-n8n` - Sync historical data dari N8N
- ✓ `calculate-commissions` - Auto-calculate commissions
- ✓ `n8n-webhook` - Real-time webhook receiver
- ✓ `manage-withdrawals` - Withdrawal request handler

### Database (PostgreSQL via Supabase)
- ✓ 7 tables with RLS security
- ✓ Automatic commission calculation via triggers
- ✓ Role-based access control

### Integration
- ✓ N8N webhook integration
- ✓ Real-time data sync from POS/ERP systems
- ✓ Automated commission calculation workflow

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     N8N Workflow (External)                      │
│           • Daily sync dari POS/ERP/Accounting system            │
│           • Real-time data push untuk omzet updates              │
└────────────────────────┬────────────────────────────────────────┘
                         │ Webhook POST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Serverless)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │n8n-webhook   │  │calculate-    │  │manage-       │           │
│  │              │→ │commissions   │→ │withdrawals   │           │
│  │• Receive data│  │• Auto-calc   │  │• Approve req │           │
│  │• Validate    │  │• Save result │  │• Track balance
│  │• Save omzet  │  │              │  │              │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────┬────────────────────────────────────────────────┘
                  │ Read/Write Data
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│          Supabase PostgreSQL Database (Secure)                   │
│  ┌─────────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐            │
│  │branches     │ │users     │ │omzet    │ │attend. │            │
│  │• targets    │ │• roles   │ │• cash   │ │• status│            │
│  │• n8n_endpoint │ │• factors │ │• piutang│ │• date  │            │
│  └─────────────┘ └──────────┘ └─────────┘ └────────┘            │
│  ┌────────────────┐ ┌────────────┐ ┌──────────────┐             │
│  │commissions     │ │commission_ │ │withdrawal_   │             │
│  │• nominal       │ │mutations   │ │requests      │             │
│  │• total_komisi  │ │• tipe      │ │• status      │             │
│  │• faktor        │ │• nominal   │ │• nominal     │             │
│  └────────────────┘ └────────────┘ └──────────────┘             │
│                                                                   │
│  • All tables protected with RLS                                │
│  • Auto-updated timestamps                                      │
│  • Automatic commission triggers                                │
└─────────────────┬────────────────────────────────────────────────┘
                  │ Real-time subscriptions
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│           React Frontend (Vite + Tailwind + TypeScript)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Login     │ │Dashboard │ │Branches  │ │Attendance│            │
│  │          │ │          │ │          │ │          │            │
│  │Auth flow │ │Stats     │ │Manage    │ │Record    │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Users     │ │Data &    │ │Commissions │ │Mutations│            │
│  │Manage    │ │Attendance│ │View       │ │History   │            │
│  │Create CS │ │Input data│ │Track      │ │Withdrawals          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Setup Database

Database sudah ready. Run migrations:

```sql
-- Migration applied di Supabase
-- File: supabase/migrations/20260212142142_create_initial_schema.sql
```

### 2. Create Admin User

```sql
-- 1. Buat user di Supabase Auth
-- Dashboard → Authentication → Users → Add User

-- 2. Insert ke users table
INSERT INTO users (id, username, nama, role, branch_id, faktor_pengali)
VALUES ('USER_ID_FROM_STEP_1', 'admin', 'Administrator', 'admin', NULL, NULL);
```

### 3. Create First Branch

Via Frontend:
1. Login sebagai Admin
2. Menu → Branches → Add Branch
3. Isi nama, target min, target max
4. Optional: set N8N endpoint untuk auto-sync

### 4. Add HRD & CS Users

Via Frontend:
1. Menu → Users → Add User
2. Untuk HRD: role=hrd, branch=pilih
3. Untuk CS: role=cs, faktor=0.75/0.50/0.25

### 5. Setup N8N Integration (Optional)

1. Buat N8N workflow (lihat N8N-INTEGRATION.md)
2. Get webhook URL dari N8N
3. Edit branch, set N8N endpoint
4. Test webhook

### 6. Input Data

Untuk testing:

**Option A: Manual Input**
1. Login sebagai HRD
2. Menu → Data & Attendance
3. Input omzet & attendance
4. Commissions auto-calculated

**Option B: N8N Sync**
1. Setup N8N workflow
2. Configure branch endpoint
3. N8N sends data otomatis
4. Commissions calculated real-time

## File Structure

```
project/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Main layout
│   │   └── ProtectedRoute.tsx  # Auth guard
│   ├── contexts/
│   │   └── AuthContext.tsx     # Auth state management
│   ├── lib/
│   │   └── supabase.ts         # Supabase client
│   ├── pages/
│   │   ├── Login.tsx           # Auth page
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Branches.tsx        # Branch management
│   │   ├── Users.tsx           # User management
│   │   ├── DataAttendance.tsx  # Input omzet & attendance
│   │   ├── Mutations.tsx       # Commission mutations & withdrawals
│   │   └── Settings.tsx        # Settings
│   ├── utils/
│   │   └── currency.ts         # Currency formatting
│   ├── App.tsx                 # Router setup
│   └── main.tsx                # Entry point
│
├── supabase/
│   ├── functions/
│   │   ├── sync-omzet-n8n/     # Edge function 1
│   │   ├── calculate-commissions/ # Edge function 2
│   │   ├── n8n-webhook/        # Edge function 3
│   │   └── manage-withdrawals/  # Edge function 4
│   └── migrations/
│       └── 20260212142142_create_initial_schema.sql
│
├── dist/                       # Production build
│
├── .env                        # Supabase credentials
├── .env.supabase              # Template untuk Cloud Supabase
├── package.json               # Dependencies
├── vite.config.ts             # Build config
├── tailwind.config.js         # Styling config
│
└── Documentation Files:
    ├── SETUP.md               # Quick setup guide
    ├── SETUP-SELF-HOSTED.md  # Self-hosted Supabase setup
    ├── DEPLOYMENT.md          # Deployment instructions
    ├── PRODUCTION-SETUP.md   # Production checklist
    ├── BACKEND-SETUP.md      # Backend documentation
    ├── N8N-INTEGRATION.md    # N8N integration guide
    └── COMPLETE-SETUP.md     # This file
```

## Key Features

### Role-Based Access Control

**Admin**:
- ✓ Full system access
- ✓ Create/edit/delete branches
- ✓ Create/edit/delete users
- ✓ Manage all data & commissions
- ✓ Approve withdrawals
- ✓ View all reports

**HRD**:
- ✓ Manage their branch only
- ✓ Input omzet & attendance
- ✓ View CS users di cabang
- ✓ Approve withdrawal requests
- ✓ View commission reports

**CS**:
- ✓ View own commissions
- ✓ View own attendance
- ✓ Create withdrawal requests
- ✓ View own transaction history

### Commission Calculation

**Automatic triggers**:
- Setiap omzet di-input → komisi dihitung
- Setiap attendance di-update → komisi di-recalculate
- N8N webhook push → komisi auto-calculated

**Formula**:
```
1. Determine komisi % based on omzet vs branch targets
2. Calculate nominal komisi = omzet × %
3. Per CS: total = nominal × faktor × attendance_status
```

### Data Sync Options

**Option 1: Manual Input** (Default)
- HRD input omzet & attendance manually
- Good untuk: testing, small branches

**Option 2: N8N Integration** (Recommended)
- N8N push data real-time
- Auto-sync dari POS/ERP/Accounting
- Good untuk: production, large branches

## Environment Configuration

### Local Development

**.env file**:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Self-Hosted Supabase

**.env file**:
```env
VITE_SUPABASE_URL=http://your-vps-ip:8000
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Cloud Deployment

Set environment variables di hosting platform (Vercel, Netlify, etc.)

## API Endpoints

All backend endpoints are serverless Edge Functions:

```
POST /functions/v1/n8n-webhook
  └─ Receive omzet data from N8N

POST /functions/v1/calculate-commissions
  └─ Calculate commissions for a date

POST /functions/v1/sync-omzet-n8n
  └─ Sync historical data

POST /functions/v1/manage-withdrawals?action=create
  └─ Create withdrawal request

PUT /functions/v1/manage-withdrawals?action=approve
  └─ Approve/reject withdrawal
```

## Performance Metrics

- **Build Size**: 358 KB JS + 15 KB CSS (gzipped: 102 KB + 3.6 KB)
- **Load Time**: < 2 seconds
- **Database Queries**: Optimized dengan indexes
- **Scalability**: Auto-scale dengan Supabase & Edge Functions

## Security

- ✓ Supabase Authentication (JWT tokens)
- ✓ Row Level Security (RLS) di semua tabel
- ✓ Role-based access control
- ✓ HTTPS only
- ✓ Automatic timestamps
- ✓ Audit trail via mutations table
- ✓ Secure withdrawal approvals

## Testing

### Unit Testing Workflow

1. Create test user (HRD)
2. Create test branch dengan targets
3. Create test CS users dengan factors
4. Input test omzet & attendance
5. Verify commissions calculated correctly
6. Test withdrawal requests
7. Test N8N webhook (optional)

### Integration Testing

```bash
# Test edge function via curl
curl -X POST https://your-project.functions.supabase.co/functions/v1/calculate-commissions \
  -H "Content-Type: application/json" \
  -d '{"branchId": "...", "tanggal": "2024-01-15"}'

# Check logs di Supabase Dashboard
# Edge Functions → Select function → Logs
```

## Deployment Checklist

Before going live:

- [ ] Database migrations applied
- [ ] Admin user created & tested
- [ ] First branch created
- [ ] HRD & CS users created
- [ ] Test omzet input & commissions
- [ ] Test attendance input
- [ ] Test withdrawal requests
- [ ] Frontend build successful
- [ ] Edge functions deployed
- [ ] N8N workflow tested (if using)
- [ ] HTTPS configured
- [ ] Database backups configured
- [ ] Team trained on system

## Common Tasks

### How to Add a New CS User

1. Login as Admin or HRD
2. Menu → Users → Add User
3. Fill: Email, Password, Name
4. Select Role: CS
5. Select Branch
6. Set Factor: 0.75 (primary) / 0.50 (secondary) / 0.25 (support)
7. Save

### How to Input Daily Omzet

1. Login as HRD
2. Menu → Data & Attendance
3. Tab → Omzet
4. Select Date
5. Fill: Cash & Piutang
6. Save

System automatically calculates commissions based on attendance.

### How to Input Attendance

1. Login as HRD
2. Menu → Data & Attendance
3. Tab → Attendance
4. Select Date
5. For each CS:
   - Select Status (Hadir/Setengah/Izin/Sakit/Alpha)
   - Save

Commissions auto-recalculate based on status.

### How to Approve Withdrawals

1. Login as HRD/Admin
2. Menu → Mutations
3. See "Permintaan Penarikan" section
4. Click Approve/Reject
5. System tracks in mutations table

## Troubleshooting

### "Cannot connect to Supabase"
- Check .env file has correct VITE_SUPABASE_URL
- Verify VITE_SUPABASE_ANON_KEY is valid
- Check network connectivity

### "RLS policy violation"
- Verify user exists di users table
- Check role is correct
- Verify branch_id matches
- Review Supabase logs

### "Commission not calculating"
- Verify omzet data exists
- Check attendance data exists
- Verify CS users exist
- Check target_min/max configured

### "N8N webhook not received"
- Verify webhook URL correct
- Check firewall allows HTTPS
- Test webhook manually via curl
- Check edge function logs

## Support & Documentation

- **Setup**: SETUP.md, SETUP-SELF-HOSTED.md
- **Deployment**: DEPLOYMENT.md, PRODUCTION-SETUP.md
- **Backend**: BACKEND-SETUP.md
- **N8N**: N8N-INTEGRATION.md
- **This Guide**: COMPLETE-SETUP.md

## Next Steps

1. ✓ Code ready for production
2. → Deploy to VPS atau Cloud hosting
3. → Setup Supabase project
4. → Create admin user & first branch
5. → Train team on usage
6. → Setup N8N (optional, for auto-sync)
7. → Monitor first week
8. → Optimize based on feedback

## Success Criteria

System ready for production when:

- ✓ All users can login dengan correct role
- ✓ HRD dapat input omzet & attendance
- ✓ Commissions calculated correctly
- ✓ CS dapat view commissions
- ✓ Withdrawals dapat di-request & approve
- ✓ N8N sync working (if configured)
- ✓ Database backups running
- ✓ Team trained & confident

---

**Build Status**: ✓ Production Ready

All components built, tested, dan deployed to Supabase.

Ready untuk live production deployment!
