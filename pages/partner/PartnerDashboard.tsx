import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PartnerStats, Deal } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { getDealsByPartnerPaginated } from '../../lib/supabaseService';
import { BarChart3, Users, QrCode, TrendingUp, Plus, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

const ITEMS_PER_PAGE = 10;

const PartnerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [page, setPage] = useState(1);

    // Query for Partner Stats
    const { data: stats } = useQuery({
        queryKey: ['partnerStats', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('partner_stats')
                .select('*')
                .eq('partner_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data as PartnerStats;
        },
        enabled: !!user
    });

    // Query for Partner Deals (Paginated)
    const {
        data: dealsData,
        isLoading: isDealsLoading,
        isPlaceholderData
    } = useQuery({
        queryKey: ['partnerDeals', user?.id, page],
        queryFn: async () => {
            if (!user) return { deals: [], total: 0 };
            return getDealsByPartnerPaginated(user.id, page, ITEMS_PER_PAGE);
        },
        placeholderData: keepPreviousData,
        enabled: !!user
    });

    const deals = dealsData?.deals || [];
    const totalDeals = dealsData?.total || 0;
    const totalPages = Math.ceil(totalDeals / ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    if (isDealsLoading && !isPlaceholderData && !dealsData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400">Overview of your performance</p>
                </div>
                <Link
                    to="/partner/create-deal"
                    className="bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-primary/90 transition-colors flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Deal
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm text-green-600 font-medium flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +12%
                        </span>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Views</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalViews || 0}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm text-green-600 font-medium flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +5%
                        </span>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Redemptions</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalRedemptions || 0}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Deals</h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDeals}</p>
                </div>
            </div>

            {/* Deals List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Your Deals
                        {isDealsLoading && <span className="ml-2 text-sm font-normal text-gray-400">(Loading...)</span>}
                    </h2>
                </div>

                <div className={`overflow-x-auto transition-opacity duration-200 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Redemptions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {deals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No deals found. Create your first deal!
                                    </td>
                                </tr>
                            ) : (
                                deals.map((deal) => (
                                    <tr key={deal.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img src={deal.imageUrl} alt={deal.title} className="h-10 w-10 rounded-lg object-cover mr-3" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{deal.title}</div>
                                                    <div className="text-xs text-gray-500">{deal.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${deal.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                    deal.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                                {deal.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {deal.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                                {deal.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                                {deal.status ? deal.status.charAt(0).toUpperCase() + deal.status.slice(1) : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            ${deal.discountedPrice}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            -
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Link to={`/partner/edit-deal/${deal.id}`} className="text-brand-primary hover:text-brand-secondary">Edit</Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <button
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => {
                                if (!isPlaceholderData && page < totalPages) {
                                    handlePageChange(page + 1);
                                }
                            }}
                            disabled={isPlaceholderData || page >= totalPages}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerDashboard;
