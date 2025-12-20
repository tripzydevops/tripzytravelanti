import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useContent } from '../contexts/ContentContext';
import { CustomMailIcon, CustomLockIcon, CustomUserIcon, CustomTicketIcon, AppleLogo, FacebookLogo, GoogleLogo } from '../components/Icons';
import { useToast } from '../contexts/ToastContext';
import { getBackgroundImages } from '../lib/supabaseService';

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
        const user = await login(email, password);
        showSuccess(t('loginSuccess') || 'Successfully logged in!');

        if (user?.role === 'partner') {
          navigate('/partner/dashboard');
        } else if (user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
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

  // ==========================================
  // Dynamic Background Logic
  // ==========================================
  const [backgroundImages, setBackgroundImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?q=80&w=2000&auto=format&fit=crop' // Fallback
  ]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchBackgrounds = async () => {
      // Determine Time of Day
      const hour = new Date().getHours();
      let timeOfDay = 'afternoon';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 24) timeOfDay = 'evening';
      else timeOfDay = 'night';

      const images = await getBackgroundImages(timeOfDay);
      if (images && images.length > 0) {
        setBackgroundImages(images.map(img => img.url));
        // Pick a random image from the set to display
        setCurrentImageIndex(Math.floor(Math.random() * images.length));
      }
    };
    fetchBackgrounds();
  }, []);

  // Removed auto-rotation interval. Use static random image per session.


  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-body">
      {/* Background Image Carousel */}
      {backgroundImages.map((img, index) => (
        <div
          key={img}
          className={`absolute inset-0 bg-cover bg-center z-0 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundImage: `url("${img}")`,
          }}
        />
      ))}

      {/* Deep Ocean Blue Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/40 via-brand-bg/20 to-brand-bg/60 z-0" />

      {/* Main Login Container - Frosted Glass Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-8 md:p-10 relative overflow-hidden transform-gpu">

          {/* Subtle gold glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gold-400/50 blur-lg rounded-full"></div>

          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-5xl font-heading font-bold text-gold-500 drop-shadow-lg">T</span>
              <span className="text-2xl font-body font-medium text-white tracking-wide drop-shadow-md">Tripzy</span>
            </div>

            <h1 className="text-4xl font-serif text-gold-400 mb-2 drop-shadow-md tracking-wide">
              {isSignup ? (t('createAccount') || 'Create Account') : (t('welcomeBack') || 'Welcome Back')}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLoginSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            {isSignup && (
              <>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CustomUserIcon className="w-5 h-5 text-gold-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('fullNameLabel') || "Full Name"}
                    className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold-500/70 focus:bg-white/10 focus:ring-1 focus:ring-gold-500/50 transition-colors duration-200"
                    required
                  />
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <CustomTicketIcon className="w-5 h-5 text-gold-500" />
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder={t('referralCodeOptional') || "Referral Code (Optional)"}
                    className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold-500/70 focus:bg-white/10 focus:ring-1 focus:ring-gold-500/50 transition-colors duration-200"
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <CustomMailIcon className="h-5 w-5 text-gold-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailLabel') || "Email Address"}
                className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold-500/70 focus:bg-white/10 focus:ring-1 focus:ring-gold-500/50 transition-colors duration-200"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <CustomLockIcon className="h-5 w-5 text-gold-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordLabel') || "Password"}
                className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-gold-500/70 focus:bg-white/10 focus:ring-1 focus:ring-gold-500/50 transition-colors duration-200"
                required
              />
            </div>

            {!isSignup && (
              <div className="flex justify-end">
                <button type="button" className="text-sm text-white/70 hover:text-gold-400 transition-colors font-medium">
                  {t('forgotPassword') || "Forgot Password?"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white font-bold text-lg shadow-[0_4px_14px_0_rgba(212,175,55,0.39)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.23)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                isSignup ? (t('signupButton') || 'Sign Up') : (t('loginButton') || 'Log In')
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-8 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-white/40 text-sm font-medium tracking-wider">
              {t('orContinueWith') || 'Or continue with'}
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Social Login */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGoogleLogin}
              className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-300 group backdrop-blur-md"
              aria-label="Sign in with Google"
            >
              <GoogleLogo className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleSocialLogin}
              className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-300 group backdrop-blur-md"
              aria-label="Sign in with Apple"
            >
              <AppleLogo className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center animate-fade-in delay-100 flex flex-col gap-3">
            <p className="text-white/60 text-sm">
              {isSignup ? (t('alreadyHaveAccount') || "Already have an account?") : (t('dontHaveAccount') || "Don't have an account?")}{' '}
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-gold-400 font-bold hover:text-gold-300 transition-colors ml-1"
              >
                {isSignup ? (t('loginButton') || 'Log In') : (t('signupButton') || 'Sign Up')}
              </button>
            </p>

            <div className="pt-6 border-t border-white/10 mt-2">
              <p className="text-gold-500/60 text-[10px] tracking-[0.2em] uppercase font-bold mb-3">
                {t('businessPartners')}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsSignup(false);
                    showSuccess(t('partnerPortalHint') || "Please login with your partner account to access the dashboard.");
                  }}
                  className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-gold-500/20 hover:border-gold-500/40 text-gold-400 font-semibold text-sm transition-all duration-300 backdrop-blur-sm"
                >
                  {t('partnerPortalEntrance')}
                </button>
                <p className="text-white/40 text-[11px] italic">
                  {t('becomePartnerHint') || "Want to grow your business with Tripzy?"}{' '}
                  <button
                    onClick={() => showSuccess("Partner application system is coming soon! Please contact support@tripzy.com")}
                    className="text-gold-500/80 hover:text-gold-400 font-bold underline decoration-gold-500/30 underline-offset-2 transition-colors ml-1"
                  >
                    {t('becomePartner')}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative background flare */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
    </div>
  );
};

export default LoginPage;
