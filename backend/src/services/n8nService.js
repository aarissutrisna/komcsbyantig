import pool from '../config/database.js';
import fetch from 'node-fetch';

/**
 * Base service for fetching data from N8N endpoints
 */
export const fetchFromBranch = async (branchId, payload = {}) => {
    const [branches] = await pool.execute(
        'SELECT n8n_endpoint, n8n_secret FROM branches WHERE id = ?',
        [branchId]
    );

    if (branches.length === 0 || !branches[0].n8n_endpoint) {
        throw new Error('Branch not found or N8N endpoint not configured');
    }

    const n8nEndpoint = branches[0].n8n_endpoint;
    const branchSecret = branches[0].n8n_secret;
    const globalSecret = process.env.N8N_WEBHOOK_SECRET;

    const token = (branchSecret && branchSecret.trim() !== '') ? branchSecret : globalSecret;

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`Fetching from N8N: ${n8nEndpoint} with payload:`, payload);
    try {
        const response = await fetch(n8nEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`N8N Response Error (${response.status}):`, errorText);
            throw new Error(`Failed to fetch from N8N: ${response.statusText}`);
        }

        const rawData = await response.json();
        console.log(`N8N Response Data count: ${Array.isArray(rawData) ? rawData.length : 1}`);
        const n8nData = Array.isArray(rawData) ? rawData : [rawData];

        // Basic validation
        return n8nData.filter((item) =>
            item && typeof item === 'object' &&
            typeof item.tanggal === 'string' &&
            (typeof item.cash === 'number' || item.cash === null) &&
            (typeof item.piutang === 'number' || item.piutang === null)
        );
    } catch (error) {
        console.error('Detailed Fetch Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause
        });
        throw error;
    }
};

/**
 * Common date format converter
 */
export const convertDateFormat = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    const patterns = [
        { regex: /^(\d{2})-(\d{2})-(\d{4})$/, format: (m) => `${m[3]}-${m[2]}-${m[1]}` },
        { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, format: (m) => `${m[3]}-${m[2]}-${m[1]}` },
        { regex: /^(\d{4})-(\d{2})-(\d{2})$/, format: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    ];

    for (const { regex, format } of patterns) {
        const match = dateStr.match(regex);
        if (match) {
            return format(match);
        }
    }

    return dateStr;
};
