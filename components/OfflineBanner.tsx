import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useDeals } from '../contexts/DealContext';
import { useAuth } from '../contexts/AuthContext';

const OfflineBanner: React.FC = () => {
    const isOnline = useOnlineStatus();
    const { refreshDeals } = useDeals();
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setVisible(true);
        } else {
            // Show a brief reconnection indicator before hiding
            if (visible) {
                setReconnecting(true);
                const timer = setTimeout(() => {
                    setVisible(false);
                    setReconnecting(false);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isOnline, visible]);

    const handleManualRefresh = async () => {
        if (!isOnline) return;
        setReconnecting(true);
        try {
            await refreshDeals();
        } catch (err) {
            console.error('Failed to refresh data:', err);
        } finally {
            setReconnecting(false);
            setVisible(false);
        }
    };

    if (!visible) return null;

    return (
        <div 
            className={`w-full z-[9999] transition-all duration-500 ease-in-out transform ${
                reconnecting 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-[0_2px_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-gradient-to-r from-amber-600 to-orange-700 shadow-[0_2px_15px_rgba(245,158,11,0.3)]'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-white text-xs font-semibold tracking-wide">
                <div className="flex items-center space-x-2">
                    {reconnecting ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-100" />
                    ) : (
                        <WifiOff className="w-4 h-4 animate-bounce text-amber-100" />
                    )}
                    <span>
                        {reconnecting 
                            ? 'Connection restored! Syncing latest travel deals...' 
                            : 'Offline Mode — Browsing locally cached deals & wallet. Transactions will sync online.'
                        }
                    </span>
                </div>
                
                {isOnline && !reconnecting && (
                    <button
                        onClick={handleManualRefresh}
                        className="flex items-center space-x-1 bg-white/20 hover:bg-white/35 active:scale-95 border border-white/20 px-2.5 py-1 rounded-full transition-all duration-200"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sync Now</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default OfflineBanner;
