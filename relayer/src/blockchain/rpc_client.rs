use super::contract_bindings::{MockPYUSD, SubscriptionManager, IERC20};
use crate::config::Config;
use crate::error::{RelayerError, Result};
use chrono::Utc;
use ethers::prelude::*;
use ethers::providers::{Http, Middleware, Provider};
use ethers::signers::{LocalWallet, Signer};
use ethers::types::{Address, Filter, Log as EthersLog, TransactionReceipt, H256, U256};
use std::sync::Arc;
use tracing::{info, warn};

const STUB_SEPOLIA_CHAIN_ID: u64 = 11155111;
const STUB_BASE_CHAIN_ID: u64 = 8453;

#[derive(Clone)]
pub struct BlockchainClient {
    real: Option<Arc<RealBlockchainClient>>,
    stub: Option<Arc<StubBlockchainClient>>,
}

struct RealBlockchainClient {
    sepolia_provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    base_provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    sepolia_subscription_manager:
        SubscriptionManager<SignerMiddleware<Provider<Http>, LocalWallet>>,
    base_subscription_manager: SubscriptionManager<SignerMiddleware<Provider<Http>, LocalWallet>>,
    sepolia_pyusd: MockPYUSD<SignerMiddleware<Provider<Http>, LocalWallet>>,
    base_pyusd: MockPYUSD<SignerMiddleware<Provider<Http>, LocalWallet>>,
    relayer_address: Address,
    sepolia_chain_id: u64,
    base_chain_id: u64,
}

struct StubBlockchainClient {
    relayer_address: Address,
    sepolia_chain_id: u64,
    base_chain_id: u64,
}

#[derive(Debug, Clone)]
pub struct SubscriptionData {
    pub id: [u8; 32],
    pub subscriber: Address,
    pub merchant: Address,
    pub amount: U256,
    pub interval: U256,
    pub start_time: U256,
    pub max_payments: U256,
    pub max_total_amount: U256,
    pub expiry: U256,
    pub nonce: U256,
    pub token: Address,
    pub status: u8,
    pub executed_payments: U256,
    pub total_paid: U256,
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub transaction_hash: H256,
    pub block_number: u64,
    pub gas_used: U256,
    pub gas_price: U256,
    pub status: bool,
}

impl BlockchainClient {
    pub async fn new(config: &Config) -> Result<Self> {
        let eth_stub = is_stub_endpoint(&config.ethereum_rpc_url);
        let base_stub = is_stub_endpoint(&config.base_rpc_url);

        if eth_stub ^ base_stub {
            warn!("detected mixed stub and real rpc urls; running blockchain client in stub mode");
        }

        if eth_stub || base_stub {
            // treat any stub endpoint as a hint to stay in deterministic client mode
            info!("initializing blockchain client in stub mode");
            let stub = StubBlockchainClient::new(config)?;
            Ok(Self {
                real: None,
                stub: Some(Arc::new(stub)),
            })
        } else {
            info!("initializing blockchain client with providers for sepolia and base");
            let real = RealBlockchainClient::new(config).await?;
            info!("blockchain client initialized successfully");
            Ok(Self {
                real: Some(Arc::new(real)),
                stub: None,
            })
        }
    }

    pub async fn get_subscription(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<Option<SubscriptionData>> {
        if let Some(real) = &self.real {
            real.get_subscription(subscription_id, chain).await
        } else if let Some(stub) = &self.stub {
            stub.get_subscription(subscription_id, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn check_allowance(
        &self,
        subscriber: Address,
        token: Address,
        amount: U256,
        chain: &str,
    ) -> Result<bool> {
        if let Some(real) = &self.real {
            real.check_allowance(subscriber, token, amount, chain).await
        } else if let Some(stub) = &self.stub {
            stub.check_allowance(subscriber, token, amount, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn check_balance(
        &self,
        subscriber: Address,
        token: Address,
        chain: &str,
    ) -> Result<U256> {
        if let Some(real) = &self.real {
            real.check_balance(subscriber, token, chain).await
        } else if let Some(stub) = &self.stub {
            stub.check_balance(subscriber, token, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn execute_subscription(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<ExecutionResult> {
        if let Some(real) = &self.real {
            real.execute_subscription(subscription_id, chain).await
        } else if let Some(stub) = &self.stub {
            stub.execute_subscription(subscription_id, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn get_transaction_receipt(
        &self,
        tx_hash: H256,
        chain: &str,
    ) -> Result<Option<TransactionReceipt>> {
        if let Some(real) = &self.real {
            real.get_transaction_receipt(tx_hash, chain).await
        } else if let Some(stub) = &self.stub {
            stub.get_transaction_receipt(tx_hash, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn get_current_block_number(&self, chain: &str) -> Result<u64> {
        if let Some(real) = &self.real {
            real.get_current_block_number(chain).await
        } else if let Some(stub) = &self.stub {
            stub.get_current_block_number(chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn get_block_timestamp(&self, chain: &str, block_number: u64) -> Result<u64> {
        if let Some(real) = &self.real {
            real.get_block_timestamp(chain, block_number).await
        } else if let Some(stub) = &self.stub {
            stub.get_block_timestamp(chain, block_number).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn validate_connection(&self, chain: &str) -> Result<()> {
        if let Some(real) = &self.real {
            real.validate_connection(chain).await
        } else if let Some(stub) = &self.stub {
            stub.validate_connection(chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn get_payment_count(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        if let Some(real) = &self.real {
            real.get_payment_count(subscription_id, chain).await
        } else if let Some(stub) = &self.stub {
            stub.get_payment_count(subscription_id, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn get_subscription_nonce(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<u64> {
        if let Some(real) = &self.real {
            real.get_subscription_nonce(subscription_id, chain).await
        } else if let Some(stub) = &self.stub {
            stub.get_subscription_nonce(subscription_id, chain).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn validate_subscription_state(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<SubscriptionData> {
        if let Some(real) = &self.real {
            real.validate_subscription_state(subscription_id, chain)
                .await
        } else if let Some(stub) = &self.stub {
            stub.validate_subscription_state(subscription_id, chain)
                .await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub async fn fetch_logs(&self, chain: &str, filter: Filter) -> Result<Vec<EthersLog>> {
        if let Some(real) = &self.real {
            real.fetch_logs(chain, filter).await
        } else if let Some(stub) = &self.stub {
            stub.fetch_logs(chain, filter).await
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }

    pub fn chain_id(&self, chain: &str) -> Result<u64> {
        if let Some(real) = &self.real {
            real.chain_id(chain)
        } else if let Some(stub) = &self.stub {
            stub.chain_id(chain)
        } else {
            Err(RelayerError::InternalError(
                "blockchain client not initialised".to_string(),
            ))
        }
    }
}

impl RealBlockchainClient {
    async fn new(config: &Config) -> Result<Self> {
        let sepolia_provider =
            Provider::<Http>::try_from(&config.ethereum_rpc_url).map_err(|e| {
                RelayerError::RpcConnectionFailed(format!("sepolia rpc connection failed: {}", e))
            })?;
        let base_provider = Provider::<Http>::try_from(&config.base_rpc_url).map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("base rpc connection failed: {}", e))
        })?;

        let wallet: LocalWallet = config
            .relayer_private_key
            .parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid relayer private key")))?;

        let relayer_address = wallet.address();
        info!("relayer address: {:?}", relayer_address);

        let sepolia_chain_id = sepolia_provider.get_chainid().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to get sepolia chain id: {}", e))
        })?;
        let base_chain_id = base_provider.get_chainid().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to get base chain id: {}", e))
        })?;

        let sepolia_chain_id_u64 = sepolia_chain_id.as_u64();
        let base_chain_id_u64 = base_chain_id.as_u64();

        let sepolia_wallet = wallet.clone().with_chain_id(sepolia_chain_id_u64);
        let base_wallet = wallet.with_chain_id(base_chain_id_u64);

        let sepolia_client = Arc::new(SignerMiddleware::new(sepolia_provider, sepolia_wallet));
        let base_client = Arc::new(SignerMiddleware::new(base_provider, base_wallet));

        let sepolia_sm_address: Address = config
            .subscription_manager_address_sepolia
            .parse()
            .map_err(|_| {
                RelayerError::Config(anyhow::anyhow!(
                    "invalid sepolia subscription manager address"
                ))
            })?;
        let base_sm_address: Address =
            config
                .subscription_manager_address_base
                .parse()
                .map_err(|_| {
                    RelayerError::Config(anyhow::anyhow!(
                        "invalid base subscription manager address"
                    ))
                })?;

        let sepolia_subscription_manager =
            SubscriptionManager::new(sepolia_sm_address, sepolia_client.clone());
        let base_subscription_manager =
            SubscriptionManager::new(base_sm_address, base_client.clone());

        let sepolia_pyusd_address: Address = config
            .pyusd_address_sepolia
            .parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid sepolia pyusd address")))?;
        let base_pyusd_address: Address = config
            .pyusd_address_base
            .parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid base pyusd address")))?;

        let sepolia_pyusd = MockPYUSD::new(sepolia_pyusd_address, sepolia_client.clone());
        let base_pyusd = MockPYUSD::new(base_pyusd_address, base_client.clone());

        Ok(Self {
            sepolia_provider: sepolia_client,
            base_provider: base_client,
            sepolia_subscription_manager,
            base_subscription_manager,
            sepolia_pyusd,
            base_pyusd,
            relayer_address,
            sepolia_chain_id: sepolia_chain_id_u64,
            base_chain_id: base_chain_id_u64,
        })
    }

    fn get_provider_and_contracts(
        &self,
        chain: &str,
    ) -> Result<(
        &Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
        &SubscriptionManager<SignerMiddleware<Provider<Http>, LocalWallet>>,
        &MockPYUSD<SignerMiddleware<Provider<Http>, LocalWallet>>,
    )> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok((
                &self.sepolia_provider,
                &self.sepolia_subscription_manager,
                &self.sepolia_pyusd,
            )),
            "base" => Ok((
                &self.base_provider,
                &self.base_subscription_manager,
                &self.base_pyusd,
            )),
            _ => Err(RelayerError::Validation(format!(
                "unsupported chain: {}",
                chain
            ))),
        }
    }

    async fn get_subscription(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<Option<SubscriptionData>> {
        info!(
            "fetching subscription {:?} on chain {}",
            subscription_id, chain
        );

        let (_, subscription_manager, _) = self.get_provider_and_contracts(chain)?;

        let subscription = subscription_manager
            .get_subscription(subscription_id)
            .call()
            .await
            .map_err(|e| {
                RelayerError::ContractRevert(format!("failed to get subscription: {}", e))
            })?;

        if subscription.nonce == U256::zero() {
            info!(
                "subscription {:?} not found on chain {}",
                subscription_id, chain
            );
            return Ok(None);
        }

        let executed_payments = subscription_manager
            .executed_payments(subscription_id)
            .call()
            .await
            .map_err(|e| {
                RelayerError::ContractRevert(format!("failed to get executed payments: {}", e))
            })?;

        let data = SubscriptionData {
            id: subscription_id,
            subscriber: subscription.subscriber,
            merchant: subscription.merchant,
            amount: subscription.amount,
            interval: subscription.interval,
            start_time: subscription.start_time,
            max_payments: subscription.max_payments,
            max_total_amount: subscription.max_total_amount,
            expiry: subscription.expiry,
            nonce: subscription.nonce,
            token: subscription.token,
            status: subscription.status,
            executed_payments,
            total_paid: executed_payments * subscription.amount,
        };

        info!("successfully fetched subscription {:?}", subscription_id);
        Ok(Some(data))
    }

    async fn check_allowance(
        &self,
        subscriber: Address,
        token: Address,
        amount: U256,
        chain: &str,
    ) -> Result<bool> {
        if token == Address::zero() {
            return Ok(true);
        }

        info!(
            "checking allowance for subscriber {:?} token {:?} amount {} on chain {}",
            subscriber, token, amount, chain
        );

        let (provider, subscription_manager, _) = self.get_provider_and_contracts(chain)?;
        let contract_address = subscription_manager.address();

        let erc20 = IERC20::new(token, provider.clone());
        let allowance = erc20
            .allowance(subscriber, contract_address)
            .call()
            .await
            .map_err(|e| {
                RelayerError::ContractRevert(format!("failed to check allowance: {}", e))
            })?;

        let has_sufficient_allowance = allowance >= amount;
        info!(
            "allowance check: subscriber has {}, needs {}, sufficient: {}",
            allowance, amount, has_sufficient_allowance
        );

        Ok(has_sufficient_allowance)
    }

    async fn check_balance(
        &self,
        subscriber: Address,
        token: Address,
        chain: &str,
    ) -> Result<U256> {
        if token == Address::zero() {
            let (provider, _, _) = self.get_provider_and_contracts(chain)?;
            let balance = provider.get_balance(subscriber, None).await.map_err(|e| {
                RelayerError::ContractRevert(format!("failed to check balance: {}", e))
            })?;
            info!(
                "subscriber {:?} eth balance: {} on {}",
                subscriber, balance, chain
            );
            return Ok(balance);
        }

        info!(
            "checking erc20 balance for subscriber {:?} token {:?} on chain {}",
            subscriber, token, chain
        );

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;
        let erc20 = IERC20::new(token, provider.clone());

        let balance =
            erc20.balance_of(subscriber).call().await.map_err(|e| {
                RelayerError::ContractRevert(format!("failed to check balance: {}", e))
            })?;

        info!("subscriber {:?} erc20 balance: {}", subscriber, balance);
        Ok(balance)
    }

    async fn execute_subscription(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<ExecutionResult> {
        info!(
            "executing subscription {:?} on chain {}",
            subscription_id, chain
        );

        let (provider, subscription_manager, _) = self.get_provider_and_contracts(chain)?;

        let subscription_data = self
            .get_subscription(subscription_id, chain)
            .await?
            .ok_or_else(|| RelayerError::NotFound("subscription not found".to_string()))?;

        if subscription_data.token != Address::zero() {
            let has_allowance = self
                .check_allowance(
                    subscription_data.subscriber,
                    subscription_data.token,
                    subscription_data.amount,
                    chain,
                )
                .await?;
            if !has_allowance {
                return Err(RelayerError::ContractRevert(
                    "insufficient allowance for subscription execution".to_string(),
                ));
            }

            let balance = self
                .check_balance(subscription_data.subscriber, subscription_data.token, chain)
                .await?;
            if balance < subscription_data.amount {
                return Err(RelayerError::ContractRevert(
                    "insufficient balance for subscription execution".to_string(),
                ));
            }
        }

        let gas_estimate = subscription_manager
            .execute_subscription(subscription_id, self.relayer_address)
            .estimate_gas()
            .await
            .map_err(|e| RelayerError::InsufficientGas(format!("gas estimation failed: {}", e)))?;

        let gas_buffer_multiplier = 120;
        let gas_limit = gas_estimate * gas_buffer_multiplier / 100;
        info!("gas estimate: {}, using limit: {}", gas_estimate, gas_limit);

        let gas_price = provider.get_gas_price().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to get gas price: {}", e))
        })?;

        info!("current gas price: {}", gas_price);

        let tx = subscription_manager
            .execute_subscription(subscription_id, self.relayer_address)
            .gas(gas_limit)
            .gas_price(gas_price);

        let pending_tx = tx.send().await.map_err(|e| {
            RelayerError::TransactionFailed(format!("failed to send transaction: {}", e))
        })?;

        info!("transaction sent, hash: {:?}", pending_tx.tx_hash());

        let receipt = pending_tx
            .await
            .map_err(|e| {
                RelayerError::TransactionFailed(format!("transaction confirmation failed: {}", e))
            })?
            .ok_or_else(|| {
                RelayerError::InternalError("transaction receipt not found".to_string())
            })?;

        let transaction_succeeded = receipt.status == Some(1u64.into());

        if !transaction_succeeded {
            warn!("transaction failed: {:?}", receipt.transaction_hash);
            return Err(RelayerError::InternalError(
                "transaction execution failed".to_string(),
            ));
        }

        let result = ExecutionResult {
            transaction_hash: receipt.transaction_hash,
            block_number: receipt.block_number.unwrap_or_default().as_u64(),
            gas_used: receipt.gas_used.unwrap_or_default(),
            gas_price,
            status: transaction_succeeded,
        };

        info!(
            "subscription executed successfully: {:?}",
            result.transaction_hash
        );
        Ok(result)
    }

    async fn get_transaction_receipt(
        &self,
        tx_hash: H256,
        chain: &str,
    ) -> Result<Option<TransactionReceipt>> {
        info!(
            "fetching transaction receipt for {:?} on chain {}",
            tx_hash, chain
        );

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;

        let receipt = provider
            .get_transaction_receipt(tx_hash)
            .await
            .map_err(|e| {
                RelayerError::RpcConnectionFailed(format!(
                    "failed to get transaction receipt: {}",
                    e
                ))
            })?;

        match &receipt {
            Some(_) => info!("found transaction receipt for {:?}", tx_hash),
            None => warn!("transaction receipt not found for {:?}", tx_hash),
        }

        Ok(receipt)
    }

    async fn fetch_logs(&self, chain: &str, filter: Filter) -> Result<Vec<EthersLog>> {
        let (provider, _, _) = self.get_provider_and_contracts(chain)?;
        provider.get_logs(&filter).await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to fetch logs on {}: {}", chain, e))
        })
    }

    async fn get_current_block_number(&self, chain: &str) -> Result<u64> {
        info!("fetching current block number for chain {}", chain);

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;

        let block_number = provider.get_block_number().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to get block number: {}", e))
        })?;

        info!("current block number on {}: {}", chain, block_number);
        Ok(block_number.as_u64())
    }

    async fn get_block_timestamp(&self, chain: &str, block_number: u64) -> Result<u64> {
        info!(
            "fetching block timestamp for chain {} block {}",
            chain, block_number
        );

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;
        let block = provider
            .get_block(block_number)
            .await
            .map_err(|e| {
                RelayerError::RpcConnectionFailed(format!(
                    "failed to fetch block {} on {}: {}",
                    block_number, chain, e
                ))
            })?
            .ok_or_else(|| {
                RelayerError::NotFound(format!(
                    "block {} not found on chain {}",
                    block_number, chain
                ))
            })?;

        Ok(block.timestamp.as_u64())
    }

    async fn validate_connection(&self, chain: &str) -> Result<()> {
        info!("validating connection to chain {}", chain);

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;

        let chain_id = provider.get_chainid().await.map_err(|e| {
            RelayerError::RpcConnectionFailed(format!("failed to get chain id: {}", e))
        })?;

        info!(
            "successfully connected to chain {} with id {}",
            chain, chain_id
        );
        Ok(())
    }

    async fn get_payment_count(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        info!(
            "fetching payment count for subscription {:?} on chain {}",
            subscription_id, chain
        );

        let (_, subscription_manager, _) = self.get_provider_and_contracts(chain)?;

        let payment_count = subscription_manager
            .executed_payments(subscription_id)
            .call()
            .await
            .map_err(|e| {
                RelayerError::ContractRevert(format!("failed to get payment count: {}", e))
            })?;

        info!(
            "payment count for subscription {:?}: {}",
            subscription_id, payment_count
        );
        Ok(payment_count.as_u64())
    }

    async fn get_subscription_nonce(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        info!(
            "fetching nonce for subscription {:?} on chain {}",
            subscription_id, chain
        );

        let subscription_data = self
            .get_subscription(subscription_id, chain)
            .await?
            .ok_or_else(|| RelayerError::NotFound("subscription not found".to_string()))?;

        Ok(subscription_data.nonce.as_u64())
    }

    async fn validate_subscription_state(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<SubscriptionData> {
        info!(
            "validating state for subscription {:?} on chain {}",
            subscription_id, chain
        );

        let subscription_data = self
            .get_subscription(subscription_id, chain)
            .await?
            .ok_or_else(|| RelayerError::NotFound("subscription not found on chain".to_string()))?;

        if subscription_data.status != 0 {
            return Err(RelayerError::Validation(format!(
                "subscription not active, status: {}",
                subscription_data.status
            )));
        }

        let current_timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if subscription_data.expiry.as_u64() <= current_timestamp {
            return Err(RelayerError::Validation("subscription expired".to_string()));
        }

        if subscription_data.executed_payments >= subscription_data.max_payments {
            return Err(RelayerError::Validation(
                "subscription max payments reached".to_string(),
            ));
        }

        info!(
            "subscription state validation passed for {:?}",
            subscription_id
        );
        Ok(subscription_data)
    }

    fn chain_id(&self, chain: &str) -> Result<u64> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok(self.sepolia_chain_id),
            "base" => Ok(self.base_chain_id),
            _ => Err(RelayerError::Validation(format!(
                "unsupported chain: {}",
                chain
            ))),
        }
    }
}

impl StubBlockchainClient {
    fn new(config: &Config) -> Result<Self> {
        let relayer_address = config
            .relayer_address
            .parse()
            .unwrap_or_else(|_| Address::zero());

        Ok(Self {
            relayer_address,
            sepolia_chain_id: STUB_SEPOLIA_CHAIN_ID,
            base_chain_id: STUB_BASE_CHAIN_ID,
        })
    }

    fn normalize_chain(chain: &str) -> Result<String> {
        let normalized = chain.trim().to_ascii_lowercase();
        match normalized.as_str() {
            "sepolia" | "base" => Ok(normalized),
            _ => Err(RelayerError::Validation(format!(
                "unsupported chain: {}",
                chain
            ))),
        }
    }

    async fn get_subscription(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<Option<SubscriptionData>> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client returning no on-chain subscription data for {:?} on {}",
            subscription_id, normalized
        );
        Ok(None)
    }

    async fn fetch_logs(&self, chain: &str, _filter: Filter) -> Result<Vec<EthersLog>> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client returning empty log set for {}",
            normalized
        );
        Ok(Vec::new())
    }

    async fn check_allowance(
        &self,
        _subscriber: Address,
        _token: Address,
        _amount: U256,
        chain: &str,
    ) -> Result<bool> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client assuming allowance sufficient on {}",
            normalized
        );
        Ok(true)
    }

    async fn check_balance(
        &self,
        _subscriber: Address,
        _token: Address,
        chain: &str,
    ) -> Result<U256> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client returning large balance for chain {}",
            normalized
        );
        Ok(U256::from(u128::MAX))
    }

    async fn execute_subscription(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<ExecutionResult> {
        let normalized = Self::normalize_chain(chain)?;
        let block_number = match normalized.as_str() {
            "sepolia" => 1_000_000,
            "base" => 5_000_000,
            _ => unreachable!(),
        };

        let result = ExecutionResult {
            transaction_hash: H256::from(subscription_id),
            block_number,
            gas_used: U256::from(21_000u64),
            gas_price: U256::from(1_000_000_000u64),
            status: true,
        };

        info!(
            "stub blockchain client returning synthetic execution result for {:?} on {}",
            subscription_id, normalized
        );
        Ok(result)
    }

    async fn get_transaction_receipt(
        &self,
        tx_hash: H256,
        chain: &str,
    ) -> Result<Option<TransactionReceipt>> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client has no receipt for {:?} on {}",
            tx_hash, normalized
        );
        Ok(None)
    }

    async fn get_current_block_number(&self, chain: &str) -> Result<u64> {
        let normalized = Self::normalize_chain(chain)?;
        let block_number = match normalized.as_str() {
            "sepolia" => 1_000_000,
            "base" => 5_000_000,
            _ => unreachable!(),
        };
        info!(
            "stub blockchain client returning block {} for {}",
            block_number, normalized
        );
        Ok(block_number)
    }

    async fn get_block_timestamp(&self, chain: &str, _block_number: u64) -> Result<u64> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client providing synthetic timestamp for {}",
            normalized
        );
        Ok(Utc::now().timestamp() as u64)
    }

    async fn validate_connection(&self, chain: &str) -> Result<()> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client connection validated for {}",
            normalized
        );
        Ok(())
    }

    async fn get_payment_count(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client returning zero payments for {:?} on {}",
            subscription_id, normalized
        );
        Ok(0)
    }

    async fn get_subscription_nonce(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client returning nonce 0 for {:?} on {}",
            subscription_id, normalized
        );
        Ok(0)
    }

    async fn validate_subscription_state(
        &self,
        subscription_id: [u8; 32],
        chain: &str,
    ) -> Result<SubscriptionData> {
        let normalized = Self::normalize_chain(chain)?;
        info!(
            "stub blockchain client returning synthetic subscription state for {:?} on {}",
            subscription_id, normalized
        );

        Ok(SubscriptionData {
            id: subscription_id,
            subscriber: Address::zero(),
            merchant: self.relayer_address,
            amount: U256::from(0),
            interval: U256::from(60u64),
            start_time: U256::from(0),
            max_payments: U256::from(100u64),
            max_total_amount: U256::from(0),
            expiry: U256::from(u64::MAX),
            nonce: U256::from(0),
            token: Address::zero(),
            status: 0,
            executed_payments: U256::zero(),
            total_paid: U256::zero(),
        })
    }

    fn chain_id(&self, chain: &str) -> Result<u64> {
        let normalized = Self::normalize_chain(chain)?;
        Ok(match normalized.as_str() {
            "sepolia" => self.sepolia_chain_id,
            "base" => self.base_chain_id,
            _ => unreachable!(),
        })
    }
}

fn is_stub_endpoint(endpoint: &str) -> bool {
    let normalized = endpoint.trim().to_ascii_lowercase();
    normalized == "stub" || normalized.starts_with("stub://")
}
