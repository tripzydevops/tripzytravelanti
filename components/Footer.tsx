
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Instagram } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-brand-dark text-white mt-12 pb-16 md:pb-6">
      <div className="container mx-auto px-6 py-6 text-center space-y-4">
        <div className="flex justify-center items-center space-x-6">
          <a href="/privacy" className="hover:text-brand-primary transition-colors text-sm">{t('privacyPolicyLink') || 'Privacy Policy'}</a>
          <a href="/terms" className="hover:text-brand-primary transition-colors text-sm">{t('termsOfService') || 'Terms of Service'}</a>
          <a href="/faq" className="hover:text-brand-primary transition-colors text-sm">{t('helpCenter') || 'Q&A'}</a>
          <a
            href="https://instagram.com/tripzydeal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors font-medium"
            title="Follow @tripzydeal on Instagram"
          >
            <Instagram className="w-4 h-4" />
            <span>@tripzydeal</span>
          </a>
        </div>
        <p className="text-xs opacity-70">{t('footerText') || '© 2026 Tripzy. All rights reserved.'}</p>
      </div>
    </footer>
  );
};

export default Footer;
