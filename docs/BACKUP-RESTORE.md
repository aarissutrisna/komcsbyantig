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

### Compress Backup
```bash
mysqldump -u root -p'PASSWORD_DB' cs_commission | gzip > /path/to/backup/db_komisi_$(date +%F).sql.gz
```

### Retention Policy
```bash
# Hapus backup older than 7 hari
find /path/to/backup -type f -mtime +7 -delete
```

## 2. Prosedur Restore (Recovery Penuh)
Jika database lama kacau atau pindah server baru:
1. Pindahkan file `.sql` kemarin malam ke Server Baru.
2. Login dan buat Databaseny:
   `mysql -u root -p -e "CREATE DATABASE cs_commission;"`
3. Paksa inject data kedalamnya:
   `mysql -u root -p cs_commission < /path/to/backup/db_komisi_2026-05-12.sql`

### Restore dari Compressed Backup
```bash
gunzip < /path/to/backup/db_komisi_2026-05-12.sql.gz | mysql -u root -p cs_commission
```

## 3. Rollback Sinkronisasi N8N (Data Kotor)
Apa yang harus dilakukan jika ada kesalahan N8N yang mencemari ribuan omzet semalam?
Aplikasi ini sudah dioptimasi untuk **Tahan Rusak (Self-Healing)**:
1. Perbaiki workflow di N8N.
2. Buka Halaman *Admin Settings* di Webapp.
3. Centang "Force Re-import" (Timpa Data).
4. Tarik ulang hari yang hancur itu dari N8N via API. Backend akan menghancurkan data hari itu, menginput data baru yang bersih, dan merekonstruksi kalkulasi komisi sendirian dalam satu transaksi kedap tanpa anda harus menyentuh Raw SQL.

## 4. Backup System Settings
System settings (webhook URL, bonus settings, scheduler config) disimpan di tabel `system_settings`. Backup database sudah mencakup tabel ini.

Untuk backup manual settings tertentu:
```bash
mysql -u root -p cs_commission -e "SELECT * FROM system_settings;" > settings_backup_$(date +%F).txt
```

## 5. Crash Recovery (Frontend)
Jika folder `public_html` di Hestia terhapus tak sengaja:
Masuk kembali ke repo source code, jalankan perintah ini berdurasi kurang dari 10 detik.
```bash
npm run build
```
Lalu salin lagi `dist` keluar. Aplikasi otomatis mengorbit kembali 100%. Tidak ada state yang hilang karena *Stateless Frontend*.

## 6. Disaster Recovery Plan

### Scenario 1: Database Corruption
1. Stop backend: `pm2 stop cs-comm-backend`
2. Restore dari backup terakhir
3. Start backend: `pm2 start cs-comm-backend`
4. Verify data integrity

### Scenario 2: Server Down
1. Provision new server
2. Install dependencies (Node.js, MariaDB, Nginx)
3. Restore database from backup
4. Deploy application code
5. Configure Nginx reverse proxy
6. Update DNS if needed

### Scenario 3: N8N Integration Failure
1. Check N8N workflow status
2. Verify webhook URL in Admin Settings
3. Test webhook endpoint manually
4. Check N8N execution logs
5. Re-activate workflow if needed

## 7. Monitoring & Alerts

### Database Monitoring
```bash
# Check database size
mysql -u root -p cs_commission -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'cs_commission' GROUP BY table_schema;"

# Check active connections
mysql -u root -p -e "SHOW STATUS WHERE Variable_name = 'Threads_connected';"
```

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit
pm2 logs cs-comm-backend

# Check disk space
df -h

# Check memory usage
free -m
```

---
**Last Updated**: 2026-06-20
