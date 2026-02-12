# KomCS PJB - Sistem Komisi Customer Service

Aplikasi web production-ready untuk menghitung komisi Customer Service (CS) berbasis omzet harian per cabang dengan sistem multi-role dan Supabase PostgreSQL.

## Fitur Utama

- **Perhitungan Komisi Otomatis** - Berdasarkan target cabang dan faktor pengali
- **Multi-Role Access Control** - Admin, HRD, dan CS dengan permission berbeda
- **Manajemen Kehadiran** - Tracking kehadiran CS harian
- **Sistem Mutasi Komisi** - Pencatatan masuk/keluar komisi
- **Approval Workflow** - Persetujuan penarikan komisi oleh HRD/Admin
- **Real-time Dashboard** - Statistik omzet dan komisi

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Icons**: Lucide React
- **Routing**: React Router v6

## Setup

1. **Clone Repository**
```bash
git clone <repository-url>
cd project
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Variables**

Buat file `.env` dengan konfigurasi Supabase:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Database Setup**

Database schema sudah diterapkan melalui migration Supabase. Struktur tabel:
- `branches` - Data cabang dan target
- `users` - Data pengguna (link ke auth.users)
- `omzet` - Data omzet harian per cabang
- `attendance` - Kehadiran CS
- `commissions` - Komisi yang dihitung
- `commission_mutations` - Mutasi komisi
- `withdrawal_requests` - Permintaan penarikan

5. **Run Development**
```bash
npm run dev
```

6. **Build Production**
```bash
npm run build
```

## Role & Permissions

### Admin
- Full access ke semua data
- CRUD cabang, user, omzet, kehadiran
- Approve withdrawal requests
- Manage commission mutations

### HRD
- Access ke data cabang sendiri
- Manage kehadiran CS di cabang
- Approve withdrawal requests cabang
- View & manage commission mutations

### CS
- View data cabang sendiri (read-only)
- View komisi pribadi
- Submit withdrawal requests
- View mutasi komisi pribadi

## Business Logic

### Perhitungan Komisi

1. **Omzet Harian** = Cash + Piutang
2. **Komisi Global**:
   - Omzet ≥ Target Max → 0.4%
   - Omzet ≥ Target Min → 0.2%
   - Omzet < Target Min → 0%

3. **Distribusi Komisi per CS**:
   - Faktor pengali: 0.75, 0.50, 0.25
   - Kehadiran: 1 (hadir), 0.5 (setengah hari), 0 (absen)
   - Jika 1 CS absen, yang hadir dapat porsi penuh/sebagian sesuai faktor

## Security

- Row Level Security (RLS) enabled di semua tabel
- JWT-based authentication via Supabase Auth
- Role-based access control
- Secure password hashing (bcrypt via Supabase)

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # Main layout with sidebar
│   └── ProtectedRoute.tsx  # Route guard
├── contexts/
│   └── AuthContext.tsx     # Auth state management
├── lib/
│   └── supabase.ts         # Supabase client
├── pages/
│   ├── Login.tsx           # Login page
│   ├── Dashboard.tsx       # Dashboard with stats
│   ├── DataAttendance.tsx  # Omzet & attendance
│   ├── Mutations.tsx       # Commission mutations
│   ├── Branches.tsx        # Branch management (Admin)
│   ├── Users.tsx           # User management (Admin)
│   └── Settings.tsx        # User settings
├── utils/
│   └── currency.ts         # IDR formatting
├── App.tsx                 # Main app with routes
└── main.tsx               # Entry point
```

## Currency Format

Semua nilai uang menggunakan format Rupiah (IDR):
```typescript
formatCurrency(1000000) // "Rp 1.000.000"
```

## Deployment

1. Build production:
```bash
npm run build
```

2. Deploy `dist/` folder ke hosting pilihan (Vercel, Netlify, dll)

3. Set environment variables di platform hosting

## Development Notes

- Gunakan TypeScript untuk type safety
- Follow React hooks best practices
- Implement proper error handling
- Validate user inputs
- Keep components modular and reusable
- Use Tailwind utility classes for styling

## License

Private - Internal Use Only
