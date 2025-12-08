import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { User, UserNotificationPreferences } from '../types';
import {
    getAllUsers,
    updateUserProfile,
    deleteUserProfile,
    updateAllUsersNotificationPreferences as updateAllUsersNotificationPreferencesService,
} from '../lib/supabaseService';

interface AdminContextType {
    users: User[];
    loadingUsers: boolean;
    refreshUsers: () => Promise<void>;
    updateUser: (user: User) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addExtraRedemptions: (userId: string, amount: number) => Promise<void>;
    updateAllUsersNotificationPreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const fetchUsers = useCallback(async () => {
        if (!user?.isAdmin) return;
        setLoadingUsers(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoadingUsers(false);
        }
    }, [user?.isAdmin]);

    // Don't auto-fetch users on mount - only fetch when explicitly needed
    // This prevents slow initial page loads for all users
    // Admin components will call refreshUsers() when they mount

    const updateUser = useCallback(async (updatedUser: User) => {
        try {
            // Logic from AuthContext
            await updateUserProfile(updatedUser.id, {
                name: updatedUser.name,
                email: updatedUser.email,
                tier: updatedUser.tier,
                avatar_url: updatedUser.avatarUrl,
                extra_redemptions: updatedUser.extraRedemptions,
                notification_preferences: updatedUser.notificationPreferences,
                mobile: updatedUser.mobile,
                status: updatedUser.status,
                referred_by: updatedUser.referredBy,
            });

            setUsers((currentUsers) =>
                currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
            );
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }, []);

    const deleteUser = useCallback(async (userId: string) => {
        try {
            await deleteUserProfile(userId);
            setUsers((currentUsers) => currentUsers.filter((u) => u.id !== userId));
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }, []);

    const addExtraRedemptions = useCallback(async (userId: string, amount: number) => {
        try {
            const targetUser = users.find((u) => u.id === userId);
            if (!targetUser) return;

            const newRedemptions = (targetUser.extraRedemptions || 0) + amount;
            await updateUserProfile(userId, { extra_redemptions: newRedemptions });

            setUsers((currentUsers) =>
                currentUsers.map((u) =>
                    u.id === userId ? { ...u, extraRedemptions: newRedemptions } : u
                )
            );
        } catch (error) {
            console.error('Error adding extra redemptions:', error);
            throw error;
        }
    }, [users]);

    const updateAllUsersNotificationPreferences = useCallback(async (prefs: Partial<UserNotificationPreferences>) => {
        if (!user?.isAdmin) return;
        try {
            await updateAllUsersNotificationPreferencesService(prefs);
            // Optimistically update local users state
            setUsers((currentUsers) =>
                currentUsers.map((u) => ({
                    ...u,
                    notificationPreferences: {
                        ...u.notificationPreferences,
                        ...prefs
                    }
                }))
            );
        } catch (error) {
            console.error('Error updating all users notification preferences:', error);
            throw error;
        }
    }, [user]);

    const contextValue = useMemo(() => ({
        users,
        loadingUsers,
        refreshUsers: fetchUsers,
        updateUser,
        deleteUser,
        addExtraRedemptions,
        updateAllUsersNotificationPreferences
    }), [users, loadingUsers, fetchUsers, updateUser, deleteUser, addExtraRedemptions, updateAllUsersNotificationPreferences]);

    return (
        <AdminContext.Provider value={contextValue}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
