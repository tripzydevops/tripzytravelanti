import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUBSCRIPTION_PLANS } from '../constants';
import { SubscriptionTier } from '../types';
import { CheckCircle, CreditCardIcon, Lock } from '../components/Icons';

const CheckoutPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, updateTier } = useAuth();
    const { t, language } = useLanguage();

    const tierParam = searchParams.get('tier') as SubscriptionTier;
    const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.tier === tierParam);

    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'iyzico'>('stripe');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [nameOnCard, setNameOnCard] = useState('');

    useEffect(() => {
        if (!selectedPlan || !user) {
            navigate('/subscriptions');
        }
    }, [selectedPlan, user, navigate]);

    if (!selectedPlan || !user) return null;

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        // Simulate API call delay
        setTimeout(async () => {
            try {
                await updateTier(selectedPlan.tier);
                navigate('/payment-success', { state: { planName: language === 'tr' ? selectedPlan.name_tr : selectedPlan.name } });
            } catch (error) {
                console.error('Payment failed:', error);
                setIsProcessing(false);
            }
        }, 2000);
    };

    const planName = language === 'tr' ? selectedPlan.name_tr : selectedPlan.name;
    const planPrice = language === 'tr' ? selectedPlan.price_tr : selectedPlan.price;
    const currencySymbol = language === 'tr' ? '₺' : '$';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-brand-bg py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">{t('checkoutTitle') || 'Checkout'}</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Order Summary */}
                    <div className="md:col-span-1 order-2 md:order-1">
                        <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('orderSummary') || 'Order Summary'}</h2>
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">{planName}</h3>
                                    <p className="text-sm text-gray-500 dark:text-brand-text-muted">{t('monthlySubscription') || 'Monthly Subscription'}</p>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">{currencySymbol}{planPrice}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
                                <span>{t('total') || 'Total'}</span>
                                <span>{currencySymbol}{planPrice}</span>
                            </div>

                            <div className="mt-6">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('planFeatures') || 'What\'s included:'}</h4>
                                <ul className="space-y-2">
                                    {(language === 'tr' ? selectedPlan.features_tr : selectedPlan.features).map((feature, idx) => (
                                        <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-brand-text-muted">
                                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div className="md:col-span-2 order-1 md:order-2">
                        <div className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('paymentDetails') || 'Payment Details'}</h2>

                            {/* Payment Method Selector */}
                            <div className="flex gap-4 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('stripe')}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${paymentMethod === 'stripe'
                                            ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <CreditCardIcon className="w-5 h-5 text-gray-700 dark:text-white" />
                                    <span className="font-medium text-gray-900 dark:text-white">Credit Card (Stripe)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('iyzico')}
                                    className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${paymentMethod === 'iyzico'
                                            ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                >
                                    <span className="font-bold text-blue-600 dark:text-blue-400">iyzico</span>
                                    <span className="font-medium text-gray-900 dark:text-white">Secure Payment</span>
                                </button>
                            </div>

                            <form onSubmit={handlePayment} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                                        {t('nameOnCard') || 'Name on Card'}
                                    </label>
                                    <input
                                        type="text"
                                        value={nameOnCard}
                                        onChange={(e) => setNameOnCard(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                                        {t('cardNumber') || 'Card Number'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                                            maxLength={19}
                                            required
                                            className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                            placeholder="0000 0000 0000 0000"
                                        />
                                        <CreditCardIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                                            {t('expiryDate') || 'Expiry Date'}
                                        </label>
                                        <input
                                            type="text"
                                            value={expiry}
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '');
                                                if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                                                setExpiry(v);
                                            }}
                                            maxLength={5}
                                            required
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                            placeholder="MM/YY"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-brand-text-light mb-1">
                                            {t('cvc') || 'CVC'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cvc}
                                                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                                                maxLength={3}
                                                required
                                                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                                                placeholder="123"
                                            />
                                            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                                {t('processing') || 'Processing...'}
                                            </>
                                        ) : (
                                            <>
                                                {t('payNow') || 'Pay Now'} {currencySymbol}{planPrice}
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-center text-gray-500 dark:text-brand-text-muted mt-4 flex items-center justify-center">
                                        <Lock className="w-3 h-3 mr-1" />
                                        {t('securePayment') || 'Payments are secure and encrypted'}
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
