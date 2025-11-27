import React from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionCard from '../components/SubscriptionCard';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useContent } from '../contexts/ContentContext';
import { SubscriptionTier } from '../types';

const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { getContent } = useContent();
  const currentUserTier = user ? user.tier : SubscriptionTier.NONE;

  const { plans, isLoading } = useSubscription();

  const headerTitle = getContent('subscriptions', 'header', 'title');
  const headerSubtitle = getContent('subscriptions', 'header', 'subtitle');

  const displayTitle = language === 'tr' ? (headerTitle?.content_value_tr || headerTitle?.content_value) : headerTitle?.content_value;
  const displaySubtitle = language === 'tr' ? (headerSubtitle?.content_value_tr || headerSubtitle?.content_value) : headerSubtitle?.content_value;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-brand-text-light mb-2">{displayTitle || t('subscriptionsTitle')}</h1>
          <p className="text-lg text-gray-500 dark:text-brand-text-muted">{displaySubtitle || t('subscriptionsSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map(plan => (
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
