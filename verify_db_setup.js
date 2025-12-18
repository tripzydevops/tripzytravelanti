import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');

// Manual env parsing
let env = {};
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath);
    let contentStr = envContent.toString('utf8').replace(/\x00/g, '');
    contentStr.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
} else {
    console.error('❌ .env.local file not found!');
    process.exit(1);
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying Database Setup...');

    // 1. Check 'deals' table columns
    console.log('\n1. Checking deals table columns...');
    const { data: deals, error: selectError } = await supabase
        .from('deals')
        .select('id, redemption_style, partner_id, status, max_user_redemptions')
        .limit(1);

    if (selectError) {
        console.error('❌ Error selecting columns:', selectError.message);
        console.log('   Hint: Did you run update_redemption_style_array.sql and add_deal_approval.sql?');
    } else {
        console.log('✅ Columns exist (redemption_style, partner_id, status, max_user_redemptions).');
        if (deals && deals.length > 0) {
            console.log('   Sample deal:', deals[0]);
            console.log('   redemption_style type:', Array.isArray(deals[0].redemption_style) ? 'Array' : typeof deals[0].redemption_style);
        }
    }

    // 2. Test Insert (Simulating AdminDealsTab)
    console.log('\n2. Testing Deal Insert (as Anon/Service Role if key allows)...');
    // Note: Anon key usually has RLS applied. If we are not logged in, we are "anon".
    // The "Only admins can insert deals" policy requires auth.uid() to be an admin.
    // Since we are running this script as ANON without a user session, this INSERT SHOULD FAIL if RLS is working correctly for admins!
    // However, we want to verify if the SCHEMA allows it.

    const testDeal = {
        title: 'Test Deal ' + Date.now(),
        title_tr: 'Test Deal TR',
        description: 'Test Description',
        description_tr: 'Test Description TR',
        category: 'Dining',
        category_tr: 'Yemek',
        original_price: 100,
        discounted_price: 80,
        discount_percentage: 20,
        required_tier: 'FREE',
        is_external: false,
        vendor: 'Test Vendor',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        redemption_code: 'TESTCODE',
        redemption_style: ['online', 'in_store'], // Testing array
        status: 'pending'
    };

    const { data: insertData, error: insertError } = await supabase
        .from('deals')
        .insert(testDeal)
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Failed:', insertError.message);
        console.error('   Details:', insertError.details);
        console.error('   Hint: This is expected if RLS is on and we are not logged in as Admin.');

        // If the error is about "column does not exist", that's a schema issue.
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
            console.error('   CRITICAL: Schema mismatch! A column is missing.');
        }
    } else {
        console.log('✅ Insert Successful (Unexpected for Anon, but confirms schema is OK)!', insertData);
        await supabase.from('deals').delete().eq('id', insertData.id);
    }

    // 3. Check 'partner_stats' table
    console.log('\n3. Checking partner_stats table...');
    const { error: statsError } = await supabase
        .from('partner_stats')
        .select('id')
        .limit(1);

    if (statsError) {
        console.error('❌ Error accessing partner_stats:', statsError.message);
    } else {
        console.log('✅ partner_stats table accessible.');
    }
}

verify().catch(console.error);
