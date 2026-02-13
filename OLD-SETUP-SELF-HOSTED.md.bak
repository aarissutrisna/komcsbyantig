# Self-Hosted Supabase Setup untuk Production

Panduan ini untuk setup Supabase yang di-host sendiri di VPS (bukan menggunakan Supabase Cloud).

## Prasyarat

- VPS dengan Ubuntu 22.04+
- Docker & Docker Compose terinstal
- Domain atau IP VPS
- Minimal 2 vCPU, 4GB RAM (6GB lebih baik)

## Opsi Setup

### Opsi A: Docker Compose (Recommended untuk VPS)

#### 1. Download Supabase Self-Hosted

```bash
# SSH ke VPS
ssh username@your-vps-ip

# Clone supabase repository
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Copy environment template
cp .env.example .env
```

#### 2. Edit `.env` di Server

```bash
# Edit dengan editor pilihan Anda
nano .env
```

Penting untuk update (minimal):

```env
# Database
POSTGRES_PASSWORD=your-strong-password-here

# JWT Secret (generate random 64 char string)
JWT_SECRET=your-jwt-secret-64-chars-random-string

# Site URL (domain atau IP VPS Anda)
SITE_URL=http://localhost:3000

# API External URL (untuk frontend access dari luar)
API_EXTERNAL_URL=https://your-vps-domain.com
```

#### 3. Run Supabase dengan Docker Compose

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Tunggu sampai semua services running (biasanya 2-3 menit).

#### 4. Access Supabase Studio

Buka browser ke: `http://your-vps-ip:3000` atau `https://your-vps-domain.com:3000`

Default credentials ada di `.env`:
- Email: `supabase@example.com`
- Password: Lihat `DASHBOARD_PASSWORD` di `.env`

### Opsi B: Managed Supabase Self-Hosted (Alternative)

Jika tidak ingin manage Docker, gunakan Supabase Cloud dengan URL pointing ke VPS, tapi ini lebih kompleks dan tidak recommended untuk production.

## Database Setup

### 1. Buat Database Baru

Di Supabase Studio:

1. Buka **SQL Editor**
2. Jalankan migration dari aplikasi:

```bash
# Dari folder aplikasi lokal
npm run build
```

3. Copy isi file: `supabase/migrations/20260212142142_create_initial_schema.sql`
4. Paste di Supabase SQL Editor
5. Run query

### 2. Verifikasi Tabel Dibuat

Di Supabase Studio → **Tables** section, pastikan ada tabel:

- ✓ `branches`
- ✓ `users`
- ✓ `attendance_data`
- ✓ `mutations`

Semua tabel harus punya RLS enabled.

### 3. Create First Admin User

Di Supabase Studio → **Authentication** → **Users**:

1. Click "Add User"
2. Isi:
   - Email: `admin@komcs.com`
   - Password: Strong password
   - Check "Auto Confirm User"
3. Copy UUID yang dibuat (dari Created column)

Kemudian di **SQL Editor**, jalankan:

```sql
INSERT INTO users (id, username, nama, role, branch_id, faktor_pengali)
VALUES (
  'PASTE_UUID_HERE',
  'admin',
  'Administrator',
  'admin',
  NULL,
  NULL
);
```

## Connect Frontend ke Self-Hosted Supabase

### 1. Get API Keys

Di Supabase Studio → **Settings** → **API**:

- Copy `Project URL` (misal: `http://localhost:8000` atau `https://your-domain.com`)
- Copy `anon public` key

### 2. Update `.env` Aplikasi

File `.env` di folder aplikasi:

```env
# Self-Hosted Supabase
VITE_SUPABASE_URL=http://your-vps-ip:8000
VITE_SUPABASE_ANON_KEY=eyJhbGc... (paste anon key)
```

Atau jika pakai domain dengan SSL:

```env
VITE_SUPABASE_URL=https://supabase.your-domain.com
VITE_SUPABASE_ANON_KEY=eyJhbGc... (paste anon key)
```

### 3. Build Aplikasi

```bash
npm install
npm run build
```

Hasil build ada di folder `dist/`

## Deploy Frontend ke VPS

### Via Nginx (Static Files)

```bash
# SSH ke VPS
ssh username@your-vps-ip

# Buat directory
mkdir -p /var/www/komcs-app
cd /var/www/komcs-app

# Upload dist folder (dari local machine)
scp -r dist/* username@your-vps-ip:/var/www/komcs-app/
```

### Configure Nginx

Edit `/etc/nginx/sites-available/komcs.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/komcs-app;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable config:

```bash
sudo ln -s /etc/nginx/sites-available/komcs.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup HTTPS (Cloudflare)

1. **Di Cloudflare Dashboard**:
   - Add domain
   - Change nameservers to Cloudflare
   - DNS → Add A record pointing to VPS IP
   - SSL/TLS → Set to "Full"

2. **Nginx** akan auto-redirect HTTP → HTTPS via Cloudflare

## Verifikasi Setup

```bash
# 1. Check Supabase services running
docker-compose ps

# 2. Access Supabase Studio
curl http://localhost:3000

# 3. Test database connection
curl -X GET http://localhost:8000/rest/v1/branches \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# 4. Check Nginx
sudo systemctl status nginx

# 5. Test frontend
curl http://localhost
```

## Troubleshooting

### Supabase containers tidak jalan

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Full reset (WARNING: akan hapus data!)
docker-compose down
docker-compose up -d
```

### Database koneksi error

```bash
# SSH ke VPS
docker-compose logs postgres

# Cek password di .env sudah benar
grep POSTGRES_PASSWORD .env
```

### Frontend tidak bisa connect ke Supabase

1. Pastikan `.env` punya URL yang benar
2. Cek CORS di Supabase: Settings → API → CORS
3. Network request di browser console untuk error detail

### SSL/HTTPS tidak jalan

- Pastikan domain sudah pointing ke VPS IP
- Tunggu DNS propagation (5-15 menit)
- Cloudflare SSL mode set ke "Full"

## Maintenance

### Backup Database

```bash
docker-compose exec postgres pg_dump -U postgres postgres > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres < backup.sql
```

### Update Supabase

```bash
cd supabase/docker
git pull
docker-compose pull
docker-compose up -d
```

### Monitoring

```bash
# Check resource usage
docker stats

# Check logs
docker-compose logs -f --tail=100
```

## Next Steps

1. ✓ Setup Supabase self-hosted dengan Docker
2. ✓ Setup database dan create admin user
3. ✓ Update frontend `.env` dengan Supabase credentials
4. ✓ Build dan deploy frontend
5. ✓ Setup Nginx dan HTTPS
6. ✓ Test aplikasi

Aplikasi siap production!
