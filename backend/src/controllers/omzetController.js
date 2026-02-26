import * as omzetService from '../services/omzetService.js';
import * as omzetImportService from '../services/omzetImportService.js';
import * as omzetPreviewService from '../services/omzetPreviewService.js';
import * as omzetUpdateService from '../services/omzetUpdateService.js';
import * as attendanceImportService from '../services/attendanceImportService.js';
import * as auditService from '../services/auditService.js';
import * as branchesService from '../services/branchesService.js';

/**
 * Helper: check if branchId is within the allowed scope.
 * scope can be:
 *   - null  → admin, all allowed
 *   - string → HRD single branch
 *   - string[] → CS multi-branch (Opsi B)
 */
const isBranchAllowed = (scope, branchId) => {
  if (!scope) return true;
  if (Array.isArray(scope)) return scope.includes(branchId);
  return scope === branchId;
};

export const create = async (req, res) => {
  // ... (keep existing creation logic if needed, but per requirement manual edit is prohibited)
  // Actually, the requirement says "Tidak boleh ada input manual omzet."
  return res.status(403).json({ error: 'Manual omzet creation is disabled. Use N8N Sync.' });
};

/**
 * 2.a Ambil Data Hari Ini (PREVIEW MODE)
 */
export const previewToday = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) return res.status(400).json({ error: 'branchId required' });

    // Scope check (handles both string HRD and array CS)
    const scope = req.branchScope;
    if (branchId !== 'all' && scope && !isBranchAllowed(scope, branchId)) {
      return res.status(403).json({ error: 'Forbidden: Access to other branch restricted' });
    }

    const data = await omzetPreviewService.getPreviewToday(branchId, scope);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 2.b Show Comparison for Update
 */
export const showUpdateComparison = async (req, res) => {
  try {
    const { branchId, tanggal } = req.query;
    if (!branchId || !tanggal) return res.status(400).json({ error: 'branchId and tanggal required' });

    // Scope check
    const scope = req.branchScope;
    if (scope && !isBranchAllowed(scope, branchId)) {
      return res.status(403).json({ error: 'Forbidden: Access to other branch restricted' });
    }

    const comparison = await omzetUpdateService.getUpdateComparison(branchId, tanggal);
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 2.b Save Controlled Update
 */
export const saveControlledUpdate = async (req, res) => {
  try {
    const { branchId, tanggal } = req.body;
    if (!branchId || !tanggal) return res.status(400).json({ error: 'branchId and tanggal required' });

    // Role check: CS cannot update data
    if (req.user.role === 'cs') {
      return res.status(403).json({ error: 'Forbidden: CS cannot update data' });
    }
    // Scope check
    const scope = req.branchScope;
    if (scope && !isBranchAllowed(scope, branchId)) {
      return res.status(403).json({ error: 'Forbidden: Access to other branch restricted' });
    }

    const result = await omzetUpdateService.performControlledUpdate(req.user.id, branchId, tanggal);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 1.a Import Data Awal (Admin Only)
 */
export const importHistorical = async (req, res) => {
  try {
    const { branchId, startDate, endDate, isOverride } = req.body;

    // Admin check is already in routes, but double safe
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

    const result = await omzetImportService.importHistoricalData(req.user.id, branchId, startDate, endDate, isOverride);

    // Audit Log for Import
    await auditService.recordLog({
      userId: req.user.id,
      action: isOverride ? 'INITIAL_IMPORT_OVERRIDE' : 'INITIAL_IMPORT',
      entity: 'branch',
      entityId: branchId,
      ipAddress: req.ip,
      details: { startDate, endDate, result: result.message }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByDate = async (req, res) => {
  try {
    const { date } = req.query;
    const branchScope = req.branchScope;
    const omzet = await omzetService.getOmzetByDate(date, branchScope);
    res.json(omzet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByBranch = async (req, res) => {
  try {
    const { branchId, month, year, userId } = req.query;
    if (!branchId) return res.status(400).json({ error: 'branchId required' });

    const scope = req.branchScope;
    if (scope && !isBranchAllowed(scope, branchId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    let omzet;
    if (userId === 'all') {
      omzet = await omzetService.getAggregatedOmzet(branchId, m, y);
    } else if (userId) {
      // Get user data with per-date branch resolution
      const rawData = await omzetService.getOmzetByUserFiltered(userId, m, y);
      // HRD: only show rows where the user was assigned to this HRD's branch
      if (scope && typeof scope === 'string') {
        omzet = rawData.filter(row => row.assigned_cabang_id === scope);
      } else {
        omzet = rawData;
      }
    } else {
      omzet = await omzetService.getOmzetByBranch(branchId, m, y);
    }

    res.json(omzet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByUser = async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    const finalUserId = req.user.role === 'cs' ? req.user.id : (userId || req.user.id);

    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();

    const omzet = await omzetService.getOmzetByUserFiltered(finalUserId, m, y);
    res.json(omzet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /omzet/user-assignment-check
 * Returns which branch a CS user was assigned to at the start of the given month.
 * Used by frontend to decide whether to show N/A warning for HRD.
 */
export const getUserAssignmentCheck = async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    if (!userId || !month || !year) {
      return res.status(400).json({ error: 'userId, month, and year are required' });
    }
    const result = await omzetService.getUserAssignmentForMonth(userId, parseInt(month), parseInt(year));
    res.json(result || { assignedBranchId: null, branchName: null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateKehadiran = async (req, res) => {
  try {
    const { id, kehadiran, userId } = req.body;
    if (!id || kehadiran === undefined) return res.status(400).json({ error: 'id and kehadiran required' });

    // Role check: CS cannot edit
    if (req.user.role === 'cs') {
      return res.status(403).json({ error: 'Forbidden: CS cannot edit attendance' });
    }

    const targetUserId = userId || req.user.id;

    await omzetService.updateKehadiran(targetUserId, id, kehadiran);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const importAttendance = async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'csvData required' });

    const result = await attendanceImportService.importAttendanceCSV(req.user.id, csvData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const { branchId, month, year, userId } = req.query;
    if (!branchId || !month || !year) return res.status(400).json({ error: 'branchId, month, year required' });

    if (req.branchScope && !isBranchAllowed(req.branchScope, branchId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const stats = await omzetService.getOmzetStats(branchId, month, year, userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const syncToday = async (req, res) => {
  try {
    const { branchId } = req.body;
    if (!branchId) return res.status(400).json({ error: 'branchId required' });

    const today = new Date().toISOString().split('T')[0];
    const scope = req.branchScope; // null (admin), string (hrd), or string[] (cs)

    if (branchId === 'all') {
      // Fetch all branches that have an N8N endpoint
      let query = 'SELECT id FROM branches WHERE n8n_endpoint IS NOT NULL AND n8n_endpoint != ""';
      const params = [];

      // Apply branch scope if it exists (not admin)
      if (scope) {
        if (Array.isArray(scope)) {
          query += ` AND id IN (${scope.map(() => '?').join(',')})`;
          params.push(...scope);
        } else {
          query += ' AND id = ?';
          params.push(scope);
        }
      }

      const [branchRows] = await pool.execute(query, params);
      const results = [];

      // Perform sync for each branch
      for (const b of branchRows) {
        try {
          const syncRes = await omzetService.fetchAndSyncFromN8N(b.id, today, today);
          results.push({ branchId: b.id, ...syncRes });
        } catch (err) {
          console.error(`[syncToday] Failed for branch ${b.id}:`, err.message);
          results.push({ branchId: b.id, success: false, error: err.message });
        }
      }

      return res.json({ success: true, results });
    }

    // Single branch sync
    if (scope && !isBranchAllowed(scope, branchId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await omzetService.fetchAndSyncFromN8N(branchId, today, today);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const receiveN8NWebhook = async (req, res) => {
  try {
    const { branchId, data, tanggal, cash, piutang } = req.body;

    // Hardening: Read Token from Headers instead of Body
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-n8n-api-key'];
    let providedToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.split(' ')[1];
    } else if (apiKeyHeader) {
      providedToken = apiKeyHeader;
    }

    if (!branchId) return res.status(400).json({ error: 'branchId required in body' });

    // Lookup Branch Secret
    const branch = await branchesService.getBranchById(branchId);
    if (!branch) return res.status(404).json({ error: `Branch ${branchId} not found` });

    const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

    // Branch secret takes precedence if provided, otherwise fallback to global
    const requiredSecret = branch.n8n_secret && branch.n8n_secret.trim() !== ''
      ? branch.n8n_secret
      : N8N_WEBHOOK_SECRET;

    if (requiredSecret && providedToken !== requiredSecret) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing webhook token in Header' });
    }

    let items = data ? (Array.isArray(data) ? data : [data]) : [{ tanggal, cash, piutang }];
    const results = await omzetService.syncOmzetFromN8N(branchId, items);

    res.json({ success: true, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
