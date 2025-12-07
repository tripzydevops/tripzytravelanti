import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useContent } from '../contexts/ContentContext';
import { MailIcon, Lock, AppleLogo, FacebookLogo, GoogleLogo } from '../components/Icons';
import { useToast } from '../contexts/ToastContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const { login, signup, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password, name, referralCode);
        showSuccess(t('signupSuccess') || 'Successfully signed up!');
      } else {
        await login(email, password);
        showSuccess(t('loginSuccess') || 'Successfully logged in!');
      }
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithGoogle();
      showSuccess(t('loginSuccess') || 'Successfully logged in with Google!');
    } catch (err: any) {
      console.error('Google login error:', err);
      const errorMessage = 'Failed to sign in with Google.';
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  const handleSocialLogin = () => {
    setError('This social login method is coming soon!');
  };

  const { getContent } = useContent();
  const { language } = useLanguage();

  // Dynamic Content
  const heroImage = getContent('login', 'hero', 'image_url');
  const displayHeroImage = heroImage?.content_value || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: `url("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop")`, // Night ocean/travel vibe
          filter: 'blur(2px)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#001F3F] via-[#001F3F]/90 to-[#0074D9]/80 z-0 mix-blend-multiply" />

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        <div className="backdrop-blur-xl bg-black/40 rounded-3xl border border-gold-500/30 shadow-2xl overflow-hidden p-8 animate-fade-in">

          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-4xl font-heading font-bold text-gold-400">T</span>
              <span className="text-2xl font-heading font-medium text-white tracking-wide">Tripzy</span>
            </div>
            <h1 className="text-3xl font-serif text-gold-400 mb-2">
              {isSignup ? (t('createAccount') || 'Create Account') : (t('welcomeBack') || 'Welcome Back')}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLoginSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            {isSignup && (
              <>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gold-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('fullNameLabel') || "Full Name"}
                    className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all duration-300"
                    required
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gold-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.593l6.002-2.002a2.051 2.051 0 00.593-2.607l-9.581-9.581a2.25 2.25 0 00-1.591-.659z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                    </span>
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder={t('referralCodeOptional') || "Referral Code (Optional)"}
                    className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all duration-300"
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MailIcon className="h-5 w-5 text-gold-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailLabel') || "Email Address"}
                className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all duration-300"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gold-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordLabel') || "Password"}
                className="block w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/50 transition-all duration-300"
                required
              />
            </div>

            {!isSignup && (
              <div className="flex justify-end">
                <button type="button" className="text-sm text-white/80 hover:text-gold-400 transition-colors">
                  {t('forgotPassword') || "Forgot Password?"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 text-white font-bold text-lg shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                isSignup ? (t('signupButton') || 'Sign Up') : (t('loginButton') || 'Log In')
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-white/40 text-sm font-medium tracking-wider">
              {t('orContinueWith') || 'Or continue with'}
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 group"
            >
              <GoogleLogo className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleSocialLogin}
              className="flex items-center justify-center py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 group"
            >
              <AppleLogo className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/60">
              {isSignup ? (t('alreadyHaveAccount') || "Already have an account?") : (t('dontHaveAccount') || "Don't have an account?")}{' '}
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-gold-400 font-semibold hover:text-gold-300 transition-colors"
              >
                {isSignup ? (t('loginButton') || 'Log In') : (t('signupButton') || 'Sign Up')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
