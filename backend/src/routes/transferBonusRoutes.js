import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as settingsService from '../services/settingsService.js';

const router = express.Router();

const DEFAULT_WEBHOOK_URL = 'http://192.168.100.12:5678/webhook/transfer-bonus-v2';

/**
 * GET /api/transfer-bonus
 * Query params: startDate, endDate, direction (All | UTMtoJTJ | JTJtoUTM)
 * Semua user terautentikasi bisa mengakses.
 * Backend mem-proxy request ke webhook n8n dan mengembalikan hasilnya.
 */
router.get('/', authMiddleware, async (req, res) => {
    const { startDate, endDate, direction = 'All' } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Parameter startDate dan endDate wajib diisi.' });
    }

    try {
        // Baca URL webhook dari system_settings (bisa dikonfigurasi admin)
        const webhookUrl = await settingsService.getSetting('webhook_transfer_bonus_url', DEFAULT_WEBHOOK_URL);

        const params = new URLSearchParams({ startDate, endDate, direction });
        const fullUrl = `${webhookUrl}?${params.toString()}`;

        // Gunakan node-fetch (sudah ada di backend dependencies)
        const { default: fetch } = await import('node-fetch');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({
                error: `Webhook mengembalikan error ${response.status}`,
                detail: text,
            });
        }

        const data = await response.json();
        return res.json(data);

    } catch (err) {
        if (err.name === 'AbortError') {
            return res.status(504).json({ error: 'Webhook timeout — tidak ada respons dalam 30 detik.' });
        }
        console.error('[transfer-bonus] Webhook error:', err.message);
        return res.status(502).json({ error: 'Gagal menghubungi webhook n8n.', detail: err.message });
    }
});

export default router;
