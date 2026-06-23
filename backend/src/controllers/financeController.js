import * as financeGroupService from '../services/financeGroupService.js';
import * as financeAnalysisService from '../services/financeAnalysisService.js';
import * as auditService from '../services/auditService.js';

/**
 * Get all finance groups (auto-derived from branches)
 */
export const getGroups = async (req, res) => {
  try {
    const groups = await financeGroupService.getAllGroups();
    res.json(groups);
  } catch (error) {
    console.error('Error getting finance groups:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get finance group detail
 */
export const getGroupDetail = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const group = await financeGroupService.getGroupByKey(groupKey);
    
    if (!group) {
      return res.status(404).json({ error: 'Finance group not found' });
    }

    const branches = await financeGroupService.getBranchesInGroup(groupKey);
    const settings = await financeGroupService.getGroupSettings(groupKey);

    res.json({
      ...group,
      branches,
      settings
    });
  } catch (error) {
    console.error('Error getting finance group detail:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update finance group settings
 */
export const updateGroupSettings = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const { opex_percent, safety_margin_percent, n_days_default, webhook_secret } = req.body;

    await financeGroupService.updateGroupSettings(groupKey, {
      opex_percent,
      safety_margin_percent,
      n_days_default,
      webhook_secret
    });

    await auditService.recordLog({
      userId: req.user.id,
      action: 'UPDATE_FINANCE_GROUP_SETTINGS',
      entity: 'finance_group',
      entityId: groupKey,
      ipAddress: req.ip,
      details: { opex_percent, safety_margin_percent, n_days_default }
    });

    res.json({ success: true, message: 'Pengaturan grup berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating finance group settings:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Preview financial analysis (without saving to DB)
 */
export const previewAnalysis = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const { cash_amount, skip_overdue_kronis, ignored_suppliers, use_cash_for_debt, cash_breakdown } = req.body;

    const group = await financeGroupService.getGroupByKey(groupKey);
    if (!group) {
      return res.status(404).json({ error: 'Finance group not found' });
    }

    const result = await financeAnalysisService.runAnalysis(
      groupKey,
      req.user.id,
      null,
      cash_amount,
      {
        skipOverdueKronis: skip_overdue_kronis,
        ignoredSuppliers: Array.isArray(ignored_suppliers) ? ignored_suppliers : [],
        useCashForDebt: !!use_cash_for_debt,
        cashBreakdown: cash_breakdown
      },
      false // Don't save to DB
    );

    res.json(result);
  } catch (error) {
    console.error('Error previewing finance analysis:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save previewed analysis to history
 */
export const saveAnalysis = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const { run_label, cash_amount, skip_overdue_kronis, ignored_suppliers, use_cash_for_debt, cash_breakdown } = req.body;

    const group = await financeGroupService.getGroupByKey(groupKey);
    if (!group) {
      return res.status(404).json({ error: 'Finance group not found' });
    }

    const result = await financeAnalysisService.runAnalysis(
      groupKey,
      req.user.id,
      run_label,
      cash_amount,
      {
        skipOverdueKronis: skip_overdue_kronis,
        ignoredSuppliers: Array.isArray(ignored_suppliers) ? ignored_suppliers : [],
        useCashForDebt: !!use_cash_for_debt,
        cashBreakdown: cash_breakdown
      },
      true // Save to DB
    );

    await auditService.recordLog({
      userId: req.user.id,
      action: 'SAVE_FINANCE_ANALYSIS',
      entity: 'finance_analysis',
      entityId: result.run_id,
      ipAddress: req.ip,
      details: { 
        finance_group_key: groupKey,
        run_label,
        avg_daily_revenue: result.avg_daily_revenue
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error saving finance analysis:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get analysis history
 */
export const getAnalysisHistory = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const history = await financeAnalysisService.getAnalysisHistory(groupKey, limit);
    res.json(history);
  } catch (error) {
    console.error('Error getting analysis history:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get analysis detail
 */
export const getAnalysisDetail = async (req, res) => {
  try {
    const { runId } = req.params;
    const detail = await financeAnalysisService.getAnalysisDetail(runId);

    if (!detail) {
      return res.status(404).json({ error: 'Analysis run not found' });
    }

    res.json(detail);
  } catch (error) {
    console.error('Error getting analysis detail:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete analysis run
 */
export const deleteAnalysisRun = async (req, res) => {
  try {
    const { runId } = req.params;
    const deleted = await financeAnalysisService.deleteAnalysisRun(runId);

    if (!deleted) {
      return res.status(404).json({ error: 'Analysis run not found' });
    }

    await auditService.recordLog({
      userId: req.user.id,
      action: 'DELETE_FINANCE_ANALYSIS',
      entity: 'finance_analysis',
      entityId: runId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Analysis run deleted' });
  } catch (error) {
    console.error('Error deleting analysis run:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(400).json({ 
        error: 'Tidak dapat menghapus data analisa ini karena sedang digunakan sebagai acuan (baseline) oleh draf simulasi pembelian aktif.' 
      });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get alerts for a finance group
 */
export const getAlerts = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const pool = (await import('../config/database.js')).default;
    
    const [rows] = await pool.execute(
      `SELECT 
        a.*,
        r.run_label,
        r.created_at as run_date
      FROM finance_alerts a
      LEFT JOIN finance_analysis_runs r ON r.id = a.analysis_run_id
      WHERE a.finance_group_key = ?
      ORDER BY a.created_at DESC
      LIMIT 100`,
      [groupKey]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark alert as read
 */
export const markAlertRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const pool = (await import('../config/database.js')).default;
    
    await pool.execute(
      `UPDATE finance_alerts SET is_read = TRUE WHERE id = ?`,
      [alertId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: error.message });
  }
};
