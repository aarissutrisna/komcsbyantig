# Deployment Guide: VPS dengan Self-Hosted Supabase

Aplikasi ini adalah **frontend-only** yang terhubung ke Supabase untuk authentikasi dan database.

## Setup Option

### Option 1: Frontend Saja (Supabase Cloud)
- Hosting: Vercel, Netlify, atau VPS static files
- Database: Supabase Cloud
- Setup: 5 menit
- Link: `.env.supabase` template

### Option 2: Frontend + Self-Hosted Supabase (Recommended untuk Private)
- Hosting: VPS (Nginx static files)
- Database: Supabase Self-Hosted (Docker) di VPS
- Setup: 30-45 menit
- Link: `SETUP-SELF-HOSTED.md`

## 📋 VPS Specification

- **CPU**: 1-2 vCPU minimum
- **RAM**: 6GB (Supabase + Nginx)
- **Network**: Static IP atau domain
- **OS**: Ubuntu 22.04+
- **Services**: Docker, Docker Compose, Nginx

---

## 🚀 Step-by-Step Deployment

### Step 1: Setup Supabase Self-Hosted di VPS

**Baca lengkap di: `SETUP-SELF-HOSTED.md`**

Quick summary:
```bash
# Di VPS, clone dan setup Supabase
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker

# Edit .env dengan password dan JWT secret
nano .env

# Start services
docker-compose up -d

# Akses Supabase Studio di http://vps-ip:3000
```

### Step 2: Setup Database

1. Di Supabase Studio, jalankan SQL migration dari file:
   `supabase/migrations/20260212142142_create_initial_schema.sql`

2. Create admin user di Supabase Authentication

3. Insert user ke tabel `users` table

### Step 3: Build Frontend Aplikasi

```bash
# Di local development machine
git clone <your-repo-url>
cd project

npm install

# Copy template .env
cp .env.supabase .env

# Edit .env dengan Self-Hosted Supabase credentials
nano .env
# VITE_SUPABASE_URL=http://your-vps-ip:8000
# VITE_SUPABASE_ANON_KEY=<copy dari Supabase Studio>

# Build
npm run build

# Folder dist/ ready untuk upload
```

### Step 4: Deploy Frontend ke VPS

```bash
# Upload dist folder ke VPS
scp -r dist/* username@your-vps-ip:/var/www/komcs-app/

# Atau gunakan rsync
rsync -avz dist/ username@your-vps-ip:/var/www/komcs-app/
```

### Step 5: Configure Nginx

Edit `/etc/nginx/sites-available/komcs.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/komcs-app;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript;

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/komcs.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Setup HTTPS (Cloudflare)

1. Add domain ke Cloudflare
2. Point nameservers to Cloudflare
3. Cloudflare Dashboard: SSL/TLS → Full
4. DNS: A record → your-vps-ip

### Step 7: Verify

```bash
# Supabase running
docker-compose ps

# Nginx running
sudo systemctl status nginx

# Test frontend
curl https://your-domain.com
```

---

## Performance Metrics

- JS: 358.91 kB (101.89 kB gzipped)
- CSS: 15.33 kB (3.58 kB gzipped)
- Total: ~120 kB gzipped
- RAM: 50-100 MB (Nginx + Supabase)

✅ Suitable untuk 1-2 vCPU + 6 GB RAM

---

## Updates

```bash
# Pull latest code
git pull origin main
npm install
npm run build

# Upload new build
rsync -avz dist/ username@vps:/var/www/komcs-app/
```

Nginx automatically serves updated files.

---

## Monitoring

```bash
# Supabase
docker-compose ps
docker-compose logs -f

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo systemctl status nginx

# Resource usage
docker stats
```

---

## Troubleshooting

**Cannot connect to Supabase**
- Check `.env` VITE_SUPABASE_URL
- Verify `docker-compose ps` shows all services running
- Check firewall allows port 8000

**Blank page / 404**
- Check browser console
- Verify dist/index.html exists
- Check Nginx error logs

**CORS errors**
- Supabase CORS configured for "*"
- Ensure VITE_SUPABASE_URL matches

---

## Next Steps

1. ✓ Read `SETUP-SELF-HOSTED.md` untuk detail setup Supabase
2. ✓ Deploy aplikasi sesuai langkah di atas
3. ✓ Verify dengan test login
4. ✓ Setup monitoring untuk production
