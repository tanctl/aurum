CREATE TABLE subscriptions (
    id VARCHAR(66) PRIMARY KEY,
    subscriber VARCHAR(42) NOT NULL,
    merchant VARCHAR(42) NOT NULL,
    amount TEXT NOT NULL,
    interval_seconds BIGINT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    max_payments BIGINT NOT NULL,
    max_total_amount TEXT NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    nonce BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    executed_payments BIGINT NOT NULL DEFAULT 0,
    total_paid TEXT NOT NULL DEFAULT '0',
    next_payment_due TIMESTAMPTZ NOT NULL,
    failure_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain VARCHAR(20) NOT NULL
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_chain ON subscriptions(chain);
CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber);
CREATE INDEX idx_subscriptions_merchant ON subscriptions(merchant);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expiry);
CREATE INDEX idx_subscriptions_due_execution ON subscriptions(status, chain, expiry, executed_payments, max_payments);
CREATE INDEX idx_subscriptions_next_payment_due ON subscriptions(next_payment_due);
CREATE INDEX idx_subscriptions_due_payments ON subscriptions(status, next_payment_due, chain) WHERE status = 'ACTIVE';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();