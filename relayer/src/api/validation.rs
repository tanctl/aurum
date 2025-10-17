use crate::api::types::SubscriptionIntent;
use crate::error::{RelayerError, Result};
use ethers::abi::{encode, Token};
use ethers::core::utils::keccak256;
use ethers::types::{Address, Signature, U256};
use std::str::FromStr;

pub struct ValidationService;

impl ValidationService {
    pub fn validate_intent_signature(
        intent: &SubscriptionIntent,
        signature: &str,
        verifying_contract: Address,
        chain_id: u64,
    ) -> Result<()> {
        if !signature.starts_with("0x") || signature.len() != 132 {
            return Err(RelayerError::Validation(
                "signature must be 0x followed by 130 hex characters".to_string(),
            ));
        }

        let signature_bytes = hex::decode(&signature[2..])
            .map_err(|_| RelayerError::Validation("invalid signature hex encoding".to_string()))?;

        let sig = Signature::try_from(signature_bytes.as_slice())
            .map_err(|_| RelayerError::Validation("invalid signature format".to_string()))?;

        let struct_hash = Self::hash_subscription_intent(intent)?;
        let domain_separator = Self::domain_separator(chain_id, verifying_contract);
        let message_hash = Self::eip712_digest(domain_separator, struct_hash);

        let recovered_address = sig
            .recover(message_hash)
            .map_err(|_| RelayerError::Validation("signature recovery failed".to_string()))?;

        let subscriber_address = Address::from_str(&intent.subscriber)
            .map_err(|_| RelayerError::Validation("invalid subscriber address".to_string()))?;

        if recovered_address != subscriber_address {
            return Err(RelayerError::Validation(
                "signature does not match subscriber address".to_string(),
            ));
        }

        Ok(())
    }

    pub fn generate_subscription_id(
        intent: &SubscriptionIntent,
        signature: &str,
    ) -> Result<String> {
        let struct_hash = Self::hash_subscription_intent(intent)?;

        let signature_bytes = hex::decode(&signature[2..])
            .map_err(|_| RelayerError::Validation("invalid signature encoding".to_string()))?;

        let mut combined = Vec::with_capacity(32 + signature_bytes.len());
        combined.extend_from_slice(&struct_hash);
        combined.extend_from_slice(&signature_bytes);

        let subscription_id = keccak256(&combined);
        Ok(format!("0x{}", hex::encode(subscription_id)))
    }

    pub fn validate_subscription_id_format(id: &str) -> Result<()> {
        if !id.starts_with("0x") {
            return Err(RelayerError::Validation(
                "subscription ID must start with 0x".to_string(),
            ));
        }

        if id.len() != 66 {
            return Err(RelayerError::Validation(
                "subscription ID must be exactly 66 characters".to_string(),
            ));
        }

        if !id[2..].chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(RelayerError::Validation(
                "subscription ID contains invalid characters".to_string(),
            ));
        }

        Ok(())
    }

    pub fn validate_address_format(address: &str) -> Result<Address> {
        let addr = Address::from_str(address)
            .map_err(|_| RelayerError::Validation("invalid ethereum address format".to_string()))?;

        Ok(addr)
    }

    pub fn validate_amount(amount: &str) -> Result<U256> {
        let amount_u256 = U256::from_str(amount)
            .map_err(|_| RelayerError::Validation("invalid amount format".to_string()))?;

        if amount_u256.is_zero() {
            return Err(RelayerError::Validation(
                "amount must be greater than zero".to_string(),
            ));
        }

        let max_amount = U256::from(10).pow(U256::from(30));
        if amount_u256 > max_amount {
            return Err(RelayerError::Validation(
                "amount exceeds maximum allowed value".to_string(),
            ));
        }

        Ok(amount_u256)
    }

    pub fn validate_timing(start_time: u64, expiry: u64, interval: u64) -> Result<()> {
        let now = chrono::Utc::now().timestamp() as u64;

        if start_time < now {
            return Err(RelayerError::Validation(
                "start time cannot be in the past".to_string(),
            ));
        }

        if expiry <= start_time {
            return Err(RelayerError::Validation(
                "expiry must be after start time".to_string(),
            ));
        }

        let max_future = now + (10 * 365 * 24 * 60 * 60);
        if expiry > max_future {
            return Err(RelayerError::Validation(
                "expiry too far in the future".to_string(),
            ));
        }

        if interval < 3600 {
            return Err(RelayerError::Validation(
                "interval must be at least 1 hour (3600 seconds)".to_string(),
            ));
        }

        if interval > (365 * 24 * 60 * 60) {
            return Err(RelayerError::Validation(
                "interval cannot exceed 1 year".to_string(),
            ));
        }

        let total_duration = expiry - start_time;
        if total_duration < interval {
            return Err(RelayerError::Validation(
                "subscription duration must allow for at least one payment".to_string(),
            ));
        }

        Ok(())
    }

    pub fn validate_payment_parameters(
        amount: &str,
        max_payments: u64,
        max_total_amount: &str,
    ) -> Result<()> {
        let amount_u256 = Self::validate_amount(amount)?;
        let max_total_u256 = Self::validate_amount(max_total_amount)?;

        if max_payments == 0 {
            return Err(RelayerError::Validation(
                "max payments must be greater than zero".to_string(),
            ));
        }

        if max_payments > 10000 {
            return Err(RelayerError::Validation(
                "max payments cannot exceed 10,000".to_string(),
            ));
        }

        let calculated_total = amount_u256
            .checked_mul(U256::from(max_payments))
            .ok_or_else(|| RelayerError::Validation("payment calculation overflow".to_string()))?;

        if calculated_total > max_total_u256 {
            return Err(RelayerError::Validation(
                "max total amount insufficient for max payments * amount".to_string(),
            ));
        }

        let min_payment = U256::from(1_000_000_000_000_000u64);
        if amount_u256 < min_payment {
            return Err(RelayerError::Validation(
                "payment amount too small to cover gas and protocol fees".to_string(),
            ));
        }

        Ok(())
    }

    fn hash_subscription_intent(intent: &SubscriptionIntent) -> Result<[u8; 32]> {
        let type_hash = keccak256(
            b"SubscriptionIntent(address subscriber,address merchant,uint256 amount,uint256 interval,uint256 startTime,uint256 maxPayments,uint256 maxTotalAmount,uint256 expiry,uint256 nonce,address token)",
        );

        let subscriber = Address::from_str(&intent.subscriber)
            .map_err(|_| RelayerError::Validation("invalid subscriber address".to_string()))?;
        let merchant = Address::from_str(&intent.merchant)
            .map_err(|_| RelayerError::Validation("invalid merchant address".to_string()))?;
        let amount = U256::from_dec_str(&intent.amount)
            .map_err(|_| RelayerError::Validation("invalid amount format".to_string()))?;
        let interval = U256::from(intent.interval);
        let start_time = U256::from(intent.start_time);
        let max_payments = U256::from(intent.max_payments);
        let max_total_amount = U256::from_dec_str(&intent.max_total_amount)
            .map_err(|_| RelayerError::Validation("invalid max total amount format".to_string()))?;
        let expiry = U256::from(intent.expiry);
        let nonce = U256::from(intent.nonce);
        let token_addr = Address::from_str(&intent.token)
            .map_err(|_| RelayerError::Validation("invalid token address".to_string()))?;

        let encoded = encode(&[
            Token::FixedBytes(type_hash.to_vec()),
            Token::Address(subscriber),
            Token::Address(merchant),
            Token::Uint(amount),
            Token::Uint(interval),
            Token::Uint(start_time),
            Token::Uint(max_payments),
            Token::Uint(max_total_amount),
            Token::Uint(expiry),
            Token::Uint(nonce),
            Token::Address(token_addr),
        ]);

        Ok(keccak256(&encoded))
    }

    fn domain_separator(chain_id: u64, verifying_contract: Address) -> [u8; 32] {
        let domain_type_hash = keccak256(
            b"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
        );
        let name_hash = keccak256(b"Aurum");
        let version_hash = keccak256(b"1");

        let encoded = encode(&[
            Token::FixedBytes(domain_type_hash.to_vec()),
            Token::FixedBytes(name_hash.to_vec()),
            Token::FixedBytes(version_hash.to_vec()),
            Token::Uint(U256::from(chain_id)),
            Token::Address(verifying_contract),
        ]);

        keccak256(&encoded)
    }

    fn eip712_digest(domain_separator: [u8; 32], struct_hash: [u8; 32]) -> [u8; 32] {
        let mut encoded = Vec::with_capacity(2 + 32 + 32);
        encoded.extend_from_slice(b"\x19\x01");
        encoded.extend_from_slice(&domain_separator);
        encoded.extend_from_slice(&struct_hash);
        keccak256(&encoded)
    }
}
