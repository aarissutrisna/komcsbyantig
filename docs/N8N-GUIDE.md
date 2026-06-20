# Panduan Integrasi N8N (Ekosistem Webhook)

Sistem Webapp tidak pernah melakukan "tarik" / "pull" data transaksi mandiri ke database eksternal kasir demi keamanan. Melainkan, Server Automasi N8N yang akan menjadi kurir ("push") menembakkan data matang per cabang setiap harinya (Cron Job).

## 1. Webhook Endpoint

### A. Omzet Harian (Push dari N8N)
Endpoint Backend (Production):
```
POST https://your-domain.com/api/omzet/webhook/n8n
```

### B. Transfer Item Bonus (Pull dari Backend)
Endpoint N8N Webhook (dipanggil oleh backend):
```
GET http://192.168.100.12:5678/webhook/transfer-bonus-v2
```

**Parameter**: `startDate`, `endDate`, `direction`

**Catatan**: Webhook transfer bonus saat ini bersifat asynchronous. Lihat `docs/webhook-transfer-bonus.md` untuk detail.

## 2. Struktur Payload N8N - Omzet (Format JSON)

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

### Format Response
```json
{
  "success": true,
  "count": 1,
  "message": "Omzet recorded successfully"
}
```

## 3. Autentikasi Keamanan (Wajib!)

Aplikasi menolak data dari siapapun yang tidak berhak. 
N8N **harus menyertakan Header HTTP** berikut:

### Untuk Omzet Webhook:
- **Key**: `Authorization`
- **Value**: `Bearer <Isi_N8N_WEBHOOK_SECRET_dari_.env>`

### Untuk Transfer Bonus:
Tidak memerlukan autentikasi (webhook N8N bersifat public/internal).

## 4. Cron Schedule & Retry Strategy

### Omzet Harian
Disarankan agar N8N menggunakan **Schedule Trigger** (1 kali setiap hari jam 23:55).
- Jika server ini API mati (Down), setel Node HTTP Request di N8N ke opsi: **On Error: Retry On Fail (3 Tries, 5 minute wait)**.

### Transfer Bonus
Dipanggil on-demand oleh backend ketika user mengakses halaman Transfer Bonus.

## 5. Safe Recalculation Mode

Ketika data ditembakkan oleh N8N dan diterima dengan sukses (Status `200 OK`), sistem Node.js langsung *lock* baris database cabang bersangkutan, menimpa/menambah `omzet`, menghapus komisi hari tersebut saja (isolasi), dan melakukan *Recalculate* kilat.

N8N tidak perlu paham rumus perhitungan komisi. N8N cukup lempar "Berapa Uang Hari Ini", sisa urusan hitungan faktor dan kehadiran 100% diproses Webapp.

## 6. Error Handling

### Common Errors

| Status | Error | Penyebab | Solusi |
|--------|-------|----------|--------|
| 401 | `Invalid or missing webhook token` | Header Authorization tidak ada atau salah | Periksa N8N_WEBHOOK_SECRET di .env |
| 400 | `Missing required fields` | Payload tidak lengkap | Pastikan branchId, tanggal, cash ada |
| 500 | `Database error` | Koneksi DB gagal | Periksa status MariaDB |

### Retry Strategy di N8N

```json
{
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 300000
}
```

## 7. Testing Webhook

### Test Manual dengan cURL

```bash
curl -X POST https://your-domain.com/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_N8N_WEBHOOK_SECRET" \
  -d '{
    "branchId": "UTM",
    "tanggal": "2026-06-20",
    "cash": 5000000,
    "piutang": 1000000
  }'
```

### Expected Response
```json
{
  "success": true,
  "count": 1,
  "message": "Omzet recorded successfully"
}
```

## 8. Monitoring

### Cek Log Backend
```bash
pm2 logs cs-comm-backend --lines 100
```

### Cek Webhook terakhir
```bash
mysql -u root -p cs_commission -e "SELECT * FROM omzet ORDER BY created_at DESC LIMIT 5;"
```

## 9. Best Practices

1. **Gunakan HTTPS** untuk semua webhook di production
2. **Rotate secret** secara berkala (minimal 6 bulan sekali)
3. **Monitor execution** di N8N UI untuk memastikan tidak ada error
4. **Test di staging** sebelum deploy ke production
5. **Dokumentasikan** setiap perubahan workflow di N8N

---
**Last Updated**: 2026-06-20
