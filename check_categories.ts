import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCategories() {
    const { data, error } = await supabase
        .from('deals')
        .select('category');

    if (error) {
        console.error('Error fetching categories:', error);
        return;
    }

    const categories = [...new Set(data.map((d: any) => d.category))];
    console.log('Distinct Categories in DB:', categories);
}

checkCategories();
