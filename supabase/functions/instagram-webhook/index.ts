// @ts-nocheck
// supabase/functions/instagram-webhook/index.ts
// Handles Meta Instagram Story Mentions & Tag Webhook for Tripzy Flash Lottery

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

        const expectedToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'tripzy_verify_token_secure'

        console.log(`[Instagram Webhook Handshake] mode=${mode}, token=${token}, challenge=${challenge}`)

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
            const supabaseClient = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const body = await req.json()
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
                        const senderId = value.sender_id || value.from?.id || 'ig-user'
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

        } catch (err: any) {
            console.error('[Instagram Webhook] Error processing event:', err)
            // Meta expects 200 to avoid retrying in loops
            return new Response(JSON.stringify({ status: 'error', message: err?.message }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }
    }

    return new Response('Method not allowed', { status: 405 })
})
