import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Building, Mail, Database } from 'lucide-react';

interface User {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: 'admin' | 'hrd' | 'cs';
  branch_id: string | null;
  faktor_pengali: string;
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // In a real app we might have /api/auth/users or similar
      // For now let's check if there's a route for this or if we should add it.
      // I'll assume we need to add this route to authRoutes or a dedicated users route.
      const data = await api.get<User[]>('/auth/users');
      setUsers(data);
    } catch (err) {
      setError('Gagal mengambil data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { bg: string, text: string }> = {
      admin: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300' },
      hrd: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
      cs: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
    };
    const style = roles[role] || roles.cs;
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${style.bg} ${style.text}`}>
        {role}
      </span>
    );
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
        title="Manajemen Pengguna"
        subtitle="Kelola akun Admin, HRD, dan Customer Service (CS)"
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Informasi</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Faktor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    Data user belum terintegrasi sepenuhnya.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors uppercase font-bold">
                          {u.nama.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-white">{u.nama}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Mail className="w-3 h-3" />
                          {u.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Building className="w-3 h-3" />
                          {u.branch_id ? `Branch ID: ${u.branch_id.slice(0, 8)}...` : 'Semua Cabang'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                        x{u.faktor_pengali}
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
