# Panduan Pembuatan Workflow n8n (Integrasi Omzet)

Dokumen ini menjelaskan cara membuat workflow di n8n agar kompatibel dengan sistem **Komisi CS Puncak Jaya Baja**.

## 1. Konfigurasi Endpoint di Sistem
Pastikan setiap Cabang telah dikonfigurasi dengan kode yang tepat dan URL Webhook dari n8n:
- **UTM** (Puncak Jaya Baja UTM)
- **JTJ** (Puncak Jaya Baja JTJ)
- **TSM** (Puncak Jaya Baja TSM)

## 2. Struktur Workflow n8n

### A. Trigger: Webhook
Buat node **Webhook** dengan pengaturan berikut:
- **HTTP Method**: `POST`
- **Path**: Sesuaikan (contoh: `sync-omzet-utm`)
- **Response Mode**: `On Received` (atau `Last Node` jika ingin menunggu proses selesai)

### B. Payload Input (Diterima dari Backend)
Backend akan mengirimkan payload berupa JSON jika melakukan *Historical Sync*:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-07"
}
```
*Tip: Jika ini adalah sync harian otomatis, payload mungkin kosong dan workflow bisa di-set untuk mengambil data hari ini saja.*

### C. Pengambilan Data
Anda bisa mengambil data dari Google Sheets, database external, atau API lain. Pastikan Anda memfilter data berdasarkan rentang tanggal yang diterima di langkah sebelumnya.

### D. Transformasi Data (Node Code/Set)
Sistem mengharapkan array JSON dengan format flat. Gunakan node **Code** atau **Set** untuk memastikan output akhir seperti ini:

```json
[
  {
    "tanggal": "2024-02-19",
    "cash": 15000000,
    "piutang": 5000000
  },
  {
    "tanggal": "2024-02-18",
    "cash": 12000000,
    "piutang": 3000000
  }
]
```

**Ketentuan Nama Properti:**
1.  **`tanggal`**: Harus dalam format `YYYY-MM-DD` atau `DD-MM-YYYY`.
2.  **`cash`**: Angka (Number) omzet tunai.
3.  **`piutang`**: Angka (Number) omzet piutang/tempo.
4.  **`total`**: (Opsional) Sistem akan otomatis menjumlahkan `cash + piutang` jika tidak dikirim.

---

## 3. Contoh Script Transformasi (Node Code)
Jika data Anda berasal dari Google Sheets dengan kolom `Tanggal`, `Cash`, dan `Tempo`:

```javascript
return items.map(item => {
  return {
    json: {
      tanggal: item.json["Tanggal"], // Pastikan formatnya stabil
      cash: parseFloat(item.json["Cash"] || 0),
      piutang: parseFloat(item.json["Tempo"] || 0)
    }
  };
});
```

## 4. Keamanan (Opsional tapi Disarankan)
Untuk memastikan hanya server backend yang bisa memicu workflow, Anda bisa menambahkan header **Authentication** (spt. Header Auth) pada node Webhook n8n dan menyesuaikan service fetcher di backend.

---

> [!TIP]
> **Penting**: Sistem ini bersifat "Read-Only Source of Truth". Pastikan data di n8n selalu akurat karena sistem akan menimpa data lokal dengan data dari n8n setiap kali sinkronisasi dijalankan.
