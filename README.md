# CS Commission System

Production-ready web application untuk sistem komisi Customer Service (CS) berbasis omzet harian.

**Status**: ✅ Production Ready (v1.1) | Built with React 18, TypeScript, Node.js, Express, MariaDB 11.4
**Environment**: Optimized for HestiaCP, ARM vCPU, Tunneling WireGuard.

---

## 🏗️ Arsitektur

### Technology Stack (v1.1)
| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express (REST API) |
| **Database** | MariaDB 11.4 (MySQL Compatible) |
| **Authentication** | JWT + bcrypt |
| **Deployment** | HestiaCP / Nginx Reverse Proxy |
| **Networking** | Cloudflare > WGhub > WGclient (3-Hop) |

### System Layout
```
komcsbybolt/
├── backend/          # Node.js Express Backend
├── src/              # React Frontend Source
├── public/           # Frontend Static Assets
├── schema_mariadb.sql # Database Schema
└── HESTIACP-DEPLOYMENT.md # Production Guide
```

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 18+
- MariaDB 11.4+ (MySQL)

### 1. Setup Database
```bash
# Import schema ke MariaDB
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
- **Email**: `admin@commission.local`
- **Password**: `admin123456`

---

## 📡 Documentation
- [HESTIACP-DEPLOYMENT.md](file:///d:/KOMCSPJBM/komcsbybolt/HESTIACP-DEPLOYMENT.md) - **Panduan Produksi (Penting!)**
- [API-ENDPOINTS.md](file:///d:/KOMCSPJBM/komcsbybolt/API-ENDPOINTS.md) - Daftar API
- [schema_mariadb.sql](file:///d:/KOMCSPJBM/komcsbybolt/schema_mariadb.sql) - Database Schema

---

**Last Updated**: 2026-02-19
**Author**: Antigravity AI
