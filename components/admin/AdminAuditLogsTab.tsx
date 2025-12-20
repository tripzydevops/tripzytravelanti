import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useLanguage } from '../../contexts/LanguageContext';
import { SkeletonBase } from '../SkeletonLoaders';
import { History, User, Terminal, Calendar } from 'lucide-react';

interface AuditLog {
    id: string;
    action_type: string;
    table_name: string;
    record_id: string;
    old_data: any;
    new_data: any;
    created_at: string;
    profiles: {
        email: string;
        name: string;
    };
}

const AdminAuditLogsTab: React.FC = () => {
    const { t } = useLanguage();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*, profiles(email, name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching audit logs:', error);
        } else {
            setLogs(data || []);
        }
        setLoading(false);
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'text-green-500 bg-green-500/10';
            case 'UPDATE': return 'text-blue-500 bg-blue-500/10';
            case 'DELETE': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <SkeletonBase key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <History className="w-6 h-6 text-brand-primary" />
                    Admin Audit Trail
                </h2>
                <button
                    onClick={fetchLogs}
                    className="text-sm text-brand-primary hover:underline"
                >
                    Refresh Logs
                </button>
            </div>

            <div className="bg-white dark:bg-brand-surface rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Admin</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Target</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-brand-primary" />
                                            <div className="text-sm">
                                                <div className="font-medium dark:text-white">{log.profiles?.name || 'Unknown'}</div>
                                                <div className="text-xs text-brand-text-muted">{log.profiles?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getActionColor(log.action_type)}`}>
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs">{log.table_name}</span>
                                            <span className="text-[10px] text-brand-text-muted truncate max-w-[100px]">ID: {log.record_id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <button
                                            onClick={() => console.log('Show diff', log)}
                                            className="text-brand-primary hover:underline text-xs"
                                        >
                                            View Changes
                                        </button>
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

export default AdminAuditLogsTab;
