import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogOut, LayoutDashboard, QrCode, Settings, Menu, X } from 'lucide-react';

const PartnerLayout: React.FC = () => {
    const { user, logout, loading } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

    // Close sidebar on route change (mobile)
    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    if (!user || user.role !== 'partner') {
        // Redirect non-partners
        // In a real app, you might want to show a "Not Authorized" page or redirect to home
        // For now, we'll redirect to home if they somehow got here
        React.useEffect(() => {
            if (user && user.role !== 'partner') {
                navigate('/');
            } else if (!user) {
                navigate('/login');
            }
        }, [user, navigate]);

        return null;
    }

    return (
        <div className="flex h-screen bg-brand-bg text-brand-text-light overflow-hidden relative">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-50 glass-premium border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-amber-600 flex items-center justify-center shadow-lg shadow-brand-primary/20">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <span className="font-bold text-white">Partner Portal</span>
                </div>
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                    {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:relative inset-y-0 left-0 z-50 w-64 glass-premium flex flex-col border-r border-white/10 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 border-b border-white/10 flex items-center gap-3 hidden md:flex">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-amber-600 flex items-center justify-center shadow-lg shadow-brand-primary/20">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Partner Portal</h1>
                        <p className="text-xs text-brand-text-muted">Tripzy Business</p>
                    </div>
                </div>

                <div className="p-4 border-b border-white/5 bg-white/5 mt-16 md:mt-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shrink-0">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold text-gray-400">{user?.name?.charAt(0)}</span>
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-brand-text-muted flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <NavLink
                        to="/partner/dashboard"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                                : 'text-brand-text-muted hover:bg-white/5 hover:text-white border border-transparent'
                            }`
                        }
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/partner/scan"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                                : 'text-brand-text-muted hover:bg-white/5 hover:text-white border border-transparent'
                            }`
                        }
                    >
                        <QrCode className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                        Scan Code
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                                : 'text-brand-text-muted hover:bg-white/5 hover:text-white border border-transparent'
                            }`
                        }
                    >
                        <Settings className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                        Settings
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-white/10 bg-black/20">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-300 border border-transparent hover:border-red-500/20 group"
                    >
                        <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                    <p className="text-[10px] text-center text-white/20 mt-4">Tripzy Partner v1.2</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 relative z-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default PartnerLayout;
