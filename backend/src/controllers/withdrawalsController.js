import * as withdrawalsService from '../services/withdrawalsService.js';
import * as auditService from '../services/auditService.js';

// CS creates a withdrawal request
export const create = async (req, res) => {
  try {
    const { nominal, metode, keterangan } = req.body;
    if (!nominal || nominal <= 0) {
      return res.status(400).json({ error: 'Nominal tidak valid' });
    }
    const result = await withdrawalsService.createWithdrawalRequest(
      req.user.id, nominal, metode || 'transfer', keterangan || ''
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Admin/HRD approves or rejects a pending request
export const approve = async (req, res) => {
  try {
    const { withdrawalId, approved, catatan } = req.body;
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId required' });

    const wd = await withdrawalsService.getWithdrawalRequests({ id: withdrawalId });
    if (!wd || wd.length === 0) return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });

    if (req.branchScope && req.branchScope !== wd[0].branch_id) {
      return res.status(403).json({ error: 'Forbidden: Not your branch' });
    }

    const result = await withdrawalsService.approveWithdrawalRequest(withdrawalId, approved, catatan);
    await auditService.recordLog({
      userId: req.user.id,
      action: approved ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
      entity: 'withdrawal',
      entityId: withdrawalId,
      ipAddress: req.ip,
      details: { approved, catatan, nominal: wd[0].nominal, targetUser: wd[0].user_id }
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all withdrawal requests (scoped by role)
export const getAll = async (req, res) => {
  try {
    const { userId, branchId, status, dateFrom, dateTo } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    if (req.user.role === 'cs') {
      filters.userId = req.user.id;
    } else if (userId) {
      filters.userId = userId;
    }

    if (req.branchScope && !Array.isArray(req.branchScope)) {
      filters.branchId = req.branchScope;
    } else if (branchId) {
      filters.branchId = branchId;
    }

    const result = await withdrawalsService.getWithdrawalRequests(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get personal balance
export const getBalance = async (req, res) => {
  try {
    const { userId, dateFrom, dateTo } = req.query;
    const targetUserId = (req.user.role !== 'cs' && userId) ? userId : req.user.id;
    const result = await withdrawalsService.getUserBalance(targetUserId, dateFrom, dateTo);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get mutation history (ledger) — supports filters
export const getMutations = async (req, res) => {
  try {
    const { userId, branchId, dateFrom, dateTo } = req.query;
    const filters = { dateFrom, dateTo };

    if (req.user.role === 'cs') {
      filters.userId = req.user.id;
    } else if (userId) {
      filters.userId = userId;
    }

    if (req.branchScope && !Array.isArray(req.branchScope)) {
      filters.branchId = req.branchScope;
    } else if (branchId) {
      filters.branchId = branchId;
    }

    const result = await withdrawalsService.getMutationHistory(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get daily summary aggregation (Admin/HRD, all-user mode)
export const getDailySummary = async (req, res) => {
  try {
    const { branchId, dateFrom, dateTo } = req.query;
    const filters = { dateFrom, dateTo };

    if (req.branchScope && !Array.isArray(req.branchScope)) {
      filters.branchId = req.branchScope;
    } else if (branchId) {
      filters.branchId = branchId;
    }

    const result = await withdrawalsService.getDailyMutationSummary(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin/HRD creates a manual kas keluar (or masuk)
export const createManual = async (req, res) => {
  try {
    const { userId, branchId, nominal, metode, keterangan, tipe, tanggal } = req.body;
    if (!userId || !nominal || nominal <= 0) return res.status(400).json({ error: 'userId dan nominal wajib diisi' });

    // Scope check for HRD
    let effectiveBranchId = branchId;
    if (req.branchScope && !Array.isArray(req.branchScope)) {
      effectiveBranchId = req.branchScope;
    }

    const result = await withdrawalsService.createManualMutation({
      userId, branchId: effectiveBranchId, nominal, metode, keterangan, tipe: tipe || 'keluar', tanggal
    });

    await auditService.recordLog({
      userId: req.user.id,
      action: 'CREATE_MANUAL_MUTATION',
      entity: 'commission_mutation',
      entityId: result.mutation?.id,
      ipAddress: req.ip,
      details: { userId, nominal, metode, tipe, keterangan }
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Admin/HRD updates a manual mutation
export const updateManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { nominal, metode, keterangan, tanggal } = req.body;
    const result = await withdrawalsService.updateManualMutation(id, { nominal, metode, keterangan, tanggal });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Admin/HRD deletes a manual mutation
export const deleteManual = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await withdrawalsService.deleteManualMutation(id);
    await auditService.recordLog({
      userId: req.user.id, action: 'DELETE_MANUAL_MUTATION',
      entity: 'commission_mutation', entityId: id, ipAddress: req.ip
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
