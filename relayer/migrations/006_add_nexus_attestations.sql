ALTER TABLE executions
    ADD COLUMN IF NOT EXISTS nexus_attestation_id VARCHAR(66),
    ADD COLUMN IF NOT EXISTS nexus_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS nexus_submitted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS cross_chain_verifications (
    id SERIAL PRIMARY KEY,
    subscription_id VARCHAR(66) NOT NULL,
    source_chain_id INTEGER NOT NULL,
    query_chain_id INTEGER NOT NULL,
    attestation_id VARCHAR(66),
    verified BOOLEAN DEFAULT false,
    queried_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cross_chain_verifications_subscription
    ON cross_chain_verifications (subscription_id, source_chain_id);
