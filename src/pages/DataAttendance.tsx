import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/currency';
import { CalendarDays, Plus } from 'lucide-react';

interface OmzetData {
  id: string;
  tanggal: string;
  cash: number;
  piutang: number;
  total: number;
  branch_id: string;
}

interface AttendanceData {
  id: string;
  user_id: string;
  tanggal: string;
  status: number;
  user_nama?: string;
}

interface Branch {
  id: string;
  name: string;
}

export function DataAttendance() {
  const { profile } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [omzetData, setOmzetData] = useState<OmzetData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOmzetModal, setShowOmzetModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [omzetForm, setOmzetForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    cash: '',
    piutang: '',
  });
  const [attendanceForm, setAttendanceForm] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchInitialData();
  }, [profile]);

  useEffect(() => {
    if (selectedBranch) {
      fetchData();
    }
  }, [selectedBranch]);

  const fetchInitialData = async () => {
    if (!profile) return;

    try {
      if (profile.role === 'admin') {
        const { data: branchesData } = await supabase
          .from('branches')
          .select('id, name')
          .order('name');
        setBranches(branchesData || []);
        if (branchesData && branchesData.length > 0) {
          setSelectedBranch(branchesData[0].id);
        }
      } else {
        const { data: branchData } = await supabase
          .from('branches')
          .select('id, name')
          .eq('id', profile.branch_id)
          .maybeSingle();
        if (branchData) {
          setBranches([branchData]);
          setSelectedBranch(branchData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!selectedBranch) return;

    try {
      const [omzetRes, usersRes] = await Promise.all([
        supabase
          .from('omzet')
          .select('*')
          .eq('branch_id', selectedBranch)
          .order('tanggal', { ascending: false })
          .limit(30),
        supabase
          .from('users')
          .select('*')
          .eq('branch_id', selectedBranch)
          .eq('role', 'cs'),
      ]);

      if (omzetRes.data) setOmzetData(omzetRes.data);
      if (usersRes.data) {
        setUsers(usersRes.data);
        const dates = omzetRes.data?.map(o => o.tanggal) || [];
        const userIds = usersRes.data.map(u => u.id);

        if (dates.length > 0 && userIds.length > 0) {
          const { data: attendanceRes } = await supabase
            .from('attendance')
            .select('*')
            .in('tanggal', dates)
            .in('user_id', userIds);

          if (attendanceRes) {
            const enrichedAttendance = attendanceRes.map(att => ({
              ...att,
              user_nama: usersRes.data.find(u => u.id === att.user_id)?.nama,
            }));
            setAttendanceData(enrichedAttendance);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleOmzetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      const total = parseInt(omzetForm.cash) + parseInt(omzetForm.piutang);

      const { error } = await supabase
        .from('omzet')
        .upsert([{
          branch_id: selectedBranch,
          tanggal: omzetForm.tanggal,
          cash: parseInt(omzetForm.cash),
          piutang: parseInt(omzetForm.piutang),
          total,
        }], { onConflict: 'branch_id,tanggal' });

      if (error) throw error;

      setShowOmzetModal(false);
      setOmzetForm({
        tanggal: new Date().toISOString().split('T')[0],
        cash: '',
        piutang: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error saving omzet:', error);
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const attendanceRecords = Object.entries(attendanceForm).map(([userId, status]) => ({
        user_id: userId,
        tanggal: omzetForm.tanggal,
        status: parseFloat(status),
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, { onConflict: 'user_id,tanggal' });

      if (error) throw error;

      setShowAttendanceModal(false);
      setAttendanceForm({});
      fetchData();
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  };

  const getAttendanceForDate = (tanggal: string, userId: string) => {
    const record = attendanceData.find(
      att => att.tanggal === tanggal && att.user_id === userId
    );
    return record?.status || 0;
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'hrd';

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
          <h1 className="text-3xl font-bold text-gray-900">Data & Kehadiran</h1>
          <p className="text-gray-600 mt-2">Kelola omzet harian dan kehadiran CS</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <CalendarDays className="w-5 h-5" />
              Atur Kehadiran
            </button>
            <button
              onClick={() => setShowOmzetModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Tambah Omzet
            </button>
          </div>
        )}
      </div>

      {branches.length > 1 && (
        <div className="mb-6">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tanggal</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cash</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Piutang</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Total</th>
                {users.map(user => (
                  <th key={user.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    {user.nama}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {omzetData.map((omzet) => (
                <tr key={omzet.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(omzet.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(omzet.cash)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(omzet.piutang)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatCurrency(omzet.total)}
                  </td>
                  {users.map(user => {
                    const status = getAttendanceForDate(omzet.tanggal, user.id);
                    return (
                      <td key={user.id} className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          status === 1 ? 'bg-green-100 text-green-700' :
                          status === 0.5 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {status === 1 ? 'Hadir' : status === 0.5 ? 'Setengah' : 'Absen'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showOmzetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tambah Omzet</h2>
            <form onSubmit={handleOmzetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={omzetForm.tanggal}
                  onChange={(e) => setOmzetForm({ ...omzetForm, tanggal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cash</label>
                <input
                  type="number"
                  value={omzetForm.cash}
                  onChange={(e) => setOmzetForm({ ...omzetForm, cash: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Piutang</label>
                <input
                  type="number"
                  value={omzetForm.piutang}
                  onChange={(e) => setOmzetForm({ ...omzetForm, piutang: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOmzetModal(false)}
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

      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Atur Kehadiran</h2>
            <form onSubmit={handleAttendanceSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={omzetForm.tanggal}
                  onChange={(e) => setOmzetForm({ ...omzetForm, tanggal: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              {users.map(user => (
                <div key={user.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {user.nama}
                  </label>
                  <select
                    value={attendanceForm[user.id] || '1'}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, [user.id]: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="1">Hadir</option>
                    <option value="0.5">Setengah Hari</option>
                    <option value="0">Absen</option>
                  </select>
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
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
