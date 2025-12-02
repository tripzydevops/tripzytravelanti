
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { Globe, Compass, Search } from './Icons';
import { NotificationBell } from './NotificationBell';

const Header: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setSearchQuery('');
    navigate('/');
  };

  const handleLoginNav = () => {
    setSearchQuery('');
    navigate('/login');
  }

  const activeLinkStyle = {
    color: '#00b4d8',
    fontWeight: '600',
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center gap-4">
        <NavLink to="/" className="flex items-center space-x-2 text-2xl font-bold text-brand-dark flex-shrink-0">
          <Compass className="h-8 w-8 text-brand-primary" />
          <span>WanderWise AI</span>
        </NavLink>
        <div className="hidden md:flex items-center space-x-8 text-lg">
          <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : undefined} className="text-gray-600 hover:text-brand-primary transition-colors duration-300">{t('navHome')}</NavLink>
          <NavLink to="/subscriptions" style={({ isActive }) => isActive ? activeLinkStyle : undefined} className="text-gray-600 hover:text-brand-primary transition-colors duration-300">{t('navSubscriptions')}</NavLink>
        </div>

        {/* Search Bar */}
        <div className="relative flex-grow max-w-lg hidden md:block">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            aria-label={t('searchPlaceholder')}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center space-x-4 flex-shrink-0">
          <button onClick={toggleLanguage} className="flex items-center text-gray-600 hover:text-brand-primary transition-colors duration-300" aria-label="Toggle language">
            <Globe className="h-6 w-6 mr-1" />
            {language === 'en' ? 'TR' : 'EN'}
          </button>
          <NotificationBell />
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 hidden sm:block">{t('welcome')}, {user.name}</span>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-300 text-sm font-semibold">
                {t('logout')}
              </button>
            </div>
          ) : (
            <button onClick={handleLoginNav} className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors duration-300 text-sm font-semibold">
              {t('login')}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;