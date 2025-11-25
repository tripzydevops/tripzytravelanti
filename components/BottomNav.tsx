import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon, SparklesIcon, UserIcon, ShieldCheckIcon, BookmarkIcon } from './Icons';

const BottomNav: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const navItems = [
    { path: '/', label: t('bottomNavHome'), icon: HomeIcon, admin: false },
    { path: '/my-deals', label: t('bottomNavMyDeals'), icon: BookmarkIcon, admin: false },
    { path: '/plan', label: t('bottomNavPlan'), icon: SparklesIcon, admin: false },
    { path: '/profile', label: t('bottomNavProfile'), icon: UserIcon, admin: false },
    { path: '/admin', label: t('bottomNavAdmin'), icon: ShieldCheckIcon, admin: true },
  ];
  
  const accessibleNavItems = navItems.filter(item => !item.admin || (item.admin && user?.isAdmin));


  const activeClassName = "text-brand-primary";
  const inactiveClassName = "text-gray-500 dark:text-brand-text-muted";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-brand-surface border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="container mx-auto px-4 flex justify-around">
        {accessibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'} // for exact matching on home route
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-full pt-3 pb-2 transition-colors duration-200 ${isActive ? activeClassName : inactiveClassName} hover:text-brand-primary`
            }
          >
            <item.icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
