# Quick Start - 5 Menit

Setup lokal untuk development.

## Prerequisites

- Node.js 16+
- PostgreSQL 12+
- npm atau yarn

## 1. Setup Database (2 menit)

```bash
createdb cs_commission
psql -d cs_commission -f schema.sql
```

Output:
```
CREATE TABLE
CREATE TABLE
CREATE INDEX
INSERT 0 3
```

## 2. Setup Backend (1.5 menit)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` dengan PostgreSQL credentials Anda:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_commission
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key_min_32_chars
```

Seed database dengan test data:
```bash
npm run seed
```

Output:
```
Seeding database...
Database seeded successfully!

Test accounts:
- Email: admin@commission.local | Password: admin123456 | Role: admin
- Email: hrd@commission.local | Password: admin123456 | Role: hrd
- Email: cs1@commission.local | Password: cs123456 | Role: cs
```

Start backend:
```bash
npm run dev
```

Output:
```
Server running at http://localhost:3000
Environment: development
```

## 3. Setup Frontend (1.5 menit)

Di terminal baru:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Output:
```
VITE v5.4.8  ready in 205 ms
➜  Local:   http://localhost:5173/
```

## 4. Test Login (Instant)

1. Buka http://localhost:5173
2. Login dengan:
   - Email: `admin@commission.local`
   - Password: `admin123456`
3. Anda akan melihat dashboard

## 5. Test API (Instant)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@commission.local","password":"admin123456"}'
```

Response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "uuid...",
    "email": "admin@commission.local",
    "role": "admin"
  }
}
```

## Done!

Backend: http://localhost:3000
Frontend: http://localhost:5173

## Next Steps

- Baca `README.md` untuk overview lengkap
- Lihat `API-ENDPOINTS.md` untuk semua endpoints
- Lihat `SETUP.md` untuk production deployment
- Check `EXAMPLE-REQUESTS.md` untuk curl examples

## Troubleshooting

**Error: Cannot connect to PostgreSQL**
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Or start it
sudo systemctl start postgresql
```

**Error: Port 3000 already in use**
```bash
# Kill process using port 3000
sudo lsof -i :3000
kill -9 <PID>
```

**Error: npm run seed fails**
- Pastikan database sudah created: `createdb cs_commission`
- Pastikan schema.sql sudah dijalankan: `psql -d cs_commission -f schema.sql`
- Check `.env` credentials

**Error: Cannot connect to backend from frontend**
- Check `VITE_API_BASE_URL` di `frontend/.env`
- Harus sama dengan backend URL (default: `http://localhost:3000/api`)
