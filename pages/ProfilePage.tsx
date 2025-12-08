import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
import { getUserTransactions } from '../lib/supabaseService';
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
  const { user, logout, updateUserDetails, updateUserAvatar, deleteUser, updateUserNotificationPreferences } = useAuth();
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

  // ... (keep useEffect)

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
      updateUserDetails({ name, email, mobile });
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
      deleteUser(user.id); // This will only remove from local state
      logout(); // This clears the current user session
      navigate('/');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateUserAvatar(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNotImplemented = () => {
    alert(t('featureNotImplemented'));
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

  const handleRedeemReferral = async () => {
    if (!manualReferralCode.trim()) return;
    try {
      await updateUserDetails({
        name: user?.name || '',
        email: user?.email || '',
        referredBy: manualReferralCode
      });
      setShowSuccess(t('profileUpdatedSuccess') || 'Referral code redeemed!');
      setTimeout(() => setShowSuccess(''), 3000);
      setManualReferralCode('');
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

  const referralCode = `${window.location.origin}/signup?ref=${user.id}`;

  const { remaining, total } = calculateRemainingRedemptions(user);
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
          <p className="text-brand-text-muted text-sm mt-1">{user.email}</p>

          {user.role === 'partner' && (
            <button
              onClick={() => navigate('/partner')}
              className="mt-4 bg-purple-600/20 border border-purple-500/50 text-purple-300 text-sm font-bold px-6 py-2 rounded-full hover:bg-purple-600/40 transition-all flex items-center backdrop-blur-sm"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Partner Mobile Portal
            </button>
          )}
        </div>
      </header>



      {/* Subscription Info Card */}
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
                  <p className="text-sm text-brand-text-muted mb-1">{t('priceLabel') || 'Price'}</p>
                  <p className="text-xl font-bold text-white">
                    {(() => {
                      const currentPlan = plans.find(p => p.tier === user.tier);
                      const price = currentPlan ? (language === 'tr' ? currentPlan.price_tr : currentPlan.price) : 0;
                      const currency = language === 'tr' ? 'TL' : '$';
                      return `${currency}${price}`;
                    })()}
                    <span className="text-xs font-normal text-white/50">/year</span>
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
                <p className="text-[10px] text-white/40 mt-1 text-right">{t('resetsOn') || 'Resets on'} {renewalDate}</p>
              </div>

              {/* Footer: Date & Card */}
              <div className="flex justify-between items-end pt-2 border-t border-white/10">
                <div>
                  <p className="text-[10px] text-brand-text-muted uppercase tracking-widest mb-1">{t('renewsOn') || 'RENEWAL DATE'}</p>
                  <p className="text-sm font-medium text-white">{renewalDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-brand-text-muted uppercase tracking-widest mb-1">{t('paymentMethodLabel') || 'PAYMENT'}</p>
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

      {/* Refer a Friend Section */}
      <SettingsSection title={t('referFriendTitle')}>
        <div className="p-6 text-center">
          <p className="text-sm text-white/70 mb-4">{t('referFriendSubtitle')}</p>
          <div className="flex items-center justify-between bg-white/5 border border-white/10 p-2 rounded-xl gap-2 mb-4">
            <span className="text-sm font-mono text-gold-400 truncate flex-grow pl-2">{referralCode}</span>
            <button
              onClick={() => handleCopyCode(referralCode)}
              className="bg-brand-surface border border-gold-500/50 text-gold-500 hover:text-white hover:bg-gold-500 font-semibold py-2 px-4 rounded-lg transition-all flex-shrink-0"
            >
              {copied ? t('copied') : t('copyCode')}
            </button>
          </div>
        </div>

        {!user.referredBy && (
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-white/50 mb-3 text-center uppercase tracking-wider">{t('haveReferralCode') || 'Have a referral code?'}</p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value)}
                placeholder="Enter User ID / Code"
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
      </SettingsSection>

      {/* Billing History Section */}
      <SettingsSection title={t('billingHistory') || 'Billing History'}>
        {transactions.length > 0 ? (
          <div>
            {transactions.map((transaction, index) => (
              <SettingsItem
                key={transaction.id}
                icon={<DocumentTextIcon className="w-6 h-6" />}
                title={`${transaction.tier} Membership`}
                subtitle={`${new Date(transaction.createdAt).toLocaleDateString()} • ${transaction.amount} ${transaction.currency}`}
                action={
                  <button
                    onClick={() => handleViewInvoice(transaction)}
                    className="text-sm text-brand-primary font-semibold hover:underline"
                  >
                    {t('viewInvoice') || 'View Invoice'}
                  </button>
                }
                isLast={index === transactions.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-brand-text-muted">
            {t('noTransactions') || 'No payment history found.'}
          </div>
        )}
      </SettingsSection>

      {/* Profile Information Section */}
      <SettingsSection title={t('profileInfo')}>
        <form onSubmit={handleSaveChanges} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="fullName" className="block text-xs font-medium text-brand-text-muted mb-2 uppercase tracking-wide">{t('fullNameLabel')}</label>
              <input
                type="text"
                id="fullName"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-brand-text-muted mb-2 uppercase tracking-wide">{t('emailLabel')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="mobile" className="block text-xs font-medium text-brand-text-muted mb-2 uppercase tracking-wide">{t('mobileLabel') || 'Mobile Number'}</label>
              <input
                type="tel"
                id="mobile"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
                placeholder="+90 555 123 45 67"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-xs font-medium text-brand-text-muted mb-2 uppercase tracking-wide">{t('addressLabel')}</label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
                placeholder={t('addressPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="billingAddress" className="block text-xs font-medium text-brand-text-muted mb-2 uppercase tracking-wide">{t('billingAddressLabel')}</label>
            <input
              type="text"
              id="billingAddress"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold-500/50 focus:bg-white/10 transition-colors"
              placeholder={t('billingAddressPlaceholder')}
            />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-brand-secondary hover:bg-brand-secondary/80 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95">
              {t('saveChanges')}
            </button>
          </div>
        </form>
      </SettingsSection>

      {/* Account Section */}
      <SettingsSection title={t('accountSection')}>
        <SettingsItem onClick={() => setChangePasswordModalOpen(true)} icon={<Lock className="w-6 h-6" />} title={t('changePassword')} subtitle={t('changePasswordSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
        <SettingsItem icon={<BellIcon className="w-6 h-6" />} title={t('notificationSettings')} subtitle={t('notificationSettingsSubtitle')} action={<Toggle checked={settings.notifications} onChange={() => handleToggle('notifications')} />} />
        <SettingsItem icon={<GlobeIcon className="w-6 h-6" />} title={t('languageSelection')} action={<LanguageSelector lang={language} onToggle={toggleLanguage} />} isLast={true} />
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
      </SettingsSection>

      {/* Privacy Section */}
      <SettingsSection title={t('privacySection')}>
        {/* FIX: Updated translation key from 'privacyPolicy' to 'privacyPolicyLink' to match change in localization.ts */}
        <SettingsItem onClick={handleNotImplemented} icon={<ShieldCheckIcon className="w-6 h-6" />} title={t('privacyPolicyLink')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
        <SettingsItem onClick={handleNotImplemented} icon={<DocumentTextIcon className="w-6 h-6" />} title={t('termsOfUse')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
        <SettingsItem onClick={() => setDeleteAccountModalOpen(true)} icon={<TrashIcon className="w-6 h-6" />} title={t('deleteAccount')} subtitle={t('deleteAccountSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-red-500 dark:text-red-400" />} isLast={true} danger={true} />
      </SettingsSection>

      {/* Support Section */}
      <SettingsSection title={t('supportSection')}>
        <SettingsItem onClick={handleNotImplemented} icon={<QuestionMarkCircleIcon className="w-6 h-6" />} title={t('helpCenter')} subtitle={t('helpCenterSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
        <SettingsItem onClick={handleNotImplemented} icon={<MailIcon className="w-6 h-6" />} title={t('contact')} subtitle={t('contactSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
        <SettingsItem icon={<InformationCircleIcon className="w-6 h-6" />} title={t('aboutApp')} subtitle={t('appVersion')} isLast={true} />
      </SettingsSection>

      {/* Logout Button */}
      <div className="mt-8 mb-8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-2xl shadow-lg hover:shadow-gold-500/20 transform transition-all hover:scale-[1.02] active:scale-95 font-bold tracking-wide"
        >
          {t('signOut')}
        </button>
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