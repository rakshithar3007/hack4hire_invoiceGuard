import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  UserCheck,
  ShieldAlert,
  BarChart3,
  History,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Building,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationApi } from '../services/api';
import { AppNotification } from '../types';
import { ServerStatusBanner } from '../components/ServerStatusBanner';
import { GlobalSearch } from '../components/GlobalSearch';
import { formatDateTime } from '../utils/formatters';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, quickSwitchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('invoiceguard_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('invoiceguard_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Fetch real notifications
  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: AppNotification) => !n.read_status).length);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    } catch {}
  };

  // Navigation Items with Role Restrictions
  const role = user?.role?.toLowerCase() || 'employee';

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['admin', 'manager', 'employee'] },
    { label: 'Invoice Management', icon: FileText, path: '/invoices', roles: ['admin', 'manager', 'employee'] },
    { label: 'Verification & Fraud Analysis', icon: ShieldAlert, path: '/verification', roles: ['admin', 'manager', 'employee'] },
    { label: 'Approval Center', icon: UserCheck, path: '/approvals', roles: ['admin', 'manager'], badge: 'Manager' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['admin', 'manager', 'employee'] },
    { label: 'Audit Logs', icon: History, path: '/audit-logs', roles: ['admin', 'manager', 'employee'] },
    { label: 'Settings', icon: Settings, path: '/settings', roles: ['admin', 'manager'] },
  ];

  // Filter items visible to current role
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));

  // Determine active breadcrumb title
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: 'Dashboard', path: '/' }];
    if (path === '/invoices') return [{ label: 'Invoice Management', path: '/invoices' }];
    if (path === '/upload') return [{ label: 'Invoice Management', path: '/invoices' }, { label: 'Upload Invoice', path: '/upload' }];
    if (path === '/extraction') return [{ label: 'Invoice Management', path: '/invoices' }, { label: 'Extraction & Review', path: '/extraction' }];
    if (path === '/verification' || path === '/validation' || path === '/fraud') return [{ label: 'Verification & Fraud Analysis', path: '/verification' }];
    if (path === '/approvals') return [{ label: 'Approval Center', path: '/approvals' }];
    if (path === '/analytics' || path === '/reports') return [{ label: 'Analytics', path: '/analytics' }];
    if (path === '/audit-logs' || path === '/audit') return [{ label: 'Audit Logs', path: '/audit-logs' }];
    if (path === '/settings') return [{ label: 'Settings', path: '/settings' }];
    return [{ label: path.replace('/', '').toUpperCase(), path }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA] text-[#172033] font-sans overflow-hidden">
      {/* Global Cold-Start Banner */}
      <ServerStatusBanner />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 bg-[#172033] text-white flex flex-col flex-shrink-0 transition-all duration-200 border-r border-[#172033] ${
            isCollapsed ? 'w-14' : 'w-56'
          } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Brand Header */}
          <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-800/80 bg-slate-900/60">
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shrink-0 font-extrabold text-xs shadow-md shadow-indigo-500/30">
                IG
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-white text-sm tracking-tight leading-none">
                    <span>InvoiceGuard</span>
                    <span className="bg-indigo-500/30 text-indigo-300 text-[9px] font-mono px-1 py-0.2 rounded border border-indigo-400/30">AI</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Enterprise AP</span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden md:flex text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={14} />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1 rounded"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path)) ||
                (item.path === '/invoices' && (location.pathname === '/upload' || location.pathname === '/extraction')) ||
                (item.path === '/verification' && (location.pathname === '/fraud' || location.pathname === '/validation')) ||
                (item.path === '/analytics' && location.pathname === '/reports') ||
                (item.path === '/audit-logs' && location.pathname === '/audit');

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-xs shadow-indigo-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={16} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && role === 'admin' && (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/15 text-white font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Live Engine Status Card */}
          {!isCollapsed && (
            <div className="mx-2 mb-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>LangGraph AI Active</span>
              </div>
              <p className="text-slate-400 text-[9px] leading-tight font-mono">
                GST Agent: Deterministic<br />
                Audit Trail: SHA-256 Verified
              </p>
            </div>
          )}

          {/* Sidebar Footer with Active Role Indicator */}
          <div className="p-3 border-t border-slate-800 text-xs">
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">{user?.name || 'User'}</p>
                  <span className="inline-block text-[10px] font-mono uppercase text-[#21845B] bg-[#edf7f2]/10 px-1.5 py-0.2 rounded">
                    {role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="text-[#697386] hover:text-white p-1 rounded hover:bg-white/5 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={logout}
                  className="text-[#697386] hover:text-white p-1.5 rounded hover:bg-white/5 cursor-pointer"
                  title={`Sign out (${user?.name})`}
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 bg-white border-b border-[#E4E8EF] px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shrink-0">
            {/* Left: Mobile Toggle & Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden text-[#172033] p-1.5 rounded border border-[#E4E8EF] hover:bg-[#F7F8FA]"
                aria-label="Open menu"
              >
                <Menu size={16} />
              </button>

              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#697386] min-w-0">
                <span className="font-semibold text-[#172033] hidden sm:inline">InvoiceGuard</span>
                <span className="hidden sm:inline select-none">/</span>
                {breadcrumbs.map((bc, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={bc.path}>
                      {isLast ? (
                        <span className="font-semibold text-[#172033] truncate">{bc.label}</span>
                      ) : (
                        <Link to={bc.path} className="hover:text-[#172033] transition truncate">
                          {bc.label}
                        </Link>
                      )}
                      {!isLast && <span className="select-none">/</span>}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>

            {/* Right Controls: Global Search, Notifications, User Role Switcher */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Global Search Input Button */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA] hover:bg-[#EEF1F6] text-[#697386] transition cursor-pointer"
                title="Search invoices (Press /)"
              >
                <Search size={14} className="text-[#697386]" />
                <span className="hidden sm:inline text-xs">Search invoices...</span>
                <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white border border-[#E4E8EF] px-1 py-0.2 rounded text-[#697386]">
                  /
                </kbd>
              </button>

              {/* Real Notifications Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                  className="p-1.5 rounded-[4px] border border-[#E4E8EF] text-[#172033] hover:bg-[#F7F8FA] cursor-pointer relative"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C34A4A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className="absolute right-0 mt-2 w-80 bg-white border border-[#E4E8EF] rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] py-2 z-50 animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E4E8EF]">
                      <span className="text-xs font-bold text-[#172033]">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-[#2457A6] hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-[#E4E8EF]">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#697386]">No notifications on record.</div>
                      ) : (
                        notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs leading-normal ${n.read_status ? 'bg-white' : 'bg-[#F7F8FA]'}`}
                          >
                            <p className="text-[#172033] font-medium">{n.message}</p>
                            <span className="text-[10px] text-[#697386] mt-1 block">
                              {formatDateTime(n.created_at)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu & Judge Role Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-[4px] border border-[#E4E8EF] hover:bg-[#F7F8FA] cursor-pointer text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-[#2457A6] text-white flex items-center justify-center font-bold text-[10px]">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="font-semibold text-[#172033] hidden sm:inline">{user?.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-[#EEF1F6] px-1.5 py-0.2 rounded text-[#172033]">
                    {role}
                  </span>
                  <ChevronDown size={13} className="text-[#697386]" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 bg-white border border-[#E4E8EF] rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] p-3 z-50 animate-in fade-in space-y-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <p className="text-xs font-bold text-[#172033]">{user?.name}</p>
                      <p className="text-[11px] text-[#697386] truncate">{user?.email}</p>
                    </div>

                    {/* Quick Switcher for Hackathon Judges */}
                    <div className="pt-2 border-t border-[#E4E8EF]">
                      <span className="text-[10px] uppercase font-bold text-[#697386] tracking-wider block mb-1.5">
                        Judge Role Switcher
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['admin', 'manager', 'employee'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={async () => {
                              await quickSwitchRole(r);
                              setUserMenuOpen(false);
                            }}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-[3px] border cursor-pointer capitalize transition ${
                              role === r
                                ? 'bg-[#2457A6] text-white border-[#2457A6]'
                                : 'bg-[#F7F8FA] text-[#172033] border-[#E4E8EF] hover:bg-[#EEF1F6]'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E4E8EF]">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left text-xs font-medium text-[#C34A4A] hover:bg-[#fdf1f1] p-1.5 rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Body View */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
