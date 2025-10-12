use super::models::{Subscription, Execution, IntentCache};
use crate::error::{RelayerError, Result};
use sqlx::{PgPool, Row, query, query_as};
use tracing::{info, warn};

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
        
        let subscription = query_as::<_, Subscription>(
            "SELECT * FROM subscriptions WHERE id = $1"
        )
        .bind(subscription_id)
        .fetch_optional(&self.pool)
        .await?;

        match &subscription {
            Some(_) => info!("found subscription: {}", subscription_id),
            None => warn!("subscription not found: {}", subscription_id),
        }

        Ok(subscription)
    }

    pub async fn get_due_subscriptions(&self, chain: &str, limit: i64) -> Result<Vec<Subscription>> {
        info!("fetching due subscriptions for chain: {}, limit: {}", chain, limit);
        
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
            "#
        )
        .bind(chain)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        info!("found {} due subscriptions for chain: {}", subscriptions.len(), chain);
        Ok(subscriptions)
    }

    pub async fn update_subscription_status(&self, subscription_id: &str, status: &str) -> Result<()> {
        info!("updating subscription {} status to: {}", subscription_id, status);
        
        let result = query(
            "UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2"
        )
        .bind(status)
        .bind(subscription_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to update: {}", subscription_id);
            return Err(RelayerError::NotFound(format!("subscription not found: {}", subscription_id)));
        }

        info!("successfully updated subscription {} status to: {}", subscription_id, status);
        Ok(())
    }

    pub async fn increment_payment_count(&self, subscription_id: &str, amount_paid: &str) -> Result<()> {
        info!("incrementing payment count for subscription: {}", subscription_id);
        
        // first get the current subscription to calculate next payment due
        let subscription = self.get_subscription(subscription_id).await?
            .ok_or_else(|| RelayerError::NotFound(format!("subscription not found: {}", subscription_id)))?;

        // calculate next payment due time
        let next_payment_due = subscription.start_time + 
            chrono::Duration::seconds((subscription.executed_payments + 1) * subscription.interval_seconds);

        let result = query(
            r#"
            UPDATE subscriptions 
            SET executed_payments = executed_payments + 1,
                total_paid = (total_paid::numeric + $2::numeric)::text,
                next_payment_due = $3,
                updated_at = NOW()
            WHERE id = $1
            "#
        )
        .bind(subscription_id)
        .bind(amount_paid)
        .bind(next_payment_due)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to increment: {}", subscription_id);
            return Err(RelayerError::NotFound(format!("subscription not found: {}", subscription_id)));
        }

        info!("successfully incremented payment count for subscription: {}", subscription_id);
        Ok(())
    }

    pub async fn increment_failure_count(&self, subscription_id: &str) -> Result<()> {
        info!("incrementing failure count for subscription: {}", subscription_id);
        
        let result = query(
            "UPDATE subscriptions SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = $1"
        )
        .bind(subscription_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no subscription found to increment failure count: {}", subscription_id);
            return Err(RelayerError::NotFound(format!("subscription not found: {}", subscription_id)));
        }

        info!("successfully incremented failure count for subscription: {}", subscription_id);
        Ok(())
    }

    // execution queries
    pub async fn insert_execution(&self, execution: &Execution) -> Result<i64> {
        info!("inserting execution for subscription: {}", execution.subscription_id);
        
        let row = query(
            r#"
            INSERT INTO executions (
                subscription_id, relayer_address, payment_number, amount_paid,
                protocol_fee, merchant_amount, transaction_hash, block_number,
                gas_used, gas_price, status, error_message, executed_at, chain
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id
            "#
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

    pub async fn get_merchant_executions(&self, merchant: &str, limit: i64) -> Result<Vec<Execution>> {
        info!("fetching executions for merchant: {}, limit: {}", merchant, limit);
        
        let executions = query_as::<_, Execution>(
            r#"
            SELECT e.* FROM executions e
            JOIN subscriptions s ON e.subscription_id = s.id
            WHERE s.merchant = $1
            ORDER BY e.executed_at DESC
            LIMIT $2
            "#
        )
        .bind(merchant)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        info!("found {} executions for merchant: {}", executions.len(), merchant);
        Ok(executions)
    }

    pub async fn get_executions_by_subscription(&self, subscription_id: &str) -> Result<Vec<Execution>> {
        info!("fetching executions for subscription: {}", subscription_id);
        
        let executions = query_as::<_, Execution>(
            "SELECT * FROM executions WHERE subscription_id = $1 ORDER BY payment_number ASC"
        )
        .bind(subscription_id)
        .fetch_all(&self.pool)
        .await?;

        info!("found {} executions for subscription: {}", executions.len(), subscription_id);
        Ok(executions)
    }

    pub async fn update_execution_status(&self, execution_id: i64, status: &str, error_message: Option<&str>) -> Result<()> {
        info!("updating execution {} status to: {}", execution_id, status);
        
        let result = query(
            "UPDATE executions SET status = $1, error_message = $2 WHERE id = $3"
        )
        .bind(status)
        .bind(error_message)
        .bind(execution_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no execution found to update: {}", execution_id);
            return Err(RelayerError::NotFound(format!("execution not found: {}", execution_id)));
        }

        info!("successfully updated execution {} status to: {}", execution_id, status);
        Ok(())
    }

    // intent cache queries
    pub async fn cache_intent(&self, intent: &IntentCache) -> Result<i64> {
        info!("caching intent for subscription: {}", intent.subscription_id);
        
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
            "#
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
        info!("fetching cached intent for subscription: {}", subscription_id);
        
        let intent = query_as::<_, IntentCache>(
            "SELECT * FROM intent_cache WHERE subscription_id = $1 ORDER BY created_at DESC LIMIT 1"
        )
        .bind(subscription_id)
        .fetch_optional(&self.pool)
        .await?;

        match &intent {
            Some(_) => info!("found cached intent for subscription: {}", subscription_id),
            None => warn!("no cached intent found for subscription: {}", subscription_id),
        }

        Ok(intent)
    }

    pub async fn get_unprocessed_intents(&self, chain: &str, limit: i64) -> Result<Vec<IntentCache>> {
        info!("fetching unprocessed intents for chain: {}, limit: {}", chain, limit);
        
        let intents = query_as::<_, IntentCache>(
            r#"
            SELECT * FROM intent_cache 
            WHERE processed = false 
            AND chain = $1
            AND expiry > NOW()
            ORDER BY created_at ASC
            LIMIT $2
            "#
        )
        .bind(chain)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        info!("found {} unprocessed intents for chain: {}", intents.len(), chain);
        Ok(intents)
    }

    pub async fn mark_intent_processed(&self, intent_id: i64) -> Result<()> {
        info!("marking intent {} as processed", intent_id);
        
        let result = query(
            "UPDATE intent_cache SET processed = true, processed_at = NOW() WHERE id = $1"
        )
        .bind(intent_id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            warn!("no intent found to mark as processed: {}", intent_id);
            return Err(RelayerError::NotFound(format!("intent not found: {}", intent_id)));
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
            "#
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

        info!("subscription stats for chain {}: active={}, paused={}, total={}", chain, active, paused, total);
        Ok((active, paused, total))
    }

    pub async fn cleanup_expired_intents(&self) -> Result<i64> {
        info!("cleaning up expired intents");
        
        let result = query(
            "DELETE FROM intent_cache WHERE expiry < NOW() AND processed = false"
        )
        .execute(&self.pool)
        .await?;

        let deleted = result.rows_affected() as i64;
        info!("cleaned up {} expired intents", deleted);
        Ok(deleted)
    }
}