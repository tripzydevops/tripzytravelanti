import React from 'react';
import { XMarkIcon } from './Icons';
import { PaymentTransaction } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: PaymentTransaction | null;
    user: {
        name: string;
        email: string;
        address?: string;
        billingAddress?: string;
    } | null;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, transaction, user }) => {
    const { t } = useLanguage();

    if (!isOpen || !transaction || !user) return null;

    const handlePrint = () => {
        window.print();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0">
            <div className="bg-white dark:bg-brand-surface w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">

                {/* Header - No Print */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 print:hidden">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-brand-text-light">{t('invoice')}</h2>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm font-semibold"
                        >
                            {t('printInvoice') || 'Print Invoice'}
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8 print:p-0" id="invoice-content">
                    {/* Company Header */}
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h1 className="text-3xl font-bold text-brand-primary mb-2">Tripzy</h1>
                            <p className="text-gray-500 text-sm">Travel & Lifestyle</p>
                            <p className="text-gray-500 text-sm">Istanbul, Turkey</p>
                            <p className="text-gray-500 text-sm">support@tripzy.com</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text-light mb-1">{t('invoice').toUpperCase()}</h3>
                            <p className="text-gray-500 text-sm">#{transaction.transactionId || transaction.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-gray-500 text-sm">{formatDate(transaction.createdAt)}</p>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="mb-12">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t('billTo') || 'BILL TO'}</h4>
                        <p className="font-bold text-gray-900 dark:text-brand-text-light">{user.name}</p>
                        <p className="text-gray-600 dark:text-brand-text-muted">{user.email}</p>
                        {user.billingAddress && (
                            <p className="text-gray-600 dark:text-brand-text-muted mt-1 whitespace-pre-line">{user.billingAddress}</p>
                        )}
                        {!user.billingAddress && user.address && (
                            <p className="text-gray-600 dark:text-brand-text-muted mt-1 whitespace-pre-line">{user.address}</p>
                        )}
                    </div>

                    {/* Line Items */}
                    <table className="w-full mb-12">
                        <thead>
                            <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                                <th className="text-left py-3 text-sm font-bold text-gray-500 uppercase tracking-wider">{t('description')}</th>
                                <th className="text-right py-3 text-sm font-bold text-gray-500 uppercase tracking-wider">{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-50 dark:border-gray-800">
                                <td className="py-4 text-gray-900 dark:text-brand-text-light">
                                    <span className="font-semibold">{transaction.tier} Membership</span>
                                    <p className="text-sm text-gray-500">Monthly Subscription</p>
                                </td>
                                <td className="py-4 text-right font-semibold text-gray-900 dark:text-brand-text-light">
                                    {transaction.amount} {transaction.currency}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Total */}
                    <div className="flex justify-end">
                        <div className="w-64">
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-brand-text-muted">{t('subtotal')}</span>
                                <span className="font-semibold text-gray-900 dark:text-brand-text-light">{transaction.amount} {transaction.currency}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-brand-text-muted">{t('tax')} (0%)</span>
                                <span className="font-semibold text-gray-900 dark:text-brand-text-light">0.00 {transaction.currency}</span>
                            </div>
                            <div className="flex justify-between py-4">
                                <span className="text-lg font-bold text-gray-900 dark:text-brand-text-light">{t('total')}</span>
                                <span className="text-lg font-bold text-brand-primary">{transaction.amount} {transaction.currency}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 text-center text-gray-500 text-sm">
                        <p>{t('invoiceThankYou') || 'Thank you for your business!'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
