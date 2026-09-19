import React, { useState, useRef, useEffect } from 'react';
import { Bell, Info, AlertCircle, CheckCircle, XCircle, Megaphone, Trash2, CheckCheck, X } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerHapticFeedback } from '../lib/hapticUtils';

export const NotificationBell: React.FC = () => {
    const {
        notifications,
        announcements,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        readAnnouncementIds
    } = useNotifications();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertCircle className="w-4 h-4 text-amber-400" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'error': return <XCircle className="w-4 h-4 text-rose-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    const formatTimestamp = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        } catch {
            return dateStr;
        }
    };

    const handleNotificationClick = async (id: string, link?: string) => {
        await markAsRead(id);
        if (link) {
            setIsOpen(false);
            window.location.href = link;
        }
    };

    const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        triggerHapticFeedback('light');
        await deleteNotification(id);
    };

    const handleDeleteAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDeletingAll(true);
        triggerHapticFeedback('medium');
        try {
            await deleteAllNotifications();
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHapticFeedback('light');
        await markAllAsRead();
    };

    const allItems = [
        ...announcements.map(a => ({ ...a, isAnnouncement: true, isRead: readAnnouncementIds.includes(a.id) })),
        ...notifications
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    triggerHapticFeedback('light');
                }}
                className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all focus:outline-none"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 md:w-6 md:h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center rounded-full border-2 border-brand-bg shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden z-50 animate-scale-up">
                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white tracking-wide">
                                {t('notificationsTitle') || 'Notifications'}
                            </h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] bg-gold-500/20 text-gold-400 border border-gold-500/30 px-2 py-0.5 rounded-full font-semibold">
                                    {unreadCount} {t('unreadLabel') || 'unread'}
                                </span>
                            )}
                        </div>

                        {/* Header Action Buttons */}
                        {allItems.length > 0 && (
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="flex items-center gap-1 text-xs text-white/60 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                                        title={t('markAllAsRead') || 'Mark all as read'}
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        <span className="text-[11px] font-medium hidden sm:inline">{t('markAllAsRead') || 'Mark Read'}</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    disabled={isDeletingAll}
                                    className="flex items-center gap-1 text-xs text-rose-400/80 hover:text-rose-300 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10 disabled:opacity-50"
                                    title={t('deleteAllNotifications') || 'Delete all notifications'}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-bold">{t('deleteAllNotifications') || 'Delete All'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
                        {allItems.length === 0 ? (
                            <div className="py-12 px-6 text-center text-white/40 flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-white/20">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-white/60">{t('noNotifications') || 'No notifications yet'}</p>
                                <p className="text-xs text-white/30 mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            allItems.map((item: any) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleNotificationClick(item.id, item.link)}
                                    className={`group relative p-4 transition-all duration-200 cursor-pointer flex items-start gap-3 hover:bg-white/[0.04] ${
                                        !item.isRead ? 'bg-gold-500/[0.04]' : ''
                                    }`}
                                >
                                    {/* Type Icon */}
                                    <div className="mt-0.5 flex-shrink-0 p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-105 transition-transform">
                                        {item.isAnnouncement ? (
                                            <Megaphone className="w-4 h-4 text-gold-400" />
                                        ) : (
                                            getTypeIcon(item.type)
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <p className={`text-sm font-semibold truncate ${
                                                item.isRead ? 'text-white/80' : 'text-white font-bold'
                                            }`}>
                                                {item.title}
                                            </p>
                                        </div>

                                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mt-0.5">
                                            {item.message}
                                        </p>

                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] text-white/40 font-medium">
                                                {formatTimestamp(item.createdAt)}
                                            </span>
                                            {item.isAnnouncement && (
                                                <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30">
                                                    {t('announcementBadge') || 'Announcement'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Unread Dot Indicator */}
                                    {!item.isRead && (
                                        <div className="absolute top-4 right-10 w-2 h-2 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                                    )}

                                    {/* Individual Delete Button (One-by-One Deletion) */}
                                    <button
                                        onClick={(e) => handleDeleteSingle(e, item.id)}
                                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all p-1.5 rounded-lg bg-white/5 sm:bg-transparent hover:bg-rose-500/20 text-white/50 hover:text-rose-300 absolute top-3 right-3 focus:opacity-100 shadow-sm"
                                        title={t('deleteNotification') || 'Delete this notification'}
                                        aria-label="Delete this notification"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

