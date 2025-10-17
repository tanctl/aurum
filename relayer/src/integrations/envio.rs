use std::time::Duration;

use reqwest::{Client, StatusCode};
use serde::{de, Deserialize, Deserializer};
use serde_json::{json, Value};
use tracing::warn;

use crate::api::types::TransactionData;
use crate::error::{RelayerError, Result};

#[derive(Clone)]
pub struct EnvioClient {
    mode: EnvioClientMode,
}

#[derive(Clone)]
enum EnvioClientMode {
    Stub,
    Remote(RemoteEnvioClient),
}

#[derive(Clone)]
struct RemoteEnvioClient {
    client: Client,
    graphql_endpoint: String,
    explorer_base_url: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct PaymentEvent {
    pub id: String,
    #[serde(rename = "subscriptionId")]
    pub subscription_id: String,
    #[serde(rename = "paymentNumber", deserialize_with = "deserialize_i64")]
    pub payment_number: i64,
    pub amount: String,
    pub fee: String,
    pub relayer: String,
    #[serde(rename = "txHash")]
    pub tx_hash: String,
    #[serde(rename = "blockNumber", deserialize_with = "deserialize_i64")]
    pub block_number: i64,
    #[serde(deserialize_with = "deserialize_i64")]
    pub timestamp: i64,
    #[serde(rename = "chainId", deserialize_with = "deserialize_i64")]
    pub chain_id: i64,
    pub merchant: Option<String>,
    pub subscriber: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct SubscriptionData {
    pub id: String,
    #[serde(rename = "subscriptionId")]
    pub subscription_id: String,
    pub subscriber: String,
    pub merchant: String,
    pub amount: String,
    #[serde(deserialize_with = "deserialize_i64")]
    pub interval: i64,
    #[serde(rename = "startTime", deserialize_with = "deserialize_i64")]
    pub start_time: i64,
    #[serde(rename = "maxPayments", deserialize_with = "deserialize_i64")]
    pub max_payments: i64,
    #[serde(rename = "maxTotalAmount")]
    pub max_total_amount: String,
    #[serde(deserialize_with = "deserialize_i64")]
    pub expiry: i64,
    pub status: String,
    #[serde(rename = "paymentsExecuted", deserialize_with = "deserialize_i64")]
    pub payments_executed: i64,
    #[serde(rename = "totalAmountPaid")]
    pub total_amount_paid: String,
    #[serde(rename = "createdAt", deserialize_with = "deserialize_i64")]
    pub created_at: i64,
    #[serde(rename = "createdAtBlock", deserialize_with = "deserialize_i64")]
    pub created_at_block: i64,
    #[serde(rename = "chainId", deserialize_with = "deserialize_i64")]
    pub chain_id: i64,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct MerchantStatsData {
    pub merchant: String,
    #[serde(rename = "totalSubscriptions", deserialize_with = "deserialize_i64")]
    pub total_subscriptions: i64,
    #[serde(rename = "activeSubscriptions", deserialize_with = "deserialize_i64")]
    pub active_subscriptions: i64,
    #[serde(rename = "totalRevenue")]
    pub total_revenue: String,
    #[serde(rename = "totalPayments", deserialize_with = "deserialize_i64")]
    pub total_payments: i64,
    #[serde(rename = "chainId", deserialize_with = "deserialize_i64")]
    pub chain_id: i64,
}

#[derive(Debug, Clone)]
pub struct MerchantTransactionsResult {
    pub transactions: Vec<TransactionData>,
    pub total_count: u64,
    pub total_revenue: String,
    pub has_more: bool,
    pub explorer_url: Option<String>,
}

impl EnvioClient {
    pub fn new(graphql_endpoint: String, explorer_base_url: String) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| {
                RelayerError::InternalError(format!("failed to build Envio HTTP client: {}", e))
            })?;

        Ok(Self {
            mode: EnvioClientMode::Remote(RemoteEnvioClient {
                client,
                graphql_endpoint,
                explorer_base_url,
            }),
        })
    }

    pub fn new_stub() -> Self {
        Self {
            mode: EnvioClientMode::Stub,
        }
    }

    pub async fn health_check(&self) -> Result<bool> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(true),
            EnvioClientMode::Remote(remote) => remote.health_check().await,
        }
    }

    pub async fn get_merchant_transactions(
        &self,
        merchant_address: &str,
        page: u32,
        page_size: u32,
    ) -> Result<MerchantTransactionsResult> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(MerchantTransactionsResult {
                transactions: Vec::new(),
                total_count: 0,
                total_revenue: "0".to_string(),
                has_more: false,
                explorer_url: None,
            }),
            EnvioClientMode::Remote(remote) => {
                remote
                    .get_merchant_transactions(merchant_address, page, page_size)
                    .await
            }
        }
    }

    pub async fn get_merchant_stats(
        &self,
        merchant_address: &str,
    ) -> Result<Option<MerchantStatsData>> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(Some(MerchantStatsData {
                merchant: merchant_address.to_lowercase(),
                ..MerchantStatsData::default()
            })),
            EnvioClientMode::Remote(remote) => remote.get_merchant_stats(merchant_address).await,
        }
    }

    pub async fn get_subscription_by_id(
        &self,
        subscription_id: &str,
    ) -> Result<Option<SubscriptionData>> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(None),
            EnvioClientMode::Remote(remote) => remote.get_subscription_by_id(subscription_id).await,
        }
    }

    pub async fn get_payment_history(&self, subscription_id: &str) -> Result<Vec<PaymentEvent>> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(Vec::new()),
            EnvioClientMode::Remote(remote) => remote.get_payment_history(subscription_id).await,
        }
    }

    pub fn build_explorer_url(&self, entity_type: &str, entity_id: &str) -> Option<String> {
        match &self.mode {
            EnvioClientMode::Stub => None,
            EnvioClientMode::Remote(remote) => Some(format!(
                "{}/{}/{}",
                remote.explorer_base_url.trim_end_matches('/'),
                entity_type.trim_matches('/'),
                entity_id
            )),
        }
    }
}

impl RemoteEnvioClient {
    async fn health_check(&self) -> Result<bool> {
        let payload = json!({
            "query": "{ __typename }",
        });

        let response = self
            .client
            .post(&self.graphql_endpoint)
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                RelayerError::RpcConnectionFailed(format!("envio health check failed: {}", e))
            })?;

        if !response.status().is_success() {
            warn!(
                "envio health check returned non-success status: {}",
                response.status()
            );
            return Ok(false);
        }

        Ok(true)
    }

    async fn get_merchant_transactions(
        &self,
        merchant_address: &str,
        page: u32,
        page_size: u32,
    ) -> Result<MerchantTransactionsResult> {
        let offset = page * page_size;

        let query = r#"
        query MerchantTransactions($merchant: String!, $limit: Int!, $offset: Int!) {
            Payment(
                where: { merchant: { _eq: $merchant } }
                order_by: { timestamp: desc }
                limit: $limit
                offset: $offset
            ) {
                id
                subscriptionId
                paymentNumber
                amount
                fee
                relayer
                txHash
                blockNumber
                timestamp
                chainId
                merchant
                subscriber
            }
            Payment_aggregate(where: { merchant: { _eq: $merchant } }) {
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
            "offset": offset,
        });

        let response: GraphQlResponse<MerchantTransactionsData> =
            self.execute_query(query, variables).await?;

        let data = response.data.ok_or_else(|| {
            RelayerError::InternalError("missing data in Envio response".to_string())
        })?;

        let total_count = data
            .payment_aggregate
            .aggregate
            .as_ref()
            .and_then(|agg| agg.count.as_ref())
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);

        let total_revenue = data
            .payment_aggregate
            .aggregate
            .as_ref()
            .and_then(|agg| agg.sum.as_ref())
            .and_then(|sum| sum.amount.as_ref())
            .cloned()
            .unwrap_or_else(|| "0".to_string());

        let transactions = data
            .payment
            .into_iter()
            .map(|event| self.convert_event_to_transaction(event, merchant_address))
            .collect::<Result<Vec<_>>>()?;

        let has_more = ((page + 1) as u64 * page_size as u64) < total_count;

        Ok(MerchantTransactionsResult {
            transactions,
            total_count,
            total_revenue,
            has_more,
            explorer_url: Some(
                self.build_explorer_url("payments", &merchant_address.to_lowercase()),
            ),
        })
    }

    async fn get_merchant_stats(
        &self,
        merchant_address: &str,
    ) -> Result<Option<MerchantStatsData>> {
        let query = r#"
        query MerchantStats($merchant: String!) {
            MerchantStats(
                where: { merchant: { _eq: $merchant } }
                limit: 1
            ) {
                merchant
                totalSubscriptions
                activeSubscriptions
                totalRevenue
                totalPayments
                chainId
            }
        }
        "#;

        let variables = json!({
            "merchant": merchant_address.to_lowercase(),
        });

        let response: GraphQlResponse<MerchantStatsPayload> =
            self.execute_query(query, variables).await?;

        let stats = response
            .data
            .and_then(|payload| payload.merchant_stats.into_iter().next());

        Ok(stats)
    }

    async fn get_subscription_by_id(
        &self,
        subscription_id: &str,
    ) -> Result<Option<SubscriptionData>> {
        let query = r#"
        query SubscriptionById($subscriptionId: String!) {
            Subscription(
                where: { subscriptionId: { _eq: $subscriptionId } }
                limit: 1
            ) {
                id
                subscriptionId
                subscriber
                merchant
                amount
                interval
                startTime
                maxPayments
                maxTotalAmount
                expiry
                status
                paymentsExecuted
                totalAmountPaid
                createdAt
                createdAtBlock
                chainId
            }
        }
        "#;

        let variables = json!({
            "subscriptionId": subscription_id,
        });

        let response: GraphQlResponse<SubscriptionPayload> =
            self.execute_query(query, variables).await?;

        Ok(response
            .data
            .and_then(|payload| payload.subscription.into_iter().next()))
    }

    async fn get_payment_history(&self, subscription_id: &str) -> Result<Vec<PaymentEvent>> {
        let query = r#"
        query PaymentHistory($subscriptionId: String!) {
            Payment(
                where: { subscriptionId: { _eq: $subscriptionId } }
                order_by: { paymentNumber: asc }
            ) {
                id
                subscriptionId
                paymentNumber
                amount
                fee
                relayer
                txHash
                blockNumber
                timestamp
                chainId
                merchant
                subscriber
            }
        }
        "#;

        let variables = json!({
            "subscriptionId": subscription_id,
        });

        let response: GraphQlResponse<PaymentHistoryPayload> =
            self.execute_query(query, variables).await?;

        Ok(response
            .data
            .map_or_else(Vec::new, |payload| payload.payment))
    }

    fn build_explorer_url(&self, entity_type: &str, entity_id: &str) -> String {
        format!(
            "{}/{}/{}",
            self.explorer_base_url.trim_end_matches('/'),
            entity_type.trim_matches('/'),
            entity_id
        )
    }

    fn convert_event_to_transaction(
        &self,
        event: PaymentEvent,
        merchant_address: &str,
    ) -> Result<TransactionData> {
        Ok(TransactionData {
            subscription_id: event.subscription_id.clone(),
            subscriber: event
                .subscriber
                .unwrap_or_else(|| "0x0000000000000000000000000000000000000000".to_string()),
            merchant: merchant_address.to_lowercase(),
            payment_number: event.payment_number as u64,
            amount: event.amount,
            fee: event.fee,
            relayer: event.relayer,
            transaction_hash: event.tx_hash,
            block_number: event.block_number as u64,
            timestamp: event.timestamp as u64,
            chain: event.chain_id.to_string(),
        })
    }

    async fn execute_query<T: for<'de> Deserialize<'de>>(
        &self,
        query: &str,
        variables: Value,
    ) -> Result<GraphQlResponse<T>> {
        let response = self
            .client
            .post(&self.graphql_endpoint)
            .json(&json!({
                "query": query,
                "variables": variables,
            }))
            .send()
            .await
            .map_err(|e| {
                RelayerError::RpcConnectionFailed(format!("envio request failed: {}", e))
            })?;

        if response.status() == StatusCode::NOT_FOUND {
            return Err(RelayerError::NotFound(
                "envio endpoint returned 404".to_string(),
            ));
        }

        if !response.status().is_success() {
            return Err(RelayerError::InternalError(format!(
                "envio request failed with status: {}",
                response.status()
            )));
        }

        let body = response.text().await.map_err(|e| {
            RelayerError::InternalError(format!("failed to read envio response body: {}", e))
        })?;

        let payload: GraphQlResponse<T> = serde_json::from_str(&body).map_err(|e| {
            RelayerError::InternalError(format!("failed to parse envio response: {}", e))
        })?;

        if let Some(errors) = payload.errors.as_ref() {
            let messages: Vec<String> = errors.iter().map(|error| error.message.clone()).collect();
            return Err(RelayerError::InternalError(format!(
                "envio graphql errors: {}",
                messages.join(", ")
            )));
        }

        Ok(payload)
    }
}

#[derive(Debug, Deserialize)]
struct GraphQlResponse<T> {
    data: Option<T>,
    errors: Option<Vec<GraphQlError>>,
}

#[derive(Debug, Deserialize)]
struct GraphQlError {
    message: String,
}

#[derive(Debug, Deserialize)]
struct MerchantTransactionsData {
    #[serde(rename = "Payment")]
    payment: Vec<PaymentEvent>,
    #[serde(rename = "Payment_aggregate")]
    payment_aggregate: PaymentAggregateWrapper,
}

#[derive(Debug, Deserialize)]
struct PaymentAggregateWrapper {
    aggregate: Option<PaymentAggregateFields>,
}

#[derive(Debug, Deserialize)]
struct PaymentAggregateFields {
    count: Option<String>,
    sum: Option<PaymentAggregateSum>,
}

#[derive(Debug, Deserialize)]
struct PaymentAggregateSum {
    amount: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MerchantStatsPayload {
    #[serde(rename = "MerchantStats")]
    merchant_stats: Vec<MerchantStatsData>,
}

#[derive(Debug, Deserialize)]
struct SubscriptionPayload {
    #[serde(rename = "Subscription")]
    subscription: Vec<SubscriptionData>,
}

#[derive(Debug, Deserialize)]
struct PaymentHistoryPayload {
    #[serde(rename = "Payment")]
    payment: Vec<PaymentEvent>,
}

fn deserialize_i64<'de, D>(deserializer: D) -> std::result::Result<i64, D::Error>
where
    D: Deserializer<'de>,
{
    match Value::deserialize(deserializer)? {
        Value::Number(num) => num
            .as_i64()
            .ok_or_else(|| de::Error::custom("invalid numeric value")),
        Value::String(s) => s
            .parse::<i64>()
            .map_err(|_| de::Error::custom("invalid numeric string")),
        other => Err(de::Error::custom(format!(
            "expected number or string, found {}",
            other
        ))),
    }
}
