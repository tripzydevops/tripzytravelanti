import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useContent } from '../contexts/ContentContext';
import { CustomMailIcon, CustomLockIcon, CustomUserIcon, CustomTicketIcon, AppleLogo, FacebookLogo, GoogleLogo } from '../components/Icons';
import { useToast } from '../contexts/ToastContext';
import { getBackgroundImages, submitPartnerLead } from '../lib/supabaseService';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const { login, signup, signInWithGoogle, signInWithFacebook, signInWithApple } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();

  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    industry: '',
    message: ''
  });

  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerLoading(true);
    try {
      await submitPartnerLead(partnerForm);
      showSuccess(t('partnerAppSuccess'));
      setShowPartnerModal(false);
      setPartnerForm({ businessName: '', contactName: '', email: '', phone: '', industry: '', message: '' });
    } catch (err: any) {
      showError(err.message || "Failed to submit application");
    } finally {
      setPartnerLoading(false);
    }
  };

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
    } catch (err: any) {
      console.error('Google login error:', err);
      showError(t('googleLoginError') || 'Failed to sign in with Google.');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setError('');
      await signInWithFacebook();
    } catch (err: any) {
      console.error('Facebook login error:', err);
      showError(t('facebookLoginError') || 'Failed to sign in with Facebook.');
    }
  };

  const handleAppleLogin = async () => {
    try {
      setError('');
      await signInWithApple();
    } catch (err: any) {
      console.error('Apple login error:', err);
      showError(t('appleLoginError') || 'Failed to sign in with Apple.');
    }
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

          {/* Refined Premium Branding & Header */}
          <div className="text-center mb-12">
            <div className="flex flex-col items-center mb-8 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="relative mb-4">
                <img src="/logo-premium.png" alt="Tripzy" className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-700 group-hover:drop-shadow-[0_0_30px_rgba(212,175,55,0.7)] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gold-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              </div>
              <div className="text-center">
                <span className="text-4xl font-black tracking-[0.1em] text-white uppercase italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">Tripzy</span>
                <div className="mt-2 flex items-center justify-center gap-4">
                  <div className="h-[1px] w-8 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent"></div>
                  <span className="text-[11px] text-gold-400 font-bold tracking-[0.5em] uppercase opacity-90">Travel Exclusive</span>
                  <div className="h-[1px] w-8 bg-gradient-to-l from-transparent via-gold-500/50 to-transparent"></div>
                </div>
              </div>
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
                ref={emailInputRef}
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
              aria-label={t('signInWithGoogle') || "Sign in with Google"}
            >
              <GoogleLogo className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleFacebookLogin}
              className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-300 group backdrop-blur-md"
              aria-label={t('signInWithFacebook') || "Sign in with Facebook"}
            >
              <FacebookLogo className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={handleAppleLogin}
              className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all duration-300 group backdrop-blur-md"
              aria-label={t('signInWithApple') || "Sign in with Apple"}
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
                    emailInputRef.current?.focus();
                    showSuccess(t('partnerPortalHint') || "Please login with your partner account to access the dashboard.");
                  }}
                  className="w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-gold-500/20 hover:border-gold-500/40 text-gold-400 font-semibold text-sm transition-all duration-300 backdrop-blur-sm"
                >
                  {t('partnerPortalEntrance')}
                </button>
                <p className="text-white/40 text-[11px] italic">
                  {t('becomePartnerHint')}{' '}
                  <button
                    onClick={() => setShowPartnerModal(true)}
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

      {/* Partner Application Modal */}
      {
        showPartnerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-serif text-gold-400">{t('partnerAppTitle')}</h2>
                    <p className="text-white/60 text-sm mt-1">{t('partnerAppSubtitle')}</p>
                  </div>
                  <button onClick={() => setShowPartnerModal(false)} className="text-white/40 hover:text-white transition-colors p-2">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handlePartnerSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-white/50 ml-1">{t('businessNameLabel')}</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                        value={partnerForm.businessName}
                        onChange={e => setPartnerForm({ ...partnerForm, businessName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white/50 ml-1">{t('contactNameLabel')}</label>
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                        value={partnerForm.contactName}
                        onChange={e => setPartnerForm({ ...partnerForm, contactName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-white/50 ml-1">{t('emailLabel')}</label>
                      <input
                        required
                        type="email"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                        value={partnerForm.email}
                        onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white/50 ml-1">{t('mobileLabel') || 'Phone'}</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                        value={partnerForm.phone}
                        onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50 ml-1">{t('industryLabel')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Travel, Hospitality, E-commerce"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500/50"
                      value={partnerForm.industry}
                      onChange={e => setPartnerForm({ ...partnerForm, industry: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-white/50 ml-1">{t('messageLabel')}</label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold-500/50 resize-none"
                      value={partnerForm.message}
                      onChange={e => setPartnerForm({ ...partnerForm, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={partnerLoading}
                    className="w-full py-4 mt-2 rounded-xl bg-gold-500 text-black font-bold uppercase tracking-widest hover:bg-gold-400 transition-colors disabled:opacity-50"
                  >
                    {partnerLoading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" /> : t('submitApplication')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {/* Decorative background flare */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-3xl translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
    </div >
  );
};

export default LoginPage;
