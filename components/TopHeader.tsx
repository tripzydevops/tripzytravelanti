import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { NotificationBell } from './NotificationBell';

const TopHeader: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  // Hide on login, admin, and partner portal routes
  if (
    location.pathname === '/login' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/partner')
  ) {
    return null;
  }

  // On HomePage, the Hero banner already renders header elements inside the banner
  if (location.pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-brand-bg/85 border-b border-white/10 px-4 py-3 shadow-lg transition-all">
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
            className="px-6 py-2 bg-gold-500/20 hover:bg-gold-500 border border-gold-500/40 text-gold-400 hover:text-white rounded-full text-xs font-bold transition-all"
          >
            {t('login') || 'Login'}
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-gold-500/30 rounded-full text-white font-medium transition-all hover:border-gold-400 group"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-gold-400" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-400 flex items-center justify-center text-xs font-bold text-gold-400 uppercase">
                  {(user.name || user.email || 'U')[0]}
                </div>
              )}
              <span className="text-xs font-bold text-white group-hover:text-gold-300">
                {user.name?.split(' ')[0] || 'Profile'}
              </span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopHeader;
