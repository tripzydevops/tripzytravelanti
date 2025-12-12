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
  XMarkIcon
} from '../components/Icons';
import { Menu } from 'lucide-react';

const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'analytics' | 'deals' | 'users' | 'vendor_stats' | 'content' | 'flight_routes' | 'payments' | 'pending_approvals' | 'announcements' | 'backgrounds' | 'promo_codes'>('analytics');
  const [pendingCount, setPendingCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    setIsSidebarOpen(false); // Close sidebar on mobile on selection
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
        className={`fixed md:sticky top-0 left-0 z-30 w-64 h-screen bg-white dark:bg-brand-surface border-r border-gray-200 dark:border-white/5 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } overflow-y-auto`}
      >
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-brand-text-light">{t('adminDashboard')}</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-4 pb-6 space-y-6">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-2 text-xs font-semibold text-gray-400 dark:text-white/40 uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === item.id
                        ? 'bg-brand-primary/10 text-brand-primary shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={activeTab === item.id ? 'text-brand-primary' : 'text-gray-400 dark:text-white/40 group-hover:text-gray-600'}>
                          {item.icon}
                        </span>
                        {item.label}
                      </div>
                      {item.badge ? (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
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