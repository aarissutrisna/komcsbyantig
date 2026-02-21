# The Final Deployment Checklist

Gunakan daftar centang di bawah ini tepat sebelum peluncuran kepada entitas nyata di lapangan. Jika satu poin tidak terpenuhi, diharap undur deployment.

## 🔒 Security & Environment
- [ ] Database Schema mengaplikasikan 3 kunci wajib (`CASCADE` di Relasi Utama, `UNIQUE` di Penugasan, dan `CHECK` di Faktor Komisi).
- [ ] File konfigurasi `.env` telah dirubah untuk *Production* (Password kuat untuk DB_PASSWORD dan JWT_SECRET panjangnya minimal 64 karakter).
- [ ] SSL domain telah aktif (HTTPS di Nginx/Apache/Hestia).
- [ ] Pastikan seluruh file `simulator.js`, `test.js`, dan dummy data tabel **TIDAK TER-DEPLOY**. Jangan mengkopi folder `/tests` atau `seed_dummy.js`.

## ⚙️ Backend Status
- [ ] Server tidak lagi menggunakan `npm run dev` / `nodemon` melainkan `node server.js` di bawah payung manager eksekusi seperti **PM2** atau Docker.
- [ ] N8N Workflow sudah dikonfigurasi mengubah metode Authorization menggunakan Header *Bearer*.
- [ ] Coba tembak `POST /api/omzet/webhook/n8n` pakai data asal tanpa Header. Pastikan mendapat tolakan `401 Unauthorized`.

## 📱 Frontend Status
- [ ] Aplikasi Frontend sudah masuk ke fase *Transpiled/Compiled* menggunakan `npm run build` dengan hasil yang ringan (folder `/dist`).
- [ ] File ENV frontend (Vite) sudah mengarah pada Production URL backend (bukan lagi `localhost`).
- [ ] Tidak ada logo placeholder atau nama test di UI.
- [ ] File-file sourcemap sebaiknya di-*exclude* dari server public.

## 🛠️ Testing Transaksi Ekstrem (Manual)
- [ ] HRD harus mencoba menaruh dua CS pada Cabang A yang diubah total faktor komisinya menjadi >100% (misal 60% + 50%). Pastikan sistem di Frontend menampilkan pesan Error yang sopan dari Database constraints.
- [ ] Menekan tombol sakti *Rekalkulasi Keseluruhan* puluhan hari untuk melihat efisiensi CPU (Maks 1-2 detik berkat Row Lock Transaction).
