import { supabase } from './supabaseClient';
import { 
    createExternalUserMapping, 
    getExternalUserMapping, 
    getUserByExternalId, 
    addUserPoints,
    burnUserPoints
} from './supabaseService';

const QR_MENU_PLATFORM_KEY = 'qr_menu_saas';

/**
 * Interface representing a QR Menu Loyalty Account representation
 */
export interface QRMenuLoyaltyAccount {
  id: string;
  phone: string;
  name?: string;
  points: number;
  externalUserId?: string;
  venueId: string;
}

/**
 * Link a Tripzy user profile with a QR Menu SaaS loyalty account.
 * This establishes the bi-directional mapping.
 * 
 * @param tripzyUserId The UUID of the Tripzy user profile
 * @param qrMenuLoyaltyPhone The phone number used in the QR Menu Loyalty Account
 * @param qrMenuLoyaltyId The unique ID of the QR Menu Loyalty Account
 * @param metadata Additional metadata to store
 */
export async function linkLoyaltyAccount(
    tripzyUserId: string,
    qrMenuLoyaltyPhone: string,
    qrMenuLoyaltyId: string,
    metadata: any = {}
): Promise<{ success: boolean; mapping?: any; message?: string }> {
    try {
        // 1. Create mapping in Tripzy database
        const mapping = await createExternalUserMapping(
            tripzyUserId,
            QR_MENU_PLATFORM_KEY,
            qrMenuLoyaltyId,
            {
                phone: qrMenuLoyaltyPhone,
                linkedAt: new Date().toISOString(),
                ...metadata
            }
        );

        // 2. Fetch current points to check if we should do initial synchronization
        // Generally, we sync points on link: Tripzy Points + QR Menu Points
        const { data: tripzyProfile } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', tripzyUserId)
            .single();

        const currentTripzyPoints = tripzyProfile?.points || 0;

        return {
            success: true,
            mapping,
            message: `Loyalty account linked successfully. Base balance: ${currentTripzyPoints} points.`
        };
    } catch (error: any) {
        console.error('Failed to link loyalty account:', error);
        return {
            success: false,
            message: error.message || 'Error creating linkage'
        };
    }
}

/**
 * Synchronize points earned or burned in QR Menu SaaS into Tripzy's double-entry ledger.
 * This is usually called by a webhook or API endpoint from the QR Menu SaaS platform.
 * 
 * @param qrMenuLoyaltyId The ID of the QR Menu Loyalty Account
 * @param deltaPoints The change in points (positive for earn, negative for burn)
 * @param reason The reason for the change (e.g. "Order #1234 in Venue X")
 * @param referenceId The reference UUID/String from QR Menu (e.g. order ID)
 */
export async function syncPointsFromQRMenu(
    qrMenuLoyaltyId: string,
    deltaPoints: number,
    reason: string,
    referenceId?: string
): Promise<{ success: boolean; currentBalance?: number; message?: string }> {
    try {
        // 1. Find the linked Tripzy user
        const tripzyUser = await getUserByExternalId(QR_MENU_PLATFORM_KEY, qrMenuLoyaltyId);
        if (!tripzyUser) {
            return {
                success: false,
                message: 'No Tripzy user linked to this QR Menu loyalty account'
            };
        }

        const userId = tripzyUser.id || tripzyUser.userId;
        let newBalance = 0;

        // 2. Insert into Tripzy's double-entry ledger
        if (deltaPoints > 0) {
            newBalance = await addUserPoints(
                userId,
                deltaPoints,
                'earn_campaign', // Syncing from external platform
                'qr_menu_order',
                undefined, // reference_id in DB is UUID, referenceId from QR Menu might be string. We store it in metadata.
                undefined,
                {
                    qrMenuLoyaltyId,
                    reason,
                    qrMenuReferenceId: referenceId
                }
            );
        } else if (deltaPoints < 0) {
            newBalance = await burnUserPoints(
                userId,
                Math.abs(deltaPoints),
                'burn_reward',
                'qr_menu_order',
                undefined,
                {
                    qrMenuLoyaltyId,
                    reason,
                    qrMenuReferenceId: referenceId
                }
            );
        } else {
            // No change
            const { data: profile } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', userId)
                .single();
            newBalance = profile?.points || 0;
        }

        return {
            success: true,
            currentBalance: newBalance,
            message: `Synchronized ${deltaPoints} points. New Tripzy balance: ${newBalance}.`
        };
    } catch (error: any) {
        console.error('Failed to sync points from QR Menu:', error);
        return {
            success: false,
            message: error.message || 'Error synchronizing points ledger'
        };
    }
}

/**
 * Propagate a points change from Tripzy to the linked QR Menu SaaS account.
 * (Placeholder for outbound HTTP API/Webhook call to QR Menu SaaS)
 * 
 * @param tripzyUserId The UUID of the Tripzy user
 * @param deltaPoints The points difference
 * @param reason Reason description
 */
export async function propagatePointsToQRMenu(
    tripzyUserId: string,
    deltaPoints: number,
    reason: string
): Promise<boolean> {
    try {
        const mapping = await getExternalUserMapping(tripzyUserId, QR_MENU_PLATFORM_KEY);
        if (!mapping) {
            // No link, nothing to propagate
            return false;
        }

        const qrMenuLoyaltyId = mapping.external_user_id;

        // In production, this would make an outbound fetch request to the QR Menu SaaS API:
        // POST /api/loyalty/sync
        // Body: { loyaltyId: qrMenuLoyaltyId, delta: deltaPoints, reason: reason }
        
        console.log(`[Cross-Platform Sync] Outbound propagation: Sync ${deltaPoints} points to QR Menu Loyalty ID ${qrMenuLoyaltyId}. Reason: ${reason}`);
        
        // Simulating success
        return true;
    } catch (error) {
        console.error('Failed to propagate points to QR Menu:', error);
        return false;
    }
}
