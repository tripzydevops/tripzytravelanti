import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User, SubscriptionTier, UserNotificationPreferences } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deleteUserProfile,
  saveDeal,
  unsaveDeal,
  getDirectReferrals,
  getReferralChain,
  getReferralNetwork,
} from '../lib/supabaseService';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTier: (tier: SubscriptionTier) => Promise<void>;
  updateUserDetails: (details: { name: string; email: string }) => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  saveDealForUser: (dealId: string) => Promise<void>;
  unsaveDealForUser: (dealId: string) => Promise<void>;
  addExtraRedemptions: (userId: string, amount: number) => Promise<void>;
  updateUserNotificationPreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        // Fetch referral data
        const [referrals, referralChain, referralNetwork] = await Promise.all([
          getDirectReferrals(userId),
          getReferralChain(userId),
          getReferralNetwork(userId),
        ]);

        const fullProfile: User = {
          ...profile,
          referrals,
          referralChain,
          referralNetwork,
        };

        setUser(fullProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  // Load all users (for admin)
  useEffect(() => {
    const loadAllUsers = async () => {
      if (user?.isAdmin) {
        const allUsers = await getAllUsers();
        setUsers(allUsers);
      }
    };

    loadAllUsers();
  }, [user?.isAdmin]);

  // Sign up new user
  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          name,
          email,
          tier: SubscriptionTier.FREE,
        });

        if (profileError) throw profileError;

        // Load the new profile
        await loadUserProfile(authData.user.id);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }, [loadUserProfile]);

  // Login user
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }, [loadUserProfile]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }, []);

  // Update subscription tier
  const updateTier = useCallback(async (tier: SubscriptionTier) => {
    if (!user) return;

    try {
      await updateUserProfile(user.id, { tier });
      setUser((currentUser) => (currentUser ? { ...currentUser, tier } : null));

      // Update in users list if admin
      setUsers((currentUsers) =>
        currentUsers.map((u) => (u.id === user.id ? { ...u, tier } : u))
      );
    } catch (error) {
      console.error('Error updating tier:', error);
      throw error;
    }
  }, [user]);

  // Update user details
  const updateUserDetails = useCallback(async (details: { name: string; email: string }) => {
    if (!user) return;

    try {
      await updateUserProfile(user.id, details);
      setUser((currentUser) => (currentUser ? { ...currentUser, ...details } : null));

      // Update in users list if admin
      setUsers((currentUsers) =>
        currentUsers.map((u) => (u.id === user.id ? { ...u, ...details } : u))
      );
    } catch (error) {
      console.error('Error updating user details:', error);
      throw error;
    }
  }, [user]);

  // Update user avatar
  const updateUserAvatar = useCallback(async (avatarUrl: string) => {
    if (!user) return;

    try {
      await updateUserProfile(user.id, { avatar_url: avatarUrl });
      setUser((currentUser) => (currentUser ? { ...currentUser, avatarUrl } : null));

      // Update in users list if admin
      setUsers((currentUsers) =>
        currentUsers.map((u) => (u.id === user.id ? { ...u, avatarUrl } : u))
      );
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
  }, [user]);

  // Update user (for admin)
  const updateUser = useCallback(async (updatedUser: User) => {
    try {
      await updateUserProfile(updatedUser.id, {
        name: updatedUser.name,
        email: updatedUser.email,
        tier: updatedUser.tier,
        avatar_url: updatedUser.avatarUrl,
        extra_redemptions: updatedUser.extraRedemptions,
        notification_preferences: updatedUser.notificationPreferences,
      });

      setUsers((currentUsers) =>
        currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );

      if (user && user.id === updatedUser.id) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [user]);

  // Delete user (for admin)
  const deleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUserProfile(userId);
      setUsers((currentUsers) => currentUsers.filter((u) => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }, []);

  // Save deal for user
  const saveDealForUser = useCallback(async (dealId: string) => {
    if (!user) return;

    try {
      await saveDeal(user.id, dealId);
      setUser((currentUser) => {
        if (!currentUser) return null;
        const newSavedDeals = [...new Set([...(currentUser.savedDeals || []), dealId])];
        const updatedUser = { ...currentUser, savedDeals: newSavedDeals };
        setUsers((currentUsers) =>
          currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
        return updatedUser;
      });
    } catch (error) {
      console.error('Error saving deal:', error);
      throw error;
    }
  }, [user]);

  // Unsave deal for user
  const unsaveDealForUser = useCallback(async (dealId: string) => {
    if (!user) return;

    try {
      await unsaveDeal(user.id, dealId);
      setUser((currentUser) => {
        if (!currentUser) return null;
        const newSavedDeals = (currentUser.savedDeals || []).filter((id) => id !== dealId);
        const updatedUser = { ...currentUser, savedDeals: newSavedDeals };
        setUsers((currentUsers) =>
          currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
        return updatedUser;
      });
    } catch (error) {
      console.error('Error unsaving deal:', error);
      throw error;
    }
  }, [user]);

  // Add extra redemptions
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

      if (user && user.id === userId) {
        setUser((currentUser) =>
          currentUser ? { ...currentUser, extraRedemptions: newRedemptions } : null
        );
      }
    } catch (error) {
      console.error('Error adding extra redemptions:', error);
      throw error;
    }
  }, [users, user]);

  // Update notification preferences
  const updateUserNotificationPreferences = useCallback(async (prefs: Partial<UserNotificationPreferences>) => {
    if (!user) return;

    try {
      const updatedPrefs = {
        ...user.notificationPreferences,
        newDeals: user.notificationPreferences?.newDeals ?? true,
        expiringDeals: user.notificationPreferences?.expiringDeals ?? true,
        ...prefs,
      };

      await updateUserProfile(user.id, { notification_preferences: updatedPrefs });

      setUser((currentUser) =>
        currentUser ? { ...currentUser, notificationPreferences: updatedPrefs } : null
      );

      setUsers((currentUsers) =>
        currentUsers.map((u) =>
          u.id === user.id ? { ...u, notificationPreferences: updatedPrefs } : u
        )
      );
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        loading,
        login,
        signup,
        logout,
        updateTier,
        updateUserDetails,
        updateUserAvatar,
        updateUser,
        deleteUser,
        saveDealForUser,
        unsaveDealForUser,
        addExtraRedemptions,
        updateUserNotificationPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};