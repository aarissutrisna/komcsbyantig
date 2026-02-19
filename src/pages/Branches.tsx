import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Building2, MapPin, Target, Database } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

interface Branch {
  id: string;
  name: string;
  city: string;
  target_min: string;
  target_max: string;
  last_sync_at: string | null;
}

export function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await api.get<Branch[]>('/branches');
      setBranches(data);
    } catch (err) {
      console.error('Fetch branches error:', err);
      setError('Gagal mengambil data cabang');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Manajemen Cabang"
        subtitle="Kelola daftar cabang Puncak Jaya Baja dan target penjualannya"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Tidak ada data cabang yang tersedia.</p>
          </div>
        ) : (
          branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <Building2 className="w-24 h-24 text-blue-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{branch.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3 h-3" />
                      {branch.city}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <Target className="w-3 h-3" />
                      Target Minimal
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(parseFloat(branch.target_min))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <Target className="w-3 h-3 text-blue-500" />
                      Target Maksimal
                    </div>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {formatCurrency(parseFloat(branch.target_max))}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-[10px] text-gray-400">
                  <span>ID: {branch.id.slice(0, 8)}...</span>
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded italic">
                    Sync: {branch.last_sync_at ? new Date(branch.last_sync_at).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
