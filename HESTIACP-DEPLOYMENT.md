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

## 3. Konfigurasi Nginx (Reverse Proxy)
Agar domain Anda bisa mengakses API Node.js di port 3000:
1. Di HestiaCP, buka Web -> Pilih Domain -> **Advanced Options**.
2. Ubah **Proxy Template** menjadi `NodeJS` (jika tersedia) atau tambahkan custom directive berikut di konfigurasi Nginx:
   ```nginx
   location /api/ {
       proxy_pass http://localhost:3000/api/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }
   ```

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
