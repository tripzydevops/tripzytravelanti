import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon, Search, UserIcon, ShieldCheckIcon, Briefcase } from './Icons';

const BottomNav: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const navItems = [
    { path: '/', label: t('bottomNavHome') || 'Home', icon: HomeIcon, admin: false },
    { path: '/travel', label: t('bottomNavSearch') || 'Search', icon: Search, admin: false },
    { path: '/my-deals', label: t('bottomNavTrips') || 'Trips', icon: Briefcase, admin: false },
    { path: '/profile', label: t('bottomNavProfile') || 'Profile', icon: UserIcon, admin: false },
    { path: '/admin', label: t('bottomNavAdmin') || 'Admin', icon: ShieldCheckIcon, admin: true },
  ];

  const accessibleNavItems = navItems.filter(item => !item.admin || (item.admin && user?.isAdmin));

  const activeClassName = "text-brand-primary scale-110 icon-glow";
  const inactiveClassName = "text-white/60 hover:text-white hover:scale-105";

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-50">
      <div className="glass rounded-2xl shadow-2xl backdrop-blur-xl bg-black/20 border border-white/10">
        <div className="flex justify-around items-center px-2 py-3">
          {accessibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'} // for exact matching on home route
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full py-1 transition-all duration-300 ease-in-out group ${isActive ? activeClassName : inactiveClassName}`
              }
            >
              <item.icon className={`w-6 h-6 mb-1 transition-transform duration-300 ${item.path === '/admin' ? '' : ''}`} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              {/* Active Indicator Dot */}
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `absolute -bottom-1 w-1 h-1 rounded-full bg-brand-primary transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`
                }
              />
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
