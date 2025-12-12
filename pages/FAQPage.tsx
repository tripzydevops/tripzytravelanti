import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import MetaHead from '../components/MetaHead';
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons';

const FAQPage: React.FC = () => {
    const { t } = useLanguage();
    const [openIndex, setOpenIndex] = React.useState<number | null>(0);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        {
            question: "How do I redeem a deal?",
            answer: "Navigate to your Wallet, select the deal you want to use, and tap 'Redeem Now'. Present the QR code to the vendor."
        },
        {
            question: "Can I use a deal more than once?",
            answer: "It depends on the specific deal terms. Some are one-time use, while others can be used monthly. Check the deal details for specifics."
        },
        {
            question: "How do I upgrade my subscription?",
            answer: "Go to Profile > Subscription Info > Upgrade Plan. Choose the plan that suits you best and follow the payment instructions."
        },
        {
            question: "What payment methods are accepted?",
            answer: "We accept all major credit and debit cards secured by 3D Secure."
        },
        {
            question: "How can I contact support?",
            answer: "You can reach our support team via email at support@tripzy.app or use the contact form in the Help Center."
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 container mx-auto text-white">
            <MetaHead title="Help Center & FAQ - Tripzy" description="Frequently asked questions about Tripzy travel deals and subscriptions." />

            <div className="max-w-3xl mx-auto">
                <h1 className="text-4xl font-heading font-bold text-gold-500 mb-8 text-center">{t('helpCenter') || 'Help Center'}</h1>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/10">
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                            >
                                <span className="text-lg font-semibold text-white/90">{faq.question}</span>
                                {openIndex === index ? (
                                    <ChevronUpIcon className="w-5 h-5 text-gold-500" />
                                ) : (
                                    <ChevronDownIcon className="w-5 h-5 text-white/50" />
                                )}
                            </button>

                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="p-6 pt-0 text-white/70 border-t border-white/5 leading-relaxed">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                    <h3 className="text-xl font-bold text-white mb-2">Still needs help?</h3>
                    <p className="text-white/50 mb-6">Our support team is available 24/7 to assist you.</p>
                    <a href="mailto:support@tripzy.app" className="inline-block px-8 py-3 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-full transition-colors shadow-lg">
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
