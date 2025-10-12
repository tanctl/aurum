CREATE TABLE intent_cache (
    id BIGSERIAL PRIMARY KEY,
    subscription_intent JSONB NOT NULL,
    signature TEXT NOT NULL,
    subscription_id VARCHAR(66) NOT NULL,
    subscriber VARCHAR(42) NOT NULL,
    merchant VARCHAR(42) NOT NULL,
    amount TEXT NOT NULL,
    interval_seconds BIGINT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    max_payments BIGINT NOT NULL,
    max_total_amount TEXT NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    nonce BIGINT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL,
    chain VARCHAR(20) NOT NULL
);

CREATE INDEX idx_intent_cache_processed ON intent_cache(processed);
CREATE INDEX idx_intent_cache_subscription_id ON intent_cache(subscription_id);
CREATE INDEX idx_intent_cache_subscriber ON intent_cache(subscriber);
CREATE INDEX idx_intent_cache_merchant ON intent_cache(merchant);
CREATE INDEX idx_intent_cache_chain ON intent_cache(chain);
CREATE INDEX idx_intent_cache_expiry ON intent_cache(expiry);
CREATE INDEX idx_intent_cache_created_at ON intent_cache(created_at);
CREATE INDEX idx_intent_cache_unprocessed ON intent_cache(processed, chain, expiry) WHERE processed = FALSE;

-- jsonb query optimization
CREATE INDEX idx_intent_cache_subscription_intent ON intent_cache USING GIN (subscription_intent);

-- prevent duplicate intents
CREATE UNIQUE INDEX idx_intent_cache_unique_intent ON intent_cache(subscription_id, signature);