use std::{convert::TryFrom, env};

use avail_rust_client::{
    block_api::BlockWithExt, extensions::KeypairExt, prelude::*, Client as SdkClient,
    Error as SdkError, UserError as SdkUserError,
};
use chrono::Utc;
use tracing::{info, warn};

use crate::{
    api::types::SubscriptionIntent,
    avail::types::{AvailIntent, AvailMetadata, AvailSubmissionResult},
    config::Config,
    error::{RelayerError, Result},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AvailClientMode {
    Stub,
    Remote,
}

#[derive(Clone, Default)]
struct StubClient;

#[derive(Clone)]
struct RemoteClient {
    client: SdkClient,
    signer: avail_rust_client::subxt_signer::sr25519::Keypair,
    app_id: u32,
}

impl RemoteClient {
    async fn submit_intent(&self, payload: &AvailIntent) -> Result<AvailSubmissionResult> {
        let data = serde_json::to_vec(payload).map_err(|e| {
            RelayerError::InternalError(format!("failed to serialize avail intent: {}", e))
        })?;

        let submittable = self.client.tx().data_availability().submit_data(data);

        let submitted = submittable
            .sign_and_submit(&self.signer, Options::new(self.app_id))
            .await
            .map_err(map_sdk_error)?;

        // Wait for transaction to be finalized to guarantee inclusion.
        let receipt = submitted
            .receipt(true)
            .await
            .map_err(map_sdk_error)?
            .ok_or_else(|| {
                RelayerError::InternalError(
                    "avail transaction dropped before inclusion".to_string(),
                )
            })?;

        Ok(AvailSubmissionResult {
            block_number: receipt.block_ref.height as u64,
            extrinsic_index: receipt.tx_ref.index as u64,
        })
    }

    async fn fetch_intent(&self, block_number: u64, extrinsic_index: u64) -> Result<AvailIntent> {
        let block_number = u32::try_from(block_number).map_err(|_| {
            RelayerError::Validation("avail block number exceeds 32-bit range".to_string())
        })?;
        let extrinsic_index = u32::try_from(extrinsic_index).map_err(|_| {
            RelayerError::Validation("avail extrinsic index exceeds 32-bit range".to_string())
        })?;

        let block = BlockWithExt::new(self.client.clone(), block_number);
        let extrinsic: Option<
            avail_rust_client::block_api::BlockExtrinsic<avail::data_availability::tx::SubmitData>,
        > = block.get(extrinsic_index).await.map_err(map_sdk_error)?;

        let extrinsic = extrinsic.ok_or_else(|| {
            RelayerError::NotFound("avail extrinsic not found for provided references".to_string())
        })?;

        serde_json::from_slice::<AvailIntent>(&extrinsic.call.data).map_err(|e| {
            RelayerError::InternalError(format!(
                "failed to decode avail intent payload from extrinsic: {}",
                e
            ))
        })
    }
}

#[derive(Clone)]
pub struct AvailClient {
    inner: AvailClientModeInner,
}

#[derive(Clone)]
enum AvailClientModeInner {
    Stub(StubClient),
    Remote(Box<RemoteClient>),
}

impl AvailClient {
    pub async fn new(config: &Config) -> Result<Self> {
        if config.avail_enabled() {
            let endpoint = config
                .avail_rpc_url
                .as_ref()
                .expect("avail_enabled implies rpc url present")
                .clone();
            let app_id = config
                .avail_application_id
                .expect("avail_enabled implies application id present");
            let signing_key = env::var("AVAIL_SIGNING_KEY")
                .ok()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty());

            if let Some(secret_uri) = signing_key {
                let client = SdkClient::new(endpoint.trim())
                    .await
                    .map_err(map_sdk_error)?;
                let signer =
                    avail_rust_client::subxt_signer::sr25519::Keypair::from_str(&secret_uri)
                        .map_err(map_user_error)?;

                info!(
                    "initialised Avail client in remote mode targeting {} (app_id={})",
                    endpoint, app_id
                );

                return Ok(Self {
                    inner: AvailClientModeInner::Remote(Box::new(RemoteClient {
                        client,
                        signer,
                        app_id,
                    })),
                });
            } else {
                warn!(
                    "AVAIL_RPC_URL configured but AVAIL_SIGNING_KEY is missing; falling back to stub mode"
                );
            }
        }

        info!("initialised Avail client in stub mode");
        Ok(Self {
            inner: AvailClientModeInner::Stub(StubClient),
        })
    }

    pub fn mode(&self) -> AvailClientMode {
        match self.inner {
            AvailClientModeInner::Stub(_) => AvailClientMode::Stub,
            AvailClientModeInner::Remote(_) => AvailClientMode::Remote,
        }
    }

    pub async fn submit_intent(
        &self,
        intent: &SubscriptionIntent,
        signature: &str,
        relayer: &str,
        chain_id: u64,
    ) -> Result<AvailSubmissionResult> {
        let metadata = AvailMetadata {
            application_id: match &self.inner {
                AvailClientModeInner::Remote(remote) => remote.app_id.to_string(),
                AvailClientModeInner::Stub(_) => "aurum-stub".to_string(),
            },
            chain_id,
            submitted_at: Utc::now(),
            relayer: relayer.to_string(),
        };

        let payload = AvailIntent {
            intent: intent.clone(),
            signature: signature.to_string(),
            metadata,
        };

        match &self.inner {
            AvailClientModeInner::Stub(stub) => Ok(stub.stub_submission_result(&payload)),
            AvailClientModeInner::Remote(remote) => remote.submit_intent(&payload).await,
        }
    }

    pub async fn retrieve_intent(
        &self,
        block_number: u64,
        extrinsic_index: u64,
    ) -> Result<AvailIntent> {
        match &self.inner {
            AvailClientModeInner::Stub(_) => Err(RelayerError::InternalError(
                "avail client running in stub mode; retrieval unavailable".to_string(),
            )),
            AvailClientModeInner::Remote(remote) => {
                remote.fetch_intent(block_number, extrinsic_index).await
            }
        }
    }

    pub async fn verify_data_availability(
        &self,
        block_number: u64,
        extrinsic_index: u64,
    ) -> Result<bool> {
        match &self.inner {
            AvailClientModeInner::Stub(_) => Ok(true),
            AvailClientModeInner::Remote(remote) => {
                match remote.fetch_intent(block_number, extrinsic_index).await {
                    Ok(_) => Ok(true),
                    Err(RelayerError::NotFound(_)) => Ok(false),
                    Err(err) => Err(err),
                }
            }
        }
    }

    pub async fn fetch_intent_if_available(
        &self,
        block_number: u64,
        extrinsic_index: u64,
    ) -> Result<Option<AvailIntent>> {
        match self.mode() {
            AvailClientMode::Stub => Ok(None),
            AvailClientMode::Remote => {
                match self.retrieve_intent(block_number, extrinsic_index).await {
                    Ok(intent) => Ok(Some(intent)),
                    Err(RelayerError::NotFound(_)) => Ok(None),
                    Err(err) => Err(err),
                }
            }
        }
    }
}

impl StubClient {
    fn stub_submission_result(&self, payload: &AvailIntent) -> AvailSubmissionResult {
        let seed = payload.intent.nonce + payload.metadata.chain_id;
        let block_number = 1_000_000 + (seed % 10_000);
        let extrinsic_index = payload.intent.nonce % 100;

        AvailSubmissionResult {
            block_number,
            extrinsic_index,
        }
    }
}

fn map_sdk_error(error: SdkError) -> RelayerError {
    RelayerError::InternalError(format!("avail sdk error: {}", error))
}

fn map_user_error(error: SdkUserError) -> RelayerError {
    RelayerError::InternalError(format!("avail signer error: {}", error))
}
