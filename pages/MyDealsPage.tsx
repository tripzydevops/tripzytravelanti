import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeals } from '../contexts/DealContext';
import { useLanguage } from '../contexts/LanguageContext';
import DealCard from '../components/DealCard';
import { BookmarkIcon } from '../components/Icons';

const MyDealsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { deals } = useDeals();

  const savedDealIds = new Set(user?.savedDeals || []);
  const savedDeals = deals.filter(deal => savedDealIds.has(deal.id));

  return (
    <div className="container mx-auto px-4 pt-6 pb-24">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-brand-text-light mb-2">{t('myDealsTitle')}</h1>
        <p className="text-lg text-gray-500 dark:text-brand-text-muted">{t('myDealsSubtitle')}</p>
      </header>

      {savedDeals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <BookmarkIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-brand-text-muted mb-4" />
          <p className="text-xl text-gray-500 dark:text-brand-text-muted">{t('noSavedDeals')}</p>
        </div>
      )}
    </div>
  );
};

export default MyDealsPage;
