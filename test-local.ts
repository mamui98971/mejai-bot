import { env } from './src/config/env';
import supabase from './src/services/supabase';
import { chat } from './src/services/deepseek';

async function runTest() {
  console.log("1. Testing Supabase connection...");
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error("❌ Supabase Error:", error);
  } else {
    console.log("✅ Supabase works. Users found:", data?.length);
  }

  console.log("2. Testing DeepSeek API...");
  try {
    const aiResponse = await chat([{ role: 'user', content: 'Hello' }]);
    console.log("✅ DeepSeek works. Response:", aiResponse);
  } catch (err: any) {
    console.error("❌ DeepSeek Error:", err.message || err);
    if (err.response) {
       console.error(err.response.data);
    }
  }
}

runTest().catch(console.error);
