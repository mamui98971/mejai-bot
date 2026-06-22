// ============================================================
// PROJECT MEJAI — Payment Gateway (Pillar 6)
// Omise API integration for Premium subscriptions.
// ============================================================

import { env } from '../config/env';
import { SubscriptionTier } from '../types';
import supabase from './supabase';

/**
 * Generate a payment link or charge using Omise API.
 * Currently a mock implementation for demonstration.
 */
export async function createSubscriptionCharge(
  userId: string,
  tier: SubscriptionTier
): Promise<string> {
  const amount = tier === SubscriptionTier.PREMIUM ? 14900 : 5900; // THB (Satang)
  
  console.log(`💳 [OMISE MOCK] Creating charge for User ${userId} | Tier: ${tier} | Amount: ${amount} Satang`);
  
  // In production, we'd call:
  // omise.charges.create({ amount, currency: 'thb', card: token, ... })
  
  const mockCheckoutUrl = `https://mejai-app.vercel.app/checkout?uid=${userId}&tier=${tier}`;
  return mockCheckoutUrl;
}

/**
 * Handle Omise Webhook for successful payments.
 */
export async function handlePaymentWebhook(
  payload: any
): Promise<void> {
  // 1. Verify Omise signature
  // 2. Check charge status
  if (payload.object === 'event' && payload.data?.status === 'successful') {
    const userId = payload.data.metadata?.user_id;
    const tier = payload.data.metadata?.tier;

    if (userId && tier) {
      console.log(`✅ Payment success for User ${userId}. Upgrading to ${tier}...`);
      
      // Calculate expiry (1 month from now)
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);

      await supabase
        .from('users')
        .update({
          subscription_tier: tier,
          subscription_expiry: expiry.toISOString()
        })
        .eq('id', userId);
    }
  }
}
