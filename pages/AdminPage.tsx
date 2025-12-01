import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useDeals } from '../contexts/DealContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useContent } from '../contexts/ContentContext';
import { Deal, User, SubscriptionTier, PageContent } from '../types';
import { SpinnerIcon } from '../components/Icons';
import { calculateRemainingRedemptions, getNextRenewalDate } from '../lib/redemptionLogic';
import { getPendingDeals, updateDealStatus } from '../lib/supabaseService';
import ImageUpload from '../components/ImageUpload';
import Modal from '../components/Modal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import PaymentTransactionTable from '../components/PaymentTransactionTable';

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
  latitude: undefined,
  longitude: undefined,
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
  const [activeTab, setActiveTab] = useState<'deals' | 'users' | 'content' | 'flight_routes' | 'payments' | 'pending_approvals' | 'analytics'>('analytics');
  const [showSuccess, setShowSuccess] = useState('');

  // Deals Management
  const { addDeal, updateDeal, deleteDeal } = useDeals();
  const [adminDeals, setAdminDeals] = useState<Deal[]>([]);
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
  const { user: loggedInUser, users, updateUser, deleteUser, addExtraRedemptions, updateAllUsersNotificationPreferences } = useAuth();
  const [isUserFormVisible, setIsUserFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<User>(EMPTY_USER);
  const [dealToAdd, setDealToAdd] = useState<string>('');
  const [redemptionsToAdd, setRedemptionsToAdd] = useState(0);
  const [viewingRedemptionsForUser, setViewingRedemptionsForUser] = useState<User | null>(null);

  // Pending Approvals
  const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);

  useEffect(() => {
    if (activeTab === 'pending_approvals') {
      loadPendingDeals();
    }
    if (activeTab === 'deals') {
      loadAdminDeals();
    }
  }, [activeTab]);

  const loadAdminDeals = async () => {
    try {
      const { getAllDeals } = await import('../lib/supabaseService');
      const fetchedDeals = await getAllDeals();
      setAdminDeals(fetchedDeals);
    } catch (error) {
      console.error("Failed to load deals for admin:", error);
    }
  };

  const loadPendingDeals = async () => {
    const deals = await getPendingDeals();
    setPendingDeals(deals);
  };

  const handleApproveDeal = async (dealId: string) => {
    if (window.confirm('Approve this deal?')) {
      await updateDealStatus(dealId, 'approved');
      loadPendingDeals();
      // Optionally refresh main deals list if needed, but they are separate contexts usually
    }
  };

  const handleRejectDeal = async (dealId: string) => {
    if (window.confirm('Reject this deal?')) {
      await updateDealStatus(dealId, 'rejected');
      loadPendingDeals();
    }
  };


  const sortedDeals = useMemo(() => {
    return [...adminDeals].sort((a, b) => Number(b.id) - Number(a.id));
  }, [adminDeals]);

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

  const handleDeleteDealClick = async (dealId: string) => {
    if (window.confirm(t('deleteConfirmation'))) {
      await deleteDeal(dealId);
      loadAdminDeals();
    }
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

    const dealData = { ...dealFormData, imageUrl: finalImageUrl, expiresAt: neverExpires ? getFarFutureDate() : getExpiryDate(typeof expiresInDays === 'number' ? expiresInDays : parseInt(expiresInDays as string) || 7), category_tr: dealFormData.category === 'Dining' ? 'Yemek' : dealFormData.category === 'Wellness' ? 'Sağlık' : 'Seyahat' };
    if (editingDeal) {
      await updateDeal(dealData);
    } else {
      await addDeal({ ...dealData, id: Date.now().toString() });
    }
    await loadAdminDeals(); // Refresh admin list
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
      address: user.address || '',
      billingAddress: user.billingAddress || '',
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
      .map(dealId => adminDeals.find(d => d.id === dealId))
      .filter((d): d is Deal => !!d);
  }, [userFormData.savedDeals, adminDeals]);

  // Subscription Management
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isSubscriptionFormVisible, setIsSubscriptionFormVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planFormData, setPlanFormData] = useState<any>({
    tier: '',
    name: '',
    name_tr: '',
    price: 0,
    price_tr: 0,
    redemptions_per_period: 0,
    features: [],
    features_tr: [],
    is_active: true
  });

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptionPlans();
    }
  }, [activeTab]);

  const loadSubscriptionPlans = async () => {
    try {
      const { getAllSubscriptionPlans } = await import('../lib/subscriptionService');
      const plans = await getAllSubscriptionPlans();
      setSubscriptionPlans(plans);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { createSubscriptionPlan, updateSubscriptionPlan } = await import('../lib/subscriptionService');
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, planFormData);
      } else {
        await createSubscriptionPlan(planFormData);
      }
      setIsSubscriptionFormVisible(false);
      setEditingPlan(null);
      loadSubscriptionPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleEditPlanClick = (plan: any) => {
    setEditingPlan(plan);
    setPlanFormData(plan);
    setIsSubscriptionFormVisible(true);
  };

  const handleDeletePlanClick = async (planId: string) => {
    if (window.confirm('Are you sure you want to deactivate this plan?')) {
      try {
        const { deleteSubscriptionPlan } = await import('../lib/subscriptionService');
        await deleteSubscriptionPlan(planId);
        loadSubscriptionPlans();
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 pt-6 pb-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-brand-text-light">{t('adminDashboard')}</h1>
      </header>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('analytics')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'analytics' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Analytics
        </button>
        <button onClick={() => setActiveTab('deals')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'deals' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageDeals')}
        </button>
        <button onClick={() => setActiveTab('users')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'users' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('manageUsers')}
        </button>
        <button onClick={() => setActiveTab('subscriptions')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'subscriptions' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Subscriptions
        </button>
        <button onClick={() => setActiveTab('content')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'content' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Manage Content
        </button>
        <button onClick={() => setActiveTab('flight_routes')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'flight_routes' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Flight Routes
        </button>
        <button onClick={() => setActiveTab('payments')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'payments' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          {t('paymentTransactions') || 'Payment Transactions'}
        </button>
        <button onClick={() => setActiveTab('pending_approvals')} className={`py-2 px-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${activeTab === 'pending_approvals' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-800 dark:hover:text-brand-text-light'}`}>
          Pending Approvals
          {pendingDeals.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingDeals.length}</span>
          )}
        </button>

      </div>

      {
        activeTab === 'analytics' && (
          <section>
            <AnalyticsDashboard />
          </section>
        )
      }

      {
        activeTab === 'pending_approvals' && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Pending Approvals</h2>
            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                  <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                    <tr>
                      <th scope="col" className="px-6 py-3">Title</th>
                      <th scope="col" className="px-6 py-3">Partner</th>
                      <th scope="col" className="px-6 py-3">Category</th>
                      <th scope="col" className="px-6 py-3">Price</th>
                      <th scope="col" className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDeals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-brand-text-muted">
                          No pending deals.
                        </td>
                      </tr>
                    ) : (
                      pendingDeals.map(deal => (
                        <tr key={deal.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap">
                            <div className="flex items-center">
                              {deal.imageUrl && <img src={deal.imageUrl} alt="" className="w-8 h-8 rounded object-cover mr-2" />}
                              {deal.title}
                            </div>
                          </th>
                          <td className="px-6 py-4">{deal.vendor}</td>
                          <td className="px-6 py-4">{deal.category}</td>
                          <td className="px-6 py-4">${deal.discountedPrice}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => setEditingDeal(deal)} className="font-medium text-blue-600 hover:underline">View Details</button>
                            <button onClick={() => handleApproveDeal(deal.id)} className="font-medium text-green-600 hover:underline">Approve</button>
                            <button onClick={() => handleRejectDeal(deal.id)} className="font-medium text-red-600 hover:underline">Reject</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deal Details Modal */}
            {editingDeal && activeTab === 'pending_approvals' && (
              <Modal isOpen={!!editingDeal} onClose={() => setEditingDeal(null)} title="Deal Details">
                <div className="space-y-4">
                  {editingDeal.imageUrl && (
                    <img src={editingDeal.imageUrl} alt={editingDeal.title} className="w-full h-48 object-cover rounded-lg" />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Title (EN)</h3>
                      <p>{editingDeal.title}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Title (TR)</h3>
                      <p>{editingDeal.title_tr || '-'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Description (EN)</h3>
                      <p className="text-sm">{editingDeal.description}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Description (TR)</h3>
                      <p className="text-sm">{editingDeal.description_tr || '-'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Original Price</h3>
                      <p>${editingDeal.originalPrice}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Discounted Price</h3>
                      <p>${editingDeal.discountedPrice} ({editingDeal.discountPercentage}%)</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Category</h3>
                      <p>{editingDeal.category}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500">Expires At</h3>
                      <p>{new Date(editingDeal.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      onClick={() => { handleRejectDeal(editingDeal.id); setEditingDeal(null); }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { handleApproveDeal(editingDeal.id); setEditingDeal(null); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </section>
        )
      }

      {
        activeTab === 'subscriptions' && (
          <>
            {!isSubscriptionFormVisible && (
              <button onClick={() => { setEditingPlan(null); setPlanFormData({ tier: '', name: '', name_tr: '', price: 0, price_tr: 0, redemptions_per_period: 0, features: [], features_tr: [], is_active: true }); setIsSubscriptionFormVisible(true); }} className="mb-6 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                Add Plan
              </button>
            )}

            {isSubscriptionFormVisible && (
              <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-4">{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2>
                <form onSubmit={handlePlanSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Tier Key (Unique)</label><input type="text" value={planFormData.tier} onChange={e => setPlanFormData({ ...planFormData, tier: e.target.value })} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Redemptions/Year</label><input type="number" value={planFormData.redemptions_per_period} onChange={e => setPlanFormData({ ...planFormData, redemptions_per_period: parseInt(e.target.value) })} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Name (EN)</label><input type="text" value={planFormData.name} onChange={e => setPlanFormData({ ...planFormData, name: e.target.value })} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Name (TR)</label><input type="text" value={planFormData.name_tr} onChange={e => setPlanFormData({ ...planFormData, name_tr: e.target.value })} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Price (USD)</label><input type="number" step="0.01" value={planFormData.price} onChange={e => setPlanFormData({ ...planFormData, price: parseFloat(e.target.value) })} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Price (TL)</label><input type="number" step="0.01" value={planFormData.price_tr} onChange={e => setPlanFormData({ ...planFormData, price_tr: parseFloat(e.target.value) })} className="w-full p-2 border rounded" required /></div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Features (EN) - JSON Array</label>
                      <textarea value={JSON.stringify(planFormData.features)} onChange={e => { try { setPlanFormData({ ...planFormData, features: JSON.parse(e.target.value) }); } catch (err) { } }} className="w-full p-2 border rounded h-24" />
                      <p className="text-xs text-gray-500">Enter as valid JSON array, e.g. ["Feature 1", "Feature 2"]</p>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Features (TR) - JSON Array</label>
                      <textarea value={JSON.stringify(planFormData.features_tr)} onChange={e => { try { setPlanFormData({ ...planFormData, features_tr: JSON.parse(e.target.value) }); } catch (err) { } }} className="w-full p-2 border rounded h-24" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => setIsSubscriptionFormVisible(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded">Save</button>
                  </div>
                </form>
              </section>
            )}

            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-brand-bg">
                  <tr>
                    <th className="px-6 py-3">Tier</th>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Redemptions</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionPlans.map(plan => (
                    <tr key={plan.id} className="border-b">
                      <td className="px-6 py-4">{plan.tier}</td>
                      <td className="px-6 py-4">{plan.name} / {plan.name_tr}</td>
                      <td className="px-6 py-4">${plan.price} / ₺{plan.price_tr}</td>
                      <td className="px-6 py-4">{plan.redemptions_per_period}</td>
                      <td className="px-6 py-4">{plan.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleEditPlanClick(plan)} className="text-blue-500 hover:underline">Edit</button>
                        {plan.is_active && <button onClick={() => handleDeletePlanClick(plan.id)} className="text-red-500 hover:underline">Deactivate</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      }

      {
        activeTab === 'deals' && (
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
                        onChange={(url) => setDealFormData(prev => ({ ...prev, imageUrl: url }))}
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
        )
      }

      {
        activeTab === 'users' && (
          <>
            {isUserFormVisible && (
              <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-4">{t('editUser')}</h2>
                <form onSubmit={handleUserFormSubmit} className="space-y-4 max-w-2xl">
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div><label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('fullNameLabel')}</label><input type="text" id="name" name="name" value={userFormData.name} onChange={handleUserFormChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                    <div><label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('emailLabel')}</label><input type="email" id="email" name="email" value={userFormData.email} onChange={handleUserFormChange} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                    <div><label htmlFor="tier" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('tier')}</label><select id="tier" name="tier" value={userFormData.tier} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">{Object.values(SubscriptionTier).filter(t => t !== SubscriptionTier.NONE).map(tier => <option key={tier} value={tier}>{tier}</option>)}</select></div>
                    <div><label htmlFor="mobile" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('mobileLabel') || 'Mobile'}</label><input type="tel" id="mobile" name="mobile" value={userFormData.mobile || ''} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                    <div className="md:col-span-2"><label htmlFor="address" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('addressLabel')}</label><input type="text" id="address" name="address" value={userFormData.address || ''} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
                    <div className="md:col-span-2"><label htmlFor="billingAddress" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('billingAddressLabel')}</label><input type="text" id="billingAddress" name="billingAddress" value={userFormData.billingAddress || ''} onChange={handleUserFormChange} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" /></div>
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
                    <h3 className="text-lg font-semibold mb-3">Notification Preferences</h3>
                    <div className="space-y-3 p-3 bg-gray-100 dark:bg-brand-bg rounded-md">
                      <div className="flex items-center justify-between">
                        <label htmlFor="generalNotifications" className="text-sm text-gray-700 dark:text-brand-text-light">General Notifications (Master Switch)</label>
                        <input
                          type="checkbox"
                          id="generalNotifications"
                          checked={userFormData.notificationPreferences?.generalNotifications ?? true}
                          onChange={(e) => setUserFormData(prev => ({
                            ...prev,
                            notificationPreferences: {
                              ...prev.notificationPreferences,
                              generalNotifications: e.target.checked,
                              newDeals: prev.notificationPreferences?.newDeals ?? true,
                              expiringDeals: prev.notificationPreferences?.expiringDeals ?? true
                            }
                          }))}
                          className="h-5 w-5 rounded text-brand-primary bg-white dark:bg-brand-surface border-gray-300 dark:border-gray-600 focus:ring-brand-primary"
                        />
                      </div>
                      <div className="flex items-center justify-between pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                        <label htmlFor="newDeals" className="text-sm text-gray-600 dark:text-brand-text-muted">New Deals</label>
                        <input
                          type="checkbox"
                          id="newDeals"
                          checked={userFormData.notificationPreferences?.newDeals ?? true}
                          disabled={userFormData.notificationPreferences?.generalNotifications === false}
                          onChange={(e) => setUserFormData(prev => ({
                            ...prev,
                            notificationPreferences: {
                              ...prev.notificationPreferences!,
                              newDeals: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 rounded text-brand-primary bg-white dark:bg-brand-surface border-gray-300 dark:border-gray-600 focus:ring-brand-primary disabled:opacity-50"
                        />
                      </div>
                      <div className="flex items-center justify-between pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                        <label htmlFor="expiringDeals" className="text-sm text-gray-600 dark:text-brand-text-muted">Expiring Deals</label>
                        <input
                          type="checkbox"
                          id="expiringDeals"
                          checked={userFormData.notificationPreferences?.expiringDeals ?? true}
                          disabled={userFormData.notificationPreferences?.generalNotifications === false}
                          onChange={(e) => setUserFormData(prev => ({
                            ...prev,
                            notificationPreferences: {
                              ...prev.notificationPreferences!,
                              expiringDeals: e.target.checked
                            }
                          }))}
                          className="h-4 w-4 rounded text-brand-primary bg-white dark:bg-brand-surface border-gray-300 dark:border-gray-600 focus:ring-brand-primary disabled:opacity-50"
                        />
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

            <section className="mb-8 bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4">Global User Actions</h2>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-brand-bg rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex-grow">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Master Notification Switch</h3>
                  <p className="text-sm text-gray-500 dark:text-brand-text-muted">Enable or disable notifications for ALL users. This overrides individual settings.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to ENABLE notifications for ALL users?')) {
                        updateAllUsersNotificationPreferences({ generalNotifications: true });
                        setShowSuccess('Notifications enabled for all users');
                        setTimeout(() => setShowSuccess(''), 3000);
                      }
                    }}
                    className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Enable All
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to DISABLE notifications for ALL users?')) {
                        updateAllUsersNotificationPreferences({ generalNotifications: false });
                        setShowSuccess('Notifications disabled for all users');
                        setTimeout(() => setShowSuccess(''), 3000);
                      }
                    }}
                    className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Disable All
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">{t('allUsers')}</h2>
              <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                    <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                      <tr>
                        <th scope="col" className="px-6 py-3">{t('fullNameLabel')}</th>
                        <th scope="col" className="px-6 py-3">{t('emailLabel')}</th>
                        <th scope="col" className="px-6 py-3">{t('mobileLabel') || 'Mobile'}</th>
                        <th scope="col" className="px-6 py-3">{t('tier')}</th>
                        <th scope="col" className="px-6 py-3">Redemptions Left</th>
                        <th scope="col" className="px-6 py-3">Renews On</th>
                        <th scope="col" className="px-6 py-3 text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedUsers.map(user => {
                        const { remaining, total } = calculateRemainingRedemptions(user);
                        const renewalDate = getNextRenewalDate(user).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');

                        return (
                          <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap">
                              {user.name}{user.isAdmin && <span className="ml-2 text-xs bg-brand-secondary text-brand-bg font-bold px-2 py-0.5 rounded-full">Admin</span>}
                            </th>
                            <td className="px-6 py-4">{user.email}</td>
                            <td className="px-6 py-4">{user.mobile || '-'}</td>
                            <td className="px-6 py-4">{user.tier}</td>
                            <td className="px-6 py-4">
                              <span className={`font-semibold ${remaining === 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {total === Infinity ? '∞' : `${remaining} / ${total}`}
                              </span>
                            </td>
                            <td className="px-6 py-4">{renewalDate}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button onClick={() => setViewingRedemptionsForUser(user)} className="font-medium text-blue-500 hover:underline">{t('viewRedemptions') || 'View Redemptions'}</button>
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

            {/* User Redemptions Modal */}
            <Modal
              isOpen={!!viewingRedemptionsForUser}
              onClose={() => setViewingRedemptionsForUser(null)}
              title={`${viewingRedemptionsForUser?.name}'s Redemptions`}
            >
              <div className="p-4">
                {viewingRedemptionsForUser?.redemptions && viewingRedemptionsForUser.redemptions.length > 0 ? (
                  <div className="space-y-4">
                    {viewingRedemptionsForUser.redemptions.map((redemption: any) => {
                      const deal = deals.find(d => d.id === redemption.dealId);
                      return (
                        <div key={redemption.id || Math.random()} className="bg-gray-50 dark:bg-brand-bg p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {deal ? (language === 'tr' ? deal.title_tr : deal.title) : 'Unknown Deal'}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-brand-text-muted mt-1">
                            <span>Redeemed on: {new Date(redemption.redeemedAt).toLocaleDateString()}</span>
                            {deal && <span>Code: {deal.redemptionCode}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-brand-text-muted py-4">
                    No redemptions found for this user.
                  </p>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setViewingRedemptionsForUser(null)}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            </Modal>
          </>
        )
      }

      {
        activeTab === 'content' && (
          <ContentManager />
        )
      }

      {
        activeTab === 'flight_routes' && (
          <FlightRouteManager />
        )
      }

      {
        activeTab === 'payments' && (
          <PaymentTransactionTable />
        )
      }

      {
        showSuccess && (
          <div className="fixed bottom-28 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50">
            {showSuccess}
          </div>
        )
      }
    </div >
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