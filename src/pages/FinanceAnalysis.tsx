import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  TrendingUp,
  AlertTriangle,
  XCircle,
  RefreshCw,
  DollarSign,
  Calendar,
  Target,
  History,
  Trash2,
  Eye,
  Bell,
} from 'lucide-react';
interface FinanceGroup {
  finance_group_key: string;
  webhook_url: string;
  branch_ids: string;
  branch_count: number;
  group_name: string;
  opex_percent: number;
  safety_margin_percent: number;
  n_days_default: number;
}

interface HorizonDetail {
  days: number;
  overdue_debt: number;
  upcoming_debt: number;
  total_debt: number;
  daily_target: number;
}

interface AnalysisResult {
  run_id: string | null;
  group_name: string;
  triggered_at: string;
  avg_daily_revenue: number;
  cash_position: {
    current_cash: number;
    recorded_date: string;
    runway_status: string;
    critical_date: string | null;
  };
  daily: {
    debt_target_today: number;
    target_15d?: number;
    target_30d?: number;
    target_45d?: number;
    target_60d?: number;
    horizons?: HorizonDetail[];
  };
  biweekly_buckets: Array<{
    label: string;
    period: string;
    days: number;
    projected_income: number;
    opex: number;
    debt_due: number;
    safe_purchase_budget: number;
    status: string;
  }>;
  weekly: {
    projected_income: number;
    opex: number;
    debt_due: number;
    safe_purchase_budget: number;
    status: string;
  };
  monthly: {
    projected_income: number;
    opex: number;
    debt_due: number;
    safe_purchase_budget: number;
    status: string;
  };
  cash_runway: {
    current_cash: number;
    net_daily_flow: number;
    critical_date: string | null;
    status: string;
  };
  aging_summary: {
    belum_jatuh_tempo: { count: number; total: number };
    overdue_1_30: { count: number; total: number };
    overdue_31_90: { count: number; total: number };
    overdue_kronis: { count: number; total: number };
  };
  supplier_report: {
    total_suppliers: number;
    total_invoices: number;
    total_amount: number;
    total_paid: number;
    total_remaining: number;
    suppliers: Array<{
      supplier_name: string;
      invoice_count: number;
      total_amount: number;
      total_paid: number;
      total_remaining: number;
      earliest_due: string | null;
      latest_due: string | null;
      aging_breakdown: {
        belum_jatuh_tempo: { count: number; total: number };
        overdue_1_30: { count: number; total: number };
        overdue_31_90: { count: number; total: number };
        overdue_kronis: { count: number; total: number };
      };
      invoices: Array<{
        invoice_no: string;
        invoice_date: string;
        due_date: string;
        amount: number;
        paid_amount: number;
        remaining: number;
        days_until_due: number;
        aging_category: string;
      }>;
    }>;
  };
  options?: {
    skip_overdue_kronis?: boolean;
    ignored_suppliers?: string[];
    use_cash_for_debt?: boolean;
  };
  horizon_budgets?: {
    h15: HorizonBudget;
    h30: HorizonBudget;
    h45: HorizonBudget;
    h60: HorizonBudget;
  };
  cash_breakdown?: CashBreakdown | null;
}

interface CashBreakdown {
  kas_toko: number;
  bank_bca: number;
  bank_bri: number;
  bank_mandiri: number;
  bank_bni: number;
  bank_bsi: number;
  bank_lainnya_1: number;
  bank_lainnya_2: number;
  bank_lainnya_3: number;
}

interface HorizonBudget {
  days: number;
  projected_income: number;
  opex: number;
  debt_due: number;
  safe_purchase_budget: number;
  status: string;
}

interface HistoryItem {
  id: string;
  run_label: string | null;
  cash_position_used: number;
  avg_daily_revenue: number;
  created_at: string;
  triggered_by_name: string;
  runway_status: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AMAN':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'WASPADA':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'WASPADA TINGGI':
    case 'DEFISIT':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

export function FinanceAnalysis() {
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<AnalysisResult | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [runLabel, setRunLabel] = useState<string>('');
  const [skipOverdueKronis, setSkipOverdueKronis] = useState<boolean>(false);
  const [enableIgnoreSuppliers, setEnableIgnoreSuppliers] = useState<boolean>(false);
  const [ignoredSuppliersInput, setIgnoredSuppliersInput] = useState<string>('pjbt, pjb tasik');
  const [useCashForDebt, setUseCashForDebt] = useState<boolean>(false);
  const [customDays, setCustomDays] = useState<string>('90');
  const [cashBreakdown, setCashBreakdown] = useState({
    kas_toko: '',
    bank_bca: '',
    bank_bri: '',
    bank_mandiri: '',
    bank_bni: '',
    bank_bsi: '',
    bank_lainnya_1: '',
    bank_lainnya_2: '',
    bank_lainnya_3: ''
  });
  const [activeTab, setActiveTab] = useState<'h15' | 'h30' | 'h45' | 'h60' | 'hn' | 'targets' | 'suppliers'>('h15');
  const [error, setError] = useState<string>('');
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchHistory();
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const data = await api.get<FinanceGroup[]>('/finance/groups');
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0].finance_group_key);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.get<HistoryItem[]>(`/finance/analysis-runs/${selectedGroup}`);
      setHistory(data);
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
    }
  };

  const previewAnalysis = async () => {
    if (!selectedGroup) return;

    setAnalyzing(true);
    setError('');
    try {
      const totalCash = Object.values(cashBreakdown).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      const body: any = {};
      body.cash_amount = totalCash;
      body.skip_overdue_kronis = skipOverdueKronis;
      body.use_cash_for_debt = useCashForDebt;
      body.n_days = parseInt(customDays) || 90;
      body.cash_breakdown = Object.entries(cashBreakdown).reduce((acc, [key, val]) => {
        acc[key] = parseFloat(val) || 0;
        return acc;
      }, {} as any);
      
      if (enableIgnoreSuppliers) {
        body.ignored_suppliers = ignoredSuppliersInput
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      } else {
        body.ignored_suppliers = [];
      }

      const data = await api.post<AnalysisResult>(`/finance/analysis-runs/${selectedGroup}/preview`, body);
      setPreview(data);
      setResult(null); // Clear saved result when previewing
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!preview) return;

    setSaving(true);
    setError('');
    try {
      const body: any = {
        run_label: runLabel || `Analisa ${new Date().toLocaleDateString('id-ID')}`,
        cash_amount: preview.cash_position.current_cash,
        skip_overdue_kronis: preview.options?.skip_overdue_kronis,
        ignored_suppliers: preview.options?.ignored_suppliers || [],
        use_cash_for_debt: preview.options?.use_cash_for_debt,
        cash_breakdown: preview.cash_breakdown,
        n_days: preview.options?.n_days || parseInt(customDays) || 90
      };

      const data = await api.post<AnalysisResult>(`/finance/analysis-runs/${selectedGroup}/save`, body);
      setResult(data);
      setPreview(null);
      fetchHistory();
      setRunLabel('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const viewHistoryItem = async (runId: string) => {
    setError('');
    try {
      const data = await api.get<AnalysisResult>(`/finance/analysis-runs/${selectedGroup}/${runId}`);
      // Guard: ensure the response has the expected shape
      if (!data || !data.daily || !data.biweekly_buckets) {
        setError('Format data analisa tidak valid. Coba jalankan ulang analisa.');
        return;
      }
      setResult(data);
      if (data.options?.n_days) {
        setCustomDays(data.options.n_days.toString());
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail analisa.');
    }
  };

  const deleteHistoryItem = async (runId: string) => {
    if (!confirm('Hapus riwayat analisa ini?')) return;
    setError('');
    try {
      await api.delete(`/finance/analysis-runs/${selectedGroup}/${runId}`);
      fetchHistory();
      if (result?.run_id === runId) {
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus riwayat analisa.');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (groups.length === 0) {
    return (
      <div className="animate-fade-in max-w-4xl">
        <PageHeader
          title="Analisa Keuangan"
          subtitle="Proyeksi cash flow dan analisis hutang supplier"
        />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Belum Ada Finance Group
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Setup webhook hutang di halaman <strong>Cabang</strong> terlebih dahulu untuk memulai analisa keuangan.
          </p>
        </div>
      </div>
    );
  }

  const selectedGroupData = groups.find(g => g.finance_group_key === selectedGroup);

  const renderHorizonTabContent = (horizonKey: 'h15' | 'h30' | 'h45' | 'h60' | 'hn', label: string) => {
    const res = (preview || result)!;
    
    const getFallbackBudget = (days: number, targetValue?: number) => {
      const opexPercent = 2.00;
      const safetyMarginPercent = 15.00;
      const projectedIncome = res.avg_daily_revenue * days * (1 - safetyMarginPercent / 100);
      const opex = res.avg_daily_revenue * days * (opexPercent / 100);
      
      const totalDebt = (targetValue || 0) * days;
      const safePurchaseBudget = projectedIncome - opex - totalDebt;
      
      return {
        days,
        projected_income: projectedIncome,
        opex,
        debt_due: totalDebt,
        safe_purchase_budget: safePurchaseBudget,
        status: safePurchaseBudget < 0 ? 'DEFISIT' : safePurchaseBudget < projectedIncome * 0.1 ? 'WASPADA' : 'AMAN'
      };
    };

    const budget = res.horizon_budgets?.[horizonKey] || (() => {
      if (horizonKey === 'h15') return getFallbackBudget(15, res.daily.target_15d);
      if (horizonKey === 'h30') return getFallbackBudget(30, res.daily.target_30d);
      if (horizonKey === 'h45') return getFallbackBudget(45, res.daily.target_45d);
      if (horizonKey === 'h60') return getFallbackBudget(60, res.daily.target_60d);
      return getFallbackBudget(res.daily.custom_days || 90, res.daily.target_custom);
    })();

    const income = budget.projected_income;
    const opex = budget.opex;
    const debt = budget.debt_due;
    const safe = budget.safe_purchase_budget;

    const totalAllocated = opex + debt + Math.max(0, safe);
    const opexPct = Math.min(100, (opex / (totalAllocated || 1)) * 100);
    const debtPct = Math.min(100 - opexPct, (debt / (totalAllocated || 1)) * 100);
    const safePct = Math.max(0, 100 - opexPct - debtPct);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-800/10 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
              Rincian Keuangan Proyeksi {label}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Proyeksi Kas Masuk:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(income)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Rencana Opex (Operasional):</span>
                <span className="font-semibold text-gray-800 dark:text-gray-300">
                  {formatCurrency(opex)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Hutang Jatuh Tempo Terakumulasi:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {formatCurrency(debt)}
                </span>
              </div>
              <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <span className="font-bold text-gray-900 dark:text-white">Budget Pembelian Aman:</span>
                <span className={`text-lg font-black ${safe < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(safe)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <span className="text-xs font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-2">
              Status Kelayakan Kas {label}
            </span>
            <span className={`px-8 py-4 rounded-2xl text-2xl font-black ${getStatusColor(budget.status)} shadow-sm`}>
              {budget.status}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 leading-relaxed max-w-xs">
              {budget.status === 'AMAN' && 'Kas masuk mencukupi untuk membayar OPEX dan seluruh kewajiban jatuh tempo. Perusahaan memiliki budget aman untuk melakukan pembelian baru.'}
              {budget.status === 'WASPADA' && 'Kondisi ketat. Kas masuk tipis untuk mengcover seluruh kebutuhan. Disarankan membatasi pembelian baru non-prioritas.'}
              {budget.status === 'DEFISIT' && 'Kas masuk diproyeksikan defisit. Perusahaan TIDAK MEMILIKI budget aman untuk pembelian baru sebelum hutang jatuh tempo dibayar.'}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/10 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/60 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-gray-600 dark:text-gray-400">
            <span>DISTRIBUSI PROYEKSI KAS MASUK</span>
            <span>TOTAL: {formatCurrency(income)}</span>
          </div>
          
          <div className="w-full h-8 bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden flex border border-gray-200 dark:border-gray-700">
            {opex > 0 && (
              <div 
                className="h-full bg-amber-500 flex items-center justify-center text-[10px] font-black text-white" 
                style={{ width: `${opexPct}%` }}
                title={`Opex: ${formatCurrency(opex)}`}
              >
                {opexPct > 8 && `Opex (${opexPct.toFixed(0)}%)`}
              </div>
            )}
            {debt > 0 && (
              <div 
                className="h-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white" 
                style={{ width: `${debtPct}%` }}
                title={`Hutang: ${formatCurrency(debt)}`}
              >
                {debtPct > 8 && `Hutang (${debtPct.toFixed(0)}%)`}
              </div>
            )}
            {safe > 0 ? (
              <div 
                className="h-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white animate-pulse" 
                style={{ width: `${safePct}%` }}
                title={`Budget Aman: ${formatCurrency(safe)}`}
              >
                {safePct > 8 && `Aman (${safePct.toFixed(0)}%)`}
              </div>
            ) : safe < 0 ? (
              <div 
                className="h-full bg-red-600 flex items-center justify-center text-[10px] font-black text-white flex-1 animate-pulse"
                title={`Defisit: ${formatCurrency(Math.abs(safe))}`}
              >
                Defisit {formatCurrency(Math.abs(safe))} (Over budget)
              </div>
            ) : null}
          </div>
          
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">Rencana Opex: {formatCurrency(opex)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-indigo-600 rounded" />
              <span className="text-gray-600 dark:text-gray-400">Hutang Terakumulasi: {formatCurrency(debt)}</span>
            </div>
            {safe > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-gray-600 dark:text-gray-400">Budget Aman: {formatCurrency(safe)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-600 rounded animate-pulse" />
                <span className="text-red-600 dark:text-red-400 font-bold">Defisit Kas: {formatCurrency(Math.abs(safe))}</span>
              </div>
            )}
            {res.options?.use_cash_for_debt && (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Termasuk Kas Awal: {formatCurrency(res.cash_position.current_cash)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in max-w-6xl">
      <PageHeader
        title="Analisa Keuangan"
        subtitle="Proyeksi cash flow dan analisis hutang supplier"
      />

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Group Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Finance Group
            </label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {groups.map(g => (
                <option key={g.finance_group_key} value={g.finance_group_key}>
                  {g.group_name} ({g.branch_count} cabang)
                </option>
              ))}
            </select>
          </div>

          {selectedGroupData && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Cabang
              </label>
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                {selectedGroupData.branch_ids}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Jalankan Analisa
        </h2>

        {/* Cash Account Breakdown Table */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2.5">
            Rincian Kas Awal (Modal)
          </label>
          <div className="bg-gray-55/60 dark:bg-gray-800/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: 'kas_toko', label: 'Kas Toko (Cash)' },
                { key: 'bank_bca', label: 'Bank BCA' },
                { key: 'bank_bri', label: 'Bank BRI' },
                { key: 'bank_mandiri', label: 'Bank Mandiri' },
                { key: 'bank_bni', label: 'Bank BNI' },
                { key: 'bank_bsi', label: 'Bank BSI' },
                { key: 'bank_lainnya_1', label: 'Lainnya 1' },
                { key: 'bank_lainnya_2', label: 'Lainnya 2' },
                { key: 'bank_lainnya_3', label: 'Lainnya 3' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    {item.label}
                  </label>
                  <input
                    type="number"
                    value={cashBreakdown[item.key as keyof typeof cashBreakdown]}
                    onChange={(e) => setCashBreakdown({
                      ...cashBreakdown,
                      [item.key]: e.target.value
                    })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3.5 border-t border-gray-200 dark:border-gray-800 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Total Kas Awal:</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-base animate-pulse-slow">
                  {formatCurrency(Object.values(cashBreakdown).reduce((sum, val) => sum + (parseFloat(val) || 0), 0))}
                </span>
              </div>
              
              <div className="w-full sm:w-72">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Label Analisa (Opsional)
                </label>
                <input
                  type="text"
                  value={runLabel}
                  onChange={e => setRunLabel(e.target.value)}
                  placeholder="Mis: Analisa Pagi"
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Options */}
        <div className="mt-4 pt-4 border-t border-gray-150 dark:border-gray-800 mb-6">
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Opsi Filter & Parameter Analisa
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => setSkipOverdueKronis(!skipOverdueKronis)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                skipOverdueKronis 
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10' 
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 hover:bg-gray-100/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50'
              }`}
            >
              <input
                type="checkbox"
                checked={skipOverdueKronis}
                onChange={(e) => {
                  e.stopPropagation();
                  setSkipOverdueKronis(e.target.checked);
                }}
                className="mt-1 w-4 h-4 rounded text-blue-600 border-gray-300 dark:border-gray-700 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                  Skip Overdue Kronis
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Abaikan hutang berumur &gt;90 hari karena penyesuaian stok yang belum selesai.
                </span>
              </div>
            </div>

            <div 
              onClick={() => setEnableIgnoreSuppliers(!enableIgnoreSuppliers)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col gap-3 ${
                enableIgnoreSuppliers 
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10' 
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 hover:bg-gray-100/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start gap-3 w-full">
                <input
                  type="checkbox"
                  checked={enableIgnoreSuppliers}
                  onChange={(e) => {
                    e.stopPropagation();
                    setEnableIgnoreSuppliers(e.target.checked);
                  }}
                  className="mt-1 w-4 h-4 rounded text-blue-600 border-gray-300 dark:border-gray-700 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                    Skip Supplier Khusus (e.g., PJBT)
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Abaikan seluruh transaksi hutang khusus untuk kode/kata kunci supplier tertentu.
                  </span>
                </div>
              </div>

              {enableIgnoreSuppliers && (
                <div className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
                  <label className="block text-[11px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-1">
                    Daftar Kode / Kata Kunci Supplier
                  </label>
                  <input
                    type="text"
                    value={ignoredSuppliersInput}
                    onChange={(e) => setIgnoredSuppliersInput(e.target.value)}
                    placeholder="pjbt, pjb tasik"
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-gray-800 dark:text-gray-200"
                  />
                </div>
              )}
            </div>

            <div 
              onClick={() => setUseCashForDebt(!useCashForDebt)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                useCashForDebt 
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10' 
                  : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 hover:bg-gray-100/50 dark:bg-gray-800/30 dark:hover:bg-gray-800/50'
              }`}
            >
              <input
                type="checkbox"
                checked={useCashForDebt}
                onChange={(e) => {
                  e.stopPropagation();
                  setUseCashForDebt(e.target.checked);
                }}
                className="mt-1 w-4 h-4 rounded text-blue-600 border-gray-300 dark:border-gray-700 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                  Gunakan Kas Awal (Net Target)
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Gunakan kas awal yang diinput untuk langsung memotong target hutang dan menambah budget aman.
                </span>
              </div>
            </div>

            <div 
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col justify-between"
            >
              <div>
                <span className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                  Horizon Kustom (N-Hari)
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">
                  Atur jangka waktu perencanaan kustom untuk target harian & budget aman.
                </span>
              </div>
              <div className="flex items-center gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-center text-gray-800 dark:text-gray-200"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Hari</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {preview && (
            <button
              onClick={saveAnalysis}
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2 min-w-[200px]"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Simpan ke Histori
                </>
              )}
            </button>
          )}
          <button
            onClick={previewAnalysis}
            disabled={analyzing}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 min-w-[200px]"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Menganalisa...
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                {preview ? 'Preview Ulang' : 'Preview Analisa'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {(preview || result) && (
        <>
          {/* Preview Notification */}
          {preview && !result && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <Eye className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-850 dark:text-blue-300">
                    Mode Preview — Hasil Belum Disimpan
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-450 mt-0.5">
                    Review hasil analisa di bawah. Klik "Simpan ke Histori" untuk menyimpan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Notification */}
          {(() => {
            const data = preview || result;
            if (!data?.options) return null;
            const hasSkipKronis = data.options.skip_overdue_kronis;
            const hasIgnoredSuppliers = data.options.ignored_suppliers && data.options.ignored_suppliers.length > 0;
            const hasUseCashForDebt = data.options.use_cash_for_debt;
            if (!hasSkipKronis && !hasIgnoredSuppliers && !hasUseCashForDebt) return null;
            
            const excludedItems = [
              hasSkipKronis && "Overdue Kronis",
              hasIgnoredSuppliers && `Supplier (${data.options!.ignored_suppliers!.join(", ")})`
            ].filter(Boolean).join(" dan ");
            
            return (
              <div className="mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-850 dark:text-amber-300">
                      Analisa Keuangan Dijalankan dengan Parameter Khusus
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-450 mt-0.5 animate-pulse-slow">
                      {excludedItems && `Hasil kalkulasi di bawah ini mengecualikan: ${excludedItems}.`}
                      {hasUseCashForDebt && `${excludedItems ? " Selain itu, k" : "K"}as awal diperhitungkan sebagai modal (mengurangi target harian & menambah budget aman).`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Rata-rata Harian
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {formatCurrency((preview || result)!.avg_daily_revenue)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Target Harian (30 Hari)
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                {formatCurrency((preview || result)!.daily.target_30d || (preview || result)!.daily.debt_target_today)}
              </div>
              
              {((preview || result)!.daily.target_15d !== undefined) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span>Target 15 Hari:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency((preview || result)!.daily.target_15d!)}/hari
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Target 45 Hari:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency((preview || result)!.daily.target_45d!)}/hari
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Target 60 Hari:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency((preview || result)!.daily.target_60d!)}/hari
                    </span>
                  </div>
                  {((preview || result)!.daily.target_custom !== undefined) && (
                    <div className="flex justify-between items-center text-blue-600 dark:text-blue-400 font-bold border-t border-dashed border-gray-150 dark:border-gray-800 pt-1.5 mt-1.5">
                      <span>Target {((preview || result)!.daily.custom_days)} Hari (Kustom):</span>
                      <span>
                        {formatCurrency((preview || result)!.daily.target_custom!)}/hari
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Status Runway
                </span>
              </div>
              <div className={`text-lg font-black px-3 py-1 rounded-lg inline-block ${getStatusColor((preview || result)!.cash_runway.status)}`}>
                {(preview || result)!.cash_runway.status}
              </div>
              {(preview || result)!.cash_runway.critical_date && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Kritis: {(preview || result)!.cash_runway.critical_date}
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Hutang Kronis
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {formatCurrency((preview || result)!.aging_summary.overdue_kronis.total)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {(preview || result)!.aging_summary.overdue_kronis.count} invoice
              </p>
            </div>
          </div>

          {/* Cash Breakdown Display */}
          {(preview || result)?.cash_breakdown && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Rincian Kas Awal (Modal)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'kas_toko', label: 'Kas Toko' },
                  { key: 'bank_bca', label: 'BCA' },
                  { key: 'bank_bri', label: 'BRI' },
                  { key: 'bank_mandiri', label: 'Mandiri' },
                  { key: 'bank_bni', label: 'BNI' },
                  { key: 'bank_bsi', label: 'BSI' },
                  { key: 'bank_lainnya_1', label: 'Lainnya 1' },
                  { key: 'bank_lainnya_2', label: 'Lainnya 2' },
                  { key: 'bank_lainnya_3', label: 'Lainnya 3' },
                ].map((item) => {
                  const val = (preview || result)?.cash_breakdown?.[item.key as keyof CashBreakdown] || 0;
                  if (val === 0) return null;
                  return (
                    <div key={item.key} className="bg-gray-55/60 dark:bg-gray-800/20 p-3 rounded-xl border border-gray-105 dark:border-gray-800/80 text-center">
                      <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {item.label}
                      </span>
                      <span className="block text-xs font-black text-gray-800 dark:text-gray-100 mt-1">
                        {formatCurrency(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
            <div className="border-b border-gray-200 dark:border-gray-800">
              <nav className="flex">
                 {(['h15', 'h30', 'h45', 'h60', 'hn', 'targets', 'suppliers'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 text-sm font-bold transition-colors ${
                      activeTab === tab
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab === 'h15'
                      ? '15 Hari'
                      : tab === 'h30'
                      ? '30 Hari'
                      : tab === 'h45'
                      ? '45 Hari'
                      : tab === 'h60'
                      ? '60 Hari'
                      : tab === 'hn'
                      ? `${(preview || result)?.options?.n_days || 90} Hari (Kustom)`
                      : tab === 'targets'
                      ? 'Target Harian'
                      : 'Rincian Supplier'}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'h15' && renderHorizonTabContent('h15', '15 Hari')}
              {activeTab === 'h30' && renderHorizonTabContent('h30', '30 Hari')}
              {activeTab === 'h45' && renderHorizonTabContent('h45', '45 Hari')}
              {activeTab === 'h60' && renderHorizonTabContent('h60', '60 Hari')}
              {activeTab === 'hn' && renderHorizonTabContent('hn', `${(preview || result)?.options?.n_days || 90} Hari (Kustom)`)}

              {activeTab === 'targets' && (
                <div className="space-y-6">
                  {/* Explanation Alert */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl flex gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg h-fit">
                      <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                        Metode Amortisasi Hutang Merata (Uniform Debt Amortization)
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                        Model ini menghitung target harian yang stabil berdasarkan horizon waktu perencanaan treasury.
                        Formula: <code className="bg-blue-100/60 dark:bg-blue-950/60 px-1 py-0.5 rounded font-mono font-semibold text-blue-800 dark:text-blue-300">Target Harian = (Hutang Overdue + Hutang Jatuh Tempo dalam N Hari) / N Hari</code>.
                        Hal ini menghindari lonjakan target harian (spikes) akibat penumpukan jatuh tempo jangka pendek.
                      </p>
                    </div>
                  </div>

                  {/* Targets Breakdown Table */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Horizon Perencanaan (N)</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Hutang Overdue (A)</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Hutang Horizon (B)</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Total Kewajiban (A+B)</th>
                          <th className="text-center py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Divisor (C)</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Target Harian (A+B)/C</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">vs Omzet Harian</th>
                          <th className="text-center py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Kelayakan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const res = (preview || result)!;
                          const overdue = res.aging_summary
                            ? (res.aging_summary.overdue_1_30.total + res.aging_summary.overdue_31_90.total + res.aging_summary.overdue_kronis.total)
                            : 0;
                          
                          const getUpcoming = (total: number) => Math.max(0, total - overdue);
                          const t15 = (res.daily.target_15d || 0) * 15;
                          const t30 = (res.daily.target_30d || 0) * 30;
                          const t45 = (res.daily.target_45d || 0) * 45;
                          const t60 = (res.daily.target_60d || 0) * 60;

                          const horizons = res.daily.horizons || [
                            { days: 15, overdue_debt: overdue, upcoming_debt: getUpcoming(t15), total_debt: t15, daily_target: res.daily.target_15d || 0 },
                            { days: 30, overdue_debt: overdue, upcoming_debt: getUpcoming(t30), total_debt: t30, daily_target: res.daily.target_30d || 0 },
                            { days: 45, overdue_debt: overdue, upcoming_debt: getUpcoming(t45), total_debt: t45, daily_target: res.daily.target_45d || 0 },
                            { days: 60, overdue_debt: overdue, upcoming_debt: getUpcoming(t60), total_debt: t60, daily_target: res.daily.target_60d || 0 },
                          ];

                          const avgRevenue = res.avg_daily_revenue || 1;

                          return horizons.map((horizon, i) => {
                            const ratio = (horizon.daily_target / avgRevenue) * 100;
                            let statusText = 'AMAN';
                            let statusColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';

                            if (ratio > 100) {
                              statusText = 'DEFISIT BERAT';
                              statusColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                            } else if (ratio >= 50) {
                              statusText = 'SANGAT KETAT';
                              statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
                            }

                            return (
                              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                                  Horizon {horizon.days} Hari
                                </td>
                                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                                  {formatCurrency(horizon.overdue_debt)}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                                  {formatCurrency(horizon.upcoming_debt)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(horizon.total_debt)}
                                </td>
                                <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                                  {horizon.days} Hari
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                                  {formatCurrency(horizon.daily_target)}
                                </td>
                                <td className="py-3 px-4 text-right font-medium text-gray-700 dark:text-gray-300">
                                  {ratio.toFixed(1)}%
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusColor}`}>
                                    {statusText}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Consulting Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Mengapa Target Harian iPOS Terlalu Tinggi?
                      </h4>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside leading-relaxed">
                        <li>
                          <strong>Maturity Spike:</strong> Formula membagi sisa hutang dengan sisa hari. Invoice yang jatuh tempo esok hari (mis. sisa hari = 1) langsung menyumbang 100% nilainya ke target hari ini.
                        </li>
                        <li>
                          <strong>Efek Akumulasi Berulang (Double Counting):</strong> Jika invoice belum lunas, sisa hutangnya terus dibagi dengan sisa hari yang makin mengecil setiap harinya. Secara matematis, Anda dipaksa menyisihkan kas hingga 3x - 4x lipat dari nilai tagihan riil.
                        </li>
                        <li>
                          <strong>Pengabaian Overdue:</strong> Program iPOS mengabaikan hutang lewat jatuh tempo karena nilai sisa harinya negatif, padahal secara riil ini adalah kewajiban yang paling mendesak.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-green-50/30 dark:bg-green-950/10 rounded-2xl border border-green-200/50 dark:border-green-900/30 p-5">
                      <h4 className="text-sm font-bold text-green-900 dark:text-green-300 flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        Keunggulan Perencanaan Horizon N-Hari
                      </h4>
                      <ul className="text-xs text-green-800 dark:text-green-400 space-y-2 list-disc list-inside leading-relaxed">
                        <li>
                          <strong>Penyelarasan Beban:</strong> Seluruh tagihan (baik overdue maupun future) dikumpulkan dan disebar secara merata selama N hari ke depan. Ini menghasilkan angka target harian yang stabil dan konstan.
                        </li>
                        <li>
                          <strong>Rasio Pendapatan Realistis:</strong> Menunjukkan kelayakan finansial secara transparan. Jika rasio target harian vs pendapatan rata-rata &gt; 100%, itu sinyal kuat bahwa perusahaan dalam kondisi defisit arus kas.
                        </li>
                        <li>
                          <strong>Perencanaan Kas Terukur:</strong> Memudahkan manajemen treasury untuk memprediksi kebutuhan modal kerja harian tanpa terkejut oleh tagihan jatuh tempo mendadak.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'suppliers' && (preview || result)?.supplier_report && (
                <div className="space-y-4">
                  {/* Supplier Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800/30">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Total Supplier</p>
                      <p className="text-xl font-black text-blue-900 dark:text-blue-300">{(preview || result)!.supplier_report.total_suppliers}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800/30">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Total Invoice</p>
                      <p className="text-xl font-black text-green-900 dark:text-green-300">{(preview || result)!.supplier_report.total_invoices}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800/30">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">Total Hutang</p>
                      <p className="text-xl font-black text-purple-900 dark:text-purple-300">{formatCurrency((preview || result)!.supplier_report.total_amount)}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800/30">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Sudah Dibayar</p>
                      <p className="text-xl font-black text-yellow-900 dark:text-yellow-300">{formatCurrency((preview || result)!.supplier_report.total_paid)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800/30">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Sisa Hutang</p>
                      <p className="text-xl font-black text-red-900 dark:text-red-300">{formatCurrency((preview || result)!.supplier_report.total_remaining)}</p>
                    </div>
                  </div>

                  {/* Supplier List */}
                  <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Supplier</th>
                          <th className="text-center py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Invoice</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Total Hutang</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Dibayar</th>
                          <th className="text-right py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Sisa</th>
                          <th className="text-center py-3 px-4 font-bold text-gray-600 dark:text-gray-400">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(preview || result)!.supplier_report.suppliers.map((supplier, i) => (
                          <>
                            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900 dark:text-white">{supplier.supplier_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {supplier.earliest_due && `Earliest: ${supplier.earliest_due}`}
                                  {supplier.latest_due && ` | Latest: ${supplier.latest_due}`}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">{supplier.invoice_count}</td>
                              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{formatCurrency(supplier.total_amount)}</td>
                              <td className="py-3 px-4 text-right text-green-600 dark:text-green-400">{formatCurrency(supplier.total_paid)}</td>
                              <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">{formatCurrency(supplier.total_remaining)}</td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setExpandedSupplier(expandedSupplier === supplier.supplier_name ? null : supplier.supplier_name)}
                                  className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  {expandedSupplier === supplier.supplier_name ? 'Tutup' : 'Detail'}
                                </button>
                              </td>
                            </tr>
                            {expandedSupplier === supplier.supplier_name && (
                              <tr key={`${i}-detail`} className="bg-gray-50 dark:bg-gray-800/30">
                                <td colSpan={6} className="py-4 px-4">
                                  <div className="ml-4">
                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Invoice Detail</h4>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                          <th className="text-left py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">No. Invoice</th>
                                          <th className="text-left py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Tgl Invoice</th>
                                          <th className="text-left py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Jatuh Tempo</th>
                                          <th className="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Amount</th>
                                          <th className="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Dibayar</th>
                                          <th className="text-right py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Sisa</th>
                                          <th className="text-center py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Hari</th>
                                          <th className="text-center py-2 px-2 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {supplier.invoices.map((inv, j) => (
                                          <tr key={j} className="border-b border-gray-100 dark:border-gray-800">
                                            <td className="py-2 px-2 font-mono text-gray-700 dark:text-gray-300">{inv.invoice_no}</td>
                                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{inv.invoice_date}</td>
                                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{inv.due_date}</td>
                                            <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{formatCurrency(inv.amount)}</td>
                                            <td className="py-2 px-2 text-right text-green-600 dark:text-green-400">{formatCurrency(inv.paid_amount)}</td>
                                            <td className="py-2 px-2 text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(inv.remaining)}</td>
                                            <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-400">{inv.days_until_due}</td>
                                            <td className="py-2 px-2 text-center">
                                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                inv.aging_category === 'belum_jatuh_tempo' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                inv.aging_category === 'overdue_1_30' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                inv.aging_category === 'overdue_31_90' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                              }`}>
                                                {inv.aging_category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Aging Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Ringkasan Aging Hutang
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800/30">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Belum Jatuh Tempo</p>
                <p className="text-xl font-black text-green-900 dark:text-green-300">{formatCurrency((preview || result)!.aging_summary.belum_jatuh_tempo.total)}</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">{(preview || result)!.aging_summary.belum_jatuh_tempo.count} invoice</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800/30">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Overdue 1-30 Hari</p>
                <p className="text-xl font-black text-yellow-900 dark:text-yellow-300">{formatCurrency((preview || result)!.aging_summary.overdue_1_30.total)}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">{(preview || result)!.aging_summary.overdue_1_30.count} invoice</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-200 dark:border-orange-800/30">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Overdue 31-90 Hari</p>
                <p className="text-xl font-black text-orange-900 dark:text-orange-300">{formatCurrency((preview || result)!.aging_summary.overdue_31_90.total)}</p>
                <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">{(preview || result)!.aging_summary.overdue_31_90.count} invoice</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800/30">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Overdue Kronis</p>
                <p className="text-xl font-black text-red-900 dark:text-red-300">{formatCurrency((preview || result)!.aging_summary.overdue_kronis.total)}</p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">{(preview || result)!.aging_summary.overdue_kronis.count} invoice</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <History className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-gray-900 dark:text-white">Histori Analisa</h2>
        </div>

        {history.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Belum ada riwayat analisa</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tanggal</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Label</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Oleh</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Avg Revenue</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{formatDate(item.created_at)}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{item.run_label || '—'}</td>
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{item.triggered_by_name}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.avg_daily_revenue)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusColor(item.runway_status?.replace(/"/g, '') || 'AMAN')}`}>
                        {item.runway_status?.replace(/"/g, '') || 'AMAN'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewHistoryItem(item.id)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Lihat detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
