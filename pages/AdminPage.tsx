import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getPendingDeals } from '../lib/supabaseService';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import PaymentTransactionTable from '../components/PaymentTransactionTable';
import AdminDealsTab from '../components/admin/AdminDealsTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import AdminSubscriptionsTab from '../components/admin/AdminSubscriptionsTab';
import AdminPendingApprovalsTab from '../components/admin/AdminPendingApprovalsTab';
import AdminContentTab from '../components/admin/AdminContentTab';
import AdminFlightRoutesTab from '../components/admin/AdminFlightRoutesTab';
import { AdminAnnouncementsTab } from '../components/admin/AdminAnnouncementsTab';

const AdminPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'deals' | 'users' | 'content' | 'flight_routes' | 'payments' | 'pending_approvals' | 'analytics' | 'announcements'>('analytics');
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
        <button onClick={() => setActiveTab('analytics')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'analytics' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Analytics
        </button>
        <button onClick={() => setActiveTab('deals')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'deals' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageDeals')}
        </button>
        <button onClick={() => setActiveTab('users')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageUsers')}
        </button>
        <button onClick={() => setActiveTab('subscriptions')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'subscriptions' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Subscriptions
        </button>
        <button onClick={() => setActiveTab('content')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'content' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Manage Content
        </button>
        <button onClick={() => setActiveTab('flight_routes')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'flight_routes' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Flight Routes
        </button>
        <button onClick={() => setActiveTab('payments')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'payments' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('paymentTransactions') || 'Payment Transactions'}
        </button>
        <button onClick={() => setActiveTab('pending_approvals')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'pending_approvals' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Pending Approvals
          {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'announcements' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Announcements
        </button>
      </div>

      {activeTab === 'analytics' && <AnalyticsDashboard />}
      {activeTab === 'deals' && <AdminDealsTab />}
      {activeTab === 'users' && <AdminUsersTab />}
      {activeTab === 'subscriptions' && <AdminSubscriptionsTab />}
      {activeTab === 'content' && <AdminContentTab />}
      {activeTab === 'flight_routes' && <AdminFlightRoutesTab />}
      {activeTab === 'payments' && <PaymentTransactionTable />}
      {activeTab === 'pending_approvals' && <AdminPendingApprovalsTab />}
      {activeTab === 'announcements' && <AdminAnnouncementsTab />}
    </div>
  );
};

export default AdminPage;