import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserActivity } from '../contexts/UserActivityContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { SubscriptionTier } from '../types';
import {
  GlobeIcon, ChevronRightIcon, UserIcon, Lock, BellIcon, LocationMarkerIcon,
  FingerPrintIcon, MoonIcon, ShieldCheckIcon, DocumentTextIcon, TrashIcon,
  QuestionMarkCircleIcon, MailIcon, InformationCircleIcon, PencilIcon, LayoutDashboard
} from '../components/Icons';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { calculateRemainingRedemptions, getNextRenewalDate } from '../lib/redemptionLogic';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useSearch } from '../contexts/SearchContext';
import InvoiceModal from '../components/InvoiceModal';
import { getUserTransactions, uploadUserAvatar, handleReferralCode } from '../lib/supabaseService';
import { PaymentTransaction } from '../types';

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-6">
    <h2 className="text-xs font-bold text-gold-500/80 uppercase tracking-widest px-4 mb-3">{title}</h2>
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-lg">
      {children}
    </div>
  </section>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void, disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button onClick={onChange} disabled={disabled} className={`relative w-12 h-6 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${checked ? 'bg-gold-500' : 'bg-white/20'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`} aria-checked={checked} role="switch">
    <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform duration-300 shadow-md ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const LanguageSelector: React.FC<{ lang: string; onToggle: () => void }> = ({ lang, onToggle }) => (
  <div className="flex items-center bg-white/10 p-1 rounded-lg">
    <button onClick={lang === 'tr' ? onToggle : undefined} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${lang === 'en' ? 'bg-gold-500 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>EN</button>
    <button onClick={lang === 'en' ? onToggle : undefined} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${lang === 'tr' ? 'bg-gold-500 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>TR</button>
  </div>
);

const SettingsItem: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; isLast?: boolean, danger?: boolean, onClick?: () => void }> = ({ icon, title, subtitle, action, isLast, danger, onClick }) => {
  const commonClasses = `w-full flex items-center p-4 text-left ${!isLast ? 'border-b border-white/5' : ''} group transition-colors duration-200`;

  const content = (
    <>
      <div className="mr-4 text-gold-500 drop-shadow-[0_0_2px_rgba(212,175,55,0.3)]">{icon}</div>
      <div className="flex-grow">
        <p className={danger ? "text-red-400 font-medium" : "text-white/90 font-medium"}>{title}</p>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
      <div className="ml-4 flex items-center">{action}</div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${commonClasses} hover:bg-white/5 px-4`}>
        {content}
      </button>
    );
  }

  return (
    <div className={`${commonClasses} px-4`}>
      {content}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, logout, updateUserDetails, updateUserAvatar, deleteAccount, updateUserNotificationPreferences } = useAuth();
  const { redemptions } = useUserActivity();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { permissionStatus, requestPermission } = useNotifications();
  const { isLocationEnabled, enableLocation } = useSearch();
  const { plans } = useSubscription();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [address, setAddress] = useState(user?.address || '');
  const [billingAddress, setBillingAddress] = useState(user?.billingAddress || '');
  const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [manualReferralCode, setManualReferralCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isBillingExpanded, setBillingExpanded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
      }
    });
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setMobile(user.mobile || '');
      setAddress(user.address || '');
      setBillingAddress(user.billingAddress || '');

      // Fetch transactions
      getUserTransactions(user.id).then(setTransactions).catch(console.error);
    }
  }, [user]);

  const [settings, setSettings] = useState({
    notifications: user?.notificationPreferences?.generalNotifications ?? true,
    biometrics: true,
  });

  const handleToggle = async (key: string) => { // Changed to string to handle 'location' separately
    if (key === 'location') {
      if (!isLocationEnabled) {
        try {
          await enableLocation();
        } catch (error) {
          // Error handled in context
        }
      }
      return;
    }

    // Handle other settings
    setSettings(prev => {
      const newValue = !prev[key as keyof typeof settings];
      if (key === 'notifications') {
        updateUserNotificationPreferences({ generalNotifications: newValue });
      }
      return { ...prev, [key]: newValue };
    });
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (user && (name !== user.name || email !== user.email || mobile !== (user.mobile || ''))) {
      updateUserDetails({ name, email, mobile, address, billingAddress });
      setShowSuccess(t('profileUpdatedSuccess'));
      setTimeout(() => setShowSuccess(''), 3000);
    }
  };

  const handlePasswordSave = () => {
    setShowSuccess(t('passwordUpdateSuccess'));
    setTimeout(() => setShowSuccess(''), 3000);
  };

  const handleDeleteAccountConfirm = () => {
    if (user) {
      deleteAccount(); // This will only remove from local state
      // logout(); // Handled in deleteAccount
      navigate('/');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        const publicUrl = await uploadUserAvatar(user.id, file);
        await updateUserAvatar(publicUrl);
        setShowSuccess(t('profileUpdatedSuccess'));
        setTimeout(() => setShowSuccess(''), 3000);
      } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Failed to upload avatar. Please try again.');
      }
    }
  };

  const handleContact = () => {
    window.location.href = 'mailto:support@tripzy.app';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleViewInvoice = (transaction: PaymentTransaction) => {
    setSelectedTransaction(transaction);
    setInvoiceModalOpen(true);
  };

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getLoyaltyTier = (points: number = 0, manualRank?: string) => {
    if (manualRank) {
      // If manual rank is one of the standards, use those colors, else use a generic high-tier color
      const upperRank = manualRank.toUpperCase();
      if (upperRank === 'GOLD') return { label: 'GOLD', color: 'from-amber-300 to-amber-600', icon: '🏆' };
      if (upperRank === 'SILVER') return { label: 'SILVER', color: 'from-slate-300 to-slate-500', icon: '🥈' };
      if (upperRank === 'BRONZE') return { label: 'BRONZE', color: 'from-orange-400 to-orange-700', icon: '🥉' };
      return { label: upperRank, color: 'from-purple-500 to-indigo-600', icon: '✨' };
    }
    if (points >= 5000) return { label: 'GOLD', color: 'from-amber-300 to-amber-600', icon: '🏆' };
    if (points >= 1000) return { label: 'SILVER', color: 'from-slate-300 to-slate-500', icon: '🥈' };
    return { label: 'BRONZE', color: 'from-orange-400 to-orange-700', icon: '🥉' };
  };

  const loyalty = getLoyaltyTier(user.points, user.rank);

  const handleRedeemReferral = async () => {
    if (!manualReferralCode.trim()) return;
    try {
      const result = await handleReferralCode(manualReferralCode, user.id);
      if (result.success) {
        setShowSuccess(t('referralSuccess'));
        setManualReferralCode('');
      } else {
        alert(result.message || 'Error redeeming code');
      }
    } catch (error) {
      console.error('Error redeeming code:', error);
      alert('Invalid referral code or error redeeming.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSubToggle = (key: 'newDeals' | 'expiringDeals') => {
    if (!user?.notificationPreferences) return;
    updateUserNotificationPreferences({
      [key]: !user.notificationPreferences[key]
    });
  };

  const friendlyCode = user.referralCode || user.id.substring(0, 6).toUpperCase();
  const shareLink = `${window.location.origin}/signup?ref=${friendlyCode}`;

  const handleWhatsAppShare = () => {
    const text = `Join me on Tripzy and get exclusive travel discounts! Use my code: ${friendlyCode}\n\n${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Merge user with fresh redemptions from context
  const userWithFreshRedemptions = { ...user, redemptions: redemptions || user.redemptions };
  const { remaining, total } = calculateRemainingRedemptions(userWithFreshRedemptions);
  const renewalDate = getNextRenewalDate(user).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US');

  return (
    <div className="container mx-auto px-4 pt-6 pb-24 text-brand-text-light">
      <header className="relative mb-8 text-center">
        <h1 className="text-3xl font-bold font-heading text-white drop-shadow-md mb-6">{t('profileSettingsTitle')}</h1>

        {/* Premium Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-gold-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
            <button
              onClick={handleAvatarClick}
              className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-gold-400 to-gold-600 shadow-xl overflow-hidden"
            >
              <div className="w-full h-full rounded-full bg-brand-surface border-4 border-brand-bg overflow-hidden flex items-center justify-center">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gold-500">{getInitials(user.name)}</span>
                )}
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button onClick={handleAvatarClick} className="absolute bottom-1 right-1 bg-brand-surface border border-gold-500/50 rounded-full p-2 hover:bg-gold-500 hover:text-white transition-colors text-gold-500 shadow-lg">
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-3xl font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-white via-gold-200 to-white">{user.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-brand-text-muted text-sm">{user.email}</p>
            <div className="flex items-center gap-1.5">
              <span className="bg-gold-500/20 border border-gold-500/30 text-gold-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {user.points || 0} PTS
              </span>
              <span className={`bg-gradient-to-r ${loyalty.color} text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm flex items-center gap-1`}>
                <span>{loyalty.icon}</span> {loyalty.label}
              </span>
            </div>
          </div>
          {user.totalReferrals !== undefined && user.totalReferrals > 0 && (
            <p className="text-[10px] text-brand-text-muted mt-2 uppercase tracking-widest font-bold">
              {user.totalReferrals} {language === 'tr' ? 'DAVET' : 'REFERRALS'}
            </p>
          )}

          {user.role === 'partner' && (
            <button
              onClick={() => navigate('/partner')}
              className="mt-4 bg-purple-600/20 border border-purple-500/50 text-purple-300 text-sm font-bold px-6 py-2 rounded-full hover:bg-purple-600/40 transition-all flex items-center backdrop-blur-sm"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              {t('partnerPortal')}
            </button>
          )}
        </div>
      </header>

      {/* Subscription Info Card */}
      <div className="mb-6">
        <SettingsSection title={t('subscriptionInfo')}>
          <div className="p-1">
            {/* Glass Credit Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 shadow-2xl group">
              {/* Decorative Gold Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>

              <div className="relative z-10 flex flex-col h-full justify-between space-y-6">
                {/* Header: Plan & Price */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gold-500 font-semibold tracking-wider uppercase mb-1">{t('currentPlanLabel')}</p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {(() => {
                        const currentPlan = plans.find(p => p.tier === user.tier);
                        return currentPlan ? (language === 'tr' ? currentPlan.name_tr : currentPlan.name) : user.tier;
                      })()}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-brand-text-muted mb-1">{t('priceLabel')}</p>
                    <p className="text-xl font-bold text-white">
                      {(() => {
                        const currentPlan = plans.find(p => p.tier === user.tier);
                        const price = currentPlan ? (language === 'tr' ? currentPlan.price_tr : currentPlan.price) : 0;
                        const currency = language === 'tr' ? 'TL' : '$';
                        return `${currency}${price}`;
                      })()}
                      <span className="text-xs font-normal text-white/50">{language === 'tr' ? '/yıl' : '/year'}</span>
                    </p>
                  </div>
                </div>

                {/* Progress Bar: Redemptions */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-brand-text-muted">{t('redemptionsLeft') || 'Redemptions Left'}</span>
                    <span className="text-sm font-bold text-gold-500">
                      {total === Infinity ? '∞' : `${remaining} / ${total}`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)] transition-all duration-500"
                      style={{ width: total === Infinity ? '100%' : `${(remaining / total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 text-right">{t('resetsOn')} {renewalDate}</p>
                </div>

                {/* Footer: Date & Card */}
                <div className="flex justify-between items-end pt-2 border-t border-white/10">
                  <div>
                    <p className="text-[10px] text-brand-text-muted uppercase tracking-widest mb-1">{t('renewsOn')}</p>
                    <p className="text-sm font-medium text-white">{renewalDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-brand-text-muted uppercase tracking-widest mb-1">{t('paymentMethodLabel')}</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-sm font-medium text-white">**** 1234</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-4 px-2 pb-2">
              <button onClick={() => navigate('/subscriptions')} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95">
                {t('managePlan')}
              </button>
              <button onClick={() => navigate('/subscriptions')} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-bold text-sm shadow-lg hover:shadow-gold-500/20 transition-all hover:scale-[1.02] active:scale-95">
                {t('upgradePlan')}
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Personal Info Section */}
      <div className="mb-6">
        <SettingsSection title={t('personalInfo') || 'Personal Information'}>
          <form onSubmit={handleSaveChanges} className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullname" className="block text-xs uppercase text-brand-text-muted mb-1">{t('fullNameLabel') || 'Full Name'}</label>
                <input
                  id="fullname"
                  name="fullname"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="mobile" className="block text-xs uppercase text-brand-text-muted mb-1">{t('mobileLabel') || 'Mobile Number'}</label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-xs uppercase text-brand-text-muted mb-1">{t('emailLabel') || 'Email Address'}</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white/50 cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-xs uppercase text-brand-text-muted mb-1">{t('addressLabel') || 'Address'}</label>
                <textarea
                  id="address"
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="Your full address"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="billingAddress" className="block text-xs uppercase text-brand-text-muted mb-1">{t('billingAddressLabel') || 'Billing Address'}</label>
                <textarea
                  id="billingAddress"
                  name="billingAddress"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="Billing address (if different)"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-gold-500 hover:bg-gold-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                {t('saveChanges') || 'Save Changes'}
              </button>
            </div>
          </form>
        </SettingsSection>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Left Column */}
        <div className="space-y-6">
          {/* Refer a Friend Section */}
          <SettingsSection title={t('referFriendTitle')}>
            <div className="p-6 text-center">
              <p className="text-sm text-white/70 mb-4">{t('referFriendSubtitle')}</p>
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between bg-white/5 border border-white/10 p-2 rounded-xl gap-2">
                  <span className="text-sm font-mono text-gold-400 truncate flex-grow pl-2">{friendlyCode}</span>
                  <button
                    onClick={() => handleCopyCode(friendlyCode)}
                    className="bg-brand-surface border border-gold-500/50 text-gold-500 hover:text-white hover:bg-gold-500 font-semibold py-2 px-4 rounded-lg transition-all flex-shrink-0"
                  >
                    {copied ? t('copied') : t('copyCode')}
                  </button>
                </div>
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  {t('shareOnWhatsApp')}
                </button>
              </div>

              {!user.referredBy && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50 mb-3 text-center uppercase tracking-wider">{t('haveReferralCode')}</p>
                  <div className="flex gap-2 max-w-md mx-auto">
                    <input
                      id="referralCode"
                      name="referralCode"
                      type="text"
                      aria-label={t('enterReferralCode')}
                      value={manualReferralCode}
                      onChange={(e) => setManualReferralCode(e.target.value)}
                      placeholder={t('enterReferralCode')}
                      className="flex-grow bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-gold-500/50"
                    />
                    <button
                      onClick={handleRedeemReferral}
                      className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-6 rounded-xl transition-colors border border-white/10"
                    >
                      {t('redeem') || 'Redeem'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>

          {/* Application Preferences Section */}
          <SettingsSection title={t('appPreferencesSection')}>
            <SettingsItem icon={<LocationMarkerIcon className="w-6 h-6" />} title={t('locationServices')} subtitle={t('locationServicesSubtitle')} action={<Toggle checked={isLocationEnabled} onChange={() => handleToggle('location')} />} />
            <SettingsItem icon={<FingerPrintIcon className="w-6 h-6" />} title={t('biometricAuth')} subtitle={t('biometricAuthSubtitle')} action={<Toggle checked={settings.biometrics} onChange={() => handleToggle('biometrics')} />} />
            <SettingsItem icon={<MoonIcon className="w-6 h-6" />} title={t('darkMode')} action={<Toggle checked={theme === 'dark'} onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />} />
            <SettingsItem
              icon={<BellIcon className="w-6 h-6" />}
              title={t('pushNotifications')}
              subtitle={permissionStatus === 'denied' ? t('notificationsDenied') : t('pushNotificationsSubtitle')}
              action={
                permissionStatus !== 'granted' ? (
                  <button
                    onClick={requestPermission}
                    disabled={permissionStatus === 'denied'}
                    className="bg-brand-primary text-white font-semibold py-1 px-3 rounded-lg text-sm disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {permissionStatus === 'denied' ? 'Denied' : 'Enable'}
                  </button>
                ) : (
                  <span className="text-sm font-semibold text-green-500">Enabled</span>
                )
              }
              isLast={permissionStatus !== 'granted'}
            />
            {permissionStatus === 'granted' && (
              <>
                <div className="pl-10 border-b border-gray-200 dark:border-gray-700">
                  <SettingsItem
                    icon={<div className="w-6 h-6" />}
                    title={t('newDealNotifications')}
                    action={<Toggle checked={user.notificationPreferences?.newDeals ?? false} onChange={() => handleSubToggle('newDeals')} />}
                  />
                </div>
                <div className="pl-10">
                  <SettingsItem
                    icon={<div className="w-6 h-6" />}
                    title={t('expiringDealNotifications')}
                    action={<Toggle checked={user.notificationPreferences?.expiringDeals ?? false} onChange={() => handleSubToggle('expiringDeals')} />}
                    isLast={true}
                  />
                </div>
              </>
            )}

            {/* Install App Button for PWA */}
            {deferredPrompt && (
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg hover:shadow-blue-500/20 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install App
                </button>
              </div>
            )}
          </SettingsSection>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Account Section */}
          <SettingsSection title={t('accountSection')}>
            <SettingsItem onClick={() => setChangePasswordModalOpen(true)} icon={<Lock className="w-6 h-6" />} title={t('changePassword')} subtitle={t('changePasswordSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
            <SettingsItem icon={<BellIcon className="w-6 h-6" />} title={t('notificationSettings')} subtitle={t('notificationSettingsSubtitle')} action={<Toggle checked={settings.notifications} onChange={() => handleToggle('notifications')} />} />
            <SettingsItem icon={<GlobeIcon className="w-6 h-6" />} title={t('languageSelection')} action={<LanguageSelector lang={language} onToggle={toggleLanguage} />} />

            {/* Billing History Expandable */}
            <SettingsItem
              onClick={() => setBillingExpanded(!isBillingExpanded)}
              icon={<DocumentTextIcon className="w-6 h-6" />}
              title={t('billingHistory')}
              action={<ChevronRightIcon className={`w-5 h-5 text-gray-400 transform transition-transform ${isBillingExpanded ? 'rotate-90' : ''}`} />}
            />
            {isBillingExpanded && (
              <div className="pl-4 pr-4 pb-2 bg-white/5 border-t border-white/5">
                {transactions.length > 0 ? (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 text-sm">
                      <div>
                        <p className="text-white font-medium">{transaction.tier}</p>
                        <p className="text-white/50 text-xs">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => handleViewInvoice(transaction)} className="text-gold-500 hover:text-white transition-colors text-xs font-bold border border-gold-500/50 rounded px-2 py-1">
                        VIEW
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-center text-white/50 text-sm">No history</div>
                )}
              </div>
            )}

            {/* Redemption History Expandable */}
            <SettingsItem
              onClick={() => navigate('/redemptions')} // Or expand in place
              icon={<div className="w-6 h-6">🎟️</div>}
              title={t('redemptionHistory') || 'Redemption History'}
              action={<ChevronRightIcon className="w-5 h-5 text-gray-400" />}
            />
          </SettingsSection>

          {/* Support Section */}
          <SettingsSection title={t('supportSection')}>
            <SettingsItem onClick={() => navigate('/faq')} icon={<QuestionMarkCircleIcon className="w-6 h-6" />} title={t('helpCenter')} subtitle={t('helpCenterSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
            <SettingsItem onClick={handleContact} icon={<MailIcon className="w-6 h-6" />} title={t('contact')} subtitle={t('contactSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
            <SettingsItem icon={<InformationCircleIcon className="w-6 h-6" />} title={t('aboutApp')} subtitle={t('appVersion')} />
            <SettingsItem onClick={() => navigate('/terms')} icon={<DocumentTextIcon className="w-6 h-6" />} title={t('termsOfService') || 'Terms of Service'} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
            {/* Merged Privacy Links */}
            <SettingsItem onClick={() => navigate('/privacy')} icon={<ShieldCheckIcon className="w-6 h-6" />} title={t('privacyPolicyLink')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
            <SettingsItem onClick={() => setDeleteAccountModalOpen(true)} icon={<TrashIcon className="w-6 h-6" />} title={t('deleteAccount')} subtitle={t('deleteAccountSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-red-500 dark:text-red-400" />} isLast={true} danger={true} />
          </SettingsSection>

          {/* Logout Button (At bottom of Right Column) */}
          <div className="">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-2xl shadow-lg hover:shadow-gold-500/20 transform transition-all hover:scale-[1.02] active:scale-95 font-bold tracking-wide"
            >
              {t('signOut')}
            </button>
          </div>
        </div>

      </div>

      {showSuccess && (
        <div className="fixed bottom-28 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50">
          {showSuccess}
        </div>
      )}

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
        onSave={handlePasswordSave}
      />
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
        onConfirm={handleDeleteAccountConfirm}
      />
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        transaction={selectedTransaction}
        user={user}
      />
    </div>
  );
};

export default ProfilePage;