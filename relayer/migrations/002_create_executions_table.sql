CREATE TABLE executions (
    id BIGSERIAL PRIMARY KEY,
    subscription_id VARCHAR(66) NOT NULL REFERENCES subscriptions(id),
    relayer_address VARCHAR(42) NOT NULL,
    payment_number BIGINT NOT NULL,
    amount_paid TEXT NOT NULL,
    protocol_fee TEXT NOT NULL,
    merchant_amount TEXT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    gas_used TEXT NOT NULL,
    gas_price TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain VARCHAR(20) NOT NULL
);

CREATE INDEX idx_executions_subscription_id ON executions(subscription_id);
CREATE INDEX idx_executions_relayer_address ON executions(relayer_address);
CREATE INDEX idx_executions_transaction_hash ON executions(transaction_hash);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_chain ON executions(chain);
CREATE INDEX idx_executions_executed_at ON executions(executed_at);
CREATE INDEX idx_executions_payment_number ON executions(subscription_id, payment_number);

-- prevent duplicate successful payments
CREATE UNIQUE INDEX idx_executions_unique_payment ON executions(subscription_id, payment_number) WHERE status = 'SUCCESS';