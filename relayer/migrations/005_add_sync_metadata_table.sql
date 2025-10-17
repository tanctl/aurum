CREATE TABLE IF NOT EXISTS sync_metadata (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL UNIQUE,
    last_synced_block BIGINT NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_method VARCHAR(50) DEFAULT 'hypersync'
);

INSERT INTO sync_metadata (chain_id, last_synced_block, last_synced_at, sync_method)
VALUES 
    (11155111, 0, NOW(), 'hypersync'),
    (84532, 0, NOW(), 'hypersync')
ON CONFLICT (chain_id) DO NOTHING;

DROP INDEX IF EXISTS idx_executions_transaction_hash;
CREATE UNIQUE INDEX IF NOT EXISTS idx_executions_transaction_hash ON executions(transaction_hash);
