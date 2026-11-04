// supabase/functions/instagram-webhook/index.ts
// Handles Meta Instagram Story Mentions & Tag Webhook for Tripzy Flash Lottery
// Includes Meta X-Hub-Signature-256 HMAC verification & strict handshake checking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
}

/**
 * Validates Meta's SHA-256 HMAC signature against the raw request body.
 * Header format: sha256=<hex-digest>
 */
async function verifyMetaHmacSignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
        return false;
    }
    const signatureHex = signatureHeader.substring(7);
    if (!signatureHex || signatureHex.length !== 64) {
        return false;
    }

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(appSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const sigBytes = new Uint8Array(
            signatureHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );

        return await crypto.subtle.verify(
            'HMAC',
            key,
            sigBytes,
            encoder.encode(rawBody)
        );
    } catch (e) {
        console.error('[Instagram Webhook] Signature verification error:', e);
        return false;
    }
}

serve(async (req: Request) => {
    // 1. Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)

    // 2. Handle Meta Hub Handshake Verification (GET)
    if (req.method === 'GET') {
        const mode = url.searchParams.get('hub.mode')
        const token = url.searchParams.get('hub.verify_token')
        const challenge = url.searchParams.get('hub.challenge')

        const expectedToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN')
        if (!expectedToken) {
            console.error('[Instagram Webhook Handshake] META_WEBHOOK_VERIFY_TOKEN is not configured in environment.');
            return new Response('Server configuration error: verify token missing', {
                status: 500,
                headers: { 'Content-Type': 'text/plain' }
            })
        }

        console.log(`[Instagram Webhook Handshake] mode=${mode}, token=${token ? '***' : 'none'}, challenge=${challenge}`)

        if (mode === 'subscribe' && token === expectedToken) {
            console.log('[Instagram Webhook Handshake] Verified successfully! Responding with challenge.');
            return new Response(challenge || 'OK', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            })
        }

        console.warn('[Instagram Webhook Handshake] Verification failed: Token mismatch or invalid mode.');
        return new Response('Forbidden: Verification token mismatch', {
            status: 403,
            headers: { 'Content-Type': 'text/plain' }
        })
    }

    // 3. Handle Live Event Notifications from Meta (POST)
    if (req.method === 'POST') {
        try {
            const rawBody = await req.text()
            const appSecret = Deno.env.get('META_APP_SECRET')
            const signatureHeader = req.headers.get('x-hub-signature-256')

            // Enforce HMAC signature check when secret is configured
            if (appSecret) {
                const isValid = await verifyMetaHmacSignature(rawBody, signatureHeader, appSecret)
                if (!isValid) {
                    console.warn('[Instagram Webhook] Unauthorized: Invalid or missing X-Hub-Signature-256 header.')
                    return new Response(JSON.stringify({ status: 'unauthorized', message: 'Signature verification failed' }), {
                        status: 401,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    })
                }
            } else {
                console.warn('[Instagram Webhook] WARNING: META_APP_SECRET is not configured; running without signature verification.')
            }

            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const body = JSON.parse(rawBody)
            console.log('[Instagram Webhook Event Received]:', JSON.stringify(body))

            const entries = body.entry || []
            let processedMentions = 0
            const mintedTickets: string[] = []

            for (const entry of entries) {
                const changes = entry.changes || []
                for (const change of changes) {
                    const field = change.field
                    const value = change.value || {}

                    if (field === 'mentions' || field === 'story_insights' || field === 'messages') {
                        processedMentions++

                        // Extract sender / media info
                        const senderUsername = value.sender_username || value.from?.username || null
                        const mediaId = value.media_id || value.id || `media-${Date.now()}`

                        // Generate unique lottery ticket number
                        const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
                        const ticketNumber = `TRPZ-IG-${randomSuffix}`

                        // Find active campaign
                        const { data: activeCampaign } = await supabaseClient
                            .from('lottery_campaigns')
                            .select('id, total_tickets_minted')
                            .eq('status', 'active')
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()

                        // Try to find matching user if they registered their instagram_handle
                        let matchedUserId = null
                        if (senderUsername) {
                            const { data: userProfile } = await supabaseClient
                                .from('profiles')
                                .select('id')
                                .ilike('instagram_handle', senderUsername)
                                .maybeSingle()
                            if (userProfile) matchedUserId = userProfile.id
                        }

                        if (activeCampaign) {
                            // Mint verified ticket in Supabase
                            const { error: ticketError } = await supabaseClient
                                .from('lottery_tickets')
                                .insert({
                                    campaign_id: activeCampaign.id,
                                    user_id: matchedUserId,
                                    ticket_number: ticketNumber,
                                    verification_method: 'webhook_tag',
                                    proof_url: `https://instagram.com/p/${mediaId}`,
                                    is_winner: false
                                })

                            if (!ticketError) {
                                mintedTickets.push(ticketNumber)
                                // Increment ticket count
                                await supabaseClient
                                    .from('lottery_campaigns')
                                    .update({ total_tickets_minted: (activeCampaign.total_tickets_minted || 0) + 1 })
                                    .eq('id', activeCampaign.id)
                            } else {
                                console.error('[Instagram Webhook] Failed to insert ticket:', ticketError)
                            }
                        } else {
                            mintedTickets.push(ticketNumber)
                        }
                    }
                }
            }

            return new Response(JSON.stringify({
                status: 'processed',
                processed: processedMentions,
                tickets_minted: mintedTickets
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error('[Instagram Webhook] Error processing event:', errorMessage)
            // Meta expects 200 to avoid retrying in loops
            return new Response(JSON.stringify({ status: 'error', message: errorMessage }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
    }

    return new Response('Method not allowed', { status: 405 })
})
