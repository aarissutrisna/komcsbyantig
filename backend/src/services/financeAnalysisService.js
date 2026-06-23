import crypto from 'crypto';
import pool from '../config/database.js';
import { getGroupByKey, getGroupSettings } from './financeGroupService.js';
import { getAvgDailyRevenue } from './financeIncomeService.js';
import { fetchDebtsFromN8N, transformN8NResponse, calculateAgingSummary } from './financeDebtService.js';

/**
 * Run complete financial analysis for a finance group
 * @param {boolean} saveToDb - If false, only preview without saving
 */
export const runAnalysis = async (financeGroupKey, triggeredBy, runLabel = null, cashAmount = null, options = {}, saveToDb = true) => {
  const group = await getGroupByKey(financeGroupKey);
  if (!group) {
    throw new Error('Finance group not found');
  }

  const settings = await getGroupSettings(financeGroupKey);
  const opexPercent = settings?.opex_percent || 2.00;
  const safetyMarginPercent = settings?.safety_margin_percent || 15.00;
  const nDays = settings?.n_days_default || 90;

  // 1. Get or save cash position
  let cashPositionUsed = cashAmount;
  if (cashAmount !== null && saveToDb) {
    await saveCashPosition(financeGroupKey, cashAmount, triggeredBy);
    cashPositionUsed = cashAmount;
  } else if (cashAmount === null) {
    const latestCashPosition = await getLatestCashPosition(financeGroupKey);
    cashPositionUsed = latestCashPosition?.cash_amount || 0;
  }

  // 2. Fetch debt data from N8N
  const n8nResponse = await fetchDebtsFromN8N(financeGroupKey, nDays);
  let debts = transformN8NResponse(n8nResponse);

  // Apply filters
  const { skipOverdueKronis, ignoredSuppliers } = options;
  if (skipOverdueKronis) {
    debts = debts.filter(d => d.aging_category !== 'overdue_kronis');
  }
  if (Array.isArray(ignoredSuppliers) && ignoredSuppliers.length > 0) {
    const lowercaseIgnored = ignoredSuppliers.map(s => s.trim().toLowerCase()).filter(Boolean);
    if (lowercaseIgnored.length > 0) {
      debts = debts.filter(d => {
        const name = d.supplier_name ? d.supplier_name.toLowerCase() : '';
        const code = d.supplier_code ? d.supplier_code.toLowerCase() : '';
        return !lowercaseIgnored.some(ignored => name.includes(ignored) || code.includes(ignored));
      });
    }
  }

  // 3. Calculate average daily revenue
  const avgDailyRevenue = await getAvgDailyRevenue(financeGroupKey, 30);

  // 4. Run all calculations
  const dailyTarget = calculateDailyTarget(debts, options, cashPositionUsed);
  const biweeklyBuckets = calculateBiweeklyBuckets(debts, avgDailyRevenue, opexPercent, safetyMarginPercent);
  const weeklyBudget = calculateWeeklyBudget(debts, avgDailyRevenue, opexPercent, safetyMarginPercent);
  const monthlyBudget = calculateMonthlyBudget(debts, avgDailyRevenue, opexPercent, safetyMarginPercent);
  const cashRunway = calculateCashRunway(cashPositionUsed, avgDailyRevenue, dailyTarget, opexPercent);
  const agingSummary = calculateAgingSummary(debts);
  
  // Calculate budgets for horizons (15, 30, 45, 60 days)
  const h15 = calculateBudgetForHorizon(15, debts, avgDailyRevenue, opexPercent, safetyMarginPercent, options, cashPositionUsed);
  const h30 = calculateBudgetForHorizon(30, debts, avgDailyRevenue, opexPercent, safetyMarginPercent, options, cashPositionUsed);
  const h45 = calculateBudgetForHorizon(45, debts, avgDailyRevenue, opexPercent, safetyMarginPercent, options, cashPositionUsed);
  const h60 = calculateBudgetForHorizon(60, debts, avgDailyRevenue, opexPercent, safetyMarginPercent, options, cashPositionUsed);

  // 5. Build supplier detail report
  const supplierReport = buildSupplierReport(debts);

  // 6. Build result object
  const result = {
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
      h60
    },
    options: {
      skip_overdue_kronis: !!skipOverdueKronis,
      ignored_suppliers: ignoredSuppliers || [],
      use_cash_for_debt: !!options.useCashForDebt
    },
    cash_breakdown: options.cashBreakdown || null
  };

  // 7. Save analysis run (only if not preview)
  let runId = null;
  if (saveToDb) {
    runId = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO finance_analysis_runs 
        (id, finance_group_key, triggered_by, run_label, cash_position_used, avg_daily_revenue, result_json, source_debt_snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        runId,
        financeGroupKey,
        triggeredBy,
        runLabel,
        cashPositionUsed,
        avgDailyRevenue,
        JSON.stringify(result),
        JSON.stringify(n8nResponse)
      ]
    );

    // Generate alerts if needed
    const alerts = generateAlerts(result, financeGroupKey, runId);
    if (alerts.length > 0) {
      await saveAlerts(alerts);
    }
  }

  return {
    run_id: runId,
    group_name: group.group_name,
    triggered_at: new Date().toISOString(),
    triggered_by: triggeredBy,
    avg_daily_revenue: avgDailyRevenue,
    cash_position: {
      current_cash: cashPositionUsed,
      recorded_date: new Date().toISOString().split('T')[0],
      runway_status: cashRunway.status,
      critical_date: cashRunway.critical_date
    },
    ...result
  };
};

/**
 * Build detailed supplier report from debts
 */
export const buildSupplierReport = (debts) => {
  const supplierMap = new Map();
  
  for (const debt of debts) {
    if (!supplierMap.has(debt.supplier_name)) {
      supplierMap.set(debt.supplier_name, {
        supplier_name: debt.supplier_name,
        invoice_count: 0,
        total_amount: 0,
        total_paid: 0,
        total_remaining: 0,
        earliest_due: null,
        latest_due: null,
        aging_breakdown: {
          belum_jatuh_tempo: { count: 0, total: 0 },
          overdue_1_30: { count: 0, total: 0 },
          overdue_31_90: { count: 0, total: 0 },
          overdue_kronis: { count: 0, total: 0 }
        },
        invoices: []
      });
    }
    
    const supplier = supplierMap.get(debt.supplier_name);
    supplier.invoice_count++;
    supplier.total_amount += debt.amount || 0;
    supplier.total_paid += debt.paid_amount || 0;
    supplier.total_remaining += debt.sisa_hutang || 0;
    
    const dueDate = new Date(debt.due_date);
    if (!supplier.earliest_due || dueDate < new Date(supplier.earliest_due)) {
      supplier.earliest_due = debt.due_date;
    }
    if (!supplier.latest_due || dueDate > new Date(supplier.latest_due)) {
      supplier.latest_due = debt.due_date;
    }
    
    // Aging breakdown
    const aging = debt.aging_category;
    if (supplier.aging_breakdown[aging]) {
      supplier.aging_breakdown[aging].count++;
      supplier.aging_breakdown[aging].total += debt.sisa_hutang || 0;
    }
    
    supplier.invoices.push({
      invoice_no: debt.invoice_no,
      invoice_date: debt.invoice_date,
      due_date: debt.due_date,
      amount: debt.amount || 0,
      paid_amount: debt.paid_amount || 0,
      remaining: debt.sisa_hutang || 0,
      days_until_due: debt.sisa_hari,
      aging_category: debt.aging_category
    });
  }
  
  // Convert to array and sort by total remaining (descending)
  const suppliers = Array.from(supplierMap.values()).sort((a, b) => b.total_remaining - a.total_remaining);
  
  return {
    total_suppliers: suppliers.length,
    total_invoices: debts.length,
    total_amount: suppliers.reduce((sum, s) => sum + s.total_amount, 0),
    total_paid: suppliers.reduce((sum, s) => sum + s.total_paid, 0),
    total_remaining: suppliers.reduce((sum, s) => sum + s.total_remaining, 0),
    suppliers
  };
};

/**
 * Calculate daily debt payment target
 */
export const calculateDailyTarget = (debts, options = {}, cashAmount = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Original spikey daily target (debt_target_today)
  let totalDailyTarget = 0;
  const activeDebts = debts.filter(d => {
    const dueDate = new Date(d.due_date);
    return dueDate >= today && d.sisa_hutang > 0;
  });

  for (const debt of activeDebts) {
    const dueDate = new Date(debt.due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilDue > 0) {
      totalDailyTarget += debt.sisa_hutang / daysUntilDue;
    }
  }

  // 2. Horizon-based smoothed daily targets (15d, 30d, 45d, 60d)
  const getTargetForHorizon = (nDays) => {
    const horizonDate = new Date(today);
    horizonDate.setDate(today.getDate() + nDays);

    let overdueDebt = 0;
    let upcomingDebt = 0;

    for (const d of debts) {
      const dueDate = new Date(d.due_date);
      if (d.sisa_hutang > 0) {
        if (dueDate < today) {
          overdueDebt += d.sisa_hutang;
        } else if (dueDate <= horizonDate) {
          upcomingDebt += d.sisa_hutang;
        }
      }
    }

    const totalDebt = overdueDebt + upcomingDebt;
    const netDebt = options.useCashForDebt ? Math.max(0, totalDebt - cashAmount) : totalDebt;
    const dailyTarget = netDebt / nDays;

    return {
      days: nDays,
      overdue_debt: Math.round(overdueDebt * 100) / 100,
      upcoming_debt: Math.round(upcomingDebt * 100) / 100,
      total_debt: Math.round(totalDebt * 100) / 100,
      daily_target: Math.round(dailyTarget * 100) / 100
    };
  };

  const h15 = getTargetForHorizon(15);
  const h30 = getTargetForHorizon(30);
  const h45 = getTargetForHorizon(45);
  const h60 = getTargetForHorizon(60);

  return {
    debt_target_today: Math.round(totalDailyTarget * 100) / 100,
    target_15d: h15.daily_target,
    target_30d: h30.daily_target,
    target_45d: h45.daily_target,
    target_60d: h60.daily_target,
    horizons: [h15, h30, h45, h60]
  };
};

/**
 * Calculate biweekly (15-day) budget buckets
 */
export const calculateBiweeklyBuckets = (debts, avgDailyRevenue, opexPercent, safetyMarginPercent) => {
  const today = new Date();
  const buckets = [];

  // Generate 4 buckets (2 months worth)
  for (let i = 0; i < 4; i++) {
    const bucketStart = new Date(today);
    bucketStart.setDate(today.getDate() + (i * 15));
    
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketStart.getDate() + 14);

    const days = 15;
    const projectedIncome = avgDailyRevenue * days * (1 - safetyMarginPercent / 100);
    const opex = avgDailyRevenue * days * (opexPercent / 100);

    // Sum debts due in this bucket
    let debtDue = 0;
    for (const debt of debts) {
      const dueDate = new Date(debt.due_date);
      if (dueDate >= bucketStart && dueDate <= bucketEnd) {
        debtDue += debt.sisa_hutang;
      }
    }

    const safePurchaseBudget = projectedIncome - opex - debtDue;
    let status = 'AMAN';
    if (safePurchaseBudget < 0) {
      status = 'DEFISIT';
    } else if (safePurchaseBudget < projectedIncome * 0.1) {
      status = 'WASPADA';
    }

    buckets.push({
      label: `${bucketStart.getDate()}-${bucketEnd.getDate()} ${bucketStart.toLocaleString('id-ID', { month: 'short', year: 'numeric' })}`,
      period: i % 2 === 0 ? 'P1' : 'P2',
      days,
      projected_income: Math.round(projectedIncome * 100) / 100,
      opex: Math.round(opex * 100) / 100,
      debt_due: Math.round(debtDue * 100) / 100,
      safe_purchase_budget: Math.round(safePurchaseBudget * 100) / 100,
      status
    });
  }

  return buckets;
};

/**
 * Calculate weekly budget
 */
export const calculateWeeklyBudget = (debts, avgDailyRevenue, opexPercent, safetyMarginPercent) => {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const projectedIncome = avgDailyRevenue * 7 * (1 - safetyMarginPercent / 100);
  const opex = avgDailyRevenue * 7 * (opexPercent / 100);

  let debtDue = 0;
  for (const debt of debts) {
    const dueDate = new Date(debt.due_date);
    if (dueDate >= today && dueDate <= weekEnd) {
      debtDue += debt.sisa_hutang;
    }
  }

  const safePurchaseBudget = projectedIncome - opex - debtDue;

  return {
    projected_income: Math.round(projectedIncome * 100) / 100,
    opex: Math.round(opex * 100) / 100,
    debt_due: Math.round(debtDue * 100) / 100,
    safe_purchase_budget: Math.round(safePurchaseBudget * 100) / 100,
    status: safePurchaseBudget < 0 ? 'DEFISIT' : safePurchaseBudget < projectedIncome * 0.1 ? 'WASPADA' : 'AMAN'
  };
};

/**
 * Calculate monthly budget (sum of weekly buckets, not weekly * 4)
 */
export const calculateMonthlyBudget = (debts, avgDailyRevenue, opexPercent, safetyMarginPercent) => {
  const today = new Date();
  const monthEnd = new Date(today);
  monthEnd.setDate(today.getDate() + 30);

  const projectedIncome = avgDailyRevenue * 30 * (1 - safetyMarginPercent / 100);
  const opex = avgDailyRevenue * 30 * (opexPercent / 100);

  let debtDue = 0;
  for (const debt of debts) {
    const dueDate = new Date(debt.due_date);
    if (dueDate >= today && dueDate <= monthEnd) {
      debtDue += debt.sisa_hutang;
    }
  }

  const safePurchaseBudget = projectedIncome - opex - debtDue;

  return {
    projected_income: Math.round(projectedIncome * 100) / 100,
    opex: Math.round(opex * 100) / 100,
    debt_due: Math.round(debtDue * 100) / 100,
    safe_purchase_budget: Math.round(safePurchaseBudget * 100) / 100,
    status: safePurchaseBudget < 0 ? 'DEFISIT' : safePurchaseBudget < projectedIncome * 0.1 ? 'WASPADA' : 'AMAN'
  };
};

/**
 * Calculate budget and safety margin for a specific day horizon
 */
export const calculateBudgetForHorizon = (nDays, debts, avgDailyRevenue, opexPercent, safetyMarginPercent, options = {}, cashAmount = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonEnd = new Date(today);
  horizonEnd.setDate(today.getDate() + nDays);

  const projectedIncome = avgDailyRevenue * nDays * (1 - safetyMarginPercent / 100);
  const opex = avgDailyRevenue * nDays * (opexPercent / 100);

  let debtDue = 0;
  for (const debt of debts) {
    const dueDate = new Date(debt.due_date);
    if (dueDate <= horizonEnd && debt.sisa_hutang > 0) {
      debtDue += debt.sisa_hutang;
    }
  }

  const safePurchaseBudget = projectedIncome - opex - debtDue + (options.useCashForDebt ? cashAmount : 0);
  let status = 'AMAN';
  if (safePurchaseBudget < 0) {
    status = 'DEFISIT';
  } else if (safePurchaseBudget < projectedIncome * 0.1) {
    status = 'WASPADA';
  }

  return {
    days: nDays,
    projected_income: Math.round(projectedIncome * 100) / 100,
    opex: Math.round(opex * 100) / 100,
    debt_due: Math.round(debtDue * 100) / 100,
    safe_purchase_budget: Math.round(safePurchaseBudget * 100) / 100,
    status
  };
};

/**
 * Calculate cash runway projection
 */
export const calculateCashRunway = (currentCash, avgDailyRevenue, dailyTarget, opexPercent) => {
  const targetForRunway = dailyTarget.target_30d || dailyTarget.debt_target_today;
  const netDailyFlow = avgDailyRevenue * (1 - opexPercent / 100) - targetForRunway;
  
  let criticalDate = null;
  let status = 'AMAN';

  if (netDailyFlow < 0 && currentCash > 0) {
    const daysUntilZero = Math.floor(currentCash / Math.abs(netDailyFlow));
    criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() + daysUntilZero);
    status = daysUntilZero <= 14 ? 'WASPADA TINGGI' : 'WASPADA';
  } else if (currentCash <= 0) {
    status = 'WASPADA TINGGI';
  }

  return {
    current_cash: currentCash,
    net_daily_flow: Math.round(netDailyFlow * 100) / 100,
    critical_date: criticalDate ? criticalDate.toISOString().split('T')[0] : null,
    status
  };
};

/**
 * Generate alerts based on analysis results
 */
const generateAlerts = (result, financeGroupKey, runId) => {
  const alerts = [];

  // Check for deficit buckets
  for (const bucket of result.biweekly_buckets) {
    if (bucket.status === 'DEFISIT') {
      alerts.push({
        finance_group_key: financeGroupKey,
        analysis_run_id: runId,
        alert_type: 'deficit_bucket',
        message: `Defisit diproyeksikan pada periode ${bucket.label}: ${formatCurrency(bucket.safe_purchase_budget)}`,
        severity: 'critical'
      });
    }
  }

  // Check cash runway
  if (result.cash_runway.status === 'WASPADA TINGGI') {
    alerts.push({
      finance_group_key: financeGroupKey,
      analysis_run_id: runId,
      alert_type: 'runway_critical',
      message: result.cash_runway.critical_date 
        ? `Kas diproyeksikan habis pada ${result.cash_runway.critical_date}`
        : 'Kas saat ini tidak mencukupi',
      severity: 'critical'
    });
  }

  return alerts;
};

/**
 * Save alerts to database
 */
const saveAlerts = async (alerts) => {
  for (const alert of alerts) {
    await pool.execute(
      `INSERT INTO finance_alerts (id, finance_group_key, analysis_run_id, alert_type, message, severity)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        alert.finance_group_key,
        alert.analysis_run_id,
        alert.alert_type,
        alert.message,
        alert.severity
      ]
    );
  }
};

/**
 * Save cash position
 */
const saveCashPosition = async (financeGroupKey, cashAmount, inputBy) => {
  const id = crypto.randomUUID();
  const recordedDate = new Date().toISOString().split('T')[0];
  
  await pool.execute(
    `INSERT INTO finance_cash_position (id, finance_group_key, cash_amount, recorded_date, input_by)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE cash_amount = VALUES(cash_amount), input_by = VALUES(input_by)`,
    [id, financeGroupKey, cashAmount, recordedDate, inputBy]
  );
};

/**
 * Get latest cash position
 */
const getLatestCashPosition = async (financeGroupKey) => {
  const [rows] = await pool.execute(
    `SELECT * FROM finance_cash_position 
    WHERE finance_group_key = ? 
    ORDER BY recorded_date DESC LIMIT 1`,
    [financeGroupKey]
  );
  return rows[0] || null;
};

/**
 * Format currency for display
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Get analysis history
 */
export const getAnalysisHistory = async (financeGroupKey, limit = 50) => {
  const [rows] = await pool.execute(
    `SELECT 
      r.id,
      r.run_label,
      r.cash_position_used,
      r.avg_daily_revenue,
      r.created_at,
      u.nama as triggered_by_name,
      JSON_EXTRACT(r.result_json, '$.cash_runway.status') as runway_status
    FROM finance_analysis_runs r
    LEFT JOIN users u ON u.id = r.triggered_by
    WHERE r.finance_group_key = ?
    ORDER BY r.created_at DESC
    LIMIT ?`,
    [financeGroupKey, limit]
  );
  return rows;
};

/**
 * Get analysis detail
 */
export const getAnalysisDetail = async (runId) => {
  const [rows] = await pool.execute(
    `SELECT 
      r.*,
      u.nama as triggered_by_name,
      b.name as group_name
    FROM finance_analysis_runs r
    LEFT JOIN users u ON u.id = r.triggered_by
    LEFT JOIN branches b ON b.finance_group_key = r.finance_group_key
    WHERE r.id = ?
    LIMIT 1`,
    [runId]
  );
  
  if (!rows[0]) return null;
  
  const row = rows[0];
  const parsedResult = typeof row.result_json === 'string' ? JSON.parse(row.result_json) : row.result_json;
  
  // Return same flattened shape as fresh runAnalysis response
  return {
    run_id: row.id,
    group_name: row.group_name || '',
    triggered_at: row.created_at,
    triggered_by: row.triggered_by_name || '',
    avg_daily_revenue: row.avg_daily_revenue,
    cash_position: {
      current_cash: row.cash_position_used || 0,
      recorded_date: row.created_at ? row.created_at.toString().split('T')[0] : null,
      runway_status: parsedResult?.cash_runway?.status || 'AMAN',
      critical_date: parsedResult?.cash_runway?.critical_date || null
    },
    ...parsedResult
  };
};

/**
 * Delete analysis run and cleanup related data
 */
export const deleteAnalysisRun = async (runId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete related alerts first (should cascade, but explicit for safety)
    await connection.execute(
      `DELETE FROM finance_alerts WHERE analysis_run_id = ?`,
      [runId]
    );

    // 2. Delete the analysis run
    const [result] = await connection.execute(
      `DELETE FROM finance_analysis_runs WHERE id = ?`,
      [runId]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
