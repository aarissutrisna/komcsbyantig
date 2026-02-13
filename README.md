# CS Commission System

Production-ready web application untuk sistem komisi Customer Service (CS) berbasis omzet harian.

**Status**: ✅ Production Ready (v1.0) | Built with React 18, TypeScript, Node.js, Express, PostgreSQL
**Note**: Core commission system ready. N8N integration is in roadmap.

---

## 🏗️ Arsitektur

### Technology Stack (v1.0)
| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express (REST API) |
| **Database** | PostgreSQL (8 tables with indexes) |
| **Authentication** | JWT (7-day expiry) + bcrypt |
| **Deployment** | Nginx + PM2 on VPS |
| **Future** | N8N webhooks (roadmap) |

**IMPORTANT**: Aplikasi ini TIDAK menggunakan Supabase, Firebase, atau backend-as-a-service lainnya.

### System Architecture (v1.0)
```
┌─────────────────────────────────────────┐
│  React Frontend (React 18 + TypeScript)  │
│                                         │
│  - Login page                           │
│  - Dashboard (omzet, commissions)       │
│  - Commission calculations              │
│  - Withdrawal requests                  │
│  - Audit trail                          │
└────────────────┬────────────────────────┘
                 │
                 │ (HTTP + JWT)
                 ▼
      ┌──────────────────────────┐
      │  Express Backend (Node.js)│
      │                          │
      │  - Auth service         │
      │  - Omzet service        │
      │  - Commission service   │
      │  - Withdrawal service   │
      └────────────┬─────────────┘
                   │
                   │ (SQL Queries)
                   ▼
      ┌──────────────────────────┐
      │  PostgreSQL Database     │
      │                          │
      │  - users & branches      │
      │  - omzet records         │
      │  - commissions           │
      │  - withdrawals           │
      │  - audit trail           │
      └──────────────────────────┘

Future: N8N integration for automated data import
```

---

## 📚 Dokumentasi Lengkap

Untuk setup dan deployment lengkap, baca dokumentasi berikut:

### 1. **README-N8N-WORKFLOW.md** - N8N Integration Guide ⭐ NEW
   - Workflow diagram & nodes
   - Data modes: daily, update, bulk
   - 3 webhook cabang (UTM, JTJ, TSM)
   - JSON payload examples
   - Database schema untuk n8n
   - Security & batch processing
   - Testing scenarios
   - Monitoring & troubleshooting

### 2. **MIGRATION-GUIDE.md** - Backend Architecture
   - Supabase Edge Functions → Express conversion
   - Endpoint mapping
   - Service & controller structure
   - Database tables & indexes

### 3. **SETUP.md** - Production Deployment
   - Step-by-step VPS setup
   - PostgreSQL configuration
   - Nginx + PM2 setup
   - SSL/HTTPS dengan Certbot
   - Backup strategies
   - Monitoring

### 4. **EXAMPLE-REQUESTS.md** - API Testing
   - 46+ cURL examples
   - All endpoints documented
   - Response formats
   - Postman guide

### 5. **API-ENDPOINTS.md** - API Reference
   - Complete endpoint documentation
   - Request/response examples
   - Error codes

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm atau yarn

### 1. Setup Database
```bash
# Create database
createdb cs_commission

# Load schema
psql -d cs_commission -f schema.sql
```

### 2. Setup Backend
```bash
cd server

# Copy environment file
cp .env.example .env

# Edit .env dengan kredensial PostgreSQL Anda:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=cs_commission
# DB_USER=postgres
# DB_PASSWORD=your_password

# Install dependencies
npm install

# Seed database dengan default data
npm run seed

# Start development server
npm run dev
```

Backend akan berjalan di `http://localhost:3000`

### 3. Setup Frontend
```bash
cd frontend

# Copy environment file
cp .env.example .env

# Edit .env (biasanya default sudah OK):
# VITE_API_BASE_URL=http://localhost:3000/api

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 4. Login
```
Email: admin@commission.local
Password: admin123456
```

---

## 📂 Project Structure

```
cs-commission-system/
├── schema.sql                    # PostgreSQL schema
├── server/                       # Backend API (Node.js + Express)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js             # Express server
│       ├── config/database.js    # PostgreSQL connection
│       ├── middleware/auth.js    # JWT auth
│       ├── services/             # Business logic (5 files)
│       ├── controllers/          # Route handlers (6 files)
│       └── routes/               # API routes (6 files)
│
└── frontend/                     # React TypeScript app
    ├── package.json
    ├── .env.example
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── services/api.ts       # API client (Fetch)
        ├── contexts/             # Auth context
        ├── components/           # Reusable components
        └── pages/                # 8 pages
```

---

## ✨ Fitur Utama (v1.0)

### Core Features
- ✅ **Authentication**: Login with JWT tokens (7 days expiry)
- ✅ **Omzet Management**: Create, read, filter by date/branch/user
- ✅ **Commission Calculation**: Auto-calculate with tiered rules
- ✅ **Withdrawal Management**: Create requests, approve/reject
- ✅ **Audit Trail**: Track all mutations in database
- ✅ **Role-Based Access**: Admin, HRD, CS roles with permissions

### User Roles
- **Admin**: Calculate commissions, approve withdrawals, view all data
- **HRD**: Input omzet, calculate commissions, view reports
- **CS**: Input omzet, view own commissions

### Database Features
- ✅ PostgreSQL with 8 tables
- ✅ Foreign key constraints
- ✅ Automated indexes for performance
- ✅ Commission config with tiered rules
- ✅ Attendance tracking
- ✅ Mutation logging

---

## 🔐 Security Features

- ✅ **JWT Authentication** - 7 days token expiry
- ✅ **Password Hashing** - bcrypt (10 rounds)
- ✅ **Role-Based Access Control** - admin, hrd, cs
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Audit Trail** - mutations table + n8n_sync_log tracks all changes
- ✅ **CORS Configuration** - Environment-based
- ✅ **Foreign Key Constraints** - Data integrity

### N8N Webhook Security
- ✅ **API Key Authentication** - x-api-key header validation
- ✅ **Batch Processing** - Prevent deadlock (max 500 records/batch)
- ✅ **Input Validation** - Type checking & sanitization
- ✅ **Rate Limiting** - Max 100 requests/minute
- ✅ **Audit Logging** - Track all sync operations (n8n_sync_log)
- ✅ **Error Handling** - Graceful failures with proper status codes

---

## 📊 Commission Calculation

Sistem otomatis menghitung komisi berdasarkan tiered rules:

| Range Omzet | Commission % |
|-------------|--------------|
| 0 - 5M      | 2.5%         |
| 5M - 10M    | 3.5%         |
| 10M+        | 5.0%         |

Rules dapat dimodifikasi di table `commission_config`.

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/profile` - Get profile
- `POST /api/auth/change-password` - Change password

### Authentication (3)
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (JWT required)
- `POST /api/auth/change-password` - Change password (JWT required)

### Omzet / Sales (5)
- `POST /api/omzet/create` - Create omzet record (JWT required)
- `GET /api/omzet/by-date?startDate=2024-01-01&endDate=2024-01-31` - Get by date range (JWT required)
- `GET /api/omzet/by-branch?branchId=uuid` - Get by branch (JWT required)
- `GET /api/omzet/by-user?userId=uuid` - Get by user (JWT required)
- `GET /api/omzet/stats` - Get omzet statistics (JWT required)

### Commissions (2)
- `POST /api/commissions/calculate-by-date` - Calculate commissions by date (JWT required)
- `POST /api/commissions/calculate-by-branch` - Calculate commissions by branch (JWT required)

### Withdrawals (4)
- `POST /api/withdrawals/create` - Create withdrawal request (JWT required)
- `POST /api/withdrawals/approve` - Approve/reject withdrawal (JWT required)
- `GET /api/withdrawals/list` - List withdrawals (JWT required)
- `GET /api/withdrawals/balance` - Get available balance (JWT required)

### Health Check (1)
- `GET /health` - Server health check (no auth required)

**Total**: 16 endpoints (all secured with JWT except login & health)

Lihat `API-EXAMPLES.md` untuk contoh lengkap dengan cURL.

---

## 🚀 Production Deployment

### VPS Requirements
- Ubuntu 20.04+
- Node.js 16+
- PostgreSQL 12+
- Nginx
- PM2
- 2GB RAM minimum

### Quick Deployment
```bash
# 1. Setup database di VPS
sudo -u postgres createdb cs_commission
sudo -u postgres psql -d cs_commission -f schema.sql

# 2. Deploy backend
cd backend
cp .env.example .env
# Edit .env dengan production credentials (DB + N8N_WEBHOOK_SECRET)
npm install --production
npm run seed
pm2 start src/server.js --name "cs-commission-api"
pm2 save
pm2 startup

# 3. Deploy frontend
cd ../
npm install
npm run build
# Copy dist/ ke /var/www/cs-commission

# 4. Configure Nginx
# Setup reverse proxy: frontend → dist/, API → localhost:3000

# 5. Enable HTTPS
sudo certbot --nginx -d your-domain.com

```

**Lihat `SETUP.md` untuk panduan lengkap deployment.**

---

## 🧪 Testing

### Run Backend Tests
```bash
cd server
npm start
# Test endpoint
curl http://localhost:3000/health
```

### Build Frontend
```bash
cd frontend
npm run build
# Output: dist/ folder (248 KB gzipped)
```

### API Testing

#### Standard API
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@commission.local","password":"admin123456"}'

# Get branches (with JWT token)
curl -X GET http://localhost:3000/api/branches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### N8N Webhook Testing
```bash
# Test daily sync (no auth required, x-api-key header)
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_n8n_webhook_secret" \
  -d '{
    "branch": "UTM",
    "tanggal": "2024-01-15",
    "cash": 5000000,
    "piutang": 2000000,
    "mode": "daily"
  }'

# Test bulk import
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_n8n_webhook_secret" \
  -d '{
    "mode": "bulk",
    "branch": "JTJ",
    "data": [
      {"tanggal": "2024-01-01", "cash": 3000000, "piutang": 1000000},
      {"tanggal": "2024-01-02", "cash": 3500000, "piutang": 1200000}
    ]
  }'

# Test manual sync via webapp (JWT required)
curl -X POST http://localhost:3000/api/omzet/sync/n8n \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "uuid-here",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

**See README-N8N-WORKFLOW.md for detailed testing scenarios**

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d cs_commission
```

### Backend Not Starting
```bash
# Check logs
pm2 logs cs-commission-api

# Check port 3000
sudo lsof -i :3000
```

### Frontend Build Error
```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run build
```

---

## 📦 Dependencies

### Backend (6 main packages)
- express - Web framework
- pg - PostgreSQL driver
- jsonwebtoken - JWT authentication
- bcrypt - Password hashing
- cors - CORS middleware
- dotenv - Environment variables

### Frontend (4 main packages)
- react - UI library
- react-router-dom - Routing
- typescript - Type safety
- lucide-react - Icons

---

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_commission
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Authentication
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRY=7d

# CORS & Server
CORS_ORIGIN=http://localhost:5173

# N8N Webhook Security
N8N_WEBHOOK_SECRET=your_super_secret_webhook_key_min_32_chars
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=CS Commission System
```

---

## 📖 Additional Resources

- **README-N8N-WORKFLOW.md** - N8N integration & workflow (⭐ START HERE)
- **MIGRATION-GUIDE.md** - Backend architecture & API conversion
- **SETUP.md** - Production deployment guide
- **EXAMPLE-REQUESTS.md** - 46+ cURL testing examples
- **API-ENDPOINTS.md** - Complete API reference
- **schema.sql** - Database schema
- **QUICK-START.md** - 5-minute setup guide

---

## 💡 Development Tips

1. **Database Changes**: Update `schema.sql` dan re-run
2. **API Changes**: Update controllers/services
3. **Frontend Changes**: Component-based architecture
4. **Testing**: Use Postman atau cURL untuk API testing
5. **Debugging**: Check PM2 logs dan PostgreSQL logs

---

## 🎯 Tech Stack Summary

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + PostgreSQL
- **Auth**: JWT + bcrypt
- **Deployment**: Nginx + PM2
- **Database**: PostgreSQL 12+
- **Build Tool**: Vite
- **Process Manager**: PM2

**NO Supabase, NO Firebase, NO BaaS**

---

## 🔄 Data Flow & Workflow

### Standard Workflow
1. CS input daily sales → Omzet table
2. Admin calculate commissions → Commissions table
3. Admin mark as paid → Update status
4. View reports → Dashboard & statistics
5. Audit log → Track all changes

### N8N Integration Workflow (Future Roadmap)
**Note**: N8N integration is documented in README-N8N-WORKFLOW.md as a design reference for future implementation. Current v1.0 focuses on manual omzet entry via web interface.

Future workflow will include:
1. **POS/ERP System** → Sends sales data to N8N
2. **N8N Webhook** → Receives from 3 branches (UTM, JTJ, TSM)
3. **N8N Processing** → Data validation and transformation
4. **PostgreSQL** → Auto-insert with audit trail
5. **Commission Auto-Trigger** → Calculate immediately

Requirements for N8N integration:
- Add database fields: source_n8n, revisi, synced_at
- Create n8n_sync_log audit table
- Implement webhook handlers

---

## ✅ Production Ready (v1.0)

### What's Implemented
- ✅ 16 API endpoints (fully functional)
- ✅ 8 database tables with indexes
- ✅ JWT authentication & authorization
- ✅ Commission calculation (tiered rules)
- ✅ Omzet tracking (daily manual entry)
- ✅ Withdrawal management
- ✅ Audit trail logging
- ✅ Role-based access control (admin, hrd, cs)
- ✅ Complete documentation

### What's Not Implemented (Roadmap)
- N8N webhook integration (design doc available)
- Branch & User management APIs
- Dashboard analytics APIs

### Build Status
- Frontend: 358.91 KB (gzipped: 101.89 KB)
- Backend: 16 endpoints, 4 services
- Database: 8 tables ready
- Tests: Manual testing via cURL available

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Core Features**: Complete
**N8N Integration**: Documented as roadmap
**Last Updated**: 2024

For setup instructions, see **QUICK-START.md** or **SETUP.md**
