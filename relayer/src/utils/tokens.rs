use ethers::{types::U256, utils::format_units};
use once_cell::sync::Lazy;
use std::collections::HashSet;
use std::sync::RwLock;

const ZERO_ADDRESS: &str = "0x0000000000000000000000000000000000000000";

static PYUSD_ADDRESSES: Lazy<RwLock<HashSet<String>>> = Lazy::new(|| RwLock::new(HashSet::new()));

fn canonicalize(address: &str) -> String {
    if address.eq_ignore_ascii_case("0x0") {
        ZERO_ADDRESS.to_string()
    } else {
        address.trim().to_ascii_lowercase()
    }
}

fn is_pyusd(address: &str) -> bool {
    let normalized = canonicalize(address);
    let guard = PYUSD_ADDRESSES
        .read()
        .expect("pyusd address registry poisoned");
    guard.contains(&normalized)
}

pub fn register_pyusd_addresses(addresses: &[String]) {
    let mut guard = PYUSD_ADDRESSES
        .write()
        .expect("pyusd address registry poisoned");
    guard.clear();
    for address in addresses {
        let normalized = canonicalize(address);
        if normalized.len() == ZERO_ADDRESS.len() && normalized.starts_with("0x") {
            guard.insert(normalized);
        }
    }
}

pub fn is_eth(address: &str) -> bool {
    canonicalize(address) == ZERO_ADDRESS
}

pub fn get_token_symbol(address: &str) -> &'static str {
    if is_eth(address) {
        "ETH"
    } else if is_pyusd(address) {
        "PYUSD"
    } else {
        "UNKNOWN"
    }
}

pub fn normalize_token_address(address: &str) -> String {
    canonicalize(address)
}

pub fn format_token_amount(amount: U256, decimals: u8) -> String {
    format_units(amount, decimals as i32).unwrap_or_else(|_| amount.to_string())
}
