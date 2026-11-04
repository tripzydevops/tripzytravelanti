import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SkeletonBase } from '../SkeletonLoaders';
import { 
    ShieldAlert, 
    CheckCircle, 
    AlertTriangle, 
    MapPin, 
    User, 
    Clock, 
    Check, 
    ShieldCheck,
    SlidersHorizontal,
    Bell,
    DollarSign,
    Save
} from 'lucide-react';

interface FraudSignal {
    id: string;
    user_id: string;
    vendor_id: string;
    wallet_item_id: string;
    signal_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: {
        distance_meters?: number;
        vendor_latitude?: number;
        vendor_longitude?: number;
        message?: string;
    };
    is_resolved: boolean;
    resolved_at: string | null;
    created_at: string;
    user_profile?: {
        name: string;
        email: string;
    } | null;
    vendor_profile?: {
        name: string;
        email: string;
    } | null;
    resolver_profile?: {
        name: string;
    } | null;
}

const AdminFraudSignalsTab: React.FC = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [signals, setSignals] = useState<FraudSignal[]>([]);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    // Live Geofence & Recommendation Engine Governance State
    const [matchThreshold, setMatchThreshold] = useState<number>(() => {
        const saved = localStorage.getItem('tripzy_geofence_threshold');
        return saved ? parseFloat(saved) : 0.85;
    });
    const [geofenceRadius, setGeofenceRadius] = useState<number>(() => {
        const saved = localStorage.getItem('tripzy_geofence_radius');
        return saved ? parseInt(saved, 10) : 500;
    });
    const [cooldownHours, setCooldownHours] = useState<number>(() => {
        const saved = localStorage.getItem('tripzy_cooldown_hours');
        return saved ? parseInt(saved, 10) : 24;
    });
    const [adminCurrency, setAdminCurrency] = useState<'TRY' | 'USD'>(() => {
        return (localStorage.getItem('tripzy_admin_currency') as 'TRY' | 'USD') || 'TRY';
    });
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleSaveSettings = () => {
        localStorage.setItem('tripzy_geofence_threshold', matchThreshold.toString());
        localStorage.setItem('tripzy_geofence_radius', geofenceRadius.toString());
        localStorage.setItem('tripzy_cooldown_hours', cooldownHours.toString());
        localStorage.setItem('tripzy_admin_currency', adminCurrency);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
    };

    useEffect(() => {
        fetchSignals();
    }, []);

    const fetchSignals = async () => {
        setLoading(true);
        try {
            // Fetch fraud signals joining profiles for user, vendor, and resolver
            const { data, error } = await supabase
                .from('fraud_signals')
                .select(`
                    *,
                    user_profile:profiles!user_id(name, email),
                    vendor_profile:profiles!vendor_id(name, email),
                    resolver_profile:profiles!resolved_by(name)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching fraud signals:', error);
            } else {
                // Parse potential format issues
                setSignals(data || []);
            }
        } catch (err) {
            console.error('Failed to load fraud signals:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (signalId: string) => {
        if (!user) return;
        setResolvingId(signalId);
        try {
            const { error } = await supabase
                .from('fraud_signals')
                .update({
                    is_resolved: true,
                    resolved_by: user.id,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', signalId);

            if (error) {
                alert('Failed to resolve signal: ' + error.message);
            } else {
                // Refresh list locally
                setSignals(prev => prev.map(sig => {
                    if (sig.id === signalId) {
                        return {
                            ...sig,
                            is_resolved: true,
                            resolved_at: new Date().toISOString(),
                            resolver_profile: { name: user.name || 'Admin' }
                        };
                    }
                    return sig;
                }));
            }
        } catch (err) {
            console.error('Error resolving signal:', err);
        } finally {
            setResolvingId(null);
        }
    };

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'high':
                return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'medium':
                return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            default:
                return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    const formatDistance = (meters?: number) => {
        if (meters === undefined) return 'N/A';
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(2)} km`;
    };

    // Calculate metrics
    const totalCount = signals.length;
    const unresolvedCount = signals.filter(s => !s.is_resolved).length;
    const highSeverityCount = signals.filter(s => !s.is_resolved && (s.severity === 'high' || s.severity === 'critical')).length;
    const resolvedCount = signals.filter(s => s.is_resolved).length;

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
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-orange-500 animate-pulse" />
                    Security Alerts & Geofence Violations
                </h2>
                <button
                    onClick={fetchSignals}
                    className="text-sm font-semibold text-brand-primary hover:underline"
                >
                    Refresh Alerts
                </button>
            </div>

            {/* Live Recommendation Engine & Geofence Governance */}
            <div className="p-5 bg-gradient-to-br from-gray-900 to-slate-900 border border-white/10 rounded-2xl shadow-xl text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                        <div>
                            <h3 className="font-bold text-sm text-white">Recommendation & Geofence Governance Controls</h3>
                            <p className="text-xs text-gray-400">Live configuration for push notification match thresholds, radius, and currency</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Currency Toggle */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setAdminCurrency('TRY')}
                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${adminCurrency === 'TRY' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                ₺ TRY
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdminCurrency('USD')}
                                className={`px-2.5 py-1 rounded-md font-bold transition-all ${adminCurrency === 'USD' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                $ USD
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveSettings}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saveSuccess ? 'Saved!' : 'Apply Settings'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                    {/* 1. Match Score Threshold */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-300">Push Match Threshold ($P \ge 0.85$)</span>
                            <span className="font-mono font-bold text-amber-400 text-sm">{matchThreshold.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.50"
                            max="0.99"
                            step="0.01"
                            value={matchThreshold}
                            onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                        />
                        <p className="text-[11px] text-gray-400">
                            Formula: <span className="font-mono text-gray-300">P = 0.4·Ccat + 0.3·boost + 0.3·rating</span>
                        </p>
                    </div>

                    {/* 2. Geofence Radius */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-300">Geofence Trigger Radius</span>
                            <span className="font-mono font-bold text-cyan-400 text-sm">{geofenceRadius} m</span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="3000"
                            step="50"
                            value={geofenceRadius}
                            onChange={(e) => setGeofenceRadius(parseInt(e.target.value, 10))}
                            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                        />
                        <p className="text-[11px] text-gray-400">
                            Client-side Haversine breach distance detection zone.
                        </p>
                    </div>

                    {/* 3. Push Notification Cooldown */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-300">Push Cooldown Policy</span>
                            <span className="font-mono font-bold text-rose-400 text-sm">{cooldownHours} Hours</span>
                        </div>
                        <input
                            type="range"
                            min="6"
                            max="72"
                            step="6"
                            value={cooldownHours}
                            onChange={(e) => setCooldownHours(parseInt(e.target.value, 10))}
                            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                        />
                        <p className="text-[11px] text-gray-400">
                            Prevents duplicate notifications for the same zone.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/5 rounded-2xl">
                    <span className="text-xs text-gray-400 font-medium">Total Signals</span>
                    <div className="text-2xl font-bold dark:text-white mt-1">{totalCount}</div>
                </div>
                <div className="p-4 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/5 rounded-2xl">
                    <span className="text-xs text-amber-500 font-medium">Unresolved Warnings</span>
                    <div className="text-2xl font-bold text-amber-500 mt-1">{unresolvedCount}</div>
                </div>
                <div className="p-4 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/5 rounded-2xl">
                    <span className="text-xs text-red-500 font-medium">Active High/Critical Blocks</span>
                    <div className="text-2xl font-bold text-red-500 mt-1">{highSeverityCount}</div>
                </div>
                <div className="p-4 bg-white dark:bg-brand-surface border border-gray-200 dark:border-white/5 rounded-2xl">
                    <span className="text-xs text-emerald-500 font-medium">Resolved Alerts</span>
                    <div className="text-2xl font-bold text-emerald-500 mt-1">{resolvedCount}</div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-brand-surface rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    {signals.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            No security warnings or geofence breaches found. All systems normal.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date/Time</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Target User</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Merchant/Scanner</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type / Severity</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Violation Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Resolution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {signals.map((sig) => (
                                    <tr key={sig.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        {/* Date/Time */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                {new Date(sig.created_at).toLocaleString()}
                                            </div>
                                        </td>

                                        {/* User */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{sig.user_profile?.name || 'Unknown User'}</span>
                                                <span className="text-xs text-gray-400">{sig.user_profile?.email || 'N/A'}</span>
                                            </div>
                                        </td>

                                        {/* Scanner/Vendor */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{sig.vendor_profile?.name || 'Unknown Vendor'}</span>
                                                <span className="text-xs text-gray-400">{sig.vendor_profile?.email || 'N/A'}</span>
                                            </div>
                                        </td>

                                        {/* Type & Severity */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1.5">
                                                <span className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-tighter">
                                                    {sig.signal_type.replace(/_/g, ' ')}
                                                </span>
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getSeverityStyles(sig.severity)}`}>
                                                    {sig.severity}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Violation Details */}
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {sig.details?.distance_meters !== undefined ? (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-amber-500" />
                                                    <span>Outside bounds by <strong>{formatDistance(sig.details.distance_meters)}</strong></span>
                                                </div>
                                            ) : (
                                                <span>{sig.details?.message || 'Verification details missing'}</span>
                                            )}
                                        </td>

                                        {/* Resolution */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {sig.is_resolved ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Resolved by {sig.resolver_profile?.name || 'Admin'}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleResolve(sig.id)}
                                                    disabled={resolvingId === sig.id}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    <span>{resolvingId === sig.id ? 'Resolving...' : 'Resolve Alert'}</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminFraudSignalsTab;
