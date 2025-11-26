import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle } from '../components/Icons';
import confetti from 'canvas-confetti';

const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const [countdown, setCountdown] = useState(10);

    const planName = location.state?.planName || 'Premium Plan';

    useEffect(() => {
        // Fire confetti
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/profile');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg flex items-center justify-center p-4">
            <div className="bg-white dark:bg-brand-surface p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('paymentSuccessful') || 'Payment Successful!'}</h1>
                <p className="text-gray-600 dark:text-brand-text-muted mb-8">
                    {t('paymentSuccessMessage', { plan: planName }) || `You have successfully upgraded to ${planName}.`}
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                        {t('goToProfile') || 'Go to Profile'}
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        {t('backToHome') || 'Back to Home'}
                    </button>
                </div>

                <p className="text-sm text-gray-400 dark:text-gray-500 mt-6">
                    {t('redirectingIn', { seconds: countdown }) || `Redirecting in ${countdown} seconds...`}
                </p>
            </div>
        </div>
    );
};

export default PaymentSuccessPage;
