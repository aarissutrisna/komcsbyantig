import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import {
  ArrowLeftRight,
  Search,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  ArrowRight,
  PackageOpen,
  AlertCircle,
  Info,
  Calculator,
  CheckSquare,
  Square,
} from 'lucide-react';

interface TransferItem {
  notransaksi: string;
  tanggal: string;
  kantordari: string;
  kantortujuan: string;
  keterangan: string;
  total_nilai: number;
}

interface TransferResponse {
  transfers: TransferItem[];
  grand_total: number;
}

const DIRECTION_OPTIONS = [
  { value: 'All', label: 'Semua Arah' },
  { value: 'UTMtoJTJ', label: 'UTM → JTJ' },
  { value: 'JTJtoUTM', label: 'JTJ → UTM' },
];

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(String(value || 0)));

const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID').format(value);

const formatDateTime = (dt: string) => {
  try {
    return new Date(dt).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dt;
  }
};

const directionBadge = (dari: string, tujuan: string) => {
  const key = `${dari}to${tujuan}`;
  const map: Record<string, { bg: string; text: string }> = {
    UTMtoJTJ: { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', text: 'UTM → JTJ' },
    JTJtoUTM: { bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', text: 'JTJ → UTM' },
  };
  const style = map[key] ?? { bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', text: `${dari} → ${tujuan}` };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg}`}>
      {style.text}
    </span>
  );
};

export function TransferBonus() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = today.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [direction, setDirection] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TransferResponse | null>(null);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Bonus settings
  const [bonusPembagi, setBonusPembagi] = useState(10000000);
  const [bonusPengali, setBonusPengali] = useState(5000);

  // Claims states
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [keteranganKlaim, setKeteranganKlaim] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const fetchClaimedIds = async () => {
    try {
      const ids = await api.get<string[]>('/bonus-claims/claimed-ids');
      setClaimedIds(new Set(ids));
    } catch (err) {
      console.error('Gagal mengambil daftar ID ter-klaim', err);
    }
  };

  useEffect(() => {
    api.get<{ pembagi: number; pengali: number }>('/settings/bonus-transfer')
      .then(data => {
        setBonusPembagi(data.pembagi);
        setBonusPengali(data.pengali);
      })
      .catch(() => {});

    fetchClaimedIds();
  }, []);

  const toggleCheck = (key: string) => {
    if (claimedIds.has(key)) return;
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!result) return;
    const claimableTransfers = result.transfers.filter(r => !claimedIds.has(r.notransaksi));
    
    // Check if all claimable items are already checked
    const allChecked = claimableTransfers.length > 0 && claimableTransfers.every(r => checkedKeys.has(r.notransaksi));
    
    if (allChecked || selectAll) {
      setCheckedKeys(prev => {
        const next = new Set(prev);
        claimableTransfers.forEach(r => next.delete(r.notransaksi));
        return next;
      });
      setSelectAll(false);
    } else {
      setCheckedKeys(prev => {
        const next = new Set(prev);
        claimableTransfers.forEach(r => next.add(r.notransaksi));
        return next;
      });
      setSelectAll(true);
    }
  };

  const checkedTransfers = result?.transfers?.filter(r => checkedKeys.has(r.notransaksi)) || [];
  const totalChecked = checkedTransfers.reduce((sum, r) => sum + parseFloat(String(r.total_nilai) || '0'), 0);
  const bonusAmount = Math.floor(totalChecked / bonusPembagi) * bonusPengali;

  const handleSaveClaim = async () => {
    if (checkedKeys.size === 0) return;
    if (!keteranganKlaim.trim()) {
      alert('Keterangan klaim wajib diisi.');
      return;
    }

    setSubmittingClaim(true);
    try {
      const selectedItems = result?.transfers.filter(r => checkedKeys.has(r.notransaksi)) || [];
      const payload = {
        keterangan: keteranganKlaim.trim(),
        startDate,
        endDate,
        direction,
        pembagi: bonusPembagi,
        pengali: bonusPengali,
        totalNilai: totalChecked,
        bonusAmount: bonusAmount,
        items: selectedItems,
      };

      const res = await api.post<{ success: boolean; message: string }>('/bonus-claims', payload);
      alert(res.message || 'Klaim bonus berhasil disimpan.');

      setCheckedKeys(new Set());
      setKeteranganKlaim('');
      setSelectAll(false);

      await fetchClaimedIds();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan klaim bonus.');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      setError('Tanggal awal dan akhir wajib diisi.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      fetchClaimedIds();

      const data = await api.get<any>(
        `/transfer-bonus?startDate=${startDate}&endDate=${endDate}&direction=${direction}`
      );
      if (!data || !Array.isArray(data.transfers)) {
        throw new Error('Respons webhook tidak valid — pastikan webhook n8n mengembalikan { transfers: [...], grand_total: number }');
      }
      // Normalize: pastikan total_nilai dan grand_total selalu number
      const normalized: TransferResponse = {
        transfers: data.transfers.map((r: any) => ({
          ...r,
          total_nilai: parseFloat(String(r.total_nilai ?? 0)) || 0,
        })),
        grand_total: parseFloat(String(data.grand_total ?? 0)) || 0,
      };
      setResult(normalized);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data dari webhook.');
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="animate-fade-in max-w-6xl">
      <PageHeader
        title="Transfer Item Bonus"
        subtitle="Data transfer barang bonus antar cabang dari sistem iPOS via webhook n8n"
      />

      {/* ── Filter Card ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Start Date */}
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tanggal Awal
            </label>
            <input
              id="tb-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <ChevronRight className="text-gray-400 mb-2.5 flex-shrink-0" size={18} />

          {/* End Date */}
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tanggal Akhir
            </label>
            <input
              id="tb-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Direction */}
          <div className="flex-1 min-w-[160px] space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Arah Transfer
            </label>
            <select
              id="tb-direction"
              value={direction}
              onChange={e => setDirection(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {DIRECTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Fetch Button */}
          <button
            id="tb-fetch-btn"
            onClick={handleFetch}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {loading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
            {loading ? 'Menarik Data...' : 'Tarik Data'}
          </button>
        </div>

        {/* Info hint */}
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <Info size={13} />
          Data diambil langsung dari webhook n8n yang terhubung ke database iPOS.
        </p>
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 px-5 py-4 rounded-2xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Gagal mengambil data</p>
            <p className="mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* ── Bonus Calculation Card ──────────────────────────────── */}
      {result && result.transfers?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-indigo-200 dark:border-indigo-800/40 shadow-sm mb-6 overflow-hidden">
          <div className="p-5 border-b border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/70 dark:bg-indigo-900/10 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Kalkulasi Bonus Transfer</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Centang item yang ingin dihitung. Bonus = (Total / {formatNumber(bonusPembagi)}) × {formatNumber(bonusPengali)}
              </p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Item Dipilih</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {checkedKeys.size}
                  <span className="text-sm font-medium text-gray-400 ml-1">/{result.transfers.length}</span>
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Nilai Dipilih</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {formatCurrency(totalChecked)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sisa Bagi</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {totalChecked > 0 ? formatNumber(bonusPembagi - (totalChecked % bonusPembagi)) : formatNumber(bonusPembagi)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-sm">
                <p className="text-xs text-white/80 mb-1">Total Bonus</p>
                <p className="text-2xl font-black tracking-tight">
                  {formatCurrency(bonusAmount)}
                </p>
                <p className="text-[10px] text-white/60 mt-1">
                  {totalChecked > 0 ? `${formatNumber(Math.floor(totalChecked / bonusPembagi))} × ${formatNumber(bonusPengali)}` : '—'}
                </p>
              </div>
            </div>

            {/* ── Claim Form Section ──────────────────────────────── */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Simpan Klaim Bonus</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Simpan hasil kalkulasi bonus dari item yang dicentang di bawah secara permanen (immutable).
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Keterangan Klaim <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={keteranganKlaim}
                    onChange={e => setKeteranganKlaim(e.target.value)}
                    placeholder="Contoh: Klaim Bonus Transfer periode Juni 2026"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveClaim}
                  disabled={submittingClaim || checkedKeys.size === 0 || !keteranganKlaim.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-sm h-[42px] whitespace-nowrap"
                >
                  {submittingClaim ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : null}
                  Simpan Klaim ({checkedKeys.size} Item)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Grand Total Card ─────────────────────────────────────── */}
      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-white/80">Grand Total Nilai Transfer</span>
              </div>
              <div className="text-3xl font-black tracking-tight">
                {formatCurrency(result.grand_total)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <ArrowLeftRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Transaksi</span>
              </div>
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                {result?.transfers?.length ?? 0}
                <span className="text-base font-medium text-gray-400 dark:text-gray-500 ml-2">transaksi</span>
              </div>
            </div>
          </div>

          {/* ── Table ──────────────────────────────────────────────── */}
          {!result.transfers?.length ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
              <PackageOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Tidak ada data transfer pada periode dan filter yang dipilih.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white">
                  Detail Transfer
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {startDate} s/d {endDate}
                    {direction !== 'All' && ` • ${direction}`}
                  </span>
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" id="tb-result-table">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                      <th className="px-3 py-3 w-10">
                        <button
                          onClick={toggleSelectAll}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                          title="Pilih semua / batalkan"
                        >
                          {selectAll
                            ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                            : <Square className="w-4 h-4 text-gray-400" />
                          }
                        </button>
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No. Transaksi</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Arah</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keterangan</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {result.transfers.map((row, i) => {
                      const isChecked = checkedKeys.has(row.notransaksi);
                      const isClaimed = claimedIds.has(row.notransaksi);
                      const rowKey = row.notransaksi + String(i);
                      return (
                        <tr
                          key={rowKey}
                          className={`transition-colors ${
                            isClaimed
                              ? 'bg-gray-50/40 dark:bg-gray-800/10 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : isChecked
                              ? 'bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50/70 dark:hover:bg-indigo-900/20 cursor-pointer'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer'
                          }`}
                          onClick={() => !isClaimed && toggleCheck(row.notransaksi)}
                        >
                          <td className="px-3 py-3.5" onClick={e => e.stopPropagation()}>
                            {isClaimed ? (
                              <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/30">
                                Sudah Diklaim
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleCheck(row.notransaksi)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                              >
                                {isChecked
                                  ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                }
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                            {row.notransaksi}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 whitespace-nowrap text-xs">
                            {formatDateTime(row.tanggal)}
                          </td>
                          <td className="px-5 py-3.5">
                            {directionBadge(row.kantordari, row.kantortujuan)}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {row.keterangan || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {formatCurrency(row.total_nilai)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Footer total */}
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                      <td colSpan={5} className="px-5 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        Grand Total
                      </td>
                      <td className="px-5 py-3 text-right font-black text-blue-600 dark:text-blue-400 text-base">
                        {formatCurrency(result.grand_total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty initial state */}
      {!result && !loading && !error && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <ArrowRight className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Pilih rentang tanggal dan klik <strong>Tarik Data</strong> untuk memuat data transfer.
          </p>
        </div>
      )}
    </div>
  );
}
