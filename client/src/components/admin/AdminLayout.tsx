import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from '../common/LanguageSelector';
import { useDateFormatSync } from '../../hooks/useDateFormatSync';
import NotificationBell from './NotificationBell';
import AgentChatWidget from './AgentChatWidget';
import LicenseBanner from './LicenseBanner';
import {
  LayoutDashboard,
  Plus,
  UserPlus,
  ShoppingCart,
  Users,
  Crown,
  Image,
  FileText,
  Calendar,
  CalendarCheck2,
  FolderOpen,
  PenTool,
  Mail,
  MessageSquare,
  Inbox,
  ClipboardList,
  ScrollText,
  BarChart3,
  Settings,
  Palette,
  Wand2,
  LogOut,
  Menu,
  X,
  Globe,
  User,
  ExternalLink,
  Bell,
  BookOpen,
  Bot,
  Search,
  ChevronDown,
  ChevronRight,
  Calculator,
  Activity,
  Package,
  Tags,
  TrendingUp,
  Zap,
  Camera,
  RefreshCw,
  Trash2,
  Printer
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // Admin profile photo. Uploaded to storage (B2); the URL persists in
  // localStorage so it shows on this browser. Falls back to the person icon.
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    try { return localStorage.getItem('adminAvatarUrl') || ''; } catch { return ''; }
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folderName', 'Profile Photos');
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || 'Upload failed');
      const url = payload.url || payload.thumbnailUrl;
      if (!url) throw new Error('No URL returned');
      setAvatarUrl(url);
      try { localStorage.setItem('adminAvatarUrl', url); } catch {}
    } catch (err: any) {
      alert(`Could not upload photo: ${err?.message || 'unknown error'}`);
    } finally {
      setAvatarUploading(false);
    }
  };
  const handleAvatarRemove = () => {
    setAvatarUrl('');
    try { localStorage.removeItem('adminAvatarUrl'); } catch {}
  };
  const { language, setLanguage, t } = useLanguage();
  useDateFormatSync(); // Sync date format preference from server → localStorage
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const [notificationEmail, setNotificationEmail] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Fetch new leads count and unread emails count
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch new leads count from unified leads API
  const leadsResponse = await fetch('/api/leads/list?status=new&limit=1');
        if (leadsResponse.ok) {
          const payload = await leadsResponse.json();
          // Same undefined payload.count as lib/leads.ts. The fallback is rows.length on
          // a request with limit=1, so the sidebar badge read "1" whether there was one
          // new lead or five hundred — and the dashboard banner built on it said
          // "1 unread leads waiting for your attention" for ever.
          setNewLeadsCount(payload.total ?? payload.count ?? (payload.rows?.length ?? 0));
        }

        // Fetch unread emails count
        const emailsResponse = await fetch('/api/inbox/emails?unread=true');
        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          setUnreadEmailsCount(emails.length);
        }

        // Fetch notification email settings (best-effort)
        const settingsResp = await fetch('/api/admin/email-settings');
        if (settingsResp.ok) {
          const s = await settingsResp.json();
          if (s && s.notificationEmail) setNotificationEmail(s.notificationEmail);
        }
      } catch (error) {
        // console.error removed
      }
    };

    fetchCounts();

    // Refresh counts every 5 minutes (reduced from 30s to prevent server overload)
    const interval = setInterval(fetchCounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const sidebarItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/admin/dashboard' },
    // Second, right under Dashboard. Creating things is the most common reason a
    // photographer opens this product, and the queued sidebar reorder puts the daily
    // workflow at the top — this is the first item of it.
    { icon: Plus, label: 'Create', path: '/admin/create' },
    { icon: UserPlus, label: t('nav.newLeads'), path: '/admin/leads', badge: newLeadsCount },
    { icon: ShoppingCart, label: t('nav.onlineVoucherSales'), path: '/admin/voucher-sales' },
    { icon: Users, label: t('nav.clients'), path: '/admin/clients' },
    { icon: Crown, label: t('nav.topClients'), path: '/admin/high-value-clients' },
    { icon: Tags, label: 'Lead Sources', path: '/admin/lead-sources' },
    { icon: Image, label: t('nav.galleriesAdmin'), path: '/admin/galleries' },
    // Directly under Galleries because that is where a client orders a print from, so the
    // two are read together — and because this list was previously reachable only from
    // the bottom of a settings page about API keys, which is not where anyone looks for
    // the things they sell. Printer is already this product's print glyph (the Prodigi
    // settings tile and page both use it) and nothing else in the sidebar claims it.
    { icon: Printer, label: 'Print Products', path: '/admin/print-products' },
    { icon: FileText, label: t('nav.invoices'), path: '/admin/invoices' },
    // Next to Invoices: both are the paperwork one booking generates, and a studio
    // reaches for them in the same moment. ScrollText rather than a fourth FileText,
    // which is already Invoices and Landing Pages and is unreadable at sidebar size
    // once three rows share it.
    { icon: ScrollText, label: t('nav.contracts'), path: '/admin/contracts' },
    { icon: Calculator, label: 'Accounting Export', path: '/admin/accounting' },
    { icon: TrendingUp, label: 'Price List Wizard', path: '/admin/price-wizard', badge: 'AI' },
    { icon: Calendar, label: t('nav.calendar'), path: '/admin/calendar' },
    { icon: CalendarCheck2, label: 'Schedulers', path: '/admin/schedulers' },
    // Beside Schedulers on purpose: this is the connection the scheduler checks before
    // it accepts a /book/* booking, so the two are read together. RefreshCw rather than a
    // third calendar glyph, which would be indistinguishable from the two rows above at
    // sidebar size (and lucide-react 0.323 has no CalendarSync export).
    { icon: RefreshCw, label: t('nav.calendarSync'), path: '/admin/calendar-sync' },
    { icon: FolderOpen, label: t('nav.digitalFiles'), path: '/admin/digital-files' },
    { icon: PenTool, label: t('nav.blogAdmin'), path: '/admin/blog' },
    { icon: Mail, label: t('nav.emailCampaigns'), path: '/admin/campaigns' },
    { icon: Zap, label: t('nav.automations'), path: '/admin/automations' },
    { icon: MessageSquare, label: t('nav.communications'), path: '/admin/communications' },
    { icon: Inbox, label: t('nav.inbox'), path: '/admin/inbox', badge: unreadEmailsCount },
    { icon: ClipboardList, label: t('nav.questionnaires'), path: '/admin/questionnaires' },
    { icon: BarChart3, label: t('nav.reports'), path: '/admin/reports' },
    { icon: FileText, label: 'Landing Pages', path: '/admin/landing-pages', badge: 'AI' },
    { icon: Bot, label: 'Agent V2 (Enhanced)', path: '/admin/agent-v2', badge: 'NEW' },
    // ONE settings menu (was two: "Customization" + "Settings"). The former
    // Customization sub-items and the Agent Console live here now; the
    // Settings hub page mirrors the same structure as tiles.
    {
      icon: Settings,
      label: t('nav.settings'),
      path: '/admin/settings',
      subItems: [
        { icon: Palette, label: t('nav.studioTemplates'), path: '/admin/studio-templates' },
        // Website Wizard + Website Analyzer + Manual Website Update consolidated here.
        { icon: Globe, label: 'Website Studio', path: '/admin/website-studio' },
        { icon: BookOpen, label: t('nav.knowledgeBase'), path: '/admin/knowledge-base' },
        { icon: Activity, label: 'Agent Console', path: '/admin/agent-console' },
        { icon: Package, label: 'Bundle Deliveries', path: '/admin/bundle-deliveries' },
      ]
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'de' : 'en');
  };

  const toggleExpandedItem = (path: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedItems(newExpanded);
  };

  // Auto-expand parent items if child is active
  useEffect(() => {
    sidebarItems.forEach(item => {
      if (item.subItems) {
        const hasActiveChild = item.subItems.some(subItem => 
          location.pathname === subItem.path || 
          (subItem.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'))
        );
        if (hasActiveChild) {
          setExpandedItems(prev => {
            const newSet = new Set(prev);
            newSet.add(item.path);
            return newSet;
          });
        }
      }
    });
  }, [location.pathname]);

  // Persist auth state on navigation
  useEffect(() => {
    if (user && user.role === 'admin') { // Assuming 'user' has a 'role' property
      localStorage.setItem('admin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('admin_user');
    }
  }, [location.pathname, user]);


  // Drag-to-resize sidebar width (persisted). Collapsed state still wins.
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try { return Number(localStorage.getItem('adminSidebarWidth')) || 256; } catch { return 256; }
  });
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizingSidebar(true);
    let last = sidebarWidth;
    const onMove = (ev: MouseEvent) => { last = Math.min(440, Math.max(200, ev.clientX)); setSidebarWidth(last); };
    const onUp = () => {
      setResizingSidebar(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      try { localStorage.setItem('adminSidebarWidth', String(last)); } catch { /* ignore */ }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const sidebarPx = sidebarCollapsed ? 64 : sidebarWidth;

  return (
    <div className="crm-admin-font h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Navigation */}
      <div
        className={`relative bg-white text-gray-900 border-r border-gray-200 flex flex-col max-h-screen z-50 ${resizingSidebar ? '' : 'transition-all duration-300'}`}
        style={{
          minWidth: sidebarPx,
          maxWidth: sidebarPx,
          width: sidebarPx,
          display: 'flex',
          flexShrink: 0,
          backgroundColor: '#ffffff'
        }}
      >
        {/* Drag-to-resize handle (right edge; hidden when collapsed) */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={startSidebarResize}
            title="Drag to resize"
            className="absolute top-0 right-0 z-20 h-full w-1.5 cursor-col-resize hover:bg-purple-200"
          />
        )}
        {/* Logo */}
        <div className="px-4 pt-3 pb-4 border-b border-gray-200">
          {/* Collapse toggle sits above so the logo can centre cleanly */}
          <div className="flex justify-end">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="flex justify-center">
            <img
              src="/togninja-logo.png"
              alt="TogNinja"
              className={sidebarCollapsed ? 'h-10 w-auto' : 'h-24 w-auto'}
            />
          </div>
        </div>

        {/* New Leads Notification Section */}
        {newLeadsCount > 0 && (
          <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm">
              <Bell size={16} className="text-blue-600 mr-2 flex-shrink-0" />
              {!sidebarCollapsed && (
                <div>
                  <p className="text-blue-900 font-medium">
                    {newLeadsCount} unread leads waiting for your attention
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    📧 Email notifications sent to: <span className="font-medium">{notificationEmail || 'Not configured'}</span>
                    {!notificationEmail && (
                      <>
                        {' '}
                        <button
                          onClick={() => navigate('/admin/settings/email')}
                          className="text-blue-600 underline hover:text-blue-800 ml-1"
                        >
                          configure now
                        </button>
                      </>
                    )}
                  </p>
                  <button
                    onClick={() => navigate('/admin/leads')}
                    className="text-blue-600 hover:text-blue-800 text-xs underline mt-1"
                  >
                    View all leads →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Emails Notification Section */}
        {unreadEmailsCount > 0 && (
          <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-sm">
              <Mail size={16} className="text-green-600 mr-2 flex-shrink-0" />
              {!sidebarCollapsed && (
                <div>
                  <p className="text-green-900 font-medium">
                    {unreadEmailsCount} new emails received
                  </p>
                  <button
                    onClick={() => navigate('/admin/inbox')}
                    className="text-green-600 hover:text-green-800 text-xs underline mt-1"
                  >
                    View inbox →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation - Fixed scrolling */}
        <nav className="flex-1 py-4 overflow-y-auto max-h-full sidebar-scrollbar">
          <div className="space-y-1 pb-4">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                              (item.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'));
              const isExpanded = expandedItems.has(item.path);
              const hasActiveChild = item.subItems?.some(subItem => 
                location.pathname === subItem.path || 
                (subItem.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'))
              );

              return (
                <div key={item.path}>
                  {/* Main item */}
                  {item.subItems ? (
                    <button
                      onClick={() => toggleExpandedItem(item.path)}
                      className={`sidebar-nav-item flex items-center w-full px-4 py-3 text-sm transition-colors relative ${
                        isActive || hasActiveChild
                          ? 'active bg-purple-600 text-white border-r-2 border-purple-400'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="ml-3 flex-1 text-left">{item.label}</span>
                          {isExpanded ? (
                            <ChevronDown size={16} className="flex-shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="flex-shrink-0" />
                          )}
                        </>
                      )}
                      {(item.badge ?? 0) > 0 && (
                        <div className={`absolute ${sidebarCollapsed ? 'top-2 right-2' : 'top-3 right-4'} flex items-center justify-center`}>
                          {!sidebarCollapsed && <Bell size={14} className="mr-1 text-red-400" />}
                          <span className={`bg-red-500 text-white text-xs font-bold rounded-full ${
                            sidebarCollapsed ? 'h-4 w-4 text-xs' : 'h-5 w-5 text-xs'
                          } flex items-center justify-center`}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.path}
                      className={`sidebar-nav-item flex items-center px-4 py-3 text-sm transition-colors relative ${
                        isActive
                          ? 'active bg-purple-600 text-white border-r-2 border-purple-400'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="ml-3">{item.label}</span>
                      )}
                      {(item.badge ?? 0) > 0 && (
                        <div className={`absolute ${sidebarCollapsed ? 'top-2 right-2' : 'top-3 right-4'} flex items-center justify-center`}>
                          {!sidebarCollapsed && <Bell size={14} className="mr-1 text-red-400" />}
                          <span className={`bg-red-500 text-white text-xs font-bold rounded-full ${
                            sidebarCollapsed ? 'h-4 w-4 text-xs' : 'h-5 w-5 text-xs'
                          } flex items-center justify-center`}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        </div>
                      )}
                    </Link>
                  )}

                  {/* Sub items */}
                  {item.subItems && isExpanded && !sidebarCollapsed && (
                    <div className="bg-gray-50">
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = location.pathname === subItem.path || 
                                          (subItem.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'));

                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`sidebar-nav-item flex items-center px-8 py-2 text-sm transition-colors relative ${
                              isSubActive
                                ? 'active bg-purple-700 text-white border-r-2 border-purple-400'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <SubIcon size={16} className="flex-shrink-0" />
                            <span className="ml-3">{subItem.label}</span>
                            {subItem.badge && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full">
                                {subItem.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Frontend Link */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-nav-item flex items-center px-4 py-3 text-sm text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ExternalLink size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="ml-3">{t('nav.viewWebsite')}</span>
            )}
          </a>
        </nav>

        {/* Sign Out */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleSignOut}
            className="sidebar-nav-item flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:text-gray-900 rounded transition-colors"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">{t('nav.signOut')}</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile/Toggle Menu Button */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu size={24} className="text-gray-600" />
              </button>
              
              <h1 className="text-2xl font-semibold text-gray-900">
                {(() => {
                  // First check main items
                  const mainItem = sidebarItems.find(item => 
                    item.path === location.pathname || 
                    (item.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'))
                  );
                  if (mainItem) return mainItem.label;

                  // Then check sub items
                  for (const item of sidebarItems) {
                    if (item.subItems) {
                      const subItem = item.subItems.find(subItem => 
                        subItem.path === location.pathname || 
                        (subItem.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'))
                      );
                      if (subItem) return subItem.label;
                    }
                  }

                  return 'Admin';
                })()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <NotificationBell />

              {/* Language Switcher */}
              <LanguageSelector className="px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100" />

              {/* View Website Button */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <ExternalLink size={16} className="mr-1" />
                <span>{t('nav.viewWebsite')}</span>
              </a>

              {/* User Avatar / Account Menu */}
              <div className="relative">
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center rounded-lg hover:bg-gray-100 px-2 py-1 transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={() => handleAvatarRemove()}
                      />
                    ) : (
                      <User size={16} className="text-white" />
                    )}
                  </div>
                </button>

                {/* Hidden file input for the profile photo */}
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />

                {accountMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <User size={18} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
                        </div>
                      </div>
                      <button
                        onClick={() => avatarFileRef.current?.click()}
                        disabled={avatarUploading}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <Camera size={16} className="mr-2 text-gray-400" />
                        {avatarUploading ? 'Uploading…' : (avatarUrl ? 'Change profile photo' : 'Upload profile photo')}
                      </button>
                      {avatarUrl && (
                        <button
                          onClick={handleAvatarRemove}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Trash2 size={16} className="mr-2 text-gray-400" />
                          Remove photo
                        </button>
                      )}
                      <button
                        onClick={() => { setAccountMenuOpen(false); navigate('/admin/settings'); }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings size={16} className="mr-2 text-gray-400" />
                        Settings
                      </button>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() => { setAccountMenuOpen(false); handleSignOut(); }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} className="mr-2" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <LicenseBanner />
          {children}
        </main>
      </div>

      {/* Floating Agent Chat Widget */}
      <AgentChatWidget />
    </div>
  );
};

export default AdminLayout;