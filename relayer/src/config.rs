use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub ethereum_rpc_url: String,
    pub base_rpc_url: String,
    pub relayer_private_key: String,
    pub subscription_manager_address_sepolia: String,
    pub subscription_manager_address_base: String,
    pub pyusd_address_sepolia: String,
    pub pyusd_address_base: String,
    pub server_host: String,
    pub server_port: u16,
    pub execution_interval_seconds: u64,
    pub max_executions_per_batch: i64,
    pub max_gas_price_gwei: u64,
    pub relayer_address: String,
    pub envio_hyperindex_url: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        // load .env file if it exists
        dotenv::dotenv().ok();

        let config = Config {
            database_url: env::var("DATABASE_URL")
                .context("DATABASE_URL environment variable is required")?,
            ethereum_rpc_url: env::var("ETHEREUM_RPC_URL")
                .context("ETHEREUM_RPC_URL environment variable is required")?,
            base_rpc_url: env::var("BASE_RPC_URL")
                .context("BASE_RPC_URL environment variable is required")?,
            relayer_private_key: env::var("RELAYER_PRIVATE_KEY")
                .context("RELAYER_PRIVATE_KEY environment variable is required")?,
            subscription_manager_address_sepolia: env::var("SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA")
                .context("SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA environment variable is required")?,
            subscription_manager_address_base: env::var("SUBSCRIPTION_MANAGER_ADDRESS_BASE")
                .context("SUBSCRIPTION_MANAGER_ADDRESS_BASE environment variable is required")?,
            pyusd_address_sepolia: env::var("PYUSD_ADDRESS_SEPOLIA")
                .context("PYUSD_ADDRESS_SEPOLIA environment variable is required")?,
            pyusd_address_base: env::var("PYUSD_ADDRESS_BASE")
                .context("PYUSD_ADDRESS_BASE environment variable is required")?,
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .context("SERVER_PORT must be a valid port number")?,
            execution_interval_seconds: env::var("EXECUTION_INTERVAL_SECONDS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .context("EXECUTION_INTERVAL_SECONDS must be a valid number")?,
            max_executions_per_batch: env::var("MAX_EXECUTIONS_PER_BATCH")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .context("MAX_EXECUTIONS_PER_BATCH must be a valid number")?,
            max_gas_price_gwei: env::var("MAX_GAS_PRICE_GWEI")
                .unwrap_or_else(|_| "50".to_string())
                .parse()
                .context("MAX_GAS_PRICE_GWEI must be a valid number")?,
            relayer_address: env::var("RELAYER_ADDRESS")
                .context("RELAYER_ADDRESS environment variable is required")?,
            envio_hyperindex_url: env::var("ENVIO_HYPERINDEX_URL").ok(),
        };

        // validate eth addresses
        config.validate()?;

        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        // validate that addresses are valid eth addresses (42 chars starting with 0x)
        let addresses = [
            (
                &self.subscription_manager_address_sepolia,
                "SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA",
            ),
            (
                &self.subscription_manager_address_base,
                "SUBSCRIPTION_MANAGER_ADDRESS_BASE",
            ),
            (&self.pyusd_address_sepolia, "PYUSD_ADDRESS_SEPOLIA"),
            (&self.pyusd_address_base, "PYUSD_ADDRESS_BASE"),
            (&self.relayer_address, "RELAYER_ADDRESS"),
        ];

        for (address, name) in addresses {
            if !address.starts_with("0x") || address.len() != 42 {
                return Err(anyhow::anyhow!(
                    "{} must be a valid ethereum address (42 characters starting with 0x)",
                    name
                ));
            }
        }

        // validate private key (64 hex chars, optionally prefixed with 0x)
        let private_key = if self.relayer_private_key.starts_with("0x") {
            &self.relayer_private_key[2..]
        } else {
            &self.relayer_private_key
        };

        if private_key.len() != 64 || !private_key.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(anyhow::anyhow!(
                "RELAYER_PRIVATE_KEY must be a valid private key (64 hex characters)"
            ));
        }

        // validate rpc urls
        if !self.ethereum_rpc_url.starts_with("http") {
            return Err(anyhow::anyhow!(
                "ETHEREUM_RPC_URL must be a valid http(s) url"
            ));
        }

        if !self.base_rpc_url.starts_with("http") {
            return Err(anyhow::anyhow!("BASE_RPC_URL must be a valid http(s) url"));
        }

        if !self.database_url.starts_with("postgres") {
            return Err(anyhow::anyhow!(
                "DATABASE_URL must be a valid postgresql connection string"
            ));
        }

        Ok(())
    }

    pub fn subscription_manager_address_for_chain(&self, chain: &str) -> Result<&str> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok(&self.subscription_manager_address_sepolia),
            "base" => Ok(&self.subscription_manager_address_base),
            _ => Err(anyhow::anyhow!("unsupported chain: {}", chain)),
        }
    }

    pub fn rpc_url_for_chain(&self, chain: &str) -> Result<&str> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok(&self.ethereum_rpc_url),
            "base" => Ok(&self.base_rpc_url),
            _ => Err(anyhow::anyhow!("unsupported chain: {}", chain)),
        }
    }

    pub fn pyusd_address_for_chain(&self, chain: &str) -> Result<&str> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok(&self.pyusd_address_sepolia),
            "base" => Ok(&self.pyusd_address_base),
            _ => Err(anyhow::anyhow!("unsupported chain: {}", chain)),
        }
    }
}
