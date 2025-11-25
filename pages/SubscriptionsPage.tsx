import React from 'react';
import { SUBSCRIPTION_PLANS } from '../constants';
import SubscriptionCard from '../components/SubscriptionCard';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SubscriptionTier } from '../types';

const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const currentUserTier = user ? user.tier : SubscriptionTier.NONE;

  return (
    <div className="py-12">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-brand-text-light mb-2">{t('subscriptionsTitle')}</h1>
          <p className="text-lg text-gray-500 dark:text-brand-text-muted">{t('subscriptionsSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {SUBSCRIPTION_PLANS.map(plan => (
            <SubscriptionCard
              key={plan.tier}
              plan={plan}
              isCurrent={currentUserTier === plan.tier}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
