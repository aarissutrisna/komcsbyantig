import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import {
  ClipboardCheck,
  Calendar,
  ArrowLeftRight,
  User,
  Trash2,
  Eye,
  X,
  RefreshCw,
  AlertCircle,
  PackageOpen,
} from 'lucide-react';

interface ClaimItem {
  id: number;
  claim_id: number;
  notransaksi: string;
  tanggal: string;
  kantordari: string;
  kantortujuan: string;
  keterangan: string;
  total_nilai: number;
}

interface BonusClaim {
  id: number;
  keterangan: string;
  start_date: string;
  end_date: string;
  direction: string;
  pembagi: number;
  pengali: number;
  total_nilai: number;
  bonus_amount: number;
  item_count: number;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  items?: ClaimItem[];
}

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parseFloat(String(value || 0)));

const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID').format(value);

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

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

const directionBadge = (direction: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    UTMtoJTJ: { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', text: 'UTM → JTJ' },
    JTJtoUTM: { bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', text: 'JTJ → UTM' },
    All: { bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', text: 'Semua Arah' },
  };
  const style = map[direction] ?? { bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', text: direction };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg}`}>
      {style.text}
    </span>
  );
};

export function ClaimedBonusTransfer() {
  const [claims, setClaims] = useState<BonusClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Detail modal state
  const [selectedClaim, setSelectedClaim] = useState<BonusClaim | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchClaims = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<BonusClaim[]>('/bonus-claims');
      setClaims(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat histori klaim.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleOpenDetail = async (claimId: number) => {
    setLoadingDetail(true);
    try {
      const detail = await api.get<BonusClaim>(`/bonus-claims/${claimId}`);
      setSelectedClaim(detail);
    } catch (err: any) {
      alert(err.message || 'Gagal mengambil detail klaim.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteClaim = async (claimId: number, desc: string) => {
    const confirmDelete = confirm(`Apakah Anda yakin ingin menghapus klaim "${desc}"?\n\nSemua transaksi dalam klaim ini akan dapat dihitung ulang di menu Transfer Bonus.`);
    if (!confirmDelete) return;

    try {
      const res = await api.delete<{ success: boolean; message: string }>(`/bonus-claims/${claimId}`);
      alert(res.message || 'Klaim berhasil dihapus.');
      fetchClaims();
    } catch (err: any) {
      console.error('Error deleting claim:', err);
      alert(err.message || 'Gagal menghapus klaim.');
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl">
      <PageHeader
        title="Histori Klaim Bonus"
        subtitle="Daftar klaim bonus transfer item yang sudah di-lock secara permanen"
      />

      {/* ── Error Alert ────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-400 px-5 py-4 rounded-2xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Gagal memuat data</p>
            <p className="mt-0.5 opacity-80">{error}</p>
            <button onClick={fetchClaims} className="mt-2 text-xs font-bold underline flex items-center gap-1 hover:opacity-80">
              <RefreshCw size={12} /> Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* ── Table / List Section ────────────────────────────────── */}
      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Memuat histori klaim...</p>
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
              <ClipboardCheck className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <p className="text-gray-900 dark:text-white font-bold mb-1">Belum Ada Klaim</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
            Belum ada transaksi transfer item bonus yang diklaim. Silakan lakukan klaim di halaman <strong>Transfer Bonus</strong>.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-gray-900/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-gray-900 dark:text-white">Daftar Klaim</h2>
            </div>
            <button
              onClick={fetchClaims}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12 text-center">No</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal Klaim</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keterangan</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Periode & Arah</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Setting (Pembagi/Pengali)</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Nilai</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Bonus</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {claims.map((claim, index) => (
                  <tr key={claim.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-5 py-4 text-center font-semibold text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                      <div className="font-semibold text-gray-900 dark:text-white">{formatDateTime(claim.created_at)}</div>
                      <div className="flex items-center gap-1 mt-1 text-gray-400">
                        <User size={12} /> {claim.created_by_name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-900 dark:text-white font-medium max-w-xs truncate">
                      {claim.keterangan}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-semibold mb-1">
                        <Calendar size={13} className="text-indigo-500" />
                        {formatDate(claim.start_date)} - {formatDate(claim.end_date)}
                      </div>
                      <div>{directionBadge(claim.direction)}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                      <div>Pembagi: <span className="font-semibold">{formatNumber(claim.pembagi)}</span></div>
                      <div>Pengali: <span className="font-semibold">{formatCurrency(claim.pengali)}</span></div>
                      <div className="mt-1 font-medium text-indigo-600 dark:text-indigo-400">{claim.item_count} item</div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(claim.total_nilai)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {formatCurrency(claim.bonus_amount)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(claim.id)}
                          disabled={loadingDetail}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all active:scale-95"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClaim(claim.id, claim.keterangan)}
                          className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-all active:scale-95"
                          title="Hapus Klaim (Hitung Ulang)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────────── */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/50 dark:bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Detail Transaksi Klaim</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Klaim: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedClaim.keterangan}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-xs bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div>
                  <div className="text-gray-400">Periode</div>
                  <div className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                    {formatDate(selectedClaim.start_date)} - {formatDate(selectedClaim.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Arah</div>
                  <div className="mt-0.5">{directionBadge(selectedClaim.direction)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Total Nilai</div>
                  <div className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {formatCurrency(selectedClaim.total_nilai)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Bonus Terhitung</div>
                  <div className="font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {formatCurrency(selectedClaim.bonus_amount)}
                  </div>
                </div>
              </div>

              {!selectedClaim.items || selectedClaim.items.length === 0 ? (
                <div className="text-center py-8">
                  <PackageOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Tidak ada item detail untuk klaim ini.</p>
                </div>
              ) : (
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50">
                          <th className="px-4 py-2.5 text-center font-bold text-gray-500 w-12">No</th>
                          <th className="px-4 py-2.5 text-left font-bold text-gray-500">No. Transaksi</th>
                          <th className="px-4 py-2.5 text-left font-bold text-gray-500">Tanggal</th>
                          <th className="px-4 py-2.5 text-left font-bold text-gray-500">Arah</th>
                          <th className="px-4 py-2.5 text-left font-bold text-gray-500">Keterangan iPOS</th>
                          <th className="px-4 py-2.5 text-right font-bold text-gray-500">Total Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selectedClaim.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                            <td className="px-4 py-3.5 text-center font-semibold text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-3.5 font-mono font-medium text-gray-900 dark:text-white">{item.notransaksi}</td>
                            <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{formatDateTime(item.tanggal)}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {item.kantordari} → {item.kantortujuan}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-gray-500 max-w-xs truncate">{item.keterangan || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                            <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.total_nilai)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
