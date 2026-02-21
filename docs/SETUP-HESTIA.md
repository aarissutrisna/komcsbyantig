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

## 6. Nginx Reverse Proxy (Untuk Akses API)
Agar HestiaCP mau mem-bypass endpoint `/api` dari domain utama ke port `3000` (Node.js backend):

Masuk HestiaCP via SSH, ubah template Nginx untuk domain terkait (biasanya di `/home/user/conf/web/komisi.app.com/nginx.conf`):
Tambahkan blok ini di bawah server block:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_addrs;
}
```
Lalu *reload* nginx: `systemctl reload nginx`

## 7. Folder Permissions (File Logging / Uploads)
HestiaCP membatasi izin untuk user. Jika Node.js menyimpan file, lakukan ini agar user `www-data` dan usermu seimbang:
```bash
chown -R user:user /home/user/web/komisi.app.com/private/cs-app
chmod -R 755 /home/user/web/komisi.app.com/private/cs-app
```
