# Panduan Deployment di HestiaCP (Node.js + MariaDB)

Karena backend Anda menggunakan **Node.js (Express)** dan frontend menggunakan **React (Vite)**, berikut adalah langkah-langkah untuk mendeploy aplikasi ini ke server HestiaCP Anda.

## 1. Persiapan Database (MariaDB 11.4)
1. Login ke HestiaCP -> User -> **DB**.
2. Buat database baru (misal: `hestia_cs_comm`).
3. Import file `schema_mariadb.sql` yang sudah saya sediakan melalui PHPMyAdmin atau terminal:
   `mysql -u user_db -p hestia_cs_comm < schema_mariadb.sql`

## 2. Persiapan Backend (Node.js)
HestiaCP menjalankan Node.js melalui **Nginx Reverse Proxy**.
1. Upload folder `backend` ke server (misal ke `/home/user/web/domain.com/private/backend`).
2. Buat file `.env` di folder backend dengan detail DB HestiaCP.
3. Install **PM2** untuk menjaga backend tetap hidup:
   ```bash
   npm install pm2 -g
   cd backend
   npm install
   pm2 start src/server.js --name "cs-comm-backend"
   pm2 save
   ```

## 3. Konfigurasi Nginx (Reverse Proxy) - Custom Template NodeJS5000
Agar Nginx HestiaCP bisa meneruskan trafik secara mulus ke port 5000 Node.js (sebagai API maupun penyaji file statis), sangat disarankan membuat Custom Web Template.

**Langkah 1: Membuat file template `.tpl` dan `.stpl`**
Login ke server via SSH sebagai `root` dan arahkan ke folder template Nginx:
```bash
cd /usr/local/hestia/data/templates/web/nginx/php-fpm
```

**Langkah 2: Buat file `NodeJS5000.tpl`** (Untuk Non-SSL)
Gunakan *text editor* (`nano NodeJS5000.tpl`) dan isi dengan konten berikut:
```nginx
server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    root        %docroot%;
    access_log  /var/log/nginx/domains/%domain%.log combined;
    error_log   /var/log/nginx/domains/%domain%.error.log error;

    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;

    location / {
        proxy_pass http://127.0.0.1:5000;
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

**Langkah 3: Buat file `NodeJS5000.stpl`** (Untuk SSL/HTTPS)
Buat file baru (`nano NodeJS5000.stpl`) dan isi dengan:
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
        proxy_pass http://127.0.0.1:5000;
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
4. Pada opsi **Web Template (Nginx)**, cari dan pilih **NodeJS5000**.
5. Simpan (Save). Hestia akan me-restart Nginx secara otomatis.

## 5. Konfigurasi Network (3-Hop Topology)

Sesuai informasi Anda (**CF > WGhub > WGclient**), berikut pengaturannya:

### Cloudflare & WGhub
- **SSL**: SSL di-terminate di Cloudflare atau WGhub.
- **Proxy**: WGhub meneruskan traffic ke WGclient melalui tunnel WireGuard.

### WGclient (Sisi Backend Node.js)
- **Internal IP**: 10.40.0.5
- **Trusted Proxy**: 10.40.0.1 (WGhub)

Backend telah saya konfigurasi secara spesifik untuk hanya percaya header dari `10.40.0.1`.

### Tips Optimasi ARM (1 vCPU, Low RAM):
1. **PM2 Cluster**: Karena hanya 1 vCPU, jalankan PM2 dalam mode `fork` (default), bukan `cluster`.
2. **Memory Limit**: Jika RAM terbatas, Anda bisa membatasi penggunaan memori Node.js dengan flag:
   `pm2 start src/server.js --node-args="--max-old-space-size=512" --name "cs-comm-backend"`
3. **Build Outside**: Sangat disarankan untuk menjalankan `npm run build` di komputer lokal Anda, lalu upload folder `dist`. Menjalankan build di 1 vCPU bisa sangat lambat atau membuat server hang.
