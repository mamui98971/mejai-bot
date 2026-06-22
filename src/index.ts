// ============================================================
// PROJECT MEJAI — Express Application Entry Point
// AI-driven LINE Chatbot: Mejai Persona
// ============================================================

import express from 'express';
import { env } from './config/env';
import { lineSignatureMiddleware } from './middleware/lineSignature';
import { userResolverMiddleware } from './middleware/userResolver';
import { routeIntent, isTextEvent, getEventText } from './router/intentRouter';
import { handleRoleplay } from './handlers/roleplay';
import { handleExpenseLog, handleExpenseSummary } from './handlers/expense';
import { handleScheduleCreate, handleScheduleList } from './handlers/secretary';
import { handleNutritionLog, handleNutritionSummary } from './handlers/nutrition';
import { handleHoroscope } from './handlers/horoscope';
import { handleStatusCheck, processAffinityUpdate } from './handlers/relationship';
import { handleVision } from './handlers/vision';
import { handleOnboarding } from './handlers/onboarding';
import { replyText } from './services/line';
import { incrementMessageCount, resetUserPersona } from './services/supabase';
import { handlePaymentWebhook } from './services/omise';
import { Intent } from './types';
import { UPSELL_MESSAGES } from './config/constants';

const app = express();

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

// ---- LINE Webhook ----
app.post(
  '/api/webhook',
  lineSignatureMiddleware,
  userResolverMiddleware,
  async (req, res) => {
    try {
      const ctx = req.mejaiContext!;
      const events = req.body.events;

      for (const event of events) {
        // Skip non-message events for now
        if (event.type !== 'message') continue;

        const replyToken = event.replyToken;
        if (!replyToken) continue;

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

          // --- Onboarding Intercept ---
          if (!ctx.relationship.is_onboarded) {
            const result = await handleOnboarding(text, ctx);
            await replyText(replyToken, result.reply_text);
            continue;
          }

          // Route intent (regex first → AI fallback)
          const intentResult = await routeIntent(text, ctx);

          // Dispatch to handler based on intent
          let reply: string;

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
            case Intent.SCHEDULE_CREATE:
              reply = (await handleScheduleCreate(text, ctx)).reply_text;
              break;
            case Intent.SCHEDULE_LIST:
              reply = (await handleScheduleList(ctx)).reply_text;
              break;

            // Phase 4 handlers
            case Intent.HOROSCOPE:
              reply = (await handleHoroscope(text, ctx)).reply_text;
              break;
            case Intent.STATUS_CHECK:
              reply = (await handleStatusCheck(ctx)).reply_text;
              break;

            // Reset feature
            case Intent.RESET_PERSONA:
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

          await replyText(replyToken, reply);
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
  app.listen(env.PORT, () => {
    console.log(`\n🔮 Mejai is awakening on port ${env.PORT}...`);
    console.log(`   Health: http://localhost:${env.PORT}/health`);
    console.log(`   Webhook: http://localhost:${env.PORT}/api/webhook\n`);
  });
}

export default app;
