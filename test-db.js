import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Fetching user...');
  const { data: users, error: fetchError } = await supabase.from('users').select('*').limit(1);
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }

  const user = users[0];
  console.log('User found:', user.id);
  console.log('Current monthly_budget:', user.monthly_budget);

  console.log('Attempting to update monthly_budget...');
  const { data, error } = await supabase
    .from('users')
    .update({ monthly_budget: 4000 })
    .eq('id', user.id)
    .select();

  if (error) {
    console.error('Update error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Update success!', data);
  }
}

test();
