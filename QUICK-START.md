# Quick Start - 5 Menit

Setup lokal untuk development.

## Prerequisites

- Node.js 18+
- MariaDB 11.4+ (MySQL compatible)
- npm

## 1. Setup Database (2 menit)

```bash
# Login ke MariaDB dan buat database
mysql -u root -p -e "CREATE DATABASE cs_commission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# Jalankan skema
mysql -u root -p cs_commission < schema_mariadb.sql
```

## 2. Setup Backend (1.5 menit)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` dengan kredensial MariaDB Anda:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cs_commission
DB_USER=root
DB_PASSWORD=password_anda
JWT_SECRET=your_super_secret_key_minimum_32_characters
N8N_WEBHOOK_SECRET=token_rahasia_untuk_n8n_test
CORS_ORIGIN=http://localhost:5173
```

Seed database dengan test data:
```bash
npm run seed
```

Start backend:
```bash
npm run dev
```

Backend akan berjalan di `http://localhost:3000`

## 3. Setup Frontend (1.5 menit)

Buka terminal baru di folder utama:

```bash
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:5173` (atau `http://komcs.test:5173` jika dikonfigurasi)

## 4. Test Login

1. Buka http://localhost:5173
2. Login dengan:
   - Email: `admin@gmail.com`
   - Password: `admin123`

## Done! 🚀

### Next Steps

- Cek [docs/SETUP-LOCAL.md](docs/SETUP-LOCAL.md) untuk troubleshooting
- Cek [EXAMPLE-REQUESTS.md](EXAMPLE-REQUESTS.md) untuk contoh API
- Cek [docs/API-REFERENCE.md](docs/API-REFERENCE.md) untuk dokumentasi API lengkap

---
**Last Updated**: 2026-06-20
