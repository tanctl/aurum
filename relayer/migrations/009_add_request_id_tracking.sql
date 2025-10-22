ALTER TABLE intent_cache
    ADD COLUMN IF NOT EXISTS request_id VARCHAR(50);

-- ensure fast lookups and uniqueness on request identifiers when provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_intent_cache_unique_request_id
    ON intent_cache (request_id)
    WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intent_cache_request_id
    ON intent_cache (request_id)
    WHERE request_id IS NOT NULL;
