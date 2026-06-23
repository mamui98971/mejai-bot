-- Durable payment state. Omise webhook bodies are never trusted as the
-- authority for user/tier/amount; this table records server-created charges.
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    omise_charge_id VARCHAR NOT NULL UNIQUE,
    tier VARCHAR NOT NULL CHECK (tier IN ('standard', 'premium')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency VARCHAR NOT NULL DEFAULT 'thb',
    status VARCHAR NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'successful', 'expired', 'failed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_pending
    ON payment_transactions (omise_charge_id, status);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON payment_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- One atomic state transition prevents repeated webhooks from extending a
-- subscription more than once.
CREATE OR REPLACE FUNCTION complete_payment_transaction(target_charge_id VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    payment payment_transactions%ROWTYPE;
BEGIN
    SELECT * INTO payment
    FROM payment_transactions
    WHERE omise_charge_id = target_charge_id
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE payment_transactions
    SET status = 'successful', processed_at = NOW()
    WHERE id = payment.id;

    UPDATE users
    SET subscription_tier = payment.tier,
        subscription_expiry = GREATEST(COALESCE(subscription_expiry, NOW()), NOW()) + INTERVAL '1 month'
    WHERE id = payment.user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
