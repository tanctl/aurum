ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS avail_block_number BIGINT,
    ADD COLUMN IF NOT EXISTS avail_extrinsic_index BIGINT;

ALTER TABLE intent_cache
    ADD COLUMN IF NOT EXISTS avail_block_number BIGINT,
    ADD COLUMN IF NOT EXISTS avail_extrinsic_index BIGINT;
