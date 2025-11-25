import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AdBanner: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-24 left-0 right-0 h-16 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-30 border-t border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {t('advertisement')}
      </div>
    </div>
  );
};

export default AdBanner;
