use crate::{
    blockchain::BlockchainClient,
    config::Config,
    database::{models::Subscription, queries::Queries},
    error::{RelayerError, Result},
};
use anyhow::anyhow;
use chrono::{DateTime, TimeZone, Utc};
use ethers::{
    abi,
    types::{
        Address as EthersAddress, BlockNumber as EthersBlockNumber, Filter, Log as EthersLog, H256,
        U256,
    },
    utils::keccak256,
};
use hypersync_client::{
    format::{Address as HypAddress, LogArgument},
    preset_query,
    simple_types::Event,
    Client as HypClient, ClientConfig, StreamConfig,
};
use std::{
    cmp::{max, min},
    convert::TryFrom,
    num::NonZeroU64,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::time::sleep;
use tracing::{debug, info, warn};
use url::Url;

// Data source decision tree:
// - Recent (<24h) queries rely on Envio GraphQL (default handler behaviour).
// - Explicit historical range requests and startup syncing leverage HyperSync.
// - Wherever HyperSync is unavailable, callers fall back to standard data sources.
const CHUNK_SIZE: u64 = 100_000;
const RPC_FALLBACK_INITIAL_WINDOW: u64 = 1_000;
const RPC_FALLBACK_MIN_WINDOW: u64 = 10;
const PAYMENT_EXECUTED_SIGNATURE: &str =
    "PaymentExecuted(bytes32,address,address,address,uint256,uint256,uint256,address)";
const SUBSCRIPTION_CREATED_SIGNATURE: &str =
    "SubscriptionCreated(bytes32,address,address,address,uint256,uint256,uint256,uint256,uint256)";

#[derive(Clone)]
pub struct HyperSyncClient {
    sepolia_client: Arc<HypClient>,
    base_client: Arc<HypClient>,
    sepolia_url: String,
    base_url: String,
    payment_topic: LogArgument,
    subscription_topic: LogArgument,
}

#[derive(Debug, Clone)]
pub struct RawPaymentEvent {
    pub chain_id: u64,
    pub subscription_id: String,
    pub subscriber: String,
    pub merchant: String,
    pub token: String,
    pub payment_number: u64,
    pub amount: U256,
    pub fee: U256,
    pub relayer: String,
    pub block_number: u64,
    pub transaction_hash: String,
}

#[derive(Debug, Clone)]
pub struct RawSubscriptionEvent {
    pub chain_id: u64,
    pub subscription_id: String,
    pub subscriber: String,
    pub merchant: String,
    pub token: String,
    pub amount: U256,
    pub interval: U256,
    pub max_payments: U256,
    pub max_total_amount: U256,
    pub expiry: U256,
    pub block_number: u64,
    pub transaction_hash: String,
}

impl HyperSyncClient {
    pub fn new<S: Into<String>, B: Into<String>>(sepolia_url: S, base_url: B) -> Result<Self> {
        let payment_topic = Self::topic_from_signature(PAYMENT_EXECUTED_SIGNATURE)?;
        let subscription_topic = Self::topic_from_signature(SUBSCRIPTION_CREATED_SIGNATURE)?;

        let sepolia_url = sepolia_url.into();
        let base_url = base_url.into();

        let sepolia_client = Arc::new(Self::build_client(&sepolia_url)?);
        let base_client = Arc::new(Self::build_client(&base_url)?);

        info!(
            "configured HyperSync clients (sepolia: {}, base: {})",
            sepolia_url, base_url
        );

        Ok(Self {
            sepolia_client,
            base_client,
            sepolia_url,
            base_url,
            payment_topic,
            subscription_topic,
        })
    }

    fn build_client(url: &str) -> Result<HypClient> {
        let parsed = Url::parse(url.trim()).map_err(|e| {
            RelayerError::Config(anyhow!("invalid HyperSync endpoint {}: {}", url, e))
        })?;

        let cfg = ClientConfig {
            url: Some(parsed),
            http_req_timeout_millis: NonZeroU64::new(60_000),
            max_num_retries: Some(0),
            ..ClientConfig::default()
        };

        HypClient::new(cfg).map_err(|e| {
            RelayerError::InternalError(format!("failed to initialise HyperSync client: {}", e))
        })
    }

    fn topic_from_signature(signature: &str) -> Result<LogArgument> {
        let hash = keccak256(signature.as_bytes());
        Ok(LogArgument::from(hash))
    }

    fn parse_contract_address(address: &str) -> Result<HypAddress> {
        let stripped = address
            .strip_prefix("0x")
            .unwrap_or(address)
            .to_ascii_lowercase();
        let bytes = hex::decode(&stripped).map_err(|e| {
            RelayerError::Validation(format!("invalid contract address {}: {}", address, e))
        })?;
        HypAddress::try_from(bytes).map_err(|e| {
            RelayerError::Validation(format!("invalid contract address {}: {}", address, e))
        })
    }

    fn parse_contract_address_h160(address: &str) -> Result<EthersAddress> {
        address
            .parse::<EthersAddress>()
            .map_err(|e| RelayerError::Validation(format!("invalid contract address: {}", e)))
    }

    fn client_for_chain(&self, chain_id: u64) -> Result<Arc<HypClient>> {
        match chain_id {
            11155111 => {
                debug!("using HyperSync Sepolia endpoint {}", self.sepolia_url);
                Ok(Arc::clone(&self.sepolia_client))
            }
            84532 => {
                debug!("using HyperSync Base endpoint {}", self.base_url);
                Ok(Arc::clone(&self.base_client))
            }
            other => Err(RelayerError::Validation(format!(
                "unsupported chain id for HyperSync: {}",
                other
            ))),
        }
    }

    fn chain_name(chain_id: u64) -> Result<&'static str> {
        match chain_id {
            11155111 => Ok("sepolia"),
            84532 => Ok("base"),
            other => Err(RelayerError::Validation(format!(
                "unsupported chain id: {}",
                other
            ))),
        }
    }

    fn endpoint_for_chain(&self, chain_id: u64) -> Option<&str> {
        match chain_id {
            11155111 => Some(self.sepolia_url.as_str()),
            84532 => Some(self.base_url.as_str()),
            _ => None,
        }
    }

    async fn collect_events(
        &self,
        client: Arc<HypClient>,
        chain_id: u64,
        topic: LogArgument,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<Event>> {
        if from_block > to_block {
            return Err(RelayerError::Validation(
                "from_block must be less than or equal to to_block".to_string(),
            ));
        }

        let address = Self::parse_contract_address(contract_address)?;
        let mut query =
            preset_query::logs_of_event(from_block, Some(to_block), topic.clone(), address);

        // make sure each decoded log carries transaction context for downstream processing
        query.field_selection.transaction.insert("hash".to_owned());
        query
            .field_selection
            .transaction
            .insert("block_number".to_owned());
        query.field_selection.transaction.insert("from".to_owned());
        query.field_selection.transaction.insert("to".to_owned());

        let stream_config = StreamConfig::default();

        let response = client.clone().collect_events(query, stream_config).await.map_err(|e| {
            let mut chain_iter = e.chain();
            let mut flattened = Vec::new();
            let mut not_found = false;
            while let Some(cause) = chain_iter.next() {
                let cause_str = cause.to_string();
                if cause_str.contains("404 Not Found") {
                    not_found = true;
                }
                flattened.push(cause_str);
            }

            let detail = if flattened.is_empty() {
                e.to_string()
            } else {
                flattened.join(" -> ")
            };

            if not_found {
                let chain_label = Self::chain_name(chain_id)
                    .unwrap_or("unknown chain")
                    .to_string();
                let endpoint = self
                    .endpoint_for_chain(chain_id)
                    .unwrap_or("unconfigured endpoint");
                RelayerError::NotFound(format!(
                    "HyperSync endpoint {} returned 404 for {} (details: {}). Check HYPERSYNC_URL_{}.",
                    endpoint,
                    chain_label,
                    detail,
                    chain_label.to_uppercase().replace(' ', "_")
                ))
            } else {
                RelayerError::RpcConnectionFailed(format!(
                    "hypersync query failed: {}",
                    detail
                ))
            }
        })?;

        let mut events = Vec::new();
        for batch in response.data {
            events.extend(batch);
        }
        Ok(events)
    }

    async fn fetch_logs_with_chunking(
        blockchain_client: &BlockchainClient,
        chain: &str,
        contract: EthersAddress,
        topic: H256,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<EthersLog>> {
        if from_block > to_block {
            return Ok(Vec::new());
        }

        let total_span = to_block.saturating_sub(from_block).saturating_add(1);
        let mut window = min(total_span, RPC_FALLBACK_INITIAL_WINDOW);
        if window < RPC_FALLBACK_MIN_WINDOW {
            window = total_span.max(1);
        }
        let mut force_min_window = false;

        let mut start = from_block;
        let mut logs = Vec::new();

        while start <= to_block {
            let mut chunk = min(window, to_block.saturating_sub(start).saturating_add(1));
            if chunk == 0 {
                break;
            }

            loop {
                let end = start.saturating_add(chunk - 1).min(to_block);
                let filter = Filter::new()
                    .address(contract)
                    .from_block(EthersBlockNumber::Number(start.into()))
                    .to_block(EthersBlockNumber::Number(end.into()))
                    .topic0(topic);

                match blockchain_client.fetch_logs(chain, filter.clone()).await {
                    Ok(mut fetched_logs) => {
                        logs.append(&mut fetched_logs);
                        let next_window = min(chunk.saturating_mul(2), RPC_FALLBACK_INITIAL_WINDOW);
                        window = if force_min_window {
                            RPC_FALLBACK_MIN_WINDOW
                        } else {
                            max(next_window, RPC_FALLBACK_MIN_WINDOW)
                        };
                        start = end.saturating_add(1);
                        break;
                    }
                    Err(RelayerError::RpcConnectionFailed(msg)) => {
                        let lower_msg = msg.to_lowercase();
                        if lower_msg.contains("10 block range")
                            || lower_msg.contains("block range should work")
                            || lower_msg.contains("free tier plan")
                        {
                            if chunk != RPC_FALLBACK_MIN_WINDOW {
                                warn!(
                                    "eth_getLogs provider for {} enforces a 10-block window; retrying range {}-{} with chunk size {}",
                                    chain, start, end, RPC_FALLBACK_MIN_WINDOW
                                );
                            }
                            force_min_window = true;
                            chunk = RPC_FALLBACK_MIN_WINDOW
                                .min(end.saturating_sub(start).saturating_add(1))
                                .max(1);
                            continue;
                        }

                        if chunk > RPC_FALLBACK_MIN_WINDOW {
                            let reduced = max(chunk / 2, RPC_FALLBACK_MIN_WINDOW);
                            warn!(
                                "eth_getLogs window {}-{} on {} failed ({}). Retrying with chunk size {}",
                                start, end, chain, msg, reduced
                            );
                            chunk = reduced
                                .min(end.saturating_sub(start).saturating_add(1))
                                .max(1);
                            continue;
                        } else {
                            return Err(RelayerError::RpcConnectionFailed(format!(
                                "failed to fetch logs on {} even with {} block window: {}",
                                chain, chunk, msg
                            )));
                        }
                    }
                    Err(err) => return Err(err),
                }
            }
        }

        Ok(logs)
    }

    fn parse_topic_addresses(
        subscription_topic: &[u8],
        subscriber_topic: &[u8],
        merchant_topic: &[u8],
    ) -> Result<(String, String, String)> {
        Ok((
            Self::bytes_to_hex(subscription_topic),
            Self::topic_bytes_to_address(subscriber_topic)?,
            Self::topic_bytes_to_address(merchant_topic)?,
        ))
    }

    fn decode_payment_fields(
        data: &[u8],
    ) -> Result<(EthersAddress, u64, U256, U256, EthersAddress)> {
        let decoded = abi::decode(
            &[
                abi::ParamType::Address,
                abi::ParamType::Uint(256),
                abi::ParamType::Uint(256),
                abi::ParamType::Uint(256),
                abi::ParamType::Address,
            ],
            data,
        )
        .map_err(|e| RelayerError::InternalError(format!("failed to decode payment log: {}", e)))?;

        let token = decoded[0]
            .clone()
            .into_address()
            .ok_or_else(|| RelayerError::InternalError("missing token".to_string()))?;
        let payment_number = decoded[1]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing payment number".to_string()))?
            .as_u64();
        let amount = decoded[2]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing payment amount".to_string()))?;
        let fee = decoded[3]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing protocol fee".to_string()))?;
        let relayer = decoded[4]
            .clone()
            .into_address()
            .ok_or_else(|| RelayerError::InternalError("missing relayer".to_string()))?;

        Ok((token, payment_number, amount, fee, relayer))
    }

    fn decode_subscription_fields(
        data: &[u8],
    ) -> Result<(EthersAddress, U256, U256, U256, U256, U256)> {
        let decoded = abi::decode(
            &[
                abi::ParamType::Address,
                abi::ParamType::Uint(256),
                abi::ParamType::Uint(256),
                abi::ParamType::Uint(256),
                abi::ParamType::Uint(256),
                abi::ParamType::Uint(256),
            ],
            data,
        )
        .map_err(|e| {
            RelayerError::InternalError(format!("failed to decode subscription log: {}", e))
        })?;

        let token = decoded[0]
            .clone()
            .into_address()
            .ok_or_else(|| RelayerError::InternalError("missing token".to_string()))?;
        let amount = decoded[1].clone().into_uint().ok_or_else(|| {
            RelayerError::InternalError("missing subscription amount".to_string())
        })?;
        let interval = decoded[2]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing interval".to_string()))?;
        let max_payments = decoded[3]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing max payments".to_string()))?;
        let max_total_amount = decoded[4]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing max total amount".to_string()))?;
        let expiry = decoded[5]
            .clone()
            .into_uint()
            .ok_or_else(|| RelayerError::InternalError("missing expiry".to_string()))?;

        Ok((
            token,
            amount,
            interval,
            max_payments,
            max_total_amount,
            expiry,
        ))
    }

    fn map_payment_event(chain_id: u64, event: Event) -> Result<RawPaymentEvent> {
        if event.log.topics.len() < 4 {
            return Err(RelayerError::InternalError(
                "payment log missing expected topics".to_string(),
            ));
        }

        let subscription_topic = event
            .log
            .topics
            .get(1)
            .and_then(|topic| topic.as_ref())
            .ok_or_else(|| {
                RelayerError::InternalError("payment log missing subscription topic".to_string())
            })?;
        let subscriber_topic = event
            .log
            .topics
            .get(2)
            .and_then(|topic| topic.as_ref())
            .ok_or_else(|| {
                RelayerError::InternalError("payment log missing subscriber topic".to_string())
            })?;
        let merchant_topic = event
            .log
            .topics
            .get(3)
            .and_then(|topic| topic.as_ref())
            .ok_or_else(|| {
                RelayerError::InternalError("payment log missing merchant topic".to_string())
            })?;

        let data =
            event.log.data.as_ref().ok_or_else(|| {
                RelayerError::InternalError("payment log missing data".to_string())
            })?;

        let (token, payment_number, amount, fee, relayer) =
            Self::decode_payment_fields(data.as_ref())?;

        let block_number = event.log.block_number.map(Into::into).ok_or_else(|| {
            RelayerError::InternalError("payment log missing block number".to_string())
        })?;

        let tx_hash = event.log.transaction_hash.as_ref().ok_or_else(|| {
            RelayerError::InternalError("payment log missing transaction hash".to_string())
        })?;

        let subscription_slice = subscription_topic.as_ref();
        let subscriber_slice = subscriber_topic.as_ref();
        let merchant_slice = merchant_topic.as_ref();

        let (subscription_id, subscriber, merchant) =
            Self::parse_topic_addresses(subscription_slice, subscriber_slice, merchant_slice)?;

        Ok(RawPaymentEvent {
            chain_id,
            subscription_id,
            subscriber,
            merchant,
            token: format!("0x{:x}", token),
            payment_number,
            amount,
            fee,
            relayer: format!("0x{:x}", relayer),
            block_number,
            transaction_hash: Self::bytes_to_hex(tx_hash.as_ref()),
        })
    }

    fn map_payment_log(chain_id: u64, log: &EthersLog) -> Result<RawPaymentEvent> {
        if log.topics.len() < 4 {
            return Err(RelayerError::InternalError(
                "payment log missing expected topics".to_string(),
            ));
        }
        let subscription_topic = log.topics[1].as_bytes();
        let subscriber_topic = log.topics[2].as_bytes();
        let merchant_topic = log.topics[3].as_bytes();

        let (subscription_id, subscriber, merchant) =
            Self::parse_topic_addresses(subscription_topic, subscriber_topic, merchant_topic)?;
        let (token, payment_number, amount, fee, relayer) =
            Self::decode_payment_fields(log.data.as_ref())?;

        let block_number = log.block_number.map(|n| n.as_u64()).ok_or_else(|| {
            RelayerError::InternalError("payment log missing block number".to_string())
        })?;
        let tx_hash = log.transaction_hash.as_ref().ok_or_else(|| {
            RelayerError::InternalError("payment log missing transaction hash".to_string())
        })?;

        Ok(RawPaymentEvent {
            chain_id,
            subscription_id,
            subscriber,
            merchant,
            token: format!("0x{:x}", token),
            payment_number,
            amount,
            fee,
            relayer: format!("0x{:x}", relayer),
            block_number,
            transaction_hash: Self::bytes_to_hex(tx_hash.as_bytes()),
        })
    }

    fn map_subscription_event(chain_id: u64, event: Event) -> Result<RawSubscriptionEvent> {
        if event.log.topics.len() < 4 {
            return Err(RelayerError::InternalError(
                "subscription log missing expected topics".to_string(),
            ));
        }

        let subscription_topic = event
            .log
            .topics
            .get(1)
            .and_then(|topic| topic.as_ref())
            .ok_or_else(|| {
                RelayerError::InternalError("subscription log missing id topic".to_string())
            })?;
        let subscriber_topic = event
            .log
            .topics
            .get(2)
            .and_then(|topic| topic.as_ref())
            .ok_or_else(|| {
                RelayerError::InternalError("subscription log missing subscriber topic".to_string())
            })?;
        let merchant_topic = event
            .log
            .topics
            .get(3)
            .and_then(|topic| topic.as_ref())
            .ok_or_else(|| {
                RelayerError::InternalError("subscription log missing merchant topic".to_string())
            })?;

        let data = event.log.data.as_ref().ok_or_else(|| {
            RelayerError::InternalError("subscription log missing data".to_string())
        })?;

        let (token, amount, interval, max_payments, max_total_amount, expiry) =
            Self::decode_subscription_fields(data.as_ref())?;

        let block_number = event.log.block_number.map(Into::into).ok_or_else(|| {
            RelayerError::InternalError("subscription log missing block number".to_string())
        })?;

        let tx_hash = event.log.transaction_hash.as_ref().ok_or_else(|| {
            RelayerError::InternalError("subscription log missing transaction hash".to_string())
        })?;

        let (subscription_id, subscriber, merchant) = Self::parse_topic_addresses(
            subscription_topic.as_ref(),
            subscriber_topic.as_ref(),
            merchant_topic.as_ref(),
        )?;

        Ok(RawSubscriptionEvent {
            chain_id,
            subscription_id,
            subscriber,
            merchant,
            token: format!("0x{:x}", token),
            amount,
            interval,
            max_payments,
            max_total_amount,
            expiry,
            block_number,
            transaction_hash: Self::bytes_to_hex(tx_hash.as_ref()),
        })
    }

    fn map_subscription_log(chain_id: u64, log: &EthersLog) -> Result<RawSubscriptionEvent> {
        if log.topics.len() < 4 {
            return Err(RelayerError::InternalError(
                "subscription log missing expected topics".to_string(),
            ));
        }
        let subscription_topic = log.topics[1].as_bytes();
        let subscriber_topic = log.topics[2].as_bytes();
        let merchant_topic = log.topics[3].as_bytes();

        let (subscription_id, subscriber, merchant) =
            Self::parse_topic_addresses(subscription_topic, subscriber_topic, merchant_topic)?;
        let (token, amount, interval, max_payments, max_total_amount, expiry) =
            Self::decode_subscription_fields(log.data.as_ref())?;

        let block_number = log.block_number.map(|n| n.as_u64()).ok_or_else(|| {
            RelayerError::InternalError("subscription log missing block number".to_string())
        })?;
        let tx_hash = log.transaction_hash.as_ref().ok_or_else(|| {
            RelayerError::InternalError("subscription log missing transaction hash".to_string())
        })?;

        Ok(RawSubscriptionEvent {
            chain_id,
            subscription_id,
            subscriber,
            merchant,
            token: format!("0x{:x}", token),
            amount,
            interval,
            max_payments,
            max_total_amount,
            expiry,
            block_number,
            transaction_hash: Self::bytes_to_hex(tx_hash.as_bytes()),
        })
    }

    pub async fn get_historical_payments(
        &self,
        chain_id: u64,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<RawPaymentEvent>> {
        let client = self.client_for_chain(chain_id)?;
        let events = self
            .collect_events(
                client,
                chain_id,
                self.payment_topic.clone(),
                contract_address,
                from_block,
                to_block,
            )
            .await?;

        let mut mapped = Vec::with_capacity(events.len());
        for event in events {
            match Self::map_payment_event(chain_id, event) {
                Ok(mapped_event) => mapped.push(mapped_event),
                Err(err) => warn!("skipping malformed payment event: {}", err),
            }
        }

        Ok(mapped)
    }

    pub async fn get_historical_subscriptions(
        &self,
        chain_id: u64,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<RawSubscriptionEvent>> {
        let client = self.client_for_chain(chain_id)?;
        let events = self
            .collect_events(
                client,
                chain_id,
                self.subscription_topic.clone(),
                contract_address,
                from_block,
                to_block,
            )
            .await?;

        let mut mapped = Vec::with_capacity(events.len());
        for event in events {
            match Self::map_subscription_event(chain_id, event) {
                Ok(mapped_event) => mapped.push(mapped_event),
                Err(err) => warn!("skipping malformed subscription event: {}", err),
            }
        }

        Ok(mapped)
    }

    pub async fn get_events_in_range(
        &self,
        chain_id: u64,
        contract_address: &str,
        event_signature: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<Event>> {
        let topic = Self::topic_from_signature(event_signature)?;
        let client = self.client_for_chain(chain_id)?;
        self.collect_events(
            client,
            chain_id,
            topic,
            contract_address,
            from_block,
            to_block,
        )
        .await
    }

    pub async fn fetch_payments_via_rpc(
        &self,
        blockchain_client: &BlockchainClient,
        chain: &str,
        chain_id: u64,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<RawPaymentEvent>> {
        let contract = Self::parse_contract_address_h160(contract_address)?;
        let filter = Filter::new()
            .address(contract)
            .from_block(EthersBlockNumber::Number(from_block.into()))
            .to_block(EthersBlockNumber::Number(to_block.into()))
            .topic0(Self::payment_topic_hash());

        let logs = blockchain_client.fetch_logs(chain, filter).await?;
        let mut events = Vec::with_capacity(logs.len());
        for log in logs {
            match Self::map_payment_log(chain_id, &log) {
                Ok(event) => events.push(event),
                Err(err) => warn!("skipping malformed RPC payment log: {}", err),
            }
        }
        Ok(events)
    }

    pub async fn fetch_subscriptions_via_rpc(
        &self,
        blockchain_client: &BlockchainClient,
        chain: &str,
        chain_id: u64,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<RawSubscriptionEvent>> {
        let contract = Self::parse_contract_address_h160(contract_address)?;
        let filter = Filter::new()
            .address(contract)
            .from_block(EthersBlockNumber::Number(from_block.into()))
            .to_block(EthersBlockNumber::Number(to_block.into()))
            .topic0(Self::subscription_topic_hash());

        let logs = blockchain_client.fetch_logs(chain, filter).await?;
        let mut events = Vec::with_capacity(logs.len());
        for log in logs {
            match Self::map_subscription_log(chain_id, &log) {
                Ok(event) => events.push(event),
                Err(err) => warn!("skipping malformed RPC subscription log: {}", err),
            }
        }
        Ok(events)
    }

    pub async fn sync_historical_data(
        &self,
        config: &Config,
        queries: Arc<Queries>,
        blockchain_client: Arc<BlockchainClient>,
    ) -> Result<()> {
        let targets = vec![
            (
                11155111u64,
                config.subscription_manager_address_sepolia.clone(),
            ),
            (84532u64, config.subscription_manager_address_base.clone()),
        ];

        for (chain_id, contract_address) in targets {
            let chain_name = match Self::chain_name(chain_id) {
                Ok(name) => name,
                Err(err) => {
                    warn!("skipping unsupported chain {}: {}", chain_id, err);
                    continue;
                }
            };
            let chain_numeric_id = blockchain_client.chain_id(chain_name)?;

            let metadata = queries.get_sync_metadata(chain_id as i64).await?;
            let from_block = metadata.last_synced_block.max(0) as u64;
            let current_block = blockchain_client
                .get_current_block_number(chain_name)
                .await?;

            if current_block <= from_block {
                info!(
                    "HyperSync up-to-date for {} (current block {}, last synced {})",
                    chain_name, current_block, from_block
                );
                continue;
            }

            let sync_start_block = from_block.saturating_add(1);
            info!(
                "starting HyperSync historical sync for {} (from block {} to block {})",
                chain_name, sync_start_block, current_block
            );

            let mut current_start = sync_start_block;

            while current_start <= current_block {
                let chunk_end = current_start.saturating_add(CHUNK_SIZE).min(current_block);

                let chunk_timer = Instant::now();
                let subscription_events = match self
                    .get_historical_subscriptions(
                        chain_numeric_id,
                        &contract_address,
                        current_start,
                        chunk_end,
                    )
                    .await
                {
                    Ok(events) => events,
                    Err(err) => {
                        warn!(
                            "HyperSync subscription chunk {}-{} failed for {}: {}, falling back to RPC",
                            current_start, chunk_end, chain_name, err
                        );
                        Self::fetch_subscriptions_via_rpc_static(
                            blockchain_client.as_ref(),
                            chain_name,
                            chain_numeric_id,
                            &contract_address,
                            current_start,
                            chunk_end,
                        )
                        .await?
                    }
                };

                info!(
                    "retrieved {} subscription events from HyperSync (chain={}, from={}, to={}, duration_ms={})",
                    subscription_events.len(),
                    chain_numeric_id,
                    current_start,
                    chunk_end,
                    chunk_timer.elapsed().as_millis()
                );

                for event in subscription_events {
                    if let Err(err) = self
                        .persist_subscription_event(
                            &event,
                            chain_name,
                            &queries,
                            &blockchain_client,
                        )
                        .await
                    {
                        warn!(
                            "failed to persist subscription {} on {}: {}",
                            event.subscription_id, chain_name, err
                        );
                    }
                }

                let payment_timer = Instant::now();
                let payment_events = match self
                    .get_historical_payments(
                        chain_numeric_id,
                        &contract_address,
                        current_start,
                        chunk_end,
                    )
                    .await
                {
                    Ok(events) => events,
                    Err(err) => {
                        warn!(
                            "HyperSync payment chunk {}-{} failed for {}: {}, falling back to RPC",
                            current_start, chunk_end, chain_name, err
                        );
                        Self::fetch_payments_via_rpc_static(
                            blockchain_client.as_ref(),
                            chain_name,
                            chain_numeric_id,
                            &contract_address,
                            current_start,
                            chunk_end,
                        )
                        .await?
                    }
                };

                info!(
                    "retrieved {} payment events from HyperSync (chain={}, from={}, to={}, duration_ms={})",
                    payment_events.len(),
                    chain_numeric_id,
                    current_start,
                    chunk_end,
                    payment_timer.elapsed().as_millis()
                );

                for event in payment_events {
                    if let Err(err) = self
                        .persist_payment_event(&event, chain_name, &queries, &blockchain_client)
                        .await
                    {
                        warn!(
                            "failed to persist payment {} on {}: {}",
                            event.transaction_hash, chain_name, err
                        );
                    }
                }

                queries
                    .update_sync_metadata(chain_id as i64, chunk_end as i64)
                    .await?;

                if chunk_end == current_block {
                    break;
                }

                current_start = chunk_end.saturating_add(1);
                sleep(Duration::from_millis(100)).await;
            }

            info!(
                "HyperSync historical sync complete for {} (synced up to block {})",
                chain_name, current_block
            );
        }

        Ok(())
    }

    async fn persist_subscription_event(
        &self,
        event: &RawSubscriptionEvent,
        chain: &str,
        queries: &Arc<Queries>,
        blockchain_client: &Arc<BlockchainClient>,
    ) -> Result<()> {
        let id_bytes =
            hex::decode(event.subscription_id.trim_start_matches("0x")).map_err(|e| {
                RelayerError::InternalError(format!("invalid subscription id encoding: {}", e))
            })?;

        let subscription_id: [u8; 32] = id_bytes.try_into().map_err(|_| {
            RelayerError::InternalError("subscription id must be 32 bytes".to_string())
        })?;

        let on_chain = blockchain_client
            .get_subscription(subscription_id, chain)
            .await?;

        let Some(on_chain) = on_chain else {
            debug!(
                "subscription {:?} not found on chain {} while syncing",
                event.subscription_id, chain
            );
            return Ok(());
        };

        let interval_secs = on_chain.interval.as_u64();
        let start_time = Self::timestamp_from_u64(on_chain.start_time.as_u64());
        let expiry = Self::timestamp_from_u64(on_chain.expiry.as_u64());

        let executed_payments_u64 = on_chain.executed_payments.as_u64();
        let next_due_secs = if executed_payments_u64 == 0 {
            on_chain.start_time.as_u64()
        } else {
            on_chain
                .start_time
                .as_u64()
                .saturating_add(interval_secs.saturating_mul(executed_payments_u64))
        };

        let subscription = Subscription {
            id: event.subscription_id.clone(),
            subscriber: format!("0x{:x}", on_chain.subscriber),
            merchant: format!("0x{:x}", on_chain.merchant),
            token_address: format!("0x{:x}", on_chain.token),
            amount: on_chain.amount.to_string(),
            interval_seconds: i64::try_from(interval_secs).unwrap_or(i64::MAX),
            start_time,
            max_payments: i64::try_from(on_chain.max_payments.as_u64()).unwrap_or(i64::MAX),
            max_total_amount: on_chain.max_total_amount.to_string(),
            expiry,
            nonce: i64::try_from(on_chain.nonce.as_u64()).unwrap_or_default(),
            status: Self::status_to_string(on_chain.status),
            executed_payments: i64::try_from(executed_payments_u64).unwrap_or(i64::MAX),
            total_paid: on_chain.total_paid.to_string(),
            next_payment_due: Self::timestamp_from_u64(next_due_secs),
            failure_count: 0,
            created_at: start_time,
            updated_at: Utc::now(),
            chain: chain.to_string(),
            avail_block_number: None,
            avail_extrinsic_index: None,
        };

        match queries.insert_subscription(&subscription).await {
            Ok(_) => info!(
                "recorded subscription {} from HyperSync for chain {}",
                subscription.id, chain
            ),
            Err(RelayerError::Duplicate(_)) => {
                debug!(
                    "subscription {} already recorded; skipping HyperSync insert",
                    subscription.id
                );
            }
            Err(err) => return Err(err),
        }

        Ok(())
    }

    async fn persist_payment_event(
        &self,
        event: &RawPaymentEvent,
        chain: &str,
        queries: &Arc<Queries>,
        blockchain_client: &Arc<BlockchainClient>,
    ) -> Result<()> {
        let block_timestamp = blockchain_client
            .get_block_timestamp(chain, event.block_number)
            .await?;
        let executed_at = Self::timestamp_from_u64(block_timestamp);

        let merchant_amount = event
            .amount
            .checked_sub(event.fee)
            .unwrap_or_else(U256::zero);

        let inserted = queries
            .insert_execution_from_hypersync(
                &event.subscription_id,
                &event.relayer,
                i64::try_from(event.payment_number).unwrap_or(i64::MAX),
                &event.amount.to_string(),
                &event.fee.to_string(),
                &merchant_amount.to_string(),
                &event.transaction_hash,
                i64::try_from(event.block_number).unwrap_or(i64::MAX),
                executed_at,
                chain,
            )
            .await?;

        if inserted {
            info!(
                "recorded payment {} for subscription {} on {} via HyperSync",
                event.transaction_hash, event.subscription_id, chain
            );
        } else {
            debug!(
                "payment {} already present in database; skipping HyperSync insert",
                event.transaction_hash
            );
        }

        Ok(())
    }

    pub async fn fetch_payments_via_rpc_static(
        blockchain_client: &BlockchainClient,
        chain: &str,
        chain_id: u64,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<RawPaymentEvent>> {
        let contract = Self::parse_contract_address_h160(contract_address)?;
        let logs = Self::fetch_logs_with_chunking(
            blockchain_client,
            chain,
            contract,
            Self::payment_topic_hash(),
            from_block,
            to_block,
        )
        .await?;
        let mut events = Vec::with_capacity(logs.len());
        for log in logs {
            match Self::map_payment_log(chain_id, &log) {
                Ok(event) => events.push(event),
                Err(err) => warn!("skipping malformed RPC payment log: {}", err),
            }
        }
        Ok(events)
    }

    pub async fn fetch_subscriptions_via_rpc_static(
        blockchain_client: &BlockchainClient,
        chain: &str,
        chain_id: u64,
        contract_address: &str,
        from_block: u64,
        to_block: u64,
    ) -> Result<Vec<RawSubscriptionEvent>> {
        let contract = Self::parse_contract_address_h160(contract_address)?;
        let logs = Self::fetch_logs_with_chunking(
            blockchain_client,
            chain,
            contract,
            Self::subscription_topic_hash(),
            from_block,
            to_block,
        )
        .await?;
        let mut events = Vec::with_capacity(logs.len());
        for log in logs {
            match Self::map_subscription_log(chain_id, &log) {
                Ok(event) => events.push(event),
                Err(err) => warn!("skipping malformed RPC subscription log: {}", err),
            }
        }
        Ok(events)
    }

    fn timestamp_from_u64(seconds: u64) -> DateTime<Utc> {
        Utc.timestamp_opt(seconds as i64, 0)
            .single()
            .unwrap_or_else(Utc::now)
    }

    fn payment_topic_hash() -> H256 {
        H256::from_slice(&keccak256(PAYMENT_EXECUTED_SIGNATURE.as_bytes()))
    }

    fn subscription_topic_hash() -> H256 {
        H256::from_slice(&keccak256(SUBSCRIPTION_CREATED_SIGNATURE.as_bytes()))
    }

    fn bytes_to_hex(bytes: &[u8]) -> String {
        if bytes.is_empty() {
            "0x".to_string()
        } else {
            format!("0x{}", hex::encode(bytes))
        }
    }

    fn topic_bytes_to_address(bytes: &[u8]) -> Result<String> {
        if bytes.len() != 32 {
            return Err(RelayerError::InternalError(
                "unexpected topic length for address".to_string(),
            ));
        }
        let address = EthersAddress::from_slice(&bytes[12..]);
        Ok(format!("0x{:x}", address))
    }

    fn status_to_string(status: u8) -> String {
        match status {
            0 => "ACTIVE",
            1 => "PAUSED",
            2 => "CANCELLED",
            3 => "EXPIRED",
            4 => "COMPLETED",
            _ => "UNKNOWN",
        }
        .to_string()
    }
}
