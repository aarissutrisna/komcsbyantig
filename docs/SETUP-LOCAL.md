# Setup Local (Development/Testing)

Panduan untuk menjalankan proyek secara lokal menggunakan Node.js dan Vite.

## Requirements
- **Node.js**: Minimum `v18.x` (Direkomendasikan `v20.x`)
- **Database**: MariaDB 11.4+ atau MySQL 8.0+
- **npm**: v8+

## 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repo-url> komcsbybolt
cd komcsbybolt

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

## 2. Setup Database & Import Schema

Buat database baru bernama `cs_commission` dan import schema:

```bash
# Login ke MariaDB
mysql -u root -p

# Di dalam MySQL prompt:
CREATE DATABASE cs_commission;
EXIT;

# Import schema
mysql -u root -p cs_commission < schema_mariadb.sql
```

## 3. Environment Variables

Buat file `.env` di dalam folder `/backend`:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password_db_anda
DB_NAME=cs_commission
JWT_SECRET=super_secret_jwt_key_local_minimum_32_characters
N8N_WEBHOOK_SECRET=token_rahasia_untuk_n8n_test
CORS_ORIGIN=http://localhost:5173
```

## 4. Seed Database (Optional)

Isi database dengan data awal (admin user, cabang default):

```bash
cd backend
npm run seed
```

## 5. Menjalankan Mode Development

### Terminal 1 - Backend API
```bash
cd backend
npm run dev
```
Backend akan berjalan di `http://localhost:3000`

### Terminal 2 - Frontend Webapp
```bash
# Di folder root
npm run dev
```
Frontend akan berjalan di `http://localhost:5173` (atau `http://komcs.test:5173` jika dikonfigurasi)

## 6. Login

Buka browser ke `http://localhost:5173` dan login:
- **Email**: `admin@gmail.com`
- **Password**: `admin123`

## 7. Production Build (Optional)

Jika ingin test build production:

```bash
# Build frontend
npm run build

# Serve static files (optional)
npx serve -s dist
```

## 📝 Scripts

| Command | Deskripsi |
|---------|-----------|
| `npm run dev` | Jalankan frontend dev server (Vite) |
| `npm run build` | Build frontend untuk production |
| `npm run preview` | Preview production build |
| `npm run lint` | Jalankan ESLint |
| `npm run typecheck` | Jalankan TypeScript type check |
| `cd backend && npm run dev` | Jalankan backend dev server (nodemon) |
| `cd backend && npm run seed` | Seed database dengan data awal |
| `cd backend && npm run migrate` | Jalankan migrasi database |

## 🔧 Troubleshooting

### Error "ER_OOM" / Out of Memory dari MySQL
Periksa status memori dan besaran `innodb_buffer_pool_size`.

### CORS Error
Pastikan `CORS_ORIGIN` di `.env` backend sesuai dengan URL frontend.

### Port 3000 sudah digunakan
Ubah `PORT` di `.env` backend dan update proxy config di `vite.config.ts`.

### Database connection failed
- Pastikan MariaDB/MySQL service berjalan
- Periksa kredensial di `.env`
- Pastikan database `cs_commission` sudah dibuat

### Frontend tidak bisa connect ke backend
- Pastikan backend berjalan di port 3000
- Periksa proxy config di `vite.config.ts`
- Cek browser console untuk error detail

---
**Last Updated**: 2026-06-20
