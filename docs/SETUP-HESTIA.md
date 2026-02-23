# Panduan Setup di HestiaCP (Deployment Production)

Panduan end-to-end menjalankan sistem secara Production-Ready di Server Linux menggunakan Panel HestiaCP.

## 1. Setup Domain di HestiaCP
1. Masuk ke panel HestiaCP.
2. Navigasi ke **WEB** -> **Add Web Domain**.
3. Masukkan domain/subdomain (contoh: `komisi.app.com`).
4. Centang **Enable SSL for this domain** dan ekstensi *Let's Encrypt*.
5. (Opsional) Jika aplikasi dilayani sepenuhnya dari Web Root Node.js, kita akan menggunakan Reverse Proxy Nginx. Tetapkan backend Node.js (Port `3000`).

## 2. Setup Database MariaDB
1. Masuk ke **DB** -> **Add Database**.
2. Isikan Nama, DB User, dan Password.
3. Import `schema_final.sql` melalui *phpMyAdmin* atau SSH Command.

## 3. Setup Node.js App
Gunakan terminal SSH, lalu `git clone` repositori ke folder aplikasi Anda, misalnya `/home/user/web/komisi.app.com/private/cs-app`:
```bash
cd /home/user/web/komisi.app.com/private/cs-app
npm install --omit=dev
cd backend
npm install --omit=dev
```

Jangan lupa buat file `.env` production Anda di dalam folder `backend`:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=NAMA_USER_DB
DB_PASSWORD=PASSWORD_AMan_DB
DB_NAME=NAMA_DB
JWT_SECRET=super_secret_rand123_prod
N8N_WEBHOOK_SECRET=token_rahasia_untuk_n8n_prod
```

## 4. Build Frontend
```bash
cd /home/user/web/komisi.app.com/private/cs-app
npm run build
```
Salin folder `dist` yang dihasilkan ke folder `public_html` HestiaCP domain Anda agar Nginx bisa melayani file statis web:
```bash
rm -rf /home/user/web/komisi.app.com/public_html/*
cp -R dist/* /home/user/web/komisi.app.com/public_html/
```

## 5. Menjalankan Backend dengan PM2
Agar backend berjalan abadi (*forever*), instal PM2 secara global:
```bash
npm install -g pm2
cd backend
pm2 start server.js --name "komisi-backend"
pm2 save
pm2 startup
```

## 6. Nginx Reverse Proxy (Untuk Akses API) - Web Template
HestiaCP harus mem-bypass akses untuk domain ini sepenuhnya ke port Node.js (misal: `5000`), bukan port default bawaan Hestia. Sangat disarankan membuat Custom Web Template (TPL & STPL).

1. **Jalankan SSH sebagai root** lalu masuk ke direktori template Nginx web:
   ```bash
   cd /usr/local/hestia/data/templates/web/nginx/php-fpm
   ```
2. **Buat file `NodeJS5000.tpl`** (Mode HTTP):  
   Coba ketik `nano NodeJS5000.tpl`
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
3. **Buat file `NodeJS5000.stpl`** (Mode HTTPS):  
   Ketik `nano NodeJS5000.stpl`
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
4. **Aplikasikan Template via GUI Panel**:
   - Kembali ke akun HestiaCP pada web browser. Buka edit **Web Domain**.
   - Buka blok **Advanced Options**.
   - Pada pilihan dropdown **Web Template (Nginx)**, pilih **NodeJS5000**.
   - Simpan. *HestiaCP akan otomatis meregenerasi konfigurasi dan mere-start Nginx.*

## 7. Folder Permissions (File Logging / Uploads)
HestiaCP membatasi izin untuk user. Jika Node.js menyimpan file, lakukan ini agar user `www-data` dan usermu seimbang:
```bash
chown -R user:user /home/user/web/komisi.app.com/private/cs-app
chmod -R 755 /home/user/web/komisi.app.com/private/cs-app
```
