import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

// Define CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { title, message, targetUserId } = await req.json();

        // 1. Initialize Supabase Client (Service Role)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Validate VAPID Keys
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
        const vapidSubject = 'mailto:admin@tripzy.com';

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error('Missing VAPID keys');
        }

        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);


        // 3. Fetch Subscriptions
        let query = supabase.from('push_subscriptions').select('*');
        if (targetUserId) {
            query = query.eq('user_id', targetUserId);
        }

        const { data: subscriptions, error: fetchError } = await query;

        if (fetchError || !subscriptions) {
            console.error('Error fetching subscriptions:', fetchError);
            throw new Error('Failed to fetch subscriptions');
        }

        console.log(`Found ${subscriptions.length} subscriptions to notify.`);

        // 4. Send Notifications
        const payload = JSON.stringify({ title, body: message });
        const results = [];

        for (const sub of subscriptions) {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, payload);
                results.push({ id: sub.id, status: 'sent' });
            } catch (error) {
                console.error(`Error sending to ${sub.id}:`, error);

                // If 410 Gone, delete logic could go here
                if (error.statusCode === 410) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    results.push({ id: sub.id, status: 'failed', reason: 'expired' });
                } else {
                    results.push({ id: sub.id, status: 'failed', reason: error.message });
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
