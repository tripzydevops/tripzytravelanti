import React, { useState, useEffect } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createDeal, getDealById, updateDeal } from '../../lib/supabaseService';

import { SubscriptionTier, Deal } from '../../types';
import { ArrowLeft, Save, Info } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import StoreLocationFields from '../../components/StoreLocationFields';
import CountrySelector from '../../components/CountrySelector';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    getCategoryOptions,
    getDiscountTypeOptions,
    getTimeTypeOptions,
    getDiscountTypeConfig,
    getTimeTypeConfig,
    DealDiscountType,
    DealTimeType,
    DEFAULT_DEAL_VALUES
} from '../../shared/dealTypes';
import { generateRedemptionCode } from '../../lib/codeGenerator';

const CreateDealPage: React.FC = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [neverExpires, setNeverExpires] = useState(false);
    const [formTab, setFormTab] = useState('Deal Details');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showTranslations, setShowTranslations] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        title_tr: '',
        description: '',
        description_tr: '',
        imageUrl: '',
        companyLogoUrl: '',
        category: 'Dining',
        category_tr: 'Yemek',
        dealTypeKey: DEFAULT_DEAL_VALUES.discountType,
        timeType: DEFAULT_DEAL_VALUES.timeType,
        originalPrice: '',
        discountedPrice: '',
        discountPercentage: '',
        requiredTier: SubscriptionTier.FREE,
        isExternal: false,
        vendor: user?.name || '',
        expiresAt: '',
        usageLimit: DEFAULT_DEAL_VALUES.usageLimit,
        usageLimit_tr: DEFAULT_DEAL_VALUES.usageLimit_tr,
        validity: DEFAULT_DEAL_VALUES.validity,
        validity_tr: DEFAULT_DEAL_VALUES.validity_tr,
        termsUrl: '',
        redemptionCode: '',
        redemptionStyle: [] as ('online' | 'in_store')[],
        storeLocations: [] as { name: string; address: string; city?: string }[],
        countries: [] as string[],
        is_flash_deal: false,
        flash_end_time: '',
        maxRedemptionsTotal: '' as string | number, // Added global limit field
    });

    const dealTypeConfig = getDiscountTypeConfig(formData.dealTypeKey);
    const timeTypeConfig = getTimeTypeConfig(formData.timeType);

    useEffect(() => {
        const fetchDeal = async () => {
            if (id) {
                try {
                    setLoading(true);
                    const deal = await getDealById(id);
                    if (deal) {
                        setFormData({
                            title: deal.title,
                            title_tr: deal.title_tr,
                            description: deal.description,
                            description_tr: deal.description_tr,
                            imageUrl: deal.imageUrl,
                            companyLogoUrl: deal.companyLogoUrl || '',
                            category: deal.category,
                            category_tr: deal.category_tr,
                            dealTypeKey: deal.dealTypeKey || 'percentage_off',
                            timeType: deal.timeType || 'standard',
                            originalPrice: deal.originalPrice.toString(),
                            discountedPrice: deal.discountedPrice.toString(),
                            discountPercentage: deal.discountPercentage?.toString() || '',
                            requiredTier: deal.requiredTier,
                            isExternal: deal.isExternal,
                            vendor: deal.vendor,
                            expiresAt: deal.expiresAt ? new Date(deal.expiresAt).toISOString().split('T')[0] : '',
                            usageLimit: deal.usageLimit,
                            usageLimit_tr: deal.usageLimit_tr,
                            validity: deal.validity,
                            validity_tr: deal.validity_tr,
                            termsUrl: deal.termsUrl,
                            redemptionCode: deal.redemptionCode,
                            redemptionStyle: deal.redemptionStyle || [],
                            storeLocations: deal.storeLocations || [],
                            storeLocations: deal.storeLocations || [],
                            is_flash_deal: deal.is_flash_deal || false,
                            flash_end_time: deal.flash_end_time || '',
                            maxRedemptionsTotal: deal.maxRedemptionsTotal || '' // Populate from DB
                        });

                        // Check if expires far in the future (approx 100 years)
                        const expiryDate = new Date(deal.expiresAt);
                        const now = new Date();
                        if (expiryDate.getFullYear() > now.getFullYear() + 50) {
                            setNeverExpires(true);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching deal:', err);
                    setError('Failed to load deal details.');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchDeal();
    }, [id]);

    // Inline Validation - Real-time price validation
    useEffect(() => {
        const errors: string[] = [];
        const original = parseFloat(formData.originalPrice);
        const discounted = parseFloat(formData.discountedPrice);
        const percentage = parseFloat(formData.discountPercentage);

        // Skip validation for custom deal type
        if (formData.dealTypeKey === 'custom') {
            setValidationErrors([]);
            return;
        }

        if (!isNaN(original) && original < 0) {
            errors.push('Original price cannot be negative');
        }
        if (!isNaN(discounted) && discounted < 0) {
            errors.push('Discounted price cannot be negative');
        }
        if (!isNaN(original) && !isNaN(discounted) && original > 0 && discounted >= original) {
            errors.push('Discounted price must be lower than original price');
        }
        if (!isNaN(percentage) && percentage > 100) {
            errors.push('Discount cannot exceed 100%');
        }
        if (!isNaN(percentage) && percentage < 0) {
            errors.push('Discount cannot be negative');
        }

        setValidationErrors(errors);
    }, [formData.originalPrice, formData.discountedPrice, formData.discountPercentage, formData.dealTypeKey]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => {
                const updated = { ...prev, [name]: value };

                // Handle Deal Type Change with Smart Defaults
                if (name === 'dealTypeKey') {
                    const newType = value as DealDiscountType;

                    // Apply smart defaults based on deal type
                    if (newType === 'percentage_off' && !updated.originalPrice) {
                        updated.originalPrice = '100';
                        updated.discountPercentage = '20';
                        updated.discountedPrice = '80';
                    } else if (newType === 'bogo') {
                        updated.discountPercentage = '50';
                    } else if (newType === 'fixed_price') {
                        updated.originalPrice = '';
                        updated.discountPercentage = '';
                    }
                }

                // Handle Time Type Change
                if (name === 'timeType') {
                    const newTimeConfig = getTimeTypeConfig(value as DealTimeType);
                    if (newTimeConfig) {
                        if (newTimeConfig.key === 'flash') {
                            updated.is_flash_deal = true;
                        } else {
                            updated.is_flash_deal = false;
                        }

                        if (newTimeConfig.defaultValidity) {
                            updated.validity = newTimeConfig.defaultValidity;
                            updated.validity_tr = newTimeConfig.defaultValidity_tr || updated.validity;
                        }
                    }
                }

                // Handle Category Change (Update Turkish equivalent automatically if possible)
                if (name === 'category') {
                    const catOptions = getCategoryOptions('en');
                    const selectedCat = catOptions.find(c => c.value === value);
                    if (selectedCat) {
                        const catOptionsTr = getCategoryOptions('tr');
                        const trCat = catOptionsTr.find(c => c.key === selectedCat.key);
                        if (trCat) {
                            updated.category_tr = trCat.value;
                        }
                    }
                }

                // Smart Pricing Logic
                if (name === 'originalPrice') {
                    const original = parseFloat(value);
                    const discount = parseFloat(updated.discountPercentage);
                    const discounted = parseFloat(updated.discountedPrice);

                    if (!isNaN(original)) {
                        // If we have a percentage, update the discounted price
                        if (!isNaN(discount) && discount > 0) {
                            updated.discountedPrice = (original * (1 - discount / 100)).toFixed(2);
                        }
                        // If we have a discounted price but no percentage (or 0), update percentage
                        else if (!isNaN(discounted)) {
                            updated.discountPercentage = (((original - discounted) / original) * 100).toFixed(0);
                        }
                    }
                } else if (name === 'discountedPrice') {
                    const discounted = parseFloat(value);
                    const original = parseFloat(updated.originalPrice);
                    if (!isNaN(discounted) && !isNaN(original) && original > 0) {
                        updated.discountPercentage = (((original - discounted) / original) * 100).toFixed(0);
                    }
                } else if (name === 'discountPercentage') {
                    const discount = parseFloat(value);
                    const original = parseFloat(updated.originalPrice);
                    // If original price exists, calculate discounted price
                    if (!isNaN(discount) && !isNaN(original) && original > 0) {
                        updated.discountedPrice = (original * (1 - discount / 100)).toFixed(2);
                    }
                }

                return updated;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError(null);

        // Validation: Either (Original & Discounted) OR (Percentage) must be set
        const original = parseFloat(formData.originalPrice);
        const discounted = parseFloat(formData.discountedPrice);
        const percentage = parseFloat(formData.discountPercentage);

        const hasPrice = !isNaN(original) && !isNaN(discounted) && original > 0;
        const hasPercentage = !isNaN(percentage) && percentage > 0;

        if (!hasPrice && !hasPercentage && formData.dealTypeKey !== 'custom') {
            setError('Please enter either a Price (Original & Discounted) OR a Discount Percentage.');
            setLoading(false);
            return;
        }

        // Language Validation
        const hasEnglish = formData.title?.trim() && formData.description?.trim();
        const hasTurkish = formData.title_tr?.trim() && formData.description_tr?.trim();

        if (!hasEnglish && !hasTurkish) {
            setError('Please provide a Title and Description in at least one language (English or Turkish).');
            setLoading(false);
            return;
        }

        try {
            // Handle Never Expires
            const finalExpiresAt = neverExpires ?
                new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString() :
                formData.expiresAt;

            const dealData: Partial<Deal> = {
                ...formData,
                originalPrice: hasPrice ? original : 0,
                discountedPrice: hasPrice ? discounted : 0,
                discountPercentage: percentage || 0,
                partnerId: user.id,
                status: (user.isAdmin ? 'approved' : (isEditing ? formData.status : 'pending')) as 'pending' | 'approved' | 'rejected',
                expiresAt: finalExpiresAt,
                rating: 0,
                ratingCount: 0,
                storeLocations: formData.storeLocations.filter(loc => loc.name || loc.address),
                is_flash_deal: formData.is_flash_deal,
                flash_end_time: formData.flash_end_time ? new Date(formData.flash_end_time).toISOString() : undefined,
                dealTypeKey: formData.dealTypeKey,
                dealTypeKey: formData.dealTypeKey,
                timeType: formData.timeType,
                maxRedemptionsTotal: formData.maxRedemptionsTotal ? parseInt(formData.maxRedemptionsTotal.toString()) : null
            };

            if (isEditing && id) {
                await updateDeal(id, dealData);
            } else {
                await createDeal(dealData as any);
            }

            navigate('/partner/dashboard');
        } catch (err) {
            console.error('Error saving deal:', err);
            console.log('Form Data being sent:', formData); // Debug log
            setError('Failed to save deal. Please try again. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/partner/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    {isEditing ? 'Edit Deal' : 'Create New Deal'}
                </h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Form Tabs - Reduced to 2 tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
                    {['Deal Details', 'Redemption'].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setFormTab(tab)}
                            className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${formTab === tab
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Tab 1: Deal Details (merged basic info + pricing) */}
                    {formTab === 'Deal Details' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Title - Primary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter title (auto-translates)" />
                            </div>

                            {/* Description - Primary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea name="description" rows={2} value={formData.description} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Enter description (auto-translates)" />
                            </div>

                            {/* Collapsible Translations */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <button type="button" onClick={() => setShowTranslations(!showTranslations)} className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 text-left text-sm font-medium text-gray-600 dark:text-gray-400 flex justify-between items-center">
                                    <span>📝 {showTranslations ? 'Hide' : 'View/Edit'} Translations (Turkish)</span>
                                    <span className={`transform transition-transform ${showTranslations ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                {showTranslations && (
                                    <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title (Turkish)</label>
                                            <input type="text" name="title_tr" value={formData.title_tr} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description (Turkish)</label>
                                            <textarea name="description_tr" rows={2} value={formData.description_tr} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name (Vendor)</label>
                                <input type="text" name="vendor" required value={formData.vendor} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>

                            {/* Country Selector */}
                            <CountrySelector
                                selectedCountries={formData.countries}
                                onChange={(countries) => setFormData(prev => ({ ...prev, countries }))}
                                language={language === 'tr' ? 'tr' : 'en'}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image</label>
                                    <ImageUpload value={formData.imageUrl} onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))} bucketName="deals" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Logo (Optional)</label>
                                    <ImageUpload value={formData.companyLogoUrl} onChange={(url) => setFormData(prev => ({ ...prev, companyLogoUrl: url }))} bucketName="deals" />
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Pricing & Category</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('dealTypeLabel')}</label>
                                        <select name="dealTypeKey" value={formData.dealTypeKey} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {getDiscountTypeOptions(language).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('categoryLabel')}</label>
                                        <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                            {getCategoryOptions(language).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {!dealTypeConfig?.hiddenFields.includes('originalPrice') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('originalPriceLabel')}</label>
                                            <input type="number" name="originalPrice" min="0" step="0.01" value={formData.originalPrice} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    )}
                                    {!dealTypeConfig?.hiddenFields.includes('discountedPrice') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('discountedPriceLabel')}</label>
                                            <input type="number" name="discountedPrice" min="0" step="0.01" value={formData.discountedPrice} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    )}
                                    {!dealTypeConfig?.hiddenFields.includes('discountPercentage') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('discountPercentageLabel')}</label>
                                            <input type="number" name="discountPercentage" min="0" max="100" value={formData.discountPercentage} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                        </div>
                                    )}
                                </div>
                                {validationErrors.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-1 mt-4">
                                        {validationErrors.map((err, idx) => (
                                            <p key={idx} className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                                                <Info className="w-4 h-4 flex-shrink-0" />{err}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('requiredTierLabel')}</label>
                                    <select name="requiredTier" value={formData.requiredTier} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        {Object.values(SubscriptionTier).filter(t => t !== SubscriptionTier.NONE).map(tier => <option key={tier} value={tier}>{tier}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration Date</label>
                                    <input type="date" name="expiresAt" required={!neverExpires} disabled={neverExpires} value={formData.expiresAt} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50" />
                                    <label className="flex items-center mt-2">
                                        <input type="checkbox" checked={neverExpires} onChange={(e) => setNeverExpires(e.target.checked)} className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded mr-2" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Never Expires</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="isExternal" name="isExternal" checked={formData.isExternal} onChange={handleChange} className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary" />
                                <label htmlFor="isExternal" className="text-sm font-medium text-gray-700 dark:text-gray-300">Is External Deal?</label>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Redemption */}
                    {formTab === 'Redemption' && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Redemption Code</label>
                                <div className="flex gap-2">
                                    <input type="text" name="redemptionCode" required value={formData.redemptionCode} onChange={handleChange} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="e.g., DIN-L7K9M2" />
                                    <button type="button" onClick={() => { const code = generateRedemptionCode(formData.category, formData.vendor); setFormData(prev => ({ ...prev, redemptionCode: code })); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap">
                                        <Save className="w-4 h-4" />Generate
                                    </button>
                                </div>
                            </div>

                            {/* Global Redemption Limit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Total Global Redemptions (Optional)
                                </label>
                                <div className="flex flex-col">
                                    <input
                                        type="number"
                                        name="maxRedemptionsTotal"
                                        min="1"
                                        value={formData.maxRedemptionsTotal || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. 100 (Leave empty for unlimited)"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Limit the total number of times this deal can be redeemed by ALL users combined.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Redemption Style</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2">
                                        <input type="checkbox" checked={formData.redemptionStyle?.includes('online') || false} onChange={(e) => { const current = formData.redemptionStyle || []; const updated = e.target.checked ? [...current, 'online'] : current.filter(s => s !== 'online'); setFormData(prev => ({ ...prev, redemptionStyle: updated as ('online' | 'in_store')[] })); }} className="h-4 w-4 rounded text-brand-primary" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Online</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input type="checkbox" checked={formData.redemptionStyle?.includes('in_store') || false} onChange={(e) => { const current = formData.redemptionStyle || []; const updated = e.target.checked ? [...current, 'in_store'] : current.filter(s => s !== 'in_store'); setFormData(prev => ({ ...prev, redemptionStyle: updated as ('online' | 'in_store')[] })); }} className="h-4 w-4 rounded text-brand-primary" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">In Store</span>
                                    </label>
                                </div>
                            </div>

                            {/* Smart Location Fields */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <StoreLocationFields
                                    redemptionStyle={formData.redemptionStyle}
                                    storeLocations={formData.storeLocations}
                                    onChange={(locations) => setFormData(prev => ({ ...prev, storeLocations: locations }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usage Limit (English)</label><input type="text" name="usageLimit" value={formData.usageLimit} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usage Limit (Turkish)</label><input type="text" name="usageLimit_tr" value={formData.usageLimit_tr} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validity (English)</label><input type="text" name="validity" value={formData.validity} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validity (Turkish)</label><input type="text" name="validity_tr" value={formData.validity_tr} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terms URL</label><input type="text" name="termsUrl" value={formData.termsUrl} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                        </div>
                    )}

                    <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-brand-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-primary/90 transition-colors flex items-center disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Saving...' : (isEditing ? 'Update Deal' : 'Submit for Approval')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDealPage;
