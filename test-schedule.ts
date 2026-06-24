import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const adminUid = process.env.ADMIN_UID;
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, display_name')
    .eq('id', adminUid)
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('Error fetching user:', userError);
    return;
  }

  const user = users[0];
  console.log(`Inserting mock schedules for user: ${user.display_name} (${user.id})`);

  const today = new Date();
  today.setHours(today.getHours() + 2);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const { error: insertError } = await supabase.from('user_data_logs').insert([
    {
      user_id: user.id,
      log_type: 'schedule',
      payload: {
        title: '☕ เดตจิบกาแฟกับริก้า (ทดสอบจิ้มขีดฆ่าได้นะ)',
        datetime_iso: today.toISOString(),
        is_done: false
      }
    },
    {
      user_id: user.id,
      log_type: 'schedule',
      payload: {
        title: '💻 ตรวจสอบระบบงานพรุ่งนี้ล่วงหน้า',
        datetime_iso: tomorrow.toISOString(),
        is_done: false
      }
    }
  ]);

  if (insertError) {
    console.error('Failed to insert mock data:', insertError);
  } else {
    console.log('✅ Mock schedules inserted successfully!');
  }
}

run();
