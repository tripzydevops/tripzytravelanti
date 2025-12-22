
import React, { useState, useEffect } from 'react';
import { getPromoCodes, createPromoCode, deletePromoCode, togglePromoCodeStatus, PromoCode } from '../../lib/supabaseService';
import { SpinnerIcon, TrashIcon, TagIcon } from '../Icons';

const AdminPromoCodesTab: React.FC = () => {
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCodeData, setNewCodeData] = useState({
        code: '',
        discountType: 'percentage' as 'percentage' | 'fixed_amount',
        discountValue: '',
        maxUses: '',
        expiresAt: ''
    });

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        setLoading(true);
        const data = await getPromoCodes();
        setCodes(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPromoCode({
                code: newCodeData.code.toUpperCase(),
                discountType: newCodeData.discountType,
                discountValue: parseFloat(newCodeData.discountValue),
                maxUses: newCodeData.maxUses ? parseInt(newCodeData.maxUses) : undefined,
                expiresAt: newCodeData.expiresAt ? new Date(newCodeData.expiresAt).toISOString() : undefined,
                isActive: true
            });
            setIsCreateModalOpen(false);
            setNewCodeData({ code: '', discountType: 'percentage', discountValue: '', maxUses: '', expiresAt: '' });
            fetchCodes();
        } catch (error) {
            alert('Failed to create promo code');
            console.error(error);
        }
    };

    const handleDelete = async (code: string) => {
        if (confirm('Are you sure you want to delete this promo code?')) {
            await deletePromoCode(code);
            fetchCodes();
        }
    };

    const handleToggleStatus = async (code: string, currentStatus: boolean) => {
        await togglePromoCodeStatus(code, !currentStatus);
        fetchCodes();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Promo Codes</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 flex items-center gap-2"
                >
                    <TagIcon className="w-5 h-5" /> Create Promo Code
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><SpinnerIcon className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : (
                <div className="bg-white dark:bg-brand-surface rounded-lg shadow overflow-hidden">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                        <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                            <tr>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Discount</th>
                                <th className="px-6 py-3">Uses</th>
                                <th className="px-6 py-3">Limit</th>
                                <th className="px-6 py-3">Expires</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map((code) => (
                                <tr key={code.code} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-white">{code.code}</td>
                                    <td className="px-6 py-4">
                                        {code.discountType === 'percentage' ? `${code.discountValue}%` : `₺${code.discountValue}`}
                                    </td>
                                    <td className="px-6 py-4">{code.currentUses}</td>
                                    <td className="px-6 py-4">{code.maxUses || '∞'}</td>
                                    <td className="px-6 py-4">
                                        {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleStatus(code.code, code.isActive)}
                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${code.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                        >
                                            {code.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleDelete(code.code)} className="text-red-600 hover:text-red-900">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {codes.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center">No promo codes found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">New Promo Code</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Code</label>
                                <input
                                    type="text"
                                    required
                                    value={newCodeData.code}
                                    onChange={e => setNewCodeData({ ...newCodeData, code: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="e.g. SUMMER20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                                    <select
                                        value={newCodeData.discountType}
                                        onChange={e => setNewCodeData({ ...newCodeData, discountType: e.target.value as any })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed_amount">Fixed Amount ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Value</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={newCodeData.discountValue}
                                        onChange={e => setNewCodeData({ ...newCodeData, discountValue: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Max Uses (Optional)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newCodeData.maxUses}
                                        onChange={e => setNewCodeData({ ...newCodeData, maxUses: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Expires At (Optional)</label>
                                    <input
                                        type="date"
                                        value={newCodeData.expiresAt}
                                        onChange={e => setNewCodeData({ ...newCodeData, expiresAt: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-brand-primary text-white px-4 py-2 rounded"
                                >
                                    Create Code
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromoCodesTab;
