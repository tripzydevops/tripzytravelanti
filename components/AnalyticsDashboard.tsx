import React from 'react';
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
import { UsersIcon, TagIcon, TrendingUpIcon, CreditCardIcon } from './Icons';

// Mock Data - In a real app, this would come from your backend
const revenueData = [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 2000 },
    { name: 'Apr', revenue: 2780 },
    { name: 'May', revenue: 1890 },
    { name: 'Jun', revenue: 2390 },
    { name: 'Jul', revenue: 3490 },
];

const userGrowthData = [
    { name: 'Jan', users: 400 },
    { name: 'Feb', users: 600 },
    { name: 'Mar', users: 800 },
    { name: 'Apr', users: 1000 },
    { name: 'May', users: 1500 },
    { name: 'Jun', users: 2000 },
    { name: 'Jul', users: 2400 },
];

const categoryData = [
    { name: 'Dining', value: 400 },
    { name: 'Wellness', value: 300 },
    { name: 'Travel', value: 300 },
    { name: 'Entertainment', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AnalyticsDashboard: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Users"
                    value="2,400"
                    change="+12%"
                    icon={<UsersIcon className="w-6 h-6 text-blue-500" />}
                    color="bg-blue-50 dark:bg-blue-900/20"
                />
                <MetricCard
                    title="Total Revenue"
                    value="$12,340"
                    change="+8%"
                    icon={<CreditCardIcon className="w-6 h-6 text-green-500" />}
                    color="bg-green-50 dark:bg-green-900/20"
                />
                <MetricCard
                    title="Active Deals"
                    value="145"
                    change="+5%"
                    icon={<TagIcon className="w-6 h-6 text-purple-500" />}
                    color="bg-purple-50 dark:bg-purple-900/20"
                />
                <MetricCard
                    title="Redemptions"
                    value="890"
                    change="+24%"
                    icon={<TrendingUpIcon className="w-6 h-6 text-orange-500" />}
                    color="bg-orange-50 dark:bg-orange-900/20"
                />
            </div>

            {/* Charts Section 1: Revenue & User Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Revenue Overview">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={revenueData}>
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
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="User Growth">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={userGrowthData}>
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
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 flex-wrap mt-4">
                        {categoryData.map((entry, index) => (
                            <div key={index} className="flex items-center text-xs text-gray-600 dark:text-brand-text-muted">
                                <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                {entry.name}
                            </div>
                        ))}
                    </div>
                </ChartCard>

                <ChartCard title="Top Performing Deals" className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={[
                                { name: 'Sushi Master', redemptions: 120 },
                                { name: 'Spa Day', redemptions: 98 },
                                { name: 'City Tour', redemptions: 86 },
                                { name: 'Burger King', redemptions: 75 },
                                { name: 'Yoga Class', redemptions: 65 },
                            ]}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#6B7280', fontSize: 12 }} />
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
            <span className={`text-xs font-medium ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                {change} from last month
            </span>
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
