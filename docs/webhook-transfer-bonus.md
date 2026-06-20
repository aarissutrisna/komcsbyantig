# Webhook Transfer Item Bonus

Dokumentasi integrasi webhook N8N untuk fitur Transfer Item Bonus.

## 📌 Overview

Fitur Transfer Item Bonus menampilkan data transfer barang bonus antar cabang (UTM ↔ JTJ) dari database iPOS. Data diambil secara real-time melalui webhook N8N yang terhubung ke database PostgreSQL iPOS.

## 🔗 Endpoint Webhook

```
GET http://192.168.100.12:5678/webhook/transfer-bonus-v2
```

### Parameter

| Parameter | Tipe | Wajib | Contoh | Keterangan |
|-----------|------|-------|--------|------------|
| `startDate` | date | ✅ | `2026-05-01` | Tanggal awal periode |
| `endDate` | date | ✅ | `2026-06-16` | Tanggal akhir periode |
| `direction` | string | ✅ | `All` | Arah transfer: `All`, `UTMtoJTJ`, atau `JTJtoUTM` |

### Contoh Request

```
GET /webhook/transfer-bonus-v2?startDate=2026-05-01&endDate=2026-06-16&direction=All
```

## ⚠️ Status Webhook (PENTING)

Webhook saat ini bersifat **asynchronous**. Ketika dipanggil, webhook hanya memicu workflow dan mengembalikan:
```json
{"message":"Workflow was started"}
```

**Ini berarti data tidak langsung tersedia dalam response.** Workflow berjalan di background dan hasilnya ditulis ke file output.

### Solusi yang Direncanakan

Untuk membuat webhook synchronous (mengembalikan data langsung), perlu mengubah konfigurasi webhook node di N8N:
1. Set "Response Mode" = "Last Node" di Webhook node
2. Pastikan workflow mengembalikan data dalam format yang diharapkan
3. Re-activate workflow setelah perubahan

Lihat prompt AI untuk modifikasi workflow di bagian bawah dokumen ini.

## 📊 Format Response yang Diharapkan

```json
{
  "transfers": [
    {
      "notransaksi": "0001/TRF/UTM/0526",
      "tanggal": "2026-05-01 09:31:09",
      "kantordari": "UTM",
      "kantortujuan": "JTJ",
      "keterangan": "diambil acil",
      "total_nilai": 5730000
    }
  ],
  "grand_total": 1055553500
}
```

### Field Descriptions

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `notransaksi` | string | Nomor transaksi transfer |
| `tanggal` | string | Tanggal dan waktu transaksi (format: YYYY-MM-DD HH:MM:SS) |
| `kantordari` | string | Kode cabang pengirim (UTM/JTJ) |
| `kantortujuan` | string | Kode cabang penerima (UTM/JTJ) |
| `keterangan` | string | Keterangan transfer |
| `total_nilai` | number | Total nilai barang yang ditransfer (dalam Rupiah) |
| `grand_total` | number | Total keseluruhan nilai transfer |

## 🗄️ Database Source

- **DB Server**: `192.168.100.100:5444`
- **Database**: `i5_DATABARU`
- **Schema**: iPOS
- **Credential N8N**: `Postgres account` (ID: `JwV9rKxOsas7cUfb`)

### Tabel yang Digunakan

| Tabel | Fungsi |
|-------|--------|
| `tbl_itrhd` | Header transfer item |
| `tbl_itrdt` | Detail item per transfer |
| `tbl_item` | Master item & harga |
| `tbl_itemhj` | Pricing tiers (level & satuan) |

## 💰 Metode Perhitungan Harga (Hybrid)

```
1. tbl_itemhj tipehj='S' → harga sesuai satuan kirim (prioritas)
2. tbl_itemhj level=1       → harga level pertama (fallback)
3. tbl_item.hargajual1     → harga jual utama (fallback)
4. tbl_item.hargapokok     → harga modal (last resort)
5. 0                       → safety (tidak boleh terjadi)
```

## 🔧 Konfigurasi di Aplikasi

### Admin Settings

URL webhook dapat dikonfigurasi di halaman Admin Settings:
- **Path**: `/admin/settings`
- **Section**: "Webhook Transfer Item Bonus"
- **Setting Key**: `webhook_transfer_bonus_url`
- **Default**: `http://192.168.100.12:5678/webhook/transfer-bonus-v2`

### Bonus Calculation Settings

Parameter perhitungan bonus juga dapat dikonfigurasi:
- **Nilai Pembagi** (`bonus_transfer_pembagi`): Default `10000000` (10 juta)
- **Pengali Bonus** (`bonus_transfer_pengali`): Default `5000`

**Rumus**: `(Total Nilai Dipilih / Nilai Pembagi) × Pengali Bonus`

**Contoh**: 
- Total dipilih: Rp 25.000.000
- Pembagi: Rp 10.000.000
- Pengali: Rp 5.000
- **Bonus**: (25.000.000 / 10.000.000) × 5.000 = Rp 10.000

## 🚀 API Endpoints

### Backend Proxy

Backend menyediakan endpoint proxy untuk mengakses webhook:

```
GET /api/transfer-bonus?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&direction=All
```

**Auth**: JWT required (semua role dapat mengakses)

**Response**: Data dari webhook N8N (format JSON seperti di atas)

### Settings API

```
GET /api/settings/bonus-transfer
POST /api/settings/bonus-transfer
```

**Auth**: 
- GET: JWT required (semua role)
- POST: JWT required (Admin only)

## 📁 Referensi File

| File | Path |
|------|------|
| Workflow archive | `/home/n8n/workflows/ipos-transfer-bonus-v2.json` |
| Output JSON | `/home/n8n/data/tfitem.json` |
| Output CSV | `/home/n8n/data/tfitem.csv` |
| Frontend page | `src/pages/TransferBonus.tsx` |
| Backend route | `backend/src/routes/transferBonusRoutes.js` |

## 🔐 Aktivasi Ulang Workflow (Jika Perlu)

```bash
# Login ke N8N
curl -X POST http://192.168.100.12:5678/rest/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrLdapLoginId":"arissutrisna@gmail.com","password":"K@dal4o00"}'

# Simpan cookie, lalu activate workflow
curl -X POST http://192.168.100.12:5678/rest/workflows/eKQiMYAoTxbNV1IU/activate \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"versionId":"..."}'
```

## 🤖 Prompt untuk Modifikasi Workflow N8N (Menjadi Synchronous)

Gunakan prompt berikut untuk AI (ChatGPT/Claude) dalam memodifikasi workflow N8N agar mengembalikan data langsung:

```
Saya punya workflow n8n dengan Webhook node "transfer-bonus-v2" (GET) yang saat ini bekerja secara asynchronous — dia hanya memicu workflow dan return {"message":"Workflow was started"}.

Saya perlu mengubahnya menjadi SYNCHRONOUS, yaitu webhook harus menunggu workflow selesai lalu mengembalikan hasil query dalam response HTTP.

**Informasi Workflow:**
- Webhook URL: GET http://192.168.100.12:5678/webhook/transfer-bonus-v2
- Parameter: startDate (required), endDate (required), direction (All | UTMtoJTJ | JTJtoUTM)
- Database: Postgres di 192.168.100.100:5444, database i5_DATABARU
- Credential n8n: "Postgres account" (ID: JwV9rKxOsas7cUfb)

**Response yang diharapkan (JSON):**
{
  "transfers": [
    {
      "notransaksi": "0001/TRF/UTM/0526",
      "tanggal": "2026-05-01 09:31:09",
      "kantordari": "UTM",
      "kantortujuan": "JTJ",
      "keterangan": "diambil acil",
      "total_nilai": 5730000
    }
  ],
  "grand_total": 1055553500
}

**Yang perlu diubah:**
1. Di Webhook node, set "Response Mode" = "Last Node"
2. Pastikan data mengalir dari Postgres node → (transformasi) langsung ke output Webhook
3. Response harus berupa satu object JSON dengan format di atas
4. Hitung grand_total sebagai SUM dari total_nilai semua item

Tolong buatkan panduan langkah demi langkah untuk mengubah workflow ini di UI n8n.
```

---
**Last Updated**: 2026-06-20
