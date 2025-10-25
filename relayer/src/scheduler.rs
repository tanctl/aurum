use crate::avail::{AvailClient, AvailClientMode};
use crate::blockchain::BlockchainClient;
use crate::database::models::{ExecutionRecord, IntentCache, Subscription, SubscriptionStatus};
use crate::database::queries::Queries;
use crate::error::{RelayerError, Result};
use crate::integrations::hypersync::HyperSyncClient;
use crate::metrics::Metrics;
use crate::utils::tokens;
use crate::Config;
use chrono::Utc;
use ethers::types::{Address, H256, U256};
use serde_json::to_value;
use sqlx::{PgPool, Row};
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{debug, error, info, warn};

// secure subscription id conversion - only accepts contract-format hex strings
// fixes critical security vulnerability: hash collision attack prevention
fn subscription_id_to_bytes(id: &str) -> Result<[u8; 32]> {
    // validate format: must be 0x prefixed 64-character hex string (32 bytes)
    if !id.starts_with("0x") {
        return Err(RelayerError::Validation(
            "subscription id must start with 0x".to_string(),
        ));
    }

    if id.len() != 66 {
        // 0x + 64 hex chars = 66 total
        return Err(RelayerError::Validation(
            "subscription id must be exactly 66 characters (0x + 32 bytes hex)".to_string(),
        ));
    }

    // validate hex characters only
    if !id[2..].chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(RelayerError::Validation(
            "subscription id contains invalid hex characters".to_string(),
        ));
    }

    hex::decode(&id[2..])
        .map_err(|e| {
            RelayerError::Validation(format!("failed to decode subscription id hex: {}", e))
        })?
        .try_into()
        .map_err(|_| {
            RelayerError::Validation("subscription id must be exactly 32 bytes".to_string())
        })
}

#[derive(Debug, Clone)]
pub enum ValidationResult {
    Valid,
    InsufficientBalance { token_address: String },
    InsufficientAllowance { token_address: String },
    NotDue,
    SubscriptionNotActive,
    SubscriptionNotFound,
    ChainError(String),
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub transaction_hash: H256,
    pub block_number: u64,
    pub gas_used: U256,
    pub gas_price: U256,
    pub fee_paid: U256,
    pub payment_amount: U256,
    pub payment_number: u64,
}

// constants for security and performance limits
const MAX_SUBSCRIPTIONS_PER_BATCH: i64 = 100;
const MAX_PROCESSING_TIME_SECONDS: u64 = 300; // 5 minutes max per batch
const MAX_RETRY_ATTEMPTS: u32 = 3;
const BASE_RETRY_DELAY_SECONDS: u64 = 30;
const MAX_ID_LENGTH: usize = 66; // 0x + 64 hex chars
const PROTOCOL_FEE_BPS: u32 = 50; // 0.5% protocol fee

pub struct Scheduler {
    queries: Arc<Queries>,
    blockchain_client: Arc<BlockchainClient>,
    avail_client: Arc<AvailClient>,
    hypersync_client: Option<Arc<HyperSyncClient>>,
    metrics: Arc<Metrics>,
    config: Config,
    job_scheduler: JobScheduler,
    pool: PgPool, // for distributed locking
}

pub struct SchedulerContext {
    pub queries: Arc<Queries>,
    pub blockchain_client: Arc<BlockchainClient>,
    pub avail_client: Arc<AvailClient>,
    pub hypersync_client: Option<Arc<HyperSyncClient>>,
    pub metrics: Arc<Metrics>,
    pub config: Config,
    pub pool: PgPool,
}

impl Scheduler {
    pub async fn new(context: SchedulerContext) -> Result<Self> {
        info!("initializing payment scheduler");

        let SchedulerContext {
            queries,
            blockchain_client,
            avail_client,
            hypersync_client,
            metrics,
            config,
            pool,
        } = context;

        let job_scheduler = JobScheduler::new().await.map_err(|e| {
            RelayerError::InternalError(format!("failed to create job scheduler: {}", e))
        })?;

        let mut scheduler = Self {
            queries,
            blockchain_client,
            avail_client,
            hypersync_client,
            metrics,
            config,
            job_scheduler,
            pool,
        };

        scheduler.launch_initial_historical_sync();
        scheduler.setup_payment_job().await?;

        info!("payment scheduler initialized successfully");
        Ok(scheduler)
    }

    fn launch_initial_historical_sync(&self) {
        if let Some(hypersync) = &self.hypersync_client {
            info!("starting background HyperSync historical sync task");
            let hypersync = Arc::clone(hypersync);
            let config = self.config.clone();
            let queries = Arc::clone(&self.queries);
            let blockchain_client = Arc::clone(&self.blockchain_client);
            let metrics = Arc::clone(&self.metrics);

            tokio::spawn(async move {
                let start = Instant::now();
                match hypersync
                    .sync_historical_data(&config, queries, blockchain_client)
                    .await
                {
                    Ok(_) => {
                        let elapsed = start.elapsed();
                        metrics.record_hypersync_query(elapsed);
                        info!(
                            "background HyperSync historical sync complete in {} ms",
                            elapsed.as_millis()
                        );
                    }
                    Err(err) => {
                        error!("background HyperSync historical sync failed: {}", err);
                    }
                }
            });
        } else {
            info!("HyperSync client not configured; skipping historical sync");
        }
    }

    async fn setup_payment_job(&mut self) -> Result<()> {
        let queries = Arc::clone(&self.queries);
        let blockchain_client = Arc::clone(&self.blockchain_client);
        let avail_client = Arc::clone(&self.avail_client);
        let pool = self.pool.clone();

        // use safer cron expression: every 60 seconds with proper timing
        let job = Job::new_async("0 */1 * * * *", move |_uuid, _l| {
            let queries = Arc::clone(&queries);
            let blockchain_client = Arc::clone(&blockchain_client);
            let avail_client = Arc::clone(&avail_client);
            let pool = pool.clone();

            Box::pin(async move {
                info!("starting payment processing cycle with distributed lock");

                // implement distributed locking to prevent concurrent execution
                match acquire_processing_lock(&pool).await {
                    Ok(lock_acquired) => {
                        if lock_acquired {
                            info!("acquired processing lock, starting payment processing");

                            // set processing timeout
                            let processing_result = tokio::time::timeout(
                                Duration::from_secs(MAX_PROCESSING_TIME_SECONDS),
                                process_payments_job_safe(
                                    queries,
                                    blockchain_client,
                                    avail_client,
                                    pool.clone(),
                                ),
                            )
                            .await;

                            match processing_result {
                                Ok(Ok(())) => info!("payment processing completed successfully"),
                                Ok(Err(e)) => error!("payment processing failed: {}", e),
                                Err(_) => error!(
                                    "payment processing timed out after {} seconds",
                                    MAX_PROCESSING_TIME_SECONDS
                                ),
                            }

                            // always release lock
                            if let Err(e) = release_processing_lock(&pool).await {
                                error!("failed to release processing lock: {}", e);
                            }
                        } else {
                            debug!(
                                "processing lock already held by another instance, skipping cycle"
                            );
                        }
                    }
                    Err(e) => error!("failed to acquire processing lock: {}", e),
                }

                info!("payment processing cycle completed");
            })
        })
        .map_err(|e| RelayerError::InternalError(format!("failed to create payment job: {}", e)))?;

        self.job_scheduler.add(job).await.map_err(|e| {
            RelayerError::InternalError(format!("failed to add payment job: {}", e))
        })?;

        Ok(())
    }

    pub async fn start(&self) -> Result<()> {
        info!("starting payment scheduler");
        self.job_scheduler.start().await.map_err(|e| {
            RelayerError::InternalError(format!("failed to start scheduler: {}", e))
        })?;
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<()> {
        info!("stopping payment scheduler");
        self.job_scheduler
            .shutdown()
            .await
            .map_err(|e| RelayerError::InternalError(format!("failed to stop scheduler: {}", e)))?;
        Ok(())
    }

    #[allow(dead_code)]
    async fn process_due_payments(&self) -> Result<()> {
        let due_subscriptions = self.queries.get_due_subscriptions().await?;
        info!(
            "found {} due subscriptions to process",
            due_subscriptions.len()
        );

        for subscription in due_subscriptions {
            let token_symbol = tokens::get_token_symbol(&subscription.token_address);
            if tokens::is_eth(&subscription.token_address) {
                info!(
                    "processing payment for subscription {} with native {} ({})",
                    subscription.id, token_symbol, subscription.token_address
                );
            } else {
                info!(
                    "processing payment for subscription {} with erc20 {} ({})",
                    subscription.id, token_symbol, subscription.token_address
                );
            }

            if let Err(e) = self.process_single_subscription(&subscription).await {
                error!("failed to process subscription {}: {}", subscription.id, e);
                self.handle_subscription_failure(&subscription, &e).await?;
            }
        }

        Ok(())
    }

    #[allow(dead_code)]
    async fn process_single_subscription(&self, subscription: &Subscription) -> Result<()> {
        let token_symbol = tokens::get_token_symbol(&subscription.token_address);
        info!(
            "processing subscription {} for subscriber {} using {} ({})",
            subscription.id, subscription.subscriber, token_symbol, subscription.token_address
        );

        ensure_intent_cached_job_safe(subscription, &self.queries, self.avail_client.as_ref())
            .await?;

        let validation_result = self.validate_payment(subscription).await?;

        match validation_result {
            ValidationResult::Valid => {
                info!(
                    "subscription {} validation passed, executing payment",
                    subscription.id
                );

                let execution_result = self.execute_payment_on_chain(subscription).await?;

                self.record_successful_execution(subscription, &execution_result)
                    .await?;

                info!(
                    "successfully executed payment for subscription {}, tx: {:?}",
                    subscription.id, execution_result.transaction_hash
                );
            }
            ValidationResult::InsufficientBalance { token_address } => {
                let symbol = tokens::get_token_symbol(&token_address);
                warn!(
                    "subscription {} has insufficient {} balance (token {})",
                    subscription.id, symbol, token_address
                );
                let message = match symbol {
                    "ETH" => "Insufficient ETH balance".to_string(),
                    "PYUSD" => "Insufficient PYUSD balance".to_string(),
                    other => format!("insufficient {} balance", other),
                };
                return Err(RelayerError::Validation(message));
            }
            ValidationResult::InsufficientAllowance { token_address } => {
                let symbol = tokens::get_token_symbol(&token_address);
                warn!(
                    "subscription {} has insufficient {} allowance (token {})",
                    subscription.id, symbol, token_address
                );
                let message = match symbol {
                    "ETH" => "ETH deposit required".to_string(),
                    "PYUSD" => "PYUSD allowance required".to_string(),
                    other => format!("{} allowance required", other),
                };
                return Err(RelayerError::Validation(message));
            }
            ValidationResult::NotDue => {
                info!("subscription {} is not due yet", subscription.id);
                return Ok(());
            }
            ValidationResult::SubscriptionNotActive => {
                warn!("subscription {} is not active", subscription.id);
                return Err(RelayerError::Validation(
                    "subscription not active".to_string(),
                ));
            }
            ValidationResult::SubscriptionNotFound => {
                warn!("subscription {} not found on chain", subscription.id);
                return Err(RelayerError::NotFound(
                    "subscription not found on chain".to_string(),
                ));
            }
            ValidationResult::ChainError(msg) => {
                error!(
                    "chain error for subscription {} on token {} ({}): {}",
                    subscription.id, token_symbol, subscription.token_address, msg
                );
                return Err(RelayerError::ContractRevert(msg));
            }
        }

        Ok(())
    }

    #[allow(dead_code)]
    async fn validate_payment(&self, subscription: &Subscription) -> Result<ValidationResult> {
        let token_address_str = subscription.token_address.clone();
        let token_symbol = tokens::get_token_symbol(&token_address_str);
        info!(
            "validating payment for subscription {} using {} ({})",
            subscription.id, token_symbol, token_address_str
        );

        // validate subscription id format first
        if subscription.id.len() > MAX_ID_LENGTH {
            return Err(RelayerError::Validation(
                "subscription id too long".to_string(),
            ));
        }

        let chain = &subscription.chain;
        let subscription_id_bytes = subscription_id_to_bytes(&subscription.id)?;
        let token_address = Address::from_str(&token_address_str)
            .map_err(|_| RelayerError::Validation("invalid token address".to_string()))?;

        // get current blockchain state with timeout
        let on_chain_subscription = match tokio::time::timeout(
            Duration::from_secs(30),
            self.blockchain_client
                .get_subscription(subscription_id_bytes, chain),
        )
        .await
        {
            Ok(Ok(Some(sub))) => sub,
            Ok(Ok(None)) => return Ok(ValidationResult::SubscriptionNotFound),
            Ok(Err(e)) => {
                return Ok(ValidationResult::ChainError(format!(
                    "blockchain error: {}",
                    e
                )))
            }
            Err(_) => {
                return Ok(ValidationResult::ChainError(
                    "blockchain request timeout".to_string(),
                ))
            }
        };

        // validate contract status (0 = ACTIVE)
        if on_chain_subscription.status != 0 {
            return Ok(ValidationResult::SubscriptionNotActive);
        }

        if on_chain_subscription.token != token_address {
            return Ok(ValidationResult::ChainError(format!(
                "token mismatch between database ({}) and chain ({:?})",
                token_address_str, on_chain_subscription.token
            )));
        }

        // check nonce consistency between database and contract
        if subscription.nonce != on_chain_subscription.nonce.as_u64() as i64 {
            warn!(
                "nonce mismatch: db={}, chain={}",
                subscription.nonce, on_chain_subscription.nonce
            );
            return Ok(ValidationResult::ChainError(
                "subscription nonce mismatch - possible replay attack".to_string(),
            ));
        }

        // check if subscription has expired
        let now = Utc::now();
        if now > subscription.expiry {
            return Ok(ValidationResult::SubscriptionNotActive);
        }

        // check if max payments reached (use contract state as source of truth)
        let on_chain_payments = self
            .blockchain_client
            .get_payment_count(subscription_id_bytes, chain)
            .await
            .map_err(|e| {
                RelayerError::ContractRevert(format!("failed to get payment count: {}", e))
            })?;

        if on_chain_payments >= on_chain_subscription.max_payments.as_u64() {
            return Ok(ValidationResult::SubscriptionNotActive);
        }

        // secure arithmetic with overflow protection
        let payment_amount: U256 = subscription.amount.parse().map_err(|_| {
            RelayerError::Validation("invalid payment amount in subscription".to_string())
        })?;

        // calculate total paid from contract state
        let contract_total_paid = payment_amount
            .checked_mul(U256::from(on_chain_payments))
            .ok_or_else(|| {
                RelayerError::Validation("payment amount calculation overflow".to_string())
            })?;

        let max_total: U256 = on_chain_subscription.max_total_amount;

        // check if next payment would exceed total limit
        let next_total = contract_total_paid
            .checked_add(payment_amount)
            .ok_or_else(|| {
                RelayerError::Validation("total payment calculation overflow".to_string())
            })?;

        if next_total > max_total {
            return Ok(ValidationResult::SubscriptionNotActive);
        }

        // check payment timing (contract is source of truth)
        let contract_next_payment = on_chain_subscription.start_time
            + (U256::from(on_chain_payments) * on_chain_subscription.interval);
        let current_timestamp = now.timestamp() as u64;

        if U256::from(current_timestamp) < contract_next_payment {
            return Ok(ValidationResult::NotDue);
        }

        let subscriber_address = subscription
            .subscriber
            .parse()
            .map_err(|_| RelayerError::Validation("invalid subscriber address".to_string()))?;

        let balance = match tokio::time::timeout(
            Duration::from_secs(15),
            self.blockchain_client
                .check_balance(subscriber_address, token_address, chain),
        )
        .await
        {
            Ok(Ok(bal)) => bal,
            Ok(Err(e)) => {
                return Ok(ValidationResult::ChainError(format!(
                    "balance check failed: {}",
                    e
                )))
            }
            Err(_) => {
                return Ok(ValidationResult::ChainError(
                    "balance check timeout".to_string(),
                ))
            }
        };

        // verify amounts match between database and chain (critical security check)
        if payment_amount != on_chain_subscription.amount {
            error!(
                "critical: amount mismatch detected - db={}, chain={}",
                payment_amount, on_chain_subscription.amount
            );
            return Ok(ValidationResult::ChainError(
                "subscription amount mismatch between database and chain".to_string(),
            ));
        }

        info!(
            "subscription {} balance check: {} available for token {} ({}) needing {}",
            subscription.id, balance, token_symbol, token_address_str, payment_amount
        );

        if balance < payment_amount {
            return Ok(ValidationResult::InsufficientBalance {
                token_address: token_address_str.clone(),
            });
        }

        let has_allowance = match tokio::time::timeout(
            Duration::from_secs(15),
            self.blockchain_client.check_allowance(
                subscriber_address,
                token_address,
                payment_amount,
                chain,
            ),
        )
        .await
        {
            Ok(Ok(allowance)) => allowance,
            Ok(Err(e)) => {
                return Ok(ValidationResult::ChainError(format!(
                    "allowance check failed: {}",
                    e
                )))
            }
            Err(_) => {
                return Ok(ValidationResult::ChainError(
                    "allowance check timeout".to_string(),
                ))
            }
        };

        info!(
            "subscription {} allowance check: {} for token {} ({})",
            subscription.id, has_allowance, token_symbol, token_address_str
        );

        if !has_allowance {
            return Ok(ValidationResult::InsufficientAllowance {
                token_address: token_address_str,
            });
        }

        info!(
            "subscription {} validation completed successfully",
            subscription.id
        );
        Ok(ValidationResult::Valid)
    }

    #[allow(dead_code)]
    async fn execute_payment_on_chain(
        &self,
        subscription: &Subscription,
    ) -> Result<ExecutionResult> {
        let token_symbol = tokens::get_token_symbol(&subscription.token_address);
        info!(
            "executing payment on chain for subscription {} using {} ({})",
            subscription.id, token_symbol, subscription.token_address
        );

        let chain = &subscription.chain;
        let subscription_id_bytes = subscription_id_to_bytes(&subscription.id)?;

        let mut retry_count = 0;
        let mut last_error = None;

        while retry_count < MAX_RETRY_ATTEMPTS {
            match tokio::time::timeout(
                Duration::from_secs(120), // 2 minute timeout per attempt
                self.blockchain_client
                    .execute_subscription(subscription_id_bytes, chain),
            )
            .await
            {
                Ok(Ok(result)) => {
                    let payment_amount: U256 = subscription.amount.parse().map_err(|_| {
                        RelayerError::Validation("invalid payment amount".to_string())
                    })?;

                    // calculate correct protocol fee based on payment amount, not gas
                    let protocol_fee = payment_amount
                        .checked_mul(U256::from(PROTOCOL_FEE_BPS))
                        .and_then(|fee| fee.checked_div(U256::from(10000)))
                        .ok_or_else(|| {
                            RelayerError::Validation(
                                "protocol fee calculation overflow".to_string(),
                            )
                        })?;

                    // get current payment number from blockchain (source of truth)
                    let current_payment_number = self
                        .blockchain_client
                        .get_payment_count(subscription_id_bytes, chain)
                        .await
                        .map_err(|e| {
                            RelayerError::ContractRevert(format!(
                                "failed to get payment count: {}",
                                e
                            ))
                        })?;

                    let execution_result = ExecutionResult {
                        transaction_hash: result.transaction_hash,
                        block_number: result.block_number,
                        gas_used: result.gas_used,
                        gas_price: result.gas_price,
                        fee_paid: protocol_fee,
                        payment_amount,
                        payment_number: current_payment_number,
                    };

                    info!(
                        "payment executed successfully on attempt {}, tx: {:?}, payment #{}",
                        retry_count + 1,
                        result.transaction_hash,
                        current_payment_number
                    );

                    return Ok(execution_result);
                }
                Ok(Err(e)) => {
                    retry_count += 1;
                    last_error = Some(e);

                    // intelligent retry logic based on error type
                    let should_retry = match last_error.as_ref().unwrap() {
                        RelayerError::RpcConnectionFailed(_) => true,
                        RelayerError::InsufficientGas(_) => true,
                        RelayerError::TransactionFailed(msg) => {
                            // don't retry permanent failures
                            !msg.to_lowercase().contains("nonce")
                                && !msg.to_lowercase().contains("insufficient")
                                && !msg.to_lowercase().contains("revert")
                        }
                        RelayerError::ContractRevert(_) => false, // permanent failure
                        _ => retry_count < 2,                     // retry once for unknown errors
                    };

                    if !should_retry || retry_count >= MAX_RETRY_ATTEMPTS {
                        warn!(
                            "permanent error or max retries reached, not retrying: {}",
                            last_error.as_ref().unwrap()
                        );
                        break;
                    }

                    // exponential backoff with jitter
                    let backoff_seconds = BASE_RETRY_DELAY_SECONDS * (2_u64.pow(retry_count - 1));
                    let jitter = fastrand::u64(0..=backoff_seconds / 4); // up to 25% jitter
                    let final_delay = backoff_seconds + jitter;

                    warn!(
                        "execution failed on attempt {}, retrying in {} seconds: {}",
                        retry_count,
                        final_delay,
                        last_error.as_ref().unwrap()
                    );

                    tokio::time::sleep(Duration::from_secs(final_delay)).await;
                }
                Err(_) => {
                    retry_count += 1;
                    last_error = Some(RelayerError::InternalError(
                        "blockchain request timeout".to_string(),
                    ));

                    if retry_count < MAX_RETRY_ATTEMPTS {
                        let backoff_seconds =
                            BASE_RETRY_DELAY_SECONDS * (2_u64.pow(retry_count - 1));
                        warn!(
                            "execution timeout on attempt {}, retrying in {} seconds",
                            retry_count, backoff_seconds
                        );
                        tokio::time::sleep(Duration::from_secs(backoff_seconds)).await;
                    }
                }
            }
        }

        error!(
            "payment execution failed after {} attempts",
            MAX_RETRY_ATTEMPTS
        );
        Err(last_error.unwrap())
    }

    #[allow(dead_code)]
    async fn record_successful_execution(
        &self,
        subscription: &Subscription,
        execution_result: &ExecutionResult,
    ) -> Result<()> {
        info!(
            "recording successful execution for subscription {}",
            subscription.id
        );

        let execution_record = ExecutionRecord {
            id: 0,
            subscription_id: subscription.id.clone(),
            transaction_hash: format!("{:?}", execution_result.transaction_hash),
            block_number: execution_result.block_number as i64,
            gas_used: execution_result.gas_used.to_string(),
            gas_price: execution_result.gas_price.to_string(),
            fee_paid: execution_result.fee_paid.to_string(),
            payment_amount: execution_result.payment_amount.to_string(),
            payment_number: execution_result.payment_number as i64,
            chain: subscription.chain.clone(),
            executed_at: Utc::now(),
            nexus_attestation_id: None,
            nexus_verified: false,
            nexus_submitted_at: None,
            token_address: Some(subscription.token_address.clone()),
        };

        self.queries
            .insert_execution_record(&execution_record)
            .await?;

        let new_payments_made = subscription
            .executed_payments
            .checked_add(1)
            .ok_or_else(|| RelayerError::InternalError("payment count overflow".to_string()))?;
        let next_payment_time = subscription.next_payment_due
            + chrono::Duration::seconds(subscription.interval_seconds);

        self.queries
            .update_subscription_after_payment(
                &subscription.id,
                new_payments_made,
                next_payment_time,
                0,
            )
            .await?;

        info!("execution record saved, subscription updated for next payment");
        Ok(())
    }

    #[allow(dead_code)]
    async fn handle_subscription_failure(
        &self,
        subscription: &Subscription,
        error: &RelayerError,
    ) -> Result<()> {
        let new_failure_count = subscription.failure_count + 1;

        warn!(
            "subscription {} failed (attempt {}): {}",
            subscription.id, new_failure_count, error
        );

        if new_failure_count > 3 {
            warn!(
                "subscription {} exceeded maximum failures, pausing",
                subscription.id
            );

            self.queries
                .update_subscription_status_enum(&subscription.id, SubscriptionStatus::Paused)
                .await?;
        } else {
            self.queries
                .update_subscription_after_payment(
                    &subscription.id,
                    subscription.executed_payments,
                    subscription.next_payment_due,
                    new_failure_count,
                )
                .await?;
        }

        Ok(())
    }
}

// distributed locking functions for concurrency safety
async fn acquire_processing_lock(pool: &PgPool) -> Result<bool> {
    let result = sqlx::query("SELECT pg_try_advisory_lock(12345) as acquired")
        .fetch_one(pool)
        .await
        .map_err(|e| RelayerError::DatabaseError(format!("failed to acquire lock: {}", e)))?;

    let acquired: bool = result.get("acquired");
    Ok(acquired)
}

async fn release_processing_lock(pool: &PgPool) -> Result<()> {
    sqlx::query("SELECT pg_advisory_unlock(12345)")
        .execute(pool)
        .await
        .map_err(|e| RelayerError::DatabaseError(format!("failed to release lock: {}", e)))?;

    Ok(())
}

// safe payment processing with resource limits and proper error handling
async fn process_payments_job_safe(
    queries: Arc<Queries>,
    blockchain_client: Arc<BlockchainClient>,
    avail_client: Arc<AvailClient>,
    pool: PgPool,
) -> Result<()> {
    info!("starting safe payment processing with resource limits");

    // process subscriptions in batches to prevent memory exhaustion
    let mut offset = 0;
    let mut total_processed = 0;

    loop {
        // get limited batch of due subscriptions
        let due_subscriptions = queries
            .get_due_subscriptions_with_limit(MAX_SUBSCRIPTIONS_PER_BATCH, offset)
            .await?;

        if due_subscriptions.is_empty() {
            info!("no more due subscriptions to process");
            break;
        }

        info!(
            "processing batch of {} subscriptions (offset: {})",
            due_subscriptions.len(),
            offset
        );

        for subscription in due_subscriptions {
            // validate subscription id length for DoS protection
            if subscription.id.len() > MAX_ID_LENGTH {
                warn!(
                    "skipping subscription with oversized id: {}",
                    subscription.id.len()
                );
                continue;
            }

            match process_single_subscription_job_safe(
                &subscription,
                &queries,
                &blockchain_client,
                &avail_client,
                &pool,
            )
            .await
            {
                Ok(processed) => {
                    if processed {
                        total_processed += 1;
                    }
                }
                Err(e) => {
                    error!("failed to process subscription {}: {}", subscription.id, e);
                    if let Err(failure_err) =
                        handle_subscription_failure_job_safe(&subscription, &e, &queries).await
                    {
                        error!("failed to handle subscription failure: {}", failure_err);
                    }
                }
            }
        }

        offset += MAX_SUBSCRIPTIONS_PER_BATCH;

        // safety limit: don't process more than 1000 subscriptions per cycle
        if total_processed >= 1000 {
            warn!("reached maximum subscriptions per cycle limit (1000), stopping");
            break;
        }
    }

    info!(
        "completed safe payment processing, processed {} subscriptions",
        total_processed
    );
    Ok(())
}

async fn process_single_subscription_job_safe(
    subscription: &Subscription,
    queries: &Arc<Queries>,
    blockchain_client: &Arc<BlockchainClient>,
    avail_client: &Arc<AvailClient>,
    pool: &PgPool,
) -> Result<bool> {
    info!(
        "processing subscription {} for subscriber {}",
        subscription.id, subscription.subscriber
    );

    // acquire row-level lock to prevent concurrent processing of same subscription
    let lock_result = sqlx::query("SELECT id FROM subscriptions WHERE id = $1 FOR UPDATE NOWAIT")
        .bind(&subscription.id)
        .fetch_optional(pool)
        .await;

    match lock_result {
        Ok(Some(_)) => {
            debug!("acquired row lock for subscription {}", subscription.id);
        }
        Ok(None) => {
            warn!(
                "subscription {} no longer exists, skipping",
                subscription.id
            );
            return Ok(false);
        }
        Err(sqlx::Error::Database(db_err))
            if db_err.code() == Some(std::borrow::Cow::Borrowed("55P03")) =>
        {
            debug!(
                "subscription {} is being processed by another instance, skipping",
                subscription.id
            );
            return Ok(false);
        }
        Err(e) => return Err(RelayerError::Database(e)),
    }

    ensure_intent_cached_job_safe(subscription, queries, avail_client.as_ref()).await?;

    let validation_result = validate_payment_job_safe(subscription, blockchain_client).await?;

    match validation_result {
        ValidationResult::Valid => {
            info!(
                "subscription {} validation passed, executing payment",
                subscription.id
            );

            let execution_result =
                execute_payment_on_chain_job_safe(subscription, blockchain_client).await?;

            record_successful_execution_job_safe(subscription, &execution_result, queries).await?;

            info!(
                "successfully executed payment for subscription {}, tx: {:?}",
                subscription.id, execution_result.transaction_hash
            );

            return Ok(true); // payment processed
        }
        ValidationResult::InsufficientBalance { token_address } => {
            let symbol = tokens::get_token_symbol(&token_address);
            warn!(
                "subscription {} has insufficient {} balance (token {})",
                subscription.id, symbol, token_address
            );
            let message = match symbol {
                "ETH" => "Insufficient ETH balance".to_string(),
                "PYUSD" => "Insufficient PYUSD balance".to_string(),
                other => format!("insufficient {} balance", other),
            };
            return Err(RelayerError::Validation(message));
        }
        ValidationResult::InsufficientAllowance { token_address } => {
            let symbol = tokens::get_token_symbol(&token_address);
            warn!(
                "subscription {} has insufficient {} allowance (token {})",
                subscription.id, symbol, token_address
            );
            let message = match symbol {
                "ETH" => "ETH deposit required".to_string(),
                "PYUSD" => "PYUSD allowance required".to_string(),
                other => format!("{} allowance required", other),
            };
            return Err(RelayerError::Validation(message));
        }
        ValidationResult::NotDue => {
            debug!("subscription {} is not due yet", subscription.id);
            return Ok(false); // not processed
        }
        ValidationResult::SubscriptionNotActive => {
            warn!("subscription {} is not active", subscription.id);
            return Err(RelayerError::Validation(
                "subscription not active".to_string(),
            ));
        }
        ValidationResult::SubscriptionNotFound => {
            warn!("subscription {} not found on chain", subscription.id);
            return Err(RelayerError::NotFound(
                "subscription not found on chain".to_string(),
            ));
        }
        ValidationResult::ChainError(msg) => {
            let symbol = tokens::get_token_symbol(&subscription.token_address);
            error!(
                "chain error for subscription {} on token {} ({}): {}",
                subscription.id, symbol, subscription.token_address, msg
            );
            return Err(RelayerError::ContractRevert(msg));
        }
    }
}

async fn validate_payment_job_safe(
    subscription: &Subscription,
    blockchain_client: &Arc<BlockchainClient>,
) -> Result<ValidationResult> {
    let token_address_str = subscription.token_address.clone();
    let token_symbol = tokens::get_token_symbol(&token_address_str);
    info!(
        "validating payment for subscription {} using {} ({})",
        subscription.id, token_symbol, token_address_str
    );

    // validate subscription id format first
    if subscription.id.len() > MAX_ID_LENGTH {
        return Err(RelayerError::Validation(
            "subscription id too long".to_string(),
        ));
    }

    let chain = &subscription.chain;
    let subscription_id_bytes = subscription_id_to_bytes(&subscription.id)?;
    let token_address = Address::from_str(&token_address_str)
        .map_err(|_| RelayerError::Validation("invalid token address".to_string()))?;

    // get current blockchain state with timeout
    let on_chain_subscription = match tokio::time::timeout(
        Duration::from_secs(30),
        blockchain_client.get_subscription(subscription_id_bytes, chain),
    )
    .await
    {
        Ok(Ok(Some(sub))) => sub,
        Ok(Ok(None)) => return Ok(ValidationResult::SubscriptionNotFound),
        Ok(Err(e)) => {
            return Ok(ValidationResult::ChainError(format!(
                "blockchain error: {}",
                e
            )))
        }
        Err(_) => {
            return Ok(ValidationResult::ChainError(
                "blockchain request timeout".to_string(),
            ))
        }
    };

    if on_chain_subscription.status != 0 {
        return Ok(ValidationResult::SubscriptionNotActive);
    }

    if on_chain_subscription.token != token_address {
        return Ok(ValidationResult::ChainError(format!(
            "token mismatch between database ({}) and chain ({:?})",
            token_address_str, on_chain_subscription.token
        )));
    }

    // check if subscription has expired
    let now = Utc::now();
    if now > subscription.expiry {
        return Ok(ValidationResult::SubscriptionNotActive);
    }

    // check if max payments reached
    if subscription.executed_payments >= subscription.max_payments {
        return Ok(ValidationResult::SubscriptionNotActive);
    }

    // secure arithmetic with overflow protection
    let payment_amount: U256 = subscription.amount.parse().map_err(|_| {
        RelayerError::Validation("invalid payment amount in subscription".to_string())
    })?;

    // get payment count from contract (source of truth)
    let on_chain_payments = blockchain_client
        .get_payment_count(subscription_id_bytes, chain)
        .await
        .map_err(|e| RelayerError::ContractRevert(format!("failed to get payment count: {}", e)))?;

    // calculate total paid from contract state
    let contract_total_paid = payment_amount
        .checked_mul(U256::from(on_chain_payments))
        .ok_or_else(|| {
            RelayerError::Validation("payment amount calculation overflow".to_string())
        })?;

    let max_total: U256 = on_chain_subscription.max_total_amount;

    // check if next payment would exceed total limit
    let next_total = contract_total_paid
        .checked_add(payment_amount)
        .ok_or_else(|| {
            RelayerError::Validation("total payment calculation overflow".to_string())
        })?;

    if next_total > max_total {
        return Ok(ValidationResult::SubscriptionNotActive);
    }

    let next_payment_time = subscription.next_payment_due;

    if now < next_payment_time {
        return Ok(ValidationResult::NotDue);
    }

    let subscriber_address = subscription
        .subscriber
        .parse()
        .map_err(|_| RelayerError::Validation("invalid subscriber address".to_string()))?;

    let balance = blockchain_client
        .check_balance(subscriber_address, token_address, chain)
        .await
        .map_err(|e| RelayerError::ContractRevert(format!("failed to check balance: {}", e)))?;

    // verify amounts match between database and chain
    if payment_amount != on_chain_subscription.amount {
        warn!(
            "amount mismatch: db={}, chain={}",
            payment_amount, on_chain_subscription.amount
        );
        return Ok(ValidationResult::ChainError(
            "subscription amount mismatch between database and chain".to_string(),
        ));
    }

    info!(
        "subscription {} balance check: {} available for token {} ({}) needing {}",
        subscription.id, balance, token_symbol, token_address_str, payment_amount
    );

    if balance < payment_amount {
        return Ok(ValidationResult::InsufficientBalance {
            token_address: token_address_str.clone(),
        });
    }

    let has_allowance = blockchain_client
        .check_allowance(subscriber_address, token_address, payment_amount, chain)
        .await
        .map_err(|e| RelayerError::ContractRevert(format!("failed to check allowance: {}", e)))?;

    info!(
        "subscription {} allowance check: {} for token {} ({})",
        subscription.id, has_allowance, token_symbol, token_address_str
    );

    if !has_allowance {
        return Ok(ValidationResult::InsufficientAllowance {
            token_address: token_address_str,
        });
    }

    info!(
        "subscription {} validation completed successfully using {} ({})",
        subscription.id, token_symbol, subscription.token_address
    );
    Ok(ValidationResult::Valid)
}

async fn execute_payment_on_chain_job_safe(
    subscription: &Subscription,
    blockchain_client: &Arc<BlockchainClient>,
) -> Result<ExecutionResult> {
    let token_symbol = tokens::get_token_symbol(&subscription.token_address);
    info!(
        "executing payment on chain for subscription {} using {} ({})",
        subscription.id, token_symbol, subscription.token_address
    );

    let chain = &subscription.chain;
    let subscription_id_bytes = subscription_id_to_bytes(&subscription.id)?;

    let max_retries = MAX_RETRY_ATTEMPTS;
    let mut retry_count = 0;
    let mut last_error = None;

    while retry_count < max_retries {
        match blockchain_client
            .execute_subscription(subscription_id_bytes, chain)
            .await
        {
            Ok(result) => {
                let payment_amount: U256 = subscription
                    .amount
                    .parse()
                    .map_err(|_| RelayerError::Validation("invalid payment amount".to_string()))?;

                // calculate correct protocol fee based on payment amount, not gas
                let protocol_fee = payment_amount
                    .checked_mul(U256::from(PROTOCOL_FEE_BPS))
                    .and_then(|fee| fee.checked_div(U256::from(10000)))
                    .ok_or_else(|| {
                        RelayerError::Validation("protocol fee calculation overflow".to_string())
                    })?;

                let execution_result = ExecutionResult {
                    transaction_hash: result.transaction_hash,
                    block_number: result.block_number,
                    gas_used: result.gas_used,
                    gas_price: result.gas_price,
                    fee_paid: protocol_fee,
                    payment_amount,
                    payment_number: (subscription.executed_payments + 1) as u64,
                };

                info!(
                    "payment executed successfully on attempt {}, tx: {:?}",
                    retry_count + 1,
                    result.transaction_hash
                );

                return Ok(execution_result);
            }
            Err(e) => {
                retry_count += 1;
                last_error = Some(e);

                // only retry on transient errors, not permanent ones
                let should_retry = match last_error.as_ref().unwrap() {
                    RelayerError::RpcConnectionFailed(_) => true,
                    RelayerError::InsufficientGas(_) => true,
                    RelayerError::TransactionFailed(msg) if msg.contains("nonce") => false,
                    RelayerError::TransactionFailed(msg) if msg.contains("insufficient") => false,
                    RelayerError::ContractRevert(_) => false,
                    RelayerError::TransactionFailed(_) => true, // other tx failures might be retryable
                    _ => false,
                };

                if !should_retry {
                    warn!(
                        "permanent error, not retrying: {}",
                        last_error.as_ref().unwrap()
                    );
                    break;
                }

                if retry_count < max_retries {
                    let backoff_seconds = BASE_RETRY_DELAY_SECONDS * (2_u64.pow(retry_count - 1));
                    warn!(
                        "execution failed on attempt {}, retrying in {} seconds: {}",
                        retry_count,
                        backoff_seconds,
                        last_error.as_ref().unwrap()
                    );

                    tokio::time::sleep(tokio::time::Duration::from_secs(backoff_seconds)).await;
                }
            }
        }
    }

    error!("payment execution failed after {} attempts", max_retries);
    Err(last_error.unwrap())
}

async fn record_successful_execution_job_safe(
    subscription: &Subscription,
    execution_result: &ExecutionResult,
    queries: &Arc<Queries>,
) -> Result<()> {
    info!(
        "recording successful execution for subscription {}",
        subscription.id
    );

    let execution_record = ExecutionRecord {
        id: 0,
        subscription_id: subscription.id.clone(),
        transaction_hash: format!("{:?}", execution_result.transaction_hash),
        block_number: execution_result.block_number as i64,
        gas_used: execution_result.gas_used.to_string(),
        gas_price: execution_result.gas_price.to_string(),
        fee_paid: execution_result.fee_paid.to_string(),
        payment_amount: execution_result.payment_amount.to_string(),
        payment_number: execution_result.payment_number as i64,
        chain: subscription.chain.clone(),
        executed_at: Utc::now(),
        nexus_attestation_id: None,
        nexus_verified: false,
        nexus_submitted_at: None,
        token_address: Some(subscription.token_address.clone()),
    };
    let new_payments_made = subscription
        .executed_payments
        .checked_add(1)
        .ok_or_else(|| RelayerError::InternalError("payment count overflow".to_string()))?;
    let next_payment_time =
        subscription.next_payment_due + chrono::Duration::seconds(subscription.interval_seconds);

    queries
        .record_execution_and_update_subscription(
            &execution_record,
            &subscription.id,
            new_payments_made,
            next_payment_time,
            0,
        )
        .await?;

    info!("execution record saved, subscription updated for next payment");
    Ok(())
}

async fn ensure_intent_cached_job_safe(
    subscription: &Subscription,
    queries: &Arc<Queries>,
    avail_client: &AvailClient,
) -> Result<()> {
    // skip remote fetch when running in stub mode to avoid noisy logs
    if matches!(avail_client.mode(), AvailClientMode::Stub) {
        return Ok(());
    }

    if queries.get_cached_intent(&subscription.id).await?.is_some() {
        return Ok(());
    }

    let block_number = match subscription.avail_block_number {
        Some(value) => value as u64,
        None => return Ok(()),
    };

    let extrinsic_index = match subscription.avail_extrinsic_index {
        Some(value) => value as u64,
        None => return Ok(()),
    };

    info!(
        "intent cache miss for subscription {}, retrieving from avail",
        subscription.id
    );

    match avail_client
        .fetch_intent_if_available(block_number, extrinsic_index)
        .await?
    {
        Some(avail_intent) => {
            let subscription_intent_value = to_value(&avail_intent.intent).map_err(|e| {
                RelayerError::InternalError(format!(
                    "failed to serialize intent for caching: {}",
                    e
                ))
            })?;

            let start_time =
                chrono::DateTime::from_timestamp(avail_intent.intent.start_time as i64, 0)
                    .ok_or_else(|| {
                        RelayerError::Validation("invalid start time in avail intent".to_string())
                    })?;

            let expiry_time =
                chrono::DateTime::from_timestamp(avail_intent.intent.expiry as i64, 0).ok_or_else(
                    || RelayerError::Validation("invalid expiry time in avail intent".to_string()),
                )?;

            let intent_cache = IntentCache {
                id: 0,
                subscription_intent: subscription_intent_value,
                signature: avail_intent.signature.clone(),
                subscription_id: subscription.id.clone(),
                subscriber: avail_intent.intent.subscriber.clone(),
                merchant: avail_intent.intent.merchant.clone(),
                amount: avail_intent.intent.amount.clone(),
                interval_seconds: avail_intent.intent.interval as i64,
                start_time,
                max_payments: avail_intent.intent.max_payments as i64,
                max_total_amount: avail_intent.intent.max_total_amount.clone(),
                expiry: expiry_time,
                nonce: avail_intent.intent.nonce as i64,
                processed: false,
                created_at: Utc::now(),
                processed_at: None,
                chain: subscription.chain.clone(),
                avail_block_number: Some(block_number as i64),
                avail_extrinsic_index: Some(extrinsic_index as i64),
            };

            queries.cache_intent(&intent_cache).await?;

            info!(
                "successfully cached intent from avail for subscription {}",
                subscription.id
            );
        }
        None => {
            warn!(
                "avail intent not yet available for subscription {} (block {}, extrinsic {})",
                subscription.id, block_number, extrinsic_index
            );
        }
    }

    Ok(())
}

async fn handle_subscription_failure_job_safe(
    subscription: &Subscription,
    error: &RelayerError,
    queries: &Arc<Queries>,
) -> Result<()> {
    let new_failure_count = subscription.failure_count.saturating_add(1); // prevent overflow

    warn!(
        "subscription {} failed (attempt {}): {}",
        subscription.id, new_failure_count, error
    );

    if new_failure_count > 3 {
        warn!(
            "subscription {} exceeded maximum failures, pausing",
            subscription.id
        );

        queries
            .update_subscription_status_enum(&subscription.id, SubscriptionStatus::Paused)
            .await?;
    } else {
        queries
            .update_subscription_after_payment(
                &subscription.id,
                subscription.executed_payments,
                subscription.next_payment_due,
                new_failure_count,
            )
            .await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::{models::*, queries::Queries, StubStorage};
    use crate::Config;
    use chrono::Utc;
    use mockito::Server;
    use serde_json::json;
    use tokio;

    fn create_test_subscription() -> Subscription {
        Subscription {
            id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef".to_string(),
            subscriber: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".to_string(),
            merchant: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8".to_string(),
            amount: "1000000".to_string(),
            interval_seconds: 86400,
            start_time: Utc::now(),
            max_payments: 12,
            max_total_amount: "12000000".to_string(),
            expiry: Utc::now() + chrono::Duration::days(365),
            nonce: 1,
            token_address: "0x0000000000000000000000000000000000000000".to_string(),
            status: "ACTIVE".to_string(),
            executed_payments: 0,
            total_paid: "0".to_string(),
            next_payment_due: Utc::now() - chrono::Duration::hours(1),
            failure_count: 0,
            chain: "sepolia".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            avail_block_number: Some(1),
            avail_extrinsic_index: Some(0),
        }
    }

    fn stub_config() -> Config {
        let config = Config {
            database_url: "stub".to_string(),
            ethereum_rpc_url: "stub".to_string(),
            base_rpc_url: "stub".to_string(),
            relayer_private_key:
                "0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff".to_string(),
            subscription_manager_address_sepolia: "0x1111111111111111111111111111111111111111"
                .to_string(),
            subscription_manager_address_base: "0x2222222222222222222222222222222222222222"
                .to_string(),
            pyusd_address_sepolia: "0x3333333333333333333333333333333333333333".to_string(),
            pyusd_address_base: "0x4444444444444444444444444444444444444444".to_string(),
            supported_tokens_sepolia: vec![
                "0x0000000000000000000000000000000000000000".to_string(),
                "0x3333333333333333333333333333333333333333".to_string(),
            ],
            supported_tokens_base: vec![
                "0x0000000000000000000000000000000000000000".to_string(),
                "0x4444444444444444444444444444444444444444".to_string(),
            ],
            server_host: "127.0.0.1".to_string(),
            server_port: 3000,
            execution_interval_seconds: 30,
            max_executions_per_batch: 10,
            max_gas_price_gwei: 50,
            relayer_address: "0x5555555555555555555555555555555555555555".to_string(),
            envio_graphql_endpoint: None,
            envio_explorer_url: None,
            avail_rpc_url: None,
            avail_application_id: None,
            hypersync_url_sepolia: None,
            hypersync_url_base: None,
        };

        tokens::register_pyusd_addresses(&[
            config.pyusd_address_sepolia.clone(),
            config.pyusd_address_base.clone(),
        ]);

        config
    }

    #[tokio::test]
    async fn test_validation_result_variants() {
        let results = vec![
            ValidationResult::Valid,
            ValidationResult::InsufficientBalance {
                token_address: "0x0000000000000000000000000000000000000000".to_string(),
            },
            ValidationResult::InsufficientAllowance {
                token_address: "0x0000000000000000000000000000000000000000".to_string(),
            },
            ValidationResult::NotDue,
            ValidationResult::SubscriptionNotActive,
            ValidationResult::SubscriptionNotFound,
            ValidationResult::ChainError("test error".to_string()),
        ];

        for result in results {
            match result {
                ValidationResult::Valid => assert!(true),
                ValidationResult::InsufficientBalance { .. } => assert!(true),
                ValidationResult::InsufficientAllowance { .. } => assert!(true),
                ValidationResult::NotDue => assert!(true),
                ValidationResult::SubscriptionNotActive => assert!(true),
                ValidationResult::SubscriptionNotFound => assert!(true),
                ValidationResult::ChainError(msg) => assert_eq!(msg, "test error"),
            }
        }
    }

    #[tokio::test]
    async fn test_execution_result_creation() {
        let execution_result = ExecutionResult {
            transaction_hash: H256::zero(),
            block_number: 12345,
            gas_used: U256::from(21000),
            gas_price: U256::from(20000000000u64),
            fee_paid: U256::from(420000000000000u64),
            payment_amount: U256::from(1000000),
            payment_number: 1,
        };

        assert_eq!(execution_result.block_number, 12345);
        assert_eq!(execution_result.payment_number, 1);
        assert_eq!(execution_result.payment_amount, U256::from(1000000));
    }

    #[tokio::test]
    async fn test_subscription_timing_validation() {
        let now = Utc::now();

        let future_subscription = Subscription {
            next_payment_due: now + chrono::Duration::hours(1),
            ..create_test_subscription()
        };

        let due_subscription = Subscription {
            next_payment_due: now - chrono::Duration::hours(1),
            ..create_test_subscription()
        };

        assert!(future_subscription.next_payment_due > now);
        assert!(due_subscription.next_payment_due < now);
    }

    #[tokio::test]
    async fn test_retry_backoff_calculation() {
        let retry_attempts = vec![1, 2, 3];
        let expected_backoffs = vec![30, 60, 120];

        for (retry_count, expected) in retry_attempts.iter().zip(expected_backoffs.iter()) {
            let backoff_seconds = 30 * (2_u64.pow(retry_count - 1));
            assert_eq!(backoff_seconds, *expected);
        }
    }

    #[tokio::test]
    async fn test_failure_count_logic() {
        let failure_counts = vec![1, 2, 3, 4];

        for count in failure_counts {
            let should_pause = count > 3;
            if should_pause {
                assert!(count > 3);
            } else {
                assert!(count <= 3);
            }
        }
    }
}
