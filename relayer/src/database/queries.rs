#![allow(clippy::needless_borrows_for_generic_args)]

use super::{
    models::{
        CrossChainVerificationRecord, Execution, ExecutionRecord, IntentCache,
        PendingNexusAttestation, Subscription, SubscriptionStatus, SyncMetadata,
    },
    StubStorage,
};
use crate::error::{RelayerError, Result};
use chrono::{DateTime, Utc};
use ethers::types::U256;
use sqlx::{types::BigDecimal, PgPool};
use std::{str::FromStr, sync::Arc};
use tracing::{info, warn};

#[derive(Clone)]
pub struct Queries {
    pool: Option<PgPool>,
    stub: Option<Arc<StubStorage>>,
}

impl Queries {
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool: Some(pool),
            stub: None,
        }
    }

    pub(crate) fn new_stub(storage: Arc<StubStorage>) -> Self {
        Self {
            pool: None,
            stub: Some(storage),
        }
    }

    fn postgres_pool(&self) -> Option<&PgPool> {
        self.pool.as_ref()
    }

    fn stub_storage(&self) -> Option<&Arc<StubStorage>> {
        self.stub.as_ref()
    }

    fn require_postgres(&self, method: &str) -> Result<&PgPool> {
        self.postgres_pool().ok_or_else(|| {
            RelayerError::InternalError(format!(
                "{} requires a postgres connection (stub mode unsupported)",
                method
            ))
        })
    }

    // subscription queries
    pub async fn insert_subscription(&self, subscription: &Subscription) -> Result<String> {
        info!("inserting subscription with id: {}", subscription.id);

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            subscriptions.insert(subscription.id.clone(), subscription.clone());
            info!(
                "successfully inserted subscription: {} (stub)",
                subscription.id
            );
            return Ok(subscription.id.clone());
        }

        let pool = self.require_postgres("insert_subscription")?;
        let record = subscription.clone();

        sqlx::query!(
            r#"
            INSERT INTO subscriptions (
                id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                token,
                status,
                executed_payments,
                total_paid,
                next_payment_due,
                failure_count,
                created_at,
                updated_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            ) VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20,
                $21
            )
            "#,
            record.id,
            record.subscriber,
            record.merchant,
            record.amount,
            record.interval_seconds,
            record.start_time,
            record.max_payments,
            record.max_total_amount,
            record.expiry,
            record.nonce,
            record.token,
            record.status,
            record.executed_payments,
            record.total_paid,
            record.next_payment_due,
            record.failure_count,
            record.created_at,
            record.updated_at,
            record.chain,
            record.avail_block_number,
            record.avail_extrinsic_index
        )
        .execute(pool)
        .await?;

        info!("successfully inserted subscription: {}", subscription.id);
        Ok(subscription.id.clone())
    }

    pub async fn get_subscription(&self, subscription_id: &str) -> Result<Option<Subscription>> {
        info!("fetching subscription: {}", subscription_id);

        if let Some(storage) = self.stub_storage() {
            let subscriptions = storage.subscriptions.lock().unwrap();
            let result = subscriptions.get(subscription_id).cloned();
            match &result {
                Some(_) => info!("found subscription: {} (stub)", subscription_id),
                None => warn!("subscription not found: {} (stub)", subscription_id),
            }
            return Ok(result);
        }

        let pool = self.require_postgres("get_subscription")?;

        let subscription = sqlx::query_as!(
            Subscription,
            r#"
            SELECT
                id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                token,
                status,
                executed_payments,
                total_paid,
                next_payment_due,
                failure_count,
                created_at,
                updated_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM subscriptions
            WHERE id = $1
            "#,
            subscription_id
        )
        .fetch_optional(pool)
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

        if let Some(storage) = self.stub_storage() {
            let subscriptions = storage.subscriptions.lock().unwrap();
            let used = subscriptions
                .values()
                .any(|sub| sub.subscriber == subscriber && sub.nonce == nonce);
            return Ok(used);
        }

        let pool = self.require_postgres("is_nonce_used")?;

        let result = sqlx::query!(
            r#"SELECT COUNT(*) AS "count!" FROM subscriptions WHERE subscriber = $1 AND nonce = $2"#,
            subscriber,
            nonce
        )
        .fetch_one(pool)
        .await?;

        Ok(result.count > 0)
    }

    pub async fn get_due_subscriptions(&self) -> Result<Vec<Subscription>> {
        info!("fetching all due subscriptions");

        if let Some(storage) = self.stub_storage() {
            let now = Utc::now();
            let subscriptions = storage.subscriptions.lock().unwrap();
            let mut results: Vec<Subscription> = subscriptions
                .values()
                .filter(|sub| {
                    sub.status == "ACTIVE"
                        && sub.expiry > now
                        && sub.executed_payments < sub.max_payments
                        && sub.next_payment_due <= now
                })
                .cloned()
                .collect();
            results.sort_by_key(|sub| sub.next_payment_due);
            info!("found {} due subscriptions (stub)", results.len());
            return Ok(results);
        }

        let pool = self.require_postgres("get_due_subscriptions")?;

        let subscriptions = sqlx::query_as!(
            Subscription,
            r#"
            SELECT
                id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                token,
                status,
                executed_payments,
                total_paid,
                next_payment_due,
                failure_count,
                created_at,
                updated_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM subscriptions
            WHERE status = 'ACTIVE'
                AND expiry > NOW()
                AND executed_payments < max_payments
                AND next_payment_due <= NOW()
            ORDER BY next_payment_due ASC
            "#
        )
        .fetch_all(pool)
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

        if let Some(storage) = self.stub_storage() {
            let now = Utc::now();
            let subscriptions = storage.subscriptions.lock().unwrap();
            let mut results: Vec<Subscription> = subscriptions
                .values()
                .filter(|sub| {
                    sub.status == "ACTIVE"
                        && sub.chain == chain
                        && sub.expiry > now
                        && sub.executed_payments < sub.max_payments
                        && sub.next_payment_due <= now
                })
                .cloned()
                .collect();
            results.sort_by_key(|sub| sub.next_payment_due);
            results.truncate(limit as usize);
            info!(
                "found {} due subscriptions for chain: {} (stub)",
                results.len(),
                chain
            );
            return Ok(results);
        }

        let pool = self.require_postgres("get_due_subscriptions_for_chain")?;

        let subscriptions = sqlx::query_as!(
            Subscription,
            r#"
            SELECT
                id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                token,
                status,
                executed_payments,
                total_paid,
                next_payment_due,
                failure_count,
                created_at,
                updated_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM subscriptions
            WHERE status = 'ACTIVE'
                AND chain = $1
                AND expiry > NOW()
                AND executed_payments < max_payments
                AND next_payment_due <= NOW()
            ORDER BY next_payment_due ASC
            LIMIT $2
            "#,
            chain,
            limit
        )
        .fetch_all(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            if let Some(subscription) = subscriptions.get_mut(subscription_id) {
                subscription.status = status.to_string();
                subscription.updated_at = Utc::now();
                info!(
                    "successfully updated subscription {} status to: {} (stub)",
                    subscription_id, status
                );
                return Ok(());
            } else {
                warn!(
                    "no subscription found to update (stub): {}",
                    subscription_id
                );
                return Err(RelayerError::NotFound(format!(
                    "subscription not found: {}",
                    subscription_id
                )));
            }
        }

        let pool = self.require_postgres("update_subscription_status")?;

        let result = sqlx::query!(
            r#"UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2"#,
            status,
            subscription_id
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            let stored = subscriptions.get_mut(subscription_id).ok_or_else(|| {
                RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
            })?;

            stored.executed_payments += 1;

            let current_total =
                U256::from_dec_str(&stored.total_paid).unwrap_or_else(|_| U256::zero());
            let payment_amount = U256::from_dec_str(amount_paid).unwrap_or_else(|_| U256::zero());
            let updated_total = current_total + payment_amount;
            stored.total_paid = updated_total.to_string();
            stored.next_payment_due = next_payment_due;
            stored.updated_at = Utc::now();

            info!(
                "successfully incremented payment count for subscription: {} (stub)",
                subscription_id
            );
            return Ok(());
        }

        let pool = self.require_postgres("increment_payment_count")?;
        let amount_paid_decimal = BigDecimal::from_str(amount_paid).map_err(|err| {
            RelayerError::Validation(format!("invalid amount_paid value: {}", err))
        })?;

        let result = sqlx::query!(
            r#"
            UPDATE subscriptions 
            SET executed_payments = executed_payments + 1,
                total_paid = (total_paid::numeric + $2::numeric)::text,
                next_payment_due = $3,
                updated_at = NOW()
            WHERE id = $1
            "#,
            subscription_id,
            amount_paid_decimal,
            next_payment_due
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            let subscription = subscriptions.get_mut(subscription_id).ok_or_else(|| {
                RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
            })?;
            subscription.failure_count += 1;
            subscription.updated_at = Utc::now();
            info!(
                "incremented failure count for subscription: {} (stub)",
                subscription_id
            );
            return Ok(());
        }

        let pool = self.require_postgres("increment_failure_count")?;

        let result = sqlx::query!(
            r#"UPDATE subscriptions SET failure_count = failure_count + 1, updated_at = NOW() WHERE id = $1"#,
            subscription_id
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut executions = storage.executions.lock().unwrap();
            let mut execution_clone = execution.clone();
            if execution_clone.id == 0 {
                execution_clone.id = storage.next_execution_id();
            }
            executions.push(execution_clone.clone());
            info!(
                "successfully inserted execution with id: {} (stub)",
                execution_clone.id
            );
            return Ok(execution_clone.id);
        }

        let pool = self.require_postgres("insert_execution")?;
        let exec = execution.clone();

        let row = sqlx::query!(
            r#"
            INSERT INTO executions (
                subscription_id,
                relayer_address,
                payment_number,
                amount_paid,
                protocol_fee,
                merchant_amount,
                transaction_hash,
                block_number,
                gas_used,
                gas_price,
                status,
                error_message,
                executed_at,
                chain
            ) VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                $14
            )
            RETURNING id
            "#,
            exec.subscription_id,
            exec.relayer_address,
            exec.payment_number,
            exec.amount_paid,
            exec.protocol_fee,
            exec.merchant_amount,
            exec.transaction_hash,
            exec.block_number,
            exec.gas_used,
            exec.gas_price,
            exec.status,
            exec.error_message,
            exec.executed_at,
            exec.chain
        )
        .fetch_one(pool)
        .await?;

        let id: i64 = row.id;
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

        if let Some(storage) = self.stub_storage() {
            let subscriptions = storage.subscriptions.lock().unwrap().clone();
            let executions = storage.executions.lock().unwrap();

            let mut filtered: Vec<Execution> = executions
                .iter()
                .filter(|execution| {
                    subscriptions
                        .get(&execution.subscription_id)
                        .map(|sub| sub.merchant == merchant)
                        .unwrap_or(false)
                })
                .cloned()
                .collect();
            filtered.sort_by_key(|execution| std::cmp::Reverse(execution.executed_at));
            filtered.truncate(limit as usize);
            info!(
                "found {} executions for merchant: {} (stub)",
                filtered.len(),
                merchant
            );
            return Ok(filtered);
        }

        let pool = self.require_postgres("get_merchant_executions")?;

        let executions = sqlx::query_as::<_, Execution>(
            "
            SELECT
                e.id,
                e.subscription_id,
                e.relayer_address,
                e.payment_number,
                e.amount_paid,
                e.protocol_fee,
                e.merchant_amount,
                e.transaction_hash,
                e.block_number,
                e.gas_used,
                e.gas_price,
                e.status,
                e.error_message,
                e.executed_at,
                e.chain,
                e.nexus_attestation_id,
                e.nexus_verified,
                e.nexus_submitted_at
            FROM executions e
            JOIN subscriptions s ON e.subscription_id = s.id
            WHERE s.merchant = $1
            ORDER BY e.executed_at DESC
            LIMIT $2
            ",
        )
        .bind(merchant)
        .bind(limit)
        .fetch_all(pool)
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

        if let Some(storage) = self.stub_storage() {
            let executions = storage.executions.lock().unwrap();
            let mut filtered: Vec<Execution> = executions
                .iter()
                .filter(|execution| execution.subscription_id == subscription_id)
                .cloned()
                .collect();
            filtered.sort_by_key(|execution| execution.payment_number);
            info!(
                "found {} executions for subscription: {} (stub)",
                filtered.len(),
                subscription_id
            );
            return Ok(filtered);
        }

        let pool = self.require_postgres("get_executions_by_subscription")?;

        let executions = sqlx::query_as::<_, Execution>(
            "
            SELECT
                id,
                subscription_id,
                relayer_address,
                payment_number,
                amount_paid,
                protocol_fee,
                merchant_amount,
                transaction_hash,
                block_number,
                gas_used,
                gas_price,
                status,
                error_message,
                executed_at,
                chain,
                nexus_attestation_id,
                nexus_verified,
                nexus_submitted_at
            FROM executions
            WHERE subscription_id = $1
            ORDER BY payment_number ASC
            ",
        )
        .bind(subscription_id)
        .fetch_all(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut executions = storage.executions.lock().unwrap();
            if let Some(execution) = executions
                .iter_mut()
                .find(|execution| execution.id == execution_id)
            {
                execution.status = status.to_string();
                execution.error_message = error_message.map(|msg| msg.to_string());
                info!(
                    "successfully updated execution {} status to: {} (stub)",
                    execution_id, status
                );
                return Ok(());
            } else {
                warn!("no execution found to update (stub): {}", execution_id);
                return Err(RelayerError::NotFound(format!(
                    "execution not found: {}",
                    execution_id
                )));
            }
        }

        let pool = self.require_postgres("update_execution_status")?;

        let result = sqlx::query!(
            r#"UPDATE executions SET status = $1, error_message = $2 WHERE id = $3"#,
            status,
            error_message,
            execution_id
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut intents = storage.intent_cache.lock().unwrap();
            let mut stored = intent.clone();

            let id = if let Some(existing) = intents.iter_mut().find(|entry| {
                entry.subscription_id == intent.subscription_id
                    && entry.signature == intent.signature
            }) {
                stored.id = existing.id;
                *existing = stored.clone();
                existing.id
            } else {
                let new_id = storage.next_intent_id();
                stored.id = new_id;
                intents.push(stored.clone());
                new_id
            };

            info!("successfully cached intent with id: {} (stub)", id);
            return Ok(id);
        }

        let pool = self.require_postgres("cache_intent")?;
        let record = intent.clone();

        // use upsert (ON CONFLICT) to handle duplicate intents
        let row = sqlx::query!(
            r#"
            INSERT INTO intent_cache (
                subscription_intent, signature, subscription_id, subscriber, merchant,
                amount, interval_seconds, start_time, max_payments, max_total_amount,
                expiry, nonce, processed, created_at, processed_at, chain,
                avail_block_number, avail_extrinsic_index
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
            ON CONFLICT (subscription_id, signature) 
            DO UPDATE SET 
                subscription_intent = EXCLUDED.subscription_intent,
                created_at = EXCLUDED.created_at,
                avail_block_number = EXCLUDED.avail_block_number,
                avail_extrinsic_index = EXCLUDED.avail_extrinsic_index
            RETURNING id
            "#,
            record.subscription_intent,
            record.signature,
            record.subscription_id,
            record.subscriber,
            record.merchant,
            record.amount,
            record.interval_seconds,
            record.start_time,
            record.max_payments,
            record.max_total_amount,
            record.expiry,
            record.nonce,
            record.processed,
            record.created_at,
            record.processed_at,
            record.chain,
            record.avail_block_number,
            record.avail_extrinsic_index
        )
        .fetch_one(pool)
        .await?;

        let id: i64 = row.id;
        info!("successfully cached intent with id: {}", id);
        Ok(id)
    }

    pub async fn get_cached_intent(&self, subscription_id: &str) -> Result<Option<IntentCache>> {
        info!(
            "fetching cached intent for subscription: {}",
            subscription_id
        );

        if let Some(storage) = self.stub_storage() {
            let intents = storage.intent_cache.lock().unwrap();
            let intent = intents
                .iter()
                .filter(|entry| entry.subscription_id == subscription_id)
                .cloned()
                .max_by_key(|entry| entry.created_at);

            match &intent {
                Some(_) => info!(
                    "found cached intent for subscription: {} (stub)",
                    subscription_id
                ),
                None => warn!(
                    "no cached intent found for subscription: {} (stub)",
                    subscription_id
                ),
            }

            return Ok(intent);
        }

        let pool = self.require_postgres("get_cached_intent")?;

        let intent = sqlx::query_as!(
            IntentCache,
            r#"
            SELECT
                id,
                subscription_intent,
                signature,
                subscription_id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                processed,
                created_at,
                processed_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM intent_cache
            WHERE subscription_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            "#,
            subscription_id
        )
        .fetch_optional(pool)
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

        if let Some(storage) = self.stub_storage() {
            let now = Utc::now();
            let intents = storage.intent_cache.lock().unwrap();
            let mut results: Vec<IntentCache> = intents
                .iter()
                .filter(|intent| !intent.processed && intent.chain == chain && intent.expiry > now)
                .cloned()
                .collect();
            results.sort_by_key(|intent| intent.created_at);
            results.truncate(limit as usize);

            info!(
                "found {} unprocessed intents for chain: {} (stub)",
                results.len(),
                chain
            );
            return Ok(results);
        }

        let pool = self.require_postgres("get_unprocessed_intents")?;

        let intents = sqlx::query_as!(
            IntentCache,
            r#"
            SELECT
                id,
                subscription_intent,
                signature,
                subscription_id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                processed,
                created_at,
                processed_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM intent_cache
            WHERE processed = false
                AND chain = $1
                AND expiry > NOW()
            ORDER BY created_at ASC
            LIMIT $2
            "#,
            chain,
            limit
        )
        .fetch_all(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut intents = storage.intent_cache.lock().unwrap();
            if let Some(intent) = intents.iter_mut().find(|intent| intent.id == intent_id) {
                intent.processed = true;
                intent.processed_at = Some(Utc::now());
                info!(
                    "successfully marked intent {} as processed (stub)",
                    intent_id
                );
                return Ok(());
            } else {
                warn!("no intent found to mark as processed: {} (stub)", intent_id);
                return Err(RelayerError::NotFound(format!(
                    "intent not found: {}",
                    intent_id
                )));
            }
        }

        let pool = self.require_postgres("mark_intent_processed")?;

        let result = sqlx::query!(
            r#"UPDATE intent_cache SET processed = true, processed_at = NOW() WHERE id = $1"#,
            intent_id
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let subscriptions = storage.subscriptions.lock().unwrap();
            let mut active = 0;
            let mut paused = 0;
            let mut total = 0;

            for subscription in subscriptions.values().filter(|sub| sub.chain == chain) {
                total += 1;
                if subscription.status == "ACTIVE" {
                    active += 1;
                } else if subscription.status == "PAUSED" {
                    paused += 1;
                }
            }

            info!(
                "subscription stats for chain {}: active={}, paused={}, total={} (stub)",
                chain, active, paused, total
            );
            return Ok((active, paused, total));
        }

        let pool = self.require_postgres("get_subscription_stats")?;

        let row = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) FILTER (WHERE status = 'ACTIVE') as "active_count!",
                COUNT(*) FILTER (WHERE status = 'PAUSED') as "paused_count!",
                COUNT(*) as "total_count!"
            FROM subscriptions 
            WHERE chain = $1
            "#,
            chain
        )
        .fetch_one(pool)
        .await?;

        let active = row.active_count;
        let paused = row.paused_count;
        let total = row.total_count;

        info!(
            "subscription stats for chain {}: active={}, paused={}, total={}",
            chain, active, paused, total
        );
        Ok((active, paused, total))
    }

    pub async fn cleanup_expired_intents(&self) -> Result<i64> {
        info!("cleaning up expired intents");

        if let Some(storage) = self.stub_storage() {
            let mut intents = storage.intent_cache.lock().unwrap();
            let now = Utc::now();
            let before = intents.len();
            intents.retain(|intent| intent.expiry >= now || intent.processed);
            let deleted = (before - intents.len()) as i64;
            info!("cleaned up {} expired intents (stub)", deleted);
            return Ok(deleted);
        }

        let pool = self.require_postgres("cleanup_expired_intents")?;

        let result =
            sqlx::query!(r#"DELETE FROM intent_cache WHERE expiry < NOW() AND processed = false"#)
                .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let now = Utc::now();
            let subscriptions = storage.subscriptions.lock().unwrap();

            let mut results: Vec<Subscription> = subscriptions
                .values()
                .filter(|sub| {
                    sub.status == "ACTIVE"
                        && sub.expiry > now
                        && sub.executed_payments < sub.max_payments
                        && sub.next_payment_due <= now
                        && sub.id.len() <= 66
                })
                .cloned()
                .collect();

            results.sort_by(|a, b| {
                a.next_payment_due
                    .cmp(&b.next_payment_due)
                    .then_with(|| a.id.cmp(&b.id))
            });

            let start = offset.max(0) as usize;
            let end = start + limit.max(0) as usize;
            let sliced: Vec<Subscription> = results
                .into_iter()
                .skip(start)
                .take(end.saturating_sub(start))
                .collect();

            info!(
                "found {} due subscriptions (stub, limit: {}, offset: {})",
                sliced.len(),
                limit,
                offset
            );
            return Ok(sliced);
        }

        let pool = self.require_postgres("get_due_subscriptions_with_limit")?;

        let subscriptions = sqlx::query_as!(
            Subscription,
            r#"
            SELECT
                id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                token,
                status,
                executed_payments,
                total_paid,
                next_payment_due,
                failure_count,
                created_at,
                updated_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM subscriptions 
            WHERE status = 'ACTIVE' 
                AND expiry > NOW()
                AND executed_payments < max_payments
                AND next_payment_due <= NOW()
                AND length(id) <= 66
            ORDER BY next_payment_due ASC, id ASC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            let subscription = subscriptions.get_mut(subscription_id).ok_or_else(|| {
                RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
            })?;
            subscription.executed_payments = on_chain_payments;
            subscription.status = on_chain_status.to_string();
            subscription.nonce = on_chain_nonce;
            subscription.updated_at = Utc::now();
            info!(
                "synchronised subscription {} with blockchain state (stub)",
                subscription_id
            );
            return Ok(());
        }

        let pool = self.require_postgres("sync_subscription_with_blockchain")?;

        let result = sqlx::query!(
            r#"
            UPDATE subscriptions 
            SET executed_payments = $1,
                status = $2,
                nonce = $3,
                updated_at = NOW()
            WHERE id = $4
            "#,
            on_chain_payments,
            on_chain_status,
            on_chain_nonce,
            subscription_id
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut records = storage.execution_records.lock().unwrap();
            let mut record_clone = execution_record.clone();
            if record_clone.id == 0 {
                record_clone.id = storage.next_execution_id();
            }
            records.push(record_clone);
            info!(
                "successfully inserted execution record for subscription: {} (stub)",
                execution_record.subscription_id
            );
            return Ok(());
        }

        let pool = self.require_postgres("insert_execution_record")?;
        let record = execution_record.clone();

        sqlx::query(
            "
            INSERT INTO executions (
                subscription_id, relayer_address, payment_number, amount_paid,
                protocol_fee, merchant_amount, transaction_hash, block_number,
                gas_used, gas_price, status, executed_at, chain,
                nexus_attestation_id, nexus_verified, nexus_submitted_at
            ) VALUES ($1, '', $2, $3, $4, '', $5, $6, $7, $8, 'SUCCESS', $9, $10, $11, $12, $13)
            ",
        )
        .bind(&record.subscription_id)
        .bind(record.payment_number)
        .bind(&record.payment_amount)
        .bind(&record.fee_paid)
        .bind(&record.transaction_hash)
        .bind(record.block_number)
        .bind(&record.gas_used)
        .bind(&record.gas_price)
        .bind(record.executed_at)
        .bind(&record.chain)
        .bind(&record.nexus_attestation_id)
        .bind(record.nexus_verified)
        .bind(&record.nexus_submitted_at)
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            let subscription = subscriptions.get_mut(subscription_id).ok_or_else(|| {
                RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
            })?;
            subscription.executed_payments = payments_made;
            subscription.next_payment_due = next_payment_time;
            subscription.failure_count = failure_count;
            subscription.updated_at = Utc::now();
            info!(
                "successfully updated subscription {} after payment (stub)",
                subscription_id
            );
            return Ok(());
        }

        let pool = self.require_postgres("update_subscription_after_payment")?;

        let result = sqlx::query!(
            r#"
            UPDATE subscriptions 
            SET executed_payments = $1,
                next_payment_due = $2,
                failure_count = $3,
                updated_at = NOW()
            WHERE id = $4
            "#,
            payments_made,
            next_payment_time,
            failure_count,
            subscription_id
        )
        .execute(pool)
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

        if let Some(storage) = self.stub_storage() {
            let mut subscriptions = storage.subscriptions.lock().unwrap();
            let subscription = subscriptions.get_mut(subscription_id).ok_or_else(|| {
                RelayerError::NotFound(format!("subscription not found: {}", subscription_id))
            })?;

            if new_payments_made != subscription.executed_payments + 1 {
                return Err(RelayerError::Validation(
                    "invalid payment count increment".to_string(),
                ));
            }

            let current_total =
                U256::from_dec_str(&subscription.total_paid).unwrap_or_else(|_| U256::zero());
            let payment_amount =
                U256::from_dec_str(&execution_record.payment_amount).map_err(|_| {
                    RelayerError::Validation("invalid payment amount format".to_string())
                })?;
            let new_total_paid = current_total.checked_add(payment_amount).ok_or_else(|| {
                RelayerError::Validation("total_paid calculation overflow".to_string())
            })?;

            subscription.executed_payments = new_payments_made;
            subscription.total_paid = new_total_paid.to_string();
            subscription.next_payment_due = next_payment_time;
            subscription.failure_count = failure_count;
            subscription.updated_at = Utc::now();

            drop(subscriptions);

            // store execution record for observability
            let mut record_clone = execution_record.clone();
            if record_clone.id == 0 {
                record_clone.id = storage.next_execution_id();
            }
            storage
                .execution_records
                .lock()
                .unwrap()
                .push(record_clone.clone());

            // materialise execution entry
            let execution_entry = Execution {
                id: record_clone.id,
                subscription_id: subscription_id.to_string(),
                relayer_address: String::new(),
                payment_number: record_clone.payment_number,
                amount_paid: record_clone.payment_amount.clone(),
                protocol_fee: record_clone.fee_paid.clone(),
                merchant_amount: record_clone.payment_amount.clone(),
                transaction_hash: record_clone.transaction_hash.clone(),
                block_number: record_clone.block_number,
                gas_used: record_clone.gas_used.clone(),
                gas_price: record_clone.gas_price.clone(),
                status: "SUCCESS".to_string(),
                error_message: None,
                executed_at: record_clone.executed_at,
                chain: record_clone.chain.clone(),
                nexus_attestation_id: record_clone.nexus_attestation_id.clone(),
                nexus_verified: record_clone.nexus_verified,
                nexus_submitted_at: record_clone.nexus_submitted_at,
            };
            storage.executions.lock().unwrap().push(execution_entry);

            info!(
                "successfully recorded execution and updated subscription for {} (stub)",
                subscription_id
            );
            return Ok(());
        }

        let pool = self.require_postgres("record_execution_and_update_subscription")?;

        let mut tx = pool.begin().await.map_err(|e| {
            RelayerError::DatabaseError(format!("failed to begin transaction: {}", e))
        })?;

        // check subscription exists and get current state for validation
        let current_subscription = sqlx::query_as!(
            Subscription,
            r#"
            SELECT
                id,
                subscriber,
                merchant,
                amount,
                interval_seconds,
                start_time,
                max_payments,
                max_total_amount,
                expiry,
                nonce,
                token,
                status,
                executed_payments,
                total_paid,
                next_payment_due,
                failure_count,
                created_at,
                updated_at,
                chain,
                avail_block_number,
                avail_extrinsic_index
            FROM subscriptions
            WHERE id = $1
            FOR UPDATE
            "#,
            subscription_id
        )
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
        sqlx::query(
            "
            INSERT INTO executions (
                subscription_id, relayer_address, payment_number, amount_paid,
                protocol_fee, merchant_amount, transaction_hash, block_number,
                gas_used, gas_price, status, executed_at, chain,
                nexus_attestation_id, nexus_verified, nexus_submitted_at
            ) VALUES ($1, '', $2, $3, $4, '', $5, $6, $7, $8, 'SUCCESS', $9, $10, $11, $12, $13)
            ",
        )
        .bind(&execution_record.subscription_id)
        .bind(execution_record.payment_number)
        .bind(&execution_record.payment_amount)
        .bind(&execution_record.fee_paid)
        .bind(&execution_record.transaction_hash)
        .bind(execution_record.block_number)
        .bind(&execution_record.gas_used)
        .bind(&execution_record.gas_price)
        .bind(execution_record.executed_at)
        .bind(&execution_record.chain)
        .bind(&execution_record.nexus_attestation_id)
        .bind(execution_record.nexus_verified)
        .bind(&execution_record.nexus_submitted_at)
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

        let result = sqlx::query!(
            r#"
            UPDATE subscriptions 
            SET executed_payments = $1,
                total_paid = $2,
                next_payment_due = $3,
                failure_count = $4,
                updated_at = NOW()
            WHERE id = $5
            "#,
            new_payments_made,
            new_total_paid.to_string(),
            next_payment_time,
            failure_count,
            subscription_id
        )
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

    pub async fn get_sync_metadata(&self, chain_id: i64) -> Result<SyncMetadata> {
        if let Some(storage) = self.stub_storage() {
            let mut metadata = storage.sync_metadata.lock().unwrap();
            let entry = metadata.entry(chain_id).or_insert_with(|| SyncMetadata {
                id: chain_id,
                chain_id,
                last_synced_block: 0,
                last_synced_at: Utc::now(),
                sync_method: Some("hypersync".to_string()),
            });
            return Ok(entry.clone());
        }

        let pool = self.require_postgres("get_sync_metadata")?;

        if let Some(metadata) = sqlx::query_as::<_, SyncMetadata>(
            r#"
            SELECT id, chain_id, last_synced_block, last_synced_at, sync_method
            FROM sync_metadata
            WHERE chain_id = $1
            "#,
        )
        .bind(chain_id)
        .fetch_optional(pool)
        .await?
        {
            return Ok(metadata);
        }

        sqlx::query(
            r#"
            INSERT INTO sync_metadata (chain_id, last_synced_block, last_synced_at)
            VALUES ($1, 0, NOW())
            ON CONFLICT (chain_id) DO NOTHING
            "#,
        )
        .bind(chain_id)
        .execute(pool)
        .await?;

        let metadata = sqlx::query_as::<_, SyncMetadata>(
            r#"
            SELECT id, chain_id, last_synced_block, last_synced_at, sync_method
            FROM sync_metadata
            WHERE chain_id = $1
            "#,
        )
        .bind(chain_id)
        .fetch_one(pool)
        .await?;

        Ok(metadata)
    }

    pub async fn update_sync_metadata(&self, chain_id: i64, last_synced_block: i64) -> Result<()> {
        if let Some(storage) = self.stub_storage() {
            let mut metadata = storage.sync_metadata.lock().unwrap();
            let entry = metadata.entry(chain_id).or_insert_with(|| SyncMetadata {
                id: chain_id,
                chain_id,
                last_synced_block: 0,
                last_synced_at: Utc::now(),
                sync_method: Some("hypersync".to_string()),
            });
            entry.last_synced_block = last_synced_block;
            entry.last_synced_at = Utc::now();
            return Ok(());
        }

        let pool = self.require_postgres("update_sync_metadata")?;

        sqlx::query(
            r#"
            INSERT INTO sync_metadata (chain_id, last_synced_block, last_synced_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (chain_id) DO UPDATE
            SET last_synced_block = EXCLUDED.last_synced_block,
                last_synced_at = NOW()
            "#,
        )
        .bind(chain_id)
        .bind(last_synced_block)
        .execute(pool)
        .await?;

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn insert_execution_from_hypersync(
        &self,
        subscription_id: &str,
        relayer_address: &str,
        payment_number: i64,
        amount_paid: &str,
        protocol_fee: &str,
        merchant_amount: &str,
        transaction_hash: &str,
        block_number: i64,
        executed_at: DateTime<Utc>,
        chain: &str,
    ) -> Result<bool> {
        if let Some(storage) = self.stub_storage() {
            let mut records = storage.execution_records.lock().unwrap();
            let record = ExecutionRecord {
                id: storage.next_execution_id(),
                subscription_id: subscription_id.to_string(),
                transaction_hash: transaction_hash.to_string(),
                block_number,
                gas_used: "0".to_string(),
                gas_price: "0".to_string(),
                fee_paid: protocol_fee.to_string(),
                payment_amount: amount_paid.to_string(),
                payment_number,
                chain: chain.to_string(),
                executed_at,
                nexus_attestation_id: None,
                nexus_verified: false,
                nexus_submitted_at: None,
            };
            let existing = records
                .iter()
                .any(|existing| existing.transaction_hash == record.transaction_hash);
            if !existing {
                records.push(record);
                return Ok(true);
            }
            return Ok(false);
        }

        let pool = self.require_postgres("insert_execution_from_hypersync")?;

        let result = sqlx::query(
            r#"
            INSERT INTO executions (
                subscription_id,
                relayer_address,
                payment_number,
                amount_paid,
                protocol_fee,
                merchant_amount,
                transaction_hash,
                block_number,
                gas_used,
                gas_price,
                status,
                executed_at,
                chain,
                nexus_attestation_id,
                nexus_verified,
                nexus_submitted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '0', '0', 'SUCCESS', $9, $10, NULL, false, NULL)
            ON CONFLICT (transaction_hash) DO NOTHING
            "#,
        )
        .bind(subscription_id)
        .bind(relayer_address)
        .bind(payment_number)
        .bind(amount_paid)
        .bind(protocol_fee)
        .bind(merchant_amount)
        .bind(transaction_hash)
        .bind(block_number)
        .bind(executed_at)
        .bind(chain)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_pending_nexus_attestations(
        &self,
        limit: i64,
    ) -> Result<Vec<PendingNexusAttestation>> {
        if let Some(storage) = self.stub_storage() {
            let records = storage.execution_records.lock().unwrap();
            let mut pending: Vec<PendingNexusAttestation> = records
                .iter()
                .filter(|record| {
                    record
                        .nexus_attestation_id
                        .as_ref()
                        .map(|_| !record.nexus_verified)
                        .unwrap_or(false)
                })
                .take(limit as usize)
                .map(|record| PendingNexusAttestation {
                    id: record.id,
                    subscription_id: record.subscription_id.clone(),
                    transaction_hash: record.transaction_hash.clone(),
                    nexus_attestation_id: record.nexus_attestation_id.clone().unwrap_or_default(),
                    chain: record.chain.clone(),
                })
                .collect();
            pending.sort_by_key(|entry| entry.id);
            return Ok(pending);
        }

        let pool = self.require_postgres("get_pending_nexus_attestations")?;
        let rows = sqlx::query_as::<_, PendingNexusAttestation>(
            "
            SELECT id, subscription_id, transaction_hash, nexus_attestation_id, chain
            FROM executions
            WHERE nexus_attestation_id IS NOT NULL AND nexus_verified = false
            ORDER BY executed_at ASC
            LIMIT $1
            ",
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(rows)
    }

    pub async fn mark_nexus_attestation_verified(&self, attestation_id: &str) -> Result<()> {
        if let Some(storage) = self.stub_storage() {
            let mut records = storage.execution_records.lock().unwrap();
            for record in records.iter_mut() {
                if record
                    .nexus_attestation_id
                    .as_deref()
                    .map(|id| id == attestation_id)
                    .unwrap_or(false)
                {
                    record.nexus_verified = true;
                }
            }

            let mut executions = storage.executions.lock().unwrap();
            for execution in executions.iter_mut() {
                if execution
                    .nexus_attestation_id
                    .as_deref()
                    .map(|id| id == attestation_id)
                    .unwrap_or(false)
                {
                    execution.nexus_verified = true;
                }
            }

            return Ok(());
        }

        let pool = self.require_postgres("mark_nexus_attestation_verified")?;
        sqlx::query("UPDATE executions SET nexus_verified = true WHERE nexus_attestation_id = $1")
            .bind(attestation_id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn insert_cross_chain_verification(
        &self,
        subscription_id: &str,
        source_chain_id: i32,
        query_chain_id: i32,
        attestation_id: Option<&str>,
        verified: bool,
    ) -> Result<()> {
        if let Some(storage) = self.stub_storage() {
            let mut records = storage.cross_chain_verifications.lock().unwrap();
            let record = CrossChainVerificationRecord {
                id: (records.len() + 1) as i64,
                subscription_id: subscription_id.to_string(),
                source_chain_id,
                query_chain_id,
                attestation_id: attestation_id.map(|id| id.to_string()),
                verified,
                queried_at: Utc::now(),
            };
            records.push(record);
            return Ok(());
        }

        let pool = self.require_postgres("insert_cross_chain_verification")?;
        sqlx::query(
            "
            INSERT INTO cross_chain_verifications (
                subscription_id, source_chain_id, query_chain_id, attestation_id, verified, queried_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
            ",
        )
        .bind(subscription_id)
        .bind(source_chain_id)
        .bind(query_chain_id)
        .bind(attestation_id)
        .bind(verified)
        .execute(pool)
        .await?;

        Ok(())
    }
}
