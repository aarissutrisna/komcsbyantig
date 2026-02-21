# Hestia Komisi CS & Manajemen Omzet

Sistem arsitektur finansial untuk mengelola target omzet cabang, menghitung performa (kehadiran & komisi) Customer Service secara otomatis, dan berintegrasi secara end-to-end dengan ekosistem automasi N8N.

## 🌟 Fitur Utama
- **Automasi N8N Terintegrasi**: Sinkronisasi Omzet & Piutang harian langsung dari alur transaksi.
- **Transaction-Safe (ACID Compliant)**: Mutasi dan kalkulasi anti-ganda. Row-level lock diaplikasikan pada semua modul finansial.
- **Smart Quota CS**: Batasan kuota (maksimal porsi 100%) tiap cabang dengan algoritma pendeteksi pengunduran diri/pemindahan cabang otomatis.
- **Manajemen Historis Bulk**: Menerima import presensi harian secara CSV dan merevisi omzet masa lalu dengan rekalkulasi aman.

## 🏗 Tech Stack
- **Frontend**: Vite + React, Tailwind CSS, Recharts, Lucide React (TypeScript)
- **Backend**: Node.js, Express, MySQL2 / MariaDB
- **Keamanan**: JWT, Bcrypt, Header Auth untuk N8N Webhook, Database Check/Unique Constraints.

## 📁 Struktur Folder
- `/src` -> Frontend React
- `/backend` -> API Backend, Services, Config
- `/docs` -> Modul Dokumentasi Teknis

## 🚀 Quick Start
Lihat `docs/SETUP-LOCAL.md` untuk menjalankan proyek di komputer Anda secara lokal, atau `docs/SETUP-HESTIA.md` untuk panduan deploy production di VPS panel Hestia.

## 🛡️ Status
**Production Ready** (Slimmed & Stable). Sistem dipastikan telah dibersihkan dari seluruh modul simulasi, dummy, dan endpoint *testing* eksperimen.
