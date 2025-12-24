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
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                    <p className="text-brand-text-muted mt-1">Overview of your performance</p>
                </div>
                <Link
                    to="/partner/create-deal"
                    className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.5)] flex items-center group"
                >
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Create New Deal
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-premium p-6 rounded-2xl relative overflow-hidden group hover:bg-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <Users className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +12%
                        </span>
                    </div>
                    <h3 className="text-brand-text-muted text-sm font-medium">Total Views</h3>
                    <p className="text-3xl font-bold text-white mt-1">{stats?.totalViews || 0}</p>
                </div>

                <div className="glass-premium p-6 rounded-2xl relative overflow-hidden group hover:bg-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <QrCode className="w-6 h-6 text-purple-400" />
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +5%
                        </span>
                    </div>
                    <h3 className="text-brand-text-muted text-sm font-medium">Total Redemptions</h3>
                    <p className="text-3xl font-bold text-white mt-1">{stats?.totalRedemptions || 0}</p>
                </div>

                <div className="glass-premium p-6 rounded-2xl relative overflow-hidden group hover:bg-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <BarChart3 className="w-6 h-6 text-amber-400" />
                        </div>
                    </div>
                    <h3 className="text-brand-text-muted text-sm font-medium">Active Deals</h3>
                    <p className="text-3xl font-bold text-white mt-1">{totalDeals}</p>
                </div>
            </div>

            {/* Deals List */}
            <div className="glass-premium rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        Your Deals
                        {isDealsLoading && <span className="ml-2 text-sm font-normal text-brand-text-muted animate-pulse">(Loading...)</span>}
                    </h2>
                </div>

                <div className={`overflow-x-auto transition-opacity duration-200 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Deal</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Redemptions</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {deals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No deals found. Create your first deal!
                                    </td>
                                </tr>
                            ) : (
                                deals.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-white/5 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img src={deal.imageUrl} alt={deal.title} className="h-10 w-10 rounded-lg object-cover mr-3 border border-white/10" />
                                                <div>
                                                    <div className="text-sm font-medium text-white">{deal.title}</div>
                                                    <div className="text-xs text-brand-text-muted">{deal.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                                                ${deal.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    deal.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                {deal.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {deal.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                                {deal.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                                {deal.status ? deal.status.charAt(0).toUpperCase() + deal.status.slice(1) : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-light">
                                            ${deal.discountedPrice}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-light">
                                            -
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Link to={`/partner/edit-deal/${deal.id}`} className="text-brand-primary hover:text-brand-secondary transition-colors">Edit</Link>
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
