/**
 * Supabase Edge Function: expire-points
 *
 * Expires loyalty points that have passed their expiration date.
 * Designed to be invoked on a schedule (e.g., daily cron) or manually
 * by an admin. Only callable with the service role key or a valid
 * admin Bearer token.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Standard CORS headers applied to every response.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // ---------- CORS preflight ----------
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ---------- Auth guard ----------
    // Only the service role key (or a Bearer token that matches it) is accepted.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token || token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ---------- Supabase admin client ----------
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ---------- Call the RPC ----------
    // `expire_loyalty_points()` is a Postgres function that marks expired
    // points and returns the number of rows affected.
    const { data, error } = await supabase.rpc('expire_loyalty_points');

    if (error) {
      console.error('RPC error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // The RPC is expected to return the count of expired rows.
    const expiredCount = typeof data === 'number' ? data : 0;

    console.log(`Successfully expired ${expiredCount} loyalty point record(s).`);

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
