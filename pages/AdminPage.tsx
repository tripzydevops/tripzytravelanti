import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getPendingDeals } from '../lib/supabaseService';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import PaymentTransactionTable from '../components/PaymentTransactionTable';
import AdminDealsTab from '../components/admin/AdminDealsTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminVendorStats from '../components/admin/AdminVendorStats';
import AdminSubscriptionsTab from '../components/admin/AdminSubscriptionsTab';
import AdminPendingApprovalsTab from '../components/admin/AdminPendingApprovalsTab';
import AdminCategoryTab from '../components/admin/AdminCategoryTab';
import AdminContentTab from '../components/admin/AdminContentTab';
import AdminFlightRoutesTab from '../components/admin/AdminFlightRoutesTab';
import AdminBackgroundsTab from '../components/admin/AdminBackgroundsTab';
import { AdminAnnouncementsTab } from '../components/admin/AdminAnnouncementsTab';
import AdminPromoCodesTab from '../components/admin/AdminPromoCodesTab';
import {
  BarChartIcon,
  TagIcon,
  UsersIcon,
  TicketIcon,
  DocumentTextIcon,
  GlobeIcon,
  CreditCardIcon,
  CheckCircle,
  MegaphoneIcon,
  MountainIcon,
  QrCodeIcon,
  BriefcaseIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  LogoutIcon
} from '../components/Icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu } from 'lucide-react';

const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analytics' | 'deals' | 'categories' | 'users' | 'vendor_stats' | 'content' | 'flight_routes' | 'payments' | 'pending_approvals' | 'announcements' | 'backgrounds' | 'promo_codes'>('analytics');
  const [pendingCount, setPendingCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop toggle

  useEffect(() => {
    const fetchPendingCount = async () => {
      const deals = await getPendingDeals();
      setPendingCount(deals.length);
    };
    fetchPendingCount();
  }, []);

  const menuGroups = [
    {
      title: 'Overview',
      items: [
        { id: 'analytics', label: t('adminAnalytics'), icon: <BarChartIcon className="w-5 h-5" /> },
        { id: 'vendor_stats', label: 'Vendor Reports', icon: <BriefcaseIcon className="w-5 h-5" /> },
      ]
    },
    {
      title: 'Management',
      items: [
        { id: 'deals', label: t('manageDeals'), icon: <TagIcon className="w-5 h-5" /> },
        { id: 'categories', label: 'Categories', icon: <MegaphoneIcon className="w-5 h-5" /> }, // Borrowing Megaphone for now or using Tag
        { id: 'users', label: t('manageUsers'), icon: <UsersIcon className="w-5 h-5" /> },
        { id: 'subscriptions', label: t('adminSubscriptions'), icon: <TicketIcon className="w-5 h-5" /> },
        {
          id: 'pending_approvals',
          label: t('adminPendingApprovals'),
          icon: <CheckCircle className="w-5 h-5" />,
          badge: pendingCount > 0 ? pendingCount : undefined
        },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'content', label: t('adminContent'), icon: <DocumentTextIcon className="w-5 h-5" /> },
        { id: 'flight_routes', label: t('adminFlightRoutes'), icon: <GlobeIcon className="w-5 h-5" /> },
        { id: 'backgrounds', label: 'Backgrounds', icon: <MountainIcon className="w-5 h-5" /> },
        { id: 'announcements', label: t('adminAnnouncements'), icon: <MegaphoneIcon className="w-5 h-5" /> },
        { id: 'promo_codes', label: 'Promo Codes', icon: <QrCodeIcon className="w-5 h-5" /> },
      ]
    },
    {
      title: 'Finance',
      items: [
        { id: 'payments', label: t('adminPaymentTransactions'), icon: <CreditCardIcon className="w-5 h-5" /> },
      ]
    }
  ];

  const handleTabClick = (tabId: any) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="flex bg-gray-50 dark:bg-brand-bg min-h-screen">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-30 h-screen bg-white dark:bg-brand-surface border-r border-gray-200 dark:border-white/5 transition-all duration-300 ease-in-out transform 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          flex flex-col`}
      >
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} transition-all duration-300`}>
          {!isCollapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-brand-text-light whitespace-nowrap overflow-hidden">{t('adminDashboard')}</h1>}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-8 bg-brand-primary text-white rounded-full p-1 shadow-md hover:bg-brand-primary/80 transition-colors z-40"
        >
          {isCollapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
        </button>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-hide">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              {!isCollapsed && (
                <h3 className="px-2 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2 animate-fade-in">
                  {group.title}
                </h3>
              )}
              {isCollapsed && idx > 0 && <div className="h-px bg-gray-200 dark:bg-white/5 my-2 mx-2"></div>}

              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.id} className="relative group/tooltip">
                    <button
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id
                        ? 'bg-brand-primary/10 text-brand-primary shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
                        <span className={`${activeTab === item.id ? 'text-brand-primary' : 'text-gray-400 dark:text-white/40 group-hover:text-gray-600'} flex-shrink-0`}>
                          {item.icon}
                        </span>
                        {!isCollapsed && <span>{item.label}</span>}
                      </div>

                      {/* Badge Logic */}
                      {!isCollapsed && item.badge ? (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : null}

                      {/* Collapsed Badge Dot */}
                      {isCollapsed && item.badge ? (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                      ) : null}
                    </button>

                    {/* Tooltip on Collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-white/5 space-y-2">
          <button
            onClick={() => navigate('/')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors`}
            title="Back to App"
          >
            <HomeIcon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Back to App</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors`}
            title="Logout"
          >
            <LogoutIcon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-brand-surface border-b border-gray-200 dark:border-white/5 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Tripzy Admin</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {activeTab === 'analytics' && <AnalyticsDashboard />}
            {activeTab === 'vendor_stats' && <AdminVendorStats />}
            {activeTab === 'deals' && <AdminDealsTab />}
            {activeTab === 'categories' && <AdminCategoryTab />}
            {activeTab === 'users' && <AdminUsersTab />}
            {activeTab === 'subscriptions' && <AdminSubscriptionsTab />}
            {activeTab === 'content' && <AdminContentTab />}
            {activeTab === 'flight_routes' && <AdminFlightRoutesTab />}
            {activeTab === 'payments' && <PaymentTransactionTable />}
            {activeTab === 'pending_approvals' && <AdminPendingApprovalsTab />}
            {activeTab === 'announcements' && <AdminAnnouncementsTab />}
            {activeTab === 'backgrounds' && <AdminBackgroundsTab />}
            {activeTab === 'promo_codes' && <AdminPromoCodesTab />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPage;