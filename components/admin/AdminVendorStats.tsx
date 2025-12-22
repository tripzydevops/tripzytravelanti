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

            <div className="bg-white dark:bg-brand-surface p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    placeholder="Search Vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 bg-gray-50 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-brand-primary"
                />
            </div>

            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <SpinnerIcon className="w-8 h-8 text-brand-primary animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                            <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                                <tr>
                                    <th className="px-6 py-3">Vendor Name</th>
                                    <th className="px-6 py-3 text-center">Active Deals</th>
                                    <th className="px-6 py-3 text-center">Total Redemptions</th>
                                    <th className="px-6 py-3 text-right">Est. Revenue Generated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStats.length > 0 ? (
                                    filteredStats.map((vendor, idx) => (
                                        <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {vendor.name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-200 dark:text-blue-800">
                                                    {vendor.dealCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-gray-900 dark:text-brand-text-light">
                                                {vendor.totalRedemptions}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-green-600 dark:text-green-400">
                                                ${vendor.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
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
