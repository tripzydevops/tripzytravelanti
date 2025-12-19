// supabase/functions/vector-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
    deal: {
        id: string;
        title: string;
        vendor: string;
        category: string;
        description: string;
        requiredTier: string;
        discountedPrice: number;
    };
    action: 'upsert' | 'delete';
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

        // Verify authentication
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Verify Admin status
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || profile?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { deal, action } = await req.json() as SyncRequest

        if (action === 'delete') {
            return await deleteFromPinecone(deal.id);
        }

        // Upsert logic
        const text = `
        Title: ${deal.title}
        Vendor: ${deal.vendor}
        Category: ${deal.category}
        Description: ${deal.description}
        Required Tier: ${deal.requiredTier}
    `.trim();

        const embedding = await generateEmbedding(text);
        const result = await upsertToPinecone(deal, embedding);

        return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})

async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = Deno.env.get('GOOGLE_AI_KEY');
    if (!apiKey) throw new Error('Missing GOOGLE_AI_KEY secret');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: { parts: [{ text }] }
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Gemini Error:', data);
        throw new Error(`Gemini Error: ${data.error?.message || 'Unknown error'}`);
    }

    return data.embedding.values;
}

async function upsertToPinecone(deal: any, values: number[]) {
    const apiKey = Deno.env.get('PINECONE_API_KEY');
    const indexUrl = Deno.env.get('PINECONE_INDEX_URL');
    if (!apiKey || !indexUrl) throw new Error('Missing Pinecone secrets');

    const host = indexUrl.replace('https://', '').replace(/\/$/, '');
    const url = `https://${host}/vectors/upsert`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            vectors: [{
                id: deal.id,
                values: values,
                metadata: {
                    title: deal.title,
                    vendor: deal.vendor,
                    category: deal.category,
                    requiredTier: deal.requiredTier,
                    discountedPrice: deal.discountedPrice,
                    type: 'deal'
                }
            }]
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Pinecone Error:', data);
        throw new Error(`Pinecone Error: ${JSON.stringify(data)}`);
    }

    return data;
}

async function deleteFromPinecone(id: string) {
    const apiKey = Deno.env.get('PINECONE_API_KEY');
    const indexUrl = Deno.env.get('PINECONE_INDEX_URL');
    if (!apiKey || !indexUrl) throw new Error('Missing Pinecone secrets');

    const host = indexUrl.replace('https://', '').replace(/\/$/, '');
    const url = `https://${host}/vectors/delete`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ids: [id]
        })
    });

    if (!response.ok) {
        const data = await response.json();
        console.error('Pinecone Delete Error:', data);
        throw new Error(`Pinecone Delete Error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
