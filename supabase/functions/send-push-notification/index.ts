// supabase/functions/send-push-notification/index.ts
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushRequest {
    userId: string
    title: string
    body: string
    data?: Record<string, string>
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { userId, title, body, data } = await req.json() as PushRequest

        if (!userId || !title || !body) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get user's FCM token
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('fcm_token')
            .eq('id', userId)
            .single()

        if (profileError || !profile?.fcm_token) {
            return new Response(
                JSON.stringify({ error: 'User FCM token not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get Firebase service account from env
        const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
        console.log(`[Push] Service Account Env Var present: ${!!serviceAccountStr}`);

        if (!serviceAccountStr) {
            console.error('[Push] Missing FIREBASE_SERVICE_ACCOUNT');
            return new Response(
                JSON.stringify({ error: 'Missing FIREBASE_SERVICE_ACCOUNT env var' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        let firebaseServiceAccount;
        try {
            firebaseServiceAccount = JSON.parse(serviceAccountStr);
        } catch (e) {
            console.error('[Push] Failed to parse service account JSON', e);
            return new Response(
                JSON.stringify({ error: 'Invalid JSON in FIREBASE_SERVICE_ACCOUNT' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!firebaseServiceAccount.project_id) {
            console.error('[Push] Service account missing project_id');
            return new Response(
                JSON.stringify({ error: 'Firebase config missing project_id' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }


        // Get access token for FCM
        const accessToken = await getAccessToken(firebaseServiceAccount)

        // Send FCM message
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseServiceAccount.project_id}/messages:send`

        const fcmResponse = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: {
                    token: profile.fcm_token,
                    notification: {
                        title,
                        body,
                    },
                    data: data || {},
                    android: {
                        priority: 'high',
                        notification: {
                            channelId: 'redemption_confirmations',
                            sound: 'default',
                        },
                    },
                },
            }),
        })

        const fcmResult = await fcmResponse.json()

        if (!fcmResponse.ok) {
            console.error('FCM Error:', fcmResult)
            return new Response(
                JSON.stringify({ error: 'Failed to send push notification', details: fcmResult }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: true, messageId: fcmResult.name }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

/**
 * Get OAuth2 access token for FCM using service account
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const expiry = now + 3600 // 1 hour

    // Create JWT header and claims
    const header = { alg: 'RS256', typ: 'JWT' }
    const claims = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: expiry,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }

    // Encode header and claims
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const encodedClaims = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const signatureInput = `${encodedHeader}.${encodedClaims}`

    // Sign with private key
    const key = await crypto.subtle.importKey(
        'pkcs8',
        pemToBinary(serviceAccount.private_key),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput))
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

    const jwt = `${signatureInput}.${encodedSignature}`

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })

    const tokenData = await tokenResponse.json()
    return tokenData.access_token
}

/**
 * Convert PEM private key to binary
 */
function pemToBinary(pem: string): ArrayBuffer {
    const lines = pem.split('\n')
    const encoded = lines.filter(line => !line.includes('-----')).join('')
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
}
