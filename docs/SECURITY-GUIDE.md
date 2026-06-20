# Security Guide & Hardening Mechanisms (Production)

Dokumen sekuritas sistem yang menjelaskan tembok pertahanan aplikasi dari Human Error maupun ancaman disengaja.

## 1. ACID Transaction Safety (Anti Race Condition)
Aplikasi finansial sangat rentan jika dua perintah dieksekusi bersamaan (contoh: 2 HRD memasukkan CS ke Cabang yang sama). 
**Pertahanan**: Sistem ini menggunakan `BEGIN...COMMIT` Atomik.
Ketika validasi "Sisa Kuota 100%" dipanggil:
```javascript
SELECT SUM(porsi_percent) FROM cabang_user_allocation WHERE cabang_id=? FOR UPDATE
```
Klausa `FOR UPDATE` akan "mengunci" (Row Lock) cabang tersebut. Jika request API kedua masuk di milidetik yang sama, ia akan "mengantre".

## 2. SQL Injection Prevention & Data Check
Tidak ada *raw string interpolation* di seluruh sistem. 
Sistem mengeksekusi Parameterized Query pure (`connection.execute('...', [p1, p2])`) via pustaka `mysql2/promise`.

Bahkan jika ada data menembus Node API, MariaDB di-hardened dengan:
- `CONSTRAINT CHECK (porsi_percent >= 0 AND porsi_percent <= 100)`
- `UNIQUE KEY uk_penugasan_user_cabang_date (user_id, cabang_id, start_date)`

## 3. Role-Based Access Control (RBAC)
Middleware Node.js melindungi tiap endpoint rawan:
- **Admin** (`role === 'admin' || role === 'super_admin'`): Memegang izin Rekalkulasi, Import CSV, ganti Target Bawah/Atas, Override Data, dan pengaturan sistem global (webhook URL, bonus settings).
- **HRD** (`role === 'hrd'`): Edit Users dan Penugasan (Tidak merubah nominal komisi atau settings sistem).
- **CS** (`role === 'cs'`): Terkunci hanya melihat Omzet cabang dan komisi miliknya saja (Tembok isolasi API). Dapat mengakses Transfer Bonus (read-only).

### Endpoint Protection Matrix
| Endpoint | Admin | HRD | CS |
|----------|:-----:|:---:|:--:|
| `/api/settings/bonus-transfer` (GET) | ✅ | ✅ | ✅ |
| `/api/settings/bonus-transfer` (POST) | ✅ | ❌ | ❌ |
| `/api/transfer-bonus` (GET) | ✅ | ✅ | ✅ |
| `/api/commissions/recalculate-all` | ✅ | ❌ | ❌ |
| `/api/omzet/import-*` | ✅ | ❌ | ❌ |
| `/api/branches` (POST/PUT/DELETE) | ✅ | ❌ | ❌ |
| `/api/auth/users` (POST/PUT/DELETE) | ✅ | ❌ | ❌ |

## 4. Header-auth N8N Webhook (Anti-Body Logger)
Sistem menolak *token* yang dikirim di Payload JSON. Integrasi automasi N8N dan Third-Party wajib meletakkan rahasianya di HTTP Header `Authorization: Bearer <token_sama_dengan_.env>`. Ini mencegah tersebarnya Secret Key dari *Network Log*, *Proxy Log*, maupun Middleware logger di Express server.

## 5. JWT Token Security
- Token JWT memiliki expiry 7 hari.
- Secret key disimpan di environment variable (`JWT_SECRET`), tidak di-hardcode.
- Token divalidasi di setiap request API (kecuali `/auth/login` dan webhook N8N).
- Payload token hanya berisi `id`, `email`, `role`, `branch_id` (tidak ada data sensitif).

## 6. Password Hashing
- Password di-hash menggunakan bcrypt dengan salt rounds yang cukup.
- Password tidak pernah disimpan dalam plain text.
- Change password memerlukan old password verification.

## 7. CORS Protection
- CORS dikonfigurasi untuk hanya menerima request dari origin yang diizinkan.
- `CORS_ORIGIN` di `.env` harus diatur ke domain production (bukan `*`).

## 8. Trust Proxy Configuration
Backend dikonfigurasi dengan `trust proxy` untuk topologi network multi-hop:
```javascript
app.set('trust proxy', '10.40.0.1'); // WGhub IP
```
Ini memastikan `X-Forwarded-For` dan `X-Real-IP` header hanya dipercaya dari IP yang valid.

## 9. Audit Logging
Semua operasi kritikal dicatat di tabel `audit_logs`:
- Calculate commission
- Mutasi cabang
- Import data
- Approval withdrawal
- Perubahan settings

Log mencakup: `user_id`, `action`, `entity`, `entity_id`, `timestamp`, `ip_address`, `details` (JSON).

## 10. Input Validation
- Semua input divalidasi di level controller sebelum diproses.
- Date format divalidasi (YYYY-MM-DD).
- Numeric fields divalidasi range-nya.
- String fields di-trim dan di-sanitize.

---
**Last Updated**: 2026-06-20
