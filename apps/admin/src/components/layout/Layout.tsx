import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/orders', label: 'Đơn hàng', icon: '📦', end: false },
  { to: '/drivers', label: 'Tài xế', icon: '🚌', end: false },
  { to: '/users', label: 'Người dùng', icon: '👥', end: false },
  { to: '/routes', label: 'Tuyến đường', icon: '🗺️', end: false },
  { to: '/vouchers', label: 'Vouchers', icon: '🎁', end: false },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-[#1A3566] flex flex-col shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚌</span>
            <div>
              <h1 className="text-lg font-bold text-white">Delilog</h1>
              <p className="text-xs text-blue-300">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold text-sm">
              {user?.fullName?.charAt(0)}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user?.fullName}</p>
              <p className="text-blue-300 text-xs">Admin</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-2 text-red-300 hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
