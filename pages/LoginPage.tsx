import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ChevronLeftIcon } from '../components/Icons';

// --- SVG Icons for Social Login ---
const AppleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12 6.627 0 12-5.373 12-12C24 5.373 18.627 0 12 0zm-1.073 18.78c-1.344.494-2.813.494-4.22.186a9.923 9.923 0 0 1-1.63-.715c-.29-.186-.522-.43-.725-.684-.233-.29-.436-.59-.62-1.047a4.935 4.935 0 0 1-.29-2.325c.125-1.56.814-2.93 1.942-3.873.97-1.018 2.23-1.66 3.712-1.748 1.452-.093 2.87.279 4.062.962.29.186.521.43.725.684.093.093.218.156.343.186.344.093.687-.093.875-.372s.187-.625.093-.875c-.093-.25-.25-.494-.406-.715a6.89 6.89 0 0 0-2.872-2.108 8.16 8.16 0 0 0-4.62-1.108c-3.122 0-5.84 2.29-6.932 5.278-.625 1.748-.469 3.653.406 5.152.937 1.498 2.5 2.53 4.31 2.748.812.093 1.624.031 2.404-.156.281-.062.531-.218.687-.468.219-.344.156-.78-.125-1.062-.281-.25-.656-.344-.999-.281zM18.8 6.09c.813-.962 1.313-2.264 1.344-3.622C19.49 1.41 18.6 1.028 17.65 1.09c-1.468.093-2.81 1-3.622 2.138-.72.993-1.28 2.295-1.248 3.621.656.962 1.78 1.592 2.998 1.592.344 0 .687-.062 1.03-.186z"></path></svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"></path></svg>
);

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#fbc02d"></path><path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#e53935"></path><path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4caf50"></path><path d="M43.611 20.083H42V20H24v8h11.303c-.792 2.447-2.756 4.517-5.17 5.594l6.19 5.238C42.025 35.636 44 30.138 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1565c0"></path></svg>
);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Failed to sign in with Google.');
    }
  };

  const handleSocialLogin = () => {
    // TODO: Implement other social logins
    setError('This social login method is coming soon!');
  };

  const SocialLoginOptions = () => (
    <div className="w-full max-w-md space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white tracking-tight">
          {t('letsGetYouStarted')}
        </h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          {t('yourNextAdventure')}
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setShowEmailForm(true)}
          className="w-full flex items-center justify-center gap-x-3 py-4 px-6 rounded-2xl bg-gradient-primary text-white font-bold text-lg shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
        >
          {t('continueWithEmail')}
        </button>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm font-medium tracking-wider">{t('or')}</span>
          <div className="flex-grow border-t border-gray-200 dark:border-white/10"></div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={handleSocialLogin}
            className="w-full flex items-center justify-center gap-x-3 py-3.5 px-6 rounded-2xl bg-black text-white font-semibold text-base shadow-md hover:bg-gray-900 hover:scale-[1.02] transition-all duration-300"
          >
            <AppleIcon className="h-6 w-6" />
            {t('signInWithApple')}
          </button>

          <button
            onClick={handleSocialLogin}
            className="w-full flex items-center justify-center gap-x-3 py-3.5 px-6 rounded-2xl bg-[#1877F2] text-white font-semibold text-base shadow-md hover:bg-[#166fe5] hover:scale-[1.02] transition-all duration-300"
          >
            <FacebookIcon className="h-6 w-6" />
            {t('signInWithFacebook')}
          </button>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-x-3 py-3.5 px-6 rounded-2xl bg-white text-gray-700 font-semibold text-base border border-gray-200 shadow-sm hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300"
          >
            <GoogleIcon className="h-6 w-6" />
            {t('signInWithGoogle')}
          </button>
        </div>
      </div>
    </div>
  );

  const EmailLoginForm = () => (
    <div className="w-full max-w-md animate-fade-in">
      <div className="mb-8">
        <button
          onClick={() => setShowEmailForm(false)}
          className="group flex items-center text-gray-500 hover:text-brand-primary transition-colors mb-6"
        >
          <div className="p-2 rounded-full bg-gray-100 dark:bg-white/5 group-hover:bg-brand-primary/10 transition-colors mr-2">
            <ChevronLeftIcon className="w-5 h-5" />
          </div>
          <span className="font-medium">{t('back')}</span>
        </button>
        <h2 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">
          {t('loginTitle')}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('loginSubtitle')}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleEmailLoginSubmit}>
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium flex items-center animate-shake">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('emailLabel')}
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-200"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('passwordLabel')}
              </label>
              <a href="#" className="text-sm font-medium text-brand-primary hover:text-brand-secondary transition-colors">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all duration-200"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-4 px-6 rounded-2xl bg-gradient-primary text-white font-bold text-lg shadow-lg shadow-brand-primary/30 hover:shadow-xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            t('loginButton')
          )}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white dark:bg-brand-bg">
      {/* Left Side - Image (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/3 relative overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-110"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop")',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-brand-primary/20 mix-blend-overlay" />

        <div className="relative z-10 flex flex-col justify-end p-16 text-white max-w-2xl">
          <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
            Over 10,000+ active travelers
          </div>
          <h2 className="text-5xl font-heading font-bold mb-6 leading-tight">
            Unlock the world's best travel secrets.
          </h2>
          <p className="text-xl text-white/80 leading-relaxed">
            Join our community of explorers and get access to exclusive deals, hidden gems, and premium experiences at unbeatable prices.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 xl:w-1/3 flex flex-col justify-center items-center p-8 lg:p-12 relative">
        {/* Mobile Background (visible only on small screens) */}
        <div className="lg:hidden absolute inset-0 z-0">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021")' }} />
          <div className="absolute inset-0 bg-white/90 dark:bg-brand-bg/95 backdrop-blur-sm" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {showEmailForm ? <EmailLoginForm /> : <SocialLoginOptions />}

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('termsAgreement')}{' '}
              <a className="font-semibold text-brand-primary hover:text-brand-secondary hover:underline transition-colors" href="#">{t('termsOfService')}</a> {t('and')}{' '}
              <a className="font-semibold text-brand-primary hover:text-brand-secondary hover:underline transition-colors" href="#">{t('privacyPolicy')}</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
