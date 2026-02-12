import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'hrd', 'cs'] },
    { name: 'Data & Kehadiran', href: '/data', icon: CalendarCheck, roles: ['admin', 'hrd', 'cs'] },
    { name: 'Mutasi Komisi', href: '/mutations', icon: DollarSign, roles: ['admin', 'hrd', 'cs'] },
    { name: 'Cabang', href: '/branches', icon: Building2, roles: ['admin'] },
    { name: 'Pengguna', href: '/users', icon: Users, roles: ['admin'] },
    { name: 'Pengaturan', href: '/settings', icon: Settings, roles: ['admin', 'hrd', 'cs'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    profile && item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">KomCS PJB</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">KomCS PJB</h1>
            <p className="text-sm text-gray-600 mt-1">{profile?.nama}</p>
            <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full mt-2">
              {profile?.role.toUpperCase()}
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
