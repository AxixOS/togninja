import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import NotificationBell from './NotificationBell';
import AgentChatWidget from './AgentChatWidget';
import {
  LayoutDashboard,
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
  Tags,
  TrendingUp,
  Zap
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
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
          setNewLeadsCount(payload.count || (payload.rows?.length ?? 0));
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
    { icon: UserPlus, label: t('nav.newLeads'), path: '/admin/leads', badge: newLeadsCount },
    { icon: ShoppingCart, label: t('nav.onlineVoucherSales'), path: '/admin/voucher-sales' },
    { icon: Users, label: t('nav.clients'), path: '/admin/clients' },
    { icon: Crown, label: t('nav.topClients'), path: '/admin/high-value-clients' },
    { icon: Tags, label: 'Lead Sources', path: '/admin/lead-sources' },
    { icon: Image, label: t('nav.galleriesAdmin'), path: '/admin/galleries' },
    { icon: FileText, label: t('nav.invoices'), path: '/admin/invoices' },
    { icon: Calculator, label: 'Accounting Export', path: '/admin/accounting' },
    { icon: TrendingUp, label: 'Price List Wizard', path: '/admin/price-wizard', badge: 'AI' },
    { icon: Calendar, label: t('nav.calendar'), path: '/admin/calendar' },
    { icon: CalendarCheck2, label: 'Schedulers', path: '/admin/schedulers' },
    { icon: FolderOpen, label: t('nav.digitalFiles'), path: '/admin/digital-files' },
    { icon: PenTool, label: t('nav.blogAdmin'), path: '/admin/blog' },
    { icon: Mail, label: t('nav.emailCampaigns'), path: '/admin/campaigns' },
    { icon: Zap, label: t('nav.automations'), path: '/admin/automations' },
    { icon: MessageSquare, label: t('nav.communications'), path: '/admin/communications' },
    { icon: Inbox, label: t('nav.inbox'), path: '/admin/inbox', badge: unreadEmailsCount },
    { icon: ClipboardList, label: t('nav.questionnaires'), path: '/admin/questionnaires' },
    { icon: BarChart3, label: t('nav.reports'), path: '/admin/reports' },
    { icon: Bot, label: 'Agent V2 (Enhanced)', path: '/admin/agent-v2', badge: 'NEW' },
    { icon: Activity, label: 'Agent Console', path: '/admin/agent-console' },
    { 
      icon: Palette, 
      label: t('nav.customization'), 
      path: '/admin/customization',
      subItems: [
        { icon: Palette, label: t('nav.studioTemplates'), path: '/admin/studio-templates' },
        { icon: Wand2, label: t('nav.websiteWizard'), path: '/admin/website-wizard' },
        { icon: Search, label: t('nav.websiteAnalyzer'), path: '/admin/website-analyzer' },
        { icon: FileText, label: 'Manual Website Update', path: '/admin/manual-website-update', badge: 'NEW' },
      ]
    },
    { 
      icon: Settings, 
      label: t('nav.settings'), 
      path: '/admin/settings',
      subItems: [
        { icon: BookOpen, label: t('nav.knowledgeBase'), path: '/admin/knowledge-base' },
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


  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Navigation */}
      <div 
        className={`bg-gray-900 text-white transition-all duration-300 flex flex-col max-h-screen z-50 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ 
          minWidth: sidebarCollapsed ? '64px' : '256px',
          maxWidth: sidebarCollapsed ? '64px' : '256px',
          width: sidebarCollapsed ? '64px' : '256px',
          display: 'flex',
          flexShrink: 0,
          backgroundColor: '#1F2937'
        }}
      >        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center">
            {!sidebarCollapsed ? (
              <div className="flex items-center">
                <img 
                  src="/crm-logo.png"
                  alt="TogNinja CRM"
                  className="h-16 w-auto mr-2"
                />
              </div>
            ) : (
              <img 
                src="/crm-logo.png"
                alt="TogNinja CRM"
                className="h-16 w-auto mx-auto"
              />
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto p-1 rounded hover:bg-gray-700"
            >
              <Menu size={20} />
            </button>
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
                          : 'text-gray-300 hover:text-white'
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
                          : 'text-gray-300 hover:text-white'
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
                    <div className="bg-gray-800">
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
                                : 'text-gray-400 hover:text-white'
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
            className="sidebar-nav-item flex items-center px-4 py-3 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ExternalLink size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="ml-3">{t('nav.viewWebsite')}</span>
            )}
          </a>
        </nav>

        {/* Sign Out */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleSignOut}
            className="sidebar-nav-item flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white rounded transition-colors"
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
              <button
                onClick={toggleLanguage}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <Globe size={16} className="mr-1" />
                <span className="uppercase">{language}</span>
              </button>

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
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                </button>

                {accountMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
                      </div>
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
          {children}
        </main>
      </div>

      {/* Floating Agent Chat Widget */}
      <AgentChatWidget />
    </div>
  );
};

export default AdminLayout;