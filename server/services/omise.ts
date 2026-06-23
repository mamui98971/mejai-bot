// ============================================================
// PROJECT MEJAI — Payment Gateway (Pillar 6)
// Omise API integration for Premium subscriptions.
// ============================================================

import { env } from '../config/env';
import { SubscriptionTier } from '../types';
import supabase from './supabase';

import Omise from 'omise';

const omise = Omise({
  publicKey: env.OMISE_PUBLIC_KEY || 'pkey_test_xxx',
  secretKey: env.OMISE_SECRET_KEY || 'skey_test_xxx',
});

export interface ExpectedPayment {
  user_id: string;
  tier: string;
  amount: number;
  currency: string;
}

export interface VerifiedCharge {
  amount: number;
  currency: string;
  metadata?: { user_id?: string; tier?: string };
}

export function isExpectedPaymentCharge(charge: VerifiedCharge, payment: ExpectedPayment): boolean {
  return charge.amount === payment.amount
    && charge.currency.toLowerCase() === payment.currency.toLowerCase()
    && charge.metadata?.user_id === payment.user_id
    && charge.metadata?.tier === payment.tier;
}

/**
 * Generate a PromptPay QR Code using Omise API.
 */
export async function createSubscriptionCharge(
  userId: string,
  tier: SubscriptionTier
): Promise<{ qrImage: string; chargeId: string; amount: number }> {
  // Free tier should not reach here, but adding safety check
  if (tier !== SubscriptionTier.STANDARD && tier !== SubscriptionTier.PREMIUM) {
    throw new Error('Invalid subscription tier');
  }

  const amount = tier === SubscriptionTier.PREMIUM ? 8900 : 4900; // THB in Satang
  
  console.log(`💳 [OMISE] Creating PromptPay charge for User ${userId} | Tier: ${tier} | Amount: ${amount} Satang`);
  
  // Create Charge with Source type promptpay
  const charge = await omise.charges.create({
    amount,
    currency: 'thb',
    source: {
      type: 'promptpay',
      amount,
      currency: 'thb',
    },
    metadata: { 
      user_id: userId, 
      tier: tier 
    }
  });

  const qrImage = charge.source?.scannable_code?.image?.download_uri;
  if (!qrImage || !charge.expires_at) {
    throw new Error('Omise did not return a usable PromptPay QR code');
  }

  const { error } = await supabase.from('payment_transactions').insert({
    user_id: userId,
    omise_charge_id: charge.id,
    tier,
    amount,
    currency: 'thb',
    expires_at: charge.expires_at,
  });
  if (error) throw new Error(`Failed to persist payment transaction: ${error.message}`);

  return {
    qrImage,
    chargeId: charge.id,
    amount: amount / 100 // Convert back to THB for frontend display
  };
}

/**
 * Handle Omise Webhook for successful payments.
 */
export async function handlePaymentWebhook(
  payload: any
): Promise<void> {
  const chargeId = typeof payload?.data?.id === 'string' ? payload.data.id : null;
  if (payload?.object !== 'event' || !chargeId) {
    throw new Error('Invalid Omise webhook payload');
  }

  // Retrieve the charge using the secret key. Do not trust any charge fields
  // in the inbound webhook body.
  const charge = await omise.charges.retrieve(chargeId);
  if (charge.status !== 'successful' || charge.currency.toLowerCase() !== 'thb') return;

  const { data: payment, error } = await supabase
    .from('payment_transactions')
    .select('user_id, tier, amount, currency, status')
    .eq('omise_charge_id', charge.id)
    .single();

  if (error || !payment || payment.status !== 'pending') return;
  if (!isExpectedPaymentCharge(charge, payment)) {
    throw new Error(`Charge ${charge.id} does not match its payment transaction`);
  }
  if (charge.metadata?.user_id !== payment.user_id || charge.metadata?.tier !== payment.tier) {
    throw new Error(`Charge ${charge.id} metadata does not match its payment transaction`);
  }

  const { data: completed, error: completeError } = await supabase
    .rpc('complete_payment_transaction', { target_charge_id: charge.id });
  if (completeError) throw new Error(`Failed to complete payment transaction: ${completeError.message}`);

  if (completed) console.log(`Payment success for charge ${charge.id}`);
}
