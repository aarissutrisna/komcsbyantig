-- Setup Webhook Hutang per Cabang
-- Tanggal: 2026-06-21
-- Deskripsi: Konfigurasi webhook hutang supplier untuk modul Analisa Keuangan

-- 1. UTM & JTJ: 1 Finance Group (URL webhook sama)
-- Keduanya menggunakan workflow hutang-rinci-utm dari N8N
UPDATE branches 
SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-utm',
    n8n_debt_secret = NULL  -- Pakai secret omzet yang sudah ada (fallback)
WHERE id IN ('UTM', 'JTJ');

-- 2. TSM: Finance Group Sendiri (URL webhook beda)
-- Menggunakan workflow hutang-rinci-tsm dari N8N
UPDATE branches 
SET n8n_debt_endpoint = 'https://n8n123.puncakjb.id/webhook/hutang-rinci-tsm',
    n8n_debt_secret = NULL  -- Pakai secret omzet yang sudah ada (fallback)
WHERE id = 'TSM';

-- 3. Verifikasi setup
SELECT 
    id,
    name,
    n8n_debt_endpoint,
    finance_group_key,
    CASE 
        WHEN n8n_debt_endpoint IS NULL THEN 'Belum dikonfigurasi'
        ELSE 'Aktif'
    END as status
FROM branches
ORDER BY id;

-- 4. Lihat finance groups yang terbentuk
SELECT 
    finance_group_key,
    n8n_debt_endpoint as webhook_url,
    GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') as branch_ids,
    COUNT(*) as branch_count,
    CASE 
        WHEN COUNT(*) > 1 THEN CONCAT(GROUP_CONCAT(id ORDER BY id SEPARATOR '-'), ' Combined')
        ELSE MAX(name)
    END as group_name
FROM branches
WHERE n8n_debt_endpoint IS NOT NULL
GROUP BY finance_group_key, n8n_debt_endpoint
ORDER BY MIN(id);
