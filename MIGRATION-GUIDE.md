# PostgreSQL to MariaDB Migration Guide

Panduan migrasi database dari PostgreSQL ke MariaDB 11.4.

## Status

✅ **Migration Completed** - Sistem sudah sepenuhnya menggunakan MariaDB 11.4.

## Perubahan Utama

| Aspek | PostgreSQL | MariaDB |
|-------|-----------|---------|
| **Driver** | `pg` | `mysql2/promise` |
| **Placeholder** | `$1, $2, $3` | `?` |
| **UUID** | `uuid_generate_v4()` | `UUID()` function, kolom `CHAR(36)` |
| **Conflict Handling** | `ON CONFLICT ... DO UPDATE` | `ON DUPLICATE KEY UPDATE` |
| **Data Types** | `JSONB` | `JSON` |
| **Boolean** | `BOOLEAN` | `TINYINT(1)` |
| **Serial/Auto-increment** | `SERIAL` | `AUTO_INCREMENT` |
| **Date Functions** | `NOW()`, `CURRENT_DATE` | `NOW()`, `CURRENT_DATE` (compatible) |
| **String Functions** | PostgreSQL-specific | MySQL-compatible |

## Script Migrasi

Gunakan `schema_mariadb.sql` untuk membuat struktur tabel yang kompatibel:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE cs_commission CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u root -p cs_commission < schema_mariadb.sql
```

## Verifikasi

### 1. Check Tables
```bash
mysql -u root -p cs_commission -e "SHOW TABLES;"
```

Expected tables:
- `users`
- `branches`
- `omzet`
- `attendance_data`
- `commissions`
- `user_cabang_history`
- `cabang_user_allocation`
- `withdrawal_requests`
- `system_settings`
- `audit_logs`

### 2. Seed Database
```bash
cd backend
npm run seed
```

### 3. Verify Connection
```bash
# Check DB_PORT in .env is 3306 (not 5432)
grep DB_PORT backend/.env
```

## Code Changes Required

### Before (PostgreSQL)
```javascript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const result = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);
```

### After (MariaDB)
```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const [rows] = await pool.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);
```

## Environment Variables

Update `.env` file:

```env
# PostgreSQL (old)
# DB_HOST=localhost
# DB_PORT=5432
# DATABASE_URL=postgresql://user:pass@localhost:5432/cs_commission

# MariaDB (new)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=cs_commission
```

## Testing

1. Start backend: `cd backend && npm run dev`
2. Test API endpoint:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok","message":"Server is running"}
   ```
3. Test database query via API:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@gmail.com","password":"admin123"}'
   ```

## Rollback Plan

Jika terjadi masalah, rollback ke PostgreSQL:

1. Restore PostgreSQL backup
2. Revert code changes (git checkout previous commit)
3. Update `.env` to PostgreSQL config
4. Restart backend

## Notes

- MariaDB 11.4 is MySQL-compatible
- All existing queries have been converted
- UUID generation now uses `UUID()` function
- JSON columns use `JSON` type instead of `JSONB`
- Boolean values stored as `TINYINT(1)` (0/1)

---
**Last Updated**: 2026-06-20
