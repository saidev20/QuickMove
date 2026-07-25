import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Columns3, CalendarClock, Truck,
  BarChart3, Search, Bell, Sun, Moon, MessageSquare, Menu,
  X, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// Pages
import Dashboard from '@/pages/Dashboard';
import CustomerList from '@/pages/CustomerList';
import CustomerDetail from '@/pages/CustomerDetail';
import CustomerForm from '@/pages/CustomerForm';
import KanbanBoard from '@/pages/KanbanBoard';
import TimelineView from '@/pages/TimelineView';
import VendorsPage from '@/pages/VendorsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';

// Panels
import SearchModal from '@/components/SearchModal';
import AIChatPanel from '@/components/AIChatPanel';
import NotificationsPanel from '@/components/NotificationsPanel';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/kanban', icon: Columns3, label: 'Kanban Board' },
  { to: '/timeline', icon: CalendarClock, label: 'Timeline' },
  { to: '/vendors', icon: Truck, label: 'Vendors' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full flex flex-col transition-all duration-300 ease-out',
          'border-r border-subtle',
          sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-0 lg:w-16',
          'lg:relative',
        )}
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className={cn('flex-1 overflow-hidden', !sidebarOpen && 'lg:block hidden lg:!block')}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-subtle">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: 'var(--accent)' }}>
              Q
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="text-base font-semibold text-primary">QuickMove</h1>
                <p className="text-xs text-tertiary">Operations Hub</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn('sidebar-link', isActive && 'active', !sidebarOpen && 'lg:justify-center lg:px-2')
                }
                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
              >
                <Icon size={18} />
                {sidebarOpen && <span className="animate-fade-in">{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* AI Assistant shortcut */}
          <div className="px-3 mt-4">
            <button
              onClick={() => useAppStore.getState().setChatOpen(true)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-all duration-150',
                !sidebarOpen && 'lg:justify-center lg:px-2',
              )}
              style={{
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)',
              }}
            >
              <MessageSquare size={18} />
              {sidebarOpen && <span>AI Assistant</span>}
            </button>
          </div>
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex items-center justify-center p-3 border-t border-subtle"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ChevronRight
            size={16}
            className={cn('transition-transform duration-300', sidebarOpen && 'rotate-180')}
          />
        </button>
      </aside>
    </>
  );
}

import AdminApprovalsModal, { AdminApprovalsBadge } from '@/components/AdminApprovalsModal';
import StateHistoryDrawer from '@/components/StateHistoryDrawer';
import AIAgentPanel from '@/components/AIAgentPanel';
import { ShieldCheck, History, Zap, Bot } from 'lucide-react';

function Header({
  onOpenApprovals,
  onOpenHistory,
  onOpenAgent,
}: {
  onOpenApprovals: () => void;
  onOpenHistory: () => void;
  onOpenAgent: () => void;
}) {
  const { theme, toggleTheme, setSearchOpen, setNotificationsOpen } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    refetchInterval: 30000,
  });
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/customers/new') return 'New Customer';
    if (path.startsWith('/customers/')) return 'Customer Details';
    if (path === '/customers') return 'Customers';
    if (path === '/kanban') return 'Kanban Board';
    if (path === '/timeline') return 'Timeline';
    if (path === '/vendors') return 'Vendors';
    if (path === '/analytics') return 'Analytics';
    return 'QuickMove';
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-subtle"
      style={{ backgroundColor: 'var(--bg-surface)', backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => useAppStore.getState().setSidebarOpen(true)}
          className="lg:hidden btn-ghost btn-icon rounded-lg"
        >
          <Menu size={18} />
        </button>
        <h2 className="text-lg font-semibold text-primary">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Autonomous AI Agent trigger button */}
        <button
          onClick={onOpenAgent}
          className="btn btn-sm gap-1.5 font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-sm rounded-lg"
          title="Open Autonomous Operational AI Agent"
        >
          <Bot size={15} />
          <span>AI Agent</span>
        </button>

        {/* Approvals HITL button */}
        <button onClick={onOpenApprovals} className="btn btn-secondary btn-sm gap-1.5 hidden sm:flex">
          <ShieldCheck size={14} className="text-warning" />
          <span>Approvals</span>
          <AdminApprovalsBadge />
        </button>

        {/* State Versioning / Undo Button */}
        <button onClick={onOpenHistory} className="btn btn-ghost btn-icon rounded-lg" title="State History & Undo">
          <History size={18} />
        </button>

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="btn btn-secondary btn-sm gap-2 hidden md:flex"
        >
          <Search size={14} />
          <span className="text-tertiary">Search...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-subtle text-tertiary ml-2">
            Ctrl+K
          </kbd>
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="btn-ghost btn-icon rounded-lg md:hidden"
        >
          <Search size={18} />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotificationsOpen(true)}
          className="btn-ghost btn-icon rounded-lg relative"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--error)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="btn-ghost btn-icon rounded-lg">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ml-1"
          style={{ backgroundColor: 'var(--accent)' }}>
          OP
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiAgentOpen, setAiAgentOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenApprovals={() => setApprovalsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenAgent={() => setAiAgentOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-[1400px] mx-auto animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/new" element={<CustomerForm />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/kanban" element={<KanbanBoard />} />
              <Route path="/timeline" element={<TimelineView />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Overlay panels */}
      <SearchModal />
      <AIChatPanel />
      <AIAgentPanel isOpen={aiAgentOpen} onClose={() => setAiAgentOpen(false)} />
      <NotificationsPanel />
      <AdminApprovalsModal isOpen={approvalsOpen} onClose={() => setApprovalsOpen(false)} />
      <StateHistoryDrawer isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

