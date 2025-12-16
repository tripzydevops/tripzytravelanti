import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { confirmRedemption } from '../lib/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, XCircle } from 'lucide-react';

interface RedemptionConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletItemId: string;
    confirmationToken: string;
    dealTitle?: string;
}

/**
 * Modal that appears when vendor tries to redeem a high-value deal
 * User must confirm within 60 seconds
 */
const RedemptionConfirmationModal: React.FC<RedemptionConfirmationModalProps> = ({
    isOpen,
    onClose,
    walletItemId,
    confirmationToken,
    dealTitle
}) => {
    const { t, language } = useLanguage();
    const [status, setStatus] = useState<'pending' | 'confirming' | 'success' | 'error'>('pending');
    const [message, setMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    // Countdown timer
    useEffect(() => {
        if (!isOpen || status !== 'pending') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setStatus('error');
                    setMessage(language === 'tr' ? 'Süre doldu. Lütfen tekrar deneyin.' : 'Time expired. Please try again.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, status, language]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setStatus('pending');
            setMessage('');
            setTimeLeft(60);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setStatus('confirming');

        try {
            const result = await confirmRedemption(walletItemId, confirmationToken);

            if (result.success) {
                setStatus('success');
                setMessage(result.message);
            } else {
                setStatus('error');
                setMessage(result.message);
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'Confirmation failed');
        }
    };

    const handleDeny = () => {
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={status === 'pending' ? handleDeny : onClose}
            title={language === 'tr' ? 'Kullanım Onayı' : 'Confirm Redemption'}
        >
            <div className="p-6 text-center">
                {status === 'pending' && (
                    <>
                        {/* Timer */}
                        <div className="mb-6">
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-bold ${timeLeft <= 10
                                    ? 'bg-red-100 text-red-600 animate-pulse'
                                    : 'bg-gold-100 text-gold-600'
                                }`}>
                                {timeLeft}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                {language === 'tr' ? 'saniye' : 'seconds'}
                            </p>
                        </div>

                        {/* Deal info */}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {language === 'tr' ? 'Bu fırsatı kullanmak istiyor musunuz?' : 'Do you want to redeem this deal?'}
                        </h3>
                        {dealTitle && (
                            <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">
                                "{dealTitle}"
                            </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {language === 'tr'
                                ? 'Bir satıcı bu fırsatı kullanmak istiyor. Onay verirseniz, fırsat kullanılmış sayılacaktır.'
                                : 'A vendor is trying to redeem this deal. If you confirm, the deal will be marked as used.'}
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleDeny}
                                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                {language === 'tr' ? 'Hayır' : 'Deny'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" />
                                {language === 'tr' ? 'Onayla' : 'Confirm'}
                            </button>
                        </div>
                    </>
                )}

                {status === 'confirming' && (
                    <div className="py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-300">
                            {language === 'tr' ? 'Onaylanıyor...' : 'Confirming...'}
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {language === 'tr' ? 'Başarılı!' : 'Success!'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                        <button
                            onClick={onClose}
                            className="w-full bg-gradient-to-r from-gold-500 to-gold-600 text-white font-bold py-3 px-6 rounded-xl"
                        >
                            {language === 'tr' ? 'Kapat' : 'Close'}
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-8">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {language === 'tr' ? 'Hata' : 'Error'}
                        </h3>
                        <p className="text-red-600 dark:text-red-400 mb-6">{message}</p>
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-bold py-3 px-6 rounded-xl"
                        >
                            {language === 'tr' ? 'Kapat' : 'Close'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default RedemptionConfirmationModal;
