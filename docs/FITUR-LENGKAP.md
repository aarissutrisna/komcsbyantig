# Fitur Lengkap & Alur Bisnis Aplikasi

Sistem ini didesain menggantikan tabel excel pencairan manual menjadi integrasi tertutup, aman secara matematis, dan anti-human-error.

## 👤 Manajemen User & Role (Akses Terbatas)
1. **Admin/Owner**: Hak eksklusif merubah batas target cabang, melakukan kalkulasi paksa harian masa lalu, import/override Data CSV, dan menarik log mentah omzet N8N.
2. **HRD**: Mengelola data CS (User Accounts) dan "Penugasan CS". Tidak dapat mengubah parameter komisi per cabang.
3. **CS (Staff)**: Login independen untuk melihat Dashboard Mutasi Real-time Pribadi dari bulan bersangkutan.

## 🏢 Manajemen Cabang & Metrik Target
Memantau pengaturan minimum komisi `comm_perc_min` dan maksimum `comm_perc_max` serta rentang Target Omzet (`target_min` ~ `target_max`). Diatur di halaman *Target & Roles*.

## 👨‍💼 Penugasan CS (CS Allocation Guard)
Pusat kontrol di mana HRD menugaskan CS A ke Cabang B dari tanggal C.
- Sistem mengawasi batas 100% (*Faktor Komisi* 1.0).
- Penugasan diproteksi secara database SQL via `CHECK constraint`. Jika HRD mencoba melebihi batas dari dua komputer sekaligus, "Race Condition Lock" mencegah hal tersebut.
- *Tanggal Selesai* (Resign/Mutasi) memastikan kuota cabang lama *release* otomatis tanpa campur tangan Admin.

## 💰 Perhitungan Komisi Harian
- **Algoritma Tersembunyi**: 
  1. `Total Omzet Harian` > `Target Max` ? ditarik limit `Persentase Max`
  2. `Total Omzet Harian` > `Target Min` ? ditarik limit `Persentase Min`
  3. Lainnya = `0` (Omzet gagal target komisi).
- **Pembagian**: Persentase * Total Omzet disebar berimbang berdasarkan *Faktor Komisi* ditambahkan rasio Kehadiran.

## 📈 Modul N8N (Omzet Otomatis)
Setiap sore / interval N8N, webapp menerima Payload API Webhook berisi rekap Cabang A. Semua diproses instan ke tabel `omzet`. Tabel `commissions` ikut ditarik ulang khusus untuk tanggal tersebut saja.

## 📁 Import CSV Historis Kehadiran (Bulk Insert)
Memudahkan Admin menimpa absen *1* / *0.5* / *0* per tanggal dalam format `TANGGAL;USERNAME;CABANG;KEHADIRAN`. Ini aman karena memicu rekalkulasi serentak per individu.

## 🛡️ Menu Rekalkulasi Keseluruhan (Audit Trail Mode)
Jika ada anomali atau HRD telat memasukkan backdate (Penugasan H-5 baru dimasukkan hari ini), Admin dapat menekan tombol *Rekalkulasi Serentak*. Seluruh riwayat komisi akan disterilisasi dan dihilir dari nol sesuai dengan penugasan terkini dari tanggal 1 omzet pertama hingga hari ini secara `Atomic Transaction` tanpa layar kosong di frontend yang sedang login.
