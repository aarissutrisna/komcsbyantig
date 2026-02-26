# Protokol Update Hook & Automasi Deployment

Dokumen ini mendefinisikan standar komunikasi antara pengembang (AI/Human) dengan skrip automasi di VM Produksi melalui file `update.md`.

## 1. Format String Hook
Setiap rilis/update wajib mencantumkan baris berikut di dalam file `update.md` (biasanya di baris paling atas atau setelah riwayat teks):

```text
--UPDATE_HOOK:DDMMYYYY>ACTION--
```

### Penjelasan Parameter:
- **`--UPDATE_HOOK:`** : Penanda (Anchor) bagi skrip `grep` atau `regex`.
- **`DDMMYYYY`** : Tanggal update (8 digit). Digunakan untuk verifikasi versi/rilis.
- **`>`** : Karakter pemisah (Delimiter).
- **`ACTION`** : Instruksi perintah untuk skrip di server.

## 2. Definisi Parameter ACTION

| Keyword | Deskripsi | Aksi Skrip Server |
| :--- | :--- | :--- |
| **`NONEED`** | Update hanya pada logika kode aplikasi (.js, .tsx, .css). | `git pull` → `npm run build` → `pm2 restart` |
| **`NPMINSTALL`** | Terjadi penambahan atau update pada library di `package.json`. | `git pull` → `npm install` → `npm run build` → `pm2 restart` |
| **`DATABASE`** | Terjadi perubahan struktur tabel (Add/Modify/Drop column/table). | **Wajib** jalankan SQL migrasi → `git pull` → `npm run build` → `pm2 restart` |

---

## 3. Protokol Perubahan Database (AI Protocol)

Jika terdeteksi adanya perubahan skema database, langkah berikut **Wajib** dilakukan sebelum melakukan Push:

1. **SQL Migration**: Catat perintah SQL lengkap (misal: `ALTER TABLE ...`) di file `update.md` tepat di bawah baris hook.
2. **Schema Baseline**: Perbarui file `schema_mariadb.sql` di root project agar selalu sinkron dengan status *Fresh Install*.
3. **Action Trigger**: Pastikan nilai `ACTION` pada hook diatur ke `DATABASE`.

---

## 4. Contoh Implementasi Skrip Bash di VM
Skrip di server dapat membaca instruksi dengan cara berikut:

```bash
#!/bin/bash

# Ambil baris hook terbaru
HOOK_LINE=$(grep -oP '--UPDATE_HOOK:\d{8}>[A-Z]+' update.md | tail -n 1)

# Ekstrak ACTION (semua karakter setelah tanda >)
ACTION=$(echo $HOOK_LINE | cut -d'>' -f2)

echo "Terdeteksi instruksi update: $ACTION"

git pull origin main

if [ "$ACTION" == "NPMINSTALL" ]; then
    echo "Menjalankan npm install..."
    npm install
fi

if [ "$ACTION" == "DATABASE" ]; then
    echo "PERINGATAN: Cek update.md untuk perintah SQL migrasi!"
    # Implementasi otomatisasi SQL bisa ditambahkan di sini
fi

npm run build
pm2 restart all
```
