// ============================================================
// PROJECT MEJAI — Express Application Entry Point
// AI-driven LINE Chatbot: Mejai Persona
// ============================================================

import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { lineSignatureMiddleware } from './middleware/lineSignature';
import { resolveEventContext } from './middleware/userResolver';
import { routeIntent, isTextEvent, getEventText } from './router/intentRouter';
import { handleRoleplay } from './handlers/roleplay';
import { handleExpenseLog, handleExpenseSummary } from './handlers/expense';
import { handleUnifiedLog } from './handlers/unifiedLog';
import { handleScheduleCreate, handleScheduleList } from './handlers/secretary';
import { handleNutritionLog, handleNutritionSummary } from './handlers/nutrition';
import { handleHoroscope } from './handlers/horoscope';
import { handleStatusCheck, processAffinityUpdate } from './handlers/relationship';
import { handleVision } from './handlers/vision';
import { handleOnboarding } from './handlers/onboarding';
import { handleProfileUpdate } from './handlers/profile';
import { liffRouter } from './router/liffRouter';
import { replyText, replyWithQuickReplies } from './services/line';
import { incrementMessageCount, resetUserPersona } from './services/supabase';
import { handlePaymentWebhook } from './services/omise';
import { Intent } from './types';
import { UPSELL_MESSAGES } from './config/constants';
// import removed
import { resetDailyLimits } from './cron/resetDailyLimits';

const app = express();

// ---- CORS ----
app.use(cors());

// ---- Raw body capture (needed for LINE signature verification) ----
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ---- Health Check ----
app.get('/health', (_req, res) => {
  res.json({
    status: 'alive',
    persona: 'Mejai',
    timestamp: new Date().toISOString(),
  });
});

// ---- Payment Webhook (Omise) ----
app.post('/api/payment/webhook', async (req, res) => {
  try {
    await handlePaymentWebhook(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Payment webhook error:', error);
    res.status(500).send('Error processing payment');
  }
});

// ---- LIFF Backend Endpoints ----
app.use('/api/liff', liffRouter);

// ---- Vercel Cron Job Endpoint ----
app.get('/api/cron/notify', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // We import checkAndNotifySchedules dynamically to avoid running interval in serverless
    const { checkAndNotifySchedules } = await import('./cron/scheduleNotifier.js');
    await checkAndNotifySchedules();
    res.status(200).json({ status: 'success', message: 'Cron job executed' });
  } catch (error) {
    console.error('❌ Vercel cron error:', error);
    res.status(500).json({ error: 'Failed to execute cron' });
  }
});

app.get('/api/cron/reset-daily-limits', async (req, res) => {
  if (req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await resetDailyLimits();
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Daily-limit reset failed:', error);
    res.status(500).json({ error: 'Failed to reset daily limits' });
  }
});

// ---- LINE Webhook ----
app.post(
  '/api/webhook',
  lineSignatureMiddleware,
  async (req, res) => {
    try {
      const events = req.body.events;

      for (const event of events) {
        // Skip non-message events for now
        if (event.type !== 'message') continue;

        const replyToken = event.replyToken;
        if (!replyToken) continue;

        const ctx = await resolveEventContext(event);
        if (!ctx) continue;

        // Check daily message limit
        if (ctx.user.message_count_today >= ctx.tier_config.messages_per_day) {
          await replyText(replyToken, UPSELL_MESSAGES.MESSAGE_LIMIT);
          continue;
        }

        // Increment message count
        await incrementMessageCount(ctx.user.id);

        // --- Text Messages ---
        if (isTextEvent(event)) {
          const text = getEventText(event);
          if (!text) continue;

          console.log(`📨 [${ctx.user.display_name}] ${text}`);

          // --- Admin Secret Commands ---
          if (text === '/version') {
            if (env.ADMIN_UID && ctx.user.id === env.ADMIN_UID) {
              const versionInfo = `[SYSTEM] Mejai Engine v2.1
[MODULE] Ledger of Shadows: ACTIVE
[MODULE] Natural Conversationalist: ACTIVE
[MODULE] Dynamic Profiling: ACTIVE
[STATUS] All systems nominal.`;
              await replyText(replyToken, versionInfo);
            } else {
              await replyText(replyToken, '[SYSTEM: ERROR] Unauthorized access. Incident logged.');
            }
            continue; // Stop processing further
          }

          // --- Onboarding Intercept ---
          if (!ctx.relationship.is_onboarded) {
            const result = await handleOnboarding(text, ctx);
            await replyText(replyToken, result.reply_text);
            continue;
          }

          // Route intent (regex first → AI fallback)
          const intentResult = await routeIntent(text, ctx);

          // Dispatch to handler based on intent
          let reply: string | undefined = undefined;

          switch (intentResult.intent) {
            // Phase 3 handlers
            case Intent.EXPENSE_LOG:
              reply = (await handleExpenseLog(text, ctx)).reply_text;
              break;
            case Intent.EXPENSE_SUMMARY:
              reply = (await handleExpenseSummary(ctx)).reply_text;
              break;
            case Intent.NUTRITION_LOG:
              reply = (await handleNutritionLog(text, ctx)).reply_text;
              break;
            case Intent.NUTRITION_SUMMARY:
              reply = (await handleNutritionSummary(ctx)).reply_text;
              break;
            case Intent.EXPENSE_AND_NUTRITION_LOG:
              reply = (await handleUnifiedLog(text, ctx)).reply_text;
              break;
            case Intent.SCHEDULE_CREATE:
              reply = (await handleScheduleCreate(text, ctx)).reply_text;
              break;
            case Intent.SCHEDULE_LIST:
              reply = (await handleScheduleList(ctx)).reply_text;
              break;
            case Intent.SCHEDULE_DONE:
              reply = "การทำเครื่องหมายว่าเสร็จแล้ว ทำได้ผ่านปุ่มในแดชบอร์ดนะคะ";
              break;

            // Phase 4 handlers
            case Intent.HOROSCOPE:
              reply = (await handleHoroscope(text, ctx)).reply_text;
              break;
            case Intent.STATUS_CHECK:
              reply = (await handleStatusCheck(ctx)).reply_text;
              break;
            case Intent.UPDATE_PROFILE:
              reply = (await handleProfileUpdate(text, ctx)).reply_text;
              break;

            // Reset feature
            case Intent.RESET_PERSONA:
              await replyWithQuickReplies(
                replyToken,
                '⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบตัวละครปัจจุบัน? หากยืนยัน ตัวละคร ความทรงจำ และคะแนนความสนิทจะหายไปตลอดกาลและต้องเริ่มสร้างใหม่ทั้งหมด',
                ['ยืนยันการลบตัวละคร']
              );
              // We don't set reply string because we already replied with Quick Replies
              break;

            case Intent.RESET_PERSONA_CONFIRM:
              await resetUserPersona(ctx.user.id);
              reply = 'ลบข้อมูลตัวละครและความทรงจำเรียบร้อยแล้วค่ะ! พิมพ์ข้อความทักทายอีกครั้งเพื่อสร้างตัวละครใหม่ได้เลยนะคะ ✨';
              break;

            // Default: Roleplay (Mejai persona)
            case Intent.ROLEPLAY:
            case Intent.UNKNOWN:
            default:
              reply = (await handleRoleplay(text, ctx)).reply_text;
              await processAffinityUpdate(text, ctx);
              break;
          }

          if (reply) {
            await replyText(replyToken, reply);
          }
        }

        // --- Image Messages (Phase 5) ---
        if (event.type === 'message' && event.message.type === 'image') {
          // Check vision tier limits
          if (!ctx.tier_config.vision_enabled) {
            await replyText(replyToken, UPSELL_MESSAGES.VISION_BLOCKED);
            continue;
          }

          console.log(`📸 [${ctx.user.display_name}] sent an image`);
          const messageId = event.message.id;
          const result = await handleVision(messageId, ctx);
          await replyText(replyToken, result.reply_text);
        }
      }

      // Send response after all processing is done (keeps Vercel alive)
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('❌ Webhook handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- Start Server (local dev) ----
if (env.NODE_ENV !== 'production') {
  // Local cron fallback disabled
  // startScheduleNotifier();
  
  app.listen(env.PORT, () => {
    console.log(`\n🔮 Mejai is awakening on port ${env.PORT}...`);
    console.log(`   Health: http://localhost:${env.PORT}/health`);
    console.log(`   Webhook: http://localhost:${env.PORT}/api/webhook\n`);
  });
}

export default app;
