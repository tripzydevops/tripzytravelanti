// supabase/functions/validate-qr-token/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
    walletItemId: string;
    token: string;
    vendorLatitude?: number;
    vendorLongitude?: number;
    vendorDeviceId?: string;
}

// SHA-256 helper
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Haversine formula for coordinate distance calculation (fallback)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Initialize service client for database queries bypassing user boundaries
        const supabaseService = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Authenticate the user (vendor/partner/admin)
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized vendor session' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Verify user role: partner, vendor, or admin
        const { data: profile, error: profileError } = await supabaseService
            .from('profiles')
            .select('role, is_admin, geofence_enforcement_mode')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return new Response(JSON.stringify({ error: 'Vendor profile not found' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const isAuthorized = ['vendor', 'partner', 'admin'].includes(profile.role || '') || profile.is_admin === true;
        if (!isAuthorized) {
            return new Response(JSON.stringify({ error: 'Forbidden: Unauthorized role' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse body params
        const { 
            walletItemId, 
            token, 
            vendorLatitude, 
            vendorLongitude, 
            vendorDeviceId 
        } = await req.json() as RequestBody;

        if (!walletItemId || !token) {
            return new Response(JSON.stringify({ error: 'Missing walletItemId or token' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const tokenHash = await sha256(token);
        const now = new Date().toISOString();

        // 1. Fetch Token from Database
        const { data: qrToken, error: tokenError } = await supabaseService
            .from('qr_tokens')
            .select('*')
            .eq('wallet_item_id', walletItemId)
            .eq('token_hash', tokenHash)
            .maybeSingle();

        // Security Helper to Log Scan Failure Event
        const logFailure = async (resultType: 'invalid_code' | 'expired_token' | 'already_redeemed' | 'geo_mismatch') => {
            await supabaseService.from('qr_scan_events').insert({
                wallet_item_id: walletItemId,
                qr_token_id: qrToken?.id || null,
                vendor_id: user.id,
                scan_latitude: vendorLatitude || null,
                scan_longitude: vendorLongitude || null,
                scan_method: 'qr_scan',
                scan_result: resultType,
                raw_scanned_payload: JSON.stringify({ walletItemId, token }),
                vendor_device_id: vendorDeviceId || null
            });
        };

        if (tokenError || !qrToken) {
            await logFailure('invalid_code');
            return new Response(JSON.stringify({ error: 'Invalid QR code token' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Verify Token Expiration
        if (new Date(qrToken.expires_at) < new Date()) {
            await logFailure('expired_token');
            return new Response(JSON.stringify({ error: 'QR code has expired. Please refresh the QR code.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. Verify Replay Attack (Double Use)
        if (qrToken.used_at) {
            await logFailure('already_redeemed');
            return new Response(JSON.stringify({ error: 'This QR code has already been scanned and redeemed.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. Fetch Wallet Item Status
        const { data: walletItem, error: walletError } = await supabaseService
            .from('wallet_items')
            .select('id, status, redemption_code, deal_id, user_id')
            .eq('id', walletItemId)
            .single();

        if (walletError || !walletItem) {
            await logFailure('invalid_code');
            return new Response(JSON.stringify({ error: 'Wallet item not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (walletItem.status !== 'active') {
            await logFailure('already_redeemed');
            return new Response(JSON.stringify({ error: `This deal status is ${walletItem.status}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Fetch associated deal details for geofencing check
        const { data: deal, error: dealError } = await supabaseService
            .from('deals')
            .select('id, latitude, longitude, store_locations, partner_id')
            .eq('id', walletItem.deal_id)
            .single();

        if (dealError || !deal) {
            return new Response(JSON.stringify({ error: 'Associated deal not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. Geofence Verification Check (Only if coordinates are supplied by vendor app)
        if (vendorLatitude !== undefined && vendorLongitude !== undefined) {
            // A. PostGIS Check
            const { data: geoResult, error: geoError } = await supabaseService.rpc('check_geofence', {
                p_deal_id: deal.id,
                p_lat: vendorLatitude,
                p_lng: vendorLongitude
            });

            let isGeoValid = true;
            let matchedZoneId = null;
            let distanceMeters = null;

            if (!geoError && geoResult && !geoResult.no_geofences_defined) {
                isGeoValid = geoResult.is_within;
                matchedZoneId = geoResult.zone_id;
                distanceMeters = geoResult.distance;
            } else {
                // B. Fallback to Deno-side Haversine Check (if no PostGIS zones)
                const locations = [];
                
                // Add deal centroid
                if (deal.latitude !== null && deal.longitude !== null) {
                    locations.push({ lat: deal.latitude, lng: deal.longitude });
                }

                // Add store_locations JSON list
                if (deal.store_locations && Array.isArray(deal.store_locations)) {
                    for (const loc of deal.store_locations) {
                        if (loc.latitude !== undefined && loc.longitude !== undefined) {
                            locations.push({ lat: loc.latitude, lng: loc.longitude });
                        }
                    }
                }

                if (locations.length > 0) {
                    let minDistance = Infinity;
                    for (const loc of locations) {
                        const dist = haversineDistance(vendorLatitude, vendorLongitude, loc.lat, loc.lng);
                        if (dist < minDistance) {
                            minDistance = dist;
                        }
                    }

                    distanceMeters = minDistance;
                    // Strict geofence limit: 500 meters
                    if (minDistance > 500) {
                        isGeoValid = false;
                    }
                }
            }

            // Log validation results
            await supabaseService.from('geo_validation_events').insert({
                user_id: walletItem.user_id,
                deal_id: deal.id,
                geofence_zone_id: matchedZoneId,
                user_latitude: vendorLatitude,
                user_longitude: vendorLongitude,
                distance_meters: distanceMeters,
                is_within_bounds: isGeoValid
            });

            if (!isGeoValid) {
                const enforcementMode = profile?.geofence_enforcement_mode || 'off';

                if (enforcementMode === 'hard_block') {
                    await logFailure('geo_mismatch');
                    return new Response(JSON.stringify({ 
                        error: 'Redemption Denied: Location verification failed. You must be at the physical merchant venue to redeem this deal.' 
                    }), {
                        status: 400,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } else if (enforcementMode === 'soft_warning') {
                    // Log the failure to scan events and raise a fraud signal, but let redemption proceed
                    await logFailure('geo_mismatch');

                    await supabaseService.from('fraud_signals').insert({
                        user_id: walletItem.user_id,
                        vendor_id: user.id,
                        wallet_item_id: walletItem.id,
                        signal_type: 'geo_mismatch_warning',
                        severity: 'medium',
                        details: {
                            distance_meters: distanceMeters,
                            vendor_latitude: vendorLatitude,
                            vendor_longitude: vendorLongitude
                        },
                        is_resolved: false
                    });
                }
            }
        }

        // 6. Complete Redemption Atomically via validate_redemption RPC
        const { data: redemptionData, error: redemptionError } = await supabaseService.rpc('validate_redemption', {
            p_wallet_item_id: walletItem.id,
            p_redemption_code: walletItem.redemption_code,
            p_vendor_id: user.id
        });

        if (redemptionError || !redemptionData?.success) {
            console.error('validate_redemption RPC execution failed:', redemptionError || redemptionData?.message);
            return new Response(JSON.stringify({ error: redemptionData?.message || 'Redemption execution failed' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Update token used status
        await supabaseService
            .from('qr_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', qrToken.id);

        // Update wallet_item columns (token ID, redemption coordinates)
        await supabaseService
            .from('wallet_items')
            .update({
                claimed_latitude: vendorLatitude || null,
                claimed_longitude: vendorLongitude || null
            })
            .eq('id', walletItem.id);

        // 7. Log Success Scan Event
        await supabaseService.from('qr_scan_events').insert({
            wallet_item_id: walletItem.id,
            qr_token_id: qrToken.id,
            vendor_id: user.id,
            scan_latitude: vendorLatitude || null,
            scan_longitude: vendorLongitude || null,
            scan_method: 'qr_scan',
            scan_result: 'success',
            vendor_device_id: vendorDeviceId || null
        });

        return new Response(
            JSON.stringify(redemptionData),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('validate-qr-token failed:', err);
        return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
