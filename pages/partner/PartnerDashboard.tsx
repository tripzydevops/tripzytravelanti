import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Deal, PartnerStats } from '../../types';
import { BarChart3, Users, Ticket } from 'lucide-react';

const PartnerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<PartnerStats | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                setLoading(true);

                // Fetch stats
                const { data: statsData, error: statsError } = await supabase
                    .from('partner_stats')
                    .select('*')
                    .eq('partner_id', user.id)
                    .single();

                if (statsError && statsError.code !== 'PGRST116') {
                    console.error('Error fetching stats:', statsError);
                }

                if (statsData) {
                    setStats({
                        id: statsData.id,
                        partnerId: statsData.partner_id,
                        totalViews: statsData.total_views,
                        totalRedemptions: statsData.total_redemptions,
                        updatedAt: statsData.updated_at
                    });
                }

                // Fetch deals (assuming deals table has a partner_id or we filter by vendor name matching user name for now)
                // Ideally, deals table should have a partner_id column.
                // For this MVP, let's assume we added partner_id to deals or we just show all deals for now to demonstrate layout
                // In a real scenario: .eq('partner_id', user.id)
                const { data: dealsData, error: dealsError } = await supabase
                    .from('deals')
                    .select('*'); // TODO: Filter by partner_id once added to deals table

                if (dealsError) throw dealsError;

                // Mock filtering by "vendor" matching user name just for demo if partner_id doesn't exist
                const myDeals = (dealsData || []).filter(d => d.vendor === user.name || true); // Showing all for demo
                setDeals(myDeals);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    if (loading) {
        return <div className="flex justify-center items-center h-full">Loading...</div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard Overview</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Redemptions</h3>
                        <Ticket className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalRedemptions || 0}</p>
                    <p className="text-sm text-green-500 mt-2">+12% from last month</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Total Views</h3>
                        <Users className="w-8 h-8 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalViews || 0}</p>
                    <p className="text-sm text-green-500 mt-2">+5% from last month</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Active Deals</h3>
                        <BarChart3 className="w-8 h-8 text-orange-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{deals.length}</p>
                    <p className="text-sm text-gray-500 mt-2">Currently live</p>
                </div>
            </div>

            {/* Recent Activity / Deals List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Deals</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Deal Title</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Category</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Price</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {deals.map((deal) => (
                                <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{deal.title}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{deal.category}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                        <span className="line-through text-gray-400 mr-2">${deal.originalPrice}</span>
                                        <span className="text-brand-primary font-bold">${deal.discountedPrice}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartnerDashboard;
