use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::Utc;
use ethers::types::Address;
use serde::Deserialize;
use std::str::FromStr;
use std::sync::Arc;
use tracing::{debug, info};

use super::envio::EnvioClient;
use super::types::*;
use super::validation::ValidationService;
use crate::blockchain::BlockchainClient;
use crate::database::models::{IntentCache, Subscription};
use crate::{AppState, RelayerError, Result};

// post /api/v1/intent
pub async fn submit_intent_handler(
    State(app_state): State<Arc<AppState>>,
    Json(request): Json<SubmitIntentRequest>,
) -> Result<Json<SubmitIntentResponse>> {
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
    };

    let intent_id = app_state
        .database
        .queries()
        .cache_intent(&intent_cache)
        .await?;
    info!("cached intent with ID: {}", intent_id);

    let avail_block = 0u64;
    let avail_extrinsic = 0u64;

    info!(
        "stubbed Avail DA submission - block: {}, extrinsic: {}",
        avail_block, avail_extrinsic
    );

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
        status: "ACTIVE".to_string(),
        executed_payments: 0,
        total_paid: "0".to_string(),
        next_payment_due: chrono::DateTime::from_timestamp(request.intent.start_time as i64, 0)
            .ok_or_else(|| RelayerError::Validation("invalid start time".to_string()))?,
        failure_count: 0,
        chain: chain.to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    app_state
        .database
        .queries()
        .insert_subscription(&subscription)
        .await?;

    info!("successfully created subscription: {}", subscription_id);

    let response = SubmitIntentResponse {
        subscription_id,
        avail_block,
        avail_extrinsic,
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

    let blockchain_client = BlockchainClient::new(&app_state.config).await?;

    let subscription_id_bytes = hex::decode(&subscription_id[2..])
        .map_err(|_| RelayerError::Validation("invalid subscription ID format".to_string()))?
        .try_into()
        .map_err(|_| RelayerError::Validation("subscription ID must be 32 bytes".to_string()))?;

    let on_chain_data = blockchain_client
        .get_subscription(subscription_id_bytes, &subscription.chain)
        .await?;

    let (on_chain_status, on_chain_payments, contract_address) = if let Some(data) = on_chain_data {
        (
            data.status,
            data.executed_payments.as_u64(),
            format!("0x{:x}", data.subscriber),
        )
    } else {
        (255u8, 0u64, "not found".to_string()) // 255 = not found
    };

    let next_payment_timestamp = if subscription.executed_payments < subscription.max_payments {
        subscription.start_time.timestamp() as u64
            + ((subscription.executed_payments as u64) * (subscription.interval_seconds as u64))
    } else {
        0 // no more payments
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
    };

    info!("successfully retrieved subscription: {}", subscription_id);
    Ok(Json(response))
}

// query parameters for transactions endpoint
#[derive(Debug, Deserialize)]
pub struct TransactionQueryParams {
    page: Option<u32>,
    size: Option<u32>,
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

    let envio_url = app_state
        .config
        .envio_hyperindex_url
        .clone()
        .unwrap_or_else(|| "https://indexer.bigdevenergy.link/a5a74b6/v1/graphql".to_string());
    let envio_client = EnvioClient::new(envio_url);

    let (transactions, total_count, total_revenue) = envio_client
        .get_merchant_transactions(&merchant_address, page, page_size)
        .await?;

    let has_more = (page + 1) * page_size < (total_count as u32);
    let explorer_url = envio_client.get_explorer_url(&merchant_address);

    let response = MerchantTransactionsResponse {
        transactions,
        count: total_count,
        total_revenue,
        envio_explorer_url: explorer_url,
        page,
        has_more,
    };

    info!(
        "successfully fetched {} transactions for merchant {}",
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

    let envio_url = app_state
        .config
        .envio_hyperindex_url
        .clone()
        .unwrap_or_else(|| "https://indexer.bigdevenergy.link/a5a74b6/v1/graphql".to_string());
    let envio_client = EnvioClient::new(envio_url);

    let stats = envio_client.get_merchant_stats(&merchant_address).await?;

    info!(
        "successfully fetched stats for merchant {}: {} transactions, {} revenue",
        merchant_address, stats.total_transactions, stats.total_revenue
    );

    Ok(Json(stats))
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
    let rpc_health = match BlockchainClient::new(&app_state.config).await {
        Ok(client) => match client.validate_connection("sepolia").await {
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
        },
        Err(e) => ServiceStatus {
            healthy: false,
            response_time_ms: None,
            error: Some(e.to_string()),
        },
    };

    let _envio_start = std::time::Instant::now();
    let envio_health = if let Some(envio_url) = &app_state.config.envio_hyperindex_url {
        let envio_client = EnvioClient::new(envio_url.clone());
        match envio_client.health_check().await {
            Ok(response_time) => ServiceStatus {
                healthy: true,
                response_time_ms: Some(response_time),
                error: None,
            },
            Err(e) => ServiceStatus {
                healthy: false,
                response_time_ms: None,
                error: Some(e.to_string()),
            },
        }
    } else {
        ServiceStatus {
            healthy: false,
            response_time_ms: None,
            error: Some("Envio URL not configured".to_string()),
        }
    };

    let overall_healthy = database_health.healthy && rpc_health.healthy && envio_health.healthy;
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
        },
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
