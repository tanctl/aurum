use chrono::{DateTime, Utc};
use ethers::types::{Address, U256};
use serde::{Deserialize, Deserializer, Serialize};
use std::str::FromStr;

// request types
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SubmitIntentRequest {
    pub intent: SubscriptionIntent,
    #[serde(deserialize_with = "deserialize_signature")]
    pub signature: String,
}

/// subscription intent - must match client-side signing format exactly
///
/// critical: for signature verification to work, the intent data must be
/// serialized identically on both client and server sides.
///
/// canonicalization rules:
/// 1. amounts (amount, max_total_amount): decimal string without leading zeros
///    - valid: "1000000000000000000" (1 eth in wei)  
///    - invalid: "01000000000000000000" (leading zero)
///    - invalid: "1.0e18" (scientific notation)
/// 2. addresses: lowercase hex with 0x prefix (normalized by deserializer)  
/// 3. numbers: big-endian byte representation for hashing
/// 4. field order: fixed order in hash calculation (subscriber, merchant, amount, ...)
/// 5. encoding: all string fields as utf-8 bytes
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SubscriptionIntent {
    #[serde(deserialize_with = "deserialize_address")]
    pub subscriber: String,
    #[serde(deserialize_with = "deserialize_address")]
    pub merchant: String,
    /// amount in wei as decimal string (no leading zeros, no scientific notation)
    #[serde(deserialize_with = "deserialize_amount")]
    pub amount: String,
    #[serde(deserialize_with = "deserialize_positive_number")]
    pub interval: u64,
    #[serde(deserialize_with = "deserialize_timestamp")]
    pub start_time: u64,
    #[serde(deserialize_with = "deserialize_positive_number")]
    pub max_payments: u64,
    /// maximum total amount in wei as decimal string (no leading zeros)
    #[serde(deserialize_with = "deserialize_amount")]
    pub max_total_amount: String,
    #[serde(deserialize_with = "deserialize_timestamp")]
    pub expiry: u64,
    #[serde(deserialize_with = "deserialize_positive_number")]
    pub nonce: u64,
}

// response types
#[derive(Debug, Clone, Serialize)]
pub struct SubmitIntentResponse {
    #[serde(rename = "subscriptionId")]
    pub subscription_id: String,
    #[serde(rename = "availBlock")]
    pub avail_block: u64,
    #[serde(rename = "availExtrinsic")]
    pub avail_extrinsic: u64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SubscriptionResponse {
    pub id: String,
    pub subscriber: String,
    pub merchant: String,
    pub amount: String,
    pub interval: u64,
    #[serde(rename = "startTime")]
    pub start_time: u64,
    #[serde(rename = "maxPayments")]
    pub max_payments: u64,
    #[serde(rename = "maxTotalAmount")]
    pub max_total_amount: String,
    pub expiry: u64,
    pub nonce: u64,
    pub status: String,
    #[serde(rename = "executedPayments")]
    pub executed_payments: u64,
    #[serde(rename = "totalPaid")]
    pub total_paid: String,
    #[serde(rename = "nextPaymentTime")]
    pub next_payment_time: u64,
    #[serde(rename = "failureCount")]
    pub failure_count: u32,
    pub chain: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    // blockchain verification
    #[serde(rename = "onChainStatus")]
    pub on_chain_status: u8,
    #[serde(rename = "onChainPayments")]
    pub on_chain_payments: u64,
    #[serde(rename = "contractAddress")]
    pub contract_address: String,
    #[serde(rename = "availBlock")]
    pub avail_block: Option<u64>,
    #[serde(rename = "availExtrinsic")]
    pub avail_extrinsic: Option<u64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TransactionData {
    #[serde(rename = "subscriptionId")]
    pub subscription_id: String,
    pub subscriber: String,
    pub merchant: String,
    #[serde(rename = "paymentNumber")]
    pub payment_number: u64,
    pub amount: String,
    pub fee: String,
    pub relayer: String,
    #[serde(rename = "transactionHash")]
    pub transaction_hash: String,
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    pub timestamp: u64,
    pub chain: String,
}

#[derive(Debug, Serialize)]
pub struct MerchantTransactionsResponse {
    pub transactions: Vec<TransactionData>,
    pub count: u64,
    #[serde(rename = "totalRevenue")]
    pub total_revenue: String,
    #[serde(rename = "envioExplorerUrl")]
    pub envio_explorer_url: String,
    pub page: u32,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
    #[serde(rename = "dataSource")]
    pub data_source: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MerchantStatsResponse {
    pub merchant: String,
    #[serde(rename = "totalRevenue")]
    pub total_revenue: String,
    #[serde(rename = "totalTransactions")]
    pub total_transactions: u64,
    #[serde(rename = "activeSubscriptions")]
    pub active_subscriptions: u64,
    #[serde(rename = "totalSubscriptions")]
    pub total_subscriptions: u64,
    #[serde(rename = "averageTransactionValue")]
    pub average_transaction_value: String,
    #[serde(rename = "firstTransactionDate")]
    pub first_transaction_date: Option<DateTime<Utc>>,
    #[serde(rename = "lastTransactionDate")]
    pub last_transaction_date: Option<DateTime<Utc>>,
    #[serde(rename = "monthlyRevenue")]
    pub monthly_revenue: Vec<MonthlyRevenue>,
    #[serde(rename = "envioExplorerUrl")]
    pub envio_explorer_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MonthlyRevenue {
    pub month: String,
    pub revenue: String,
    #[serde(rename = "transactionCount")]
    pub transaction_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub timestamp: DateTime<Utc>,
    pub services: HealthServices,
    #[serde(rename = "nexusLatestBlock")]
    pub nexus_latest_block: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthServices {
    pub database: ServiceStatus,
    pub rpc: ServiceStatus,
    pub envio: ServiceStatus,
    pub nexus: ServiceStatus,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub healthy: bool,
    pub response_time_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CrossChainVerificationRequest {
    #[serde(rename = "subscriptionId")]
    pub subscription_id: String,
    #[serde(rename = "sourceChainId")]
    pub source_chain_id: u64,
}

#[derive(Debug, Serialize)]
pub struct CrossChainVerificationResponse {
    pub verified: bool,
    #[serde(rename = "paymentCount")]
    pub payment_count: u64,
    #[serde(rename = "totalAmount")]
    pub total_amount: String,
    #[serde(rename = "lastPaymentBlock")]
    pub last_payment_block: u64,
}

// envio graphql types
#[derive(Debug, Deserialize)]
pub struct EnvioResponse<T> {
    pub data: Option<T>,
    pub errors: Option<Vec<EnvioError>>,
}

#[derive(Debug, Deserialize)]
pub struct EnvioError {
    pub message: String,
    pub locations: Option<Vec<EnvioLocation>>,
    pub path: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Deserialize)]
pub struct EnvioLocation {
    pub line: u32,
    pub column: u32,
}

// custom deserializers for validation
fn deserialize_address<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;

    if !s.starts_with("0x") || s.len() != 42 {
        return Err(serde::de::Error::custom(
            "address must be 0x followed by 40 hex characters",
        ));
    }

    if !s[2..].chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(serde::de::Error::custom(
            "address contains invalid hex characters",
        ));
    }

    Address::from_str(&s).map_err(|_| serde::de::Error::custom("invalid ethereum address"))?;

    Ok(s.to_lowercase())
}

fn deserialize_amount<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;

    if s.starts_with('0') && s.len() > 1 {
        return Err(serde::de::Error::custom("amount cannot have leading zeros"));
    }

    if s.contains('e') || s.contains('E') || s.contains('.') {
        return Err(serde::de::Error::custom(
            "amount must be decimal integer (no scientific notation or decimals)",
        ));
    }

    let amount = U256::from_str(&s)
        .map_err(|_| serde::de::Error::custom("amount must be a valid number"))?;

    if amount == U256::zero() {
        return Err(serde::de::Error::custom("amount must be greater than zero"));
    }

    Ok(s)
}

fn deserialize_positive_number<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: Deserializer<'de>,
{
    let n = u64::deserialize(deserializer)?;

    if n == 0 {
        return Err(serde::de::Error::custom("value must be greater than zero"));
    }

    Ok(n)
}

fn deserialize_timestamp<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
    D: Deserializer<'de>,
{
    let n = u64::deserialize(deserializer)?;

    // "not in past" validation moved to business logic for test flexibility
    let now = chrono::Utc::now().timestamp() as u64;

    if n > now + (10 * 365 * 24 * 60 * 60) {
        return Err(serde::de::Error::custom("timestamp too far in the future"));
    }

    Ok(n)
}

fn deserialize_signature<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;

    if !s.starts_with("0x") || s.len() != 132 {
        // 0x + 130 hex chars (65 bytes * 2)
        return Err(serde::de::Error::custom(
            "signature must be 0x followed by 130 hex characters",
        ));
    }

    if !s[2..].chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(serde::de::Error::custom(
            "signature contains invalid hex characters",
        ));
    }

    Ok(s.to_lowercase())
}

// helper functions for type conversion
impl SubscriptionIntent {
    pub fn to_hash_input(&self) -> Vec<u8> {
        let mut input = Vec::new();
        input.extend_from_slice(self.subscriber.as_bytes());
        input.extend_from_slice(self.merchant.as_bytes());
        input.extend_from_slice(self.amount.as_bytes());
        input.extend_from_slice(&self.interval.to_be_bytes());
        input.extend_from_slice(&self.start_time.to_be_bytes());
        input.extend_from_slice(&self.max_payments.to_be_bytes());
        input.extend_from_slice(self.max_total_amount.as_bytes());
        input.extend_from_slice(&self.expiry.to_be_bytes());
        input.extend_from_slice(&self.nonce.to_be_bytes());
        input
    }

    pub fn validate_consistency(&self) -> Result<(), String> {
        let amount = U256::from_str(&self.amount).map_err(|_| "invalid amount format")?;
        let max_total = U256::from_str(&self.max_total_amount)
            .map_err(|_| "invalid max total amount format")?;

        let total_payments = amount
            .checked_mul(U256::from(self.max_payments))
            .ok_or("payment calculation overflow")?;

        if total_payments > max_total {
            return Err("max total amount insufficient for max payments".to_string());
        }

        if self.start_time >= self.expiry {
            return Err("start time must be before expiry".to_string());
        }

        Ok(())
    }
}
