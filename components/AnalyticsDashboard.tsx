import React, { useEffect, useState } from "react";
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
} from "recharts";
import { useLanguage } from "../contexts/LanguageContext";
import {
  UsersIcon,
  TagIcon,
  TrendingUpIcon,
  CreditCardIcon,
  SpinnerIcon,
} from "./Icons";
import { getAnalyticsData } from "../lib/supabaseService";
import AdminActivityLog from "./admin/AdminActivityLog";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    setRefreshing(true);
    const analyticsData = await getAnalyticsData();
    setData(analyticsData);
    setRefreshing(false);
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Analytics
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="glass-premium text-white px-4 py-2 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            <SpinnerIcon
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />{" "}
            {t("refresh")}
          </button>
          <button
            onClick={exportToCSV}
            className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-sm"
          >
            <TrendingUpIcon className="w-4 h-4" /> {t("exportCsv")}
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t("totalUsers")}
          value={metrics.totalUsers.toLocaleString()}
          icon={<UsersIcon className="w-6 h-6 text-blue-500" />}
          color="bg-blue-50 dark:bg-blue-900/20"
        />
        <MetricCard
          title={t("totalRevenue")}
          value={`₺${metrics.totalRevenue.toLocaleString()}`}
          icon={<CreditCardIcon className="w-6 h-6 text-green-500" />}
          color="bg-green-50 dark:bg-green-900/20"
        />
        <MetricCard
          title={t("manageDeals")}
          value={metrics.activeDeals.toLocaleString()}
          icon={<TagIcon className="w-6 h-6 text-purple-500" />}
          color="bg-purple-50 dark:bg-purple-900/20"
        />
        <MetricCard
          title={t("totalRedemptions")}
          value={metrics.totalRedemptions.toLocaleString()}
          icon={<TrendingUpIcon className="w-6 h-6 text-orange-500" />}
          color="bg-orange-50 dark:bg-orange-900/20"
        />
        <MetricCard
          title="Retention Rate"
          value={`${metrics.retention?.retention_rate?.toFixed(1) || 0}%`}
          change={`${metrics.retention?.active_users_30d || 0} active users`}
          icon={<UsersIcon className="w-6 h-6 text-indigo-500" />}
          color="bg-indigo-50 dark:bg-indigo-900/20"
        />
      </div>

      {/* Scaling & Growth Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-premium p-6 rounded-[24px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
            <TrendingUpIcon className="w-5 h-5 text-gold-400" />
            Scaling to 100k Users (Turkey Ops)
          </h3>
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-white/60">Target Progress</span>
              <span className="text-brand-primary">
                {metrics.scalingProgress?.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-brand-primary h-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(100, metrics.scalingProgress || 0)}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{metrics.totalUsers.toLocaleString()} / 100,000 Users</span>
              <span className="text-green-500">
                +{metrics.growthVelocity?.toFixed(1)} new users/day
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            title="User Conversion"
            value={`${metrics.conversionRate?.toFixed(1)}%`}
            change="Redemptions per user"
            icon={<TagIcon className="w-6 h-6 text-green-500" />}
            color="bg-green-50 dark:bg-green-900/20"
          />
          <MetricCard
            title="Avg Revenue/User"
            value={`₺${(
              metrics.totalRevenue / (metrics.totalUsers || 1)
            ).toFixed(2)}`}
            icon={<CreditCardIcon className="w-6 h-6 text-blue-500" />}
            color="bg-blue-50 dark:bg-blue-900/20"
          />
        </div>
      </div>

      {/* Charts Section 1: Revenue & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Revenue Growth" className="lg:col-span-2">
          <div className="h-[300px] min-h-[1px] min-w-[1px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={charts.revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: number) => [
                    `₺${value.toLocaleString()}`,
                    "Revenue",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366F1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Monthly Active Users (MAU) Trend"
          className="lg:col-span-1"
        >
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={charts.mauData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: "#8B5CF6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Section 2: City Distribution & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="City Distribution (Turkey)">
          <div className="h-[300px] min-h-[1px] min-w-[1px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={charts.cityData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={8}
                  dataKey="value"
                >
                  {(charts.cityData || []).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 flex-wrap mt-2">
            {(charts.cityData || []).map((entry: any, index: number) => (
              <div
                key={index}
                className="flex items-center text-xs font-medium text-gray-600 dark:text-brand-text-muted"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Deal Categories">
          <div className="h-[300px] min-h-[1px] min-w-[1px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={charts.categoryData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                  opacity={0.5}
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="value"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts Section 3: Performance Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <ChartCard title="Top Performing Deals">
          <div className="h-[350px] min-h-[1px] min-w-[1px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={charts.topDeals}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#E5E7EB"
                  opacity={0.5}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={140}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="redemptions"
                  fill="#F59E0B"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Tier Distribution">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={charts.tierData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={8}
                  dataKey="value"
                >
                  {charts.tierData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[(index + 3) % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 flex-wrap mt-2">
            {charts.tierData.map((entry: any, index: number) => (
              <div
                key={index}
                className="flex items-center text-xs font-medium text-gray-600 dark:text-brand-text-muted"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                  style={{
                    backgroundColor: COLORS[(index + 3) % COLORS.length],
                  }}
                ></span>
                {entry.name}: {entry.value}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Users Section */}
      <div className="mb-6">
        <ChartCard title="Recent Users">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-white/70">
              <thead className="text-xs text-white/40 uppercase border-b border-white/5">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {charts.recentUsers?.map((user: any) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {user.name}
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.tier === "GOLD"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : user.tier === "SILVER"
                            ? "bg-slate-300/10 text-slate-300 border border-slate-300/20"
                            : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                        }`}
                      >
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!charts.recentUsers || charts.recentUsers.length === 0) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-white/30 italic"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Activity Log Section */}
      <div className="glass-premium rounded-[24px] overflow-hidden">
        <AdminActivityLog />
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ title, value, change, icon, color }: any) => (
  <div className="glass-premium p-6 rounded-[24px] shadow-2xl flex items-start justify-between group hover:scale-[1.02] transition-transform duration-300">
    <div>
      <p className="text-sm font-medium text-white/50 mb-1 uppercase tracking-wider">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
      {change && (
        <span
          className={`text-xs font-bold mt-1 block ${
            change.startsWith("+") ||
            change.includes("avg") ||
            change.includes("Redemptions")
              ? "text-emerald-400 drop-shadow-sm"
              : "text-red-400"
          }`}
        >
          {change}
        </span>
      )}
    </div>
    <div
      className={`p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner`}
    >
      {icon}
    </div>
  </div>
);

const ChartCard = ({ title, children, className = "" }: any) => (
  <div className={`glass-premium p-6 rounded-[24px] shadow-2xl ${className}`}>
    <h3 className="text-lg font-bold text-white mb-6 border-b border-white/10 pb-4">
      {title}
    </h3>
    {children}
  </div>
);

export default AnalyticsDashboard;
