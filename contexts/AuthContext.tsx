import { User as SupabaseUser } from '@supabase/supabase-js';

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
  redeemDeal,
  updatePassword,
} from '../lib/supabaseService';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTier: (tier: SubscriptionTier) => Promise<void>;
  updateUserDetails: (details: { name: string; email: string; mobile?: string; address?: string; billingAddress?: string }) => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  saveDealForUser: (dealId: string) => Promise<void>;
  unsaveDealForUser: (dealId: string) => Promise<void>;
  redeemDeal: (dealId: string) => Promise<void>;
  addExtraRedemptions: (userId: string, amount: number) => Promise<void>;
  updateUserNotificationPreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
  updateAllUsersNotificationPreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      let profile = await getUserProfile(authUser.id);

      if (!profile) {

        // Create profile if it doesn't exist (e.g. first time OAuth login)
        const { error } = await supabase.from('profiles').insert({
          id: authUser.id,
          name: authUser.user_metadata.full_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email,
          tier: SubscriptionTier.FREE,
          avatar_url: authUser.user_metadata.avatar_url,
          role: 'user',
        });

        if (error) {
          // If error is duplicate key (23505), it means profile already exists, so we can proceed.
          // Otherwise, report the error.
          if (error.code !== '23505') {
            console.error('Error creating profile:', error);
            // Don't block execution with alert
            return;
          }
        }

        // Fetch the newly created profile
        profile = await getUserProfile(authUser.id);
      }

      if (profile) {
        // Fetch referral data
        const [referrals, referralChain, referralNetwork] = await Promise.all([
          getDirectReferrals(authUser.id),
          getReferralChain(authUser.id),
          getReferralNetwork(authUser.id),
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
    let mounted = true;

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth loading timed out, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          await loadUserProfile(session.user);
        } catch (err) {
          console.error('Error loading profile in initial session:', err);
        }
      }
      if (mounted) {
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    }).catch(err => {
      console.error('Error getting session:', err);
      if (mounted) {
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // We don't await here to avoid blocking UI updates on auth change events
        loadUserProfile(session.user).catch(console.error);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Load all users if admin
  useEffect(() => {
    if (user?.isAdmin) {
      getAllUsers().then(setUsers).catch(console.error);
    }
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
        await loadUserProfile(authData.user);
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
        await loadUserProfile(data.user);
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
  const updateUserDetails = useCallback(async (details: { name: string; email: string; mobile?: string; address?: string; billingAddress?: string }) => {
    if (!user) return;
    try {
      await updateUserProfile(user.id, {
        name: details.name,
        email: details.email,
        mobile: details.mobile,
        address: details.address,
        billing_address: details.billingAddress,
      });
      setUser((currentUser) => (currentUser ? { ...currentUser, ...details } : null));
    } catch (error) {
      console.error('Error updating user details:', error);
      throw error;
    }
  }, [user]);

  const handleUpdatePassword = useCallback(async (password: string) => {
    try {
      await updatePassword(password);
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }, []);

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
        mobile: updatedUser.mobile,
        status: updatedUser.status,
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

  // Redeem deal
  const handleRedeemDeal = useCallback(async (dealId: string) => {
    if (!user) return;

    try {
      await redeemDeal(user.id, dealId);

      // Update local state
      const newRedemption = {
        id: crypto.randomUUID(), // Temporary ID until refresh
        dealId,
        userId: user.id,
        redeemedAt: new Date().toISOString()
      };

      setUser((currentUser) => {
        if (!currentUser) return null;
        const updatedRedemptions = [...(currentUser.redemptions || []), newRedemption];
        const updatedUser = { ...currentUser, redemptions: updatedRedemptions };

        // Update in users list if admin
        setUsers((currentUsers) =>
          currentUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );

        return updatedUser;
      });

    } catch (error) {
      console.error('Error redeeming deal:', error);
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
        generalNotifications: user.notificationPreferences?.generalNotifications ?? true,
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

  // Update notification preferences for all users (admin only)
  const updateAllUsersNotificationPreferences = useCallback(async (prefs: Partial<UserNotificationPreferences>) => {
    if (!user?.isAdmin) return;

    try {
      // In a real app, this should be a backend function or edge function to avoid N requests
      // For now, we'll iterate through all users
      const updates = users.map(async (u) => {
        const updatedPrefs = {
          ...u.notificationPreferences,
          newDeals: u.notificationPreferences?.newDeals ?? true,
          expiringDeals: u.notificationPreferences?.expiringDeals ?? true,
          generalNotifications: u.notificationPreferences?.generalNotifications ?? true,
          ...prefs,
        };

        await updateUserProfile(u.id, { notification_preferences: updatedPrefs });
        return { id: u.id, prefs: updatedPrefs };
      });

      const results = await Promise.all(updates);

      setUsers((currentUsers) =>
        currentUsers.map((u) => {
          const update = results.find(r => r.id === u.id);
          return update ? { ...u, notificationPreferences: update.prefs } : u;
        })
      );

      // Also update current user if they are in the list
      if (results.find(r => r.id === user.id)) {
        setUser(prev => prev ? { ...prev, notificationPreferences: results.find(r => r.id === user.id)!.prefs } : null);
      }

    } catch (error) {
      console.error('Error updating all users notification preferences:', error);
      throw error;
    }
  }, [user, users]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;


      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  }, []);

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
        redeemDeal: handleRedeemDeal,
        addExtraRedemptions,
        updateUserNotificationPreferences,
        updateAllUsersNotificationPreferences,
        signInWithGoogle,
        updatePassword: handleUpdatePassword,
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