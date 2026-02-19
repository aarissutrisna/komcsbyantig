# Quick Start - 5 Menit

Setup lokal untuk development.

## Prerequisites

- Node.js 18+
- MariaDB 11.4+ (MySQL compatible)
- npm

## 1. Setup Database (2 menit)

```bash
# Login ke MariaDB dan buat database
mysql -u root -p -e "CREATE DATABASE cs_commission"

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
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cs_commission
DB_USER=root
DB_PASSWORD=password_anda
```

Seed database dengan test data:
```bash
npm run seed
```

Start backend:
```bash
npm run dev
```

## 3. Setup Frontend (1.5 menit)

Buka terminal baru di folder utama:

```bash
npm install
npm run dev
```

## 4. Test Login

1. Buka http://localhost:5173
2. Login dengan:
   - Email: `admin@gmail.com`
   - Password: `admin123`

## Done!🚀
