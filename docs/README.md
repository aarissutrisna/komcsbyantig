# Komisi CS PJB System - Dokumentasi Teknis

Sistem arsitektur finansial untuk mengelola target omzet cabang, menghitung performa (kehadiran & komisi) Customer Service secara otomatis, dan berintegrasi secara end-to-end dengan ekosistem automasi N8N.

## 🌟 Fitur Utama

- **Automasi N8N Terintegrasi**: Sinkronisasi Omzet & Piutang harian langsung dari alur transaksi.
- **Transaction-Safe (ACID Compliant)**: Mutasi dan kalkulasi anti-ganda. Row-level lock diaplikasikan pada semua modul finansial.
- **Smart Quota CS**: Batasan kuota (maksimal porsi 100%) tiap cabang dengan algoritma pendeteksi pengunduran diri/pemindahan cabang otomatis.
- **Manajemen Historis Bulk**: Menerima import presensi harian secara CSV dan merevisi omzet masa lalu dengan rekalkulasi aman.
- **Transfer Item Bonus**: Modul tracking transfer barang bonus antar cabang dengan kalkulasi bonus otomatis berbasis omzet.
- **Bonus Calculation Settings**: Konfigurasi nilai pembagi dan pengali bonus yang dapat disesuaikan oleh Admin.

## 🏗 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express (REST API, ESM) |
| **Database** | MariaDB 11.4 (MySQL Compatible) |
| **Authentication** | JWT + bcrypt |
| **Deployment** | HestiaCP / Nginx Reverse Proxy |
| **Networking** | Cloudflare > WGhub > WGclient (3-Hop) |

## 📁 Struktur Folder

```
komcsbybolt/
├── backend/              # Node.js Express Backend
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
│   ├── contexts/         # React context providers
│   ├── pages/            # Page components
│   ├── services/         # API client
│   └── App.tsx           # Root component
├── docs/                 # Technical documentation
├── schema_mariadb.sql    # Database schema
└── package.json
```

## 🚀 Quick Start

Lihat `docs/SETUP-LOCAL.md` untuk menjalankan proyek di komputer Anda secara lokal, atau `docs/SETUP-HESTIA.md` untuk panduan deploy production di VPS panel Hestia.

## 📖 Dokumentasi

| File | Deskripsi |
|------|-----------|
| [docs/README.md](docs/README.md) | Overview & tech stack |
| [docs/API-REFERENCE.md](docs/API-REFERENCE.md) | API endpoints reference |
| [docs/FITUR-LENGKAP.md](docs/FITUR-LENGKAP.md) | Fitur lengkap & alur bisnis |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Struktur navigasi aplikasi |
| [docs/SETUP-LOCAL.md](docs/SETUP-LOCAL.md) | Setup development lokal |
| [docs/SETUP-HESTIA.md](docs/SETUP-HESTIA.md) | Deploy production HestiaCP |
| [docs/DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) | Skema database |
| [docs/SECURITY-GUIDE.md](docs/SECURITY-GUIDE.md) | Panduan keamanan |
| [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md) | Backup & disaster recovery |
| [docs/DEPLOYMENT-CHECKLIST.md](docs/DEPLOYMENT-CHECKLIST.md) | Checklist deployment |
| [docs/webhook-transfer-bonus.md](docs/webhook-transfer-bonus.md) | Webhook transfer bonus |

## 🛡️ Status

**Production Ready** (v1.2.1). Sistem dipastikan telah dibersihkan dari seluruh modul simulasi, dummy, dan endpoint *testing* eksperimen.

---
**Last Updated**: 2026-06-20
