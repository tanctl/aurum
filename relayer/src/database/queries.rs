#![allow(clippy::needless_borrows_for_generic_args)]

use super::models::{Execution, ExecutionRecord, IntentCache, Subscription, SubscriptionStatus};
use crate::error::{RelayerError, Result};
use chrono::{DateTime, Utc};
use ethers::types::U256;
use sqlx::{query, query_as, PgPool, Row};
use tracing::{info, warn};

#[derive(Clone)]
pub struct Queries {
    pool: PgPool,
}

impl Queries {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // subscription queries
    pub async fn insert_subscription(&self, subscription: &Subscription) -> Result<String> {
        info!("inserting subscription with id: {}", subscription.id);

        query(
            r#"
            INSERT INTO subscriptions (
                id, subscriber, merchant, amount, interval_seconds, start_time,
                max_payments, max_total_amount, expiry, nonce, status,
                executed_payments, total_paid, next_payment_due, failure_count,
                created_at, updated_at, chain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            "#
        )
        .bind(&subscription.id)
        .bind(&subscription.subscriber)
        .bind(&subscription.merchant)
        .bind(&subscription.amount)
        .bind(&subscription.interval_seconds)
        .bind(&subscription.start_time)
        .bind(&subscription.max_payments)
        .bind(&subscription.max_total_amount)
        .bind(&subscription.expiry)
        .bind(&subscription.nonce)
        .bind(&subscription.status)
        .bind(&subscription.executed_payments)
        .bind(&subscription.total_paid)
        .bind(&subscription.next_payment_due)
        .bind(&subscription.failure_count)
        .bind(&subscription.created_at)
        .bind(&subscription.updated_at)
        .bind(&subscription.chain)
        .execute(&self.pool)
        .await?;

        info!("successfully inserted subscription: {}", subscription.id);
        Ok(subscription.id.clone())
    }

    pub async fn get_subscription(&self, subscription_id: &str) -> Result<Option<Subscription>> {
        info!("fetching subscription: {}", subscription_id);

        let subscription = query_as::<_, Subscription>("SELECT * FROM subscriptions WHERE id = $1")
            .bind(subscription_id)
            .fetch_optional(&self.pool)
            .await?;

        match &subscription {
            Some(_) => info!("found subscription: {}", subscription_id),
            None => warn!("subscription not found: {}", subscription_id),
        }

        Ok(subscription)
    }

    /// Check if a nonce has been used by this subscriber
    /// Returns true if nonce is already used (preventing replay attacks)
    pub async fn is_nonce_used(&self, subscriber: &str, nonce: i64) -> Result<bool> {
        info!(
            "checking nonce uniqueness for subscriber: {}, nonce: {}",
            subscriber, nonce
        );

        let result = query(
            "SELECT COUNT(*) as count FROM subscriptions WHERE subscriber = $1 AND nonce = $2",
        )
        .bind(subscriber)
        .bind(nonce)
        .fetch_one(&self.pool)
        .await?;

        let count: i64 = result.get("count");
        Ok(count > 0)
    }

    pub async fn get_due_subscriptions(&self) -> Result<Vec<Subscription>> {
        info!("fetching all due subscriptions");

        let subscriptions = query_as::<_, Subscription>(
            r#"
            SELECT * FROM subscriptions 
            WHERE status = 'ACTIVE' 
            AND expiry > NOW()
            AND executed_payments < max_payments
            AND next_payment_due <= NOW()
            ORDER BY next_payment_due ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        info!("found {} due subscriptions", subscriptions.len());
        Ok(subscriptions)
    }

    pub async fn get_due_subscriptions_for_chain(
        &self,
        chain: &str,
        limit: i64,
    ) -> Result<Vec<Subscription>> {
        info!(
            "fetching due subscriptions for chain: {}, limit: {}",
            chain, limit
        );

        let subscriptions = query_as::<_, Subscription>(
            r#"
            SELECT * FROM subscriptions 
            WHERE status = 'ACTIVE' 
            AND chain = $1
            AND expiry > NOW()
            AND executed_payments < max_payments
            AND next_payment_due <= NOW()
            ORDER BY next_payment_due ASC
            LIMIT $2
            "#,
        )
        .bind(chain)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        info!(
            "found {} due subscriptions for chain: {}",
            subscriptions.len(),
            chain
        );
        Ok(subscriptions)
    }

    pub async fn update_subscription_status(
        &self,
        subscription_id: &str,
        status: &str,
    ) -> Result<()> {
        info!(
            "updating subscription {} status to: {}",
            subscription_id, status
        );

        let result =
            query("UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2")
                .bind(status)
                .bind(subscription_id)
                .execute(&self.pool)
                .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to update: {}", subscription_id);
            return Err(RelayerError::NotFound(format!(
                "subscription not found: {}",
                subscription_id
            )));
        }

        info!(
            "successfully updated subscription {} status to: {}",
            subscription_id, status
        );
        Ok(())
    }

    pub async fn increment_payment_count(
        &self,
        subscription_id: &str,
        amount_paid: &str,
    ) -> Result<()> {
        info!(
            "incrementing payment count for subscription: {}",
            subscription_id
        );

        // first get the current subscription to calculate next payment due
        let subscription = self
            .get_subscription(subscription_id)
            .await?
            .ok_or_else(|| {
                RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
            })?;

        // calculate next payment due time
        let next_payment_due = subscription.start_time
            + chrono::Duration::seconds(
                (subscription.executed_payments + 1) * subscription.interval_seconds,
            );

        let result = query(
            r#"
            UPDATE subscriptions 
            SET executed_payments = executed_payments + 1,
                total_paid = (total_paid::numeric + $2::numeric)::text,
                next_payment_due = $3,
                updated_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(subscription_id)
        .bind(amount_paid)
        .bind(next_payment_due)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to increment: {}", subscription_id);
            return Err(RelayerError::NotFound(format!(
                "subscription not found: {}",
                subscription_id
            )));
        }

        info!(
            "successfully incremented payment count for subscription: {}",
            subscription_id
        );
        Ok(())
    }

    pub async fn increment_failure_count(&self, subscription_id: &str) -> Result<()> {
        info!(
            "incrementing failure count for subscription: {}",
            subscription_id
        );

        let result = query(
            "UPDATE subscriptions SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = $1"
        )
        .bind(subscription_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!(
                "no subscription found to increment failure count: {}",
                subscription_id
            );
            return Err(RelayerError::NotFound(format!(
                "subscription not found: {}",
                subscription_id
            )));
        }

        info!(
            "successfully incremented failure count for subscription: {}",
            subscription_id
        );
        Ok(())
    }

    // execution queries
    pub async fn insert_execution(&self, execution: &Execution) -> Result<i64> {
        info!(
            "inserting execution for subscription: {}",
            execution.subscription_id
        );

        let row = query(
            r#"
            INSERT INTO executions (
                subscription_id, relayer_address, payment_number, amount_paid,
                protocol_fee, merchant_amount, transaction_hash, block_number,
                gas_used, gas_price, status, error_message, executed_at, chain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
            "#,
        )
        .bind(&execution.subscription_id)
        .bind(&execution.relayer_address)
        .bind(&execution.payment_number)
        .bind(&execution.amount_paid)
        .bind(&execution.protocol_fee)
        .bind(&execution.merchant_amount)
        .bind(&execution.transaction_hash)
        .bind(&execution.block_number)
        .bind(&execution.gas_used)
        .bind(&execution.gas_price)
        .bind(&execution.status)
        .bind(&execution.error_message)
        .bind(&execution.executed_at)
        .bind(&execution.chain)
        .fetch_one(&self.pool)
        .await?;

        let id: i64 = row.get("id");
        info!("successfully inserted execution with id: {}", id);
        Ok(id)
    }

    pub async fn get_merchant_executions(
        &self,
        merchant: &str,
        limit: i64,
    ) -> Result<Vec<Execution>> {
        info!(
            "fetching executions for merchant: {}, limit: {}",
            merchant, limit
        );

        let executions = query_as::<_, Execution>(
            r#"
            SELECT e.* FROM executions e
            JOIN subscriptions s ON e.subscription_id = s.id
            WHERE s.merchant = $1
            ORDER BY e.executed_at DESC
            LIMIT $2
            "#,
        )
        .bind(merchant)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        info!(
            "found {} executions for merchant: {}",
            executions.len(),
            merchant
        );
        Ok(executions)
    }

    pub async fn get_executions_by_subscription(
        &self,
        subscription_id: &str,
    ) -> Result<Vec<Execution>> {
        info!("fetching executions for subscription: {}", subscription_id);

        let executions = query_as::<_, Execution>(
            "SELECT * FROM executions WHERE subscription_id = $1 ORDER BY payment_number ASC",
        )
        .bind(subscription_id)
        .fetch_all(&self.pool)
        .await?;

        info!(
            "found {} executions for subscription: {}",
            executions.len(),
            subscription_id
        );
        Ok(executions)
    }

    pub async fn update_execution_status(
        &self,
        execution_id: i64,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<()> {
        info!("updating execution {} status to: {}", execution_id, status);

        let result = query("UPDATE executions SET status = $1, error_message = $2 WHERE id = $3")
            .bind(status)
            .bind(error_message)
            .bind(execution_id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            warn!("no execution found to update: {}", execution_id);
            return Err(RelayerError::NotFound(format!(
                "execution not found: {}",
                execution_id
            )));
        }

        info!(
            "successfully updated execution {} status to: {}",
            execution_id, status
        );
        Ok(())
    }

    // intent cache queries
    pub async fn cache_intent(&self, intent: &IntentCache) -> Result<i64> {
        info!(
            "caching intent for subscription: {}",
            intent.subscription_id
        );

        // use upsert (ON CONFLICT) to handle duplicate intents
        let row = query(
            r#"
            INSERT INTO intent_cache (
                subscription_intent, signature, subscription_id, subscriber, merchant,
                amount, interval_seconds, start_time, max_payments, max_total_amount,
                expiry, nonce, processed, created_at, processed_at, chain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (subscription_id, signature) 
            DO UPDATE SET 
                subscription_intent = EXCLUDED.subscription_intent,
                created_at = EXCLUDED.created_at
            RETURNING id
            "#,
        )
        .bind(&intent.subscription_intent)
        .bind(&intent.signature)
        .bind(&intent.subscription_id)
        .bind(&intent.subscriber)
        .bind(&intent.merchant)
        .bind(&intent.amount)
        .bind(&intent.interval_seconds)
        .bind(&intent.start_time)
        .bind(&intent.max_payments)
        .bind(&intent.max_total_amount)
        .bind(&intent.expiry)
        .bind(&intent.nonce)
        .bind(&intent.processed)
        .bind(&intent.created_at)
        .bind(&intent.processed_at)
        .bind(&intent.chain)
        .fetch_one(&self.pool)
        .await?;

        let id: i64 = row.get("id");
        info!("successfully cached intent with id: {}", id);
        Ok(id)
    }

    pub async fn get_cached_intent(&self, subscription_id: &str) -> Result<Option<IntentCache>> {
        info!(
            "fetching cached intent for subscription: {}",
            subscription_id
        );

        let intent = query_as::<_, IntentCache>(
            "SELECT * FROM intent_cache WHERE subscription_id = $1 ORDER BY created_at DESC LIMIT 1"
        )
        .bind(subscription_id)
        .fetch_optional(&self.pool)
        .await?;

        match &intent {
            Some(_) => info!("found cached intent for subscription: {}", subscription_id),
            None => warn!(
                "no cached intent found for subscription: {}",
                subscription_id
            ),
        }

        Ok(intent)
    }

    pub async fn get_unprocessed_intents(
        &self,
        chain: &str,
        limit: i64,
    ) -> Result<Vec<IntentCache>> {
        info!(
            "fetching unprocessed intents for chain: {}, limit: {}",
            chain, limit
        );

        let intents = query_as::<_, IntentCache>(
            r#"
            SELECT * FROM intent_cache 
            WHERE processed = false 
            AND chain = $1
            AND expiry > NOW()
            ORDER BY created_at ASC
            LIMIT $2
            "#,
        )
        .bind(chain)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        info!(
            "found {} unprocessed intents for chain: {}",
            intents.len(),
            chain
        );
        Ok(intents)
    }

    pub async fn mark_intent_processed(&self, intent_id: i64) -> Result<()> {
        info!("marking intent {} as processed", intent_id);

        let result =
            query("UPDATE intent_cache SET processed = true, processed_at = NOW() WHERE id = $1")
                .bind(intent_id)
                .execute(&self.pool)
                .await?;

        if result.rows_affected() == 0 {
            warn!("no intent found to mark as processed: {}", intent_id);
            return Err(RelayerError::NotFound(format!(
                "intent not found: {}",
                intent_id
            )));
        }

        info!("successfully marked intent {} as processed", intent_id);
        Ok(())
    }

    // utility queries
    pub async fn get_subscription_stats(&self, chain: &str) -> Result<(i64, i64, i64)> {
        info!("fetching subscription stats for chain: {}", chain);

        let row = query(
            r#"
            SELECT 
                COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
                COUNT(*) FILTER (WHERE status = 'PAUSED') as paused_count,
                COUNT(*) as total_count
            FROM subscriptions 
            WHERE chain = $1
            "#,
        )
        .bind(chain)
        .fetch_one(&self.pool)
        .await?;

        let active: Option<i64> = row.get("active_count");
        let paused: Option<i64> = row.get("paused_count");
        let total: Option<i64> = row.get("total_count");

        let active = active.unwrap_or(0);
        let paused = paused.unwrap_or(0);
        let total = total.unwrap_or(0);

        info!(
            "subscription stats for chain {}: active={}, paused={}, total={}",
            chain, active, paused, total
        );
        Ok((active, paused, total))
    }

    pub async fn cleanup_expired_intents(&self) -> Result<i64> {
        info!("cleaning up expired intents");

        let result = query("DELETE FROM intent_cache WHERE expiry < NOW() AND processed = false")
            .execute(&self.pool)
            .await?;

        let deleted = result.rows_affected() as i64;
        info!("cleaned up {} expired intents", deleted);
        Ok(deleted)
    }

    // new method for safe batch processing with limits
    pub async fn get_due_subscriptions_with_limit(
        &self,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Subscription>> {
        info!(
            "fetching due subscriptions with limit: {}, offset: {}",
            limit, offset
        );

        let subscriptions = query_as::<_, Subscription>(
            r#"
            SELECT * FROM subscriptions 
            WHERE status = 'ACTIVE' 
            AND expiry > NOW()
            AND executed_payments < max_payments
            AND next_payment_due <= NOW()
            AND length(id) <= 66  -- DoS protection: limit id length
            ORDER BY next_payment_due ASC, id ASC  -- deterministic ordering
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        info!(
            "found {} due subscriptions (limit: {}, offset: {})",
            subscriptions.len(),
            limit,
            offset
        );
        Ok(subscriptions)
    }

    // validate subscription id format in database
    pub async fn validate_subscription_id_format(&self, subscription_id: &str) -> Result<bool> {
        // validate that subscription id is proper hex format
        if !subscription_id.starts_with("0x") || subscription_id.len() != 66 {
            return Ok(false);
        }

        // check if all characters after 0x are valid hex
        let hex_part = &subscription_id[2..];
        if !hex_part.chars().all(|c| c.is_ascii_hexdigit()) {
            return Ok(false);
        }

        Ok(true)
    }

    // synchronize subscription state with blockchain
    pub async fn sync_subscription_with_blockchain(
        &self,
        subscription_id: &str,
        on_chain_payments: i64,
        on_chain_status: &str,
        on_chain_nonce: i64,
    ) -> Result<()> {
        info!(
            "syncing subscription {} with blockchain state",
            subscription_id
        );

        let result = query(
            r#"
            UPDATE subscriptions 
            SET executed_payments = $1,
                status = $2,
                nonce = $3,
                updated_at = NOW()
            WHERE id = $4
            "#,
        )
        .bind(on_chain_payments)
        .bind(on_chain_status)
        .bind(on_chain_nonce)
        .bind(subscription_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to sync: {}", subscription_id);
            return Err(RelayerError::NotFound(format!(
                "subscription not found: {}",
                subscription_id
            )));
        }

        info!(
            "successfully synced subscription {} with blockchain",
            subscription_id
        );
        Ok(())
    }

    pub async fn insert_execution_record(&self, execution_record: &ExecutionRecord) -> Result<()> {
        info!(
            "inserting execution record for subscription: {}",
            execution_record.subscription_id
        );

        query(
            r#"
            INSERT INTO executions (
                subscription_id, relayer_address, payment_number, amount_paid,
                protocol_fee, merchant_amount, transaction_hash, block_number,
                gas_used, gas_price, status, executed_at, chain
            ) VALUES ($1, '', $2, $3, $4, '', $5, $6, $7, $8, 'SUCCESS', $9, $10)
            "#,
        )
        .bind(&execution_record.subscription_id)
        .bind(&execution_record.payment_number)
        .bind(&execution_record.payment_amount)
        .bind(&execution_record.fee_paid)
        .bind(&execution_record.transaction_hash)
        .bind(&execution_record.block_number)
        .bind(&execution_record.gas_used)
        .bind(&execution_record.gas_price)
        .bind(&execution_record.executed_at)
        .bind(&execution_record.chain)
        .execute(&self.pool)
        .await?;

        info!(
            "successfully inserted execution record for subscription: {}",
            execution_record.subscription_id
        );
        Ok(())
    }

    pub async fn update_subscription_after_payment(
        &self,
        subscription_id: &str,
        payments_made: i64,
        next_payment_time: DateTime<Utc>,
        failure_count: i64,
    ) -> Result<()> {
        info!(
            "updating subscription {} after payment: payments={}, next_payment={}, failures={}",
            subscription_id, payments_made, next_payment_time, failure_count
        );

        let result = query(
            r#"
            UPDATE subscriptions 
            SET executed_payments = $1,
                next_payment_due = $2,
                failure_count = $3,
                updated_at = NOW()
            WHERE id = $4
            "#,
        )
        .bind(payments_made)
        .bind(next_payment_time)
        .bind(failure_count)
        .bind(subscription_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to update: {}", subscription_id);
            return Err(RelayerError::NotFound(format!(
                "subscription not found: {}",
                subscription_id
            )));
        }

        info!(
            "successfully updated subscription {} after payment",
            subscription_id
        );
        Ok(())
    }

    pub async fn update_subscription_status_enum(
        &self,
        subscription_id: &str,
        status: SubscriptionStatus,
    ) -> Result<()> {
        self.update_subscription_status(subscription_id, &status.to_string())
            .await
    }

    // enhanced atomic transaction with better error handling and validation
    pub async fn record_execution_and_update_subscription(
        &self,
        execution_record: &ExecutionRecord,
        subscription_id: &str,
        new_payments_made: i64,
        next_payment_time: DateTime<Utc>,
        failure_count: i64,
    ) -> Result<()> {
        info!(
            "recording execution and updating subscription in transaction for {}",
            subscription_id
        );

        // validate inputs to prevent corruption
        if execution_record.subscription_id != subscription_id {
            return Err(RelayerError::Validation(
                "execution record subscription id mismatch".to_string(),
            ));
        }

        if new_payments_made < 0 || failure_count < 0 {
            return Err(RelayerError::Validation(
                "negative payment count or failure count".to_string(),
            ));
        }

        let mut tx = self.pool.begin().await.map_err(|e| {
            RelayerError::DatabaseError(format!("failed to begin transaction: {}", e))
        })?;

        // check subscription exists and get current state for validation
        let current_subscription =
            query_as::<_, Subscription>("SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE")
                .bind(subscription_id)
                .fetch_optional(&mut *tx)
                .await?
                .ok_or_else(|| {
                    RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
                })?;

        // validate payment increment is correct
        if new_payments_made != current_subscription.executed_payments + 1 {
            return Err(RelayerError::Validation(
                "invalid payment count increment".to_string(),
            ));
        }

        // insert execution record with comprehensive data
        query(
            r#"
            INSERT INTO executions (
                subscription_id, relayer_address, payment_number, amount_paid,
                protocol_fee, merchant_amount, transaction_hash, block_number,
                gas_used, gas_price, status, executed_at, chain
            ) VALUES ($1, '', $2, $3, $4, '', $5, $6, $7, $8, 'SUCCESS', $9, $10)
            "#,
        )
        .bind(&execution_record.subscription_id)
        .bind(&execution_record.payment_number)
        .bind(&execution_record.payment_amount)
        .bind(&execution_record.fee_paid)
        .bind(&execution_record.transaction_hash)
        .bind(&execution_record.block_number)
        .bind(&execution_record.gas_used)
        .bind(&execution_record.gas_price)
        .bind(&execution_record.executed_at)
        .bind(&execution_record.chain)
        .execute(&mut *tx)
        .await?;

        // update subscription with total_paid calculation
        let new_total_paid: U256 = current_subscription
            .total_paid
            .parse::<U256>()
            .map_err(|_| RelayerError::Validation("invalid current total_paid format".to_string()))?
            .checked_add(
                execution_record
                    .payment_amount
                    .parse::<U256>()
                    .map_err(|_| {
                        RelayerError::Validation("invalid payment amount format".to_string())
                    })?,
            )
            .ok_or_else(|| {
                RelayerError::Validation("total_paid calculation overflow".to_string())
            })?;

        let result = query(
            r#"
            UPDATE subscriptions 
            SET executed_payments = $1,
                total_paid = $2,
                next_payment_due = $3,
                failure_count = $4,
                updated_at = NOW()
            WHERE id = $5
            "#,
        )
        .bind(new_payments_made)
        .bind(new_total_paid.to_string())
        .bind(next_payment_time)
        .bind(failure_count)
        .bind(subscription_id)
        .execute(&mut *tx)
        .await?;

        if result.rows_affected() == 0 {
            return Err(RelayerError::NotFound(format!(
                "subscription not found during update: {}",
                subscription_id
            )));
        }

        tx.commit().await.map_err(|e| {
            RelayerError::DatabaseError(format!("failed to commit transaction: {}", e))
        })?;

        info!(
            "successfully recorded execution and updated subscription for {}",
            subscription_id
        );
        Ok(())
    }
}
