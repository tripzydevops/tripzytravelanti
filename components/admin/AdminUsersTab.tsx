import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDeals } from '../../contexts/DealContext';
import { User, SubscriptionTier, Deal, PaymentTransaction } from '../../types';
import Modal from '../Modal';
import { calculateRemainingRedemptions, getNextRenewalDate } from '../../lib/redemptionLogic';
import { getPendingDeals, getUserTransactions, confirmUserEmail } from '../../lib/supabaseService';

const EMPTY_USER: User = {
    id: '',
    name: '',
    email: '',
    tier: SubscriptionTier.FREE,
    savedDeals: [],
    referrals: [],
    referralChain: [],
    referralNetwork: [],
    extraRedemptions: 0,
    status: 'active',
};

const AdminUsersTab: React.FC = () => {
    const { t, language } = useLanguage();
    const { user: loggedInUser } = useAuth();
    const { users, refreshUsers, updateUser, deleteUser, addExtraRedemptions, updateAllUsersNotificationPreferences } = useAdmin();
    const { deals } = useDeals(); // Use deals from context for lookups

    const [isUserFormVisible, setIsUserFormVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFormData, setUserFormData] = useState<User>(EMPTY_USER);
    const [dealToAdd, setDealToAdd] = useState<string>('');
    const [redemptionsToAdd, setRedemptionsToAdd] = useState(0);
    const [viewingRedemptionsForUser, setViewingRedemptionsForUser] = useState<User | null>(null);
    const [viewingPaymentsForUser, setViewingPaymentsForUser] = useState<User | null>(null);
    const [userPayments, setUserPayments] = useState<PaymentTransaction[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [showSuccess, setShowSuccess] = useState('');
    const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'All'>('All');

    // Fetch users when admin tab mounts
    useEffect(() => {
        refreshUsers();
        loadPendingDeals();
    }, []);

    const loadPendingDeals = async () => {
        const fetchedDeals = await getPendingDeals();
        setPendingDeals(fetchedDeals);
    };

    const handleVerifyUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to manually verify this user\'s email?')) {
            try {
                await confirmUserEmail(userId);
                setShowSuccess('User email verified successfully');
                setTimeout(() => setShowSuccess(''), 3000);
                refreshUsers();
            } catch (error) {
                console.error('Failed to verify user', error);
                alert('Failed to verify user. Check console for details.');
            }
        }
    };

    const sortedUsers = useMemo(() => {
        let filtered = [...users];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                (u.mobile && u.mobile.includes(query))
            );
        }

        if (tierFilter !== 'All') {
            filtered = filtered.filter(u => u.tier === tierFilter);
        }

        // Sort by Created At DESC (newest first) by default, then Name
        return filtered.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return a.name.localeCompare(b.name);
        });
    }, [users, searchQuery, tierFilter]);

    const userIdToNameMap = useMemo(() =>
        users.reduce((acc, user) => {
            acc[user.id] = user.name;
            return acc;
        }, {} as Record<string, string>),
        [users]);

    const handleEditUserClick = (user: User) => {
        setEditingUser(user);
        setUserFormData({
            ...user,
            savedDeals: user.savedDeals || [],
            referrals: user.referrals || [],
            referralChain: user.referralChain || [],
            referralNetwork: user.referralNetwork || [],
            extraRedemptions: user.extraRedemptions || 0,
            address: user.address || '',
            billingAddress: user.billingAddress || '',
            referredBy: user.referredBy || '',
        });
        setDealToAdd('');
        setRedemptionsToAdd(0);
        setIsUserFormVisible(true);
    };

    const handleDeleteUserClick = (userId: string) => {
        if (window.confirm(t('deleteUserConfirmation'))) deleteUser(userId);
    };

    const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setUserFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const resetUserForm = () => {
        setIsUserFormVisible(false);
        setEditingUser(null);
        setUserFormData(EMPTY_USER);
        setDealToAdd('');
    };

    const handleUserFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) updateUser(userFormData);
        resetUserForm();
    };

    const handleAddDealToUser = () => {
        if (dealToAdd && !userFormData.savedDeals?.includes(dealToAdd)) {
            setUserFormData(prev => ({
                ...prev,
                savedDeals: [...(prev.savedDeals || []), dealToAdd]
            }));
            setDealToAdd('');
        }
    };

    const handleRemoveDealFromUser = (dealIdToRemove: string) => {
        setUserFormData(prev => ({
            ...prev,
            savedDeals: (prev.savedDeals || []).filter(id => id !== dealIdToRemove)
        }));
    };

    const handleAddRedemptions = () => {
        if (redemptionsToAdd > 0 && editingUser) {
            addExtraRedemptions(editingUser.id, redemptionsToAdd);
            setUserFormData(prev => ({
                ...prev,
                extraRedemptions: (prev.extraRedemptions || 0) + redemptionsToAdd
            }));
            setShowSuccess(t('redemptionsAddedSuccess'));
            setTimeout(() => setShowSuccess(''), 2000);
            setRedemptionsToAdd(0);
        }
    };

    const handleViewPaymentsClick = async (user: User) => {
        setViewingPaymentsForUser(user);
        const transactions = await getUserTransactions(user.id);
        setUserPayments(transactions);
    };

    const handleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(new Set(sortedUsers.map(u => u.id)));
        } else {
            setSelectedUsers(new Set());
        }
    };

    const handleBulkAction = async (action: 'ban' | 'activate' | 'email') => {
        if (selectedUsers.size === 0) return;
        if (!window.confirm(`Are you sure you want to ${action} ${selectedUsers.size} users?`)) return;

        if (action === 'email') {
            const emails = users.filter(u => selectedUsers.has(u.id)).map(u => u.email).join(',');
            window.location.href = `mailto:?bcc=${emails}`;
            return;
        }

        const status = action === 'ban' ? 'banned' : 'active';
        for (const userId of selectedUsers) {
            const user = users.find(u => u.id === userId);
            if (user) {
                await updateUser({ ...user, status });
            }
        }
        setShowSuccess(`Users ${action === 'ban' ? 'banned' : 'activated'} successfully`);
        setTimeout(() => setShowSuccess(''), 3000);
        setSelectedUsers(new Set());
    };

    const userSavedDeals = useMemo(() => {
        if (!userFormData.savedDeals) return [];
        return userFormData.savedDeals
            .map(dealId => deals.find(d => d.id === dealId)) // Use deals from context
            .filter((d): d is Deal => !!d);
    }, [userFormData.savedDeals, deals]);

    return (
        <>
            {isUserFormVisible && (
                <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">{t('editUser')}</h2>
                    <form onSubmit={handleUserFormSubmit} className="space-y-4 max-w-2xl">
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div><label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('fullNameLabel')}</label><input type="text" id="name" name="name" value={userFormData.name} onChange={handleUserFormChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('emailLabel')}</label><input type="email" id="email" name="email" value={userFormData.email} onChange={handleUserFormChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label htmlFor="tier" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('tier')}</label><select id="tier" name="tier" value={userFormData.tier} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">{Object.values(SubscriptionTier).filter(t => t !== SubscriptionTier.NONE).map(tier => <option key={tier} value={tier}>{tier}</option>)}</select></div>
                            <div><label htmlFor="mobile" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('mobileLabel') || 'Mobile'}</label><input type="tel" id="mobile" name="mobile" value={userFormData.mobile || ''} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div className="md:col-span-2"><label htmlFor="address" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('addressLabel')}</label><input type="text" id="address" name="address" value={userFormData.address || ''} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div className="md:col-span-2"><label htmlFor="billingAddress" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('billingAddressLabel')}</label><input type="text" id="billingAddress" name="billingAddress" value={userFormData.billingAddress || ''} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold mb-3">{t('addExtraRedemptions')}</h3>
                            <div className="p-3 bg-gray-100 dark:bg-brand-bg rounded-md">
                                <p className="text-sm text-gray-600 dark:text-brand-text-muted mb-2">{t('currentBonusRedemptions')}: <span className="font-bold text-lg text-gray-900 dark:text-white">{userFormData.extraRedemptions || 0}</span></p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={redemptionsToAdd}
                                        onChange={e => setRedemptionsToAdd(Math.max(0, parseInt(e.target.value, 10)))}
                                        placeholder={t('redemptionsToAdd')}
                                        className="flex-grow bg-white dark:bg-brand-surface rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddRedemptions}
                                        disabled={!redemptionsToAdd || redemptionsToAdd <= 0}
                                        className="bg-brand-secondary text-brand-bg font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                                        {t('addRedemptions')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold mb-3">Notification Preferences</h3>
                            <div className="space-y-3 p-3 bg-gray-100 dark:bg-brand-bg rounded-md">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="generalNotifications" className="text-sm text-gray-700 dark:text-brand-text-light">General Notifications (Master Switch)</label>
                                    <input
                                        type="checkbox"
                                        id="generalNotifications"
                                        checked={userFormData.notificationPreferences?.generalNotifications ?? true}
                                        onChange={(e) => setUserFormData(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences,
                                                generalNotifications: e.target.checked,
                                                newDeals: prev.notificationPreferences?.newDeals ?? true,
                                                expiringDeals: prev.notificationPreferences?.expiringDeals ?? true
                                            }
                                        }))}
                                        className="h-5 w-5 rounded text-brand-primary bg-white dark:bg-brand-surface border-gray-300 dark:border-gray-600 focus:ring-brand-primary"
                                    />
                                </div>
                                <div className="flex items-center justify-between pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                                    <label htmlFor="newDeals" className="text-sm text-gray-600 dark:text-brand-text-muted">New Deals</label>
                                    <input
                                        type="checkbox"
                                        id="newDeals"
                                        checked={userFormData.notificationPreferences?.newDeals ?? true}
                                        disabled={userFormData.notificationPreferences?.generalNotifications === false}
                                        onChange={(e) => setUserFormData(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences!,
                                                newDeals: e.target.checked
                                            }
                                        }))}
                                        className="h-4 w-4 rounded text-brand-primary bg-white dark:bg-brand-surface border-gray-300 dark:border-gray-600 focus:ring-brand-primary disabled:opacity-50"
                                    />
                                </div>
                                <div className="flex items-center justify-between pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                                    <label htmlFor="expiringDeals" className="text-sm text-gray-600 dark:text-brand-text-muted">Expiring Deals</label>
                                    <input
                                        type="checkbox"
                                        id="expiringDeals"
                                        checked={userFormData.notificationPreferences?.expiringDeals ?? true}
                                        disabled={userFormData.notificationPreferences?.generalNotifications === false}
                                        onChange={(e) => setUserFormData(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences!,
                                                expiringDeals: e.target.checked
                                            }
                                        }))}
                                        className="h-4 w-4 rounded text-brand-primary bg-white dark:bg-brand-surface border-gray-300 dark:border-gray-600 focus:ring-brand-primary disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold mb-3">{t('manageSavedDeals')}</h3>
                            <div className="space-y-2 mb-4">
                                {userSavedDeals.length > 0 ? (
                                    userSavedDeals.map(deal => (
                                        <div key={deal.id} className="flex justify-between items-center bg-gray-100 dark:bg-brand-bg p-2 rounded-md">
                                            <p className="text-sm text-gray-800 dark:text-brand-text-light">{language === 'tr' ? deal.title_tr : deal.title}</p>
                                            <button type="button" onClick={() => handleRemoveDealFromUser(deal.id)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 font-semibold">{t('remove')}</button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-brand-text-muted italic">{t('noSavedDealsForUser')}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <select value={dealToAdd} onChange={e => setDealToAdd(e.target.value)} className="flex-grow bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                    <option value="">{t('selectDeal')}</option>
                                    {pendingDeals.map(deal => (
                                        <option key={deal.id} value={deal.id} disabled={userFormData.savedDeals?.includes(deal.id)}>
                                            {language === 'tr' ? deal.title_tr : deal.title}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" onClick={handleAddDealToUser} disabled={!dealToAdd} className="bg-brand-secondary text-brand-bg font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                                    {t('add')}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('referralChainLabel')}</h3>
                                <div className="mb-2">
                                    <label htmlFor="referredBy" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Referred By (User ID or Select)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            id="referredBy"
                                            name="referredBy"
                                            value={userFormData.referredBy || ''}
                                            onChange={handleUserFormChange}
                                            className="flex-grow bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                            placeholder="Enter User ID"
                                        />
                                        <select
                                            onChange={(e) => setUserFormData(prev => ({ ...prev, referredBy: e.target.value }))}
                                            value={userFormData.referredBy || ''}
                                            className="w-1/2 bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                        >
                                            <option value="">Select User...</option>
                                            {sortedUsers.filter(u => u.id !== userFormData.id).map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-gray-100 dark:bg-brand-bg p-3 rounded-md text-sm text-gray-800 dark:text-brand-text-light min-h-[40px] flex items-center">
                                    {(userFormData.referralChain?.length ?? 0) > 0 ? (
                                        <span>{userFormData.referralChain?.map(id => userIdToNameMap[id] || 'Unknown').join(' → ')}</span>
                                    ) : (
                                        <p className="italic text-gray-500 dark:text-brand-text-muted">{t('topOfChain')}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('referralNetworkLabel')}</h3>
                                <div className="bg-gray-100 dark:bg-brand-bg p-3 rounded-md text-sm text-gray-800 dark:text-brand-text-light min-h-[40px]">
                                    {(userFormData.referralNetwork?.length ?? 0) > 0 ? (
                                        <ul className="list-disc list-inside space-y-1">
                                            {userFormData.referralNetwork?.map(id => (
                                                <li key={id}>{userIdToNameMap[id] || 'Unknown User'}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="italic text-gray-500 dark:text-brand-text-muted">{t('noNetwork')}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-4"><button type="button" onClick={resetUserForm} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button><button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">{t('updateUser')}</button></div>
                    </form>
                </section>
            )}

            <section className="mb-8 bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-bold mb-4">Global User Actions</h2>
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-brand-bg rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-grow">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Master Notification Switch</h3>
                        <p className="text-sm text-gray-500 dark:text-brand-text-muted">Enable or disable notifications for ALL users. This overrides individual settings.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to ENABLE notifications for ALL users?')) {
                                    updateAllUsersNotificationPreferences({ generalNotifications: true });
                                    setShowSuccess('Notifications enabled for all users');
                                    setTimeout(() => setShowSuccess(''), 3000);
                                }
                            }}
                            className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                        >
                            Enable All
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to DISABLE notifications for ALL users?')) {
                                    updateAllUsersNotificationPreferences({ generalNotifications: false });
                                    setShowSuccess('Notifications disabled for all users');
                                    setTimeout(() => setShowSuccess(''), 3000);
                                }
                            }}
                            className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                        >
                            Disable All
                        </button>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold mb-4">{t('allUsers')}</h2>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-grow">
                        <input
                            type="text"
                            placeholder="Search by name, email, or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value as SubscriptionTier | 'All')}
                            className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        >
                            <option value="All">All Tiers</option>
                            {Object.values(SubscriptionTier).filter(t => t !== SubscriptionTier.NONE).map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                {selectedUsers.size > 0 && (
                    <div className="bg-brand-primary/10 p-4 rounded-lg mb-4 flex items-center justify-between">
                        <span className="font-semibold text-brand-primary">{selectedUsers.size} users selected</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleBulkAction('email')} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Email</button>
                            <button onClick={() => handleBulkAction('activate')} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Activate</button>
                            <button onClick={() => handleBulkAction('ban')} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Ban</button>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                            <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                                <tr>
                                    <th scope="col" className="px-6 py-3">
                                        <input type="checkbox" onChange={handleSelectAllUsers} checked={selectedUsers.size === sortedUsers.length && sortedUsers.length > 0} className="rounded text-brand-primary focus:ring-brand-primary" />
                                    </th>
                                    <th scope="col" className="px-6 py-3">{t('fullNameLabel')}</th>
                                    <th scope="col" className="px-6 py-3">{t('emailLabel')}</th>
                                    <th scope="col" className="px-6 py-3">{t('mobileLabel') || 'Mobile'}</th>
                                    <th scope="col" className="px-6 py-3">{t('tier')}</th>
                                    <th scope="col" className="px-6 py-3">Redemptions Left</th>
                                    <th scope="col" className="px-6 py-3">Renews On</th>
                                    <th scope="col" className="px-6 py-3 text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers.map(user => {
                                    const { remaining, total } = calculateRemainingRedemptions(user);
                                    const renewalDate = getNextRenewalDate(user).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');

                                    return (
                                        <tr key={user.id} className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${user.status === 'banned' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input type="checkbox" checked={selectedUsers.has(user.id)} onChange={() => handleSelectUser(user.id)} className="rounded text-brand-primary focus:ring-brand-primary" />
                                            </td>
                                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap">
                                                {user.name}
                                                {user.isAdmin && <span className="ml-2 text-xs bg-brand-secondary text-brand-bg font-bold px-2 py-0.5 rounded-full">Admin</span>}
                                                {user.status === 'banned' && <span className="ml-2 text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">Banned</span>}
                                            </th>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span>{user.email}</span>
                                                    {user.emailConfirmedAt ? (
                                                        <span className="flex items-center text-xs text-green-500 mt-1">
                                                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            Verified
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-xs text-yellow-500 mt-1">
                                                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            Pending Verification
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{user.mobile || '-'}</td>
                                            <td className="px-6 py-4">{user.tier}</td>
                                            <td className="px-6 py-4">
                                                <span className={`font-semibold ${remaining === 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {total === Infinity ? '∞' : `${remaining} / ${total}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{renewalDate}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {!user.emailConfirmedAt && (
                                                    <button onClick={() => handleVerifyUser(user.id)} className="font-medium text-blue-500 hover:underline">Verify</button>
                                                )}
                                                <button onClick={() => handleViewPaymentsClick(user)} className="font-medium text-green-500 hover:underline">Payments</button>
                                                <button onClick={() => setViewingRedemptionsForUser(user)} className="font-medium text-blue-500 hover:underline">{t('viewRedemptions') || 'View Redemptions'}</button>
                                                <button onClick={() => handleEditUserClick(user)} className="font-medium text-brand-secondary hover:underline">{t('editDeal')}</button>
                                                <button onClick={() => handleDeleteUserClick(user.id)} className="font-medium text-red-500 hover:underline disabled:text-red-500/50 disabled:cursor-not-allowed" disabled={user.id === loggedInUser?.id}>{t('deleteDeal')}</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* User Redemptions Modal */}
            <Modal
                isOpen={!!viewingRedemptionsForUser}
                onClose={() => setViewingRedemptionsForUser(null)}
                title={`${viewingRedemptionsForUser?.name}'s Redemptions`}
            >
                <div className="p-4">
                    {viewingRedemptionsForUser?.redemptions && viewingRedemptionsForUser.redemptions.length > 0 ? (
                        <div className="space-y-4">
                            {viewingRedemptionsForUser.redemptions.map((redemption: any) => {
                                const deal = deals.find(d => d.id === redemption.dealId);
                                return (
                                    <div key={redemption.id || Math.random()} className="bg-gray-50 dark:bg-brand-bg p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {deal ? (language === 'tr' ? deal.title_tr : deal.title) : 'Unknown Deal'}
                                        </p>
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-brand-text-muted mt-1">
                                            <span>Redeemed on: {new Date(redemption.redeemedAt).toLocaleDateString()}</span>
                                            {deal && <span>Code: {deal.redemptionCode}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-brand-text-muted py-4">
                            No redemptions found for this user.
                        </p>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setViewingRedemptionsForUser(null)}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* User Payments Modal */}
            <Modal
                isOpen={!!viewingPaymentsForUser}
                onClose={() => setViewingPaymentsForUser(null)}
                title={`${viewingPaymentsForUser?.name}'s Payment History`}
            >
                <div className="p-4">
                    {userPayments.length > 0 ? (
                        <div className="space-y-4">
                            {userPayments.map(payment => (
                                <div key={payment.id} className="bg-gray-50 dark:bg-brand-bg p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-900 dark:text-white">{payment.amount} {payment.currency}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full ${payment.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{payment.status}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-brand-text-muted mt-1">
                                        <span>Date: {new Date(payment.createdAt).toLocaleDateString()}</span>
                                        <span>Method: {payment.paymentMethod}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-brand-text-muted py-4">No payments found for this user.</p>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button onClick={() => setViewingPaymentsForUser(null)} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">{t('close')}</button>
                    </div>
                </div>
            </Modal>

            {showSuccess && (
                <div className="fixed bottom-28 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50">
                    {showSuccess}
                </div>
            )}
        </>
    );
};

export default AdminUsersTab;
