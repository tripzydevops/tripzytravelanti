import React from 'react';
import MetaHead from '../components/MetaHead';
import { useLanguage } from '../contexts/LanguageContext';

const TermsPage: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text-primary pt-20 pb-12">
            <MetaHead
                title={t('termsOfService') || "Terms of Service"}
                description={t('termsDescription') || "Terms of Service for Tripzy."}
                url="https://tripzy.app/terms"
            />

            <div className="container mx-auto px-6 max-w-4xl bg-white dark:bg-brand-surface p-8 rounded-xl shadow-sm">
                <h1 className="text-3xl font-bold mb-6 text-brand-primary">Terms of Service</h1>

                <div className="prose dark:prose-invert max-w-none space-y-4">
                    <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

                    <h2 className="text-xl font-semibold mt-4">1. Agreement to Terms</h2>
                    <p>
                        These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you")
                        and Tripzy ("we," "us," or "our"), concerning your access to and use of the Tripzy website as well as any other media form,
                        media channel, mobile website or mobile application related, linked, or otherwise connected thereto.
                    </p>

                    <h2 className="text-xl font-semibold mt-4">2. Intellectual Property Rights</h2>
                    <p>
                        Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software,
                        website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks,
                        service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us.
                    </p>

                    <h2 className="text-xl font-semibold mt-4">3. User Representations</h2>
                    <p>
                        By using the Site, you represent and warrant that: (1) all registration information you submit will be true, accurate, current,
                        and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary.
                    </p>

                    <h2 className="text-xl font-semibold mt-4">4. Prohibited Activities</h2>
                    <p>
                        You may not access or use the Site for any purpose other than that for which we make the Site available.
                        The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                    </p>

                    <h2 className="text-xl font-semibold mt-4">5. Contact Us</h2>
                    <p>
                        In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site,
                        please contact us at support@tripzy.app.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;
