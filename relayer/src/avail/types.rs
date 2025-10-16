use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::api::types::SubscriptionIntent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailMetadata {
    #[serde(rename = "applicationId")]
    pub application_id: String,
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    #[serde(rename = "submittedAt")]
    pub submitted_at: DateTime<Utc>,
    pub relayer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailIntent {
    pub intent: SubscriptionIntent,
    pub signature: String,
    pub metadata: AvailMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailSubmissionResult {
    #[serde(rename = "blockNumber")]
    pub block_number: u64,
    #[serde(rename = "extrinsicIndex")]
    pub extrinsic_index: u64,
}
