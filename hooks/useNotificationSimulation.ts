import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDeals } from '../contexts/DealContext';
import { Deal } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const NOTIFIED_EXPIRING_DEALS_KEY = 'notified_expiring_deals';
const LAST_SEEN_DEAL_COUNT_KEY = 'last_seen_deal_count';

export const useNotificationSimulation = (
  showNotification: (title: string, options: NotificationOptions) => void,
  isSubscribed: boolean,
) => {
  const { user } = useAuth();
  const { deals } = useDeals();
  const { t, language } = useLanguage();
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!isSubscribed || !user || user.notificationPreferences?.generalNotifications === false) return;

    const checkNotifications = () => {
      // 1. Check for expiring saved deals
      if (user.notificationPreferences?.expiringDeals) {
        const savedDeals = user.savedDeals?.map(id => deals.find(d => d.id === id)).filter(Boolean) as Deal[];
        const notifiedDeals = JSON.parse(localStorage.getItem(NOTIFIED_EXPIRING_DEALS_KEY) || '{}');

        savedDeals.forEach(deal => {
          const now = new Date();
          const expiry = new Date(deal.expiresAt);
          const diffTime = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1 && !notifiedDeals[deal.id]) {
            const dealTitle = language === 'tr' ? deal.title_tr : deal.title;
            showNotification(
              t('expiringDealNotificationTitle'),
              { body: t('expiringDealNotificationBody', { dealTitle: dealTitle }) }
            );
            notifiedDeals[deal.id] = true;
            localStorage.setItem(NOTIFIED_EXPIRING_DEALS_KEY, JSON.stringify(notifiedDeals));
          }
        });
      }

      // 2. Check for new deals
      if (user.notificationPreferences?.newDeals && deals.length > 0) {
        const lastSeenCount = parseInt(localStorage.getItem(LAST_SEEN_DEAL_COUNT_KEY) || '0', 10);

        if (firstLoadRef.current) {
          // On first load, just set the count, don't notify
          localStorage.setItem(LAST_SEEN_DEAL_COUNT_KEY, deals.length.toString());
          firstLoadRef.current = false;
        } else if (deals.length > lastSeenCount) {
          const newestDeal = deals.reduce((a, b) => (parseInt(a.id) > parseInt(b.id) ? a : b));
          const dealTitle = language === 'tr' ? newestDeal.title_tr : newestDeal.title;
          showNotification(
            t('newDealNotificationTitle'),
            { body: dealTitle }
          );
          localStorage.setItem(LAST_SEEN_DEAL_COUNT_KEY, deals.length.toString());
        } else if (deals.length < lastSeenCount) {
          // Reset if deals are removed (e.g. admin deletes)
          localStorage.setItem(LAST_SEEN_DEAL_COUNT_KEY, deals.length.toString());
        }
      }
    };

    const intervalId = setInterval(checkNotifications, 15000); // Check every 15 seconds for demo

    return () => clearInterval(intervalId);

  }, [isSubscribed, user, deals, showNotification, t, language]);
};