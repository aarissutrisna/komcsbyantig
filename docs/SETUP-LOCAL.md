# Setup Local (Development/Testing) Lingkungan

Panduan untuk menarik repositori dan menjalankannya secara lokal menggunakan Node.js dan Vite.

## Requirements
- **Node.js**: Minimum `v18.x` (Direkomendasikan `v20.x`)
- **Database**: MariaDB 10.x atau MySQL 8.0+

## 1. Install Dependencies
Buka terminal dan unduh semua modul:
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

## 2. Setup Database & Import Schema
Buat database baru bernama `cs_commission`.
Jika Anda memiliki file schema terbaru (disarankan versi hardened), import schema tersebut:
```bash
mysql -u root -p -e "CREATE DATABASE cs_commission;"
mysql -u root -p cs_commission < docs/database/schema_final.sql
```

## 3. Environment Variables
Buat file `.env` di dalam folder `/backend`:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=password_db_anda
DB_NAME=cs_commission
JWT_SECRET=super_secret_jwt_key_local
N8N_WEBHOOK_SECRET=token_rahasia_untuk_n8n_test
```

## 4. Menjalankan Mode Development
### Backend API
Buka terminal 1:
```bash
cd backend
npm run dev
```

### Frontend Webapp
Buka terminal 2:
```bash
cd ..
npm run dev
```
Buka browser pada `http://localhost:5173`.

## 5. Menyiapkan Mode Production (Membangun Asset)
Jika Anda ingin mengetes kapabilitas production:
```bash
# Build Frontend
npm run build

# Menjalankan Frontend statis (optional menggunakan serve)
npx serve -s dist
```

## Troubleshooting
- **Error "ER_OOM" / Out of Memory dari MySQL**: Periksa status memori Anda dan besaran `innodb_buffer_pool_size`.
- **CORS Error**: Pastikan frontend VITE mereferensikan endpoint backend di `localhost:3000` melalui file konfigurasi Vite/env.
- **Unauthorized dari N8N Sim**: Pastikan Anda mengirimkan header `Authorization: Bearer <token_sama>` di API client (seperti Postman).
