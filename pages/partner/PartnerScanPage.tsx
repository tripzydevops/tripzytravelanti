import React, { useState } from 'react';
import QRScanner from '../../components/QRScanner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { CheckCircle, XCircle, Search } from 'lucide-react';

const PartnerScanPage: React.FC = () => {
    const { user } = useAuth();
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [verificationMessage, setVerificationMessage] = useState('');
    const [redeemedDeal, setRedeemedDeal] = useState<any>(null);

    const handleScan = (decodedText: string) => {
        if (verificationStatus === 'loading' || verificationStatus === 'success') return;
        setScanResult(decodedText);
        verifyCode(decodedText);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        verifyCode(manualCode.trim());
    };

    const verifyCode = async (code: string) => {
        setVerificationStatus('loading');
        setVerificationMessage('Verifying code...');
        setRedeemedDeal(null);

        try {
            // Parse the QR code - new format: { "wi": "wallet_item_id", "rc": "redemption_code" }
            // Also support legacy format: { "dealId": "...", "userId": "..." } or "dealId:userId"
            let walletItemId: string | null = null;
            let redemptionCode: string | null = null;

            try {
                const parsed = JSON.parse(code);
                if (parsed.wi && parsed.rc) {
                    // New secure format
                    walletItemId = parsed.wi;
                    redemptionCode = parsed.rc;
                } else if (parsed.walletItemId && parsed.redemptionCode) {
                    // Alternative new format
                    walletItemId = parsed.walletItemId;
                    redemptionCode = parsed.redemptionCode;
                } else if (parsed.dealId && parsed.userId) {
                    // Legacy format - can't use new system
                    throw new Error('Legacy QR code format. Please have user regenerate their QR code.');
                }
            } catch (parseError: any) {
                // Try splitting by colon for legacy format
                const parts = code.split(':');
                if (parts.length === 2) {
                    throw new Error('Legacy code format. Please have user regenerate their QR code.');
                }
                // Maybe it's just the redemption code directly
                redemptionCode = code.toUpperCase();
            }

            if (!walletItemId && redemptionCode) {
                // User entered just the redemption code - look it up
                const { data: item, error: lookupError } = await supabase
                    .from('wallet_items')
                    .select('id')
                    .eq('redemption_code', redemptionCode)
                    .eq('status', 'active')
                    .single();

                if (lookupError || !item) {
                    throw new Error('Invalid or expired redemption code.');
                }
                walletItemId = item.id;
            }

            if (!walletItemId || !redemptionCode) {
                throw new Error('Invalid code format. Please scan a valid QR code.');
            }

            // Call the secure redemption service
            const { redeemWalletItem } = await import('../../lib/supabaseService');
            const result = await redeemWalletItem(walletItemId, redemptionCode, user?.id);

            if (result.requiresConfirmation) {
                // High-value deal - waiting for user confirmation
                setVerificationStatus('loading');
                setVerificationMessage('Waiting for user to confirm on their device... (60 seconds)');

                // Poll for confirmation (simple approach)
                let attempts = 0;
                const pollInterval = setInterval(async () => {
                    attempts++;
                    const { data: updated } = await supabase
                        .from('wallet_items')
                        .select('status')
                        .eq('id', walletItemId)
                        .single();

                    if (updated?.status === 'redeemed') {
                        clearInterval(pollInterval);
                        setVerificationStatus('success');
                        setVerificationMessage('Deal confirmed and redeemed!');
                        setRedeemedDeal(result.dealInfo);
                    } else if (attempts >= 30) { // 30 * 2s = 60s timeout
                        clearInterval(pollInterval);
                        setVerificationStatus('error');
                        setVerificationMessage('User did not confirm in time. Please try again.');
                    }
                }, 2000);

                return;
            }

            if (!result.success) {
                throw new Error(result.message);
            }

            // Update partner stats (optional, for tracking)
            if (user) {
                const { data: stats } = await supabase
                    .from('partner_stats')
                    .select('total_redemptions')
                    .eq('partner_id', user.id)
                    .single();

                if (stats) {
                    await supabase
                        .from('partner_stats')
                        .update({ total_redemptions: (stats.total_redemptions || 0) + 1 })
                        .eq('partner_id', user.id);
                }
            }

            setVerificationStatus('success');
            setVerificationMessage(result.message);
            setRedeemedDeal(result.dealInfo);

        } catch (error: any) {
            console.error('Verification failed:', error);
            setVerificationStatus('error');
            setVerificationMessage(error.message || 'Invalid code or verification failed.');
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setManualCode('');
        setVerificationStatus('idle');
        setVerificationMessage('');
        setRedeemedDeal(null);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Redeem Deal</h2>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                    {verificationStatus === 'idle' && (
                        <>
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">Scan QR Code</h3>
                                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 relative">
                                    <QRScanner onScan={handleScan} onError={(err) => console.error(err)} />
                                    {/* Overlay text if camera not active */}
                                    <p className="absolute text-gray-400 text-sm pointer-events-none">Camera View</p>
                                </div>
                            </div>

                            <div className="relative flex py-5 items-center">
                                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400">OR</span>
                                <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
                            </div>

                            <form onSubmit={handleManualSubmit} className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Enter Redemption Code
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="e.g. DEAL-123-USER-456"
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center"
                                    >
                                        <Search className="w-4 h-4 mr-2" />
                                        Verify
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {verificationStatus === 'loading' && (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto mb-4"></div>
                            <p className="text-lg text-gray-600 dark:text-gray-300">Verifying redemption code...</p>
                        </div>
                    )}

                    {verificationStatus === 'success' && (
                        <div className="text-center py-8">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Redemption Successful!</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-8">{verificationMessage}</p>

                            <button
                                onClick={resetScan}
                                className="px-8 py-3 bg-brand-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-semibold"
                            >
                                Scan Another
                            </button>
                        </div>
                    )}

                    {verificationStatus === 'error' && (
                        <div className="text-center py-8">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h3>
                            <p className="text-red-600 dark:text-red-400 mb-8">{verificationMessage}</p>

                            <button
                                onClick={resetScan}
                                className="px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PartnerScanPage;
