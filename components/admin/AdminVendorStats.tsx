import React, { useEffect, useState } from 'react';
import { getVendorAnalytics, VendorAnalytics } from '../../lib/supabaseService';
import { SpinnerIcon, TrendingUpIcon } from '../Icons';

const AdminVendorStats: React.FC = () => {
    const [stats, setStats] = useState<VendorAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        const data = await getVendorAnalytics();
        setStats(data);
        setLoading(false);
    };

    const filteredStats = stats.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exportToCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Vendor Name,Active Deals,Total Redemptions,Est. Revenue Generated\n"
            + stats.map(s => `"${s.name}",${s.dealCount},${s.totalRedemptions},${s.estimatedRevenue.toFixed(2)}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "vendor_performance_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Performance Reports</h2>
                <button
                    onClick={exportToCSV}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    <TrendingUpIcon className="w-4 h-4" /> Export CSV
                </button>
            </div>

            <div className="glass-premium p-4 rounded-lg border border-white/10">
                <input
                    type="text"
                    placeholder="Search Vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 bg-gray-50 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-primary"
                />
            </div>

            <div className="glass-premium rounded-lg overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <SpinnerIcon className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-white/60 uppercase bg-white/5">
                                <tr>
                                    <th className="px-6 py-3">Vendor Name</th>
                                    <th className="px-6 py-3 text-center">Active Deals</th>
                                    <th className="px-6 py-3 text-center">Total Redemptions</th>
                                    <th className="px-6 py-3 text-right">Est. Revenue Generated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {filteredStats.length > 0 ? (
                                    filteredStats.map((vendor, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                {vendor.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-500/10">
                                                    {vendor.dealCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-white/80">
                                                {vendor.totalRedemptions}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-green-400">
                                                ${vendor.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-white/50">
                                            No vendors found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p><strong>Note:</strong> Revenue is estimated based on <code>Discounted Price × Redemptions</code>. Actual revenue may vary based on currency rates or manual checkouts.</p>
            </div>
        </div>
    );
};

export default AdminVendorStats;
