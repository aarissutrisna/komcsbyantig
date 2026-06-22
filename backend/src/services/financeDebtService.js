import pool from '../config/database.js';
import { getGroupByKey, getGroupSettings } from './financeGroupService.js';

/**
 * Fetch debt data from N8N webhook (hutang-rinci)
 */
export const fetchDebtsFromN8N = async (financeGroupKey, nDays = 90) => {
  const group = await getGroupByKey(financeGroupKey);
  if (!group) {
    throw new Error('Finance group not found');
  }

  const settings = await getGroupSettings(financeGroupKey);
  const webhookUrl = group.webhook_url;
  const webhookSecret = settings?.webhook_secret || group.webhook_secret;

  if (!webhookUrl) {
    throw new Error('Webhook URL not configured for this finance group');
  }

  const url = `${webhookUrl}?n_days=${nDays}`;
  const headers = {
    'Accept': 'application/json'
  };

  if (webhookSecret) {
    headers['Authorization'] = `Bearer ${webhookSecret}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status === 'error' || data.error) {
      throw new Error(data.message || 'Webhook returned error');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('Webhook timeout — tidak ada respons dalam 30 detik');
    }
    throw error;
  }
};

/**
 * Transform N8N response to standardized debt objects
 */
export const transformN8NResponse = (n8nResponse) => {
  if (!n8nResponse || !n8nResponse.data) {
    return [];
  }

  const debts = [];

  for (const supplier of n8nResponse.data) {
    if (supplier.detail_invoices) {
      for (const invoice of supplier.detail_invoices) {
        debts.push({
          supplier_name: supplier.nama_supplier,
          supplier_code: supplier.kode_supplier,
          invoice_no: invoice.notransaksi,
          invoice_date: invoice.tgl_beli,
          due_date: invoice.jatuh_tempo,
          amount: invoice.hutang_awal,
          paid_amount: invoice.sudah_dibayar || 0,
          sisa_hutang: invoice.sisa_hutang,
          sisa_hari: invoice.sisa_hari,
          aging_category: deriveAgingCategory(invoice.sisa_hari)
        });
      }
    }
  }

  return debts;
};

/**
 * Derive aging category from sisa_hari
 * Convention: positive = not yet due, negative = overdue
 */
export const deriveAgingCategory = (sisaHari) => {
  if (sisaHari > 0) return 'belum_jatuh_tempo';
  const overdueAge = Math.abs(sisaHari);
  if (overdueAge <= 30) return 'overdue_1_30';
  if (overdueAge <= 90) return 'overdue_31_90';
  return 'overdue_kronis';
};

/**
 * Calculate aging summary from debts
 */
export const calculateAgingSummary = (debts) => {
  const summary = {
    belum_jatuh_tempo: { count: 0, total: 0 },
    overdue_1_30: { count: 0, total: 0 },
    overdue_31_90: { count: 0, total: 0 },
    overdue_kronis: { count: 0, total: 0 }
  };

  for (const debt of debts) {
    const category = debt.aging_category;
    if (summary[category]) {
      summary[category].count++;
      summary[category].total += debt.sisa_hutang;
    }
  }

  return summary;
};

/**
 * Test webhook connection
 */
export const testWebhookConnection = async (financeGroupKey) => {
  try {
    const result = await fetchDebtsFromN8N(financeGroupKey, 7); // Small window for test
    return {
      success: true,
      message: 'Koneksi berhasil',
      data: {
        total_suppliers: result.total_suppliers || 0,
        total_invoices: result.total_invoices || 0,
        grand_total: result.grand_total || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};
