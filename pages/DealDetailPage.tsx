```
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeals } from '../contexts/DealContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import MetaHead from '../components/MetaHead';
import { Deal } from '../types';
import DealDetailView from '../components/DealDetailView';
import { SpinnerIcon } from '../components/Icons';

const DealDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getDealById, rateDeal } = useDeals();
  const { t } = useLanguage();
  const { redeemDeal } = useAuth();
  const navigate = useNavigate();
  const { setChatbotVisible } = useLayout();

  const [fetchedDeal, setFetchedDeal] = useState<Deal | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setChatbotVisible(false);
    return () => {
      setChatbotVisible(true);
    };
  }, [setChatbotVisible]);

  useEffect(() => {
    const loadDeal = async () => {
      if (!id) return;

      // Try to find in context first
      const contextDeal = getDealById(id);
      if (contextDeal) {
        setFetchedDeal(contextDeal);
        setLoading(false);
        return;
      }

      // Fetch from Supabase if not in context
      try {
        setLoading(true);
        const { getDealById: fetchDeal } = await import('../lib/supabaseService');
        const deal = await fetchDeal(id);
        setFetchedDeal(deal || undefined);
      } catch (error) {
        console.error('Failed to fetch deal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeal();
  }, [id, getDealById]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-brand-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!id || !fetchedDeal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-brand-bg p-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('dealNotFound') || 'Deal Not Found'}</h2>
        <button
          onClick={() => navigate('/')}
          className="bg-brand-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          {t('backToHome') || 'Back to Home'}
        </button>
      </div>
    );
  }

  return (
    <>
      <MetaHead 
        title={fetchedDeal.title}
        description={fetchedDeal.description}
        image={fetchedDeal.imageUrl}
        url={`https://tripzy.app/deals/${fetchedDeal.id}`}
        type="article"
      />
      <DealDetailView
        deal={fetchedDeal}
        onRate={rateDeal}
        onRedeem={redeemDeal}
      />
    </>
  );
};

export default DealDetailPage;