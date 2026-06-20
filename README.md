# CS Commission System (Komisi CS PJB)

Production-ready web application untuk sistem komisi Customer Service (CS) berbasis omzet harian.

**Status**: ✅ Production Ready (v1.2.1) | Built with React 18, TypeScript, Node.js, Express, MariaDB 11.4
**Environment**: Optimized for HestiaCP, ARM vCPU, Tunneling WireGuard.

---

## 🏗️ Arsitektur

### Technology Stack
| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express (REST API, ESM) |
| **Database** | MariaDB 11.4 (MySQL Compatible) |
| **Authentication** | JWT + bcrypt |
| **Deployment** | HestiaCP / Nginx Reverse Proxy |
| **Networking** | Cloudflare > WGhub > WGclient (3-Hop) |

### System Layout
```
komcsbybolt/
├── backend/              # Node.js Express Backend (ESM)
│   ├── src/
│   │   ├── config/       # Database & environment config
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth & role middleware
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic layer
│   │   └── server.js     # Entry point
│   └── package.json
├── src/                  # React Frontend Source
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React context providers (Auth, Theme)
│   ├── pages/            # Page components (13 pages)
│   ├── services/         # API client
│   └── App.tsx           # Root component with routing
├── docs/                 # Technical documentation
├── schema_mariadb.sql    # Database schema
└── package.json
```

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 18+
- MariaDB 11.4+ (MySQL compatible)

### 1. Setup Database
```bash
mysql -u root -p -e "CREATE DATABASE cs_commission"
mysql -u root -p cs_commission < schema_mariadb.sql
```

### 2. Setup Backend
```bash
cd backend
npm install
# Edit .env dengan kredensial MariaDB
npm run seed  # Isi data awal
npm run dev   # Jalankan server (Port 3000)
```

### 3. Setup Frontend
```bash
# Di folder root
npm install
npm run dev   # Jalankan frontend (Port 5173)
```

### 4. Login
- **Email**: `admin@gmail.com`
- **Password**: `admin123`

---

## 🌟 Fitur Utama

| Fitur | Deskripsi | Akses |
|-------|-----------|-------|
| **Dashboard** | Performa omzet, grafik target, metrik harian | Semua role |
| **Data & Kehadiran** | Monitoring absensi CS, laporan akumulasi | Semua role |
| **Mutasi Komisi** | Pengajuan & approval mutasi saldo komisi | Semua role |
| **Penugasan CS** | Pengaturan alokasi CS ke cabang | Admin, HRD |
| **Transfer Item Bonus** | Tracking transfer barang bonus antar cabang + kalkulasi bonus otomatis | Semua role |
| **Manajemen Cabang** | CRUD cabang, target, persentase komisi | Admin |
| **Manajemen Pengguna** | CRUD user, role, penempatan cabang | Admin |
| **Analisa Target** | Simulasi target omzet (YoY & Tren Bulanan) | Admin |
| **Admin Settings** | Konfigurasi webhook, scheduler, bonus settings, rekalkulasi | Admin |
| **N8N Integration** | Auto-fetch omzet harian dari N8N webhook | System |

---

## 📡 Documentation

| File | Deskripsi |
|------|-----------|
| [docs/README.md](docs/README.md) | Overview & tech stack |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | **API endpoints reference (lengkap)** |
| [docs/FITUR-LENGKAP.md](docs/FITUR-LENGKAP.md) | Fitur lengkap & alur bisnis |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Struktur navigasi aplikasi |
| [docs/SETUP-LOCAL.md](docs/SETUP-LOCAL.md) | Setup development lokal |
| [docs/SETUP-HESTIA.md](docs/SETUP-HESTIA.md) | Deploy production HestiaCP |
| [docs/DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) | Skema database |
| [docs/SECURITY-GUIDE.md](docs/SECURITY-GUIDE.md) | Panduan keamanan |
| [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md) | Backup & disaster recovery |
| [docs/DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md) | Checklist deployment |
| [docs/webhook-transfer-bonus.md](docs/webhook-transfer-bonus.md) | Webhook transfer bonus |
| [docs/N8N-GUIDE.md](docs/N8N-GUIDE.md) | Panduan integrasi N8N |
| [schema_mariadb.sql](schema_mariadb.sql) | Database schema |

---

## 🔐 Security

- **JWT Authentication** dengan expiry 7 hari
- **RBAC** (Role-Based Access Control): Admin, HRD, CS
- **ACID Transactions** untuk semua operasi finansial
- **Parameterized Queries** (anti SQL injection)
- **Bcrypt** password hashing
- **CORS** protection
- **Audit Logging** untuk operasi kritikal

---

**Last Updated**: 2026-06-20
**Version**: v1.2.1
