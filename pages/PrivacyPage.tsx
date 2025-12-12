import React from 'react';
import MetaHead from '../components/MetaHead';
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary pt-20 pb-12">
      <MetaHead 
        title="Privacy Policy" 
        description="Privacy Policy for Tripzy - How we handle your data."
        url="https://tripzy.app/privacy"
      />
      
      <div className="container mx-auto px-6 max-w-4xl bg-white dark:bg-brand-surface p-8 rounded-xl shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-brand-primary">Privacy Policy</h1>
        
        <div className="prose dark:prose-invert max-w-none space-y-4">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold mt-4">1. Introduction</h2>
          <p>
            Welcome to Tripzy ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
            If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information,
            please contact us.
          </p>

          <h2 className="text-xl font-semibold mt-4">2. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us when you register on the website, 
            express an interest in obtaining information about us or our products and services, when you participate in activities 
            on the website, or otherwise when you contact us.
          </p>

          <h2 className="text-xl font-semibold mt-4">3. Use of Cookies and Tracking</h2>
          <p>
            We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information.
            Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
          </p>
          <p>
            We use Google AdSense to display ads. Google may use cookies to serve ads based on your prior visits to our website or other websites.
            Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to our sites and/or other sites on the Internet.
            You may opt out of personalized advertising by visiting Ads Settings.
          </p>

          <h2 className="text-xl font-semibold mt-4">4. How We Use Your Information</h2>
          <p>
            We use personal information collected via our website for a variety of business purposes described below.
            We process your personal information for these purposes in reliance on our legitimate business interests,
            in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
          </p>

          <h2 className="text-xl font-semibold mt-4">5. Contact Us</h2>
          <p>
            If you have questions or comments about this policy, you may email us at support@tripzy.app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
