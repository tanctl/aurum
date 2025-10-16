use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Subscription {
    pub id: String,
    pub subscriber: String,
    pub merchant: String,
    pub amount: String, // stored as string to handle large numbers
    pub interval_seconds: i64,
    pub start_time: DateTime<Utc>,
    pub max_payments: i64,
    pub max_total_amount: String,
    pub expiry: DateTime<Utc>,
    pub nonce: i64,
    pub status: String, // "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED", "COMPLETED"
    pub executed_payments: i64,
    pub total_paid: String, // large numbers
    pub next_payment_due: DateTime<Utc>,
    pub failure_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub chain: String, // "sepolia" or "base"
    pub avail_block_number: Option<i64>,
    pub avail_extrinsic_index: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Execution {
    pub id: i64,
    pub subscription_id: String,
    pub relayer_address: String,
    pub payment_number: i64,
    pub amount_paid: String,
    pub protocol_fee: String,
    pub merchant_amount: String,
    pub transaction_hash: String,
    pub block_number: i64,
    pub gas_used: String,
    pub gas_price: String,
    pub status: String, // "SUCCESS", "FAILED", "PENDING"
    pub error_message: Option<String>,
    pub executed_at: DateTime<Utc>,
    pub chain: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub id: i64,
    pub subscription_id: String,
    pub transaction_hash: String,
    pub block_number: i64,
    pub gas_used: String,
    pub gas_price: String,
    pub fee_paid: String,
    pub payment_amount: String,
    pub payment_number: i64,
    pub chain: String,
    pub executed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IntentCache {
    pub id: i64,
    pub subscription_intent: serde_json::Value, // store the intent as json
    pub signature: String,
    pub subscription_id: String,
    pub subscriber: String,
    pub merchant: String,
    pub amount: String,
    pub interval_seconds: i64,
    pub start_time: DateTime<Utc>,
    pub max_payments: i64,
    pub max_total_amount: String,
    pub expiry: DateTime<Utc>,
    pub nonce: i64,
    pub processed: bool,
    pub created_at: DateTime<Utc>,
    pub processed_at: Option<DateTime<Utc>>,
    pub chain: String,
    pub avail_block_number: Option<i64>,
    pub avail_extrinsic_index: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
    Completed,
}

impl std::fmt::Display for SubscriptionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SubscriptionStatus::Active => write!(f, "ACTIVE"),
            SubscriptionStatus::Paused => write!(f, "PAUSED"),
            SubscriptionStatus::Cancelled => write!(f, "CANCELLED"),
            SubscriptionStatus::Expired => write!(f, "EXPIRED"),
            SubscriptionStatus::Completed => write!(f, "COMPLETED"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExecutionStatus {
    Success,
    Failed,
    Pending,
}

impl std::fmt::Display for ExecutionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExecutionStatus::Success => write!(f, "SUCCESS"),
            ExecutionStatus::Failed => write!(f, "FAILED"),
            ExecutionStatus::Pending => write!(f, "PENDING"),
        }
    }
}

// chain enum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Chain {
    Sepolia,
    Base,
}

impl std::fmt::Display for Chain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Chain::Sepolia => write!(f, "sepolia"),
            Chain::Base => write!(f, "base"),
        }
    }
}

impl std::str::FromStr for Chain {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "sepolia" => Ok(Chain::Sepolia),
            "base" => Ok(Chain::Base),
            _ => Err(anyhow::anyhow!("invalid chain: {}", s)),
        }
    }
}
