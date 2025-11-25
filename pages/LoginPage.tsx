import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, SubscriptionTier } from '../types';
import { ChevronLeftIcon } from '../components/Icons';

// --- SVG Icons for Social Login (to match new design) ---
const AppleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12 6.627 0 12-5.373 12-12C24 5.373 18.627 0 12 0zm-1.073 18.78c-1.344.494-2.813.494-4.22.186a9.923 9.923 0 0 1-1.63-.715c-.29-.186-.522-.43-.725-.684-.233-.29-.436-.59-.62-1.047a4.935 4.935 0 0 1-.29-2.325c.125-1.56.814-2.93 1.942-3.873.97-1.018 2.23-1.66 3.712-1.748 1.452-.093 2.87.279 4.062.962.29.186.521.43.725.684.093.093.218.156.343.186.344.093.687-.093.875-.372s.187-.625.093-.875c-.093-.25-.25-.494-.406-.715a6.89 6.89 0 0 0-2.872-2.108 8.16 8.16 0 0 0-4.62-1.108c-3.122 0-5.84 2.29-6.932 5.278-.625 1.748-.469 3.653.406 5.152.937 1.498 2.5 2.53 4.31 2.748.812.093 1.624.031 2.404-.156.281-.062.531-.218.687-.468.219-.344.156-.78-.125-1.062-.281-.25-.656-.344-.999-.281zM18.8 6.09c.813-.962 1.313-2.264 1.344-3.622C19.49 1.41 18.6 1.028 17.65 1.09c-1.468.093-2.81 1-3.622 2.138-.72.993-1.28 2.295-1.248 3.621.656.962 1.78 1.592 2.998 1.592.344 0 .687-.062 1.03-.186z"></path></svg>
);

const FacebookIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"></path></svg>
);

const GoogleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#fbc02d"></path><path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#e53935"></path><path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4caf50"></path><path d="M43.611 20.083H42V20H24v8h11.303c-.792 2.447-2.756 4.517-5.17 5.594l6.19 5.238C42.025 35.636 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1565c0"></path></svg>
);


const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleEmailLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isAdmin = email === 'admin@tripzy.com';
    const mockUser: User = {
      id: '123',
      name: isAdmin ? 'Admin User' : 'Alex',
      email: email,
      tier: isAdmin ? SubscriptionTier.VIP : SubscriptionTier.FREE,
      isAdmin: isAdmin,
    };
    login(mockUser);
    navigate('/');
  };
  
  const handleSocialLogin = () => {
    const mockUser: User = {
      id: '456',
      name: 'Social User',
      email: 'social@example.com',
      tier: SubscriptionTier.PREMIUM,
      isAdmin: false,
    };
    login(mockUser);
    navigate('/');
  };

  const SocialLoginOptions = () => (
    <>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('letsGetYouStarted')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('yourNextAdventure')}</p>
      </div>
      <div className="space-y-4 max-w-sm mx-auto">
        <button
          onClick={() => setShowEmailForm(true)}
          className="w-full flex items-center justify-center gap-x-3 py-3 px-4 rounded-full bg-[#13a4ec] text-white font-bold text-base hover:bg-[#13a4ec]/90 transition-colors duration-300"
        >
          {t('continueWithEmail')}
        </button>
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 text-sm">{t('or')}</span>
          <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <button onClick={handleSocialLogin} className="w-full flex items-center justify-center gap-x-3 py-3 px-4 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold text-base border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300">
          <AppleIcon className="h-6 w-6" />
          {t('signInWithApple')}
        </button>
        <button onClick={handleSocialLogin} className="w-full flex items-center justify-center gap-x-3 py-3 px-4 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold text-base border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300">
          <FacebookIcon className="h-6 w-6" />
          {t('signInWithFacebook')}
        </button>
        <button onClick={handleSocialLogin} className="w-full flex items-center justify-center gap-x-3 py-3 px-4 rounded-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold text-base border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300">
          <GoogleIcon className="h-6 w-6" />
          {t('signInWithGoogle')}
        </button>
      </div>
    </>
  );

  const EmailLoginForm = () => (
    <div className="max-w-sm mx-auto">
      <div className="relative text-center mb-6">
        <button 
          onClick={() => setShowEmailForm(false)} 
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-800 dark:text-brand-text-muted dark:hover:text-white"
          aria-label="Back"
        >
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('loginTitle')}</h2>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleEmailLoginSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email-address" className="sr-only">{t('emailLabel')}</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface placeholder-gray-500 dark:placeholder-brand-text-muted text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13a4ec] focus:border-[#13a4ec] sm:text-sm"
              placeholder={t('emailLabel')}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">{t('passwordLabel')}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface placeholder-gray-500 dark:placeholder-brand-text-muted text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13a4ec] focus:border-[#13a4ec] sm:text-sm"
              placeholder={t('passwordLabel')}
            />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-x-3 py-3 px-4 rounded-full bg-[#13a4ec] text-white font-bold text-base hover:bg-[#13a4ec]/90 transition-colors duration-300"
          >
            {t('loginButton')}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-brand-bg text-gray-800 dark:text-gray-200">
        <main className="flex-grow flex flex-col">
            <div className="w-full h-96">
                <img alt="Tranquil tropical beach with a modern woven rattan hanging chair" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKNU_2KHMdTvBf2MAJqMaZ17VJruucar2B2hgyW9lMZQwq1tEvm8azMoFljaPG3DOmXOiVTWyWJJH3MuEDVItpYr_D3Mu-ZTjjdV47XpUkTek5iIMaq-tNtlRQD2oSoWrlARi0GZrkBWdGvnFQYCU0wwC968h4X1SlrKk2I5tQUIOSEAV4D51mCBFK4qtSdPQRb8w7YNd9tU7t0zaf_Y4t-ScIalne3VCzrLh_ntPiW0PY-1ye3QxpvVJPmnAwTYbapdhdWIXJuQ"/>
            </div>
            <div className="px-6 py-8 flex-grow flex flex-col justify-center">
                {showEmailForm ? <EmailLoginForm /> : <SocialLoginOptions />}
            </div>
        </main>
        <footer className="text-center px-6 py-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('termsAgreement')}{' '}
                <a className="font-semibold text-[#13a4ec] hover:underline" href="#">{t('termsOfService')}</a> {t('and')}{' '}
                <a className="font-semibold text-[#13a4ec] hover:underline" href="#">{t('privacyPolicy')}</a>.
            </p>
        </footer>
    </div>
  );
};

export default LoginPage;
