import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { SubscriptionTier } from '../types';
import {
  Globe, ChevronRightIcon, UserIcon, Lock, BellIcon, LocationMarkerIcon,
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
    <h2 className="text-sm font-semibold text-gray-500 dark:text-brand-text-muted uppercase tracking-wider px-4 mb-2">{title}</h2>
    <div className="bg-white dark:bg-brand-surface rounded-lg shadow-sm">
      {children}
    </div>
  </section>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void, disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <button onClick={onChange} disabled={disabled} className={`relative w-12 h-6 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${checked ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'cursor-not-allowed' : ''}`} aria-checked={checked} role="switch">
    <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const LanguageSelector: React.FC<{ lang: string; onToggle: () => void }> = ({ lang, onToggle }) => (
  <div className="flex items-center bg-gray-100 dark:bg-brand-bg p-1 rounded-md">
    <button onClick={lang === 'tr' ? onToggle : undefined} className={`px-3 py-1 text-sm font-semibold rounded ${lang === 'en' ? 'bg-white dark:bg-brand-surface text-gray-800 dark:text-brand-text-light' : 'text-gray-500 dark:text-brand-text-muted'}`}>EN</button>
    <button onClick={lang === 'en' ? onToggle : undefined} className={`px-3 py-1 text-sm font-semibold rounded ${lang === 'tr' ? 'bg-white dark:bg-brand-surface text-gray-800 dark:text-brand-text-light' : 'text-gray-500 dark:text-brand-text-muted'}`}>TR</button>
  </div>
);

const SettingsItem: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; isLast?: boolean, danger?: boolean, onClick?: () => void }> = ({ icon, title, subtitle, action, isLast, danger, onClick }) => {
  const commonClasses = `w-full flex items-center p-4 text-left ${!isLast ? 'border-b border-gray-200 dark:border-gray-700' : ''} first:rounded-t-lg last:rounded-b-lg group`;

  const content = (
    <>
      <div className="mr-4 text-gray-500 dark:text-brand-text-muted">{icon}</div>
      <div className="flex-grow">
        <p className={danger ? "text-red-500 dark:text-red-400" : "text-gray-800 dark:text-brand-text-light"}>{title}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-brand-text-muted">{subtitle}</p>}
      </div>
      <div className="ml-4">{action}</div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${commonClasses} hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors`}>
        {content}
      </button>
    );
  }

  return (
    <div className={commonClasses}>
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
    <div className="container mx-auto px-4 pt-6 pb-24">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-brand-text-light">{t('profileSettingsTitle')}</h1>
      </header>

      {/* Profile Avatar & Name */}
      <section className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          <button onClick={handleAvatarClick} className="w-24 h-24 rounded-full bg-brand-primary flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(user.name)
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            aria-label={t('uploadAPhoto')}
          />
          <button onClick={handleAvatarClick} className="absolute -bottom-1 -right-1 bg-white dark:bg-brand-surface border-2 border-gray-50 dark:border-brand-bg rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={t('uploadAPhoto')}>
            <PencilIcon className="w-4 h-4 text-gray-800 dark:text-brand-text-light" />
          </button>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-brand-text-light">{user.name}</h2>
        {user.role === 'partner' && (
          <button
            onClick={() => navigate('/partner')}
            className="mt-2 bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-purple-700 transition-colors flex items-center"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Partner Portal
          </button>
        )}
        {user.tier === SubscriptionTier.PREMIUM && (
          <div className="mt-1 bg-brand-primary/20 text-brand-secondary text-xs font-bold px-3 py-1 rounded-full">
            {t('premiumBadge')}
          </div>
        )}
      </section>



      {/* Subscription Info Card */}
      <SettingsSection title={t('subscriptionInfo')}>
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-500 dark:text-brand-text-muted">{t('currentPlanLabel')}</p>
            <p className="text-gray-800 dark:text-brand-text-light font-semibold">
              {(() => {
                const currentPlan = plans.find(p => p.tier === user.tier);
                const planName = currentPlan ? (language === 'tr' ? currentPlan.name_tr : currentPlan.name) : user.tier;
                const price = currentPlan ? (language === 'tr' ? currentPlan.price_tr : currentPlan.price) : 0;
                const currency = language === 'tr' ? 'TL' : '$';
                return t('planWithPrice', { plan: planName, price: `${currency}${price}/year` });
              })()}
            </p>
          </div>

          {/* Redemption Info */}
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-500 dark:text-brand-text-muted">{t('redemptionsLeft') || 'Redemptions Left'}</p>
            <p className={`font-bold ${remaining === 0 ? 'text-red-500' : 'text-green-500'}`}>
              {total === Infinity ? '∞' : `${remaining} / ${total}`}
            </p>
          </div>
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-500 dark:text-brand-text-muted">{t('renewsOn') || 'Renews On'}</p>
            <p className="text-gray-800 dark:text-brand-text-light font-semibold">{renewalDate}</p>
          </div>

          {(user.extraRedemptions ?? 0) > 0 && (
            <div className="flex justify-between items-center text-sm">
              <p className="text-gray-500 dark:text-brand-text-muted">{t('bonusRedemptionsAvailable')}</p>
              <p className="text-brand-primary font-bold">{user.extraRedemptions}</p>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-500 dark:text-brand-text-muted">{t('nextBillLabel')}</p>
            <p className="text-gray-800 dark:text-brand-text-light font-semibold">{renewalDate}</p>
          </div>
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-500 dark:text-brand-text-muted">{t('paymentMethodLabel')}</p>
            <p className="text-gray-800 dark:text-brand-text-light font-semibold">**** 1234 Visa</p>
          </div>
          <div className="pt-2 flex gap-4">
            <button onClick={() => navigate('/subscriptions')} className="flex-1 bg-gray-100 dark:bg-brand-bg text-gray-800 dark:text-brand-text-light font-semibold py-2 px-4 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors">{t('managePlan')}</button>
            <button onClick={() => navigate('/subscriptions')} className="flex-1 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">{t('upgradePlan')}</button>
          </div>
        </div>
      </SettingsSection>

      {/* Refer a Friend Section */}
      <SettingsSection title={t('referFriendTitle')}>
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-brand-text-muted mb-4">{t('referFriendSubtitle')}</p>
          <div className="flex items-center justify-between bg-gray-100 dark:bg-brand-bg p-3 rounded-lg gap-2">
            <span className="text-sm font-mono text-gray-800 dark:text-brand-text-light truncate flex-grow">{referralCode}</span>
            <button
              onClick={() => handleCopyCode(referralCode)}
              className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors flex-shrink-0"
            >
              {copied ? t('copied') : t('copyCode')}
            </button>
          </div>
        </div>

        {!user.referredBy && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-brand-text-muted mb-2 text-center">{t('haveReferralCode') || 'Have a referral code? Enter it here:'}</p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={manualReferralCode}
                onChange={(e) => setManualReferralCode(e.target.value)}
                placeholder="Enter User ID / Code"
                className="flex-grow bg-gray-100 dark:bg-brand-bg rounded-lg p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
              />
              <button
                onClick={handleRedeemReferral}
                className="bg-brand-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors"
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
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-brand-text-muted uppercase tracking-wider px-4 mb-2">{t('profileInfo')}</h2>
        <div className="bg-white dark:bg-brand-surface rounded-lg shadow-sm">
          <form onSubmit={handleSaveChanges} className="p-4 space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('fullNameLabel')}</label>
              <input
                type="text"
                id="fullName"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('emailLabel')}</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('mobileLabel') || 'Mobile Number'}</label>
              <input
                type="tel"
                id="mobile"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="+90 555 123 45 67"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('addressLabel')}</label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder={t('addressPlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('billingAddressLabel')}</label>
              <input
                type="text"
                id="billingAddress"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full py-2 px-3 bg-gray-100 dark:bg-brand-bg border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder={t('billingAddressPlaceholder')}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                {t('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Account Section */}
      <SettingsSection title={t('accountSection')}>
        <SettingsItem onClick={() => setChangePasswordModalOpen(true)} icon={<Lock className="w-6 h-6" />} title={t('changePassword')} subtitle={t('changePasswordSubtitle')} action={<ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-brand-text-muted" />} />
        <SettingsItem icon={<BellIcon className="w-6 h-6" />} title={t('notificationSettings')} subtitle={t('notificationSettingsSubtitle')} action={<Toggle checked={settings.notifications} onChange={() => handleToggle('notifications')} />} />
        <SettingsItem icon={<Globe className="w-6 h-6" />} title={t('languageSelection')} action={<LanguageSelector lang={language} onToggle={toggleLanguage} />} isLast={true} />
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
      <div className="mt-8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center py-3 px-4 border border-red-500/30 dark:border-red-500/50 text-red-500 dark:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-semibold"
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