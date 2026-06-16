// supabase/functions/generate-qr-token/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
    walletItemId: string;
}

// SHA-256 helper
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

        // Initialize user client to verify user session
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized session' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { walletItemId } = await req.json() as RequestBody;
        if (!walletItemId) {
            return new Response(JSON.stringify({ error: 'Missing walletItemId' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Verify wallet item ownership and active status
        const { data: walletItem, error: walletError } = await supabaseUser
            .from('wallet_items')
            .select('id, user_id, status, redemption_code')
            .eq('id', walletItemId)
            .single();

        if (walletError || !walletItem) {
            return new Response(JSON.stringify({ error: 'Wallet item not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (walletItem.status !== 'active') {
            return new Response(JSON.stringify({ error: `Wallet item is ${walletItem.status}` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (walletItem.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden: You do not own this wallet item' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Generate dynamic token credentials (UUID string)
        const tokenString = crypto.randomUUID();
        const tokenHash = await sha256(tokenString);
        
        // TTL: 60 seconds
        const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

        // Initialize service role client for DDL/bypass writes
        const supabaseService = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Record token in database
        const { data: qrToken, error: tokenInsertError } = await supabaseService
            .from('qr_tokens')
            .insert({
                wallet_item_id: walletItemId,
                token_hash: tokenHash,
                expires_at: expiresAt,
                version: 1
            })
            .select('id')
            .single();

        if (tokenInsertError) {
            console.error('Failed to insert qr token:', tokenInsertError);
            throw tokenInsertError;
        }

        // Link wallet item to current token
        await supabaseService
            .from('wallet_items')
            .update({ qr_token_id: qrToken.id })
            .eq('id', walletItemId);

        // Return token details to client
        return new Response(
            JSON.stringify({
                wi: walletItemId,
                token: tokenString,
                expiresAt
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        console.error('generate-qr-token failed:', err);
        return new Response(JSON.stringify({ error: err.message || 'Server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
