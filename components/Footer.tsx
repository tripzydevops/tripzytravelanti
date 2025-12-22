
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-brand-bg border-t border-white/10 text-white mt-12 backdrop-blur-md">
      <div className="container mx-auto px-6 py-4 text-center">
        <div className="flex justify-center space-x-6 mb-4">
          <a href="/privacy" className="hover:text-brand-primary transition-colors text-sm">{t('privacyPolicyLink') || 'Privacy Policy'}</a>
          <a href="/terms" className="hover:text-brand-primary transition-colors text-sm">{t('termsOfService') || 'Terms of Service'}</a>
          <a href="/faq" className="hover:text-brand-primary transition-colors text-sm">{t('helpCenter') || 'Q&A'}</a>
        </div>
        <p className="text-sm opacity-70">{t('footerText') || '© 2025 Tripzy. All rights reserved.'}</p>
      </div>
    </footer>
  );
};

export default Footer;
