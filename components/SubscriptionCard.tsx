import React from 'react';
import { SubscriptionPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from './Icons';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  isCurrent: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ plan, isCurrent }) => {
  const { user, updateTier } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const handleSubscribe = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(`/checkout?tier=${plan.tier}`);
    }
  };

  const name = language === 'tr' ? plan.name_tr : plan.name;
  const features = language === 'tr' ? plan.features_tr : plan.features;
  const price = language === 'tr' ? plan.price_tr : plan.price;
  const currencySymbol = language === 'tr' ? '₺' : '$';

  return (
    <div className={`border-2 p-6 rounded-lg shadow-lg flex flex-col bg-white dark:bg-brand-surface ${isCurrent ? 'border-brand-primary scale-105' : 'border-gray-200 dark:border-transparent'}`}>
      <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-brand-text-light mb-2">{name}</h3>
      <p className="text-4xl font-extrabold text-center text-brand-primary mb-4">{currencySymbol}{price}<span className="text-lg font-medium text-gray-500 dark:text-brand-text-muted">/year</span></p>
      <ul className="space-y-3 mb-6 flex-grow">
        <li className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-1" />
          <span className="text-gray-600 dark:text-brand-text-muted">
            {plan.redemptionsPerMonth === Infinity
              ? <strong>{t('unlimitedDealRedemptions')}</strong>
              : <><strong>{plan.redemptionsPerMonth}</strong> {t('dealRedemptions')}</>
            }
          </span>
        </li>
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-1" />
            <span className="text-gray-600 dark:text-brand-text-muted">{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSubscribe}
        disabled={isCurrent}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors duration-300 ${isCurrent
          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
          : 'bg-brand-primary hover:bg-opacity-80'
          }`}
      >
        {isCurrent ? t('currentPlan') : t('subscribe')}
      </button>
    </div>
  );
};

export default SubscriptionCard;