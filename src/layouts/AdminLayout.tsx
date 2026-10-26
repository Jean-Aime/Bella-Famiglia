import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Home, Users, Star, Settings,
  LogOut, Menu, X, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { classNames } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Reservations', to: '/admin/reservations', icon: CalendarDays },
  { label: 'Calendar', to: '/admin/calendar', icon: CalendarDays },
  { label: 'Houses', to: '/admin/houses', icon: Home },
  { label: 'Guests', to: '/admin/guests', icon: Users },
  { label: 'Reviews', to: '/admin/reviews', icon: Star },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-sand-50 flex">
      {/* Sidebar */}
      <aside
        className={classNames(
          'fixed lg:sticky top-0 left-0 h-screen z-50 w-64 max-w-[85vw] bg-charcoal-950 text-sand-100 flex flex-col transition-transform duration-500 ease-out-expo',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-sand-100/10">
          <Logo light />
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-sand-400">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/admin/dashboard' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={classNames(
                  'flex items-center gap-3 px-4 py-3 text-sm transition-all duration-300',
                  active
                    ? 'bg-sand-100/10 text-sand-50 border-l-2 border-sand-300'
                    : 'text-sand-400 hover:text-sand-100 hover:bg-sand-100/5'
                )}
              >
                <item.icon size={18} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sand-100/10 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 text-xs text-sand-400 hover:text-sand-100 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            View Website
          </Link>
          <div className="px-4 py-2 text-xs text-sand-500 truncate">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2.5 text-xs text-sand-400 hover:text-clay-300 transition-colors w-full"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-charcoal-950 text-sand-50 px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 -ml-1 shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="text-xs uppercase tracking-wider truncate">Admin</span>
          <button
            onClick={handleSignOut}
            className="text-[11px] uppercase tracking-wider text-sand-400 hover:text-sand-100 transition-colors shrink-0"
          >
            Sign Out
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-10 lg:p-12 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
