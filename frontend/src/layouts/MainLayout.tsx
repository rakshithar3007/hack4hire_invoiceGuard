import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  UploadCloud,
  FileText,
  ScanText,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  BarChart3,
  History,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationApi } from '../services/api';
import { AppNotification } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, quickSwitchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: AppNotification) => !n.read_status).length);
    } catch (e) {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read_status: true })));
    } catch {}
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Upload Invoice', icon: UploadCloud, path: '/upload' },
    { label: 'All Invoices', icon: FileText, path: '/invoices' },
    { label: 'Extraction', icon: ScanText, path: '/extraction' },
    { label: 'Business Validation', icon: CheckCircle2, path: '/validation' },
    { label: 'Fraud Detection', icon: AlertTriangle, path: '/fraud' },
    { label: 'Approval Management', icon: UserCheck, path: '/approvals' },
    { label: 'Reports & Analytics', icon: BarChart3, path: '/reports' },
    { label: 'Audit Logs', icon: History, path: '/audit' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Dark Navy Sidebar matching reference video */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-30 shadow-xl border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/50">
          <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-white tracking-tight text-lg">
              <span>InvoiceGuard</span>
              <span className="bg-teal-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded">AI</span>
            </div>
            <p className="text-[10px] text-teal-400/80 font-medium">Enterprise Invoice Suite</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.label === 'Approval Management' && (
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${isActive ? 'bg-slate-900 text-white' : 'bg-teal-500/20 text-teal-300'}`}>
                    Active
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Quick Role Switcher (Admin / Manager / Employee) */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-medium">
            <span>Demo Role Switcher:</span>
            <span className="text-teal-400 uppercase font-semibold">{user?.role || 'User'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[11px]">
            <button
              onClick={() => quickSwitchRole('admin')}
              className={`py-1 rounded font-medium transition ${user?.role === 'admin' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Admin
            </button>
            <button
              onClick={() => quickSwitchRole('manager')}
              className={`py-1 rounded font-medium transition ${user?.role === 'manager' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Manager
            </button>
            <button
              onClick={() => quickSwitchRole('employee')}
              className={`py-1 rounded font-medium transition ${user?.role === 'employee' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Employee
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-teal-300 flex items-center justify-center font-bold text-xs uppercase border border-slate-600">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'user@invoiceguard.ai'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-xs z-20">
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              {navItems.find(n => n.path === location.pathname)?.label || 'InvoiceGuard AI'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Pipeline Active
            </span>
          </div>

          {/* Search bar & Right action tools */}
          <div className="flex items-center gap-4">
            {/* Global Search Bar */}
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search invoices, PO, vendors..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Notifications ({unreadCount} unread)</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-teal-600 hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-400">No new notifications</div>
                    ) : (
                      notifications.slice(0, 6).map((notif) => (
                        <div key={notif.id} className={`px-4 py-2.5 text-xs ${notif.read_status ? 'opacity-60 bg-white' : 'bg-teal-50/40'}`}>
                          <p className="font-medium text-slate-800 leading-snug">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Upload Invoice Action Button (Teal accent matching reference video) */}
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm shadow-teal-600/30 transition hover:shadow-md cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Invoice</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50/80 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
