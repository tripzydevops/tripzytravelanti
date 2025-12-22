import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { CustomHomeIcon, CustomUserIcon, CustomShieldCheckIcon, CustomGlobeIcon, CustomCreditCardIcon } from './Icons';

const BottomNav: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const navItems = [
    { path: '/', label: t('bottomNavHome') || 'Home', icon: CustomHomeIcon, admin: false },
    { path: '/travel', label: t('bottomNavTravel') || 'Travel', icon: CustomGlobeIcon, admin: false },
    { path: '/wallet', label: t('bottomNavWallet') || 'Wallet', icon: CustomCreditCardIcon, admin: false },
    { path: '/profile', label: t('bottomNavProfile') || 'Profile', icon: CustomUserIcon, admin: false },
    { path: '/admin', label: t('bottomNavAdmin') || 'Admin', icon: CustomShieldCheckIcon, admin: true },
  ];

  const accessibleNavItems = navItems.filter(item => !item.admin || (item.admin && user?.isAdmin));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Gradient fade effect at bottom of content */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none transition-colors duration-300" />

      {/* Main navigation container */}
      <div className="mx-3 mb-3 sm:mx-4 sm:mb-4">
        <div className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200 shadow-2xl transition-colors duration-300">
          {/* Subtle top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Navigation items */}
          <div className="flex justify-around items-center px-1 py-2 sm:py-3">
            {accessibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-300 ease-out group ${isActive
                    ? 'text-brand-primary'
                    : 'text-slate-400 hover:text-slate-600'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active background glow */}
                    {isActive && (
                      <div className="absolute inset-x-2 -top-1 bottom-0 rounded-xl bg-brand-primary/15 blur-sm animate-pulse-slow" />
                    )}

                    {/* Active pill background */}
                    <div className={`absolute inset-x-2 top-0 bottom-1 rounded-xl transition-all duration-300 ${isActive
                      ? 'bg-brand-primary/10 scale-100 opacity-100'
                      : 'bg-transparent scale-95 opacity-0'
                      }`} />

                    {/* Icon container */}
                    <div className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'
                      }`}>
                      <item.icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${isActive
                        ? 'drop-shadow-[0_0_8px_rgba(var(--color-brand-primary-rgb),0.5)]'
                        : ''
                        }`} />
                    </div>

                    {/* Label */}
                    <span className={`relative z-10 text-[10px] sm:text-xs font-medium mt-1 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'
                      }`}>
                      {item.label}
                    </span>

                    {/* Active indicator dot */}
                    <div className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-primary transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                      }`} />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
