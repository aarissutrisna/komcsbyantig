import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    { name: 'Penugasan', href: '/penugasan', icon: ClipboardList, roles: ['admin'] },
    { name: 'Pengaturan', href: '/settings', icon: Settings, roles: ['admin', 'hrd', 'cs'] },
    { name: 'Setting Admin', href: '/admin/settings', icon: ShieldAlert, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg xs:text-xl font-bold text-gray-900 dark:text-white truncate">
            Komisi CS PJB System
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 animate-spin-once" />
              ) : (
                <Moon className="w-5 h-5 animate-spin-once" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label={sidebarOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        aria-label="Navigasi utama"
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              Komisi CS PJB System
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{user?.username}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                {user?.role.toUpperCase()}
              </span>
              <button
                onClick={toggleTheme}
                className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 animate-spin-once" />
                ) : (
                  <Moon className="w-5 h-5 animate-spin-once" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Menu utama">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold border-l-[3px] border-blue-600 dark:border-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
              aria-label="Keluar dari akun"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="p-4 lg:p-8" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
