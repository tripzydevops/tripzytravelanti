import { supabase } from '../supabaseClient';

// =====================================================
// GEOFENCE ZONE MANAGEMENT (PHASE 6)
// =====================================================
export async function getGeofenceZones(partnerId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching geofence zones:', error);
        return [];
    }
    return data || [];
}

export async function saveGeofenceZone(zoneData: {
    partner_id: string;
    deal_id?: string;
    name: string;
    radius_meters: number;
    centroid_lat: number;
    centroid_lng: number;
    is_active?: boolean;
}): Promise<any> {
    const { data, error } = await supabase
        .from('geofence_zones')
        .insert({
            partner_id: zoneData.partner_id,
            deal_id: zoneData.deal_id || null,
            name: zoneData.name,
            radius_meters: zoneData.radius_meters,
            centroid: `POINT(${zoneData.centroid_lng} ${zoneData.centroid_lat})`,
            zone: `POINT(${zoneData.centroid_lng} ${zoneData.centroid_lat})`, // Will be overridden by trigger if polygon is needed
            is_active: zoneData.is_active ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving geofence zone:', error);
        throw error;
    }
    return data;
}

export async function deleteGeofenceZone(zoneId: string): Promise<void> {
    const { error } = await supabase
        .from('geofence_zones')
        .delete()
        .eq('id', zoneId);

    if (error) {
        console.error('Error deleting geofence zone:', error);
        throw error;
    }
}

export async function toggleGeofenceZone(zoneId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
        .from('geofence_zones')
        .update({ is_active: isActive })
        .eq('id', zoneId);

    if (error) {
        console.error('Error toggling geofence zone:', error);
        throw error;
    }
}

