import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useDeals } from '../../contexts/DealContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Deal, SubscriptionTier } from '../../types';

import { SpinnerIcon, EyeIcon } from '../Icons';
import ImageUpload from '../ImageUpload';
import { getDealsPaginated, createDeal } from '../../lib/supabaseService';
import DealDetailView from '../DealDetailView';
import Modal from '../Modal';

const EMPTY_DEAL: Omit<Deal, 'expiresAt'> = {
    id: '',
    title: '',
    title_tr: '',
    description: '',
    description_tr: '',
    imageUrl: '',
    category: 'Dining',
    category_tr: 'Yemek',
    originalPrice: 0,
    discountedPrice: 0,
    discountPercentage: 0,
    requiredTier: SubscriptionTier.FREE,
    isExternal: false,
    vendor: '',
    rating: 0,
    ratingCount: 0,
    usageLimit: '',
    usageLimit_tr: '',
    validity: '',
    validity_tr: '',
    termsUrl: '',
    redemptionCode: '',
    publishAt: undefined,
    redemptionStyle: [],
    is_flash_deal: false,
    flash_end_time: undefined
};

const getExpiryDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
};

const getFarFutureDate = (): string => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 100);
    return date.toISOString();
};

const isFarFuture = (dateString: string): boolean => {
    const expiry = new Date(dateString);
    const now = new Date();
    return expiry.getFullYear() > now.getFullYear() + 50;
};

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

const AdminDealsTab: React.FC = () => {
    const { t, language } = useLanguage();
    const { addDeal, updateDeal, deleteDeal } = useDeals();

    // Local State
    const [adminDeals, setAdminDeals] = useState<Deal[]>([]);
    const [adminPage, setAdminPage] = useState(1);
    const [adminTotal, setAdminTotal] = useState(0);
    const ADMIN_DEALS_PER_PAGE = 20;

    const [isDealFormVisible, setIsDealFormVisible] = useState(false);
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
    const [dealFormData, setDealFormData] = useState<Omit<Deal, 'expiresAt'>>(EMPTY_DEAL);
    const [expiresInDays, setExpiresInDays] = useState<number | string>('');
    const [neverExpires, setNeverExpires] = useState(false);
    const [isTranslating, setIsTranslating] = useState({ title: false, description: false });
    const [lastEditedField, setLastEditedField] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewDeal, setPreviewDeal] = useState<Deal | null>(null);

    const [searchQuery, setSearchQuery] = useState('');

    const [categoryFilter, setCategoryFilter] = useState('All');
    const [activeTab, setActiveTab] = useState<'active' | 'expired'>('active');

    const loadAdminDeals = useCallback(async (page: number) => {
        try {
            const { deals, total } = await getDealsPaginated(page, ADMIN_DEALS_PER_PAGE, {
                includeExpired: true,
                search: searchQuery,
                category: categoryFilter
            });
            setAdminDeals(deals);
            setAdminTotal(total);
            setAdminPage(page);
        } catch (error) {
            console.error("Failed to load deals for admin:", error);
        }
    }, [searchQuery, categoryFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadAdminDeals(1);
        }, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [loadAdminDeals]);

    const filteredDeals = useMemo(() => {
        const now = new Date();
        return adminDeals.filter(deal => {
            const expiryDate = new Date(deal.expiresAt);
            if (activeTab === 'active') {
                return expiryDate >= now;
            } else {
                return expiryDate < now;
            }
        });
    }, [adminDeals, activeTab]);

    const handleAdminPageChange = (newPage: number) => {
        loadAdminDeals(newPage);
    };

    const sortedDeals = useMemo(() => {
        return [...adminDeals].sort((a, b) => Number(b.id) - Number(a.id));
    }, [adminDeals]);

    // Translation Logic
    const debouncedTitle = useDebounce(dealFormData.title, 800);
    const debouncedTitleTr = useDebounce(dealFormData.title_tr, 800);
    const debouncedDescription = useDebounce(dealFormData.description, 800);
    const debouncedDescriptionTr = useDebounce(dealFormData.description_tr, 800);

    const translateText = useCallback(async (text: string, targetLanguage: 'English' | 'Turkish'): Promise<string> => {
        if (!text.trim()) return '';
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) return '';
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, without any introductory phrases:\n\n"${text}"`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            return response.text.trim();
        } catch (error) { console.error('Translation failed:', error); return ''; }
    }, []);

    useEffect(() => {
        if (debouncedTitle && lastEditedField === 'title') {
            (async () => {
                setIsTranslating(p => ({ ...p, title: true }));
                const tr = await translateText(debouncedTitle, 'Turkish');
                if (tr) setDealFormData(p => ({ ...p, title_tr: tr }));
                setIsTranslating(p => ({ ...p, title: false }));
            })();
        }
    }, [debouncedTitle, lastEditedField, translateText]);

    useEffect(() => {
        if (debouncedTitleTr && lastEditedField === 'title_tr') {
            (async () => {
                setIsTranslating(p => ({ ...p, title: true }));
                const tr = await translateText(debouncedTitleTr, 'English');
                if (tr) setDealFormData(p => ({ ...p, title: tr }));
                setIsTranslating(p => ({ ...p, title: false }));
            })();
        }
    }, [debouncedTitleTr, lastEditedField, translateText]);

    useEffect(() => {
        if (debouncedDescription && lastEditedField === 'description') {
            (async () => {
                setIsTranslating(p => ({ ...p, description: true }));
                const tr = await translateText(debouncedDescription, 'Turkish');
                if (tr) setDealFormData(p => ({ ...p, description_tr: tr }));
                setIsTranslating(p => ({ ...p, description: false }));
            })();
        }
    }, [debouncedDescription, lastEditedField, translateText]);

    useEffect(() => {
        if (debouncedDescriptionTr && lastEditedField === 'description_tr') {
            (async () => {
                setIsTranslating(p => ({ ...p, description: true }));
                const tr = await translateText(debouncedDescriptionTr, 'English');
                if (tr) setDealFormData(p => ({ ...p, description: tr }));
                setIsTranslating(p => ({ ...p, description: false }));
            })();
        }
    }, [debouncedDescriptionTr, lastEditedField, translateText]);

    const handleDealInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (['title', 'title_tr', 'description', 'description_tr'].includes(name)) setLastEditedField(name);

        let newValue: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? parseFloat(value) : value;

        setDealFormData(prev => {
            const updated = { ...prev, [name]: newValue };
            if (name === 'discountPercentage' && updated.originalPrice > 0) {
                const discount = parseFloat(value);
                if (!isNaN(discount)) {
                    updated.discountedPrice = Number((updated.originalPrice * (1 - discount / 100)).toFixed(2));
                }
            } else if (name === 'originalPrice' && updated.discountPercentage) {
                const price = parseFloat(value);
                const discount = updated.discountPercentage;
                if (!isNaN(price) && !isNaN(discount)) {
                    updated.discountedPrice = Number((price * (1 - discount / 100)).toFixed(2));
                }
            }
            return updated;
        });
    };

    const handleEditDealClick = (deal: Deal) => {
        setEditingDeal(deal);
        setDealFormData(deal);
        if (isFarFuture(deal.expiresAt)) {
            setNeverExpires(true); setExpiresInDays(7);
        } else {
            setNeverExpires(false);
            const diffDays = Math.ceil((new Date(deal.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            setExpiresInDays(diffDays > 0 ? diffDays : '');
        }
        if (!deal.discountPercentage && deal.originalPrice > 0 && deal.discountedPrice < deal.originalPrice) {
            const discount = ((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100;
            setDealFormData(prev => ({ ...prev, discountPercentage: Math.round(discount) }));
        }
        setIsDealFormVisible(true); window.scrollTo(0, 0);
    };

    const handleDeleteDealClick = async (dealId: string) => {
        if (window.confirm(t('deleteConfirmation'))) {
            await deleteDeal(dealId);
            loadAdminDeals(adminPage);
        }
    };

    const handleCloneDealClick = (deal: Deal) => {
        const clonedDeal = { ...deal };
        setDealFormData({
            ...clonedDeal,
            title: `${clonedDeal.title} (Copy)`,
            title_tr: `${clonedDeal.title_tr} (Kopya)`,
            redemptionCode: `${clonedDeal.redemptionCode}-COPY`
        });
        setEditingDeal(null); // Treat as new deal

        // Reset expiry to default 30 days for clones, unless it was 'never expires'
        if (isFarFuture(deal.expiresAt)) {
            setNeverExpires(true);
            setExpiresInDays(7);
        } else {
            setNeverExpires(false);
            setExpiresInDays(30);
        }

        setIsDealFormVisible(true);
        window.scrollTo(0, 0);
    };

    const handlePreviewClick = () => {
        // Create a temporary deal object from form data for preview
        const tempDeal: Deal = {
            ...dealFormData,
            id: 'preview',
            expiresAt: neverExpires ? getFarFutureDate() : getExpiryDate(typeof expiresInDays === 'number' ? expiresInDays : parseInt(expiresInDays as string) || 7),
            category_tr: dealFormData.category === 'Dining' ? 'Yemek' : dealFormData.category === 'Wellness' ? 'Sağlık' : 'Seyahat'
        };
        setPreviewDeal(tempDeal);
        setIsPreviewOpen(true);
    };

    const handleImportDeals = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());

            let successCount = 0;
            let errorCount = 0;
            setIsSaving(true);

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.trim());
                const dealData: any = {};

                headers.forEach((header, index) => {
                    dealData[header] = values[index];
                });

                try {
                    const newDeal: Omit<Deal, 'id'> = {
                        title: dealData.title || 'Untitled',
                        title_tr: dealData.title_tr || dealData.title || 'Untitled',
                        description: dealData.description || '',
                        description_tr: dealData.description_tr || dealData.description || '',
                        imageUrl: dealData.imageUrl || '',
                        category: dealData.category || 'Dining',
                        category_tr: dealData.category_tr || 'Yemek',
                        originalPrice: parseFloat(dealData.originalPrice) || 0,
                        discountedPrice: parseFloat(dealData.discountedPrice) || 0,
                        requiredTier: (dealData.requiredTier as SubscriptionTier) || SubscriptionTier.FREE,
                        isExternal: dealData.isExternal === 'true',
                        vendor: dealData.vendor || '',
                        expiresAt: getExpiryDate(30),
                        rating: 0,
                        ratingCount: 0,
                        usageLimit: dealData.usageLimit || 'Unlimited',
                        usageLimit_tr: dealData.usageLimit_tr || 'Sınırsız',
                        validity: dealData.validity || 'Valid until expiration',
                        validity_tr: dealData.validity_tr || 'Son kullanma tarihine kadar geçerli',
                        termsUrl: dealData.termsUrl || '',
                        redemptionCode: dealData.redemptionCode || 'CODE',
                        status: 'pending',
                    };

                    await createDeal(newDeal);
                    successCount++;
                } catch (error) {
                    console.error('Error importing deal:', error);
                    errorCount++;
                }
            }

            setIsSaving(false);
            alert(`Import complete. Success: ${successCount}, Failed: ${errorCount}`);
            loadAdminDeals(1);
        };
        reader.readAsText(file);
    };

    const resetDealForm = () => {
        setEditingDeal(null); setDealFormData(EMPTY_DEAL); setExpiresInDays(''); setNeverExpires(false); setIsDealFormVisible(false); setLastEditedField(null);
    };

    const handleDealSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Language Validation
        const hasEnglish = dealFormData.title?.trim() && dealFormData.description?.trim();
        const hasTurkish = dealFormData.title_tr?.trim() && dealFormData.description_tr?.trim();

        if (!hasEnglish && !hasTurkish) {
            alert('Please provide a Title and Description in at least one language (English or Turkish).');
            setIsSaving(false);
            return;
        }

        let finalImageUrl = dealFormData.imageUrl;

        if (!finalImageUrl) {
            setIsGeneratingImage(true);
            try {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) throw new Error("API Key missing");
                const ai = new GoogleGenAI({ apiKey });
                const prompt = `A vibrant, high-quality promotional image for a travel and lifestyle deal titled: "${dealFormData.title}". Category: ${dealFormData.category}. The image should be appealing for a deals website.`;
                const response = await ai.models.generateImages({ model: 'imagen-4.0-generate-001', prompt, config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' } });
                if (response.generatedImages?.[0]) {
                    finalImageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
                }
            } catch (error) {
                console.error('Image generation failed:', error);
            } finally {
                setIsGeneratingImage(false);
            }

            if (!finalImageUrl) {
                finalImageUrl = `https://picsum.photos/seed/${dealFormData.title.replace(/\s/g, '')}/400/300`;
            }
        }

        try {
            const dealData = { ...dealFormData, imageUrl: finalImageUrl, expiresAt: neverExpires ? getFarFutureDate() : getExpiryDate(typeof expiresInDays === 'number' ? expiresInDays : parseInt(expiresInDays as string) || 7), category_tr: dealFormData.category === 'Dining' ? 'Yemek' : dealFormData.category === 'Wellness' ? 'Sağlık' : 'Seyahat' };
            if (editingDeal) {
                await updateDeal(dealData);
            } else {
                await addDeal({ ...dealData, id: Date.now().toString() });
            }
            await loadAdminDeals(adminPage);
            resetDealForm();
        } catch (error) {
            console.error('Error saving deal:', error);
            alert('Failed to save deal. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };



    return (
        <>
            {!isDealFormVisible && (
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{t('manageDeals')}</h2>
                    <div className="flex gap-2">
                        <label className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors cursor-pointer flex items-center">
                            Import CSV
                            <input type="file" accept=".csv" onChange={handleImportDeals} className="hidden" />
                        </label>
                        <button onClick={() => {
                            setEditingDeal(null);
                            setDealFormData(EMPTY_DEAL);
                            setExpiresInDays('');
                            setNeverExpires(false);
                            setIsDealFormVisible(true);
                        }} className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                            {t('addDeal')}
                        </button>
                    </div>
                </div>
            )}

            {isDealFormVisible && (
                <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">{editingDeal ? t('editDeal') : t('addDeal')}</h2>
                    <form onSubmit={handleDealSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('titleLabel')}</label><div className="relative"><input type="text" name="title" value={dealFormData.title} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />{isTranslating.title && lastEditedField === 'title_tr' && (<SpinnerIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary" />)}</div></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('titleTrLabel')}</label><div className="relative"><input type="text" name="title_tr" value={dealFormData.title_tr} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />{isTranslating.title && lastEditedField === 'title' && (<SpinnerIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary" />)}</div></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('descriptionLabel')}</label><div className="relative"><textarea name="description" value={dealFormData.description} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 h-24" />{isTranslating.description && lastEditedField === 'description_tr' && (<SpinnerIcon className="absolute right-2 top-3 w-5 h-5 text-brand-primary" />)}</div></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('descriptionTrLabel')}</label><div className="relative"><textarea name="description_tr" value={dealFormData.description_tr} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 h-24" />{isTranslating.description && lastEditedField === 'description' && (<SpinnerIcon className="absolute right-2 top-3 w-5 h-5 text-brand-primary" />)}</div></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('imageUrlLabel')}</label>
                                <ImageUpload
                                    value={dealFormData.imageUrl}
                                    onChange={(url) => setDealFormData(prev => ({ ...prev, imageUrl: url }))}
                                    placeholder={t('imageUrlOptionalHint') || "Upload Deal Image"}
                                />
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500 mb-1">Or enter URL manually:</p>
                                    <input type="text" name="imageUrl" value={dealFormData.imageUrl} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-xs" placeholder="https://..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Company Logo (Optional)</label>
                                <ImageUpload
                                    value={dealFormData.companyLogoUrl || ''}
                                    onChange={(url) => setDealFormData(prev => ({ ...prev, companyLogoUrl: url }))}
                                    placeholder="Upload Company Logo"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('categoryLabel')}</label><select name="category" value={dealFormData.category} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"><option>Dining</option><option>Wellness</option><option>Travel</option></select></div>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('originalPriceLabel')}</label><input type="number" name="originalPrice" value={dealFormData.originalPrice} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                                <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('discountPercentageLabel')}</label><input type="number" name="discountPercentage" value={dealFormData.discountPercentage || ''} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" placeholder="e.g. 20" /></div>
                                <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('discountedPriceLabel')}</label><input type="number" name="discountedPrice" value={dealFormData.discountedPrice} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('requiredTierLabel')}</label><select name="requiredTier" value={dealFormData.requiredTier} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">{Object.values(SubscriptionTier).filter(t => t !== SubscriptionTier.NONE).map(tier => <option key={tier} value={tier}>{tier}</option>)}</select></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('vendorLabel')}</label><input type="text" name="vendor" value={dealFormData.vendor} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('usageLimitLabel')}</label><input type="text" name="usageLimit" value={dealFormData.usageLimit} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('usageLimitTrLabel')}</label><input type="text" name="usageLimit_tr" value={dealFormData.usageLimit_tr} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('validityLabel')}</label><input type="text" name="validity" value={dealFormData.validity} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('validityTrLabel')}</label><input type="text" name="validity_tr" value={dealFormData.validity_tr} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('termsUrlLabel')}</label><input type="text" name="termsUrl" value={dealFormData.termsUrl} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('redemptionCodeLabel')}</label><input type="text" name="redemptionCode" value={dealFormData.redemptionCode} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Redemption Style</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={dealFormData.redemptionStyle?.includes('online') || false}
                                            onChange={(e) => {
                                                const current = dealFormData.redemptionStyle || [];
                                                const updated = e.target.checked
                                                    ? [...current, 'online']
                                                    : current.filter(s => s !== 'online');
                                                setDealFormData(prev => ({ ...prev, redemptionStyle: updated as ('online' | 'in_store')[] }));
                                            }}
                                            className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-brand-text-light">Online</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={dealFormData.redemptionStyle?.includes('in_store') || false}
                                            onChange={(e) => {
                                                const current = dealFormData.redemptionStyle || [];
                                                const updated = e.target.checked
                                                    ? [...current, 'in_store']
                                                    : current.filter(s => s !== 'in_store');
                                                setDealFormData(prev => ({ ...prev, redemptionStyle: updated as ('online' | 'in_store')[] }));
                                            }}
                                            className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-brand-text-light">In Store</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Publish Date (Optional)</label>
                                <input
                                    type="datetime-local"
                                    name="publishAt"
                                    value={dealFormData.publishAt ? new Date(new Date(dealFormData.publishAt).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                    onChange={(e) => {
                                        if (!e.target.value) {
                                            setDealFormData(prev => ({ ...prev, publishAt: undefined }));
                                            return;
                                        }
                                        const date = new Date(e.target.value);
                                        setDealFormData(prev => ({ ...prev, publishAt: date.toISOString() }));
                                    }}
                                    className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                />
                                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Leave empty to publish immediately.</p>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('expiresInDaysLabel')}</label><input type="number" value={expiresInDays} onChange={e => setExpiresInDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))} required disabled={neverExpires} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed" /></div>
                            <div className="flex items-center space-x-2"><input type="checkbox" id="neverExpires" name="neverExpires" checked={neverExpires} onChange={e => setNeverExpires(e.target.checked)} className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary" /><label htmlFor="neverExpires" className="text-sm font-medium text-gray-600 dark:text-brand-text-muted">{t('neverExpires')}</label></div>
                            <div className="flex items-center space-x-2 pt-5"><input type="checkbox" id="isExternal" name="isExternal" checked={dealFormData.isExternal} onChange={handleDealInputChange} className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary" /><label htmlFor="isExternal" className="text-sm font-medium text-gray-600 dark:text-brand-text-muted">Is External Deal?</label></div>

                            <div className="flex items-center space-x-2 pt-5">
                                <input
                                    type="checkbox"
                                    id="is_flash_deal"
                                    name="is_flash_deal"
                                    checked={dealFormData.is_flash_deal || false}
                                    onChange={handleDealInputChange}
                                    className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary"
                                />
                                <label htmlFor="is_flash_deal" className="text-sm font-medium text-gray-600 dark:text-brand-text-muted">
                                    Flash Deal ⚡
                                </label>
                            </div>

                            {dealFormData.is_flash_deal && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Flash Deal End Time</label>
                                    <input
                                        type="datetime-local"
                                        name="flash_end_time"
                                        value={dealFormData.flash_end_time ? new Date(new Date(dealFormData.flash_end_time).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => {
                                            if (!e.target.value) {
                                                setDealFormData(prev => ({ ...prev, flash_end_time: undefined }));
                                                return;
                                            }
                                            const date = new Date(e.target.value);
                                            setDealFormData(prev => ({ ...prev, flash_end_time: date.toISOString() }));
                                        }}
                                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="col-span-2 text-sm font-semibold text-gray-700 dark:text-brand-text-light">Location (Optional)</div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Latitude</label>
                                    <input type="number" step="any" name="latitude" value={dealFormData.latitude || ''} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" placeholder="e.g. 41.0082" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Longitude</label>
                                    <input type="number" step="any" name="longitude" value={dealFormData.longitude || ''} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" placeholder="e.g. 28.9784" />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                            <button type="button" onClick={handlePreviewClick} className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors flex items-center">
                                <EyeIcon className="w-5 h-5 mr-2" />
                                {t('preview') || 'Preview'}
                            </button>
                            <button type="button" onClick={resetDealForm} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
                            <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors flex items-center justify-center disabled:bg-gray-500 w-44" disabled={isSaving}>
                                {isSaving ? (
                                    <><SpinnerIcon className="w-5 h-5 mr-2" /><span>{isGeneratingImage ? t('generatingImage') : t('saving')}</span></>
                                ) : (
                                    editingDeal ? t('updateDeal') : t('saveDeal')
                                )}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Preview Modal */}
            <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Deal Preview" maxWidth="max-w-4xl">
                <div className="max-h-[80vh] overflow-y-auto">
                    {previewDeal && <DealDetailView deal={previewDeal} isPreview={true} />}
                </div>
            </Modal>

            <section>
                <h2 className="text-2xl font-bold mb-4">{t('allDeals')}</h2>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <button
                        className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'active' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Active Deals
                    </button>
                    <button
                        className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'expired' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        onClick={() => setActiveTab('expired')}
                    >
                        Expired Deals
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-grow">
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        >
                            <option value="All">All Categories</option>
                            <option value="Dining">Dining</option>
                            <option value="Wellness">Wellness</option>
                            <option value="Travel">Travel</option>
                            <option value="Flights">Flights</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                            <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg"><tr><th scope="col" className="px-6 py-3">Title</th><th scope="col" className="px-6 py-3">Category</th><th scope="col" className="px-6 py-3">Price</th><th scope="col" className="px-6 py-3">Discount</th><th scope="col" className="px-6 py-3">Status</th><th scope="col" className="px-6 py-3">Expires</th><th scope="col" className="px-6 py-3 text-right">Actions</th></tr></thead>
                            <tbody>{filteredDeals.map(deal => (<tr key={deal.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"><th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap">{deal.title}</th><td className="px-6 py-4">{deal.category}</td><td className="px-6 py-4">${deal.discountedPrice}</td><td className="px-6 py-4">{deal.discountPercentage ? `${deal.discountPercentage}%` : '-'}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${deal.status === 'approved' ? 'bg-green-100 text-green-800' : deal.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{deal.status || 'pending'}</span></td><td className="px-6 py-4 text-xs">{new Date(deal.expiresAt).toLocaleDateString()}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => updateDeal({ ...deal, status: deal.status === 'approved' ? 'pending' : 'approved' }).then(() => loadAdminDeals(adminPage))} className={`font-medium hover:underline ${deal.status === 'approved' ? 'text-yellow-600' : 'text-green-600'}`}>{deal.status === 'approved' ? 'Suspend' : 'Approve'}</button><button onClick={() => handleCloneDealClick(deal)} className="font-medium text-blue-600 hover:underline">Clone</button><button onClick={() => handleEditDealClick(deal)} className="font-medium text-brand-secondary hover:underline">Edit</button><button onClick={() => handleDeleteDealClick(deal.id)} className="font-medium text-red-500 hover:underline">Delete</button></td></tr>))}</tbody>
                        </table>
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-brand-bg border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-700 dark:text-brand-text-muted">
                            Showing {((adminPage - 1) * ADMIN_DEALS_PER_PAGE) + 1} to {Math.min(adminPage * ADMIN_DEALS_PER_PAGE, adminTotal)} of {adminTotal} deals
                        </span>
                        <div className="space-x-2">
                            <button
                                onClick={() => handleAdminPageChange(adminPage - 1)}
                                disabled={adminPage === 1}
                                className="px-4 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-brand-text-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handleAdminPageChange(adminPage + 1)}
                                disabled={adminPage * ADMIN_DEALS_PER_PAGE >= adminTotal}
                                className="px-4 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-brand-text-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default AdminDealsTab;
