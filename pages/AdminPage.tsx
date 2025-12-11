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

const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'analytics' | 'deals' | 'users' | 'vendor_stats' | 'content' | 'flight_routes' | 'payments' | 'pending_approvals' | 'announcements' | 'backgrounds' | 'promo_codes'>('analytics');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      const deals = await getPendingDeals();
      setPendingCount(deals.length);
    };
    fetchPendingCount();
  }, []);

  return (
    <div className="container mx-auto px-4 pt-6 pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-brand-text-light">{t('adminDashboard')}</h1>
      </header>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('analytics')} className={`py-2 px-4 whitespace-nowrap border-b-2 font-medium transition-colors ${activeTab === 'analytics' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>{t('adminAnalytics')}</button>
        <button onClick={() => setActiveTab('vendor_stats')} className={`py-2 px-4 whitespace-nowrap border-b-2 font-medium transition-colors ${activeTab === 'vendor_stats' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>Vendor Reports</button>
        <button onClick={() => setActiveTab('deals')} className={`py-2 px-4 whitespace-nowrap border-b-2 font-medium transition-colors ${activeTab === 'deals' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>{t('manageDeals')}</button>
        <button onClick={() => setActiveTab('users')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageUsers')}
        </button>
        <button onClick={() => setActiveTab('subscriptions')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'subscriptions' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('adminSubscriptions')}
        </button>
        <button onClick={() => setActiveTab('content')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'content' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('adminContent')}
        </button>
        <button onClick={() => setActiveTab('flight_routes')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'flight_routes' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('adminFlightRoutes')}
        </button>
        <button onClick={() => setActiveTab('payments')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'payments' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('adminPaymentTransactions')}
        </button>
        <button onClick={() => setActiveTab('pending_approvals')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'pending_approvals' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('adminPendingApprovals')}
          {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'announcements' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('adminAnnouncements')}
        </button>
        <button onClick={() => setActiveTab('backgrounds')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'backgrounds' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Backgrounds
        </button>
        <button onClick={() => setActiveTab('promo_codes')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'promo_codes' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Promo Codes
        </button>
      </div>

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
  );
};

export default AdminPage;