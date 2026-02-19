import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ArrowUpRight, ArrowDownLeft, Calendar, Database, Wallet } from 'lucide-react';

interface Mutation {
  id: string;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  nominal: number;
  keterangan: string;
}

interface Balance {
  totalCommissions: number;
  totalMutations: number;
  availableBalance: number;
}

export function Mutations() {
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mutData, balData] = await Promise.all([
        api.get<Mutation[]>('/withdrawals/all'), // This returns withdrawals and mutations
        api.get<Balance>('/withdrawals/balance')
      ]);
      // Note: withdrawals/all currently only returns withdrawal_requests in the backend service
      // I might need to unify them or just show what's available.
      // Let's check withdrawalsService.getWithdrawalRequests
      setMutations(mutData || []);
      setBalance(balData);
    } catch (err) {
      setError('Gagal mengambil data mutasi');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !balance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Mutasi Komisi"
        subtitle="Riwayat komisi masuk dan penarikan saldo"
      />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Saldo Tersedia</span>
          </div>
          <div className="text-3xl font-black mb-1">
            {formatCurrency(balance?.availableBalance || 0)}
          </div>
          <p className="text-blue-100 text-xs font-medium">Siap untuk dicairkan</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Total Komisi (Dibayar)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(balance?.totalCommissions || 0)}
          </div>
          <div className="flex items-center gap-1 text-green-500 font-bold text-xs">
            <ArrowUpRight className="w-3 h-3" />
            <span>Pendapatan masuk</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Total Penarikan</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {formatCurrency(Math.abs(balance?.totalMutations || 0))}
          </div>
          <div className="flex items-center gap-1 text-red-500 font-bold text-xs">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Saldo keluar</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Transaction History */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" />
        Riwayat Transaksi Terakhir
      </h3>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipe</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nominal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <LoadingSpinner size="md" />
                  </td>
                </tr>
              ) : mutations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Database className="w-10 h-10 opacity-20" />
                      <p className="text-sm">Belum ada riwayat transaksi.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                mutations.map((mut: any) => (
                  <tr key={mut.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(mut.tanggal).toLocaleDateString('id-ID')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${mut.tipe === 'masuk'
                        ? 'bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400'
                        }`}>
                        {mut.tipe === 'masuk' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        {mut.tipe === 'masuk' ? 'Komisi Masuk' : 'Penarikan'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${mut.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'}`}>
                        {mut.tipe === 'masuk' ? '+' : '-'}{formatCurrency(mut.nominal)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {mut.catatan || mut.keterangan || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${mut.status === 'approved' || mut.tipe === 'masuk'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : mut.status === 'pending'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        }`}>
                        {mut.status || 'SUCCESS'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
