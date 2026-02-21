# Skema Database Production (`cs_commission`)

Berikut adalah arsitektur Relational Database Management System (RDBMS) MariaDB/MySQL yang telah dioptimasi.

## 1. Tabel Utama

### `users`
Master data login & role.
- `id` (VARCHAR 36, UUID - *Primary Key*)
- `username` (VARCHAR 100, *Unique*)
- `password` (VARCHAR 255) - Hashed Bcrypt
- `nama` (VARCHAR 100)
- `email` (VARCHAR 100, *Unique*)
- `role` (ENUM: 'admin', 'hrd', 'cs') - Role Based Access Control
- `branch_id` (VARCHAR 10, *Nullable Foreign Key ke branches*) - Home Base Asal
- `phone` (VARCHAR 20)

### `branches`
Master data toko/cabang.
- `id` (VARCHAR 10, *Primary Key*) - contoh: `JTW`, `UTM`, `TSM`.
- `name` (VARCHAR 100)
- `comm_perc_min` (DECIMAL 5,2) - Persen cair target bawah.
- `comm_perc_max` (DECIMAL 5,2) - Persen cair target atas.
- `target_min` (DECIMAL 15,2) - Rupiah bawah.
- `target_max` (DECIMAL 15,2) - Rupiah atas.

### `cs_penugasan` (Transaction Safed)
Tabel rotasi tugas CS dan porsi komisinya. Dijaga ekstra ketat.
- `id` (VARCHAR 36, UUID - *Primary Key*)
- `user_id` (VARCHAR 36, FK ke `users`)
- `cabang_id` (VARCHAR 10, FK ke `branches`)
- `tanggal_mulai` (DATE)
- `tanggal_selesai` (DATE, *Nullable*) - CS Off/Resign.
- `faktor_komisi` (DECIMAL 3,2) - `CHECK(faktor_komisi > 0 AND faktor_komisi <= 1.00)`
- **`UNIQUE KEY`**: `(user_id, cabang_id, tanggal_mulai)` anti-double-booking.

### `omzet`
Rekod cashflow kiriman N8N.
- `id` (VARCHAR 36, UUID - *Primary Key*)
- `branch_id` (VARCHAR 10, FK ke `branches`)
- `date` (DATE)
- `cash` (DECIMAL 15,2)
- `piutang` (DECIMAL 15,2)
- **`UNIQUE KEY`**: `(branch_id, date)`

### `attendance_data`
Rekod impor absen massal via CSV/Admin.
- `id` (VARCHAR 36, UUID - *Primary Key*)
- `user_id` (VARCHAR 36, FK ke `users`)
- `branch_id` (VARCHAR 10, FK ke `branches`)
- `tanggal` (DATE)
- `kehadiran` (DECIMAL 3,2)
- **`UNIQUE KEY`**: `(user_id, branch_id, tanggal)`

### `commissions`
Tabel hasil akhir (Read-Heavy). Data ini selalu bisa di-destroy dan dibangun ulang dari persekutan Omzet x Penugasan x Attendance.
- `id` (VARCHAR 36, UUID - *Primary Key*)
- `user_id` (VARCHAR 36, FK ke `users`)
- `branch_id` (VARCHAR 10, FK ke `branches`)
- `omzet_total` (DECIMAL 15,2)
- `commission_amount` (DECIMAL 15,2) - Hasil Cair Rp.
- `komisi_percent` (DECIMAL 5,2) - Mengikuti bracket Min/Max cabang.
- `porsi_percent` (DECIMAL 5,2) - Porsi Faktor Komisi.
- `kehadiran` (DECIMAL 3,2)
- `snapshot_meta` (JSON)
- `period_start` (DATE) & `period_end` (DATE)

## 2. Integrity & Constraint Hardening
- Seluruh Foreign Key dilengkapi `ON DELETE CASCADE` / `RESTRICT` tergantung signifikansinya.
- Index telah dipasang pada `tanggal_mulai` dan `tanggal_selesai` untuk `cs_penugasan` agar hitungan Query `FOR UPDATE` saat transaksi kilat.
