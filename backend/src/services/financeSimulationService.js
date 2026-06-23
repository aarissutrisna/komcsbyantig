import crypto from 'crypto';
import pool from '../config/database.js';
import { getGroupSettings } from './financeGroupService.js';
import { transformN8NResponse, deriveAgingCategory, calculateAgingSummary } from './financeDebtService.js';
import {
  calculateDailyTarget,
  calculateBiweeklyBuckets,
  calculateWeeklyBudget,
  calculateMonthlyBudget,
  calculateBudgetForHorizon,
  calculateCashRunway,
  buildSupplierReport
} from './financeAnalysisService.js';

/**
 * Preview calculations by combining baseline run debts with simulated debts
 */
export const previewSimulation = async (baselineRunId, simulatedDebts) => {
  // 1. Fetch baseline analysis run
  const [runs] = await pool.execute(
    `SELECT * FROM finance_analysis_runs WHERE id = ? LIMIT 1`,
    [baselineRunId]
  );
  const run = runs[0];
  if (!run) {
    throw new Error('Baseline analysis run tidak ditemukan');
  }

  const groupKey = run.finance_group_key;
  
  // 2. Fetch group settings
  const settings = await getGroupSettings(groupKey);
  const opexPercent = settings?.opex_percent || 2.00;
  const safetyMarginPercent = settings?.safety_margin_percent || 15.00;

  // 3. Extract baseline options
  const parsedResult = typeof run.result_json === 'string' ? JSON.parse(run.result_json) : run.result_json;
  const { skip_overdue_kronis, ignored_suppliers, use_cash_for_debt, n_days } = parsedResult.options || {};
  const customDays = parseInt(n_days) || settings?.n_days_default || 90;

  // 4. Reconstruct baseline real debts from the snapshot
  const snapshot = typeof run.source_debt_snapshot === 'string' 
    ? JSON.parse(run.source_debt_snapshot) 
    : run.source_debt_snapshot;
  let debts = transformN8NResponse(snapshot);

  // 5. Apply baseline filters to real debts
  if (skip_overdue_kronis) {
    debts = debts.filter(d => d.aging_category !== 'overdue_kronis');
  }
  if (Array.isArray(ignored_suppliers) && ignored_suppliers.length > 0) {
    const lowercaseIgnored = ignored_suppliers.map(s => s.trim().toLowerCase()).filter(Boolean);
    if (lowercaseIgnored.length > 0) {
      debts = debts.filter(d => {
        const name = d.supplier_name ? d.supplier_name.toLowerCase() : '';
        const code = d.supplier_code ? d.supplier_code.toLowerCase() : '';
        return !lowercaseIgnored.some(ignored => name.includes(ignored) || code.includes(ignored));
      });
    }
  }

  // 6. Transform simulated debts to match standardized debt schema
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const simulatedDebtsTransformed = (simulatedDebts || []).map(sd => {
    const dueDays = parseInt(sd.due_days) || 0;
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + dueDays);
    const dueDateString = dueDate.toISOString().split('T')[0];
    
    return {
      supplier_name: sd.supplier_name || 'Simulasi Supplier',
      supplier_code: 'SIMULASI',
      invoice_no: sd.invoice_no || `SIM-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      invoice_date: today.toISOString().split('T')[0],
      due_date: dueDateString,
      amount: parseFloat(sd.amount) || 0,
      paid_amount: 0,
      sisa_hutang: parseFloat(sd.amount) || 0,
      sisa_hari: dueDays,
      aging_category: deriveAgingCategory(dueDays),
      is_simulated: true
    };
  });

  // 7. Combine real and simulated debts
  const combinedDebts = [...debts, ...simulatedDebtsTransformed];

  // 8. Run calculations on combined debts
  const dailyTarget = calculateDailyTarget(combinedDebts, { useCashForDebt: !!use_cash_for_debt, customDays }, run.cash_position_used);
  const biweeklyBuckets = calculateBiweeklyBuckets(combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent);
  const weeklyBudget = calculateWeeklyBudget(combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent);
  const monthlyBudget = calculateMonthlyBudget(combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent);
  const cashRunway = calculateCashRunway(run.cash_position_used, run.avg_daily_revenue, dailyTarget, opexPercent);
  const agingSummary = calculateAgingSummary(combinedDebts);
  
  const h15 = calculateBudgetForHorizon(15, combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent, { useCashForDebt: !!use_cash_for_debt }, run.cash_position_used);
  const h30 = calculateBudgetForHorizon(30, combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent, { useCashForDebt: !!use_cash_for_debt }, run.cash_position_used);
  const h45 = calculateBudgetForHorizon(45, combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent, { useCashForDebt: !!use_cash_for_debt }, run.cash_position_used);
  const h60 = calculateBudgetForHorizon(60, combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent, { useCashForDebt: !!use_cash_for_debt }, run.cash_position_used);
  const hn = calculateBudgetForHorizon(customDays, combinedDebts, run.avg_daily_revenue, opexPercent, safetyMarginPercent, { useCashForDebt: !!use_cash_for_debt }, run.cash_position_used);

  const supplierReport = buildSupplierReport(combinedDebts);

  // Return structure matching runAnalysis
  return {
    baseline_run_id: baselineRunId,
    baseline_label: run.run_label,
    avg_daily_revenue: run.avg_daily_revenue,
    cash_position: {
      current_cash: run.cash_position_used,
      recorded_date: run.created_at ? run.created_at.toISOString().split('T')[0] : null,
      runway_status: cashRunway.status,
      critical_date: cashRunway.critical_date
    },
    daily: dailyTarget,
    biweekly_buckets: biweeklyBuckets,
    weekly: weeklyBudget,
    monthly: monthlyBudget,
    cash_runway: cashRunway,
    aging_summary: agingSummary,
    supplier_report: supplierReport,
    horizon_budgets: {
      h15,
      h30,
      h45,
      h60,
      hn
    },
    options: {
      skip_overdue_kronis: !!skip_overdue_kronis,
      ignored_suppliers: ignored_suppliers || [],
      use_cash_for_debt: !!use_cash_for_debt,
      n_days: customDays
    }
  };
};

/**
 * Save simulation draft and its items to DB in a single transaction
 */
export const saveSimulation = async (baselineRunId, simLabel, createdBy, simulatedDebts) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const simId = crypto.randomUUID();
    
    // 1. Insert into finance_purchase_simulations
    await connection.execute(
      `INSERT INTO finance_purchase_simulations (id, analysis_run_id, sim_label, created_by)
       VALUES (?, ?, ?, ?)`,
      [simId, baselineRunId, simLabel, createdBy]
    );

    // 2. Insert simulation items
    for (const item of (simulatedDebts || [])) {
      await connection.execute(
        `INSERT INTO finance_simulation_items (simulation_id, supplier_name, invoice_no, amount, due_days, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          simId,
          item.supplier_name || 'Simulasi Supplier',
          item.invoice_no || `SIM-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          parseFloat(item.amount) || 0,
          parseInt(item.due_days) || 0,
          item.notes || null
        ]
      );
    }

    await connection.commit();
    return { success: true, id: simId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get all simulation drafts for a specific finance group
 */
export const getAllSimulations = async (financeGroupKey) => {
  const [rows] = await pool.execute(
    `SELECT 
      s.id,
      s.sim_label,
      s.analysis_run_id,
      s.created_at,
      r.run_label as baseline_label,
      u.nama as created_by_name,
      (SELECT COUNT(*) FROM finance_simulation_items WHERE simulation_id = s.id) as item_count,
      (SELECT COALESCE(SUM(amount), 0) FROM finance_simulation_items WHERE simulation_id = s.id) as total_amount
     FROM finance_purchase_simulations s
     JOIN finance_analysis_runs r ON r.id = s.analysis_run_id
     LEFT JOIN users u ON u.id = s.created_by
     WHERE r.finance_group_key = ?
     ORDER BY s.created_at DESC`,
    [financeGroupKey]
  );
  return rows;
};

/**
 * Get simulation detail and calculate its preview on the fly
 */
export const getSimulationDetail = async (simId) => {
  const [simRows] = await pool.execute(
    `SELECT s.*, r.run_label as baseline_label, r.finance_group_key
     FROM finance_purchase_simulations s
     JOIN finance_analysis_runs r ON r.id = s.analysis_run_id
     WHERE s.id = ? LIMIT 1`,
    [simId]
  );
  
  if (!simRows[0]) return null;
  const sim = simRows[0];

  const [itemRows] = await pool.execute(
    `SELECT * FROM finance_simulation_items WHERE simulation_id = ? ORDER BY id ASC`,
    [simId]
  );

  // Recalculate preview on the fly
  const preview = await previewSimulation(sim.analysis_run_id, itemRows);

  return {
    id: sim.id,
    sim_label: sim.sim_label,
    analysis_run_id: sim.analysis_run_id,
    baseline_label: sim.baseline_label,
    finance_group_key: sim.finance_group_key,
    created_at: sim.created_at,
    created_by: sim.created_by,
    items: itemRows,
    preview
  };
};

/**
 * Delete a simulation draft
 */
export const deleteSimulation = async (simId) => {
  const [result] = await pool.execute(
    `DELETE FROM finance_purchase_simulations WHERE id = ?`,
    [simId]
  );
  return result.affectedRows > 0;
};
