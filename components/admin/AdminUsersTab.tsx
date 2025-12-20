import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDeals } from '../../contexts/DealContext';
import { useToast } from '../../contexts/ToastContext';
import { User, SubscriptionTier, Deal, PaymentTransaction } from '../../types';
import Modal from '../Modal';
import { calculateRemainingRedemptions, getNextRenewalDate } from '../../lib/redemptionLogic';
import { getPendingDeals, getUserTransactions, confirmUserEmail, getAllDeals, getUsersPaginated, getUserActivityLog, ActivityLogItem, sendTestNotification, resetUserHistory, removeWalletItemFromUser, bulkUpdateUserStatus } from '../../lib/supabaseService';

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
    points: 0,
    rank: '',
};

const AdminUsersTab: React.FC = () => {
    const { t, language } = useLanguage();
    const { user: loggedInUser } = useAuth();
    const { users, refreshUsers, updateUser, deleteUser, addExtraRedemptions, updateAllUsersNotificationPreferences } = useAdmin();
    const { success: showSuccessToast, error: showErrorToast } = useToast();
    // Removed useDeals since we fetch all deals manually for admin purposes
    // const { deals, refreshDeals } = useDeals(); 

    const [allDeals, setAllDeals] = useState<Deal[]>([]);

    const [isUserFormVisible, setIsUserFormVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFormData, setUserFormData] = useState<User>(EMPTY_USER);
    const [dealToAdd, setDealToAdd] = useState<string>('');
    const [redemptionsToAdd, setRedemptionsToAdd] = useState(0);
    const [viewingRedemptionsForUser, setViewingRedemptionsForUser] = useState<User | null>(null);
    const [viewingPaymentsForUser, setViewingPaymentsForUser] = useState<User | null>(null);
    const [viewingActivityForUser, setViewingActivityForUser] = useState<User | null>(null);
    const [userActivityLog, setUserActivityLog] = useState<ActivityLogItem[]>([]);
    const [userPayments, setUserPayments] = useState<PaymentTransaction[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'All'>('All');

    const [isBroadcastVisible, setIsBroadcastVisible] = useState(false);
    const [broadcastData, setBroadcastData] = useState({ title: '', message: '' });

    // Fetch users AND all deals when admin tab mounts
    useEffect(() => {
        refreshUsers();
        fetchAllDeals();
    }, []);

    const fetchAllDeals = async () => {
        try {
            const dealsData = await getAllDeals(true); // true = include expired
            setAllDeals(dealsData);
        } catch (error) {
            console.error('Failed to fetch deals for admin:', error);
        }
    };

    const handleVerifyUser = async (userId: string) => {
        if (window.confirm(t('confirmVerifyEmail') || 'Are you sure you want to manually verify this user\'s email?')) {
            try {
                await confirmUserEmail(userId);
                showSuccessToast(t('userUpdateSuccess'));
                fetchUsersData();
            } catch (error) {
                showErrorToast(t('adminErrorTitle'));
            }
        }
    };

    const handleSendTestPush = async (userId: string) => {
        if (window.confirm(t('confirmSendPush') || 'Send a test push notification to this user?')) {
            try {
                const result = await sendTestNotification(userId);
                if (result.success) {
                    showSuccessToast(result.message);
                } else {
                    showErrorToast(result.message);
                }
            } catch (error) {
                showErrorToast(t('adminErrorTitle'));
            }
        }
    };

    const handleResetHistory = async (userId: string) => {
        if (window.confirm('WARNING: This will wipe ALL wallet items and redemption history for this user. This is for testing only. Continue?')) {
            try {
                await resetUserHistory(userId);
                showSuccessToast(t('userUpdateSuccess'));

                // Force Update Local State
                setUserWalletDeals([]);
                if (editingUser && editingUser.id === userId) {
                    setEditingUser({ ...editingUser, redemptions: [] });
                }

                fetchUsersData();
            } catch (error) {
                showErrorToast(t('adminErrorTitle'));
            }
        }
    };

    const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);
    const [userWalletDeals, setUserWalletDeals] = useState<Deal[]>([]);
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const USERS_PER_PAGE = 20;

    const fetchUsersData = async () => {
        setIsLoading(true);
        try {
            const { users, total } = await getUsersPaginated(page, USERS_PER_PAGE, {
                search: searchQuery,
                tier: tierFilter
            });
            setPaginatedUsers(users);
            setTotalUsers(total);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsersData();
        }, 500); // Debounce search
        return () => clearTimeout(timer);
    }, [page, searchQuery, tierFilter]);

    // Force refresh when component mounts
    useEffect(() => {
        refreshUsers(); // Keep context sync for other components if needed
        fetchAllDeals();
    }, []);

    const userIdToNameMap = useMemo(() =>
        paginatedUsers.reduce((acc, user) => {
            acc[user.id] = user.name;
            return acc;
        }, {} as Record<string, string>),
        [paginatedUsers]);

    const handleEditUserClick = async (user: User) => {
        setEditingUser(user);

        // Fetch User's Deals (Wallet)
        let userDeals: string[] = [];
        try {
            const walletItems = await import('../../lib/supabaseService').then(m => m.getWalletItems(user.id));
            const deals = walletItems.map((item: any) => item.deal).filter((d: any) => d !== null);
            setUserWalletDeals(deals);
            userDeals = deals.map((d: any) => d.id);
        } catch (error) {
            console.error('Failed to fetch user deals', error);
            // Even if deals fail, at least open the user form
        }

        setUserFormData({
            ...user,
            savedDeals: [], // Not used in form logic below but good for type safety
            ownedDeals: userDeals, // Now safely defined
            referrals: user.referrals || [],
            referralChain: user.referralChain || [],
            referralNetwork: user.referralNetwork || [],
            extraRedemptions: user.extraRedemptions || 0,
            address: user.address || '',
            billingAddress: user.billingAddress || '',
            referredBy: user.referredBy || '',
            points: user.points || 0,
            rank: user.rank || '',
        });
        setDealToAdd('');
        setRedemptionsToAdd(0);
        setIsUserFormVisible(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteUserClick = async (userId: string) => {
        if (window.confirm(t('deleteUserConfirm'))) {
            await deleteUser(userId);
            showSuccessToast(t('userDeletedSuccess'));
            fetchUsersData();
        }
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

    const handleUserFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            await updateUser(userFormData);
            fetchUsersData(); // Refresh list after update
        }
        resetUserForm();
    };


    const handleAddDealToUser = async () => {
        if (dealToAdd && editingUser) {
            try {
                // Use the service directly - using addDealToWallet for secure assignment with bypass
                const { addDealToWallet } = await import('../../lib/supabaseService');
                await addDealToWallet(editingUser.id, dealToAdd, true); // true = bypass tier/limit checks

                // Update local UI
                setUserFormData(prev => ({
                    ...prev,
                    ownedDeals: [...(prev.ownedDeals || []), dealToAdd]
                }));

                // Add full deal to wallet list
                const dealObj = allDeals.find(d => d.id === dealToAdd);
                if (dealObj) {
                    setUserWalletDeals(prev => [...prev, dealObj]);
                } else {
                    // Fallback if deal not in current page (should be rare as dropdown is from allDeals? wait, allDeals IS paginated?)
                    // Actually allDeals in AdminDealsTab is paginated. Here in AdminUsersTab, is it?
                    // AdminUsersTab doesn't seem to fetch allDeals? 
                    // Wait, verifying: fetchAllDeals() at line 127.
                    // We need to check fetchAllDeals definition. Assuming it fetches some deals. 
                    // If not found, we might need to fetch single deal.
                    const fetchedDeal = await import('../../lib/supabaseService').then(m => m.getDealById(dealToAdd));
                    if (fetchedDeal) setUserWalletDeals(prev => [...prev, fetchedDeal]);
                }

                setDealToAdd('');
                showSuccessToast(t('adminSuccessTitle'));
            } catch (error) {
                showErrorToast(t('adminErrorTitle'));
            }
        }
    };

    const handleRemoveDeal = async (dealId: string) => {
        if (editingUser) {
            if (!window.confirm('Remove this deal from user wallet?')) return;
            try {
                const { removeDealFromUser, removeWalletItemFromUser } = await import('../../lib/supabaseService');

                // Remove from favorites AND wallet items
                await removeDealFromUser(editingUser.id, dealId);
                await removeWalletItemFromUser(editingUser.id, dealId);

                // Update local UI
                setUserFormData(prev => ({
                    ...prev,
                    ownedDeals: prev.ownedDeals?.filter(id => id !== dealId) || []
                }));
                setUserWalletDeals(prev => prev.filter(d => d.id !== dealId));
                showSuccessToast(t('adminSuccessTitle'));
            } catch (error) {
                showErrorToast(t('adminErrorTitle'));
            }
        }
    };

    const handleAddRedemptions = async () => {
        if (redemptionsToAdd > 0 && editingUser) {
            await addExtraRedemptions(editingUser.id, redemptionsToAdd);
            setUserFormData(prev => ({
                ...prev,
                extraRedemptions: (prev.extraRedemptions || 0) + redemptionsToAdd
            }));
            showSuccessToast(t('redemptionsAddedSuccess'));
            setRedemptionsToAdd(0);
            fetchUsersData(); // Refresh list
        }
    };

    const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUsers(new Set(paginatedUsers.map(u => u.id)));
        } else {
            setSelectedUsers(new Set());
        }
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

    const handleBulkAction = async (action: 'email' | 'activate' | 'ban') => {
        if (selectedUsers.size === 0) return;

        if (action === 'email') {
            alert('Email bulk action is not yet implemented. This will integrated with your mailing service.');
            return;
        }

        if (!window.confirm(`Are you sure you want to ${action} ${selectedUsers.size} users?`)) return;

        try {
            const userIds = Array.from(selectedUsers);
            const statusMap: Record<string, 'active' | 'banned'> = {
                'activate': 'active',
                'ban': 'banned'
            };

            const newStatus = statusMap[action as keyof typeof statusMap];
            if (newStatus) {
                await bulkUpdateUserStatus(userIds as string[], newStatus);
                showSuccessToast(`Bulk ${action} successful for ${selectedUsers.size} users`);
            }

            setSelectedUsers(new Set());
            fetchUsersData(); // Refresh the list
        } catch (error) {
            showErrorToast('Bulk action failed');
        }
    };


    const handleSendBroadcast = async () => {
        if (!broadcastData.title || !broadcastData.message) {
            alert('Please enter title and message');
            return;
        }

        if (!window.confirm(`Are you sure you want to send this broadcast to ALL users?`)) return;

        try {
            // Using the Supabase invoke to hit our new Edge Function
            const { supabase } = await import('../../lib/supabaseClient');
            const { data, error } = await supabase.functions.invoke('trigger-push-notification', {
                body: {
                    title: broadcastData.title,
                    message: broadcastData.message
                }
            });

            if (error) throw error;

            console.log('Broadcast result:', data);
            showSuccessToast(`Broadcast sent! Processed: ${data?.processed || 0}`);
            setIsBroadcastVisible(false);
            setBroadcastData({ title: '', message: '' });

        } catch (error: any) {
            showErrorToast(`Broadcast failed: ${error.message || 'Unknown error'}`);
        }
    };


    const handleViewPaymentsClick = async (user: User) => {
        setViewingPaymentsForUser(user);
        try {
            const data = await getUserTransactions(user.id);
            setUserPayments(data);
        } catch (error) {
            console.error('Failed to fetch user payments', error);
        }
    };

    const handleViewActivityClick = async (user: User) => {
        setViewingActivityForUser(user);
        try {
            const data = await getUserActivityLog(user.id);
            setUserActivityLog(data);
        } catch (error) {
            console.error('Failed to fetch user activity', error);
        }
    };

    return (
        <>
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('usersManagement')}</h2>
                </div>

                {isUserFormVisible && (
                    <section className="bg-white dark:bg-brand-surface p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">{editingUser ? t('editUser') : 'Add User'}</h2>
                        <form onSubmit={handleUserFormSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fullNameLabel')}</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={userFormData.name}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('emailLabel')}</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={userFormData.email}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('mobileLabel') || 'Mobile'}</label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        value={userFormData.mobile || ''}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('tier')}</label>
                                    <select
                                        name="tier"
                                        value={userFormData.tier}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                    >
                                        {Object.values(SubscriptionTier).map(tier => (
                                            <option key={tier} value={tier}>{tier}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Redemptions</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            readOnly
                                            value={userFormData.extraRedemptions || 0}
                                            className="w-20 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500"
                                        />
                                        <input
                                            type="number"
                                            value={redemptionsToAdd}
                                            onChange={(e) => setRedemptionsToAdd(parseInt(e.target.value) || 0)}
                                            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="+ Add"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddRedemptions}
                                            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User Points</label>
                                    <input
                                        type="number"
                                        name="points"
                                        value={userFormData.points || 0}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User Rank / Medal</label>
                                    <input
                                        type="text"
                                        name="rank"
                                        value={userFormData.rank || ''}
                                        onChange={handleUserFormChange}
                                        placeholder="e.g. BRONZE, SILVER, GOLD or custom"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Address Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={userFormData.address || ''}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Address</label>
                                    <input
                                        type="text"
                                        name="billingAddress"
                                        value={userFormData.billingAddress || ''}
                                        onChange={handleUserFormChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* User Wallet (Deals) */}
                            <div className="bg-gray-50 dark:bg-brand-bg/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('userWallet') || 'User Wallet'}</h3>
                                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                                    {userWalletDeals.length > 0 ? (
                                        userWalletDeals.map(deal => (
                                            <div key={deal.id} className="flex justify-between items-center bg-white dark:bg-brand-surface p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 dark:text-white">{language === 'tr' ? deal.title_tr : deal.title}</span>
                                                    {((deal as any).isSoldOut || (deal.maxRedemptionsTotal && (deal.redemptionsCount || 0) >= deal.maxRedemptionsTotal)) &&
                                                        <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Sold Out</span>
                                                    }
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDeal(deal.id)}
                                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    {t('remove')}
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">{t('noSavedDealsForUser')}</p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <select
                                        value={dealToAdd}
                                        onChange={e => setDealToAdd(e.target.value)}
                                        className="flex-grow px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary"
                                    >
                                        <option value="">{t('selectDeal')}</option>
                                        {allDeals.map(deal => (
                                            <option key={deal.id} value={deal.id} disabled={userWalletDeals.some(d => d.id === deal.id)}>
                                                {language === 'tr' ? deal.title_tr : deal.title}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddDealToUser}
                                        disabled={!dealToAdd}
                                        className="bg-brand-secondary text-white font-medium px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
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
                                                {paginatedUsers.filter(u => u.id !== userFormData.id).map(u => (
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
                        </form >
                    </section >
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

                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Broadcast Message</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Send a push notification to all subscribed users immediately.</p>
                        </div>
                        <button
                            onClick={() => setIsBroadcastVisible(true)}
                            className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Send Broadcast
                        </button>
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
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <select
                                value={tierFilter}
                                onChange={(e) => { setTierFilter(e.target.value as SubscriptionTier | 'All'); setPage(1); }}
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
                                            <input type="checkbox" onChange={handleSelectAllUsers} checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0} className="rounded text-brand-primary focus:ring-brand-primary" />
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
                                    {isLoading ? (
                                        <tr><td colSpan={8} className="text-center py-8">Loading users...</td></tr>
                                    ) : paginatedUsers.map(user => {
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
                                                    <button onClick={() => handleViewActivityClick(user)} className="font-medium text-purple-500 hover:underline">Activity</button>
                                                    <button onClick={() => handleSendTestPush(user.id)} className="font-medium text-orange-500 hover:underline" title="Send Test Push Notification">Push</button>
                                                    <button onClick={() => handleResetHistory(user.id)} className="font-medium text-red-600 hover:underline" title="Wipe Wallet & Redemptions">Reset</button>
                                                    <button onClick={() => setViewingRedemptionsForUser(user)} className="font-medium text-blue-500 hover:underline">{t('viewRedemptions') || 'View Redemptions'}</button>
                                                    <button onClick={() => handleEditUserClick(user)} className="font-medium text-brand-secondary hover:underline">{t('editUser')}</button>
                                                    <button onClick={() => handleDeleteUserClick(user.id)} className="font-medium text-red-500 hover:underline disabled:text-red-500/50 disabled:cursor-not-allowed" disabled={user.id === loggedInUser?.id}>{t('deleteUser')}</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-brand-bg border-t border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-700 dark:text-brand-text-muted">
                                Showing {((page - 1) * USERS_PER_PAGE) + 1} to {Math.min(page * USERS_PER_PAGE, totalUsers)} of {totalUsers} users
                            </span>
                            <div className="space-x-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-brand-text-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * USERS_PER_PAGE >= totalUsers}
                                    className="px-4 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-brand-text-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

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
                                const deal = allDeals.find(d => d.id === redemption.dealId);
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

            {/* Broadcast Modal */}
            <Modal
                isOpen={isBroadcastVisible}
                onClose={() => setIsBroadcastVisible(false)}
                title="Send Broadcast Notification"
            >
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alert Title</label>
                        <input
                            type="text"
                            value={broadcastData.title}
                            onChange={e => setBroadcastData(d => ({ ...d, title: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g. Flash Sale Alert! ⚡"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Body</label>
                        <textarea
                            value={broadcastData.message}
                            onChange={e => setBroadcastData(d => ({ ...d, message: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24"
                            placeholder="e.g. Get 50% off on all flights to Turkey this weekend only!"
                        />
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ This will result in real push notifications being sent to all users who have subscribed on their devices.
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setIsBroadcastVisible(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendBroadcast}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium"
                        >
                            Send Blast 🚀
                        </button>
                    </div>
                </div>
            </Modal>
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

            {/* User Activity Modal */}
            <Modal
                isOpen={!!viewingActivityForUser}
                onClose={() => setViewingActivityForUser(null)}
                title={`Activity Log: ${viewingActivityForUser?.name}`}
            >
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                    {userActivityLog.length > 0 ? (
                        <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                            {userActivityLog.map((item) => (
                                <div key={item.id} className="mb-8 ml-6 relative">
                                    <span className={`absolute -left-9 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-brand-surface ${item.type === 'joined' ? 'bg-blue-100 ring-blue-50' :
                                        item.type === 'deal_claimed' ? 'bg-yellow-100 ring-yellow-50' :
                                            item.type === 'deal_redeemed' ? 'bg-green-100 ring-green-50' :
                                                item.type === 'subscription_payment' ? 'bg-purple-100 ring-purple-50' :
                                                    'bg-gray-100 ring-gray-50'
                                        }`}>
                                        {/* Simple dot or icon based on type */}
                                        <div className={`w-2 h-2 rounded-full ${item.type === 'joined' ? 'bg-blue-600' :
                                            item.type === 'deal_claimed' ? 'bg-yellow-600' :
                                                item.type === 'deal_redeemed' ? 'bg-green-600' :
                                                    item.type === 'subscription_payment' ? 'bg-purple-600' :
                                                        'bg-gray-600'
                                            }`}></div>
                                    </span>
                                    <h3 className="flex items-center mb-1 text-base font-semibold text-gray-900 dark:text-white">
                                        {item.type === 'joined' && 'Joined Platform'}
                                        {item.type === 'deal_claimed' && 'Claimed Deal'}
                                        {item.type === 'deal_redeemed' && 'Redeemed Deal'}
                                        {item.type === 'subscription_payment' && 'Payment'}
                                        {item.type === 'deal_unsaved' && 'Unsaved Deal'}
                                    </h3>
                                    <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </time>
                                    <p className="text-base font-normal text-gray-500 dark:text-brand-text-muted">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-brand-text-muted py-4">
                            No activity recorded for this user.
                        </p>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setViewingActivityForUser(null)}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            </Modal>


        </>
    );
};

export default AdminUsersTab;
