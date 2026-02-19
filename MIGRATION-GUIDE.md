# PostgreSQL to MariaDB Migration Guide

Panduan migrasi database dari PostgreSQL ke MariaDB 11.4.

## Perubahan Utama
1. **Driver**: Menggunakan `mysql2/promise` menggantikan `pg`.
2. **Placeholder**: Menggunakan `?` menggantikan `$1, $2`.
3. **UUID**: MariaDB menggunakan `UUID()` function dan kolom `CHAR(36)`.
4. **Conflict Handling**: Menggunakan `ON DUPLICATE KEY UPDATE` menggantikan `ON CONFLICT`.
5. **Data Types**: `JSONB` di PostgreSQL menjadi `JSON` di MariaDB.

## Script Migrasi
Gunakan `schema_mariadb.sql` untuk membuat struktur tabel yang kompatibel.

## Verifikasi
- Jalankan `npm run seed` di folder `backend`.
- Pastikan `DB_PORT` di `.env` adalah `3306`.
