import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDeals } from '../../contexts/DealContext';
import { useToast } from '../../contexts/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Deal, SubscriptionTier } from '../../types';
import { SpinnerIcon } from '../Icons';
import { Save, ChevronDown, ChevronUp, Eye, X, Sparkles } from 'lucide-react';
import ImageUpload from '../ImageUpload';
import CountrySelector from '../CountrySelector';
import DealDetailView from '../DealDetailView';
import Modal from '../Modal';
import { generateRedemptionCode } from '../../lib/codeGenerator';
import { generateText } from '../../lib/vectorService';
import { logAdminAction } from '../../lib/supabaseService';
import {
  DEAL_PRESETS,
  getDiscountTypeOptions,
  getTimeTypeOptions,
  DealDiscountType,
  DealTimeType,
  DEFAULT_DEAL_VALUES,
} from '../../shared/dealTypes';

interface QuickAddDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealCreated: () => void;
  editDeal?: Deal | null;
}

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

const CATEGORY_IMAGES: Record<string, string> = {
  Dining: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
  "Food & Dining": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
  Travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
  Wellness: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop",
  Shopping: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
  Entertainment: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop",
  General: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop",
};

export default function QuickAddDealModal({
  isOpen,
  onClose,
  onDealCreated,
  editDeal,
}: QuickAddDealModalProps) {
  const { t, language } = useLanguage();
  const { categories, addDeal, updateDeal } = useDeals();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllDiscountTypes, setShowAllDiscountTypes] = useState(false);

  // Translation state
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Deal>>({
    category: 'Dining',
    category_tr: 'Yemek',
    dealTypeKey: DEFAULT_DEAL_VALUES.discountType,
    timeType: DEFAULT_DEAL_VALUES.timeType,
    requiredTier: SubscriptionTier.FREE,
    isTeasable: true,
    isExternal: false,
    status: 'approved',
    usageLimit: DEFAULT_DEAL_VALUES.usageLimit,
    usageLimit_tr: DEFAULT_DEAL_VALUES.usageLimit_tr,
    validity: DEFAULT_DEAL_VALUES.validity,
    validity_tr: DEFAULT_DEAL_VALUES.validity_tr,
    redemptionStyle: ['online', 'in_store'],
    countries: ['TR'],
  });

  const [expirySelection, setExpirySelection] = useState<number | 'custom' | 'never'>(30);
  const [customExpiryDays, setCustomExpiryDays] = useState(30);

  // Debounce for translations
  const debouncedTitle = useDebounce(formData.title, 800);
  const debouncedDesc = useDebounce(formData.description, 800);

  const translateField = async (
    text: string,
    field: 'title_tr' | 'description_tr',
    setTranslating: (val: boolean) => void
  ) => {
    if (!text?.trim()) return;
    setTranslating(true);
    try {
      const translated = await generateText(
        `Translate the following travel deal text to Turkish. Return ONLY the translated string without quotes:\n\n"${text}"`
      );
      if (translated) {
        setFormData(prev => ({ ...prev, [field]: translated.trim().replace(/^["']|["']$/g, '') }));
      }
    } catch (e) {
      console.warn('Gemini translation error:', e);
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    if (debouncedTitle && !formData.title_tr) {
      translateField(debouncedTitle, 'title_tr', setIsTranslatingTitle);
    }
  }, [debouncedTitle]);

  useEffect(() => {
    if (debouncedDesc && !formData.description_tr) {
      translateField(debouncedDesc, 'description_tr', setIsTranslatingDesc);
    }
  }, [debouncedDesc]);

  useEffect(() => {
    if (editDeal) {
      setFormData(editDeal);
      const isFar = editDeal.expiresAt && new Date(editDeal.expiresAt).getFullYear() > new Date().getFullYear() + 50;
      if (isFar) {
        setExpirySelection('never');
      } else if (editDeal.expiresAt) {
        const days = Math.ceil(
          (new Date(editDeal.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (days === 7 || days === 30 || days === 90) {
          setExpirySelection(days);
        } else if (days > 0) {
          setExpirySelection('custom');
          setCustomExpiryDays(days);
        }
      }
    } else {
      setFormData({
        category: 'Dining',
        category_tr: 'Yemek',
        dealTypeKey: DEFAULT_DEAL_VALUES.discountType,
        timeType: DEFAULT_DEAL_VALUES.timeType,
        requiredTier: SubscriptionTier.FREE,
        isTeasable: true,
        isExternal: false,
        status: 'approved',
        usageLimit: DEFAULT_DEAL_VALUES.usageLimit,
        usageLimit_tr: DEFAULT_DEAL_VALUES.usageLimit_tr,
        validity: DEFAULT_DEAL_VALUES.validity,
        validity_tr: DEFAULT_DEAL_VALUES.validity_tr,
        redemptionStyle: ['online', 'in_store'],
        countries: ['TR'],
      });
      setExpirySelection(30);
    }
  }, [editDeal, isOpen]);

  const handleApplyPreset = (presetKey: string) => {
    const preset = DEAL_PRESETS.find(p => p.key === presetKey);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        dealTypeKey: preset.discountType,
        timeType: preset.timeType,
        discountPercentage: preset.defaultPercentage || prev.discountPercentage,
        validity: preset.defaultValidity || prev.validity,
        validity_tr: preset.defaultValidity_tr || prev.validity_tr,
      }));
    }
  };

  const handlePriceCalculation = (field: 'orig' | 'disc' | 'pct', val: number) => {
    setFormData(prev => {
      const orig = field === 'orig' ? val : (prev.originalPrice || 0);
      const disc = field === 'disc' ? val : (prev.discountedPrice || 0);
      const pct = field === 'pct' ? val : (prev.discountPercentage || 0);

      const updated = { ...prev };
      if (field === 'orig') updated.originalPrice = val;
      if (field === 'disc') updated.discountedPrice = val;
      if (field === 'pct') updated.discountPercentage = val;

      if (field === 'pct' && orig > 0) {
        updated.discountedPrice = Number((orig * (1 - pct / 100)).toFixed(2));
      } else if (field === 'orig' && pct > 0) {
        updated.discountedPrice = Number((orig * (1 - pct / 100)).toFixed(2));
      } else if (field === 'disc' && orig > 0 && orig > disc) {
        updated.discountPercentage = Math.round(((orig - disc) / orig) * 100);
      }
      return updated;
    });
  };

  const computedExpiresAt = useMemo(() => {
    if (expirySelection === 'never') return getFarFutureDate();
    if (expirySelection === 'custom') return getExpiryDate(customExpiryDays || 30);
    return getExpiryDate(typeof expirySelection === 'number' ? expirySelection : 30);
  }, [expirySelection, customExpiryDays]);

  const previewDealObj: Deal = useMemo(() => {
    const defaultImg = CATEGORY_IMAGES[formData.category || 'Dining'] || CATEGORY_IMAGES.General;
    return {
      id: editDeal?.id || 'preview',
      title: formData.title || 'Deal Title Preview',
      title_tr: formData.title_tr || formData.title || 'Fırsat Başlığı',
      description: formData.description || 'Deal description will appear here.',
      description_tr: formData.description_tr || formData.description || 'Fırsat açıklaması burada görünecektir.',
      imageUrl: formData.imageUrl || defaultImg,
      companyLogoUrl: formData.companyLogoUrl,
      category: formData.category || 'Dining',
      category_tr: formData.category_tr || 'Yemek',
      originalPrice: formData.originalPrice || 0,
      discountedPrice: formData.discountedPrice || 0,
      discountPercentage: formData.discountPercentage,
      requiredTier: formData.requiredTier || SubscriptionTier.FREE,
      isTeasable: formData.isTeasable ?? true,
      isExternal: formData.isExternal || false,
      vendor: formData.vendor || 'Vendor Name',
      expiresAt: computedExpiresAt,
      rating: editDeal?.rating || 0,
      ratingCount: editDeal?.ratingCount || 0,
      usageLimit: formData.usageLimit || 'Unlimited',
      usageLimit_tr: formData.usageLimit_tr || 'Sınırsız',
      validity: formData.validity || 'Valid all days',
      validity_tr: formData.validity_tr || 'Her gün geçerli',
      termsUrl: formData.termsUrl || '',
      redemptionCode: formData.redemptionCode || 'CODE-123',
      redemptionStyle: formData.redemptionStyle || ['online', 'in_store'],
      countries: formData.countries || ['TR'],
      dealTypeKey: formData.dealTypeKey || 'percentage_off',
      timeType: formData.timeType || 'standard',
      maxRedemptionsTotal: formData.maxRedemptionsTotal,
      status: formData.status || 'approved',
    };
  }, [formData, editDeal, computedExpiresAt]);

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Validation
      if (!formData.title?.trim() || !formData.vendor?.trim() || !formData.category) {
        showErrorToast(t('Please fill in Title, Vendor and Category'));
        setIsLoading(false);
        return;
      }

      const finalCode =
        formData.redemptionCode?.trim() ||
        generateRedemptionCode(formData.category, formData.vendor);

      const finalImg =
        formData.imageUrl?.trim() ||
        CATEGORY_IMAGES[formData.category] ||
        CATEGORY_IMAGES.General;

      const dealPayload: any = {
        ...formData,
        imageUrl: finalImg,
        redemptionCode: finalCode,
        expiresAt: computedExpiresAt,
        status: formData.status || 'approved',
        title_tr: formData.title_tr || formData.title,
        description_tr: formData.description_tr || formData.description,
      };

      if (editDeal) {
        await updateDeal(dealPayload);
        await logAdminAction({
          action_type: 'UPDATE',
          table_name: 'deals',
          record_id: editDeal.id,
          old_data: editDeal,
          new_data: dealPayload,
        });
        showSuccessToast(t('adminSuccessTitle') || 'Deal updated successfully');
      } else {
        const result = await addDeal({
          ...dealPayload,
          id: Date.now().toString(),
        });
        await logAdminAction({
          action_type: 'CREATE',
          table_name: 'deals',
          record_id: (result as any)?.id?.toString() || 'new',
          new_data: dealPayload,
        });
        showSuccessToast(t('adminSuccessTitle') || 'Deal created successfully');
      }

      onDealCreated();
      onClose();
    } catch (e: any) {
      console.error('Error saving deal:', e);
      showErrorToast(t('saveDealError') || 'Failed to save deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white dark:bg-brand-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">⚡</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editDeal ? (t('editDeal') || 'Edit Deal') : (t('quickAddDeal') || 'Quick Add Deal')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create high-converting deals in seconds with smart auto-translation & codes
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

            {/* Section 1: Presets (Only in Add mode) */}
            {!editDeal && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-primary" />
                  {t('startFromTemplate') || '1-Click Presets'}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {DEAL_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleApplyPreset(preset.key)}
                      className="whitespace-nowrap px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-primary dark:hover:border-brand-primary hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 transition-all text-left flex items-center gap-2 group text-xs"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">
                        {language === 'tr' ? preset.name_tr : preset.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {preset.defaultPercentage ? `%${preset.defaultPercentage}` : preset.discountType}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Categories (Visual Chips) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('categoryLabel') || 'Category'} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = formData.category === cat.name;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          category: cat.name,
                          category_tr: cat.name_tr || cat.name,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20 ring-2 ring-brand-primary/30'
                          : 'bg-gray-100 dark:bg-brand-bg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <span>{cat.icon || '🏷️'}</span>
                      <span>{language === 'tr' ? cat.name_tr || cat.name : cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Core Deal Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('dealTitle') || 'Deal Title'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. 20% Off Weekend Brunch"
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900 dark:text-white text-sm"
                    />
                    {isTranslatingTitle && (
                      <SpinnerIcon className="absolute right-3 top-3 w-4 h-4 text-brand-primary" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('vendorLabel') || 'Vendor / Brand'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vendor || ''}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g. Luna Cafe & Bistro"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('description') || 'Description'}
                </label>
                <div className="relative">
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Brief description of the deal discount..."
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent text-gray-900 dark:text-white text-sm resize-none"
                  />
                  {isTranslatingDesc && (
                    <SpinnerIcon className="absolute right-3 top-3 w-4 h-4 text-brand-primary" />
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Discount Configuration */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-brand-bg/50 border border-gray-200 dark:border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('dealTypeLabel') || 'Discount Setup'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllDiscountTypes(!showAllDiscountTypes)}
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-medium"
                >
                  {showAllDiscountTypes ? 'Less Types' : 'All 8 Types'}
                  {showAllDiscountTypes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* Main 3 types */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'percentage_off', label: '🏷️ % Off' },
                  { key: 'fixed_price', label: '✨ Fixed Price' },
                  { key: 'bogo', label: '🎁 BOGO (1+1)' },
                ].map(({ key, label }) => {
                  const isSelected = (formData.dealTypeKey || 'percentage_off') === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, dealTypeKey: key as DealDiscountType })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold ring-1 ring-brand-primary'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-brand-surface text-gray-700 dark:text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Extended types dropdown/grid */}
              {showAllDiscountTypes && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                  {getDiscountTypeOptions(language, true)
                    .filter(t => !['percentage_off', 'fixed_price', 'bogo'].includes(t.value))
                    .map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, dealTypeKey: option.value as DealDiscountType })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-all text-left truncate ${
                          formData.dealTypeKey === option.value
                            ? 'border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-surface text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                </div>
              )}

              {/* Pricing inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('discountPercentageLabel') || 'Discount (%)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercentage ?? ''}
                    onChange={(e) => handlePriceCalculation('pct', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('originalPriceLabel') || 'Original Price (₺)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.originalPrice || ''}
                    onChange={(e) => handlePriceCalculation('orig', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t('discountedPriceLabel') || 'Special Price (₺)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountedPrice || ''}
                    onChange={(e) => handlePriceCalculation('disc', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 200"
                    className="w-full px-3 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Expiry Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('expires') || 'Deal Expiration'}
              </label>
              <div className="flex flex-wrap gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExpirySelection(days)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      expirySelection === days
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-brand-bg text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setExpirySelection('custom')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    expirySelection === 'custom'
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-brand-bg text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  Custom
                </button>
                <button
                  type="button"
                  onClick={() => setExpirySelection('never')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    expirySelection === 'never'
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-brand-bg text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  Never Expires
                </button>
              </div>

              {expirySelection === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="1"
                    value={customExpiryDays}
                    onChange={(e) => setCustomExpiryDays(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-1.5 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">days from today</span>
                </div>
              )}
            </div>

            {/* Section 6: Advanced Settings (Collapsible) */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3.5 bg-gray-50 dark:bg-brand-bg/50 hover:bg-gray-100 dark:hover:bg-brand-bg transition-colors"
              >
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  ⚙️ Advanced Settings (Tier, Photos, Code, Location, Limits)
                </span>
                {showAdvanced ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-5 bg-white dark:bg-brand-surface border-t border-gray-200 dark:border-gray-800 animate-fade-in">
                  {/* Turkish translation overrides */}
                  <div className="p-3 bg-gray-50 dark:bg-brand-bg/30 rounded-xl space-y-3">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      📝 Turkish Translations (Auto-Generated)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-gray-500 block mb-1">Title (TR)</span>
                        <input
                          type="text"
                          value={formData.title_tr || ''}
                          onChange={(e) => setFormData({ ...formData, title_tr: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-500 block mb-1">Description (TR)</span>
                        <input
                          type="text"
                          value={formData.description_tr || ''}
                          onChange={(e) => setFormData({ ...formData, description_tr: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-700 rounded-lg text-xs dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tier & Time Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Required Subscription Tier
                      </label>
                      <select
                        value={formData.requiredTier || SubscriptionTier.FREE}
                        onChange={(e) => setFormData({ ...formData, requiredTier: e.target.value as SubscriptionTier })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:text-white"
                      >
                        <option value={SubscriptionTier.FREE}>FREE (Everyone)</option>
                        <option value={SubscriptionTier.BASIC}>BASIC</option>
                        <option value={SubscriptionTier.PREMIUM}>PREMIUM</option>
                        <option value={SubscriptionTier.VIP}>VIP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Time Schedule Type
                      </label>
                      <select
                        value={formData.timeType || 'standard'}
                        onChange={(e) => setFormData({ ...formData, timeType: e.target.value as DealTimeType })}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:text-white"
                      >
                        {getTimeTypeOptions(language).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Deal Image (Optional — Category photo used if empty)
                      </label>
                      <ImageUpload
                        value={formData.imageUrl || ''}
                        onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                        bucketName="deals"
                        placeholder="Upload deal cover photo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Company Logo (Optional)
                      </label>
                      <ImageUpload
                        value={formData.companyLogoUrl || ''}
                        onChange={(url) => setFormData({ ...formData, companyLogoUrl: url })}
                        bucketName="deals"
                        placeholder="Upload vendor logo"
                      />
                    </div>
                  </div>

                  {/* Redemption Code & Max Redemptions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Redemption Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.redemptionCode || ''}
                          onChange={(e) => setFormData({ ...formData, redemptionCode: e.target.value })}
                          placeholder="Auto-generated on save"
                          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-mono dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            redemptionCode: generateRedemptionCode(formData.category || 'Dining', formData.vendor)
                          })}
                          className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Total Supply Limit (Max Redemptions)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxRedemptionsTotal ?? ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          maxRedemptionsTotal: e.target.value === '' ? null : parseInt(e.target.value)
                        })}
                        placeholder="Leave empty for unlimited"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Countries */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Available Countries
                    </label>
                    <CountrySelector
                      selectedCountries={formData.countries || ['TR']}
                      onChange={(countries) => setFormData({ ...formData, countries })}
                      language={language === 'tr' ? 'tr' : 'en'}
                    />
                  </div>

                  {/* Terms URL */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Terms & Conditions URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.termsUrl || ''}
                      onChange={(e) => setFormData({ ...formData, termsUrl: e.target.value })}
                      placeholder="https://example.com/terms"
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50 dark:bg-brand-surface rounded-b-2xl flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-brand-bg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!formData.title?.trim() || !formData.vendor?.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye size={16} />
                <span>{t('preview') || 'Preview'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading || !formData.title?.trim() || !formData.vendor?.trim()}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? <SpinnerIcon className="w-4 h-4 text-white" /> : <Save size={16} />}
                <span>{editDeal ? (t('updateDeal') || 'Update Deal') : (t('saveDeal') || 'Save Deal')}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <Modal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={t('preview') || 'Deal Preview'}
        >
          <div className="max-h-[80vh] overflow-y-auto">
            <DealDetailView deal={previewDealObj} isPreview={true} />
          </div>
        </Modal>
      )}
    </>
  );
}
