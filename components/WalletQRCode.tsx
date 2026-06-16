import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';

interface WalletQRCodeProps {
    walletItemId: string;
    redemptionCode: string;
    dealTitle?: string;
    size?: number;
}

/**
 * Displays a rotating/dynamic QR code for a wallet item to prevent screenshot sharing.
 * The QR rotates every 45s and encodes: { "wi": walletItemId, "token": rotatingToken }
 * Falls back to static code on failure.
 */
const WalletQRCode: React.FC<WalletQRCodeProps> = ({
    walletItemId,
    redemptionCode,
    dealTitle,
    size = 200
}) => {
    const [token, setToken] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(45);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const timerRef = useRef<number | null>(null);
    const isMounted = useRef<boolean>(true);

    const fetchDynamicToken = async () => {
        if (!isMounted.current) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('generate-qr-token', {
                body: { walletItemId }
            });

            if (invokeError) throw invokeError;
            if (!data || !data.token) throw new Error('Invalid token response');

            if (isMounted.current) {
                setToken(data.token);
                // Calculate seconds until expiration (TTL: 60s, we rotate at 45s to be safe)
                const expiryTime = new Date(data.expiresAt).getTime();
                const now = Date.now();
                const secondsLeft = Math.max(5, Math.floor((expiryTime - now) / 1000) - 5); // minus 5s buffer
                setTimeLeft(secondsLeft);
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Error fetching dynamic QR token:', err);
            if (isMounted.current) {
                setError(err.message || 'Failed to generate secure token');
                setToken(null); // Force fallback to static
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchDynamicToken();

        // Tick down every second
        timerRef.current = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Time up, fetch new token
                    fetchDynamicToken();
                    return 45;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            isMounted.current = false;
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [walletItemId]);

    // Construct QR Payload
    // Dynamic token payload format: { wi: "wallet_item_id", token: "rotating_token_string" }
    // Fallback static format: { wi: "wallet_item_id", rc: "redemption_code" }
    const qrPayload = token
        ? JSON.stringify({ wi: walletItemId, token })
        : JSON.stringify({ wi: walletItemId, rc: redemptionCode });

    return (
        <div className="flex flex-col items-center p-6 glass-premium rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
            {/* QR Code Frame */}
            <div className="relative p-4 bg-white rounded-2xl shadow-inner border border-gray-100 flex items-center justify-center">
                <QRCodeSVG
                    value={qrPayload}
                    size={size}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor="#0c0c0d"
                />
                
                {/* Visual loading overlay for rotation */}
                {loading && token && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl backdrop-blur-[1px]">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* Rotation Countdown Indicator */}
            {!error && (
                <div className="mt-4 flex items-center space-x-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800/80">
                    <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${loading ? 'bg-amber-400' : ''}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ${loading ? 'bg-amber-500' : ''}`}></span>
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {loading ? 'Securing...' : `Secured (Rotates in ${timeLeft}s)`}
                    </span>
                </div>
            )}

            {/* Error Fallback Banner */}
            {error && (
                <div className="mt-3 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium text-center">
                    Offline Mode (Showing static verification code)
                </div>
            )}

            {/* Code Entry Helper */}
            <div className="mt-5 text-center w-full">
                <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1 font-semibold">Your Redemption Code</p>
                <p className="text-3xl font-bold tracking-widest text-primary-600 dark:text-primary-400 font-mono select-all bg-gray-50 dark:bg-gray-850 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800/60 shadow-sm inline-block">
                    {redemptionCode}
                </p>
            </div>

            {/* Deal Title */}
            {dealTitle && (
                <p className="mt-4 text-sm font-semibold text-gray-700 dark:text-gray-200 text-center max-w-xs truncate">
                    {dealTitle}
                </p>
            )}

            {/* Instructions */}
            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 text-center max-w-xs leading-relaxed">
                Ask the vendor to scan this code, or read them the 6-character alphanumeric code above.
            </p>
        </div>
    );
};

export default WalletQRCode;
