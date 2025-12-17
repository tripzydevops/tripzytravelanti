
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
let envContent = fs.readFileSync(envPath);
// Convert to string and remove null bytes
let contentStr = envContent.toString('utf8').replace(/\x00/g, '');

const env = {};
contentStr.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

console.log('Loaded keys:', Object.keys(env));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeals() {
    console.log('Fetching all deals (admin view)...');
    const { data: allDeals, error: allError } = await supabase
        .from('deals')
        .select('*');

    if (allError) {
        console.error('Error fetching all deals:', allError);
    } else {
        console.log(`Found ${allDeals.length} deals in total.`);
        if (allDeals.length > 0) {
            console.log('Keys of the first deal (DB Columns):', Object.keys(allDeals[0]));
        }
        allDeals.forEach(d => {
            console.log(`- [${d.id}] ${d.title}: Status=${d.status}, Expires=${d.expires_at}, Publish=${d.publish_at}`);
        });
    }

    console.log('\nFetching public deals (simulating getDealsPaginated)...');
    const now = new Date().toISOString();
    let query = supabase
        .from('deals')
        .select('*')
        .gt('expires_at', now)
        .or(`publish_at.is.null,publish_at.lte.${now}`)
        .eq('status', 'approved');

    const { data: publicDeals, error: publicError } = await query;

    if (publicError) {
        console.error('Error fetching public deals:', publicError);
    } else {
        console.log(`Found ${publicDeals.length} public deals.`);
        publicDeals.forEach(d => {
            console.log(`- [${d.id}] ${d.title}`);
        });
    }
}

checkDeals();
