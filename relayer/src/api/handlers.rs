use axum::{
    extract::{rejection::JsonRejection, Path, Query, State},
    Json,
};
use chrono::Utc;
use ethers::types::{Address, U256};
use serde::Deserialize;
use std::convert::TryFrom;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Instant;
use tracing::{debug, info, warn};

use super::types::*;
use super::validation::ValidationService;
use crate::database::models::{IntentCache, Subscription};
use crate::integrations::hypersync::{HyperSyncClient, RawPaymentEvent};
use crate::metrics::MetricsSnapshot;
use crate::{AppState, RelayerError, Result};

// post /api/v1/intent
pub async fn submit_intent_handler(
    State(app_state): State<Arc<AppState>>,
    payload: std::result::Result<Json<SubmitIntentRequest>, JsonRejection>,
) -> Result<Json<SubmitIntentResponse>> {
    let Json(request) = payload.map_err(|rejection| {
        RelayerError::Validation(format!("invalid request body: {}", rejection))
    })?;
    info!(
        "received intent submission request for subscriber: {}",
        request.intent.subscriber
    );

    request
        .intent
        .validate_consistency()
        .map_err(|e| RelayerError::Validation(format!("intent validation failed: {}", e)))?;

    let chain = "sepolia";
    let verifying_contract = Address::from_str(
        &app_state.config.subscription_manager_address_sepolia,
    )
    .map_err(|_| RelayerError::Validation("invalid subscription manager address".to_string()))?;
    let chain_id = app_state.blockchain_client.chain_id(chain)?;

    ValidationService::validate_intent_signature(
        &request.intent,
        &request.signature,
        verifying_contract,
        chain_id,
    )?;

    ValidationService::validate_timing(
        request.intent.start_time,
        request.intent.expiry,
        request.intent.interval,
    )?;

    ValidationService::validate_payment_parameters(
        &request.intent.amount,
        request.intent.max_payments,
        &request.intent.max_total_amount,
    )?;

    let subscription_id =
        ValidationService::generate_subscription_id(&request.intent, &request.signature)?;

    info!("generated subscription ID: {}", subscription_id);

    if app_state
        .database
        .queries()
        .is_nonce_used(&request.intent.subscriber, request.intent.nonce as i64)
        .await?
    {
        return Err(RelayerError::Validation(
            "nonce already used by this subscriber (replay attack prevented)".to_string(),
        ));
    }

    if let Ok(Some(_)) = app_state
        .database
        .queries()
        .get_subscription(&subscription_id)
        .await
    {
        return Err(RelayerError::Duplicate(
            "subscription already exists".to_string(),
        ));
    }

    let avail_submission = app_state
        .avail_client
        .submit_intent(
            &request.intent,
            &request.signature,
            &app_state.config.relayer_address,
            chain_id,
        )
        .await?;

    info!(
        "intent submitted to avail - block: {}, extrinsic: {}",
        avail_submission.block_number, avail_submission.extrinsic_index
    );

    let intent_cache = IntentCache {
        id: 0,
        subscription_intent: serde_json::to_value(&request.intent).map_err(|e| {
            RelayerError::InternalError(format!("failed to serialize intent: {}", e))
        })?,
        signature: request.signature.clone(),
        subscription_id: subscription_id.clone(),
        subscriber: request.intent.subscriber.clone(),
        merchant: request.intent.merchant.clone(),
        amount: request.intent.amount.clone(),
        interval_seconds: request.intent.interval as i64,
        start_time: chrono::DateTime::from_timestamp(request.intent.start_time as i64, 0)
            .ok_or_else(|| RelayerError::Validation("invalid start time".to_string()))?,
        max_payments: request.intent.max_payments as i64,
        max_total_amount: request.intent.max_total_amount.clone(),
        expiry: chrono::DateTime::from_timestamp(request.intent.expiry as i64, 0)
            .ok_or_else(|| RelayerError::Validation("invalid expiry time".to_string()))?,
        nonce: request.intent.nonce as i64,
        processed: false,
        created_at: Utc::now(),
        processed_at: None,
        chain: chain.to_string(),
        avail_block_number: Some(avail_submission.block_number as i64),
        avail_extrinsic_index: Some(avail_submission.extrinsic_index as i64),
    };

    let intent_id = app_state
        .database
        .queries()
        .cache_intent(&intent_cache)
        .await?;
    info!("cached intent with ID: {}", intent_id);

    let subscription = Subscription {
        id: subscription_id.clone(),
        subscriber: request.intent.subscriber.clone(),
        merchant: request.intent.merchant.clone(),
        amount: request.intent.amount.clone(),
        interval_seconds: request.intent.interval as i64,
        start_time: chrono::DateTime::from_timestamp(request.intent.start_time as i64, 0)
            .ok_or_else(|| RelayerError::Validation("invalid start time".to_string()))?,
        max_payments: request.intent.max_payments as i64,
        max_total_amount: request.intent.max_total_amount.clone(),
        expiry: chrono::DateTime::from_timestamp(request.intent.expiry as i64, 0)
            .ok_or_else(|| RelayerError::Validation("invalid expiry time".to_string()))?,
        nonce: request.intent.nonce as i64,
        token: request.intent.token.clone(),
        status: "ACTIVE".to_string(),
        executed_payments: 0,
        total_paid: "0".to_string(),
        next_payment_due: chrono::DateTime::from_timestamp(request.intent.start_time as i64, 0)
            .ok_or_else(|| RelayerError::Validation("invalid start time".to_string()))?,
        failure_count: 0,
        chain: chain.to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        avail_block_number: Some(avail_submission.block_number as i64),
        avail_extrinsic_index: Some(avail_submission.extrinsic_index as i64),
    };

    app_state
        .database
        .queries()
        .insert_subscription(&subscription)
        .await?;

    info!("successfully created subscription: {}", subscription_id);

    let response = SubmitIntentResponse {
        subscription_id,
        avail_block: avail_submission.block_number,
        avail_extrinsic: avail_submission.extrinsic_index,
        status: "ACTIVE".to_string(),
    };

    Ok(Json(response))
}

// get /api/v1/subscription/:id
pub async fn get_subscription_handler(
    Path(subscription_id): Path<String>,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<SubscriptionResponse>> {
    info!("fetching subscription: {}", subscription_id);

    ValidationService::validate_subscription_id_format(&subscription_id)?;

    let subscription = app_state
        .database
        .queries()
        .get_subscription(&subscription_id)
        .await?
        .ok_or_else(|| RelayerError::NotFound("subscription not found".to_string()))?;

    let blockchain_client = app_state.blockchain_client.clone();

    let subscription_id_bytes = hex::decode(&subscription_id[2..])
        .map_err(|_| RelayerError::Validation("invalid subscription ID format".to_string()))?
        .try_into()
        .map_err(|_| RelayerError::Validation("subscription ID must be 32 bytes".to_string()))?;

    let on_chain_data = blockchain_client
        .get_subscription(subscription_id_bytes, &subscription.chain)
        .await?;

    let (on_chain_status, on_chain_payments) = if let Some(data) = on_chain_data {
        (data.status, data.executed_payments.as_u64())
    } else {
        (255u8, 0u64)
    };

    let contract_address = app_state
        .config
        .subscription_manager_address_for_chain(&subscription.chain)
        .map_err(|e| RelayerError::Validation(e.to_string()))?
        .to_string();

    let next_payment_timestamp = if subscription.executed_payments < subscription.max_payments {
        subscription.next_payment_due.timestamp().max(0) as u64
    } else {
        0
    };

    let response = SubscriptionResponse {
        id: subscription.id,
        subscriber: subscription.subscriber,
        merchant: subscription.merchant,
        amount: subscription.amount,
        interval: subscription.interval_seconds as u64,
        start_time: subscription.start_time.timestamp() as u64,
        max_payments: subscription.max_payments as u64,
        max_total_amount: subscription.max_total_amount,
        expiry: subscription.expiry.timestamp() as u64,
        nonce: subscription.nonce as u64,
        token: subscription.token,
        status: subscription.status,
        executed_payments: subscription.executed_payments as u64,
        total_paid: subscription.total_paid,
        next_payment_time: next_payment_timestamp,
        failure_count: subscription.failure_count as u32,
        chain: subscription.chain,
        created_at: subscription.created_at,
        updated_at: subscription.updated_at,
        on_chain_status,
        on_chain_payments,
        contract_address,
        avail_block: subscription.avail_block_number.map(|v| v as u64),
        avail_extrinsic: subscription.avail_extrinsic_index.map(|v| v as u64),
    };

    info!("successfully retrieved subscription: {}", subscription_id);
    Ok(Json(response))
}

// query parameters for transactions endpoint
#[derive(Debug, Deserialize)]
pub struct TransactionQueryParams {
    page: Option<u32>,
    size: Option<u32>,
    #[serde(default)]
    use_hypersync: Option<bool>,
    #[serde(default)]
    from_block: Option<u64>,
    #[serde(default)]
    to_block: Option<u64>,
    #[serde(default)]
    chain: Option<String>,
}

// get /api/v1/merchant/:address/transactions
pub async fn get_merchant_transactions_handler(
    Path(merchant_address): Path<String>,
    Query(params): Query<TransactionQueryParams>,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<MerchantTransactionsResponse>> {
    info!("fetching transactions for merchant: {}", merchant_address);

    ValidationService::validate_address_format(&merchant_address)?;

    let page = params.page.unwrap_or(0);
    let page_size = params.size.unwrap_or(50).min(100);
    let use_hypersync = params.use_hypersync.unwrap_or(false);
    let chain_name = params.chain.as_deref().unwrap_or("sepolia");

    // prefer hypersync when available to sidestep heavyweight rpc scans
    if use_hypersync {
        let chain_id = app_state.blockchain_client.chain_id(chain_name)?;
        let contract_address = app_state
            .config
            .subscription_manager_address_for_chain(chain_name)?
            .to_string();

        let current_block = app_state
            .blockchain_client
            .get_current_block_number(chain_name)
            .await?;

        let to_block = params.to_block.unwrap_or(current_block);
        let default_window = 100_000u64;
        let from_block = params
            .from_block
            .unwrap_or_else(|| to_block.saturating_sub(default_window));

        if from_block > to_block {
            return Err(RelayerError::Validation(
                "from_block cannot be greater than to_block".to_string(),
            ));
        }

        let merchant_lower = merchant_address.to_lowercase();
        let start_timer = Instant::now();

        let hyper_result: Result<(Vec<RawPaymentEvent>, &'static str)> =
            if let Some(hypersync) = app_state.hypersync_client.as_ref() {
                match hypersync
                    .get_historical_payments(chain_id, &contract_address, from_block, to_block)
                    .await
                {
                    Ok(events) => Ok((events, "hypersync")),
                    Err(err) => {
                        warn!(
                            "HyperSync query failed for merchant {} on {}: {}; falling back to RPC",
                            merchant_address, chain_name, err
                        );
                        HyperSyncClient::fetch_payments_via_rpc_static(
                            &app_state.blockchain_client,
                            chain_name,
                            chain_id,
                            &contract_address,
                            from_block,
                            to_block,
                        )
                        .await
                        .map(|events| (events, "rpc"))
                    }
                }
            } else {
                warn!(
                    "HyperSync client not configured; using RPC fallback for merchant {}",
                    merchant_address
                );
                HyperSyncClient::fetch_payments_via_rpc_static(
                    &app_state.blockchain_client,
                    chain_name,
                    chain_id,
                    &contract_address,
                    from_block,
                    to_block,
                )
                .await
                .map(|events| (events, "rpc"))
            };

        match hyper_result {
            Ok((events, data_source)) => {
                let mut total_revenue = U256::zero();
                let mut transactions: Vec<TransactionData> = Vec::new();

                for event in events
                    .into_iter()
                    .filter(|event| event.merchant == merchant_lower)
                {
                    total_revenue = total_revenue.checked_add(event.amount).unwrap_or(U256::MAX);

                    let timestamp = match app_state
                        .blockchain_client
                        .get_block_timestamp(chain_name, event.block_number)
                        .await
                    {
                        Ok(value) => value,
                        Err(err) => {
                            warn!(
                                "failed to fetch timestamp for block {} on {}: {}",
                                event.block_number, chain_name, err
                            );
                            continue;
                        }
                    };

                    transactions.push(TransactionData {
                        subscription_id: event.subscription_id.clone(),
                        subscriber: event.subscriber.clone(),
                        merchant: event.merchant.clone(),
                        payment_number: event.payment_number,
                        amount: event.amount.to_string(),
                        fee: event.fee.to_string(),
                        relayer: event.relayer.clone(),
                        transaction_hash: event.transaction_hash.clone(),
                        block_number: event.block_number,
                        timestamp,
                        chain: chain_name.to_string(),
                        token: event.token.clone(),
                    });
                }

                let total_count = transactions.len();
                let start_index = (page as usize).saturating_mul(page_size as usize);
                let end_index = (start_index + page_size as usize).min(total_count);
                let has_more = end_index < total_count;
                let paginated = if start_index < total_count {
                    transactions[start_index..end_index].to_vec()
                } else {
                    Vec::new()
                };

                app_state
                    .metrics
                    .record_hypersync_query(start_timer.elapsed());

                let explorer_url = app_state
                    .envio_client
                    .build_explorer_url("merchants", &merchant_lower)
                    .unwrap_or_else(|| "https://explorer.envio.dev".to_string());

                let response = MerchantTransactionsResponse {
                    transactions: paginated,
                    count: total_count as u64,
                    total_revenue: total_revenue.to_string(),
                    envio_explorer_url: explorer_url,
                    page,
                    has_more,
                    data_source: data_source.to_string(),
                };

                info!(
                    "successfully fetched {} transactions for merchant {} via {}",
                    response.transactions.len(),
                    merchant_address,
                    response.data_source
                );

                return Ok(Json(response));
            }
            Err(err) => {
                warn!(
                    "failed to fetch merchant transactions via HyperSync/RPC fallback for {}: {}; using Envio",
                    merchant_address, err
                );
            }
        }
    }

    let start_timer = Instant::now();
    let envio_result = app_state
        .envio_client
        .get_merchant_transactions(&merchant_address, page, page_size)
        .await?;
    app_state.metrics.record_envio_query(start_timer.elapsed());

    let response = MerchantTransactionsResponse {
        transactions: envio_result.transactions,
        count: envio_result.total_count,
        total_revenue: envio_result.total_revenue,
        envio_explorer_url: envio_result
            .explorer_url
            .unwrap_or_else(|| "https://explorer.envio.dev".to_string()),
        page,
        has_more: envio_result.has_more,
        data_source: "envio".to_string(),
    };

    info!(
        "successfully fetched {} transactions for merchant {} via envio",
        response.transactions.len(),
        merchant_address
    );

    Ok(Json(response))
}

// get /api/v1/merchant/:address/stats
pub async fn get_merchant_stats_handler(
    Path(merchant_address): Path<String>,
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<MerchantStatsResponse>> {
    info!("fetching stats for merchant: {}", merchant_address);

    ValidationService::validate_address_format(&merchant_address)?;

    let stats = app_state
        .envio_client
        .get_merchant_stats(&merchant_address)
        .await?;

    let (stats_response, explorer_url) = if let Some(data) = stats {
        let response = MerchantStatsResponse {
            merchant: data.merchant.clone(),
            total_revenue: data.total_revenue.clone(),
            total_transactions: data.total_payments as u64,
            active_subscriptions: data.active_subscriptions as u64,
            total_subscriptions: data.total_subscriptions as u64,
            average_transaction_value: calculate_average_transaction_value(
                &data.total_revenue,
                data.total_payments,
            ),
            first_transaction_date: None,
            last_transaction_date: None,
            monthly_revenue: Vec::new(),
            envio_explorer_url: app_state
                .envio_client
                .build_explorer_url("merchants", &data.merchant)
                .unwrap_or_else(|| "https://explorer.envio.dev".to_string()),
        };
        (response.clone(), response.envio_explorer_url.clone())
    } else {
        let address = merchant_address.to_lowercase();
        let explorer = app_state
            .envio_client
            .build_explorer_url("merchants", &address)
            .unwrap_or_else(|| "https://explorer.envio.dev".to_string());
        (
            MerchantStatsResponse {
                merchant: address.clone(),
                total_revenue: "0".to_string(),
                total_transactions: 0,
                active_subscriptions: 0,
                total_subscriptions: 0,
                average_transaction_value: "0".to_string(),
                first_transaction_date: None,
                last_transaction_date: None,
                monthly_revenue: Vec::new(),
                envio_explorer_url: explorer.clone(),
            },
            explorer,
        )
    };

    info!(
        "successfully fetched stats for merchant {} (explorer: {})",
        merchant_address, explorer_url
    );

    Ok(Json(stats_response))
}

pub async fn verify_cross_chain_handler(
    State(app_state): State<Arc<AppState>>,
    Json(request): Json<CrossChainVerificationRequest>,
) -> Result<Json<CrossChainVerificationResponse>> {
    let nexus_client = app_state
        .nexus_client
        .as_ref()
        .ok_or_else(|| RelayerError::InternalError("nexus client not configured".to_string()))?;

    ValidationService::validate_subscription_id_format(&request.subscription_id)?;
    let subscription_bytes = subscription_hex_to_bytes(&request.subscription_id)?;

    let summary = nexus_client
        .verify_cross_chain_subscription(&subscription_bytes, request.source_chain_id)
        .await?;

    let verified = summary.exists && summary.payment_count > 0;
    let response = CrossChainVerificationResponse {
        verified,
        payment_count: summary.payment_count,
        total_amount: summary.total_amount.to_string(),
        last_payment_block: summary.last_payment_block,
    };

    if let Err(err) = app_state
        .database
        .queries()
        .insert_cross_chain_verification(
            &request.subscription_id,
            i32::try_from(request.source_chain_id).unwrap_or(i32::MAX),
            i32::try_from(request.source_chain_id).unwrap_or(i32::MAX),
            None,
            response.verified,
        )
        .await
    {
        warn!(
            "failed to persist cross-chain verification for {}: {}",
            request.subscription_id, err
        );
    }

    Ok(Json(response))
}

// get /health
pub async fn health_check_handler(
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<HealthResponse>> {
    debug!("performing comprehensive health check");

    let start_time = std::time::Instant::now();

    let database_health = match app_state.database.ping().await {
        Ok(_) => {
            let response_time = start_time.elapsed().as_millis() as u64;
            ServiceStatus {
                healthy: true,
                response_time_ms: Some(response_time),
                error: None,
            }
        }
        Err(e) => ServiceStatus {
            healthy: false,
            response_time_ms: None,
            error: Some(e.to_string()),
        },
    };

    let rpc_start = std::time::Instant::now();
    let blockchain_client = app_state.blockchain_client.clone();
    let rpc_health = match blockchain_client.validate_connection("sepolia").await {
        Ok(_) => {
            let response_time = rpc_start.elapsed().as_millis() as u64;
            ServiceStatus {
                healthy: true,
                response_time_ms: Some(response_time),
                error: None,
            }
        }
        Err(e) => ServiceStatus {
            healthy: false,
            response_time_ms: None,
            error: Some(e.to_string()),
        },
    };

    let envio_start = std::time::Instant::now();
    let envio_health = match app_state.envio_client.health_check().await {
        Ok(true) => ServiceStatus {
            healthy: true,
            response_time_ms: Some(envio_start.elapsed().as_millis() as u64),
            error: None,
        },
        Ok(false) => ServiceStatus {
            healthy: false,
            response_time_ms: Some(envio_start.elapsed().as_millis() as u64),
            error: Some("Envio health check reported unhealthy".to_string()),
        },
        Err(e) => ServiceStatus {
            healthy: false,
            response_time_ms: None,
            error: Some(e.to_string()),
        },
    };

    let nexus_start = std::time::Instant::now();
    let (nexus_health, nexus_latest_block) = match app_state.nexus_client.as_ref() {
        Some(client) => match client.health_check().await {
            Ok(status) => (
                ServiceStatus {
                    healthy: status.healthy,
                    response_time_ms: Some(nexus_start.elapsed().as_millis() as u64),
                    error: None,
                },
                status.latest_block,
            ),
            Err(err) => (
                ServiceStatus {
                    healthy: false,
                    response_time_ms: None,
                    error: Some(err.to_string()),
                },
                None,
            ),
        },
        None => (
            ServiceStatus {
                healthy: false,
                response_time_ms: None,
                error: Some("Nexus client not configured".to_string()),
            },
            None,
        ),
    };

    let overall_healthy = database_health.healthy
        && rpc_health.healthy
        && envio_health.healthy
        && (nexus_health.healthy || app_state.nexus_client.is_none());
    let status = if overall_healthy {
        "healthy"
    } else {
        "degraded"
    };

    let response = HealthResponse {
        status: status.to_string(),
        timestamp: Utc::now(),
        services: HealthServices {
            database: database_health,
            rpc: rpc_health,
            envio: envio_health,
            nexus: nexus_health,
        },
        nexus_latest_block,
    };

    info!("health check completed - status: {}", status);
    Ok(Json(response))
}

// get /status (enhanced version of health check)
pub async fn status_check_handler(
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>> {
    info!("status check requested");

    let health_response = health_check_handler(State(app_state.clone())).await?;

    let subscription_stats = match app_state
        .database
        .queries()
        .get_subscription_stats("sepolia")
        .await
    {
        Ok((active, paused, total)) => serde_json::json!({
            "active": active,
            "paused": paused,
            "total": total
        }),
        Err(_) => serde_json::json!({
            "error": "failed to fetch subscription stats"
        }),
    };

    let status_response = serde_json::json!({
        "service": "aurum-relayer",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": Utc::now(),
        "health": health_response.0,
        "subscriptions": subscription_stats,
        "config": {
            "chains_supported": ["sepolia", "base"],
            "api_version": "v1",
            "features": [
                "intent_submission",
                "subscription_tracking",
                "merchant_analytics",
                "envio_integration",
                "distributed_processing"
            ]
        }
    });

    Ok(Json(status_response))
}

fn subscription_hex_to_bytes(id: &str) -> Result<[u8; 32]> {
    if !id.starts_with("0x") || id.len() != 66 {
        return Err(RelayerError::Validation(
            "subscription id must be 32-byte hex string".to_string(),
        ));
    }

    let bytes = hex::decode(&id[2..]).map_err(|_| {
        RelayerError::Validation("subscription id contains invalid hex".to_string())
    })?;

    let mut array = [0u8; 32];
    array.copy_from_slice(&bytes);
    Ok(array)
}

pub async fn metrics_handler(
    State(app_state): State<Arc<AppState>>,
) -> Result<Json<MetricsSnapshot>> {
    let snapshot = app_state.metrics.snapshot();
    Ok(Json(snapshot))
}

fn calculate_average_transaction_value(total_revenue: &str, total_payments: i64) -> String {
    if total_payments <= 0 {
        return "0".to_string();
    }

    match U256::from_dec_str(total_revenue) {
        Ok(revenue) => {
            let payments = U256::from(total_payments as u64);
            let average = revenue / payments;
            average.to_string()
        }
        Err(_) => "0".to_string(),
    }
}
