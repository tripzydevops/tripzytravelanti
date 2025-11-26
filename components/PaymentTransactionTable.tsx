import React, { useState, useEffect } from 'react';
import { getPaymentTransactionsWithUserInfo, PaymentTransactionFilters } from '../lib/paymentService';
import { PaymentTransaction } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const PaymentTransactionTable: React.FC = () => {
    const { t } = useLanguage();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<PaymentTransactionFilters>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadTransactions();
    }, [filters]);

    const loadTransactions = async () => {
        setLoading(true);
        const { data, error } = await getPaymentTransactionsWithUserInfo(filters);
        if (data && !error) {
            setTransactions(data);
        }
        setLoading(false);
    };

    const filteredTransactions = transactions.filter(t => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            t.userName?.toLowerCase().includes(search) ||
            t.userEmail?.toLowerCase().includes(search) ||
            t.transaction_id?.toLowerCase().includes(search)
        );
    });

    const getStatusBadge = (status: string) => {
        const styles = {
            success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formatCurrency = (amount: number, currency: string) => {
        const symbol = currency === 'TRY' ? '₺' : '$';
        return `${symbol}${amount.toFixed(2)}`;
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-brand-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                            {t('search') || 'Search'}
                        </label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('searchByUserOrTransaction') || 'Search by user or transaction ID...'}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                            {t('status') || 'Status'}
                        </label>
                        <select
                            value={filters.status || ''}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        >
                            <option value="">{t('allStatuses') || 'All Statuses'}</option>
                            <option value="success">{t('success') || 'Success'}</option>
                            <option value="failed">{t('failed') || 'Failed'}</option>
                            <option value="pending">{t('pending') || 'Pending'}</option>
                        </select>
                    </div>

                    {/* Payment Method Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                            {t('paymentMethod') || 'Payment Method'}
                        </label>
                        <select
                            value={filters.paymentMethod || ''}
                            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value as any || undefined })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        >
                            <option value="">{t('allMethods') || 'All Methods'}</option>
                            <option value="stripe">Stripe</option>
                            <option value="iyzico">Iyzico</option>
                        </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setFilters({});
                                setSearchTerm('');
                            }}
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                        >
                            {t('clearFilters') || 'Clear Filters'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-brand-surface rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
                        <p className="mt-2 text-gray-500 dark:text-brand-text-muted">{t('loading') || 'Loading...'}</p>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-brand-text-muted">
                        {t('noTransactionsFound') || 'No transactions found'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('date') || 'Date'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('user') || 'User'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('tier') || 'Tier'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('amount') || 'Amount'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('method') || 'Method'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('status') || 'Status'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">
                                        {t('transactionId') || 'Transaction ID'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatDate(transaction.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="text-gray-900 dark:text-white font-medium">{transaction.userName}</div>
                                            <div className="text-gray-500 dark:text-brand-text-muted text-xs">{transaction.userEmail}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                            <span className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded text-xs font-medium">
                                                {transaction.tier}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap font-medium">
                                            {formatCurrency(transaction.amount, transaction.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap capitalize">
                                            {transaction.payment_method}
                                        </td>
                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                            {getStatusBadge(transaction.status)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-brand-text-muted whitespace-nowrap font-mono text-xs">
                                            {transaction.transaction_id || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            {!loading && filteredTransactions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-brand-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-brand-text-muted">{t('totalTransactions') || 'Total Transactions'}</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredTransactions.length}</div>
                    </div>
                    <div className="bg-white dark:bg-brand-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-brand-text-muted">{t('successful') || 'Successful'}</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                            {filteredTransactions.filter(t => t.status === 'success').length}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-brand-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-brand-text-muted">{t('failed') || 'Failed'}</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                            {filteredTransactions.filter(t => t.status === 'failed').length}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-brand-surface p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-500 dark:text-brand-text-muted">{t('totalRevenue') || 'Total Revenue'}</div>
                        <div className="text-2xl font-bold text-brand-primary mt-1">
                            ${filteredTransactions
                                .filter(t => t.status === 'success')
                                .reduce((sum, t) => sum + (t.currency === 'USD' ? t.amount : t.amount / 30), 0)
                                .toFixed(2)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentTransactionTable;
