import { Router } from 'express';
import { z } from 'zod';
import supabase from '../services/supabase';
import { verifyLiffIdToken } from '../services/liffAuth';

export const liffRouter = Router();

declare global {
  namespace Express {
    interface Request {
      liffLineUserId?: string;
    }
  }
}

const settingsSchema = z.object({
  userProfile: z.object({
    display_name: z.string().trim().min(1).max(100).optional(),
    birthdate: z.string().date().optional(),
    age: z.number().int().min(1).max(130).optional(),
    gender: z.string().trim().max(50).optional(),
    weight: z.number().positive().max(1000).optional(),
    height: z.number().positive().max(300).optional(),
    goal: z.enum(['ผอม', 'สมส่วน', 'อ้วน']).optional(),
    monthly_budget: z.number().nonnegative().optional(),
  }).strict(),
  aiPersona: z.object({
    bot_name: z.string().trim().min(1).max(100).optional(),
    bot_age: z.number().int().min(1).max(130).optional(),
    bot_personality: z.string().trim().max(2000).optional(),
  }).strict(),
}).strict();

const checkoutSchema = z.object({
  tier: z.enum(['standard', 'premium']),
}).strict();

liffRouter.use(async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing LINE ID token' });
    return;
  }

  try {
    req.liffLineUserId = await verifyLiffIdToken(authorization.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid LINE ID token' });
  }
});

// GET /api/liff/me - Fetch dashboard stats
liffRouter.get('/me', async (req, res) => {
  try {
    const lineUserId = req.liffLineUserId!;

    // 1. Get user profile and relationship
    const { data: user } = await supabase
      .from('users')
      .select('*, user_relationships(*)')
      .eq('line_user_id', lineUserId)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2. Fetch this month's stats (Expenses & Nutrition)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: logs } = await supabase
      .from('user_data_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startOfMonth.toISOString());

    let dailyExpense = 0;
    let monthlyExpense = 0;
    let dailyCalories = 0;
    let dailyProtein = 0;
    let dailySodium = 0;

    if (logs) {
      logs.forEach(log => {
        const logDate = new Date(log.logged_at);
        const isToday = logDate >= today;

        if (log.log_type === 'expense') {
          monthlyExpense += log.payload.amount || 0;
          if (isToday) dailyExpense += log.payload.amount || 0;
        } else if (log.log_type === 'diet' && isToday) {
          dailyCalories += log.payload.calories || 0;
          dailyProtein += log.payload.protein || 0;
          dailySodium += log.payload.sodium || 0;
        }
      });
    }

    res.json({
      user: {
        id: user.id,
        displayName: user.display_name,
        tier: user.subscription_tier,
        messageCount: user.message_count_today || 0,
        birthdate: user.birthdate,
        age: user.age,
        gender: user.gender,
        weight: user.weight,
        height: user.height,
        goal: user.goal,
        monthlyBudget: user.monthly_budget || 0,
      },
      relationship: {
        status: user.user_relationships?.relationship_status || 'Stranger',
        affinityScore: user.user_relationships?.affinity_score || 0,
        bot_name: user.user_relationships?.bot_name,
        bot_age: user.user_relationships?.bot_age,
        bot_personality: user.user_relationships?.bot_personality,
      },
      stats: {
        dailyExpense,
        monthlyExpense,
        dailyCalories,
        dailyProtein,
        dailySodium
      }
    });

  } catch (err) {
    console.error('LIFF /me error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/liff/settings - Update User & Bot Settings
import { updateUserSettings } from '../services/supabase';
liffRouter.put('/settings', async (req, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid settings payload' });
    const { userProfile, aiPersona } = parsed.data;
    const lineUserId = req.liffLineUserId!;
    
    // Fetch user id first
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await updateUserSettings(user.id, userProfile, aiPersona);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('LIFF /settings error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

import { createSubscriptionCharge } from '../services/omise';
import { SubscriptionTier } from '../types';

// POST /api/liff/checkout - Generate Real Omise QR
liffRouter.post('/checkout', async (req, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid subscription tier' });
    const { tier } = parsed.data;
    const lineUserId = req.liffLineUserId!;
    
    // Fetch user to determine dynamic pricing
    const { data: user } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('line_user_id', lineUserId)
      .single();

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Call Omise Service to generate PromptPay QR
    const paymentData = await createSubscriptionCharge(
      user.id, 
      tier as SubscriptionTier
    );
    
    res.json({
      qrPayload: paymentData.qrImage, // URL to Omise QR SVG
      chargeId: paymentData.chargeId,
      amount: paymentData.amount,
      expiresIn: 600 // 10 minutes
    });

  } catch (err) {
    console.error('LIFF /checkout error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
