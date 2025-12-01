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
            // 1. Check if code exists in redemptions table (if we store unique codes there)
            // OR check if code matches a deal's redemption code + user ID format
            // For this MVP, let's assume the QR code contains: "dealId:userId" or just a unique redemption ID

            // Let's assume the QR code format is JSON: { "dealId": "...", "userId": "..." }
            let dealId, userId;
            try {
                const parsed = JSON.parse(code);
                dealId = parsed.dealId;
                userId = parsed.userId;
            } catch (e) {
                // Fallback: try splitting by colon
                const parts = code.split(':');
                if (parts.length === 2) {
                    dealId = parts[0];
                    userId = parts[1];
                } else {
                    throw new Error('Invalid code format');
                }
            }

            // 2. Verify deal ownership (optional, if partners can only redeem their own deals)
            // const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).single();
            // if (deal.partner_id !== user.id) throw new Error('This deal does not belong to you.');

            // 3. Check if already redeemed
            // In a real app, we'd check a "redemptions" table. 
            // If we are just marking it as "used" now:

            const { data: redemption, error: redemptionError } = await supabase
                .from('redemptions')
                .insert({
                    deal_id: dealId,
                    user_id: userId,
                    redeemed_at: new Date().toISOString(),
                    // partner_id: user.id // Track who redeemed it
                })
                .select()
                .single();

            if (redemptionError) {
                if (redemptionError.code === '23505') { // Unique violation if we enforce one redemption per user per deal
                    throw new Error('This code has already been redeemed.');
                }
                throw redemptionError;
            }

            // 4. Update partner stats
            if (user) {
                // RPC call would be better here to atomic increment
                const { data: stats } = await supabase
                    .from('partner_stats')
                    .select('total_redemptions')
                    .eq('partner_id', user.id)
                    .single();

                if (stats) {
                    await supabase
                        .from('partner_stats')
                        .update({ total_redemptions: stats.total_redemptions + 1 })
                        .eq('partner_id', user.id);
                }
            }

            setVerificationStatus('success');
            setVerificationMessage('Deal successfully redeemed!');
            setRedeemedDeal({ id: dealId }); // Ideally fetch deal details to show title

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
