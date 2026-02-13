# Setup Admin - Panduan Cepat

## Masalah: "Invalid Login Credentials"

Anda melihat error ini karena **belum ada user di database**.

## Solusi Tercepat: Buat Admin via Supabase Dashboard

### Langkah 1: Buka Supabase Dashboard

1. Login ke https://supabase.com
2. Pilih project Anda
3. Klik **Authentication** di sidebar kiri
4. Klik tab **Users**

### Langkah 2: Create User Baru

1. Klik tombol **Add User** (pojok kanan atas)
2. Pilih **Create new user**
3. Isi form:
   ```
   Email: admin@komcs.com
   Password: Admin123!
   ```
4. **PENTING**: Centang checkbox **"Auto Confirm User"**
5. Klik **Create User**

### Langkah 3: Copy UUID User

Setelah user dibuat, Anda akan lihat list user.
- **Copy UUID** user yang baru dibuat (contoh: `f47ac10b-58cc-4372-a567-0e02b2c3d479`)

### Langkah 4: Insert ke Tabel Users

1. Klik **SQL Editor** di sidebar kiri
2. Klik **New Query**
3. Paste dan edit SQL ini (ganti UUID dengan UUID dari langkah 3):

```sql
-- GANTI 'UUID_ANDA' dengan UUID yang dicopy dari langkah 3
INSERT INTO users (id, username, nama, role, branch_id, faktor_pengali)
VALUES (
  'UUID_ANDA',  -- GANTI INI!
  'admin',
  'Administrator',
  'admin',
  NULL,
  NULL
);

-- Verifikasi berhasil
SELECT * FROM users WHERE role = 'admin';
```

4. Klik **Run** (atau tekan Ctrl/Cmd + Enter)

### Langkah 5: Login!

Sekarang buka aplikasi dan login dengan:
- **Email**: `admin@komcs.com`
- **Password**: `Admin123!`

---

## Alternatif: Gunakan Email & Password Sendiri

Anda bisa menggunakan email dan password apapun di Langkah 2, misalnya:
- Email: `myname@example.com`
- Password: `MySecurePassword123!`

Kemudian login dengan credential tersebut.

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"
- User sudah ada di tabel `users`
- Coba query: `SELECT * FROM users;` untuk lihat user yang ada
- Atau gunakan UUID user yang berbeda

### Error: "Invalid login credentials" setelah setup
- Pastikan **Auto Confirm User** dicentang saat membuat user
- Atau buka **Authentication** → **Users** → Klik user → Klik **Confirm User**

### Error: "Row Level Security policy violation"
- Pastikan `users.id` sama persis dengan `auth.users.id` (UUID harus match)
- Pastikan role = `'admin'` (huruf kecil semua)

---

## Video Tutorial (Gambaran Visual)

1. **Supabase Dashboard**
   ```
   Sidebar → Authentication → Users → Add User
   ```

2. **Form Create User**
   ```
   ┌─────────────────────────────────┐
   │ Email: admin@komcs.com         │
   │ Password: Admin123!            │
   │ ☑ Auto Confirm User            │
   │                                 │
   │ [Create User]                   │
   └─────────────────────────────────┘
   ```

3. **Copy UUID**
   ```
   Users List:
   ID: f47ac10b-58cc-4372-a567... ← COPY INI
   Email: admin@komcs.com
   ```

4. **SQL Editor**
   ```sql
   INSERT INTO users (id, username, nama, role)
   VALUES ('f47ac10b-58cc-4372-a567...', 'admin', 'Administrator', 'admin');
   ```

5. **Login**
   ```
   Email: admin@komcs.com
   Password: Admin123!
   ```

---

## Sudah Berhasil? Langkah Selanjutnya:

1. **Buat Cabang** (Menu: Cabang → Tambah Cabang)
2. **Buat User HRD & CS** (Menu: Pengguna → Tambah Pengguna)
3. **Input Omzet** (Menu: Data & Kehadiran)
4. **Lihat Komisi Otomatis!**

---

## Butuh Bantuan?

Jika masih error, screenshot error message dan kirim ke developer.
