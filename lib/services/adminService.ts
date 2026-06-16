import { supabase } from '../supabaseClient';
import { User, Deal } from '../../types';
import { Category } from './dealService';

export async function logAdminAction(payload: {
    action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESET';
    table_name: string;
    record_id: string;
    old_data?: any;
    new_data?: any;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: payload.action_type,
        table_name: payload.table_name,
        record_id: payload.record_id,
        old_data: payload.old_data,
        new_data: payload.new_data
    });
}

export async function updateDealStatus(dealId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
        .from('deals')
        .update({ status })
        .eq('id', dealId);

    if (error) {
        console.error('Error updating deal status:', error);
        throw error;
    }
}

export async function bulkUpdateUserStatus(userIds: string[], status: 'active' | 'banned' | 'suspended') {
    const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .in('id', userIds)
        .select();

    if (error) {
        console.error('Error in bulk update user status:', error);
        throw error;
    }
    return data;
}

// =====================================================
// ANALYTICS OPERATIONS
// =====================================================
export async function getAnalyticsData() {
    try {
        // 1. Fetch Stats via RPCs (Fast & Scalable)
        const { data: stats, error: statsError } = await supabase.rpc('get_admin_stats');
        if (statsError) throw statsError;

        const { data: revenueByMonth, error: revError } = await supabase.rpc('get_revenue_by_month');
        if (revError) throw revError;

        const { data: cityDistribution, error: cityError } = await supabase.rpc('get_city_distribution');
        if (cityError) throw cityError;

        const { data: retentionStats, error: retError } = await supabase.rpc('get_retention_stats');
        if (retError) throw retError;

        const { data: mauTrend, error: mauError } = await supabase.rpc('get_mau_trend');
        if (mauError) throw mauError;

        // 2. We still need some details for secondary charts (Top Deals, Categories)
        // These are harder to RPC purely without complex returns, so we keep them slightly hybrid for now.
        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('id, title, category, vendor');
        if (dealsError) throw dealsError;

        const { data: redemptions, error: redemptionsError } = await supabase
            .from('deal_redemptions')
            .select('deal_id');
        if (redemptionsError) throw redemptionsError;

        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, name, email, tier, created_at')
            .order('created_at', { ascending: false });
        if (usersError) throw usersError;

        // --- Aggregation for complex metrics ---

        // Category distribution
        const categoryCounts: Record<string, number> = {};
        deals.forEach((d: any) => {
            const cat = d.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        // Top Deals
        const redemptionCounts: Record<string, number> = {};
        redemptions.forEach((r: any) => {
            redemptionCounts[r.deal_id] = (redemptionCounts[r.deal_id] || 0) + 1;
        });
        const topDeals = Object.entries(redemptionCounts)
            .map(([dealId, count]) => {
                const deal = deals.find((d: any) => d.id === dealId);
                return { name: deal ? deal.title : 'Unknown Deal', redemptions: count };
            })
            .sort((a, b) => b.redemptions - a.redemptions)
            .slice(0, 5);

        // Tier Distribution
        const tierCounts: Record<string, number> = {};
        users.forEach((u: any) => {
            const tier = u.tier || 'FREE';
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        const tierData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));

        // Scaling Metrics
        const scalingGoal = 100000;
        const totalUsers = stats.totalUsers || 0;
        const scalingProgress = (totalUsers / scalingGoal) * 100;

        // Growth Velocity (approx from recent users)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const usersLastWeek = users.filter((u: any) => new Date(u.created_at) <= sevenDaysAgo).length;
        const growthVelocity = (totalUsers - usersLastWeek) / 7;

        return {
            metrics: {
                ...stats,
                growthVelocity,
                conversionRate: totalUsers > 0 ? (stats.totalRedemptions / totalUsers) * 100 : 0,
                scalingProgress,
                retention: retentionStats
            },
            charts: {
                revenueData: revenueByMonth.map((r: any) => ({ name: r.month_name, revenue: r.revenue })),
                userGrowthData: [],
                recentUsers: users.slice(0, 5).map((u: any) => ({
                    id: u.id,
                    name: u.name || 'Anonymous',
                    email: u.email,
                    tier: u.tier,
                    joinedAt: u.created_at
                })),
                categoryData,
                topDeals,
                tierData,
                cityData: cityDistribution.map((c: any) => ({ name: c.city_name, value: c.user_count })),
                mauData: mauTrend ? mauTrend.map((m: any) => ({ name: m.month, users: m.active_users })) : [],
                merchantData: [] // Simplified for now
            }
        };

    } catch (error) {
        console.error('[supabaseService] Error fetching analytics data:', error);
        return null;
    }
}

// =====================================================
// COMMUNICATIONS (Announcements & Notifications)
// =====================================================
export async function getActiveAnnouncements() {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching announcements:', error);
        return [];
    }

    return data.map((a: any) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        isActive: a.is_active,
        createdAt: a.created_at,
        endAt: a.end_at
    }));
}

export async function createAnnouncement(announcement: { title: string; message: string; type: string; endAt?: string }) {
    const { data, error } = await supabase
        .from('announcements')
        .insert([{
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            end_at: announcement.endAt
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

// =====================================================
// BACKGROUND IMAGE OPERATIONS
// =====================================================
export interface BackgroundImage {
    id: string;
    url: string;
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    is_active: boolean;
}

export async function getBackgroundImages(timeOfDay?: string): Promise<BackgroundImage[]> {
    let query = supabase
        .from('background_images')
        .select('*')
        .eq('is_active', true);

    if (timeOfDay) {
        query = query.eq('time_of_day', timeOfDay);
    }

    const { data, error } = await query;

    if (error) {
        // Fallback or silent error if table doesn't exist yet
        console.warn('Error fetching background images (table may not exist yet):', error);
        return [];
    }

    return data as BackgroundImage[];
}

export async function uploadBackgroundImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

export async function addBackgroundImage(url: string, timeOfDay: string) {
    const { data, error } = await supabase
        .from('background_images')
        .insert({
            url,
            time_of_day: timeOfDay,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding background image:', error);
        throw error;
    }

    return data;
}

export const updateBackgroundImage = async (id: string, timeOfDay: string) => {
    const { error } = await supabase
        .from('background_images')
        .update({ time_of_day: timeOfDay })
        .eq('id', id);

    if (error) {
        console.error('Error updating background image:', error);
        throw error;
    }
};

export async function deleteBackgroundImage(id: string, url: string) {
    // Delete from DB first
    const { error } = await supabase
        .from('background_images')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting background image record:', error);
        throw error;
    }

    // Try to delete from storage if it's a supabase storage URL
    if (url.includes('storage/v1/object/public/backgrounds/')) {
        const path = url.split('backgrounds/')[1];
        if (path) {
            const { error: storageError } = await supabase.storage
                .from('backgrounds')
                .remove([path]);

            if (storageError) {
                console.warn('Error deleting file from storage (orphan file may remain):', storageError);
            }
        }
    }
}

export interface ActivityLogItem {
    id: string;
    type: 'joined' | 'deal_claimed' | 'deal_redeemed' | 'subscription_payment' | 'deal_unsaved' | 'deal_saved';
    description: string;
    timestamp: string;
    metadata?: any;
}

export async function getUserActivityLog(userId: string): Promise<ActivityLogItem[]> {
    const activities: ActivityLogItem[] = [];

    // 1. Get Profile Creation (Joined)
    const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, name')
        .eq('id', userId)
        .single();

    if (profile) {
        activities.push({
            id: 'join-' + userId,
            type: 'joined',
            description: `User joined the platform`,
            timestamp: profile.created_at
        });
    }

    // 2. Get Deal Claims (Added to Wallet)
    const { data: claims } = await supabase
        .from('user_deals')
        .select(`
            id,
            acquired_at,
            deal:deals(title, title_tr)
        `)
        .eq('user_id', userId);

    if (claims) {
        claims.forEach((claim: any) => {
            const title = claim.deal?.title || 'Unknown Deal';
            activities.push({
                id: claim.id,
                type: 'deal_saved',
                description: `Saved to favorites: ${title}`,
                timestamp: claim.acquired_at
            });
        });
    }

    // 3. Get Redemptions
    const { data: redemptions } = await supabase
        .from('deal_redemptions')
        .select(`
            id,
            redeemed_at,
            deal:deals(title, title_tr)
        `)
        .eq('user_id', userId);

    if (redemptions) {
        redemptions.forEach((r: any) => {
            const title = r.deal?.title || 'Unknown Deal';
            activities.push({
                id: r.id,
                type: 'deal_redeemed',
                description: `Redeemed deal: ${title}`,
                timestamp: r.redeemed_at
            });
        });
    }

    // 4. Get Payments
    const { data: payments } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId);

    if (payments) {
        payments.forEach((p: any) => {
            activities.push({
                id: p.id,
                type: 'subscription_payment',
                description: `Payment of ${p.amount} ${p.currency} (${p.status})`,
                timestamp: p.created_at || new Date().toISOString(), // Fallback if created_at missing in type
                metadata: { status: p.status }
            });
        });
    }

    // Sort by timestamp DESC
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getGlobalActivityLog(limit: number = 20): Promise<ActivityLogItem[]> {
    const activities: ActivityLogItem[] = [];

    // 1. Get New Registrations
    const { data: newUsers } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (newUsers) {
        newUsers.forEach(u => {
            activities.push({
                id: 'join-' + u.id,
                type: 'joined',
                description: `${u.name || 'A new user'} joined the platform`,
                timestamp: u.created_at,
                metadata: { userId: u.id, userName: u.name }
            });
        });
    }

    // 2. Get Deal Redemptions
    const { data: redemptions } = await supabase
        .from('deal_redemptions')
        .select('id, redeemed_at, user_id, profiles:user_id(name), deal:deals(title)')
        .order('redeemed_at', { ascending: false })
        .limit(limit);

    if (redemptions) {
        redemptions.forEach((r: any) => {
            const userName = r.profiles?.name || 'A user';
            const dealTitle = r.deal?.title || 'a deal';
            activities.push({
                id: 'redeem-' + r.id,
                type: 'deal_redeemed',
                description: `${userName} redeemed: ${dealTitle}`,
                timestamp: r.redeemed_at,
                metadata: { userId: r.user_id, userName, dealTitle }
            });
        });
    }

    // 3. Get Recent Payments
    const { data: payments } = await supabase
        .from('payment_transactions')
        .select('id, amount, currency, status, created_at, user_id, profiles:user_id(name)')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (payments) {
        payments.forEach((p: any) => {
            const userName = p.profiles?.name || 'A user';
            activities.push({
                id: 'pay-' + p.id,
                type: 'subscription_payment',
                description: `${userName} paid ${p.amount} ${p.currency}`,
                timestamp: p.created_at,
                metadata: { userId: p.user_id, userName, amount: p.amount }
            });
        });
    }

    // Sort combined by timestamp DESC and slice to the requested limit
    return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
}

/**
 * Send a test notification to a specific user (Admin Debugging)
 */
export async function sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
                userId,
                title: 'Test Notification',
                body: 'This is a test notification from the Admin Panel.',
                data: {
                    type: 'test_notification'
                }
            }
        });

        if (error) {
            console.error('Test notification function error:', error);
            // Try to extract a useful message if it's a known structure
            const msg = error.message || JSON.stringify(error);
            return { success: false, message: `Function Error: ${msg}` };
        }

        // Even if no "error" property on the invocation object, check the data itself if the function returns an error structure
        if (data && data.error) {
            return { success: false, message: `Push Error: ${data.error}` };
        }

        return { success: true, message: 'Test notification sent! Check device.' };
    } catch (error: any) {
        console.error('Test notification failed:', error);
        return { success: false, message: error.message || 'Unknown error occurred' };
    }
}

// =====================================================
// ENGAGEMENT TRACKING (PHASE 1)
// =====================================================
export async function logEngagementEvent(userId: string | undefined, eventType: 'view' | 'click' | 'search' | 'favorite', itemId?: string, metadata: any = {}) {
    // If no user is logged in, we might still want to track anonymous events later, 
    // but for Phase 1, we focus on authenticated users to build profiles.
    if (!userId) return;

    try {
        const { error } = await supabase
            .from('engagement_logs')
            .insert({
                user_id: userId,
                event_type: eventType,
                item_id: itemId,
                metadata: metadata
            });

        if (error) {
            console.error('Error logging engagement event:', error);
        }
    } catch (err) {
        console.error('Failed to log engagement event:', err);
    }
}

export async function getEngagementLogs(userId: string, limit: number = 20) {
    // We fetch logs first, and we'll handle the deal data separately to avoid join errors if FK is missing
    const { data, error } = await supabase
        .from('engagement_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching engagement logs:', error.message);
        return [];
    }
    return data || [];
}

export async function getRetentionStats() {
    const { data, error } = await supabase.rpc('get_retention_stats');
    if (error) {
        console.error('Error fetching retention stats:', error);
        return null;
    }
    return data;
}

export async function getMAUTrend() {
    const { data, error } = await supabase.rpc('get_mau_trend');
    if (error) {
        console.error('Error fetching MAU trend:', error);
        return [];
    }
    return data;
}

