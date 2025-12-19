import React, { useEffect, useState } from 'react';
import { getGlobalActivityLog, ActivityLogItem } from '../../lib/supabaseService';
import {
    UsersIcon,
    TicketIcon,
    CreditCardIcon,
    SpinnerIcon,
    TrendingUpIcon
} from '../Icons';

const AdminActivityLog: React.FC = () => {
    const [activities, setActivities] = useState<ActivityLogItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await getGlobalActivityLog(30);
            setActivities(data);
            setLoading(false);
        };

        fetchLogs();
        // Polling every 30 seconds for live updates
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'joined':
                return <UsersIcon className="w-4 h-4 text-blue-500" />;
            case 'deal_redeemed':
                return <TicketIcon className="w-4 h-4 text-orange-500" />;
            case 'subscription_payment':
                return <CreditCardIcon className="w-4 h-4 text-green-500" />;
            default:
                return <TrendingUpIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' +
            date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <SpinnerIcon className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-brand-surface rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-brand-text-light flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5 text-brand-primary" />
                    Live Activity Feed
                </h3>
                <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full animate-pulse">
                    Live
                </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto scrollbar-hide">
                {activities.length > 0 ? (
                    <div className="divide-y divide-gray-50 dark:divide-white/5">
                        {activities.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex gap-4">
                                <div className="mt-1 flex-shrink-0">
                                    <div className="bg-gray-100 dark:bg-brand-bg p-2 rounded-lg">
                                        {getIcon(item.type)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-brand-text-light">
                                        {item.description}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-brand-text-muted mt-0.5">
                                        {formatDate(item.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500 dark:text-brand-text-muted text-sm italic">
                        No recent activity recorded.
                    </div>
                )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-brand-bg/50 border-t border-gray-100 dark:border-white/5">
                <button
                    onClick={async () => {
                        setLoading(true);
                        setActivities(await getGlobalActivityLog(30));
                        setLoading(false);
                    }}
                    className="text-xs font-semibold text-brand-primary hover:underline w-full text-center"
                >
                    View All Activity
                </button>
            </div>
        </div>
    );
};

export default AdminActivityLog;
