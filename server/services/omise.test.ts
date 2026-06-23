import { describe, expect, it } from 'vitest';
import { isExpectedPaymentCharge } from './omise';

const payment = { user_id: 'user-1', tier: 'premium', amount: 8900, currency: 'thb' };

describe('isExpectedPaymentCharge', () => {
  it('accepts only a charge that matches the server-created transaction', () => {
    expect(isExpectedPaymentCharge({ amount: 8900, currency: 'THB', metadata: { user_id: 'user-1', tier: 'premium' } }, payment)).toBe(true);
  });

  it.each([
    { amount: 4900, currency: 'thb', metadata: { user_id: 'user-1', tier: 'premium' } },
    { amount: 8900, currency: 'thb', metadata: { user_id: 'user-2', tier: 'premium' } },
    { amount: 8900, currency: 'thb', metadata: { user_id: 'user-1', tier: 'standard' } },
  ])('rejects a mismatched amount or ownership record', (charge) => {
    expect(isExpectedPaymentCharge(charge, payment)).toBe(false);
  });
});
