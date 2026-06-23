import * as financeSimulationService from '../services/financeSimulationService.js';
import * as auditService from '../services/auditService.js';

/**
 * Preview calculations for simulated debts + baseline run
 */
export const previewSimulation = async (req, res) => {
  try {
    const { baseline_run_id, simulated_debts } = req.body;
    if (!baseline_run_id) {
      return res.status(400).json({ error: 'baseline_run_id wajib diisi' });
    }
    const result = await financeSimulationService.previewSimulation(baseline_run_id, simulated_debts);
    res.json(result);
  } catch (error) {
    console.error('Error in previewSimulation controller:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Save a simulation draft
 */
export const saveSimulation = async (req, res) => {
  try {
    const { baseline_run_id, sim_label, simulated_debts } = req.body;
    if (!baseline_run_id || !sim_label) {
      return res.status(400).json({ error: 'baseline_run_id dan sim_label wajib diisi' });
    }
    const result = await financeSimulationService.saveSimulation(baseline_run_id, sim_label, req.user.id, simulated_debts);
    
    await auditService.recordLog({
      userId: req.user.id,
      action: 'SAVE_FINANCE_SIMULATION',
      entity: 'finance_purchase_simulations',
      entityId: result.id,
      ipAddress: req.ip,
      details: { baseline_run_id, sim_label, item_count: (simulated_debts || []).length }
    });

    res.json(result);
  } catch (error) {
    console.error('Error in saveSimulation controller:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all simulation drafts for a group
 */
export const getSimulations = async (req, res) => {
  try {
    const { groupKey } = req.params;
    const result = await financeSimulationService.getAllSimulations(groupKey);
    res.json(result);
  } catch (error) {
    console.error('Error in getSimulations controller:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get simulation detail and its preview recalculations
 */
export const getSimulationDetail = async (req, res) => {
  try {
    const { simId } = req.params;
    const result = await financeSimulationService.getSimulationDetail(simId);
    if (!result) {
      return res.status(404).json({ error: 'Simulasi pembelian tidak ditemukan' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error in getSimulationDetail controller:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a simulation draft
 */
export const deleteSimulation = async (req, res) => {
  try {
    const { simId } = req.params;
    const deleted = await financeSimulationService.deleteSimulation(simId);
    if (!deleted) {
      return res.status(404).json({ error: 'Simulasi pembelian tidak ditemukan' });
    }
    
    await auditService.recordLog({
      userId: req.user.id,
      action: 'DELETE_FINANCE_SIMULATION',
      entity: 'finance_purchase_simulations',
      entityId: simId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Simulasi pembelian berhasil dihapus' });
  } catch (error) {
    console.error('Error in deleteSimulation controller:', error);
    res.status(500).json({ error: error.message });
  }
};
