// ============================================================
// PROJECT MEJAI — Cron: Daily Horoscope Push
// Pushes horoscope to PREMIUM users daily.
// ============================================================

import supabase from '../services/supabase';
import { chat } from '../services/deepseek';
import { pushText } from '../services/line';
import { SubscriptionTier, User } from '../types';

export async function pushDailyHoroscopes(): Promise<void> {
  console.log('🔮 Running Daily Horoscope Push for Premium Users...');
  
  // Find all premium users
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('subscription_tier', SubscriptionTier.PREMIUM);

  if (error || !users) {
    console.error('❌ Failed to fetch premium users:', error);
    return;
  }

  for (const user of users as User[]) {
    if (!user.birthdate) continue; // Skip if no birthdate

    const prompt = [
      {
        role: 'system' as const,
        content: `สร้างข้อความทักทายตอนเช้าและดูดวงสั้นๆ ประจำวันสำหรับคนที่เกิดวันที่ ${user.birthdate}
        สวมบทบาทเป็น "เมใจ" สาวน้อยน่ารักสดใสที่กำลังทักทายยามเช้า
        มีสีมงคลและไอเทมนำโชคด้วย ความยาวไม่เกิน 4-5 บรรทัด`,
      },
    ];

    try {
      const msg = await chat(prompt, { temperature: 0.8, max_tokens: 300 });
      await pushText(user.line_user_id, msg);
      console.log(`✅ Pushed horoscope to user ${user.id}`);
    } catch (e) {
      console.error(`❌ Failed to push horoscope to user ${user.id}:`, e);
    }
  }
}
