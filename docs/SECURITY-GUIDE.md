# Security Guide & Hardening Mechanisms (Production)

Dokumen sekuritas sistem yang menjelaskan tembok pertahanan aplikasi dari Human Error maupun ancaman disengaja.

## 1. ACID Transaction Safety (Anti Race Condition)
Aplikasi finansial sangat rentan jika dua perintah dieksekusi bersamaan (contoh: 2 HRD memasukkan CS ke Cabang yang sama). 
**Pertahanan**: Sistem ini menggunakan `BEGIN...COMMIT` Atomik.
Ketika validasi "Sisa Kuota 100%" dipanggil:
```javascript
SELECT SUM(faktor_komisi) FROM cs_penugasan WHERE cabang_id=? FOR UPDATE
```
Klausa `FOR UPDATE` akan "mengunci" (Row Lock) cabang tersebut. Jika request API kedua masuk di milidetik yang sama, ia akan "mengantre".

## 2. SQL Injection Prevention & Data Check
Tidak ada *raw string interpolation* di seluruh sistem. 
Sistem mengeksekusi Parameterized Query pure (`connection.execute('...', [p1, p2])`) via pustaka `mysql2/promise`.

Bahkan jika ada data menembus Node API, MariaDB di-hardened dengan:
- `CONSTRAINT CHECK (faktor_komisi > 0 AND faktor_komisi <= 1)`
- `UNIQUE KEY uk_penugasan_user_cabang_date (user_id, cabang_id, tanggal_mulai)`

## 3. Role-Based Access Control (RBAC)
Middleware Node.js melindungi tiap endpoint rawan:
- Admin (`role === 'admin'`): Memegang izin Rekalkulasi, Import CSV, ganti Target Bawah/Atas, dan Override Data.
- HRD (`role === 'hrd'`): Edit Users dan Penugasan (Tidak merubah nominal komisi).
- CS (`role === 'cs'`): Terkunci hanya melihat Omzet cabang dan komisi miliknya saja (Tembok isolasi API).

## 4. Header-auth N8N Webhook (Anti-Body Logger)
Sistem menolak *token* yang dikirim di Payload JSON. Integrasi automasi N8N dan Third-Party wajib meletakkan rahasianya di HTTP Header `Authorization: Bearer <token_sama_dengan_.env>`. Ini mencegah tersebarnya Secret Key dari *Network Log*, *Proxy Log*, maupun Middleware logger di Express server.
