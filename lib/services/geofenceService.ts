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
    const lat = zoneData.centroid_lat;
    const lng = zoneData.centroid_lng;
    const r = zoneData.radius_meters;

    // Convert circular radius in meters to a bounding square Polygon in WKT coordinates
    // 1 degree of latitude is approximately 111,000 meters
    const dLat = r / 111000;
    // 1 degree of longitude is approximately 111,000 * cos(latitude) meters
    const dLng = r / (111000 * Math.cos(lat * Math.PI / 180));

    const polygonWKT = `POLYGON((` +
        `${lng - dLng} ${lat - dLat}, ` +
        `${lng + dLng} ${lat - dLat}, ` +
        `${lng + dLng} ${lat + dLat}, ` +
        `${lng - dLng} ${lat + dLat}, ` +
        `${lng - dLng} ${lat - dLat}` +
        `))`;

    const { data, error } = await supabase
        .from('geofence_zones')
        .insert({
            partner_id: zoneData.partner_id,
            deal_id: zoneData.deal_id || null,
            name: zoneData.name,
            radius_meters: zoneData.radius_meters,
            centroid: `POINT(${lng} ${lat})`,
            zone: polygonWKT,
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

export async function getAllActiveGeofenceZones(): Promise<any[]> {
    const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching all active geofence zones:', error);
        return [];
    }
    return data || [];
}
