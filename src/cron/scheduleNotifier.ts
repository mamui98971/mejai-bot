import { pushText } from '../services/line';
import supabase from '../services/supabase';
import { SchedulePayload, SubscriptionTier } from '../types';

export async function checkAndNotifySchedules() {
  try {
    const now = new Date();
    
    // Query all schedule logs that haven't been notified
    const { data: logs, error } = await supabase
      .from('user_data_logs')
      .select(`
        id,
        user_id,
        payload,
        users ( line_user_id, subscription_tier, display_name )
      `)
      .eq('log_type', 'schedule');

    if (error || !logs) {
      console.error('❌ Failed to fetch schedules:', error);
      return;
    }

    for (const log of logs) {
      const payload = log.payload as SchedulePayload & { is_notified?: boolean };
      const user = log.users as any; // The joined user data

      // SKIP if already notified
      if (payload.is_notified) continue;

      // SKIP if not premium
      if (user.subscription_tier !== SubscriptionTier.PREMIUM) continue;

      const eventTime = new Date(payload.datetime_iso);
      const reminderMinutes = payload.reminder_before_minutes ?? 30; // Default 30 min
      
      // Calculate the exact time we should trigger the notification
      const triggerTime = new Date(eventTime.getTime() - reminderMinutes * 60000);

      // If the current time has passed the trigger time, fire the notification
      if (now >= triggerTime && now < eventTime) {
        console.log(`⏰ [ScheduleNotifier] Triggering for ${user.display_name}: ${payload.title}`);
        
        try {
          await pushText(
            user.line_user_id, 
            `⏰ ก๊อกๆ! นายท่านคะ "${payload.title}" กำลังจะเริ่มในอีก ${reminderMinutes} นาทีนะคะ อย่าลืมเตรียมตัวน้า 💖`
          );

          // Mark as notified
          const updatedPayload = { ...payload, is_notified: true };
          await supabase
            .from('user_data_logs')
            .update({ payload: updatedPayload })
            .eq('id', log.id);

        } catch (pushErr) {
          console.error(`❌ Failed to send push notification to ${user.display_name}`, pushErr);
        }
      }
    }
  } catch (err) {
    console.error('❌ Schedule Notifier crashed:', err);
  }
}

export function startScheduleNotifier() {
  // Run every 1 minute for local dev only
  setInterval(checkAndNotifySchedules, 60 * 1000);
}
