import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogOut, LayoutDashboard, QrCode, Settings } from 'lucide-react';

const PartnerLayout: React.FC = () => {
    const { user, logout, loading } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

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

        return (
            <div className="p-10 text-white">
                <h1 className="text-2xl font-bold text-red-500">Debug: Access Denied / Loading Issue</h1>
                <p>Loading: {loading ? 'true' : 'false'}</p>
                <p>User: {user ? 'Present' : 'Null'}</p>
                <p>User ID: {user?.id}</p>
                <p>User Role: {user?.role}</p>
                <button onClick={() => navigate('/')} className="mt-4 bg-white text-black px-4 py-2 rounded">Go Home</button>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-2xl font-bold text-brand-primary">Partner Portal</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Welcome, {user.name}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink
                        to="/partner/dashboard"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-brand-primary text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`
                        }
                    >
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        Dashboard
                    </NavLink>
                    <NavLink
                        to="/partner/scan"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-brand-primary text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`
                        }
                    >
                        <QrCode className="w-5 h-5 mr-3" />
                        Scan Code
                    </NavLink>
                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            `flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-brand-primary text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`
                        }
                    >
                        <Settings className="w-5 h-5 mr-3" />
                        Settings
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default PartnerLayout;
