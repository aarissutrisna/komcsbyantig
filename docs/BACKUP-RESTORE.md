# Strategi Backup & Disaster Recovery

Panduan untuk menjaga nyawa aplikasi dan memulihkannya jika Server N8N atau HestiaCP meledak / di-hack.

## 1. Backup SQL Server (Dump Rutin)
Data di MariaDB adalah jantung instansi ini. Kode Node dapat didownload ulang kapan saja dari Git, tapi data SQL adalah emas murni.

Jalankan perintah ini menggunakan CronJob di VPS agar MariaDB memback-up otomatis setiap Jam 3 Pagi:
```bash
## Backup Database harian (Simpan di folder aman yg dikirim ke external server via FTP/S3)
mysqldump -u root -p'PASSWORD_DB' cs_commission > /path/to/backup/db_komisi_$(date +%F).sql
```
*Tips: Backup ini wujudnya murni text, gampang dan ringan untuk dikompresi (GZIP).*

## 2. Prosedur Restore (Recovery Penuh)
Jika database lama kacau atau pindah server baru:
1. Pindahkan file `.sql` kemarin malam ke Server Baru.
2. Login dan buat Databaseny:
   `mysql -u root -p -e "CREATE DATABASE cs_commission;"`
3. Paksa inject data kedalamnya:
   `mysql -u root -p cs_commission < /path/to/backup/db_komisi_2026-05-12.sql`

## 3. Rollback Sinkronisasi N8N (Data Kotor)
Apa yang harus dilakukan jika ada kesalahan N8N yang mencemari ribuan omzet semalam?
Aplikasi ini sudah dioptimasi untuk **Tahan Rusak (Self-Healing)**:
1. Perbaiki workflow di N8N.
2. Buka Halaman *Admin Settings* di Webapp.
3. Centang "Force Overwrite" (Timpa Data).
4. Tarik ulang hari yang hancur itu dari N8N via API. Backend akan menghancurkan data hari itu, menginput data baru yang bersih, dan merekonstruksi kalkulasi komisi sendirian dalam satu transaksi kedap tanpa anda harus menyentuh Raw SQL.

## 4. Crash Recovery (Frontend)
Jika folder `public_html` di Hestia terhapus tak sengaja:
Masuk kembali ke repo source code, jalankan perintah ini berdurasi kurang dari 10 detik.
`npm run build`
Lalu salin lagi `dist` keluar. Aplikasi otomatis mengorbit kembali 100%. Tidak ada state yang hilang karena *Stateless Frontend*.
