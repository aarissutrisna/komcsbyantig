# Panduan Deployment di HestiaCP (Node.js + MariaDB)

Panduan lengkap untuk mendeploy aplikasi CS Commission System ke server HestiaCP.

## 1. Persiapan Database (MariaDB 11.4)

1. Login ke HestiaCP -> User -> **DB**.
2. Buat database baru (misal: `hestia_cs_comm`).
3. Import file `schema_mariadb.sql` melalui PHPMyAdmin atau terminal:
   ```bash
   mysql -u user_db -p hestia_cs_comm < schema_mariadb.sql
   ```

## 2. Persiapan Backend (Node.js)

HestiaCP menjalankan Node.js melalui **Nginx Reverse Proxy**.

1. Upload folder `backend` ke server (misal ke `/home/user/web/domain.com/private/backend`).
2. Buat file `.env` di folder backend dengan detail DB HestiaCP:
   ```env
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=user_db
   DB_PASSWORD=password_db
   DB_NAME=hestia_cs_comm
   JWT_SECRET=your_super_secret_key_minimum_32_characters
   N8N_WEBHOOK_SECRET=token_rahasia_untuk_n8n_prod
   CORS_ORIGIN=https://your-domain.com
   ```
3. Install **PM2** untuk menjaga backend tetap hidup:
   ```bash
   npm install pm2 -g
   cd backend
   npm install
   pm2 start src/server.js --name "cs-comm-backend"
   pm2 save
   pm2 startup
   ```

## 3. Konfigurasi Nginx (Reverse Proxy) - Custom Template NodeJS3000

Agar Nginx HestiaCP bisa meneruskan trafik secara mulus ke port 3000 Node.js, sangat disarankan membuat Custom Web Template.

**Langkah 1: Membuat file template `.tpl` dan `.stpl`**

Login ke server via SSH sebagai `root` dan arahkan ke folder template Nginx:
```bash
cd /usr/local/hestia/data/templates/web/nginx/php-fpm
```

**Langkah 2: Buat file `NodeJS3000.tpl`** (Untuk Non-SSL)

```nginx
server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /error/ {
        alias   %home%/%user%/web/%domain%/document_errors/;
    }

    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
```

**Langkah 3: Buat file `NodeJS3000.stpl`** (Untuk SSL/HTTPS)

```nginx
server {
    listen      %ip%:%web_ssl_port% ssl http2;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    ssl_certificate      %ssl_pem%;
    ssl_certificate_key  %ssl_key%;
    ssl_stapling on;
    ssl_stapling_verify on;

    include %home%/%user%/conf/web/%domain%/nginx.hsts.conf*;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /error/ {
        alias   %home%/%user%/web/%domain%/document_errors/;
    }

    include %home%/%user%/conf/web/%domain%/nginx.ssl.conf_*;
}
```

**Langkah 4: Pilih Template di HestiaCP**

1. Buka dashboard panel HestiaCP.
2. Ke menu **Web** -> Edit domain milik Anda.
3. Klik **Advanced Options**.
4. Pada opsi **Web Template (Nginx)**, cari dan pilih **NodeJS3000**.
5. Simpan (Save). Hestia akan me-restart Nginx secara otomatis.

## 4. Build & Deploy Frontend

### Option A: Build di Server (jika resource cukup)
```bash
cd /home/user/web/domain.com/private
npm install
npm run build
```

### Option B: Build di Lokal, Upload dist (disarankan untuk ARM/low RAM)
```bash
# Di komputer lokal
npm run build

# Upload folder dist ke server
scp -r dist/* user@server:/home/user/web/domain.com/public_html/
```

Backend akan serve file statis dari folder `dist` secara otomatis.

## 5. Konfigurasi Network (3-Hop Topology)

Sesuai informasi Anda (**CF > WGhub > WGclient**), berikut pengaturannya:

### Cloudflare & WGhub
- **SSL**: SSL di-terminate di Cloudflare atau WGhub.
- **Proxy**: WGhub meneruskan traffic ke WGclient melalui tunnel WireGuard.

### WGclient (Sisi Backend Node.js)
- **Internal IP**: 10.40.0.5
- **Trusted Proxy**: 10.40.0.1 (WGhub)

Backend telah dikonfigurasi secara spesifik untuk hanya percaya header dari `10.40.0.1`:
```javascript
app.set('trust proxy', '10.40.0.1');
```

### Tips Optimasi ARM (1 vCPU, Low RAM):
1. **PM2 Cluster**: Karena hanya 1 vCPU, jalankan PM2 dalam mode `fork` (default), bukan `cluster`.
2. **Memory Limit**: Jika RAM terbatas, Anda bisa membatasi penggunaan memori Node.js dengan flag:
   ```bash
   pm2 start src/server.js --node-args="--max-old-space-size=512" --name "cs-comm-backend"
   ```
3. **Build Outside**: Sangat disarankan untuk menjalankan `npm run build` di komputer lokal Anda, lalu upload folder `dist`. Menjalankan build di 1 vCPU bisa sangat lambat atau membuat server hang.

## 6. Verifikasi Deployment

### Test Backend
```bash
curl http://localhost:3000/health
# Output: {"status":"ok","message":"Server is running"}
```

### Test API
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'
```

### Test Frontend
```bash
curl https://your-domain.com
# Should return index.html content
```

## 7. Monitoring & Maintenance

### PM2 Monitoring
```bash
pm2 monit
pm2 logs cs-comm-backend
pm2 status
```

### Database Backup
```bash
# Daily backup
mysqldump -u user_db -p'password' hestia_cs_comm | gzip > backup_$(date +%F).sql.gz
```

### Update Application
```bash
cd /home/user/web/domain.com/private
git pull
cd backend
npm install --production
pm2 restart cs-comm-backend
```

## 8. Troubleshooting

### Backend not starting
```bash
pm2 logs cs-comm-backend
# Check .env file
# Check MariaDB connection
```

### Cannot connect to database
```bash
# Check MariaDB running
sudo systemctl status mariadb

# Test connection
mysql -u user_db -p hestia_cs_comm
```

### Nginx 502 Bad Gateway
```bash
# Check backend running
pm2 status

# Check nginx logs
sudo tail -f /var/log/nginx/domains/your-domain.error.log
```

### Frontend not loading
```bash
# Check if dist folder exists
ls -la /home/user/web/domain.com/public_html/

# Rebuild if needed
npm run build
```

---
**Last Updated**: 2026-06-20
