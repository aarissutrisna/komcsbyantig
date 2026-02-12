import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/currency';
import { Plus, Check, X } from 'lucide-react';

interface Mutation {
  id: string;
  user_id: string;
  tanggal: string;
  tipe: 'masuk' | 'keluar';
  nominal: number;
  saldo_after: number;
  keterangan: string | null;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  tanggal: string;
  nominal: number;
  status: 'pending' | 'approved' | 'rejected';
  user_nama?: string;
}

export function Mutations() {
  const { profile } = useAuth();
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    nominal: '',
    keterangan: '',
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'hrd';

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'cs') {
        const { data: mutationsData } = await supabase
          .from('commission_mutations')
          .select('*')
          .eq('user_id', profile.id)
          .order('tanggal', { ascending: false });

        setMutations(mutationsData || []);
      } else {
        let mutationsQuery = supabase
          .from('commission_mutations')
          .select('*')
          .order('tanggal', { ascending: false });

        let withdrawalsQuery = supabase
          .from('withdrawal_requests')
          .select('*, users!inner(nama)')
          .eq('status', 'pending')
          .order('tanggal', { ascending: false });

        if (profile.role === 'hrd') {
          mutationsQuery = mutationsQuery.in(
            'user_id',
            (await supabase.from('users').select('id').eq('branch_id', profile.branch_id)).data?.map(u => u.id) || []
          );

          withdrawalsQuery = withdrawalsQuery.eq('users.branch_id', profile.branch_id);
        }

        const [mutationsRes, withdrawalsRes] = await Promise.all([
          mutationsQuery,
          withdrawalsQuery,
        ]);

        setMutations(mutationsRes.data || []);
        setWithdrawalRequests(
          withdrawalsRes.data?.map(w => ({
            ...w,
            user_nama: (w.users as any)?.nama,
          })) || []
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const currentBalance = mutations.length > 0 ? mutations[0].saldo_after : 0;
      const newBalance = currentBalance - parseInt(formData.nominal);

      const { error } = await supabase
        .from('commission_mutations')
        .insert([{
          user_id: formData.user_id,
          tipe: 'keluar',
          nominal: parseInt(formData.nominal),
          saldo_after: newBalance,
          keterangan: formData.keterangan,
        }]);

      if (error) throw error;

      setShowModal(false);
      setFormData({ user_id: '', nominal: '', keterangan: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving mutation:', error);
    }
  };

  const handleApproveWithdrawal = async (requestId: string, userId: string, nominal: number) => {
    try {
      const currentBalance = mutations.filter(m => m.user_id === userId)[0]?.saldo_after || 0;
      const newBalance = currentBalance - nominal;

      await supabase.from('commission_mutations').insert([{
        user_id: userId,
        tipe: 'keluar',
        nominal: nominal,
        saldo_after: newBalance,
        keterangan: 'Penarikan disetujui',
      }]);

      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      fetchData();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    }
  };

  const handleRejectWithdrawal = async (requestId: string) => {
    try {
      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      fetchData();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mutasi Komisi</h1>
          <p className="text-gray-600 mt-2">Riwayat transaksi komisi</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Tambah Pengeluaran
          </button>
        )}
      </div>

      {canManage && withdrawalRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Permintaan Penarikan</h2>
          <div className="space-y-3">
            {withdrawalRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{request.user_nama}</p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(request.nominal)} - {new Date(request.tanggal).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveWithdrawal(request.id, request.user_id, request.nominal)}
                    className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    <Check className="w-4 h-4" />
                    Setujui
                  </button>
                  <button
                    onClick={() => handleRejectWithdrawal(request.id)}
                    className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    <X className="w-4 h-4" />
                    Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tanggal</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tipe</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nominal</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Saldo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mutations.map((mutation) => (
                <tr key={mutation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(mutation.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      mutation.tipe === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {mutation.tipe.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(mutation.nominal)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(mutation.saldo_after)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{mutation.keterangan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tambah Pengeluaran</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                <input
                  type="text"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nominal</label>
                <input
                  type="number"
                  value={formData.nominal}
                  onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan</label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
