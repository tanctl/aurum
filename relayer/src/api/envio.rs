use crate::api::types::{
    MerchantStatsResponse, MonthlyRevenue, PaymentExecutedEvent, TransactionData,
};
use crate::error::{RelayerError, Result};
use chrono::{DateTime, Datelike};
use reqwest::Client;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};
use tokio::time::sleep;
use tracing::{debug, info, warn};

#[derive(Clone)]
struct CacheEntry<T> {
    data: T,
    expires_at: SystemTime,
}

pub struct EnvioClient {
    client: Client,
    base_url: String,
    explorer_base_url: String,
    max_retries: u32,
    base_delay_ms: u64,
    // simple in-memory cache for merchant stats (production should use redis)
    stats_cache: Arc<Mutex<HashMap<String, CacheEntry<MerchantStatsResponse>>>>,
    cache_ttl: Duration,
}

impl EnvioClient {
    pub fn new(hyperindex_url: String) -> Self {
        let explorer_base_url = hyperindex_url.replace("/v1/graphql", "/explorer");

        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .expect("failed to create HTTP client"),
            base_url: hyperindex_url,
            explorer_base_url,
            max_retries: 3,
            base_delay_ms: 1000, // 1 second base delay
            stats_cache: Arc::new(Mutex::new(HashMap::new())),
            cache_ttl: Duration::from_secs(300), // 5 minutes cache
        }
    }

    pub async fn health_check(&self) -> Result<u64> {
        let start_time = std::time::Instant::now();

        debug!("checking Envio HyperIndex health");

        let query = r#"
        {
            __schema {
                queryType {
                    name
                }
            }
        }
        "#;

        let response = self
            .client
            .post(&self.base_url)
            .json(&json!({
                "query": query
            }))
            .send()
            .await
            .map_err(|e| {
                RelayerError::RpcConnectionFailed(format!("Envio health check failed: {}", e))
            })?;

        if !response.status().is_success() {
            return Err(RelayerError::RpcConnectionFailed(format!(
                "Envio health check failed with status: {}",
                response.status()
            )));
        }

        let response_time = start_time.elapsed().as_millis() as u64;
        info!("Envio HyperIndex health check passed ({}ms)", response_time);

        Ok(response_time)
    }

    pub async fn get_merchant_transactions(
        &self,
        merchant_address: &str,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<TransactionData>, u64, String)> {
        info!(
            "fetching merchant transactions for {} (page {}, size {})",
            merchant_address, page, page_size
        );

        let offset = page * page_size;

        let query = r#"
        query GetMerchantTransactions($merchant: String!, $limit: Int!, $offset: Int!) {
            PaymentExecuted(
                where: { merchant: { _eq: $merchant } }
                order_by: { blockTimestamp: desc }
                limit: $limit
                offset: $offset
            ) {
                id
                subscriptionId
                subscriber
                merchant
                paymentNumber
                amount
                fee
                relayer
                transactionHash
                blockNumber
                blockTimestamp
                chain_id
            }
            PaymentExecuted_aggregate(where: { merchant: { _eq: $merchant } }) {
                aggregate {
                    count
                    sum {
                        amount
                    }
                }
            }
        }
        "#;

        let variables = json!({
            "merchant": merchant_address.to_lowercase(),
            "limit": page_size,
            "offset": offset
        });

        let response = self.execute_query(query, Some(variables)).await?;

        let events: Vec<PaymentExecutedEvent> = response["PaymentExecuted"]
            .as_array()
            .ok_or_else(|| {
                RelayerError::InternalError("invalid GraphQL response format".to_string())
            })?
            .iter()
            .map(|event| serde_json::from_value(event.clone()))
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| RelayerError::InternalError(format!("failed to parse events: {}", e)))?;

        let total_count = response["PaymentExecuted_aggregate"]["aggregate"]["count"]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        let total_revenue = response["PaymentExecuted_aggregate"]["aggregate"]["sum"]["amount"]
            .as_str()
            .unwrap_or("0")
            .to_string();

        let transactions: Vec<TransactionData> = events
            .into_iter()
            .map(|event| self.convert_event_to_transaction(event))
            .collect::<Result<Vec<_>>>()?;

        info!(
            "fetched {} transactions for merchant {}",
            transactions.len(),
            merchant_address
        );

        Ok((transactions, total_count, total_revenue))
    }

    pub async fn get_merchant_stats(
        &self,
        merchant_address: &str,
    ) -> Result<MerchantStatsResponse> {
        info!("fetching merchant stats for {}", merchant_address);

        // check cache first
        let cache_key = merchant_address.to_lowercase();
        if let Ok(cache) = self.stats_cache.lock() {
            if let Some(entry) = cache.get(&cache_key) {
                if entry.expires_at > SystemTime::now() {
                    debug!("returning cached stats for merchant: {}", merchant_address);
                    return Ok(entry.data.clone());
                }
            }
        }

        // cache miss - fetch from Envio
        let stats = self
            .fetch_merchant_stats_from_envio(merchant_address)
            .await?;

        // cache the result
        if let Ok(mut cache) = self.stats_cache.lock() {
            let expires_at = SystemTime::now() + self.cache_ttl;
            cache.insert(
                cache_key,
                CacheEntry {
                    data: stats.clone(),
                    expires_at,
                },
            );
            debug!(
                "cached stats for merchant: {} (expires in {} seconds)",
                merchant_address,
                self.cache_ttl.as_secs()
            );
        }

        Ok(stats)
    }

    async fn fetch_merchant_stats_from_envio(
        &self,
        merchant_address: &str,
    ) -> Result<MerchantStatsResponse> {
        let query = r#"
        query GetMerchantStats($merchant: String!) {
            PaymentExecuted_aggregate(where: { merchant: { _eq: $merchant } }) {
                aggregate {
                    count
                    sum {
                        amount
                    }
                }
                nodes(order_by: { blockTimestamp: asc }, limit: 1) {
                    blockTimestamp
                }
            }
            PaymentExecuted(
                where: { merchant: { _eq: $merchant } }
                order_by: { blockTimestamp: desc }
                limit: 1
            ) {
                blockTimestamp
            }
            PaymentExecuted(
                where: { merchant: { _eq: $merchant } }
                order_by: { blockTimestamp: desc }
                limit: 100
            ) {
                amount
                blockTimestamp
            }
        }
        "#;

        let variables = json!({
            "merchant": merchant_address.to_lowercase()
        });

        let response = self.execute_query(query, Some(variables)).await?;

        let aggregate = &response["PaymentExecuted_aggregate"]["aggregate"];
        let total_transactions = aggregate["count"]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        let total_revenue = aggregate["sum"]["amount"]
            .as_str()
            .unwrap_or("0")
            .to_string();

        let average_transaction_value = if total_transactions > 0 {
            let total_revenue_u256 = total_revenue.parse::<u128>().unwrap_or(0);
            (total_revenue_u256 / total_transactions as u128).to_string()
        } else {
            "0".to_string()
        };

        let first_transaction_date = response["PaymentExecuted_aggregate"]["nodes"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|event| event["blockTimestamp"].as_str())
            .and_then(|ts| ts.parse::<i64>().ok())
            .map(|ts| DateTime::from_timestamp(ts, 0).unwrap_or_default());

        let last_transaction_date = response["PaymentExecuted"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|event| event["blockTimestamp"].as_str())
            .and_then(|ts| ts.parse::<i64>().ok())
            .map(|ts| DateTime::from_timestamp(ts, 0).unwrap_or_default());

        let monthly_revenue = self.calculate_monthly_revenue(&response["PaymentExecuted"])?;

        let active_subscriptions = 0;
        let total_subscriptions = 0;

        let explorer_url = format!("{}/merchant/{}", self.explorer_base_url, merchant_address);

        let stats = MerchantStatsResponse {
            merchant: merchant_address.to_lowercase(),
            total_revenue,
            total_transactions,
            active_subscriptions,
            total_subscriptions,
            average_transaction_value,
            first_transaction_date,
            last_transaction_date,
            monthly_revenue,
            envio_explorer_url: explorer_url,
        };

        info!(
            "calculated stats for merchant {}: {} transactions, {} revenue",
            merchant_address, total_transactions, stats.total_revenue
        );

        Ok(stats)
    }

    /// clean expired entries from cache (should be called periodically)
    pub fn cleanup_cache(&self) {
        if let Ok(mut cache) = self.stats_cache.lock() {
            let now = SystemTime::now();
            let initial_size = cache.len();
            cache.retain(|_, entry| entry.expires_at > now);
            let removed = initial_size - cache.len();
            if removed > 0 {
                debug!("cleaned {} expired entries from stats cache", removed);
            }
        }
    }

    pub fn get_explorer_url(&self, merchant_address: &str) -> String {
        format!("{}/merchant/{}", self.explorer_base_url, merchant_address)
    }

    async fn execute_query(
        &self,
        query: &str,
        variables: Option<Value>,
    ) -> Result<serde_json::Map<String, Value>> {
        let payload = if let Some(vars) = variables {
            json!({
                "query": query,
                "variables": vars
            })
        } else {
            json!({
                "query": query
            })
        };

        debug!("executing GraphQL query with resilience: {}", query);

        for attempt in 0..=self.max_retries {
            let result = self.execute_query_once(&payload).await;

            match result {
                Ok(data) => {
                    if attempt > 0 {
                        info!("GraphQL query succeeded after {} retries", attempt);
                    }
                    return Ok(data);
                }
                Err(e) => {
                    if attempt == self.max_retries {
                        warn!(
                            "GraphQL query failed after {} attempts: {}",
                            self.max_retries + 1,
                            e
                        );
                        return Err(e);
                    }

                    if self.should_retry(&e) {
                        let delay = self.calculate_backoff(attempt);
                        warn!(
                            "GraphQL query failed (attempt {}), retrying in {} ms: {}",
                            attempt + 1,
                            delay,
                            e
                        );
                        sleep(Duration::from_millis(delay)).await;
                    } else {
                        // don't retry on non-retriable errors
                        return Err(e);
                    }
                }
            }
        }

        unreachable!("retry loop should have returned")
    }

    async fn execute_query_once(&self, payload: &Value) -> Result<serde_json::Map<String, Value>> {
        let response = self
            .client
            .post(&self.base_url)
            .json(payload)
            .send()
            .await
            .map_err(|e| {
                RelayerError::RpcConnectionFailed(format!("GraphQL request failed: {}", e))
            })?;

        if !response.status().is_success() {
            return Err(RelayerError::RpcConnectionFailed(format!(
                "GraphQL request failed with status: {}",
                response.status()
            )));
        }

        let response_body: Value = response.json().await.map_err(|e| {
            RelayerError::InternalError(format!("failed to parse GraphQL response: {}", e))
        })?;

        if let Some(errors) = response_body.get("errors") {
            let error_messages: Vec<String> = errors
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|err| {
                    err["message"]
                        .as_str()
                        .unwrap_or("unknown error")
                        .to_string()
                })
                .collect();

            return Err(RelayerError::InternalError(format!(
                "GraphQL errors: {}",
                error_messages.join(", ")
            )));
        }

        let data = response_body["data"]
            .as_object()
            .ok_or_else(|| RelayerError::InternalError("no data in GraphQL response".to_string()))?
            .clone();

        debug!("GraphQL query executed successfully");
        Ok(serde_json::Map::from_iter(data.into_iter()))
    }

    fn should_retry(&self, error: &RelayerError) -> bool {
        match error {
            RelayerError::RpcConnectionFailed(msg) => {
                // retry on network issues, timeouts, 5xx errors
                msg.contains("timeout") || msg.contains("connection") || msg.contains("5")
                // 5xx status codes
            }
            _ => false, // don't retry on validation errors, etc.
        }
    }

    fn calculate_backoff(&self, attempt: u32) -> u64 {
        // exponential backoff with jitter
        let base_delay = self.base_delay_ms * (2_u64.pow(attempt));
        let jitter = fastrand::u64(0..=base_delay / 4); // up to 25% jitter
        std::cmp::min(base_delay + jitter, 30_000) // cap at 30 seconds
    }

    fn convert_event_to_transaction(&self, event: PaymentExecutedEvent) -> Result<TransactionData> {
        let payment_number = event.payment_number.parse::<u64>().map_err(|_| {
            RelayerError::InternalError("invalid payment number format".to_string())
        })?;

        let block_number = event
            .block_number
            .parse::<u64>()
            .map_err(|_| RelayerError::InternalError("invalid block number format".to_string()))?;

        let timestamp = event
            .block_timestamp
            .parse::<u64>()
            .map_err(|_| RelayerError::InternalError("invalid timestamp format".to_string()))?;

        let chain = match event.chain_id.as_str() {
            "11155111" => "sepolia",
            "8453" => "base",
            _ => "unknown",
        }
        .to_string();

        Ok(TransactionData {
            subscription_id: event.subscription_id,
            subscriber: event.subscriber.to_lowercase(),
            merchant: event.merchant.to_lowercase(),
            payment_number,
            amount: event.amount,
            fee: event.fee,
            relayer: event.relayer.to_lowercase(),
            transaction_hash: event.transaction_hash,
            block_number,
            timestamp,
            chain,
        })
    }

    fn calculate_monthly_revenue(&self, transactions: &Value) -> Result<Vec<MonthlyRevenue>> {
        let mut monthly_data: HashMap<String, (u128, u64)> = HashMap::new();

        if let Some(tx_array) = transactions.as_array() {
            for tx in tx_array {
                let amount = tx["amount"]
                    .as_str()
                    .and_then(|s| s.parse::<u128>().ok())
                    .unwrap_or(0);

                let timestamp = tx["blockTimestamp"]
                    .as_str()
                    .and_then(|s| s.parse::<i64>().ok())
                    .and_then(|ts| DateTime::from_timestamp(ts, 0))
                    .unwrap_or_default();

                let month_key = format!("{}-{:02}", timestamp.year(), timestamp.month());

                let entry = monthly_data.entry(month_key).or_insert((0, 0));
                entry.0 += amount;
                entry.1 += 1;
            }
        }

        let mut monthly_revenue: Vec<MonthlyRevenue> = monthly_data
            .into_iter()
            .map(|(month, (revenue, count))| MonthlyRevenue {
                month,
                revenue: revenue.to_string(),
                transaction_count: count,
            })
            .collect();

        monthly_revenue.sort_by(|a, b| b.month.cmp(&a.month));
        monthly_revenue.truncate(12);

        Ok(monthly_revenue)
    }
}

// helper function for tests
#[cfg(test)]
impl EnvioClient {
    pub fn new_test() -> Self {
        Self::new("https://test.envio.dev/v1/graphql".to_string())
    }
}
