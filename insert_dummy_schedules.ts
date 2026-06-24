import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const userId = 'aaf5b678-5712-44bb-a129-7540116066f8';
  
  const schedules = [
    { title: 'ประชุมทีมพัฒนาโปรเจกต์', datetime_iso: '2026-06-26T10:00:00+07:00' },
    { title: 'ทานข้าวกับลูกค้า (คุณจอห์น)', datetime_iso: '2026-06-27T12:30:00+07:00' },
    { title: 'อัปเดตเซิร์ฟเวอร์ระบบหลัก', datetime_iso: '2026-06-28T02:00:00+07:00' },
    { title: 'สัมภาษณ์งาน (รอบสุดท้าย)', datetime_iso: '2026-06-29T14:00:00+07:00' },
    { title: 'ตรวจเช็คสุขภาพประจำปี', datetime_iso: '2026-06-30T09:00:00+07:00' },
    { title: 'ปาร์ตี้วันเกิดริก้า 🎂', datetime_iso: '2026-07-01T19:00:00+07:00' },
    { title: 'พาครอบครัวไปเที่ยวทะเล', datetime_iso: '2026-07-05T08:00:00+07:00' }
  ];

  for (const s of schedules) {
    const { error } = await supabase.from('user_data_logs').insert({
      user_id: userId,
      log_type: 'schedule',
      payload: {
        title: s.title,
        datetime_iso: s.datetime_iso,
        reminder_before_minutes: null,
        is_recurring: false
      }
    });
    if (error) {
      console.error('Error inserting', s.title, error);
    } else {
      console.log('Inserted', s.title);
    }
  }
}
run();
