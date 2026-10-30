import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('admin@invoiceguard.ai');
  const [password, setPassword] = useState<string>('Admin@123');
  const [role, setRole] = useState<string>('admin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (isRegistering) {
        await register(name, email, password, role);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string, demoRole: string) => {
    setIsRegistering(false);
    setEmail(demoEmail);
    setPassword(demoPass);
    setRole(demoRole);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 mx-auto">
            <ShieldCheck className="w-7 h-7 text-teal-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">InvoiceGuard AI</h1>
          <p className="text-xs text-slate-500">Intelligent Invoice Processing, Business Validation & Fraud Platform</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Demo Fast Fill Buttons */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider text-center">
            Quick 1-Click Demo Login
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@invoiceguard.ai', 'Admin@123', 'admin')}
              className="py-1.5 px-2 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('manager@invoiceguard.ai', 'Manager@123', 'manager')}
              className="py-1.5 px-2 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('employee@invoiceguard.ai', 'Employee@123', 'employee')}
              className="py-1.5 px-2 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-lg text-slate-700 transition"
            >
              Employee
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegistering && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Henderson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Assign Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium"
              >
                <option value="employee">Employee (Upload & Extract)</option>
                <option value="manager">Manager (Approve & Escalate)</option>
                <option value="admin">Admin (Full Control)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
          >
            <span>{loading ? 'Authenticating...' : (isRegistering ? 'Create Account' : 'Sign In to Dashboard')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          {isRegistering ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="font-bold text-teal-600 hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Need a new enterprise account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="font-bold text-teal-600 hover:underline"
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
