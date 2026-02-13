# CS Commission System

Production-ready web application untuk sistem komisi Customer Service (CS) berbasis omzet harian.

**Status**: ✅ Production Ready | Built with React 18, TypeScript, Node.js, Express, PostgreSQL

---

## 🏗️ Arsitektur

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express (REST API) |
| **Database** | PostgreSQL (native driver pg) |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **Deployment** | Nginx + PM2 on VPS |

**IMPORTANT**: Aplikasi ini TIDAK menggunakan Supabase, Firebase, atau backend-as-a-service lainnya.

---

## 📚 Dokumentasi Lengkap

Untuk setup dan deployment lengkap, baca dokumentasi berikut:

### 1. **CS-COMMISSION-SYSTEM-README.md** - Main Documentation
   - Arsitektur lengkap
   - Quick start guide (5 menit)
   - API endpoints (25+)
   - Security features
   - Workflow
   - Troubleshooting

### 2. **DEPLOYMENT-GUIDE.md** - Production Deployment
   - Step-by-step setup VPS
   - PostgreSQL configuration
   - Nginx + PM2 setup
   - SSL/HTTPS dengan Certbot
   - Backup strategies
   - Monitoring

### 3. **API-EXAMPLES.md** - API Testing
   - 50+ cURL examples
   - All endpoints documented
   - Postman collection guide
   - Response formats

### 4. **PROJECT-SUMMARY.md** - Project Overview
   - Complete file list
   - Features summary
   - Build status
   - Technology stack

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

## ✨ Fitur Utama

### For Admin
- ✅ Complete dashboard dengan real-time statistics
- ✅ CRUD branches (cabang)
- ✅ CRUD users (CS, HRD, Admin)
- ✅ View semua omzet dan commissions
- ✅ Calculate commissions otomatis
- ✅ Mark commissions as paid
- ✅ Audit log (mutations tracking)
- ✅ Reset user passwords

### For HRD
- ✅ Manage users dan branches
- ✅ Input dan edit omzet
- ✅ Calculate dan manage commissions
- ✅ View reports

### For CS (Customer Service)
- ✅ Input daily sales (omzet)
- ✅ View personal commissions
- ✅ View personal dashboard
- ✅ Change password

---

## 🔐 Security Features

- ✅ **JWT Authentication** - 7 days token expiry
- ✅ **Password Hashing** - bcrypt (10 rounds)
- ✅ **Role-Based Access Control** - admin, hrd, cs
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Audit Trail** - mutations table tracks all changes
- ✅ **CORS Configuration** - Environment-based
- ✅ **Foreign Key Constraints** - Data integrity

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

### Branches
- `GET /api/branches` - List branches
- `POST /api/branches` - Create branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/reset-password` - Reset password

### Omzet (Sales)
- `POST /api/omzet` - Create omzet record
- `GET /api/omzet/by-date` - Get by date
- `GET /api/omzet/by-branch` - Get by branch
- `GET /api/omzet/stats` - Get statistics

### Commissions
- `POST /api/commissions/calculate` - Calculate commissions
- `GET /api/commissions/by-user` - Get by user
- `GET /api/commissions/by-branch` - Get by branch
- `POST /api/commissions/mark-paid` - Mark as paid

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/mutations` - Audit log
- `GET /api/dashboard/weekly-report` - Weekly report
- `GET /api/dashboard/top-performers` - Top performers

**Total**: 25+ endpoints

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
cd server
cp .env.example .env
# Edit .env dengan production credentials
npm install --production
npm run seed
pm2 start src/server.js --name "cs-commission-api"
pm2 save
pm2 startup

# 3. Deploy frontend
cd ../frontend
npm install
npm run build
# Copy dist/ ke /var/www/cs-commission

# 4. Configure Nginx
# Setup reverse proxy: frontend → dist/, API → localhost:3000

# 5. Enable HTTPS
sudo certbot --nginx -d your-domain.com
```

**Lihat `DEPLOYMENT-GUIDE.md` untuk panduan lengkap.**

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
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@commission.local","password":"admin123456"}'

# Get branches (with token)
curl -X GET http://localhost:3000/api/branches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

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
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_commission
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=CS Commission System
```

---

## 📖 Additional Resources

- **CS-COMMISSION-SYSTEM-README.md** - Complete documentation
- **DEPLOYMENT-GUIDE.md** - VPS deployment guide
- **API-EXAMPLES.md** - API testing examples
- **PROJECT-SUMMARY.md** - Project overview
- **schema.sql** - Database schema

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

## 🔄 Workflow

1. CS input daily sales → Omzet table
2. Admin calculate commissions → Commissions table
3. Admin mark as paid → Update status
4. View reports → Dashboard & statistics
5. Audit log → Track all changes

---

## ✅ Production Ready

- ✅ 36 source files
- ✅ 25+ API endpoints
- ✅ 11 database tables
- ✅ Complete documentation
- ✅ Build verified (248 KB)
- ✅ Security implemented
- ✅ Role-based access control

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Last Updated**: 2024

For complete setup instructions, see **CS-COMMISSION-SYSTEM-README.md**
