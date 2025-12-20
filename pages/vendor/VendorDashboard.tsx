import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDealsByPartner } from '../../lib/supabaseService';
import { Deal } from '../../types';
import { ShoppingBag, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VendorDashboard() {
    const { user } = useAuth();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            if (user?.id) {
                const partnerDeals = await getDealsByPartner(user.id);
                setDeals(partnerDeals);
            }
            setLoading(false);
        }
        loadStats();
    }, [user]);

    const activeDeals = deals.filter(d => !d.isSoldOut && new Date(d.expiresAt) > new Date());
    const pendingDeals = deals.filter(d => d.status === 'pending');
    const totalRedemptions = deals.reduce((sum, d) => sum + (d.redemptionsCount || 0), 0);

    // Calculate estimated savings delivered (Mock metric for now)
    const totalSavings = deals.reduce((sum, d) => {
        const savingPerDeal = d.originalPrice - d.discountedPrice;
        return sum + (savingPerDeal * (d.redemptionsCount || 0));
    }, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
                <p className="text-gray-500">Welcome back, {user?.name}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    icon={ShoppingBag}
                    label="Active Deals"
                    value={activeDeals.length.toString()}
                    trend="+2 this week"
                    color="violet"
                />
                <StatsCard
                    icon={Users}
                    label="Total Redemptions"
                    value={totalRedemptions.toString()}
                    trend="+12% vs last month"
                    color="indigo"
                />
                <StatsCard
                    icon={TrendingUp}
                    label="Customer Savings"
                    value={`₺${totalSavings.toLocaleString()}`}
                    trend="Lifetime Value"
                    color="emerald"
                />
                <StatsCard
                    icon={AlertCircle}
                    label="Pending Approval"
                    value={pendingDeals.length.toString()}
                    trend={pendingDeals.length > 0 ? "Action Required" : "All Clear"}
                    color="amber"
                />
            </div>

            {/* Recent Deals Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Your Recent Deals</h2>
                    <Link to="/vendor/deals" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                        View All
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Redemptions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {deals.slice(0, 5).map((deal) => (
                                <tr key={deal.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-10 w-10 rounded-lg object-cover" src={deal.imageUrl} alt="" />
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{deal.title}</div>
                                                <div className="text-sm text-gray-500">{(deal.discountPercentage || 0)}% OFF</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={deal.status || 'approved'} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {deal.redemptionsCount || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(deal.expiresAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {deals.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No deals found. Create your first deal to get started!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatsCard({ icon: Icon, label, value, trend, color }: any) {
    const colorClasses = {
        violet: 'bg-violet-100 text-violet-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
    }[color as string] || 'bg-gray-100 text-gray-600';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
                <span>{trend}</span>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        approved: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        rejected: 'bg-red-100 text-red-800',
    }[status] || 'bg-gray-100 text-gray-800';

    return (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
