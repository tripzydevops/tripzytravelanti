import { User as SupabaseUser } from '@supabase/supabase-js';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User, SubscriptionTier, UserNotificationPreferences } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  getUserProfile,
  updateUserProfile,
  getDirectReferrals,
  getReferralChain,
  getReferralNetwork,
  updatePassword,
  deleteUserProfile,
  redeemDeal as redeemDealService,
} from '../lib/supabaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, referredBy?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTier: (tier: SubscriptionTier) => Promise<void>;
  updateUserDetails: (details: { name: string; email: string; mobile?: string; address?: string; billingAddress?: string; referredBy?: string }) => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateUserNotificationPreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  redeemDeal: (dealId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      let profile = await getUserProfile(authUser.id);

      if (!profile) {
        // Trigger might be slow, so we retry fetching a few times
        // We do NOT insert from client-side anymore to avoid RLS/Permission issues.
        let retries = 3;
        while (!profile && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
          profile = await getUserProfile(authUser.id);
          retries--;
        }

        if (!profile) {
          console.warn('Profile not found after retries. Attempting client-side creation...');
          try {
            // Fallback: Create profile client-side if trigger failed
            const { error: insertError } = await supabase.from('profiles').insert({
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.full_name || authUser.email,
              avatar_url: authUser.user_metadata?.avatar_url,
              tier: 'FREE',
              referred_by: authUser.user_metadata?.referred_by
            });

            if (!insertError) {
              profile = await getUserProfile(authUser.id);
            } else {
              console.error('Failed to create profile client-side:', insertError);
            }
          } catch (e) {
            console.error('Error in client-side profile creation:', e);
          }
        }
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


  // Sign up new user
  const signup = useCallback(async (email: string, password: string, name: string, referredBy?: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            referred_by: referredBy || null,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
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

  // Delete account (self)
  const deleteAccount = useCallback(async () => {
    if (!user) return;
    try {
      await deleteUserProfile(user.id);
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }, [user, logout]);

  // Update subscription tier
  const updateTier = useCallback(async (tier: SubscriptionTier) => {
    if (!user) return;

    try {
      await updateUserProfile(user.id, { tier });
      setUser((currentUser) => (currentUser ? { ...currentUser, tier } : null));
    } catch (error) {
      console.error('Error updating tier:', error);
      throw error;
    }
  }, [user]);

  // Update user details
  const updateUserDetails = useCallback(async (details: { name: string; email: string; mobile?: string; address?: string; billingAddress?: string; referredBy?: string }) => {
    if (!user) return;
    try {
      await updateUserProfile(user.id, {
        name: details.name,
        email: details.email,
        mobile: details.mobile,
        address: details.address,
        billing_address: details.billingAddress,
        referred_by: details.referredBy,
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
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw error;
    }
  }, [user]);

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
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }, [user]);

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

  // Redeem a deal
  const redeemDeal = useCallback(async (dealId: string) => {
    if (!user) return;
    try {
      const redemption = await redeemDealService(user.id, dealId);

      // Update local state
      setUser(currentUser => {
        if (!currentUser) return null;
        const currentRedemptions = currentUser.redemptions || [];
        return {
          ...currentUser,
          redemptions: [...currentRedemptions, redemption]
        };
      });
    } catch (error) {
      console.error('Error redeeming deal:', error);
      throw error;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateTier,
        updateUserDetails,
        updateUserAvatar,
        signInWithGoogle,
        updatePassword: handleUpdatePassword,
        updateUserNotificationPreferences,
        redeemDeal,
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