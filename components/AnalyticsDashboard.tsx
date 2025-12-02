import React, { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { UsersIcon, TagIcon, TrendingUpIcon, CreditCardIcon, SpinnerIcon } from './Icons';
import { getAnalyticsData } from '../lib/supabaseService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard: React.FC = () => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const analyticsData = await getAnalyticsData();
            setData(analyticsData);
            setLoading(false);
        };

        fetchData();
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        const analyticsData = await getAnalyticsData();
        setData(analyticsData);
        setLoading(false);
    };

    const exportToCSV = () => {
        if (!data) return;

        const { metrics, charts } = data;
        let csvContent = "data:text/csv;charset=utf-8,";

        // Metrics
        csvContent += "Metrics\n";
        csvContent += `Total Users,${metrics.totalUsers}\n`;
        csvContent += `Total Revenue,${metrics.totalRevenue}\n`;
        csvContent += `Active Deals,${metrics.activeDeals}\n`;
        csvContent += `Total Redemptions,${metrics.totalRedemptions}\n\n`;

        // Revenue Data
        csvContent += "Revenue Data\n";
        csvContent += "Month,Revenue\n";
        charts.revenueData.forEach((row: any) => {
            csvContent += `${row.name},${row.revenue}\n`;
        });
        csvContent += "\n";

        // User Growth
        csvContent += "User Growth\n";
        csvContent += "Month,Users\n";
        charts.userGrowthData.forEach((row: any) => {
            csvContent += `${row.name},${row.users}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "analytics_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <SpinnerIcon className="w-10 h-10 text-brand-primary animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-96 text-gray-500">
                Failed to load analytics data.
            </div>
        );
    }

    const { metrics, charts } = data;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Overview</h2>
                <div className="flex gap-2">
                    <button onClick={handleRefresh} className="bg-white dark:bg-brand-surface border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm">
                        <SpinnerIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button onClick={exportToCSV} className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm">
                        <TrendingUpIcon className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Users"
                    value={metrics.totalUsers.toLocaleString()}
                    // change="+12%" // We don't have historical data for change yet
                    icon={<UsersIcon className="w-6 h-6 text-blue-500" />}
                    color="bg-blue-50 dark:bg-blue-900/20"
                />
                <MetricCard
                    title="Total Revenue"
                    value={`$${metrics.totalRevenue.toLocaleString()}`}
                    // change="+8%"
                    icon={<CreditCardIcon className="w-6 h-6 text-green-500" />}
                    color="bg-green-50 dark:bg-green-900/20"
                />
                <MetricCard
                    title="Active Deals"
                    value={metrics.activeDeals.toLocaleString()}
                    // change="+5%"
                    icon={<TagIcon className="w-6 h-6 text-purple-500" />}
                    color="bg-purple-50 dark:bg-purple-900/20"
                />
                <MetricCard
                    title="Redemptions"
                    value={metrics.totalRedemptions.toLocaleString()}
                    // change="+24%"
                    icon={<TrendingUpIcon className="w-6 h-6 text-orange-500" />}
                    color="bg-orange-50 dark:bg-orange-900/20"
                />
            </div>

            {/* Charts Section 1: Revenue & User Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Revenue Overview (Last 6 Months)">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={charts.revenueData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: number) => [`$${value}`, 'Revenue']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="User Growth (Cumulative)">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={charts.userGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Charts Section 2: Categories & Top Deals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Deal Categories" className="lg:col-span-1">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={charts.categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {charts.categoryData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 flex-wrap mt-4">
                        {charts.categoryData.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center text-xs text-gray-600 dark:text-brand-text-muted">
                                <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                {entry.name} ({entry.value})
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Top Performing Deals" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={charts.topDeals}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#6B7280', fontSize: 12 }} />
                            <Tooltip cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="redemptions" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
};

// Helper Components
const MetricCard = ({ title, value, change, icon, color }: any) => (
    <div className="bg-white dark:bg-brand-surface p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 flex items-start justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-brand-text-muted mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-brand-text-light">{value}</h3>
            {change && (
                <span className={`text-xs font-medium ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {change} from last month
                </span>
            )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
            {icon}
        </div>
    </div>
);

const ChartCard = ({ title, children, className = '' }: any) => (
    <div className={`bg-white dark:bg-brand-surface p-6 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 ${className}`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text-light mb-6">{title}</h3>
        {children}
    </div>
);

export default AnalyticsDashboard;
