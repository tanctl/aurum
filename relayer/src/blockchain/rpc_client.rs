use super::contract_bindings::{SubscriptionManager, MockPYUSD};
use crate::config::Config;
use crate::error::{RelayerError, Result};
use ethers::prelude::*;
use ethers::providers::{Provider, Http, Middleware};
use ethers::signers::{LocalWallet, Signer};
use ethers::types::{Address, U256, TransactionReceipt, H256};
use std::sync::Arc;
use tracing::{info, warn};

#[derive(Clone)]
pub struct BlockchainClient {
    sepolia_provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    base_provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    sepolia_subscription_manager: SubscriptionManager<SignerMiddleware<Provider<Http>, LocalWallet>>,
    base_subscription_manager: SubscriptionManager<SignerMiddleware<Provider<Http>, LocalWallet>>,
    sepolia_pyusd: MockPYUSD<SignerMiddleware<Provider<Http>, LocalWallet>>,
    base_pyusd: MockPYUSD<SignerMiddleware<Provider<Http>, LocalWallet>>,
    relayer_address: Address,
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
        info!("initializing blockchain client with providers for sepolia and base");

        let sepolia_provider = Provider::<Http>::try_from(&config.ethereum_rpc_url)
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("sepolia rpc connection failed: {}", e)))?;
        let base_provider = Provider::<Http>::try_from(&config.base_rpc_url)
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("base rpc connection failed: {}", e)))?;

        let wallet: LocalWallet = config.relayer_private_key.parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid relayer private key")))?;
        
        let relayer_address = wallet.address();
        info!("relayer address: {:?}", relayer_address);

        let sepolia_chain_id = sepolia_provider.get_chainid().await
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("failed to get sepolia chain id: {}", e)))?;
        let base_chain_id = base_provider.get_chainid().await
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("failed to get base chain id: {}", e)))?;

        let sepolia_wallet = wallet.clone().with_chain_id(sepolia_chain_id.as_u64());
        let base_wallet = wallet.with_chain_id(base_chain_id.as_u64());

        let sepolia_client = Arc::new(SignerMiddleware::new(sepolia_provider, sepolia_wallet));
        let base_client = Arc::new(SignerMiddleware::new(base_provider, base_wallet));

        let sepolia_sm_address: Address = config.subscription_manager_address_sepolia.parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid sepolia subscription manager address")))?;
        let base_sm_address: Address = config.subscription_manager_address_base.parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid base subscription manager address")))?;

        let sepolia_subscription_manager = SubscriptionManager::new(sepolia_sm_address, sepolia_client.clone());
        let base_subscription_manager = SubscriptionManager::new(base_sm_address, base_client.clone());

        let sepolia_pyusd_address: Address = config.pyusd_address_sepolia.parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid sepolia pyusd address")))?;
        let base_pyusd_address: Address = config.pyusd_address_base.parse()
            .map_err(|_| RelayerError::Config(anyhow::anyhow!("invalid base pyusd address")))?;

        let sepolia_pyusd = MockPYUSD::new(sepolia_pyusd_address, sepolia_client.clone());
        let base_pyusd = MockPYUSD::new(base_pyusd_address, base_client.clone());

        info!("blockchain client initialized successfully");

        Ok(Self {
            sepolia_provider: sepolia_client,
            base_provider: base_client,
            sepolia_subscription_manager,
            base_subscription_manager,
            sepolia_pyusd,
            base_pyusd,
            relayer_address,
        })
    }

    fn get_provider_and_contracts(&self, chain: &str) -> Result<(
        &Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
        &SubscriptionManager<SignerMiddleware<Provider<Http>, LocalWallet>>,
        &MockPYUSD<SignerMiddleware<Provider<Http>, LocalWallet>>
    )> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok((&self.sepolia_provider, &self.sepolia_subscription_manager, &self.sepolia_pyusd)),
            "base" => Ok((&self.base_provider, &self.base_subscription_manager, &self.base_pyusd)),
            _ => Err(RelayerError::Validation(format!("unsupported chain: {}", chain))),
        }
    }

    pub async fn get_subscription(&self, subscription_id: [u8; 32], chain: &str) -> Result<Option<SubscriptionData>> {
        info!("fetching subscription {:?} on chain {}", subscription_id, chain);

        let (_, subscription_manager, _) = self.get_provider_and_contracts(chain)?;

        let subscription = subscription_manager
            .get_subscription(subscription_id)
            .call()
            .await
            .map_err(|e| RelayerError::ContractRevert(format!("failed to get subscription: {}", e)))?;

        if subscription.nonce == U256::zero() {
            info!("subscription {:?} not found on chain {}", subscription_id, chain);
            return Ok(None);
        }

        let executed_payments = subscription_manager
            .executed_payments(subscription_id)
            .call()
            .await
            .map_err(|e| RelayerError::ContractRevert(format!("failed to get executed payments: {}", e)))?;

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
            status: subscription.status,
            executed_payments,
            total_paid: executed_payments * subscription.amount,
        };

        info!("successfully fetched subscription {:?}", subscription_id);
        Ok(Some(data))
    }

    pub async fn check_allowance(&self, subscriber: Address, amount: U256, chain: &str) -> Result<bool> {
        info!("checking allowance for subscriber {:?} amount {} on chain {}", subscriber, amount, chain);

        let (_, subscription_manager, pyusd) = self.get_provider_and_contracts(chain)?;
        let contract_address = subscription_manager.address();

        let allowance = pyusd
            .allowance(subscriber, contract_address)
            .call()
            .await
            .map_err(|e| RelayerError::ContractRevert(format!("failed to check allowance: {}", e)))?;

        let has_sufficient_allowance = allowance >= amount;
        info!("allowance check: subscriber has {}, needs {}, sufficient: {}", 
              allowance, amount, has_sufficient_allowance);

        Ok(has_sufficient_allowance)
    }

    pub async fn check_balance(&self, subscriber: Address, chain: &str) -> Result<U256> {
        info!("checking balance for subscriber {:?} on chain {}", subscriber, chain);

        let (_, _, pyusd) = self.get_provider_and_contracts(chain)?;

        let balance = pyusd
            .balance_of(subscriber)
            .call()
            .await
            .map_err(|e| RelayerError::ContractRevert(format!("failed to check balance: {}", e)))?;

        info!("subscriber {:?} balance: {}", subscriber, balance);
        Ok(balance)
    }

    pub async fn execute_subscription(&self, subscription_id: [u8; 32], chain: &str) -> Result<ExecutionResult> {
        info!("executing subscription {:?} on chain {}", subscription_id, chain);

        let (provider, subscription_manager, _) = self.get_provider_and_contracts(chain)?;

        let subscription_data = self.get_subscription(subscription_id, chain).await?
            .ok_or_else(|| RelayerError::NotFound("subscription not found".to_string()))?;

        let has_allowance = self.check_allowance(subscription_data.subscriber, subscription_data.amount, chain).await?;
        if !has_allowance {
            return Err(RelayerError::ContractRevert("insufficient allowance for subscription execution".to_string()));
        }

        let balance = self.check_balance(subscription_data.subscriber, chain).await?;
        if balance < subscription_data.amount {
            return Err(RelayerError::ContractRevert("insufficient balance for subscription execution".to_string()));
        }

        let gas_estimate = subscription_manager
            .execute_subscription(subscription_id, self.relayer_address)
            .estimate_gas()
            .await
            .map_err(|e| RelayerError::InsufficientGas(format!("gas estimation failed: {}", e)))?;

        let gas_buffer_multiplier = 120;
        let gas_limit = gas_estimate * gas_buffer_multiplier / 100;
        info!("gas estimate: {}, using limit: {}", gas_estimate, gas_limit);

        let gas_price = provider
            .get_gas_price()
            .await
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("failed to get gas price: {}", e)))?;

        info!("current gas price: {}", gas_price);

        let tx = subscription_manager
            .execute_subscription(subscription_id, self.relayer_address)
            .gas(gas_limit)
            .gas_price(gas_price);

        let pending_tx = tx.send().await
            .map_err(|e| RelayerError::TransactionFailed(format!("failed to send transaction: {}", e)))?;

        info!("transaction sent, hash: {:?}", pending_tx.tx_hash());

        let receipt = pending_tx
            .await
            .map_err(|e| RelayerError::TransactionFailed(format!("transaction confirmation failed: {}", e)))?
            .ok_or_else(|| RelayerError::InternalError("transaction receipt not found".to_string()))?;

        let transaction_succeeded = receipt.status == Some(1u64.into());
        
        if !transaction_succeeded {
            warn!("transaction failed: {:?}", receipt.transaction_hash);
            return Err(RelayerError::InternalError("transaction execution failed".to_string()));
        }

        let result = ExecutionResult {
            transaction_hash: receipt.transaction_hash,
            block_number: receipt.block_number.unwrap_or_default().as_u64(),
            gas_used: receipt.gas_used.unwrap_or_default(),
            gas_price,
            status: transaction_succeeded,
        };

        info!("subscription executed successfully: {:?}", result.transaction_hash);
        Ok(result)
    }

    pub async fn get_transaction_receipt(&self, tx_hash: H256, chain: &str) -> Result<Option<TransactionReceipt>> {
        info!("fetching transaction receipt for {:?} on chain {}", tx_hash, chain);

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;

        let receipt = provider
            .get_transaction_receipt(tx_hash)
            .await
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("failed to get transaction receipt: {}", e)))?;

        match &receipt {
            Some(_) => info!("found transaction receipt for {:?}", tx_hash),
            None => warn!("transaction receipt not found for {:?}", tx_hash),
        }

        Ok(receipt)
    }

    pub async fn get_current_block_number(&self, chain: &str) -> Result<u64> {
        info!("fetching current block number for chain {}", chain);

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;

        let block_number = provider
            .get_block_number()
            .await
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("failed to get block number: {}", e)))?;

        info!("current block number on {}: {}", chain, block_number);
        Ok(block_number.as_u64())
    }

    pub async fn validate_connection(&self, chain: &str) -> Result<()> {
        info!("validating connection to chain {}", chain);

        let (provider, _, _) = self.get_provider_and_contracts(chain)?;

        let chain_id = provider
            .get_chainid()
            .await
            .map_err(|e| RelayerError::RpcConnectionFailed(format!("failed to get chain id: {}", e)))?;

        info!("successfully connected to chain {} with id {}", chain, chain_id);
        Ok(())
    }

    // new method to get payment count from contract
    pub async fn get_payment_count(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        info!("fetching payment count for subscription {:?} on chain {}", subscription_id, chain);

        let (_, subscription_manager, _) = self.get_provider_and_contracts(chain)?;

        let payment_count = subscription_manager
            .executed_payments(subscription_id)
            .call()
            .await
            .map_err(|e| RelayerError::ContractRevert(format!("failed to get payment count: {}", e)))?;

        info!("payment count for subscription {:?}: {}", subscription_id, payment_count);
        Ok(payment_count.as_u64())
    }

    // get subscription nonce from contract for validation
    pub async fn get_subscription_nonce(&self, subscription_id: [u8; 32], chain: &str) -> Result<u64> {
        info!("fetching nonce for subscription {:?} on chain {}", subscription_id, chain);

        let subscription_data = self.get_subscription(subscription_id, chain).await?
            .ok_or_else(|| RelayerError::NotFound("subscription not found".to_string()))?;

        Ok(subscription_data.nonce.as_u64())
    }

    // validate subscription exists and is in expected state
    pub async fn validate_subscription_state(&self, subscription_id: [u8; 32], chain: &str) -> Result<SubscriptionData> {
        info!("validating state for subscription {:?} on chain {}", subscription_id, chain);

        let subscription_data = self.get_subscription(subscription_id, chain).await?
            .ok_or_else(|| RelayerError::NotFound("subscription not found on chain".to_string()))?;

        // validate subscription is active (status = 0)
        if subscription_data.status != 0 {
            return Err(RelayerError::Validation(format!("subscription not active, status: {}", subscription_data.status)));
        }

        // validate not expired
        let current_timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        if subscription_data.expiry.as_u64() <= current_timestamp {
            return Err(RelayerError::Validation("subscription expired".to_string()));
        }

        // validate payments not exceeded
        if subscription_data.executed_payments >= subscription_data.max_payments {
            return Err(RelayerError::Validation("subscription max payments reached".to_string()));
        }

        info!("subscription state validation passed for {:?}", subscription_id);
        Ok(subscription_data)
    }
}