# Panduan Integrasi N8N (Ekosistem Webhook)

Sistem Webapp tidak pernah melakukan "tarik" / "pull" data transaksi mandiri ke database eksternal kasir demi keamanan. Melainkan, Server Automasi N8N yang akan menjadi kurir ("push") menembakkan data matang per cabang setiap harinya (Cron Job).

## 1. Webhook Endpoint
Endpoint Backend (Production):
`POST https://komisi.app.com/api/omzet/webhook/n8n`

## 2. Struktur Payload N8N (Format JSON)
Webhook N8N **wajib** mengirimkan Body JSON di node "HTTP Request" dengan format:
```json
{
  "branchId": "UTM",
  "tanggal": "2026-02-21",
  "cash": 5000000,
  "piutang": 1000000
}
```
*Atau Bulk Array dalam parameter `data` jika merapel hari.*

## 3. Autentikasi Keamanan (Wajib!)
Aplikasi menolak data dari siapapun yang tidak berhak. 
N8N **harus menyertakan Header HTTP** berikut:
- **Key**: `Authorization`
- **Value**: `Bearer <Isi_N8N_WEBHOOK_SECRET_dari_.env>`

## 4. Cron Schedule & Retry Strategy
Disarankan agar N8N menggunakan **Schedule Trigger** (1 kali setiap hari jam 23:55).
- Jika server ini API mati (Down), setel Node HTTP Request di N8N ke opsi: **On Error: Retry On Fail (3 Tries, 5 minute wait)**.

## 5. Safe Recalculation Mode
Ketika data ditembakkan oleh N8N dan diterima dengan sukses (Status `200 OK`), sistem Node.js langsung *lock* baris database cabang bersangkutan, menimpa/menambah `omzet`, menghapus komisi hari tersebut saja (isolasi), dan melakukan `Recalculate` kilat.
N8N tidak perlu paham rumus perhitungan komisi. N8N cukup lempar "Berapa Uang Hari Ini", sisa urusan hitungan faktor dan kehadiran 100% diproses Webapp.
