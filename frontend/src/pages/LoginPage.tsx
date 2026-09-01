import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { CheckCircle, Lock, User, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.accessToken, res.data.user);
      navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string) => {
    setUsername(u);
    setPassword('Admin@123');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-sm">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Approval Workflow</h1>
          <p className="text-blue-100 text-sm mt-1">Multi-Level Enterprise Approval System</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition duration-200 disabled:opacity-50 text-sm"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-2 text-center">Quick Demo Login (Password: Admin@123)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 font-medium transition"
              >
                👤 Admin (All)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('direktur')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 font-medium transition"
              >
                👔 Direktur
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager_it')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 font-medium transition"
              >
                💼 Manager (IT)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('staff_it')}
                className="py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 font-medium transition"
              >
                🧑‍💻 Staff (IT)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
