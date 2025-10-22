use std::collections::HashMap;
use std::time::Duration;

use ethers::types::U256;
use reqwest::{Client, StatusCode};
use serde::{de, Deserialize, Deserializer};
use serde_json::{json, Value};
use tracing::warn;

use crate::api::types::TransactionData;
use crate::error::{RelayerError, Result};
use crate::utils::tokens;

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
    #[serde(default)]
    pub token: Option<String>,
    #[serde(rename = "tokenSymbol", default)]
    pub token_symbol: Option<String>,
    #[serde(rename = "nexusAttestationId")]
    pub nexus_attestation_id: Option<String>,
    #[serde(rename = "nexusVerified", default)]
    pub nexus_verified: bool,
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
    #[serde(default)]
    pub token: String,
    #[serde(rename = "tokenSymbol", default)]
    pub token_symbol: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct MerchantTokenStatsRow {
    pub merchant: String,
    pub token: String,
    #[serde(rename = "tokenSymbol")]
    pub token_symbol: String,
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

#[derive(Debug, Clone, Default)]
pub struct TokenStats {
    pub token_address: String,
    pub token_symbol: String,
    pub total_subscriptions: u64,
    pub active_subscriptions: u64,
    pub total_revenue: String,
    pub total_payments: u64,
    pub average_transaction_value: String,
    pub chain_id: i64,
}

#[derive(Debug, Clone, Default)]
pub struct MerchantStatsData {
    pub merchant: String,
    pub total: TokenStats,
    pub by_token: HashMap<String, TokenStats>,
}

#[derive(Debug, Clone)]
pub struct MerchantTransactionsResult {
    pub transactions: Vec<TransactionData>,
    pub total_count: u64,
    pub total_revenue: String,
    pub token_totals: HashMap<String, String>,
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
                token_totals: HashMap::new(),
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
                total: TokenStats {
                    token_address: "aggregate".to_string(),
                    token_symbol: "TOTAL".to_string(),
                    total_revenue: "0".to_string(),
                    ..TokenStats::default()
                },
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

    pub async fn get_cross_chain_attestations(
        &self,
        subscription_id: &str,
    ) -> Result<Vec<CrossChainAttestationData>> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(Vec::new()),
            EnvioClientMode::Remote(remote) => {
                remote.get_cross_chain_attestations(subscription_id).await
            }
        }
    }

    pub async fn get_payment_with_attestation(
        &self,
        subscription_id: &str,
        payment_number: u32,
    ) -> Result<Option<PaymentEvent>> {
        match &self.mode {
            EnvioClientMode::Stub => Ok(None),
            EnvioClientMode::Remote(remote) => {
                remote
                    .get_payment_with_attestation(subscription_id, payment_number)
                    .await
            }
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
                token
                tokenSymbol
                nexusAttestationId
                nexusVerified
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

        let mut token_totals_map: HashMap<String, U256> = HashMap::new();
        for tx in &transactions {
            let amount = U256::from_dec_str(&tx.amount).unwrap_or_else(|_| U256::zero());
            let entry = token_totals_map
                .entry(tx.token_symbol.clone())
                .or_insert(U256::zero());
            *entry = entry.checked_add(amount).unwrap_or(U256::MAX);
        }

        let token_totals = token_totals_map
            .into_iter()
            .map(|(symbol, amount)| {
                let decimals = match symbol.as_str() {
                    "ETH" => 18,
                    "PYUSD" => 6,
                    _ => 18,
                };
                let formatted = tokens::format_token_amount(amount, decimals);
                (symbol, formatted)
            })
            .collect::<HashMap<_, _>>();

        Ok(MerchantTransactionsResult {
            transactions,
            total_count,
            total_revenue,
            token_totals,
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
        query MerchantTokenStats($merchant: String!) {
            MerchantTokenStats(
                where: { merchant: { _eq: $merchant } }
            ) {
                merchant
                token
                tokenSymbol
                totalSubscriptions
                activeSubscriptions
                totalRevenue
                totalPayments
                chainId
            }
        }
        "#;

        let merchant_lower = merchant_address.to_lowercase();
        let variables = json!({
            "merchant": merchant_lower,
        });

        let response: GraphQlResponse<MerchantTokenStatsPayload> =
            self.execute_query(query, variables).await?;

        let rows = response
            .data
            .map(|payload| payload.merchant_token_stats)
            .unwrap_or_default();

        if rows.is_empty() {
            return Ok(None);
        }

        let mut totals_subscriptions: u64 = 0;
        let mut totals_active: u64 = 0;
        let mut totals_payments: u64 = 0;
        let mut totals_revenue = U256::zero();
        let mut by_token: HashMap<String, TokenStats> = HashMap::new();

        for row in rows {
            let token_address = tokens::normalize_token_address(&row.token);
            let total_subscriptions = row.total_subscriptions.max(0) as u64;
            let active_subscriptions = row.active_subscriptions.max(0) as u64;
            let total_payments = row.total_payments.max(0) as u64;
            let revenue_u256 =
                U256::from_dec_str(&row.total_revenue).unwrap_or_else(|_| U256::zero());

            totals_subscriptions = totals_subscriptions.saturating_add(total_subscriptions);
            totals_active = totals_active.saturating_add(active_subscriptions);
            totals_payments = totals_payments.saturating_add(total_payments);
            totals_revenue = totals_revenue
                .checked_add(revenue_u256)
                .unwrap_or(U256::MAX);

            let average = compute_average_value(&row.total_revenue, total_payments);

            let token_stats = TokenStats {
                token_address: token_address.clone(),
                token_symbol: row.token_symbol.clone(),
                total_subscriptions,
                active_subscriptions,
                total_revenue: row.total_revenue.clone(),
                total_payments,
                average_transaction_value: average,
                chain_id: row.chain_id,
            };

            by_token.insert(token_address, token_stats);
        }

        let total_average = compute_average_value(&totals_revenue.to_string(), totals_payments);

        let total_stats = TokenStats {
            token_address: "aggregate".to_string(),
            token_symbol: "TOTAL".to_string(),
            total_subscriptions: totals_subscriptions,
            active_subscriptions: totals_active,
            total_revenue: totals_revenue.to_string(),
            total_payments: totals_payments,
            average_transaction_value: total_average,
            chain_id: 0,
        };

        Ok(Some(MerchantStatsData {
            merchant: merchant_lower,
            total: total_stats,
            by_token,
        }))
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
                token
                tokenSymbol
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
                token
                tokenSymbol
                nexusAttestationId
                nexusVerified
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

    async fn get_cross_chain_attestations(
        &self,
        subscription_id: &str,
    ) -> Result<Vec<CrossChainAttestationData>> {
        let query = r#"
        query CrossChainAttestations($subscriptionId: String!) {
            CrossChainAttestation(
                where: { subscriptionId: { _eq: $subscriptionId } }
                order_by: { timestamp: asc }
            ) {
                id
                subscriptionId
                paymentNumber
                sourceChainId
                token
                amount
                merchant
                txHash
                blockNumber
                timestamp
                verified
            }
        }
        "#;

        let variables = json!({
            "subscriptionId": subscription_id,
        });

        let response: GraphQlResponse<CrossChainAttestationPayload> =
            self.execute_query(query, variables).await?;

        Ok(response
            .data
            .map_or_else(Vec::new, |payload| payload.cross_chain_attestation))
    }

    async fn get_payment_with_attestation(
        &self,
        subscription_id: &str,
        payment_number: u32,
    ) -> Result<Option<PaymentEvent>> {
        let query = r#"
        query PaymentWithAttestation($subscriptionId: String!, $paymentNumber: Int!) {
            Payment(
                where: {
                    subscriptionId: { _eq: $subscriptionId }
                    paymentNumber: { _eq: $paymentNumber }
                }
                limit: 1
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
                token
                tokenSymbol
                nexusAttestationId
                nexusVerified
            }
        }
        "#;

        let variables = json!({
            "subscriptionId": subscription_id,
            "paymentNumber": payment_number as i64,
        });

        let response: GraphQlResponse<PaymentSinglePayload> =
            self.execute_query(query, variables).await?;

        Ok(response
            .data
            .and_then(|payload| payload.payment.into_iter().next()))
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
        let PaymentEvent {
            subscription_id,
            payment_number,
            amount,
            fee,
            relayer,
            tx_hash,
            block_number,
            timestamp,
            chain_id,
            merchant,
            subscriber,
            token,
            token_symbol,
            nexus_attestation_id: _,
            nexus_verified: _,
            ..
        } = event;

        let token_value = token.unwrap_or_else(|| "0x0".to_string());
        let token_address = tokens::normalize_token_address(&token_value);
        let token_symbol =
            token_symbol.unwrap_or_else(|| tokens::get_token_symbol(&token_address).to_string());

        Ok(TransactionData {
            subscription_id,
            subscriber: subscriber
                .unwrap_or_else(|| "0x0000000000000000000000000000000000000000".to_string()),
            merchant: merchant.unwrap_or_else(|| merchant_address.to_lowercase()),
            payment_number: payment_number as u64,
            amount,
            fee,
            relayer,
            transaction_hash: tx_hash,
            block_number: block_number as u64,
            timestamp: timestamp as u64,
            chain: chain_id.to_string(),
            token_address,
            token_symbol,
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
struct MerchantTokenStatsPayload {
    #[serde(rename = "MerchantTokenStats")]
    merchant_token_stats: Vec<MerchantTokenStatsRow>,
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
struct SubscriptionPayload {
    #[serde(rename = "Subscription")]
    subscription: Vec<SubscriptionData>,
}

#[derive(Debug, Deserialize)]
struct PaymentHistoryPayload {
    #[serde(rename = "Payment")]
    payment: Vec<PaymentEvent>,
}

#[derive(Debug, Deserialize)]
struct PaymentSinglePayload {
    #[serde(rename = "Payment")]
    payment: Vec<PaymentEvent>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CrossChainAttestationData {
    pub id: String,
    #[serde(rename = "subscriptionId")]
    pub subscription_id: String,
    #[serde(rename = "paymentNumber", deserialize_with = "deserialize_i64")]
    pub payment_number: i64,
    #[serde(rename = "sourceChainId", deserialize_with = "deserialize_i64")]
    pub source_chain_id: i64,
    pub token: String,
    pub amount: String,
    pub merchant: String,
    #[serde(rename = "txHash")]
    pub tx_hash: String,
    #[serde(rename = "blockNumber", deserialize_with = "deserialize_i64")]
    pub block_number: i64,
    #[serde(rename = "timestamp", deserialize_with = "deserialize_i64")]
    pub timestamp: i64,
    pub verified: bool,
}

#[derive(Debug, Deserialize)]
struct CrossChainAttestationPayload {
    #[serde(rename = "CrossChainAttestation")]
    cross_chain_attestation: Vec<CrossChainAttestationData>,
}

fn compute_average_value(total_revenue: &str, total_payments: u64) -> String {
    if total_payments == 0 {
        return "0".to_string();
    }

    match U256::from_dec_str(total_revenue) {
        Ok(revenue) => {
            let payments = U256::from(total_payments);
            (revenue / payments).to_string()
        }
        Err(_) => "0".to_string(),
    }
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
