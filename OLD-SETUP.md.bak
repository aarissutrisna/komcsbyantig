# Setup KomCS PJB

## Membuat Admin Pertama

Karena sistem menggunakan Supabase Authentication, admin pertama harus dibuat melalui langkah berikut:

### Langkah 1: Buat User via Supabase Dashboard

1. Buka Supabase Dashboard → Authentication → Users
2. Klik "Add User" → "Create New User"
3. Isi data:
   - **Email**: `admin@komcs.com` (atau email pilihan Anda)
   - **Password**: `Admin123!` (atau password pilihan Anda)
   - Auto Confirm User: **Centang**
4. Klik "Create User"
5. **Catat UUID user** yang baru dibuat (contoh: `a1b2c3d4-...`)

### Langkah 2: Insert ke Tabel Users

Jalankan SQL ini di Supabase SQL Editor (ganti `USER_ID` dengan UUID dari langkah 1):

```sql
INSERT INTO users (id, username, nama, role, branch_id, faktor_pengali)
VALUES (
  'USER_ID_DARI_LANGKAH_1',  -- Ganti dengan UUID yang dicatat
  'admin',
  'Administrator',
  'admin',
  NULL,
  NULL
);
```

### Langkah 3: Login ke Aplikasi

Sekarang Anda bisa login dengan:
- **Email/Username**: `admin@komcs.com` (atau email yang Anda gunakan)
- **Password**: `Admin123!` (atau password yang Anda gunakan)

---

## Membuat Cabang & User CS/HRD

Setelah login sebagai Admin:

### 1. Buat Cabang
- Menu: **Cabang** → **Tambah Cabang**
- Isi:
  - Nama: Contoh "Cabang Jakarta"
  - Target Min: 50000000 (Rp 50 juta untuk komisi 0.2%)
  - Target Max: 100000000 (Rp 100 juta untuk komisi 0.4%)
  - Endpoint N8N: (opsional)

### 2. Buat User HRD
- Menu: **Pengguna** → **Tambah Pengguna**
- Isi:
  - Email: `hrd.jakarta@komcs.com`
  - Password: `HRD123!`
  - Username: `hrd_jakarta`
  - Nama: `HRD Jakarta`
  - Role: **HRD**
  - Cabang: Pilih cabang yang sudah dibuat
  - Faktor: (kosongkan untuk HRD)

### 3. Buat User CS
- Menu: **Pengguna** → **Tambah Pengguna**
- Isi:
  - Email: `cs1.jakarta@komcs.com`
  - Password: `CS123!`
  - Username: `cs1_jakarta`
  - Nama: `CS 1 Jakarta`
  - Role: **CS**
  - Cabang: Pilih cabang yang sama
  - Faktor: **0.75** (CS utama)

Ulangi untuk CS kedua dengan faktor **0.50** atau **0.25**

---

## Input Data Omzet & Kehadiran

### Sebagai HRD atau Admin:

1. **Menu: Data & Kehadiran**
2. **Tambah Omzet**: Input cash & piutang per hari
3. **Atur Kehadiran**: Set status CS (Hadir/Setengah/Absen)

Komisi akan dihitung otomatis berdasarkan:
- Omzet vs Target cabang
- Faktor pengali CS
- Status kehadiran

---

## Logic Perhitungan Komisi

### Formula:
```
Komisi Global = Omzet × Persentase Komisi
- Jika Omzet >= Target Max → 0.4%
- Jika Omzet >= Target Min → 0.2%
- Jika Omzet < Target Min → 0%

Komisi CS = Komisi Global × Faktor Pengali × Status Kehadiran
```

### Aturan Pembagian (2 CS per cabang):
- **Kedua CS Hadir**: Dapat sesuai faktor masing-masing
- **1 CS Hadir**:
  - Faktor 0.75 atau 0.50 → dapat 100%
  - Faktor 0.25 → dapat 50%
- **Setengah Hari**: 50% dari hak komisi
- **Absen**: 0%

---

## Environment Variables

Buat file `.env` dengan isi:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

---

## Deploy

Build folder `dist/` siap di-deploy ke:
- **Vercel**: Connect repository dan auto-deploy
- **Netlify**: Drag & drop folder dist/
- **Nginx/Apache**: Copy folder dist/ ke web root

Jangan lupa set Environment Variables di platform hosting!

---

## Troubleshooting

### "Missing Supabase environment variables"
- Pastikan file `.env` ada dan terisi dengan benar
- Restart dev server setelah menambah `.env`

### "Row Level Security policy violation"
- Pastikan user sudah ada di tabel `users` dengan role yang benar
- Role harus match dengan id user di `auth.users`

### User tidak bisa login
- Cek apakah user sudah ada di `auth.users` DAN `users` table
- Pastikan `users.id` sama dengan `auth.users.id`

---

## Struktur Database

- `branches` - Data cabang dan target
- `users` - Profile pengguna (terhubung ke auth.users)
- `omzet` - Data omzet harian per cabang
- `attendance` - Kehadiran CS per hari
- `commissions` - Komisi yang dihitung per CS per hari
- `commission_mutations` - Transaksi komisi (masuk/keluar)
- `withdrawal_requests` - Pengajuan penarikan komisi CS

Semua tabel sudah dilengkapi RLS untuk keamanan data per role.
