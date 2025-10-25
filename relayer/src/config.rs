use crate::utils::tokens;
use anyhow::{Context, Result};
use ethers::types::Address;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::env;
use std::str::FromStr;

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
    pub supported_tokens_sepolia: Vec<String>,
    pub supported_tokens_base: Vec<String>,
    pub server_host: String,
    pub server_port: u16,
    pub execution_interval_seconds: u64,
    pub max_executions_per_batch: i64,
    pub max_gas_price_gwei: u64,
    pub relayer_address: String,
    pub envio_graphql_endpoint: Option<String>,
    pub envio_explorer_url: Option<String>,
    pub avail_rpc_url: Option<String>,
    pub avail_application_id: Option<u32>,
    pub hypersync_url_sepolia: Option<String>,
    pub hypersync_url_base: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        // load .env file if it exists
        dotenv::dotenv().ok();

        let database_url =
            env::var("DATABASE_URL").context("DATABASE_URL environment variable is required")?;
        let ethereum_rpc_url = env::var("ETHEREUM_RPC_URL")
            .context("ETHEREUM_RPC_URL environment variable is required")?;
        let base_rpc_url =
            env::var("BASE_RPC_URL").context("BASE_RPC_URL environment variable is required")?;
        let relayer_private_key = env::var("RELAYER_PRIVATE_KEY")
            .context("RELAYER_PRIVATE_KEY environment variable is required")?;

        let subscription_manager_address_sepolia = Self::normalize_contract_address(
            &env::var("SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA")
                .context("SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA environment variable is required")?,
            "SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA",
        )?;
        let subscription_manager_address_base = Self::normalize_contract_address(
            &env::var("SUBSCRIPTION_MANAGER_ADDRESS_BASE")
                .context("SUBSCRIPTION_MANAGER_ADDRESS_BASE environment variable is required")?,
            "SUBSCRIPTION_MANAGER_ADDRESS_BASE",
        )?;

        let pyusd_address_sepolia_raw = env::var("PYUSD_SEPOLIA")
            .or_else(|_| env::var("PYUSD_ADDRESS_SEPOLIA"))
            .context("PYUSD_SEPOLIA environment variable is required")?;
        let pyusd_address_base_raw = env::var("PYUSD_BASE")
            .or_else(|_| env::var("PYUSD_ADDRESS_BASE"))
            .context("PYUSD_BASE environment variable is required")?;

        let pyusd_address_sepolia =
            Self::normalize_contract_address(&pyusd_address_sepolia_raw, "PYUSD_SEPOLIA")?;
        let pyusd_address_base =
            Self::normalize_contract_address(&pyusd_address_base_raw, "PYUSD_BASE")?;

        let supported_tokens_sepolia =
            Self::parse_supported_tokens_var("SUPPORTED_TOKENS_SEPOLIA")?;
        let supported_tokens_base = Self::parse_supported_tokens_var("SUPPORTED_TOKENS_BASE")?;

        let server_host = env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let server_port = env::var("SERVER_PORT")
            .unwrap_or_else(|_| "3000".to_string())
            .parse()
            .context("SERVER_PORT must be a valid port number")?;
        let execution_interval_seconds = env::var("EXECUTION_INTERVAL_SECONDS")
            .unwrap_or_else(|_| "30".to_string())
            .parse()
            .context("EXECUTION_INTERVAL_SECONDS must be a valid number")?;
        let max_executions_per_batch = env::var("MAX_EXECUTIONS_PER_BATCH")
            .unwrap_or_else(|_| "10".to_string())
            .parse()
            .context("MAX_EXECUTIONS_PER_BATCH must be a valid number")?;
        let max_gas_price_gwei = env::var("MAX_GAS_PRICE_GWEI")
            .unwrap_or_else(|_| "50".to_string())
            .parse()
            .context("MAX_GAS_PRICE_GWEI must be a valid number")?;
        let relayer_address = env::var("RELAYER_ADDRESS")
            .context("RELAYER_ADDRESS environment variable is required")?;
        let envio_graphql_endpoint = env::var("ENVIO_GRAPHQL_ENDPOINT").ok();
        let envio_explorer_url = env::var("ENVIO_EXPLORER_URL").ok();
        let avail_rpc_url = env::var("AVAIL_RPC_URL").ok();
        let avail_application_id = env::var("AVAIL_APPLICATION_ID")
            .ok()
            .map(|value| {
                value.parse::<u32>().map_err(|_| {
                    anyhow::anyhow!("AVAIL_APPLICATION_ID must be a valid unsigned 32-bit integer")
                })
            })
            .transpose()?;
        let hypersync_url_sepolia = env::var("HYPERSYNC_URL_SEPOLIA").ok();
        let hypersync_url_base = env::var("HYPERSYNC_URL_BASE").ok();
        let config = Config {
            database_url,
            ethereum_rpc_url,
            base_rpc_url,
            relayer_private_key,
            subscription_manager_address_sepolia,
            subscription_manager_address_base,
            pyusd_address_sepolia,
            pyusd_address_base,
            supported_tokens_sepolia,
            supported_tokens_base,
            server_host,
            server_port,
            execution_interval_seconds,
            max_executions_per_batch,
            max_gas_price_gwei,
            relayer_address,
            envio_graphql_endpoint,
            envio_explorer_url,
            avail_rpc_url,
            avail_application_id,
            hypersync_url_sepolia,
            hypersync_url_base,
        };

        // validate eth addresses
        config.validate()?;

        tokens::register_pyusd_addresses(&[
            config.pyusd_address_sepolia.clone(),
            config.pyusd_address_base.clone(),
        ]);

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
            (&self.pyusd_address_sepolia, "PYUSD_SEPOLIA"),
            (&self.pyusd_address_base, "PYUSD_BASE"),
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

        Self::validate_supported_tokens(
            "SUPPORTED_TOKENS_SEPOLIA",
            &self.supported_tokens_sepolia,
        )?;
        Self::validate_supported_tokens("SUPPORTED_TOKENS_BASE", &self.supported_tokens_base)?;

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

        if let Some(url) = &self.avail_rpc_url {
            if !url.starts_with("http") && url.to_lowercase() != "stub" {
                return Err(anyhow::anyhow!(
                    "AVAIL_RPC_URL must be a valid http(s) url or the literal 'stub'"
                ));
            }
        }

        let avail_rpc_specified = self
            .avail_rpc_url
            .as_ref()
            .map(|url| url.to_lowercase() != "stub" && !url.trim().is_empty())
            .unwrap_or(false);

        if avail_rpc_specified && self.avail_application_id.is_none() {
            return Err(anyhow::anyhow!(
                "AVAIL_APPLICATION_ID is required when AVAIL_RPC_URL is set"
            ));
        }

        let hypersync_sepolia_provided = self
            .hypersync_url_sepolia
            .as_ref()
            .map(|url| !url.trim().is_empty())
            .unwrap_or(false);
        let hypersync_base_provided = self
            .hypersync_url_base
            .as_ref()
            .map(|url| !url.trim().is_empty())
            .unwrap_or(false);

        if hypersync_sepolia_provided ^ hypersync_base_provided {
            return Err(anyhow::anyhow!(
                "both HYPERSYNC_URL_SEPOLIA and HYPERSYNC_URL_BASE must be provided together"
            ));
        }

        let envio_graphql_provided = self
            .envio_graphql_endpoint
            .as_ref()
            .map(|endpoint| !endpoint.trim().is_empty())
            .unwrap_or(false);
        let envio_explorer_provided = self
            .envio_explorer_url
            .as_ref()
            .map(|url| !url.trim().is_empty())
            .unwrap_or(false);

        if envio_graphql_provided ^ envio_explorer_provided {
            return Err(anyhow::anyhow!(
                "both ENVIO_GRAPHQL_ENDPOINT and ENVIO_EXPLORER_URL must be provided together"
            ));
        }

        Ok(())
    }

    fn normalize_contract_address(value: &str, var_name: &str) -> Result<String> {
        let trimmed = value.trim();
        if !trimmed.starts_with("0x") || trimmed.len() != 42 {
            return Err(anyhow::anyhow!(
                "{} must be a valid ethereum address (0x followed by 40 hex chars)",
                var_name
            ));
        }

        if !trimmed[2..].chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(anyhow::anyhow!(
                "{} contains invalid hex characters",
                var_name
            ));
        }

        Address::from_str(trimmed).map_err(|_| {
            anyhow::anyhow!("{} must be a valid checksummed ethereum address", var_name)
        })?;

        Ok(trimmed.to_ascii_lowercase())
    }

    fn parse_supported_tokens_var(key: &str) -> Result<Vec<String>> {
        let raw = env::var(key).context(format!("{} environment variable is required", key))?;
        Self::parse_supported_tokens(&raw, key)
    }

    fn parse_supported_tokens(value: &str, var_name: &str) -> Result<Vec<String>> {
        let mut tokens = Vec::new();
        let mut seen = HashSet::new();

        for token in value.split(',') {
            let trimmed = token.trim();
            if trimmed.is_empty() {
                return Err(anyhow::anyhow!(
                    "{} contains an empty token entry",
                    var_name
                ));
            }

            let canonical = tokens::normalize_token_address(trimmed);
            if tokens::is_eth(&canonical) {
                if seen.insert(canonical.clone()) {
                    tokens.push(canonical);
                }
                continue;
            }

            if !canonical.starts_with("0x") || canonical.len() != 42 {
                return Err(anyhow::anyhow!(
                    "{} entry '{}' must be 0x0 or a 20-byte address",
                    var_name,
                    trimmed
                ));
            }

            Address::from_str(&canonical).map_err(|_| {
                anyhow::anyhow!("{} entry '{}' is not a valid address", var_name, trimmed)
            })?;

            if seen.insert(canonical.clone()) {
                tokens.push(canonical);
            }
        }

        if tokens.is_empty() {
            return Err(anyhow::anyhow!(
                "{} must include at least one supported token",
                var_name
            ));
        }

        Ok(tokens)
    }

    fn validate_supported_tokens(var_name: &str, tokens: &[String]) -> Result<()> {
        if tokens.is_empty() {
            return Err(anyhow::anyhow!(
                "{} must contain at least one token",
                var_name
            ));
        }

        if !tokens.iter().any(|token| tokens::is_eth(token)) {
            return Err(anyhow::anyhow!(
                "{} must include the zero address (0x0) for ETH support",
                var_name
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

    pub fn supported_tokens_for_chain(&self, chain: &str) -> Result<&[String]> {
        match chain.to_lowercase().as_str() {
            "sepolia" => Ok(self.supported_tokens_sepolia.as_slice()),
            "base" => Ok(self.supported_tokens_base.as_slice()),
            _ => Err(anyhow::anyhow!("unsupported chain: {}", chain)),
        }
    }

    pub fn avail_enabled(&self) -> bool {
        let signing_key_present = env::var("AVAIL_SIGNING_KEY")
            .ok()
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false);

        self.avail_rpc_url
            .as_ref()
            .map(|url| url.to_lowercase() != "stub" && !url.trim().is_empty())
            .unwrap_or(false)
            && self.avail_application_id.is_some()
            && signing_key_present
    }

    pub fn envio_enabled(&self) -> bool {
        self.envio_graphql_endpoint
            .as_ref()
            .map(|endpoint| !endpoint.trim().is_empty())
            .unwrap_or(false)
            && self
                .envio_explorer_url
                .as_ref()
                .map(|url| !url.trim().is_empty())
                .unwrap_or(false)
    }

    pub fn hypersync_enabled(&self) -> bool {
        self.hypersync_url_sepolia
            .as_ref()
            .map(|url| {
                let trimmed = url.trim();
                !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("stub")
            })
            .unwrap_or(false)
            && self
                .hypersync_url_base
                .as_ref()
                .map(|url| {
                    let trimmed = url.trim();
                    !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("stub")
                })
                .unwrap_or(false)
    }

    pub fn hypersync_urls(&self) -> Option<(&str, &str)> {
        match (&self.hypersync_url_sepolia, &self.hypersync_url_base) {
            (Some(sepolia), Some(base))
                if {
                    let s = sepolia.trim();
                    let b = base.trim();
                    !s.is_empty()
                        && !b.is_empty()
                        && !s.eq_ignore_ascii_case("stub")
                        && !b.eq_ignore_ascii_case("stub")
                } =>
            {
                Some((sepolia.as_str(), base.as_str()))
            }
            _ => None,
        }
    }
}
