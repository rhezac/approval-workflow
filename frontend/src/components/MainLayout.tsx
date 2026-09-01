import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CheckSquare,
  GitFork,
  LogOut,
  UserCheck,
  Shield,
  Layers,
  Menu,
  X,
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/tasks', label: 'Task Management', icon: CheckSquare, show: true },
    { to: '/workflows', label: 'Approval Flows', icon: GitFork, show: user?.role === 'Admin' },
    { to: '/users', label: 'User Management', icon: Users, show: user?.role === 'Admin' },
    { to: '/delegations', label: 'Delegations', icon: UserCheck, show: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Layers className="w-6 h-6 text-blue-400" />
          <span>ApprovalFlow</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 text-slate-300 hover:text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-800">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg tracking-tight leading-none">ApprovalFlow</h2>
              <span className="text-xs text-slate-400 font-medium">Enterprise Engine</span>
            </div>
          </div>

          {/* Current User Card */}
          <div className="mx-4 my-4 p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{user?.fullName || user?.username}</p>
                {user?.fullName && <p className="text-[11px] text-slate-400 font-mono">@{user.username}</p>}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    {user?.role}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{user?.division}</span>
                </div>
              </div>
              <Shield className="w-5 h-5 text-slate-400 flex-shrink-0" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 mt-2">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <a
            href="http://localhost:3000/api/docs"
            target="_blank"
            rel="noreferrer"
            className="block text-center py-2 px-3 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            📖 API Swagger Docs
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-sm font-medium transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
