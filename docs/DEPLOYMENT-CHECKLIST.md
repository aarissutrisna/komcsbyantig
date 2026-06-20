# The Final Deployment Checklist

Gunakan daftar centang di bawah ini tepat sebelum peluncuran kepada entitas nyata di lapangan. Jika satu poin tidak terpenuhi, diharap undur deployment.

## 🔒 Security & Environment
- [ ] Database Schema mengaplikasikan constraint wajib (`CASCADE` di Relasi Utama, `UNIQUE` di Penugasan, dan `CHECK` di Porsi Komisi).
- [ ] File konfigurasi `.env` telah dirubah untuk *Production* (Password kuat untuk DB_PASSWORD dan JWT_SECRET panjangnya minimal 32 karakter).
- [ ] SSL domain telah aktif (HTTPS di Nginx/Hestia).
- [ ] Pastikan seluruh file `simulator.js`, `test.js`, dan dummy data tabel **TIDAK TER-DEPLOY**.
- [ ] `N8N_WEBHOOK_SECRET` sudah diatur dan berbeda antara dev/prod.
- [ ] `CORS_ORIGIN` sudah diatur ke domain production (bukan `*`).

## ⚙️ Backend Status
- [ ] Server tidak lagi menggunakan `npm run dev` / `nodemon` melainkan `node server.js` di bawah payung manager eksekusi seperti **PM2** atau Docker.
- [ ] N8N Workflow sudah dikonfigurasi mengubah metode Authorization menggunakan Header *Bearer*.
- [ ] Coba tembak `POST /api/omzet/webhook/n8n` pakai data asal tanpa Header. Pastikan mendapat tolakan `401 Unauthorized`.
- [ ] Webhook transfer bonus URL sudah dikonfigurasi di Admin Settings.
- [ ] Bonus calculation settings (pembagi & pengali) sudah diatur sesuai kebijakan.

## 📱 Frontend Status
- [ ] Aplikasi Frontend sudah masuk ke fase *Transpiled/Compiled* menggunakan `npm run build` dengan hasil yang ringan (folder `/dist`).
- [ ] File ENV frontend (Vite) sudah mengarah pada Production URL backend (bukan lagi `localhost`).
- [ ] Tidak ada logo placeholder atau nama test di UI.
- [ ] File-file sourcemap sebaiknya di-*exclude* dari server public.
- [ ] Halaman Transfer Bonus dapat diakses dan menampilkan data dari webhook.

## 🛠️ Testing Transaksi Ekstrem (Manual)
- [ ] HRD harus mencoba menaruh dua CS pada Cabang A yang diubah total porsinya menjadi >100% (misal 60% + 50%). Pastikan sistem di Frontend menampilkan pesan Error yang sopan dari Database constraints.
- [ ] Menekan tombol sakti *Rekalkulasi Keseluruhan* puluhan hari untuk melihat efisiensi CPU (Maks 1-2 detik berkat Row Lock Transaction).
- [ ] Test Transfer Bonus: tarik data dengan range tanggal, pilih item dengan checkbox, verifikasi kalkulasi bonus.
- [ ] Test Admin Settings: ubah nilai pembagi/pengali bonus, verifikasi perubahan tersimpan dan berpengaruh di halaman Transfer Bonus.

## 📊 Database Backup
- [ ] Backup database harian sudah dikonfigurasi (cron job).
- [ ] Prosedur restore sudah didokumentasikan dan ditest.
- [ ] File backup disimpan di lokasi terpisah dari server utama.

## 🌐 Network & Proxy
- [ ] Nginx reverse proxy sudah dikonfigurasi dengan benar.
- [ ] Trust proxy sudah diatur untuk topologi network (Cloudflare > WGhub > WGclient).
- [ ] Rate limiting sudah dikonfigurasi (jika diperlukan).

---
**Last Updated**: 2026-06-20
