import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useDeals } from '../contexts/DealContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useContent } from '../contexts/ContentContext';
import { Deal, User, SubscriptionTier, PageContent } from '../types';
import { SpinnerIcon } from '../components/Icons';
import { calculateRemainingRedemptions, getNextRenewalDate } from '../lib/redemptionLogic';
import ImageUpload from '../components/ImageUpload';

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

// FIX: Added missing properties to EMPTY_DEAL to satisfy the Omit<Deal, 'expiresAt'> type.
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
  requiredTier: SubscriptionTier.FREE,
  isExternal: false,
  vendor: '',
  rating: 0,
  ratingCount: 0,
  usageLimit: '',
  usageLimit_tr: '',
  validity: '',
  validity_tr: '',
  termsUrl: '#',
  redemptionCode: '',
  discountPercentage: undefined,
};

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  tier: SubscriptionTier.FREE,
  savedDeals: [],
  referrals: [],
  referralChain: [],
  referralNetwork: [],
  extraRedemptions: 0,
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

const AdminPage: React.FC = () => {
  // Common
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'deals' | 'users' | 'content' | 'flight_routes'>('deals');
  const [showSuccess, setShowSuccess] = useState('');

  // Deals Management
  const { deals, addDeal, updateDeal, deleteDeal } = useDeals();
  const [isDealFormVisible, setIsDealFormVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealFormData, setDealFormData] = useState<Omit<Deal, 'expiresAt'>>(EMPTY_DEAL);
  const [expiresInDays, setExpiresInDays] = useState<number | string>('');
  const [neverExpires, setNeverExpires] = useState(false);
  const [isTranslating, setIsTranslating] = useState({ title: false, description: false });
  const [lastEditedField, setLastEditedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Users Management
  const { user: loggedInUser, users, updateUser, deleteUser, addExtraRedemptions } = useAuth();
  const [isUserFormVisible, setIsUserFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<User>(EMPTY_USER);
  const [dealToAdd, setDealToAdd] = useState<string>('');
  const [redemptionsToAdd, setRedemptionsToAdd] = useState(0);


  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => Number(b.id) - Number(a.id));
  }, [deals]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const userIdToNameMap = useMemo(() =>
    users.reduce((acc, user) => {
      acc[user.id] = user.name;
      return acc;
    }, {} as Record<string, string>),
    [users]);

  // Translation Logic
  const debouncedTitle = useDebounce(dealFormData.title, 800);
  const debouncedTitleTr = useDebounce(dealFormData.title_tr, 800);
  const debouncedDescription = useDebounce(dealFormData.description, 800);
  const debouncedDescriptionTr = useDebounce(dealFormData.description_tr, 800);

  const translateText = useCallback(async (text: string, targetLanguage: 'English' | 'Turkish'): Promise<string> => {
    if (!text.trim()) return '';
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

  // Deal handlers
  const handleDealInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (['title', 'title_tr', 'description', 'description_tr'].includes(name)) setLastEditedField(name);

    let newValue: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? parseFloat(value) : value;

    setDealFormData(prev => {
      const updated = { ...prev, [name]: newValue };

      // Auto-calculate discounted price if discount percentage changes AND original price is set
      if (name === 'discountPercentage' && updated.originalPrice > 0) {
        const discount = parseFloat(value);
        if (!isNaN(discount)) {
          updated.discountedPrice = Number((updated.originalPrice * (1 - discount / 100)).toFixed(2));
        }
      }
      // Auto-calculate discounted price if original price changes AND discount percentage is set
      else if (name === 'originalPrice' && updated.discountPercentage) {
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

    // Calculate discount percentage if missing and prices exist
    if (!deal.discountPercentage && deal.originalPrice > 0 && deal.discountedPrice < deal.originalPrice) {
      const discount = ((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100;
      setDealFormData(prev => ({ ...prev, discountPercentage: Math.round(discount) }));
    }

    setIsDealFormVisible(true); window.scrollTo(0, 0);
  };

  const handleDeleteDealClick = (dealId: string) => {
    if (window.confirm(t('deleteConfirmation'))) deleteDeal(dealId);
  };

  const resetDealForm = () => {
    setEditingDeal(null); setDealFormData(EMPTY_DEAL); setExpiresInDays(''); setNeverExpires(false); setIsDealFormVisible(false); setLastEditedField(null);
  };

  const handleDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let finalImageUrl = dealFormData.imageUrl;

    if (!finalImageUrl) {
      setIsGeneratingImage(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    const dealData = { ...dealFormData, imageUrl: finalImageUrl, expiresAt: neverExpires ? getFarFutureDate() : getExpiryDate(typeof expiresInDays === 'number' ? expiresInDays : parseInt(expiresInDays as string) || 7), category_tr: dealFormData.category === 'Dining' ? 'Yemek' : dealFormData.category === 'Wellness' ? 'Sağlık' : 'Seyahat' };
    if (editingDeal) {
      updateDeal(dealData);
    } else {
      addDeal({ ...dealData, id: Date.now().toString() });
    }
    setIsSaving(false);
    resetDealForm();
  };

  // User handlers
  const handleEditUserClick = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      ...user,
      savedDeals: user.savedDeals || [],
      referrals: user.referrals || [],
      referralChain: user.referralChain || [],
      referralNetwork: user.referralNetwork || [],
      extraRedemptions: user.extraRedemptions || 0,
    });
    setDealToAdd('');
    setRedemptionsToAdd(0);
    setIsUserFormVisible(true);
  };

  const handleDeleteUserClick = (userId: string) => {
    if (window.confirm(t('deleteUserConfirmation'))) deleteUser(userId);
  };

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const resetUserForm = () => {
    setIsUserFormVisible(false);
    setEditingUser(null);
    setUserFormData(EMPTY_USER);
    setDealToAdd('');
  };

  const handleUserFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) updateUser(userFormData);
    resetUserForm();
  };

  const handleAddDealToUser = () => {
    if (dealToAdd && !userFormData.savedDeals?.includes(dealToAdd)) {
      setUserFormData(prev => ({
        ...prev,
        savedDeals: [...(prev.savedDeals || []), dealToAdd]
      }));
      setDealToAdd('');
    }
  };

  const handleRemoveDealFromUser = (dealIdToRemove: string) => {
    setUserFormData(prev => ({
      ...prev,
      savedDeals: (prev.savedDeals || []).filter(id => id !== dealIdToRemove)
    }));
  };

  const handleAddRedemptions = () => {
    if (redemptionsToAdd > 0 && editingUser) {
      addExtraRedemptions(editingUser.id, redemptionsToAdd);
      // We need to update the local form state to reflect the change immediately
      setUserFormData(prev => ({
        ...prev,
        extraRedemptions: (prev.extraRedemptions || 0) + redemptionsToAdd
      }));
      setShowSuccess(t('redemptionsAddedSuccess'));
      setTimeout(() => setShowSuccess(''), 2000);
      setRedemptionsToAdd(0);
    }
  };


  const userSavedDeals = useMemo(() => {
    if (!userFormData.savedDeals) return [];
    return userFormData.savedDeals
      .map(dealId => deals.find(d => d.id === dealId))
      .filter((d): d is Deal => !!d);
  }, [userFormData.savedDeals, deals]);

  return (
    <div className="container mx-auto px-4 pt-6 pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-brand-text-light">{t('adminDashboard')}</h1>
      </header>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button onClick={() => setActiveTab('deals')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'deals' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageDeals')}
        </button>
        <button onClick={() => setActiveTab('users')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'users' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageUsers')}
        </button>
        <button onClick={() => setActiveTab('content')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'content' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Manage Content
        </button>
        <button onClick={() => setActiveTab('flight_routes')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 ${activeTab === 'flight_routes' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Flight Routes
        </button>
      </div>

      {activeTab === 'deals' && (
        <>
          {!isDealFormVisible && (
            <button onClick={() => setIsDealFormVisible(true)} className="mb-6 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
              {t('addDeal')}
            </button>
          )}

          {isDealFormVisible && (
            <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">{editingDeal ? t('editDeal') : t('addDeal')}</h2>
              <form onSubmit={handleDealSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('titleLabel')}</label><div className="relative"><input type="text" name="title" value={dealFormData.title} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />{isTranslating.title && lastEditedField === 'title_tr' && (<SpinnerIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary" />)}</div></div>
                  <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('titleTrLabel')}</label><div className="relative"><input type="text" name="title_tr" value={dealFormData.title_tr} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />{isTranslating.title && lastEditedField === 'title' && (<SpinnerIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary" />)}</div></div>
                  <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('descriptionLabel')}</label><div className="relative"><textarea name="description" value={dealFormData.description} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 h-24" />{isTranslating.description && lastEditedField === 'description_tr' && (<SpinnerIcon className="absolute right-2 top-3 w-5 h-5 text-brand-primary" />)}</div></div>
                  <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('descriptionTrLabel')}</label><div className="relative"><textarea name="description_tr" value={dealFormData.description_tr} onChange={handleDealInputChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 h-24" />{isTranslating.description && lastEditedField === 'description' && (<SpinnerIcon className="absolute right-2 top-3 w-5 h-5 text-brand-primary" />)}</div></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('imageUrlLabel')}</label>
                    <ImageUpload
                      value={dealFormData.imageUrl}
                      onChange={(base64) => setDealFormData(prev => ({ ...prev, imageUrl: base64 }))}
                      placeholder={t('imageUrlOptionalHint') || "Upload Deal Image"}
                    />
                    {/* Fallback text input for external URLs if needed, or just keep it simple */}
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">Or enter URL manually:</p>
                      <input type="text" name="imageUrl" value={dealFormData.imageUrl} onChange={handleDealInputChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-xs" placeholder="https://..." />
                    </div>
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
                  <div><label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('expiresInDaysLabel')}</label><input type="number" value={expiresInDays} onChange={e => setExpiresInDays(e.target.value === '' ? '' : parseInt(e.target.value, 10))} required disabled={neverExpires} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed" /></div>
                  <div className="flex items-center space-x-2"><input type="checkbox" id="neverExpires" name="neverExpires" checked={neverExpires} onChange={e => setNeverExpires(e.target.checked)} className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary" /><label htmlFor="neverExpires" className="text-sm font-medium text-gray-600 dark:text-brand-text-muted">{t('neverExpires')}</label></div>
                  <div className="flex items-center space-x-2 pt-5"><input type="checkbox" id="isExternal" name="isExternal" checked={dealFormData.isExternal} onChange={handleDealInputChange} className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary" /><label htmlFor="isExternal" className="text-sm font-medium text-gray-600 dark:text-brand-text-muted">Is External Deal?</label></div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
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

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('allDeals')}</h2>
            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                  <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg"><tr><th scope="col" className="px-6 py-3">Title</th><th scope="col" className="px-6 py-3">Category</th><th scope="col" className="px-6 py-3">Price</th><th scope="col" className="px-6 py-3">Discount</th><th scope="col" className="px-6 py-3">Tier</th><th scope="col" className="px-6 py-3 text-right">Actions</th></tr></thead>
                  <tbody>{sortedDeals.map(deal => (<tr key={deal.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"><th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap">{deal.title}</th><td className="px-6 py-4">{deal.category}</td><td className="px-6 py-4">${deal.discountedPrice}</td><td className="px-6 py-4">{deal.discountPercentage ? `${deal.discountPercentage}%` : '-'}</td><td className="px-6 py-4">{deal.requiredTier}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => handleEditDealClick(deal)} className="font-medium text-brand-secondary hover:underline">Edit</button><button onClick={() => handleDeleteDealClick(deal.id)} className="font-medium text-red-500 hover:underline">Delete</button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'users' && (
        <>
          {isUserFormVisible && (
            <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">{t('editUser')}</h2>
              <form onSubmit={handleUserFormSubmit} className="space-y-4 max-w-2xl">
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div><label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('fullNameLabel')}</label><input type="text" id="name" name="name" value={userFormData.name} onChange={handleUserFormChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                  <div><label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('emailLabel')}</label><input type="email" id="email" name="email" value={userFormData.email} onChange={handleUserFormChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                  <div><label htmlFor="tier" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('tier')}</label><select id="tier" name="tier" value={userFormData.tier} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">{Object.values(SubscriptionTier).filter(t => t !== SubscriptionTier.NONE).map(tier => <option key={tier} value={tier}>{tier}</option>)}</select></div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3">{t('addExtraRedemptions')}</h3>
                  <div className="p-3 bg-gray-100 dark:bg-brand-bg rounded-md">
                    <p className="text-sm text-gray-600 dark:text-brand-text-muted mb-2">{t('currentBonusRedemptions')}: <span className="font-bold text-lg text-gray-900 dark:text-white">{userFormData.extraRedemptions || 0}</span></p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={redemptionsToAdd}
                        onChange={e => setRedemptionsToAdd(Math.max(0, parseInt(e.target.value, 10)))}
                        placeholder={t('redemptionsToAdd')}
                        className="flex-grow bg-white dark:bg-brand-surface rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddRedemptions}
                        disabled={!redemptionsToAdd || redemptionsToAdd <= 0}
                        className="bg-brand-secondary text-brand-bg font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {t('addRedemptions')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-3">{t('manageSavedDeals')}</h3>
                  <div className="space-y-2 mb-4">
                    {userSavedDeals.length > 0 ? (
                      userSavedDeals.map(deal => (
                        <div key={deal.id} className="flex justify-between items-center bg-gray-100 dark:bg-brand-bg p-2 rounded-md">
                          <p className="text-sm text-gray-800 dark:text-brand-text-light">{language === 'tr' ? deal.title_tr : deal.title}</p>
                          <button type="button" onClick={() => handleRemoveDealFromUser(deal.id)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500 font-semibold">{t('remove')}</button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-brand-text-muted italic">{t('noSavedDealsForUser')}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select value={dealToAdd} onChange={e => setDealToAdd(e.target.value)} className="flex-grow bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                      <option value="">{t('selectDeal')}</option>
                      {deals.map(deal => (
                        <option key={deal.id} value={deal.id} disabled={userFormData.savedDeals?.includes(deal.id)}>
                          {language === 'tr' ? deal.title_tr : deal.title}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={handleAddDealToUser} disabled={!dealToAdd} className="bg-brand-secondary text-brand-bg font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                      {t('add')}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('referralChainLabel')}</h3>
                    <div className="bg-gray-100 dark:bg-brand-bg p-3 rounded-md text-sm text-gray-800 dark:text-brand-text-light min-h-[40px] flex items-center">
                      {(userFormData.referralChain?.length ?? 0) > 0 ? (
                        <span>{userFormData.referralChain?.map(id => userIdToNameMap[id] || 'Unknown').join(' → ')}</span>
                      ) : (
                        <p className="italic text-gray-500 dark:text-brand-text-muted">{t('topOfChain')}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('referralNetworkLabel')}</h3>
                    <div className="bg-gray-100 dark:bg-brand-bg p-3 rounded-md text-sm text-gray-800 dark:text-brand-text-light min-h-[40px]">
                      {(userFormData.referralNetwork?.length ?? 0) > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {userFormData.referralNetwork?.map(id => (
                            <li key={id}>{userIdToNameMap[id] || 'Unknown User'}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="italic text-gray-500 dark:text-brand-text-muted">{t('noNetwork')}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4"><button type="button" onClick={resetUserForm} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button><button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">{t('updateUser')}</button></div>
              </form>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-bold mb-4">{t('allUsers')}</h2>
            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                  <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                    <tr>
                      <th scope="col" className="px-6 py-3">{t('fullNameLabel')}</th>
                      <th scope="col" className="px-6 py-3">{t('emailLabel')}</th>
                      <th scope="col" className="px-6 py-3">{t('tier')}</th>
                      <th scope="col" className="px-6 py-3">Redemptions Left</th>
                      <th scope="col" className="px-6 py-3">Renews On</th>
                      <th scope="col" className="px-6 py-3 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(user => {
                      const { remaining, total } = calculateRemainingRedemptions(user);
                      const renewalDate = getNextRenewalDate().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');

                      return (
                        <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap">
                            {user.name}{user.isAdmin && <span className="ml-2 text-xs bg-brand-secondary text-brand-bg font-bold px-2 py-0.5 rounded-full">Admin</span>}
                          </th>
                          <td className="px-6 py-4">{user.email}</td>
                          <td className="px-6 py-4">{user.tier}</td>
                          <td className="px-6 py-4">
                            <span className={`font-semibold ${remaining === 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {total === Infinity ? '∞' : `${remaining} / ${total}`}
                            </span>
                          </td>
                          <td className="px-6 py-4">{renewalDate}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleEditUserClick(user)} className="font-medium text-brand-secondary hover:underline">{t('editDeal')}</button>
                            <button onClick={() => handleDeleteUserClick(user.id)} className="font-medium text-red-500 hover:underline disabled:text-red-500/50 disabled:cursor-not-allowed" disabled={user.id === loggedInUser?.id}>{t('deleteDeal')}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'content' && (
        <ContentManager />
      )}

      {activeTab === 'flight_routes' && (
        <FlightRouteManager />
      )}

      {showSuccess && (
        <div className="fixed bottom-28 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50">
          {showSuccess}
        </div>
      )}
    </div>
  );
};

// Sub-component for Content Management
const ContentManager: React.FC = () => {
  const { content, updateContent, loading } = useContent();
  const { t } = useLanguage();
  const [selectedPage, setSelectedPage] = useState<string>('home');
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Group content by page and section
  const groupedContent = useMemo(() => {
    const grouped: Record<string, Record<string, PageContent[]>> = {};
    content.forEach(item => {
      if (!grouped[item.page_key]) grouped[item.page_key] = {};
      if (!grouped[item.page_key][item.section_key]) grouped[item.page_key][item.section_key] = [];
      grouped[item.page_key][item.section_key].push(item);
    });
    return grouped;
  }, [content]);

  const handleContentChange = (id: string, field: 'content_value' | 'content_value_tr', value: string) => {
    setEditingContent(prev => ({ ...prev, [`${id}-${field}`]: value }));
  };

  const handleSave = async (item: PageContent) => {
    setIsSaving(true);
    try {
      const newValue = editingContent[`${item.id}-content_value`] ?? item.content_value;
      const newValueTr = editingContent[`${item.id}-content_value_tr`] ?? item.content_value_tr;

      await updateContent({
        ...item,
        content_value: newValue,
        content_value_tr: newValueTr
      });

      // Clear local edit state for this item
      setEditingContent(prev => {
        const newState = { ...prev };
        delete newState[`${item.id}-content_value`];
        delete newState[`${item.id}-content_value_tr`];
        return newState;
      });
    } catch (error) {
      console.error('Failed to save content', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><SpinnerIcon className="w-8 h-8 mx-auto text-brand-primary animate-spin" /></div>;

  const pageContent = groupedContent[selectedPage] || {};

  return (
    <div className="space-y-8">
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        {Object.keys(groupedContent).map(page => (
          <button
            key={page}
            onClick={() => setSelectedPage(page)}
            className={`px-4 py-2 rounded-md capitalize ${selectedPage === page ? 'bg-brand-primary text-white' : 'bg-gray-100 dark:bg-brand-surface text-gray-700 dark:text-brand-text-light hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {page}
          </button>
        ))}
      </div>

      {Object.entries(pageContent).map(([sectionKey, items]: [string, PageContent[]]) => (
        <section key={sectionKey} className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm">
          <h3 className="text-xl font-bold mb-4 capitalize text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">{sectionKey} Section</h3>
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-brand-bg rounded-lg">
                <div className="md:col-span-2 flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-500 dark:text-brand-text-muted uppercase tracking-wider">{item.content_key}</span>
                  <button
                    onClick={() => handleSave(item)}
                    disabled={isSaving || (!editingContent[`${item.id}-content_value`] && !editingContent[`${item.id}-content_value_tr`])}
                    className="text-sm bg-brand-secondary text-brand-bg px-3 py-1 rounded hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-brand-text-muted mb-1">English</label>
                  <div className="text-xs text-gray-400 mb-1 truncate" title={item.content_value}>
                    Current: {item.content_value}
                  </div>
                  {item.content_type === 'image' ? (
                    <div className="space-y-2">
                      <ImageUpload
                        value={editingContent[`${item.id}-content_value`] ?? item.content_value}
                        onChange={(base64) => handleContentChange(item.id, 'content_value', base64)}
                        placeholder="Upload Content Image"
                      />
                      <div className="mt-1">
                        <p className="text-xs text-gray-500 mb-1">Or enter URL:</p>
                        <input
                          type="text"
                          value={editingContent[`${item.id}-content_value`] ?? item.content_value}
                          onChange={(e) => handleContentChange(item.id, 'content_value', e.target.value)}
                          className="w-full bg-white dark:bg-brand-surface rounded border border-gray-300 dark:border-gray-600 p-2 text-sm"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={editingContent[`${item.id}-content_value`] ?? item.content_value}
                      onChange={(e) => handleContentChange(item.id, 'content_value', e.target.value)}
                      className="w-full bg-white dark:bg-brand-surface rounded border border-gray-300 dark:border-gray-600 p-2 text-sm h-24"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-brand-text-muted mb-1">Turkish</label>
                  <div className="text-xs text-gray-400 mb-1 truncate" title={item.content_value_tr || ''}>
                    Current: {item.content_value_tr || '-'}
                  </div>
                  {item.content_type === 'image' ? (
                    <p className="text-sm text-gray-400 italic">Images are shared across languages currently.</p>
                  ) : (
                    <textarea
                      value={editingContent[`${item.id}-content_value_tr`] ?? (item.content_value_tr || '')}
                      onChange={(e) => handleContentChange(item.id, 'content_value_tr', e.target.value)}
                      className="w-full bg-white dark:bg-brand-surface rounded border border-gray-300 dark:border-gray-600 p-2 text-sm h-24"
                      placeholder="Add Turkish translation..."
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {Object.keys(pageContent).length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-brand-text-muted">
          No editable content found for this page.
        </div>
      )}
    </div>
  );
};

// Sub-component for Flight Route Management
const FlightRouteManager: React.FC = () => {
  const { deals, addDeal, updateDeal, deleteDeal } = useDeals();
  const { t } = useLanguage();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Deal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    origin: '',
    destination: '',
    imageUrl: '',
    departDate: '',
    price: 0,
  });

  const flightRoutes = useMemo(() => deals.filter(d => d.category === 'FlightWidget'), [deals]);

  const handleEditClick = (deal: Deal) => {
    setEditingRoute(deal);
    setFormData({
      title: deal.title,
      origin: deal.vendor, // Vendor stores Origin
      destination: deal.redemptionCode, // Redemption Code stores Destination
      imageUrl: deal.imageUrl,
      departDate: deal.expiresAt, // Expires At stores Departure Date
      price: deal.discountedPrice, // Discounted Price stores Price
    });
    setIsFormVisible(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      deleteDeal(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dealData: any = {
      title: formData.title,
      title_tr: formData.title, // Fallback
      description: 'Flight Route',
      description_tr: 'Uçuş Rotası',
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074',
      category: 'FlightWidget',
      category_tr: 'Uçuş Widget',
      originalPrice: formData.price,
      discountedPrice: formData.price,
      requiredTier: SubscriptionTier.FREE,
      isExternal: false,
      vendor: formData.origin,
      redemptionCode: formData.destination,
      expiresAt: formData.departDate,
      rating: 5,
      ratingCount: 1,
      usageLimit: '',
      usageLimit_tr: '',
      validity: '',
      validity_tr: '',
      termsUrl: '',
    };

    if (editingRoute) {
      updateDeal({ ...dealData, id: editingRoute.id });
    } else {
      addDeal({ ...dealData, id: Date.now().toString() });
    }
    setIsFormVisible(false);
    setEditingRoute(null);
    setFormData({ title: '', origin: '', destination: '', imageUrl: '', departDate: '', price: 0 });
  };

  return (
    <div className="space-y-6">
      {!isFormVisible && (
        <button onClick={() => setIsFormVisible(true)} className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
          Add Flight Route
        </button>
      )}

      {isFormVisible && (
        <section className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{editingRoute ? 'Edit Route' : 'Add New Route'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Route Name (e.g. Istanbul to London)</label>
              <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Origin Code (e.g. IST)</label>
              <input type="text" value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value.toUpperCase() })} required maxLength={3} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Destination Code (e.g. LHR)</label>
              <input type="text" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value.toUpperCase() })} required maxLength={3} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Departure Date</label>
              <input type="date" value={formData.departDate} onChange={e => setFormData({ ...formData, departDate: e.target.value })} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Starting Price ($)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Image URL</label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(base64) => setFormData({ ...formData, imageUrl: base64 })}
                placeholder="Upload Route Image"
              />
              <div className="mt-1">
                <p className="text-xs text-gray-500 mb-1">Or enter URL:</p>
                <input type="text" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-xs" placeholder="https://..." />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 mt-4">
              <button type="button" onClick={() => { setIsFormVisible(false); setEditingRoute(null); }} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">Save Route</button>
            </div>
          </form>
        </section>
      )}

      <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
          <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
            <tr>
              <th className="px-6 py-3">Route</th>
              <th className="px-6 py-3">Origin</th>
              <th className="px-6 py-3">Dest</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Price</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flightRoutes.map(route => (
              <tr key={route.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light">{route.title}</td>
                <td className="px-6 py-4">{route.vendor}</td>
                <td className="px-6 py-4">{route.redemptionCode}</td>
                <td className="px-6 py-4">{route.expiresAt}</td>
                <td className="px-6 py-4">${route.discountedPrice}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEditClick(route)} className="font-medium text-brand-secondary hover:underline">Edit</button>
                  <button onClick={() => handleDeleteClick(route.id)} className="font-medium text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {flightRoutes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-brand-text-muted">
                  No flight routes added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;