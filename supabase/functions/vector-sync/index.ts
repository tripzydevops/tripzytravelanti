// supabase/functions/vector-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VectorRequest {
    action: 'upsert' | 'delete' | 'query' | 'rank' | 'generate' | 'chat';
    deal?: {
        id: string;
        title: string;
        vendor: string;
        category: string;
        description: string;
        requiredTier: string;
        discountedPrice: number;
    };
    query?: {
        text?: string;
        dealId?: string;
        topK?: number;
    };
    ranking?: {
        prompt: string;
    };
    generation?: {
        prompt: string;
    };
    chat?: {
        message: string;
        history: any[];
        systemInstruction?: string;
    };
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

        // 1. Verify Authentication (Required for all actions)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const body = await req.json() as VectorRequest
        const { action } = body;

        // 2. Authorization Check
        if (action === 'upsert' || action === 'delete') {
            // Admin only for write operations
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role, is_admin')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin' && profile?.is_admin !== true) {
                return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required for this action' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }

        // 3. Action Logic
        if (action === 'delete') {
            if (!body.deal?.id) throw new Error('Missing deal id for delete');
            return await deleteFromPinecone(body.deal.id);
        }

        if (action === 'upsert') {
            if (!body.deal) throw new Error('Missing deal data for upsert');
            const deal = body.deal;
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
        }

        if (action === 'query') {
            const topK = body.query?.topK || 5;
            let embedding: number[] = [];

            if (body.query?.text) {
                embedding = await generateEmbedding(body.query.text);
            } else if (body.query?.dealId) {
                // Fetch deal to generate embedding
                const { data: deal } = await supabaseClient.from('deals').select('*').eq('id', body.query.dealId).single();
                if (!deal) throw new Error('Deal not found for similarity query');

                const text = `Title: ${deal.title} Vendor: ${deal.vendor} Category: ${deal.category} Description: ${deal.description}`.trim();
                embedding = await generateEmbedding(text);
            } else {
                throw new Error('Missing query text or dealId');
            }

            const results = await queryPinecone(embedding, topK, body.query?.dealId);
            return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'rank') {
            if (!body.ranking?.prompt) throw new Error('Missing ranking prompt');
            const results = await rankDealsWithGemini(body.ranking.prompt);
            return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'generate') {
            if (!body.generation?.prompt) throw new Error('Missing generation prompt');
            const text = await generateTextWithGemini(body.generation.prompt);
            return new Response(JSON.stringify({ success: true, text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (action === 'chat') {
            if (!body.chat?.message) throw new Error('Missing chat message');
            const response = await chatWithGemini(body.chat.message, body.chat.history || [], body.chat.systemInstruction);
            return new Response(JSON.stringify({ success: true, response }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})

async function chatWithGemini(message: string, history: any[], systemInstruction?: string): Promise<any> {
    const apiKey = Deno.env.get('GOOGLE_AI_KEY');
    if (!apiKey) throw new Error('Missing GOOGLE_AI_KEY secret');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const contents = [...history, { role: 'user', parts: [{ text: message }] }];

    const tools = [{
        function_declarations: [{
            name: 'findDeals',
            description: 'Applies filters to find travel and lifestyle deals based on user criteria.',
            parameters: {
                type: 'OBJECT',
                properties: {
                    searchQuery: { type: 'STRING', description: 'A search term to filter deals by.' },
                    category: { type: 'STRING', description: 'The category to filter deals by.' },
                    minRating: { type: 'NUMBER', description: 'The minimum user rating.' }
                }
            }
        }]
    }];

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            tools
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Gemini Chat Error:', data);
        throw new Error(`Gemini Chat Error: ${data.error?.message || 'Unknown error'}`);
    }

    const candidate = data.candidates[0];
    return {
        text: candidate.content.parts.find((p: any) => p.text)?.text || '',
        functionCalls: candidate.content.parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall)
    };
}

async function generateTextWithGemini(prompt: string): Promise<string> {
    const apiKey = Deno.env.get('GOOGLE_AI_KEY');
    if (!apiKey) throw new Error('Missing GOOGLE_AI_KEY secret');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Gemini Generation Error:', data);
        throw new Error(`Gemini Generation Error: ${data.error?.message || 'Unknown error'}`);
    }

    return data.candidates[0].content.parts[0].text;
}

async function rankDealsWithGemini(prompt: string): Promise<string[]> {
    const apiKey = Deno.env.get('GOOGLE_AI_KEY');
    if (!apiKey) throw new Error('Missing GOOGLE_AI_KEY secret');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Gemini Ranking Error:', data);
        throw new Error(`Gemini Ranking Error: ${data.error?.message || 'Unknown error'}`);
    }

    try {
        const text = data.candidates[0].content.parts[0].text;
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('Failed to parse Gemini ranking response:', e);
        return [];
    }
}

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

async function queryPinecone(values: number[], topK: number, excludeId?: string) {
    const apiKey = Deno.env.get('PINECONE_API_KEY');
    const indexUrl = Deno.env.get('PINECONE_INDEX_URL');
    if (!apiKey || !indexUrl) throw new Error('Missing Pinecone secrets');

    const host = indexUrl.replace('https://', '').replace(/\/$/, '');
    const url = `https://${host}/query`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            vector: values,
            topK: excludeId ? topK + 1 : topK,
            includeMetadata: true
        })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error('Pinecone Query Error:', data);
        throw new Error(`Pinecone Query Error: ${JSON.stringify(data)}`);
    }

    // Filter out the source deal if we're looking for "similar to X"
    let matches = data.matches || [];
    if (excludeId) {
        matches = matches.filter((m: any) => m.id !== excludeId).slice(0, topK);
    }

    return matches;
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
