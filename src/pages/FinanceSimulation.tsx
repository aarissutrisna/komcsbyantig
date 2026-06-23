import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  Calculator,
  Play,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  History,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';

interface FinanceGroup {
  finance_group_key: string;
  group_name: string;
  branch_count: number;
  branch_ids: string;
}

interface AnalysisRun {
  id: string;
  run_label: string;
  created_at: string;
  avg_daily_revenue: number;
  cash_position_used: number;
}

interface SimulatedItem {
  id?: number;
  supplier_name: string;
  invoice_no?: string;
  amount: number;
  due_days: number;
  notes?: string;
}

interface SimulationDraft {
  id: string;
  sim_label: string;
  analysis_run_id: string;
  baseline_label: string;
  created_at: string;
  created_by_name: string;
  item_count: number;
  total_amount: number;
}

interface HorizonDetail {
  days: number;
  overdue_debt: number;
  upcoming_debt: number;
  total_debt: number;
  daily_target: number;
}

interface HorizonBudget {
  days: number;
  projected_income: number;
  opex: number;
  debt_due: number;
  safe_purchase_budget: number;
  status: string;
}

interface CalculationResult {
  avg_daily_revenue: number;
  cash_position: {
    current_cash: number;
    recorded_date: string | null;
    runway_status: string;
    critical_date: string | null;
  };
  daily: {
    debt_target_today: number;
    target_15d: number;
    target_30d: number;
    target_45d: number;
    target_60d: number;
    target_custom?: number;
    custom_days?: number;
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
      invoices: Array<{
        invoice_no: string;
        invoice_date: string;
        due_date: string;
        amount: number;
        remaining: number;
        days_until_due: number;
        aging_category: string;
      }>;
    }>;
  };
  horizon_budgets: {
    h15: HorizonBudget;
    h30: HorizonBudget;
    h45: HorizonBudget;
    h60: HorizonBudget;
    hn?: HorizonBudget;
  };
  options?: {
    skip_overdue_kronis: boolean;
    ignored_suppliers: string[];
    use_cash_for_debt: boolean;
    n_days?: number;
  };
}

export function FinanceSimulation() {
  // State variables
  const [groups, setGroups] = useState<FinanceGroup[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('');
  const [baselines, setBaselines] = useState<AnalysisRun[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('');
  const [baselineDetail, setBaselineDetail] = useState<CalculationResult | null>(null);
  
  // Simulated items
  const [items, setItems] = useState<SimulatedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingBaseline, setLoadingBaseline] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Simulation results
  const [simResults, setSimResults] = useState<CalculationResult | null>(null);
  
  // Saved simulation drafts
  const [savedSims, setSavedSims] = useState<SimulationDraft[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'summary' | 'buckets' | 'horizons' | 'suppliers'>('summary');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [simLabel, setSimLabel] = useState<string>('');

  // Load finance groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch baselines & saved simulations when group key changes
  useEffect(() => {
    if (selectedGroupKey) {
      fetchBaselines(selectedGroupKey);
      fetchSavedSimulations(selectedGroupKey);
      // Reset details
      setBaselineDetail(null);
      setSimResults(null);
      setItems([]);
    }
  }, [selectedGroupKey]);

  // Fetch baseline detail when baseline ID changes
  useEffect(() => {
    if (selectedBaselineId) {
      fetchBaselineDetail(selectedBaselineId);
    } else {
      setBaselineDetail(null);
      setSimResults(null);
    }
  }, [selectedBaselineId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.get<FinanceGroup[]>('/finance/groups');
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroupKey(data[0].finance_group_key);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat grup finansial');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaselines = async (groupKey: string) => {
    try {
      const data = await api.get<AnalysisRun[]>(`/finance/analysis-runs/${groupKey}`);
      setBaselines(data);
      if (data.length > 0) {
        setSelectedBaselineId(data[0].id);
      } else {
        setSelectedBaselineId('');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data baseline');
    }
  };

  const fetchSavedSimulations = async (groupKey: string) => {
    try {
      const data = await api.get<SimulationDraft[]>(`/finance/simulations/${groupKey}`);
      setSavedSims(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchBaselineDetail = async (runId: string) => {
    try {
      setLoadingBaseline(true);
      const data = await api.get<CalculationResult>(`/finance/analysis-runs/groupKey/${runId}`);
      setBaselineDetail(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail baseline');
    } finally {
      setLoadingBaseline(false);
    }
  };

  // Add new item to in-memory simulated list
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        supplier_name: '',
        invoice_no: `SIM-${Math.floor(1000 + Math.random() * 9000)}`,
        amount: 0,
        due_days: 30,
        notes: ''
      }
    ]);
  };

  // Update in-memory item
  const handleUpdateItem = (index: number, field: keyof SimulatedItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setItems(updated);
  };

  // Remove in-memory item
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Execute preview simulation via API
  const handlePreviewSimulation = async () => {
    if (!selectedBaselineId) {
      setError('Silakan pilih baseline terlebih dahulu.');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.supplier_name.trim()) {
        setError('Nama Supplier wajib diisi untuk semua item simulasi.');
        return;
      }
      if (item.amount <= 0) {
        setError('Nominal harus lebih besar dari 0.');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        baseline_run_id: selectedBaselineId,
        simulated_debts: items
      };

      const data = await api.post<CalculationResult>(`/finance/simulations/${selectedGroupKey}/preview`, payload);
      setSimResults(data);
      setSuccess('Simulasi berhasil dihitung! Silakan lihat hasil di sebelah kanan.');
    } catch (err: any) {
      setError(err.message || 'Gagal menghitung simulasi');
    } finally {
      setLoading(false);
    }
  };

  // Trigger save simulation modal
  const handleSaveSimulationClick = () => {
    if (!selectedBaselineId) {
      setError('Silakan pilih baseline terlebih dahulu.');
      return;
    }
    if (items.length === 0) {
      setError('Masukkan minimal 1 item simulasi untuk disimpan.');
      return;
    }
    setSimLabel(`Simulasi Pembelian - ${new Date().toLocaleDateString('id-ID')}`);
    setShowSaveModal(true);
  };

  // Save simulation draft to DB
  const handleSaveSimulationConfirm = async () => {
    if (!simLabel.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const payload = {
        baseline_run_id: selectedBaselineId,
        sim_label: simLabel,
        simulated_debts: items
      };

      await api.post(`/finance/simulations/${selectedGroupKey}/save`, payload);
      setSuccess('Draf simulasi berhasil disimpan ke database!');
      setShowSaveModal(false);
      fetchSavedSimulations(selectedGroupKey);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan simulasi');
    } finally {
      setLoading(false);
    }
  };

  // Load a saved simulation draft
  const handleLoadSimulation = async (simId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const data = await api.get<any>(`/finance/simulations/groupKey/${simId}`);
      
      setSelectedBaselineId(data.analysis_run_id);
      setItems(data.items);
      setSimResults(data.preview);
      
      // Select the baseline if details not matching
      if (baselineDetail?.run_id !== data.analysis_run_id) {
        await fetchBaselineDetail(data.analysis_run_id);
      }
      
      setSuccess(`Draf simulasi "${data.sim_label}" berhasil dimuat!`);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat draf simulasi');
    } finally {
      setLoading(false);
    }
  };

  // Delete a saved simulation draft
  const handleDeleteSimulation = async (simId: string, label: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus draf simulasi "${label}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.delete(`/finance/simulations/groupKey/${simId}`);
      setSuccess('Draf simulasi berhasil dihapus.');
      fetchSavedSimulations(selectedGroupKey);
      
      // Clear results if loaded
      if (simResults?.baseline_run_id === simId) {
        setSimResults(null);
        setItems([]);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus draf simulasi');
    } finally {
      setLoading(false);
    }
  };

  // Currency Formatter
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Status Styling helpers
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AMAN':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      case 'WASPADA':
      case 'WASPADA TINGGI':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
      case 'DEFISIT':
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
    }
  };

  const hasImpacted = (beforeVal: any, afterVal: any) => {
    return beforeVal !== afterVal;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulasi Pembelian (What-If)"
        subtitle="Analisis dampak penambahan hutang/nota belanja supplier terhadap kas dan target target amortisasi."
        icon={Calculator}
      />

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border-l-4 border-rose-500 rounded-r-xl text-rose-800 dark:text-rose-400 text-sm font-medium flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:text-rose-900 dark:hover:text-rose-300 font-bold">×</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/10 border-l-4 border-emerald-500 rounded-r-xl text-emerald-800 dark:text-emerald-400 text-sm font-medium flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="hover:text-emerald-900 dark:hover:text-emerald-300 font-bold">×</button>
        </div>
      )}

      {/* Selectors and Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            Konfigurasi Simulasi
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Kelompok Finansial
              </label>
              <select
                value={selectedGroupKey}
                onChange={(e) => setSelectedGroupKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {groups.map((g) => (
                  <option key={g.finance_group_key} value={g.finance_group_key}>
                    {g.group_name} ({g.branch_count} cabang)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Acuan Baseline Analisa
              </label>
              <select
                value={selectedBaselineId}
                onChange={(e) => setSelectedBaselineId(e.target.value)}
                disabled={baselines.length === 0}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {baselines.length === 0 ? (
                  <option value="">-- Belum ada data analisa disimpan --</option>
                ) : (
                  baselines.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.run_label} ({new Date(b.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Baseline summary info banner */}
          {baselineDetail && (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex flex-wrap gap-y-2 gap-x-6 text-xs text-blue-800 dark:text-blue-400 font-medium">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <span>Kas Baseline: <strong className="text-gray-900 dark:text-white">{formatCurrency(baselineDetail.cash_position.current_cash)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>Pendapatan Harian: <strong className="text-gray-900 dark:text-white">{formatCurrency(baselineDetail.avg_daily_revenue)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>Runway Status: 
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${getStatusBadgeClass(baselineDetail.cash_position.runway_status)}`}>
                    {baselineDetail.cash_position.runway_status}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Saved simulation drafts card */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-purple-500" />
              Draf Simulasi
            </h2>
            
            <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {savedSims.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-8">Belum ada draf simulasi tersimpan.</p>
              ) : (
                savedSims.map((sim) => (
                  <div key={sim.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/40 border border-gray-100 dark:border-gray-850 rounded-xl transition-all">
                    <button
                      onClick={() => handleLoadSimulation(sim.id)}
                      className="text-left flex-1"
                    >
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[180px]">{sim.sim_label}</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {sim.item_count} nota • {formatCurrency(sim.total_amount)}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteSimulation(sim.id, sim.sim_label)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="Hapus Draf"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Main Content Panel (Left: Items, Right: Impact) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left: Interactive Input Table */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              Nota Belanja Simulasi
            </h2>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Nota
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-150 dark:border-gray-800 rounded-xl">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 border-b border-gray-150 dark:border-gray-800">
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Nama Supplier</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">No Nota (Opt)</th>
                  <th className="text-right p-3 font-bold text-xs uppercase tracking-wider">Nominal (Rp)</th>
                  <th className="text-center p-3 font-bold text-xs uppercase tracking-wider">Tempo (Hari)</th>
                  <th className="text-left p-3 font-bold text-xs uppercase tracking-wider">Catatan</th>
                  <th className="p-3 text-center w-12">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400">
                      Belum ada nota simulasi dimasukkan. Klik <strong>Tambah Nota</strong> di kanan atas untuk memulai.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-150 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.supplier_name}
                          onChange={(e) => handleUpdateItem(idx, 'supplier_name', e.target.value)}
                          placeholder="Contoh: PJB Tasik"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.invoice_no || ''}
                          onChange={(e) => handleUpdateItem(idx, 'invoice_no', e.target.value)}
                          placeholder="SIM-..."
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => handleUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Nominal"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white text-xs text-right focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.due_days || ''}
                          onChange={(e) => handleUpdateItem(idx, 'due_days', parseInt(e.target.value) || 0)}
                          placeholder="Tempo"
                          className="w-20 mx-auto px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white text-xs text-center focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                          placeholder="Keterangan"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePreviewSimulation}
              disabled={loading || items.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 transition-all text-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Jalankan Simulasi
            </button>

            <button
              onClick={handleSaveSimulationClick}
              disabled={loading || items.length === 0}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Simpan Draf
            </button>
          </div>
        </div>

        {/* Right: Comparative Dashboard Result */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 min-h-[400px]">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Hasil Dampak Analisa
            </h2>
            {simResults && (
              <span className="px-3 py-1 text-[10px] font-black tracking-wider uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 rounded-full">
                Simulasi Aktif
              </span>
            )}
          </div>

          {!simResults ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/10 rounded-full border border-gray-150 dark:border-gray-800">
                <Calculator className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Menunggu Perhitungan</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                  Isi nota belanja simulasi di panel kiri, lalu klik <strong>Jalankan Simulasi</strong> untuk menganalisis dampaknya.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Before/After Cash Runway & Daily Targets Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Runway Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800/60 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cash Runway</h3>
                  <div className="flex items-center gap-4 justify-between">
                    <div>
                      <span className="text-[10px] block text-gray-450 uppercase">Sebelum</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusBadgeClass(baselineDetail?.cash_runway.status || 'AMAN')}`}>
                        {baselineDetail?.cash_runway.status}
                      </span>
                      <span className="text-[10px] block text-gray-400 mt-1">
                        {baselineDetail?.cash_runway.critical_date ? `Kehabisan: ${baselineDetail.cash_runway.critical_date}` : 'Aman dari Kritis'}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] block text-gray-450 uppercase">Sesudah</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusBadgeClass(simResults.cash_runway.status)} ${hasImpacted(baselineDetail?.cash_runway.status, simResults.cash_runway.status) ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}>
                        {simResults.cash_runway.status}
                      </span>
                      <span className={`text-[10px] block mt-1 ${hasImpacted(baselineDetail?.cash_runway.critical_date, simResults.cash_runway.critical_date) ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-400'}`}>
                        {simResults.cash_runway.critical_date ? `Kehabisan: ${simResults.cash_runway.critical_date}` : 'Aman dari Kritis'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Spikey Target Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800/60 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Harian (Spikey)</h3>
                  <div className="flex items-center gap-4 justify-between">
                    <div>
                      <span className="text-[10px] block text-gray-450 uppercase">Sebelum</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(baselineDetail?.daily.debt_target_today || 0)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-[10px] block text-gray-450 uppercase">Sesudah</span>
                      <span className={`text-sm font-black ${hasImpacted(baselineDetail?.daily.debt_target_today, simResults.daily.debt_target_today) ? 'text-indigo-600 dark:text-indigo-400 scale-105 inline-block font-extrabold' : 'text-gray-900 dark:text-white'}`}>
                        {formatCurrency(simResults.daily.debt_target_today)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab Switcher for comparative details */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 text-sm">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-2.5 px-4 font-bold border-b-2 transition-all ${activeTab === 'summary' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  Proyeksi Target
                </button>
                <button
                  onClick={() => setActiveTab('buckets')}
                  className={`pb-2.5 px-4 font-bold border-b-2 transition-all ${activeTab === 'buckets' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  15-Harian
                </button>
                <button
                  onClick={() => setActiveTab('horizons')}
                  className={`pb-2.5 px-4 font-bold border-b-2 transition-all ${activeTab === 'horizons' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  Horizon Perencanaan
                </button>
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className={`pb-2.5 px-4 font-bold border-b-2 transition-all ${activeTab === 'suppliers' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  Rincian Supplier
                </button>
              </div>

              {/* Tab: Summary (Smoothed Targets Compare) */}
              {activeTab === 'summary' && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Perbandingan Target Harian Amortisasi Merata
                  </h3>
                  
                  <div className="space-y-3">
                    {(() => {
                      const list = [
                        { label: 'Horizon 15 Hari', key: 'target_15d' as const },
                        { label: 'Horizon 30 Hari', key: 'target_30d' as const },
                        { label: 'Horizon 45 Hari', key: 'target_45d' as const },
                        { label: 'Horizon 60 Hari', key: 'target_60d' as const },
                      ];
                      if (simResults.daily.target_custom !== undefined && simResults.daily.custom_days !== undefined) {
                        const cDays = simResults.daily.custom_days;
                        if (![15, 30, 45, 60].includes(cDays)) {
                          list.push({ label: `Horizon Kustom ${cDays} Hari`, key: 'target_custom' as const });
                        }
                      }
                      return list;
                    })().map((hor) => {
                      const beforeVal = baselineDetail?.daily[hor.key] || 0;
                      const afterVal = simResults.daily[hor.key] || 0;
                      const diff = afterVal - beforeVal;

                      return (
                        <div key={hor.key} className="flex justify-between items-center p-3 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/30">
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{hor.label}</span>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-gray-500">{formatCurrency(beforeVal)}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                            <span className={diff > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}>
                              {formatCurrency(afterVal)}
                            </span>
                            {diff > 0 && (
                              <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                                +{formatCurrency(diff)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: 15-Harian Buckets Compare */}
              {activeTab === 'buckets' && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Perbandingan Budget Pembelian Aman per Bucket 15 Hari
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-150 dark:border-gray-800">
                          <th className="text-left py-2 font-bold">Periode Bucket</th>
                          <th className="text-right py-2 font-bold">Budget Sebelum (Rp)</th>
                          <th className="text-right py-2 font-bold">Budget Sesudah (Rp)</th>
                          <th className="text-center py-2 font-bold">Status Sebelum</th>
                          <th className="text-center py-2 font-bold">Status Sesudah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResults.biweekly_buckets.map((b, idx) => {
                          const beforeBucket = baselineDetail?.biweekly_buckets[idx];
                          const safeBefore = beforeBucket?.safe_purchase_budget || 0;
                          const safeAfter = b.safe_purchase_budget;
                          const isDiff = safeBefore !== safeAfter;

                          return (
                            <tr key={idx} className="border-b border-gray-150 dark:border-gray-850 hover:bg-gray-50/20">
                              <td className="py-2.5 font-bold text-gray-700 dark:text-gray-300">{b.label}</td>
                              <td className="py-2.5 text-right text-gray-500">{formatCurrency(safeBefore)}</td>
                              <td className={`py-2.5 text-right font-bold ${isDiff ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {formatCurrency(safeAfter)}
                              </td>
                              <td className="py-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(beforeBucket?.status || 'AMAN')}`}>
                                  {beforeBucket?.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(b.status)} ${b.status !== beforeBucket?.status ? 'ring-2 ring-indigo-500' : ''}`}>
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab: Horizon Perencanaan Detail */}
              {activeTab === 'horizons' && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Rincian Budget Horizon Treasury (Safety-Margin & Opex Deducted)
                  </h3>

                  <div className="space-y-4">
                    {(() => {
                      const list = [
                        { name: '15 Hari (H15)', key: 'h15' as const },
                        { name: '30 Hari (H30)', key: 'h30' as const },
                        { name: '45 Hari (H45)', key: 'h45' as const },
                        { name: '60 Hari (H60)', key: 'h60' as const },
                      ];
                      const customDays = simResults.daily.custom_days || 90;
                      if (simResults.horizon_budgets.hn && ![15, 30, 45, 60].includes(customDays)) {
                        list.push({ name: `${customDays} Hari (Kustom - HN)`, key: 'hn' as const });
                      }
                      return list;
                    })().map((h) => {
                      const beforeHorizon = baselineDetail?.horizon_budgets?.[h.key];
                      const afterHorizon = simResults.horizon_budgets[h.key];
                      
                      if (!afterHorizon) return null;
                      
                      const diffDebt = (afterHorizon?.debt_due || 0) - (beforeHorizon?.debt_due || 0);
                      const diffBudget = (afterHorizon?.safe_purchase_budget || 0) - (beforeHorizon?.safe_purchase_budget || 0);

                      return (
                        <div key={h.key} className="p-4 border border-gray-150 dark:border-gray-800 rounded-xl bg-gray-50/10 space-y-2">
                          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-1.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{h.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${getStatusBadgeClass(afterHorizon.status)}`}>
                              {afterHorizon.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
                            <div className="flex justify-between text-gray-500">
                              <span>Hutang Due (Sebelum):</span>
                              <span>{formatCurrency(beforeHorizon?.debt_due || 0)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Budget Aman (Sebelum):</span>
                              <span>{formatCurrency(beforeHorizon?.safe_purchase_budget || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-700 dark:text-gray-300">
                              <span>Hutang Due (Sesudah):</span>
                              <span className={diffDebt > 0 ? 'text-indigo-600 dark:text-indigo-400' : ''}>
                                {formatCurrency(afterHorizon.debt_due)}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-700 dark:text-gray-300">
                              <span>Budget Aman (Sesudah):</span>
                              <span className={diffBudget < 0 ? 'text-red-500 font-extrabold' : 'text-emerald-500 font-extrabold'}>
                                {formatCurrency(afterHorizon.safe_purchase_budget)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Supplier Report */}
              {activeTab === 'suppliers' && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Rincian Hutang Per Supplier Terakumulasi (Termasuk Nota Simulasi)
                  </h3>

                  <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl max-h-64 scrollbar-thin">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/40 text-gray-500 border-b border-gray-150 dark:border-gray-800">
                          <th className="text-left p-2.5 font-bold">Nama Supplier</th>
                          <th className="text-center p-2.5 font-bold">Nota Aktif</th>
                          <th className="text-right p-2.5 font-bold">Total Kewajiban (Rp)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simResults.supplier_report.suppliers.map((s, idx) => {
                          const isSimulatedOnly = s.suppliers?.some((sub: any) => sub.supplier_code === 'SIMULASI') || s.supplier_name.includes('Simulasi') || s.invoices?.some(inv => inv.invoice_no.includes('SIM-'));
                          
                          return (
                            <tr key={idx} className={`border-b border-gray-150 dark:border-gray-850 hover:bg-gray-50/20 ${isSimulatedOnly ? 'bg-indigo-50/20 dark:bg-indigo-950/5' : ''}`}>
                              <td className="p-2.5 font-bold text-gray-800 dark:text-gray-300 flex items-center gap-1.5">
                                {s.supplier_name}
                                {isSimulatedOnly && (
                                  <span className="px-1 text-[8px] bg-indigo-500 text-white font-bold rounded">
                                    Simulasi
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-center text-gray-500">{s.invoice_count}</td>
                              <td className="p-2.5 text-right font-bold text-gray-900 dark:text-white">
                                {formatCurrency(s.total_remaining)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Simulation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Simpan Draf Simulasi</h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Nama Label Draf
              </label>
              <input
                type="text"
                value={simLabel}
                onChange={(e) => setSimLabel(e.target.value)}
                placeholder="Simulasi Pembelian A..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-850"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSimulationConfirm}
                disabled={!simLabel.trim() || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-sm disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
