# KomCS PJB - Sistem Komisi Customer Service

Aplikasi web production-ready untuk menghitung komisi Customer Service (CS) berbasis omzet harian per cabang dengan sistem multi-role dan Supabase PostgreSQL.

**Status**: ✅ Production Ready | Built with React 18, TypeScript, Vite, Supabase

---

## 📋 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [Role & Permissions](#role--permissions)
- [Business Logic](#business-logic)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Fitur Utama

- ✅ **Perhitungan Komisi Otomatis** - Berdasarkan omzet dan faktor pengali
- ✅ **Multi-Role Access Control** - Admin, HRD, dan CS dengan permission berbeda
- ✅ **Manajemen Kehadiran** - Tracking kehadiran CS harian
- ✅ **Dashboard Real-time** - Statistik omzet dan komisi per cabang
- ✅ **Sistem Mutasi** - Pencatatan dan tracking mutasi komisi
- ✅ **Row Level Security** - Data terlindungi per role dan cabang
- ✅ **Responsive UI** - Mobile-friendly design dengan Tailwind CSS

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + PostCSS |
| **Icons** | Lucide React |
| **Routing** | React Router v7 |
| **Backend** | Supabase (PostgreSQL + Auth + RLS) |
| **Build Size** | 101.89 kB gzip (production) |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd project
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env dengan Supabase credentials Anda
```

Dapatkan values dari [Supabase Dashboard](https://app.supabase.com):
- Settings → API → Project URL = `VITE_SUPABASE_URL`
- Settings → API → Anon Key = `VITE_SUPABASE_ANON_KEY`

### 3. Create First Admin Account

⚠️ **WAJIB**: Tidak ada default admin account!

```bash
# 1. Buka Supabase Dashboard → Authentication → Users
# 2. Click "Add User" → Create New User
#    - Email: admin@komcs.com
#    - Password: Admin123!
#    - Auto Confirm: ✓
# 3. Copy UUID dari user yang baru dibuat

# 4. Jalankan SQL di Supabase SQL Editor:
INSERT INTO users (id, username, nama, role)
VALUES ('PASTE_UUID_DISINI', 'admin', 'Administrator', 'admin');

# 5. Login dengan admin@komcs.com / Admin123!
```

Baca `SETUP.md` untuk panduan lengkap.

### 4. Development Server

```bash
npm run dev
# Akses: http://localhost:5173
```

### 5. Production Build

```bash
npm run build
npm run preview
```

Build output ada di `dist/` folder → ready untuk deployment!

---

## 📊 Database Setup

Tabel-tabel utama yang sudah dibuat:

| Tabel | Deskripsi |
|-------|-----------|
| `branches` | Data cabang/toko |
| `users` | Profile pengguna (linked to auth.users) |
| `attendance_data` | Kehadiran dan omzet harian |
| `mutations` | Mutasi komisi antar cabang |

**Fitur Security:**
- ✅ RLS enabled di semua tabel
- ✅ Role-based policies
- ✅ Auto timestamp update
- ✅ Auto komisi calculation

Lihat `supabase/migrations/` untuk skema lengkap.

---

## 👥 Role & Permissions

### Admin
| Feature | Access |
|---------|--------|
| View Dashboard | ✅ All data |
| Manage Cabang | ✅ Full |
| Manage Users | ✅ Full |
| Manage Attendance | ✅ Full |
| Manage Mutations | ✅ Full |

### HRD
| Feature | Access |
|---------|--------|
| View Dashboard | ✅ Own branch only |
| Manage Users | ✅ Own branch |
| Manage Attendance | ✅ Own branch |
| View Mutations | ✅ Own branch |

### CS
| Feature | Access |
|---------|--------|
| View Dashboard | ✅ Own data |
| Input Attendance | ✅ Own records |
| View Mutations | ✅ Own records |

---

## 💰 Business Logic

### Perhitungan Komisi

**Formula:**
```
Komisi Global = Omzet × Persentase
- Jika Omzet >= Target Max → 0.4%
- Jika Omzet >= Target Min → 0.2%
- Jika Omzet < Target Min → 0%

Komisi CS = Komisi Global × Faktor Pengali
```

**Contoh:**
- Omzet: Rp 150 juta
- Target Min: Rp 50 juta
- Target Max: Rp 100 juta
- Komisi Global = 150 juta × 0.4% = Rp 600 ribu

**Distribusi ke CS:**
- CS dengan faktor 0.75: Rp 600K × 0.75 = Rp 450K
- CS dengan faktor 0.50: Rp 600K × 0.50 = Rp 300K
- CS dengan faktor 0.25: Rp 600K × 0.25 = Rp 150K

---

## 📁 Project Structure

```
project/
├── src/
│   ├── components/           # Reusable components
│   │   ├── Layout.tsx        # Main layout with sidebar
│   │   └── ProtectedRoute.tsx # Route guard
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state management
│   ├── lib/
│   │   └── supabase.ts       # Supabase client config
│   ├── pages/                # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DataAttendance.tsx
│   │   ├── Mutations.tsx
│   │   ├── Branches.tsx
│   │   ├── Users.tsx
│   │   └── Settings.tsx
│   ├── utils/
│   │   └── currency.ts       # Currency formatting
│   ├── App.tsx               # Main app with routes
│   ├── index.css             # Global styles
│   └── main.tsx              # Entry point
├── supabase/
│   └── migrations/           # Database migrations
├── dist/                     # Production build (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── .env                      # ⚠️ Don't commit this!
```

---

## 🔨 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Code Quality

- ✅ TypeScript for type safety
- ✅ ESLint for code consistency
- ✅ Tailwind CSS for styling
- ✅ React hooks best practices
- ✅ Component-based architecture

---

## 🚀 Deployment

### Quick Deploy to Popular Platforms

**Vercel (Recommended)**
```bash
npm i -g vercel
vercel
```

**Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**Traditional VPS/Nginx**

See `DEPLOYMENT.md` for detailed instructions for:
- HestiaCP + Nginx setup
- Wireguard VPN configuration
- Cloudflare SSL setup
- Environment variables
- Monitoring & logs

**Build Requirements:**
- Node.js 16+ (LTS recommended)
- npm 7+
- Disk space: ~500MB for node_modules + build

**Output Size:**
- `dist/index.html`: 0.71 kB
- CSS (gzipped): 3.58 kB
- JS (gzipped): 101.89 kB
- **Total: ~120 kB gzipped** ✅ Very lightweight!

---

## 🔐 Security

### Built-in Security Features

- ✅ **RLS Policies** - Row Level Security pada semua tabel
- ✅ **JWT Auth** - Secure token-based authentication
- ✅ **Password Hashing** - bcrypt via Supabase
- ✅ **CORS Configuration** - Supabase CORS enabled
- ✅ **Role-based Access** - Fine-grained permissions
- ✅ **No Secrets in Code** - All credentials in .env
- ✅ **XSS Protection** - React sanitization
- ✅ **CSRF Protection** - HTTPS + SameSite cookies

### Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Use environment variables** - All secrets in `.env`
3. **Keep dependencies updated** - `npm audit && npm update`
4. **Review RLS policies** - Ensure access control is correct
5. **Use HTTPS in production** - Always! (Cloudflare recommended)

---

## 🆘 Troubleshooting

### "Row Level Security policy violation"

**Cause**: User ada di `auth.users` tapi belum di tabel `users`

**Fix**:
```sql
-- Check if user exists in users table
SELECT * FROM users WHERE id = 'user-id-here';

-- If not exists, insert:
INSERT INTO users (id, username, nama, role)
VALUES ('user-id', 'username', 'Full Name', 'admin');
```

### "Cannot connect to Supabase"

**Fix**:
1. Verify `.env` file exists
2. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart dev server: `npm run dev`

### "Blank page in production"

**Fix**:
1. Check browser console for errors (F12)
2. Verify build: `npm run build && npm run preview`
3. Check `dist/index.html` exists
4. Verify web server is serving `dist/` folder
5. For SPA: configure web server to serve `index.html` for all routes

### "Login not working"

**Checklist**:
- [ ] User exists in `auth.users`
- [ ] User exists in `users` table
- [ ] User IDs match between both tables
- [ ] Role is valid: 'admin', 'hrd', or 'cs'

---

## 📚 Documentation

### Setup & Deployment
- **SETUP.md** - Quick start guide untuk development
- **SETUP-SELF-HOSTED.md** - Setup Supabase self-hosted di VPS
- **DEPLOYMENT.md** - Deployment ke production (VPS, Cloud, dll)
- **PRODUCTION-SETUP.md** - Production checklist & verification

### Backend & Integration
- **BACKEND-SETUP.md** - Edge Functions & serverless backend
- **N8N-INTEGRATION.md** - N8N webhook integration untuk auto-sync omzet
- **COMPLETE-SETUP.md** - Complete system overview & architecture

### External Links
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **Tailwind Docs**: https://tailwindcss.com/docs
- **N8N Docs**: https://docs.n8n.io

---

## 📄 License

Private - Internal Use Only

---

## 📝 Changelog

### v0.0.0 (Initial Release)
- ✅ Initial schema with 4 main tables
- ✅ Multi-role authentication (Admin, HRD, CS)
- ✅ RLS policies for data security
- ✅ Responsive dashboard with React + Tailwind
- ✅ Real-time komisi calculation
- ✅ Complete deployment documentation

---

**Last Updated**: February 2026 | **Node.js**: 16+ | **Package Manager**: npm 7+
