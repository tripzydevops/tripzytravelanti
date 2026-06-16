import { supabase } from '../supabaseClient';
import { User, UserNotificationPreferences } from '../../types';

// =====================================================
// USER PROFILE OPERATIONS
// =====================================================
export async function getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*, deal_redemptions(*)')
        .eq('id', userId)
        .single();

    if (error || !data) {
        if (error) console.error('Error fetching user profile:', error);
        return null;
    }

    return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        isAdmin: data.role === 'admin' || data.is_admin === true,
        tier: data.tier || 'FREE',
        createdAt: data.created_at,
        subscriptionStartDate: data.subscription_start_date,
        walletLimit: data.wallet_limit,
        extraRedemptions: data.extra_redemptions,
        notificationPreferences: data.notification_preferences,
        avatarUrl: data.avatar_url,
        mobile: data.mobile,
        address: data.address,
        billingAddress: data.billing_address,
        status: data.status,
        referredBy: data.referred_by,
        referralCode: data.referral_code,
        points: data.points || 0,
        rank: data.rank,
        totalReferrals: data.total_referrals || 0,
        emailConfirmedAt: data.email_confirmed_at,
        geofenceEnforcementMode: data.geofence_enforcement_mode,
        redemptions: data.deal_redemptions ? data.deal_redemptions.map((r: any) => ({
            id: r.id,
            dealId: r.deal_id,
            userId: r.user_id,
            redeemedAt: r.redeemed_at
        })) : []
    };
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.tier) dbUpdates.tier = updates.tier;
    if (updates.subscriptionStartDate) dbUpdates.subscription_start_date = updates.subscriptionStartDate;
    if (updates.walletLimit !== undefined) dbUpdates.wallet_limit = updates.walletLimit;
    if (updates.notificationPreferences) dbUpdates.notification_preferences = updates.notificationPreferences;
    if (updates.extraRedemptions !== undefined) dbUpdates.extra_redemptions = updates.extraRedemptions;
    if (updates.referredBy) dbUpdates.referred_by = updates.referredBy;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.mobile) dbUpdates.mobile = updates.mobile;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.billingAddress) dbUpdates.billing_address = updates.billingAddress;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
    if (updates.role) dbUpdates.role = updates.role;
    if (updates.geofenceEnforcementMode) dbUpdates.geofence_enforcement_mode = updates.geofenceEnforcementMode;

    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

export async function savePushSubscription(userId: string, subscription: any) {
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: userId,
            endpoint,
            p256dh,
            auth
        }, { onConflict: 'endpoint' });

    if (error) {
        console.error('Error saving push subscription:', error);
        throw error;
    }
}

export async function resetUserHistory(userId: string) {

    // 0. Delete from redemption_logs (Foreign Key to wallet_items)
    // We try/catch or ignore error if table doesn't exist yet (soft dependency)
    try {
        await supabase
            .from('redemption_logs')
            .delete()
            .eq('user_id', userId);
    } catch (e) {
        console.warn('Could not delete from redemption_logs (might not exist)', e);
    }

    // 0.5 Delete from user_deals (Favorites) - Optional but good for clean slate
    await supabase.from('user_deals').delete().eq('user_id', userId);

    // 1. Delete all wallet items
    const { error: walletError } = await supabase
        .from('wallet_items')
        .delete()
        .eq('user_id', userId);

    if (walletError) {
        console.error('Error resetting wallet items:', walletError);
        throw walletError;
    }

    // 2. Delete all redemption history
    const { error: redemptionError } = await supabase
        .from('deal_redemptions')
        .delete()
        .eq('user_id', userId);

    if (redemptionError) {
        console.error('Error resetting redemptions:', redemptionError);
        throw redemptionError;
    }

    return { success: true };
}

export async function deleteUserProfile(userId: string) {
    // 1. Delete associated data (if not handled by cascade)
    // Supabase cascade rules should handle most, but explicit deletion is safer

    // Delete profile (this usually triggers cascade for user_deals, redemptions etc if configured)
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user profile:', error);
        throw error;
    }

    // Auth user deletion requires Admin API (service role). 
    // Client-side can only delete public profile data.
}

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all users:', error);
        return [];
    }

    return data.map((data: any) => ({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        isAdmin: data.role === 'admin' || data.is_admin === true,
        tier: data.tier,
        createdAt: data.created_at,
        subscriptionStartDate: data.subscription_start_date,
        walletLimit: data.wallet_limit,
        extraRedemptions: data.extra_redemptions,
        notificationPreferences: data.notification_preferences,
        avatarUrl: data.avatar_url,
        mobile: data.mobile,
        address: data.address,
        billingAddress: data.billing_address,
        status: data.status,
        referredBy: data.referred_by,
        emailConfirmedAt: data.email_confirmed_at,
        points: data.points || 0,
        rank: data.rank,
        geofenceEnforcementMode: data.geofence_enforcement_mode
    }));
}

export async function getUsersPaginated(page: number, limit: number, filters?: any): Promise<{ users: User[], total: number }> {
    let query = supabase
        .from('profiles')
        .select('*, deal_redemptions(*)', { count: 'exact' });

    if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.tier && filters.tier !== 'All') {
        query = query.eq('tier', filters.tier);
    }

    if (filters?.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';

    query = query.range(from, to).order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, count, error } = await query;

    if (error) {
        console.error('Error fetching paginated users:', error);
        return { users: [], total: 0 };
    }

    const users = data.map((d: any) => ({
        id: d.id,
        email: d.email,
        name: d.name,
        role: d.role,
        isAdmin: d.role === 'admin' || d.is_admin === true,
        tier: d.tier,
        createdAt: d.created_at,
        subscriptionStartDate: d.subscription_start_date,
        walletLimit: d.wallet_limit,
        extraRedemptions: d.extra_redemptions,
        notificationPreferences: d.notification_preferences,
        avatarUrl: d.avatar_url,
        mobile: d.mobile,
        address: d.address,
        billingAddress: d.billing_address,
        status: d.status,
        referredBy: d.referred_by,
        emailConfirmedAt: d.email_confirmed_at,
        points: d.points || 0,
        rank: d.rank,
        geofenceEnforcementMode: d.geofence_enforcement_mode,
        redemptions: d.deal_redemptions ? d.deal_redemptions.map((r: any) => ({
            id: r.id,
            dealId: r.deal_id,
            userId: r.user_id,
            redeemedAt: r.redeemed_at
        })) : []
    }));

    return { users, total: count || 0 };
}

export async function confirmUserEmail(userId: string) {
    // Use the RPC function that has SECURITY DEFINER and can update auth.users
    const { error } = await supabase
        .rpc('admin_confirm_user_email', { target_user_id: userId });

    if (error) {
        console.error('Error confirming user email:', error);
        throw error;
    }
}

export async function updateAllUsersNotificationPreferences(prefs: Partial<UserNotificationPreferences>) {
    // Note: This operation should ideally be done via a database function to be atomic and efficient for all users.
    // Current implementation is a client-side loop which is not scalable for large user bases.
    // For now, we will try to update using a direct update query if RLS permits (Admin).
    // Assuming 'notification_preferences' is a JSONB column.

    // Since we can't easily merge JSONB for ALL rows without a specific postgres function or value,
    // we will rely on a potential RPC or just warn.
    // However, to satisfy the build and basic functionality, if we assume we just want to set a default for everyone:

    console.warn('updateAllUsersNotificationPreferences is not fully implemented for efficient bulk updates.');

    // Placeholder: throwing error or doing nothing might be better than doing it wrong.
    // But let's try to fetch all users and update them (slow but works for small user base of MVP).
    const users = await getAllUsers();
    for (const user of users) {
        const current = user.notificationPreferences || { newDeals: true, expiringDeals: true, generalNotifications: true };
        const newPrefs = { ...current, ...prefs };
        await updateUserProfile(user.id, { notificationPreferences: newPrefs });
    }
}

export async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

export async function getUserNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        createdAt: n.created_at,
        link: n.link
    }));
}

export async function markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) console.error('Error marking notification read:', error);
}

export async function createNotification(notification: { userId: string; title: string; message: string; type: string; link?: string }) {
    const { error } = await supabase
        .from('notifications')
        .insert([{
            user_id: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link
        }]);

    if (error) throw error;
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return `${data.publicUrl}?t=${new Date().getTime()}`;
}

/**
 * Update user's FCM token for push notifications
 */
export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: fcmToken })
        .eq('id', userId);

    if (error) {
        console.error('Error updating FCM token:', error);
    }
}

// =====================================================
// CROSS-PLATFORM USER MAPPING (PHASE 1)
// =====================================================
export async function createExternalUserMapping(
    userId: string,
    externalPlatform: string,
    externalUserId: string,
    metadata: any = {}
): Promise<any> {
    const { data, error } = await supabase
        .from('external_user_mappings')
        .insert({
            user_id: userId,
            external_platform: externalPlatform,
            external_user_id: externalUserId,
            metadata
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating external user mapping:', error);
        throw error;
    }
    return data;
}

export async function getExternalUserMapping(userId: string, externalPlatform: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('external_user_mappings')
        .select('*')
        .eq('user_id', userId)
        .eq('external_platform', externalPlatform)
        .maybeSingle();

    if (error) {
        console.error('Error fetching external user mapping:', error);
        throw error;
    }
    return data;
}

export async function getUserByExternalId(externalPlatform: string, externalUserId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('external_user_mappings')
        .select('user_id, profiles(*)')
        .eq('external_platform', externalPlatform)
        .eq('external_user_id', externalUserId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user by external ID:', error);
        throw error;
    }
    return data ? { ...data.profiles, userId: data.user_id } : null;
}

export async function deleteExternalUserMapping(userId: string, externalPlatform: string): Promise<boolean> {
    const { error } = await supabase
        .from('external_user_mappings')
        .delete()
        .eq('user_id', userId)
        .eq('external_platform', externalPlatform);

    if (error) {
        console.error('Error deleting external user mapping:', error);
        throw error;
    }
    return true;
}

