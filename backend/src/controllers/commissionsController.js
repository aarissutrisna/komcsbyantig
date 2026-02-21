import * as commissionsService from '../services/commissionsService.js';
import * as auditService from '../services/auditService.js';

export const calculateByDate = async (req, res) => {
  try {
    const { branchId, tanggal } = req.body;

    if (!branchId || !tanggal) {
      return res.status(400).json({ error: 'branchId and tanggal required' });
    }

    // SCOPE ENFORCEMENT
    if (req.branchScope && req.branchScope !== branchId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this branch' });
    }

    const result = await commissionsService.calculateCommissionByDate(branchId, tanggal);

    // AUDIT LOG
    await auditService.recordLog({
      userId: req.user.id,
      action: 'CALCULATE_COMMISSION_DATE',
      entity: 'commission',
      entityId: branchId,
      ipAddress: req.ip,
      details: { branchId, tanggal }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const calculateByBranch = async (req, res) => {
  try {
    const { branchId, periodStart, periodEnd } = req.body;

    if (!branchId || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'branchId, periodStart, periodEnd required' });
    }

    // SCOPE ENFORCEMENT
    if (req.branchScope && req.branchScope !== branchId) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this branch' });
    }

    const result = await commissionsService.calculateCommissionByBranch(branchId, periodStart, periodEnd);

    // AUDIT LOG
    await auditService.recordLog({
      userId: req.user.id,
      action: 'CALCULATE_COMMISSION_BRANCH',
      entity: 'commission',
      entityId: branchId,
      ipAddress: req.ip,
      details: { branchId, periodStart, periodEnd }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const recalculateAll = async (req, res) => {
  try {
    // AUDIT LOG – fire-and-forget to not block response
    auditService.recordLog({
      userId: req.user.id,
      action: 'RECALCULATE_ALL_COMMISSIONS',
      entity: 'commission',
      entityId: null,
      ipAddress: req.ip,
      details: { initiatedBy: req.user.id }
    }).catch(console.error);

    const result = await commissionsService.recalculateAllBranches();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
