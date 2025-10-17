use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::time::timeout;
use tracing::{debug, info, warn};
use uuid::Uuid;

use crate::error::{RelayerError, Result};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NexusClientMode {
    Stub,
    Remote,
}

#[derive(Clone)]
pub struct NexusClient {
    inner: NexusClientInner,
}

#[derive(Clone)]
enum NexusClientInner {
    Stub(Arc<StubState>),
    Remote(Arc<RemoteClient>),
}

#[derive(Clone)]
struct RemoteClient {
    rpc_url: String,
    application_id: String,
    signer: AttestationSigner,
    http: Client,
}

#[derive(Debug, Clone)]
struct AttestationSigner {
    key: Vec<u8>,
    fingerprint: String,
}

#[derive(Debug, Default)]
struct StubState {
    attestations: Mutex<HashMap<String, StubAttestation>>,
}

#[derive(Debug, Clone)]
struct StubAttestation {
    attestation: PaymentAttestation,
    verified: bool,
    submitted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PaymentAttestation {
    pub source_chain_id: u64,
    #[serde(with = "serde_hex_array_32")]
    pub subscription_id: [u8; 32],
    pub payment_number: u64,
    pub amount: u128,
    #[serde(with = "serde_hex_array_20")]
    pub merchant: [u8; 20],
    #[serde(with = "serde_hex_array_32")]
    pub tx_hash: [u8; 32],
    pub block_number: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttestationSubmission {
    pub attestation_id: String,
    pub submitted_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttestationStatus {
    pub attestation_id: String,
    pub verified: bool,
    pub attestation: PaymentAttestation,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrossChainVerificationSummary {
    pub exists: bool,
    pub payment_count: u64,
    pub total_amount: u128,
    pub last_payment_block: u64,
    pub attestations: Vec<PaymentAttestation>,
}

impl NexusClient {
    pub async fn new(nexus_rpc_url: &str, signer_key: &str, application_id: &str) -> Result<Self> {
        let normalized_url = normalize_nexus_url(nexus_rpc_url)?;
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| {
                RelayerError::InternalError(format!("failed to build nexus http client: {}", e))
            })?;

        let signer = AttestationSigner::from_hex(signer_key)?;

        let remote = RemoteClient {
            rpc_url: normalized_url.clone(),
            application_id: application_id.to_string(),
            signer,
            http: client,
        };

        remote.verify_connectivity().await?;
        info!(
            "initialised Nexus client targeting {} (app_id={}, fingerprint={})",
            normalized_url, application_id, remote.signer.fingerprint
        );

        Ok(Self {
            inner: NexusClientInner::Remote(Arc::new(remote)),
        })
    }

    pub fn new_stub() -> Self {
        info!("initialised Nexus client in stub mode");
        Self {
            inner: NexusClientInner::Stub(Arc::new(StubState::default())),
        }
    }

    pub fn mode(&self) -> NexusClientMode {
        match self.inner {
            NexusClientInner::Stub(_) => NexusClientMode::Stub,
            NexusClientInner::Remote(_) => NexusClientMode::Remote,
        }
    }

    pub async fn submit_payment_attestation(
        &self,
        attestation: PaymentAttestation,
    ) -> Result<AttestationSubmission> {
        match &self.inner {
            NexusClientInner::Stub(state) => {
                // stub mode returns pre-verified attestations to keep tests deterministic
                let attestation_id = format!("stub-{}", Uuid::new_v4());
                let now = Utc::now();

                let entry = StubAttestation {
                    attestation: attestation.clone(),
                    verified: true,
                    submitted_at: now,
                };

                let mut guard = state
                    .attestations
                    .lock()
                    .expect("nexus stub mutex poisoned");
                guard.insert(attestation_id.clone(), entry);

                Ok(AttestationSubmission {
                    attestation_id,
                    submitted_at: now,
                })
            }
            NexusClientInner::Remote(remote) => remote.submit_attestation(attestation).await,
        }
    }

    pub async fn query_payment_attestation(
        &self,
        attestation_id: &str,
    ) -> Result<Option<AttestationStatus>> {
        match &self.inner {
            NexusClientInner::Stub(state) => {
                let guard = state
                    .attestations
                    .lock()
                    .expect("nexus stub mutex poisoned");
                if let Some(entry) = guard.get(attestation_id) {
                    return Ok(Some(AttestationStatus {
                        attestation_id: attestation_id.to_string(),
                        verified: entry.verified,
                        attestation: entry.attestation.clone(),
                        last_updated: entry.submitted_at,
                    }));
                }
                Ok(None)
            }
            NexusClientInner::Remote(remote) => remote.query_attestation(attestation_id).await,
        }
    }

    pub async fn verify_cross_chain_subscription(
        &self,
        subscription_id: &[u8; 32],
        source_chain_id: u64,
    ) -> Result<CrossChainVerificationSummary> {
        match &self.inner {
            NexusClientInner::Stub(state) => {
                let guard = state
                    .attestations
                    .lock()
                    .expect("nexus stub mutex poisoned");
                let mut attestations = Vec::new();
                for att in guard.values() {
                    if att.attestation.source_chain_id == source_chain_id
                        && att.attestation.subscription_id == *subscription_id
                    {
                        attestations.push(att.attestation.clone());
                    }
                }

                summarize_attestations(attestations)
            }
            NexusClientInner::Remote(remote) => {
                remote
                    .verify_subscription(subscription_id, source_chain_id)
                    .await
            }
        }
    }

    pub async fn health_check(&self) -> Result<NexusHealthStatus> {
        match &self.inner {
            NexusClientInner::Stub(_) => Ok(NexusHealthStatus {
                healthy: true,
                latest_block: None,
            }),
            NexusClientInner::Remote(remote) => remote.health_check().await,
        }
    }
}

#[derive(Debug, Clone)]
pub struct NexusHealthStatus {
    pub healthy: bool,
    pub latest_block: Option<u64>,
}

impl RemoteClient {
    async fn verify_connectivity(&self) -> Result<()> {
        let url = format!("{}/status", self.rpc_url);
        let response = self.http.get(&url).send().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("nexus status request failed: {}", e))
        })?;

        if !response.status().is_success() {
            return Err(RelayerError::RpcConnectionFailed(format!(
                "nexus status endpoint returned {}",
                response.status()
            )));
        }

        debug!("nexus status response OK from {}", url);
        Ok(())
    }

    async fn submit_attestation(
        &self,
        attestation: PaymentAttestation,
    ) -> Result<AttestationSubmission> {
        let attestation_bytes = serde_json::to_vec(&attestation).map_err(|e| {
            RelayerError::InternalError(format!(
                "failed to encode payment attestation payload: {}",
                e
            ))
        })?;
        let signature = self.signer.sign(&attestation_bytes);

        let request = serde_json::json!({
            "applicationId": self.application_id,
            "attestation": attestation,
            "signature": signature,
        });

        let url = format!("{}/attestations", self.rpc_url);
        let mut last_error: Option<String> = None;

        for attempt in 0..=1 {
            let send_future = self.http.post(&url).json(&request).send();
            let response_result = timeout(Duration::from_secs(5), send_future).await;

            let response = match response_result {
                Ok(Ok(resp)) => resp,
                Ok(Err(err)) => {
                    last_error = Some(err.to_string());
                    if attempt == 0 {
                        warn!(
                            "nexus attestation submission attempt {} failed: {}",
                            attempt + 1,
                            last_error.as_ref().unwrap()
                        );
                    }
                    continue;
                }
                Err(_) => {
                    last_error = Some("request timed out after 5s".to_string());
                    if attempt == 0 {
                        warn!(
                            "nexus attestation submission attempt {} timed out",
                            attempt + 1
                        );
                    }
                    continue;
                }
            };

            if !response.status().is_success() {
                last_error = Some(format!("http {}", response.status()));
                if attempt == 0 {
                    warn!(
                        "nexus attestation submission attempt {} returned status {}",
                        attempt + 1,
                        response.status()
                    );
                }
                continue;
            }

            let payload: serde_json::Value = match response.json().await {
                Ok(value) => value,
                Err(err) => {
                    last_error = Some(err.to_string());
                    if attempt == 0 {
                        warn!(
                            "nexus attestation submission attempt {} failed to parse response: {}",
                            attempt + 1,
                            err
                        );
                    }
                    continue;
                }
            };

            let attestation_id = payload
                .get("attestationId")
                .and_then(|value| value.as_str())
                .ok_or_else(|| {
                    RelayerError::InternalError(
                        "nexus attestation response missing attestationId field".to_string(),
                    )
                })?
                .to_string();

            return Ok(AttestationSubmission {
                attestation_id,
                submitted_at: Utc::now(),
            });
        }

        Err(RelayerError::RpcConnectionFailed(format!(
            "nexus attestation submission failed after retries: {}",
            last_error.unwrap_or_else(|| "unknown error".to_string())
        )))
    }

    async fn query_attestation(&self, attestation_id: &str) -> Result<Option<AttestationStatus>> {
        let url = format!("{}/attestations/{}", self.rpc_url, attestation_id);
        let response = self.http.get(&url).send().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to query nexus attestation: {}", e))
        })?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if !response.status().is_success() {
            return Err(RelayerError::RpcConnectionFailed(format!(
                "nexus attestation query returned {}",
                response.status()
            )));
        }

        let payload: serde_json::Value = response.json().await.map_err(|e| {
            RelayerError::InternalError(format!("failed to parse nexus attestation payload: {}", e))
        })?;

        let attestation: PaymentAttestation =
            serde_json::from_value(payload.get("attestation").cloned().ok_or_else(|| {
                RelayerError::InternalError(
                    "nexus attestation payload missing attestation field".to_string(),
                )
            })?)
            .map_err(|e| {
                RelayerError::InternalError(format!(
                    "failed to decode nexus attestation data: {}",
                    e
                ))
            })?;

        let verified = payload
            .get("verified")
            .and_then(|value| value.as_bool())
            .unwrap_or(false);

        Ok(Some(AttestationStatus {
            attestation_id: attestation_id.to_string(),
            verified,
            attestation,
            last_updated: Utc::now(),
        }))
    }

    async fn verify_subscription(
        &self,
        subscription_id: &[u8; 32],
        source_chain_id: u64,
    ) -> Result<CrossChainVerificationSummary> {
        let url = format!(
            "{}/subscriptions/{}/attestations?chainId={}",
            self.rpc_url,
            hex::encode(subscription_id),
            source_chain_id
        );

        let response = self.http.get(&url).send().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!(
                "failed to query nexus cross-chain subscription: {}",
                e
            ))
        })?;

        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(CrossChainVerificationSummary {
                exists: false,
                payment_count: 0,
                total_amount: 0,
                last_payment_block: 0,
                attestations: Vec::new(),
            });
        }

        if !response.status().is_success() {
            return Err(RelayerError::RpcConnectionFailed(format!(
                "nexus subscription query returned {}",
                response.status()
            )));
        }

        let payload: serde_json::Value = response.json().await.map_err(|e| {
            RelayerError::InternalError(format!(
                "failed to parse nexus subscription response: {}",
                e
            ))
        })?;

        let attestations_json = payload
            .get("attestations")
            .and_then(|value| value.as_array())
            .cloned()
            .unwrap_or_default();

        let mut attestations = Vec::with_capacity(attestations_json.len());
        for raw in attestations_json {
            match serde_json::from_value::<PaymentAttestation>(raw) {
                Ok(att) => attestations.push(att),
                Err(err) => {
                    warn!("skipping malformed nexus attestation entry: {}", err);
                }
            }
        }

        summarize_attestations(attestations)
    }

    async fn health_check(&self) -> Result<NexusHealthStatus> {
        let url = format!("{}/status", self.rpc_url);
        let response = self.http.get(&url).send().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("nexus health check request failed: {}", e))
        })?;

        if !response.status().is_success() {
            return Ok(NexusHealthStatus {
                healthy: false,
                latest_block: None,
            });
        }

        let payload: serde_json::Value = response.json().await.unwrap_or_default();
        let latest_block = payload.get("latestBlock").and_then(|value| value.as_u64());

        Ok(NexusHealthStatus {
            healthy: true,
            latest_block,
        })
    }
}

fn summarize_attestations(
    attestations: Vec<PaymentAttestation>,
) -> Result<CrossChainVerificationSummary> {
    if attestations.is_empty() {
        return Ok(CrossChainVerificationSummary {
            exists: false,
            payment_count: 0,
            total_amount: 0,
            last_payment_block: 0,
            attestations,
        });
    }

    let payment_count = attestations.len() as u64;
    let total_amount = attestations
        .iter()
        .try_fold(0u128, |acc, att| acc.checked_add(att.amount))
        .ok_or_else(|| {
            RelayerError::InternalError(
                "overflow while computing total attested amount across chains".to_string(),
            )
        })?;
    let last_payment_block = attestations
        .iter()
        .map(|att| att.block_number)
        .max()
        .unwrap_or(0);

    Ok(CrossChainVerificationSummary {
        exists: true,
        payment_count,
        total_amount,
        last_payment_block,
        attestations,
    })
}

impl AttestationSigner {
    fn from_hex(key: &str) -> Result<Self> {
        let trimmed = key.trim_start_matches("0x");
        let key_bytes = hex::decode(trimmed).map_err(|e| {
            RelayerError::Validation(format!(
                "invalid nexus signer key, expected hex string: {}",
                e
            ))
        })?;

        if key_bytes.len() < 16 {
            return Err(RelayerError::Validation(
                "nexus signer key must be at least 16 bytes".to_string(),
            ));
        }

        let fingerprint = hex::encode(&Sha256::digest(&key_bytes)[..8]);

        Ok(Self {
            key: key_bytes,
            fingerprint,
        })
    }

    fn sign(&self, payload: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&self.key);
        hasher.update(payload);
        let digest = hasher.finalize();
        hex::encode(digest)
    }
}

fn normalize_nexus_url(url: &str) -> Result<String> {
    if url.trim().is_empty() {
        return Err(RelayerError::Validation(
            "nexus rpc url must not be empty".to_string(),
        ));
    }

    if url.starts_with("wss://") {
        let replaced = url.replacen("wss://", "https://", 1);
        Ok(replaced.trim_end_matches('/').to_string())
    } else if url.starts_with("ws://") {
        let replaced = url.replacen("ws://", "http://", 1);
        Ok(replaced.trim_end_matches('/').to_string())
    } else {
        Ok(url.trim_end_matches('/').to_string())
    }
}

mod serde_hex_array_32 {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &[u8; 32], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&format!("0x{}", hex::encode(value)))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 32], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let trimmed = s.trim_start_matches("0x");
        let bytes = hex::decode(trimmed).map_err(serde::de::Error::custom)?;
        let mut array = [0u8; 32];
        if bytes.len() != 32 {
            return Err(serde::de::Error::custom("expected 32-byte hex string"));
        }
        array.copy_from_slice(&bytes);
        Ok(array)
    }
}

mod serde_hex_array_20 {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(value: &[u8; 20], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&format!("0x{}", hex::encode(value)))
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<[u8; 20], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let trimmed = s.trim_start_matches("0x");
        let bytes = hex::decode(trimmed).map_err(serde::de::Error::custom)?;
        let mut array = [0u8; 20];
        if bytes.len() != 20 {
            return Err(serde::de::Error::custom("expected 20-byte hex string"));
        }
        array.copy_from_slice(&bytes);
        Ok(array)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signer_rejects_short_keys() {
        let err = AttestationSigner::from_hex("0x1234").unwrap_err();
        assert!(matches!(err, RelayerError::Validation(_)));
    }

    #[test]
    fn signer_generates_fingerprint() {
        let signer = AttestationSigner::from_hex("0x00112233445566778899aabbccddeeff").unwrap();
        assert_eq!(signer.key.len(), 16);
        assert_eq!(signer.fingerprint.len(), 16);
    }

    #[test]
    fn normalize_supports_ws() {
        assert_eq!(
            normalize_nexus_url("wss://nexus.example/api").unwrap(),
            "https://nexus.example/api"
        );
        assert_eq!(
            normalize_nexus_url("http://nexus.local").unwrap(),
            "http://nexus.local"
        );
    }
}
