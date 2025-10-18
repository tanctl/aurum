DROP INDEX IF EXISTS idx_subscriptions_token;

ALTER TABLE subscriptions
    RENAME COLUMN token TO token_address;

ALTER TABLE subscriptions
    ALTER COLUMN token_address SET DEFAULT '0x0000000000000000000000000000000000000000';

UPDATE subscriptions
SET token_address = '0x0000000000000000000000000000000000000000'
WHERE token_address IS NULL OR token_address = '';

ALTER TABLE executions
    ADD COLUMN IF NOT EXISTS token_address VARCHAR(42);

CREATE INDEX IF NOT EXISTS idx_subscriptions_token ON subscriptions(token_address);
