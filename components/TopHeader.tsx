import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { NotificationBell } from './NotificationBell';
import { User, Wallet, Sparkles, Shield, LogOut, ChevronDown, Award } from 'lucide-react';
import { triggerHapticFeedback } from '../lib/hapticUtils';

const TopHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Hide on login, admin, and partner portal routes
  if (
    location.pathname === '/login' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/partner')
  ) {
    return null;
  }

  const handleLogout = async () => {
    triggerHapticFeedback('medium');
    setIsDropdownOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-brand-bg/90 border-b border-white/10 px-4 py-3 shadow-lg transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/favicon.png" alt="Tripzy" className="w-8 h-8 object-contain transition-transform group-hover:scale-110" />
          <span className="text-xl font-black italic uppercase tracking-wider text-white">
            Tripzy
          </span>
        </Link>

        {/* Right Header Navigation */}
        {!user ? (
          <Link
            to="/login"
            className="px-6 py-2 bg-gold-500/20 hover:bg-gold-500 border border-gold-500/40 text-gold-400 hover:text-white rounded-full text-xs font-bold transition-all shadow-md"
          >
            {t('login') || 'Login'}
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Profile Dropdown Trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  triggerHapticFeedback('light');
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-gold-500/30 rounded-full text-white font-medium transition-all hover:border-gold-400 group focus:outline-none"
                aria-expanded={isDropdownOpen}
                aria-label="User profile menu"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-gold-400" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-400 flex items-center justify-center text-xs font-bold text-gold-400 uppercase">
                    {(user.name || user.email || 'U')[0]}
                  </div>
                )}
                <span className="text-xs font-bold text-white group-hover:text-gold-300 max-w-[100px] truncate">
                  {user.name?.split(' ')[0] || 'Profile'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-gold-400' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden z-50 animate-scale-up">
                  {/* User Info Header */}
                  <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-11 h-11 rounded-full object-cover border-2 border-gold-400" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gold-500/20 border-2 border-gold-400 flex items-center justify-center text-base font-bold text-gold-400 uppercase">
                          {(user.name || user.email || 'U')[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">{user.name || 'User'}</p>
                        <p className="text-xs text-white/50 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] bg-gold-500/20 text-gold-400 border border-gold-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
                            {user.tier || 'FREE'}
                          </span>
                          <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                            <Award className="w-3 h-3" /> {user.points || 0} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                      <User className="w-4 h-4 text-gold-400" />
                      <span className="font-medium">{language === 'tr' ? 'Profilim & Seyahat Pasaportu' : 'My Profile & Passport'}</span>
                    </Link>

                    <Link
                      to="/wallet"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium">{language === 'tr' ? 'Cüzdanım & Fırsatlarım' : 'My Wallet & Deals'}</span>
                    </Link>

                    <Link
                      to="/subscriptions"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors group"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="font-medium">{language === 'tr' ? 'Abonelik Planları' : 'Subscription Plans'}</span>
                    </Link>

                    {(user.isAdmin || user.role === 'admin') && (
                      <Link
                        to="/admin"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 transition-colors group border-t border-white/5 mt-1 pt-2"
                      >
                        <Shield className="w-4 h-4 text-gold-400" />
                        <span className="font-bold">{language === 'tr' ? 'Yönetim Paneli' : 'Admin Portal'}</span>
                      </Link>
                    )}
                  </div>

                  {/* Sign Out Button */}
                  <div className="p-2 border-t border-white/10 bg-white/[0.01]">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>{t('signOut') || (language === 'tr' ? 'Çıkış Yap' : 'Sign Out')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;

