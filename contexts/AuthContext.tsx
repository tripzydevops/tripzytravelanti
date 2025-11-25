import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { User, SubscriptionTier, UserNotificationPreferences } from '../types';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (user: User) => void;
  logout: () => void;
  updateTier: (tier: SubscriptionTier) => void;
  updateUserDetails: (details: { name: string; email: string }) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  saveDealForUser: (dealId: string) => void;
  unsaveDealForUser: (dealId: string) => void;
  addExtraRedemptions: (userId: string, amount: number) => void;
  updateUserNotificationPreferences: (prefs: Partial<UserNotificationPreferences>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data
const mockUsers: User[] = [
  {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@tripzy.com',
    tier: SubscriptionTier.VIP,
    isAdmin: true,
    savedDeals: ['3', '6'],
    avatarUrl: 'https://i.pravatar.cc/150?u=admin@tripzy.com',
    referrals: ['user-001'],
    referralChain: [],
    referralNetwork: ['user-001', 'user-002'],
    extraRedemptions: 5,
    notificationPreferences: {
      newDeals: true,
      expiringDeals: true,
    },
  },
  {
    id: 'user-001',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    tier: SubscriptionTier.PREMIUM,
    savedDeals: ['1', '2', '4'],
    referredBy: 'admin-001',
    referrals: ['user-002'],
    referralChain: ['admin-001'],
    referralNetwork: ['user-002'],
    extraRedemptions: 0,
    notificationPreferences: {
      newDeals: true,
      expiringDeals: true,
    },
  },
  {
    id: 'user-002',
    name: 'Bob Smith',
    email: 'bob@example.com',
    tier: SubscriptionTier.BASIC,
    savedDeals: [],
    referredBy: 'user-001',
    referrals: [],
    referralChain: ['admin-001', 'user-001'],
    referralNetwork: [],
    extraRedemptions: 0,
    notificationPreferences: {
      newDeals: false,
      expiringDeals: true,
    },
  },
  {
    id: 'user-003',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    tier: SubscriptionTier.FREE,
    savedDeals: ['5'],
    referralChain: [],
    referralNetwork: [],
    extraRedemptions: 10,
    notificationPreferences: {
      newDeals: true,
      expiringDeals: false,
    },
  },
];


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockUsers[0]); // Log in admin by default
  const [users, setUsers] = useState<User[]>(mockUsers);

  const login = useCallback((userData: User) => {
    // This is a mock login. It finds a user by email from our mock list.
    const foundUser = users.find(u => u.email === userData.email)
    if (foundUser) {
        setUser(foundUser);
    } else {
        // If user not in list (e.g., social login), just set them as current user
        // but don't add to the manageable list for this demo.
        setUser(userData);
    }
  }, [users]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateTier = useCallback((tier: SubscriptionTier) => {
    setUser((currentUser) => {
      if (currentUser) {
        const updatedUser = { ...currentUser, tier };
        // also update in the main users list
        setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        return updatedUser;
      }
      return null;
    });
  }, []);

  const updateUserDetails = useCallback((details: { name: string; email: string }) => {
    setUser((currentUser) => {
      if (currentUser) {
        const updatedUser = { ...currentUser, ...details };
        // also update in the main users list
        setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        return updatedUser;
      }
      return null;
    });
  }, []);

  const updateUserAvatar = useCallback((avatarUrl: string) => {
    setUser((currentUser) => {
      if (currentUser) {
        const updatedUser = { ...currentUser, avatarUrl };
        setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        return updatedUser;
      }
      return null;
    });
  }, []);


  // For Admin
  const updateUser = useCallback((updatedUser: User) => {
    setUsers(currentUsers =>
      currentUsers.map(u => (u.id === updatedUser.id ? updatedUser : u))
    );
    if (user && user.id === updatedUser.id) {
        setUser(updatedUser);
    }
  }, [user]);

  const deleteUser = useCallback((userId: string) => {
    setUsers(currentUsers => currentUsers.filter(u => u.id !== userId));
  }, []);

  const saveDealForUser = useCallback((dealId: string) => {
    setUser((currentUser) => {
      if (!currentUser) return null;
      const newSavedDeals = [...new Set([...(currentUser.savedDeals || []), dealId])];
      const updatedUser = { ...currentUser, savedDeals: newSavedDeals };
      setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
      return updatedUser;
    });
  }, []);

  const unsaveDealForUser = useCallback((dealId: string) => {
    setUser((currentUser) => {
      if (!currentUser) return null;
      const newSavedDeals = (currentUser.savedDeals || []).filter(id => id !== dealId);
      const updatedUser = { ...currentUser, savedDeals: newSavedDeals };
      setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
      return updatedUser;
    });
  }, []);
  
  const addExtraRedemptions = useCallback((userId: string, amount: number) => {
    setUsers(currentUsers => {
        const newUsers = currentUsers.map(u => {
            if (u.id === userId) {
                const updatedUser = {
                    ...u,
                    extraRedemptions: (u.extraRedemptions || 0) + amount,
                };
                // If the updated user is the currently logged-in user, update the user state as well
                if (user && user.id === userId) {
                    setUser(updatedUser);
                }
                return updatedUser;
            }
            return u;
        });
        return newUsers;
    });
}, [user]);

  const updateUserNotificationPreferences = useCallback((prefs: Partial<UserNotificationPreferences>) => {
    setUser(currentUser => {
        if (!currentUser) return null;
        const updatedUser = {
            ...currentUser,
            notificationPreferences: {
                ...currentUser.notificationPreferences,
                newDeals: currentUser.notificationPreferences?.newDeals ?? true,
                expiringDeals: currentUser.notificationPreferences?.expiringDeals ?? true,
                ...prefs,
            }
        };
        setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
        return updatedUser;
    });
  }, []);


  return (
    <AuthContext.Provider value={{ user, users, login, logout, updateTier, updateUserDetails, updateUserAvatar, updateUser, deleteUser, saveDealForUser, unsaveDealForUser, addExtraRedemptions, updateUserNotificationPreferences }}>
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