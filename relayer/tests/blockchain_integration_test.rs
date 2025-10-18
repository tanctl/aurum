#![allow(clippy::single_component_path_imports)]

use relayer::{blockchain::BlockchainClient, config::Config};
use std::env;
use tokio;

fn setup_test_env() {
    env::set_var(
        "DATABASE_URL",
        "postgresql://relayer:dev_pass@localhost:5432/relayer_test",
    );
    env::set_var("ETHEREUM_RPC_URL", "http://127.0.0.1:8545");
    env::set_var("BASE_RPC_URL", "http://127.0.0.1:8546");
    env::set_var(
        "RELAYER_PRIVATE_KEY",
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    env::set_var(
        "RELAYER_ADDRESS",
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    );
    env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA",
        "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    );
    env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_BASE",
        "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    );
    env::set_var(
        "PYUSD_SEPOLIA",
        "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
    );
    env::set_var("PYUSD_BASE", "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9");
    env::set_var(
        "SUPPORTED_TOKENS_SEPOLIA",
        "0x0000000000000000000000000000000000000000,0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
    );
    env::set_var(
        "SUPPORTED_TOKENS_BASE",
        "0x0000000000000000000000000000000000000000,0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
    );
    env::set_var("AVAIL_RPC_URL", "stub");
    env::remove_var("AVAIL_APPLICATION_ID");
    env::remove_var("AVAIL_AUTH_TOKEN");
    env::remove_var("AVAIL_SECRET_URI");
}

#[tokio::test]
async fn test_blockchain_client_initialization() {
    setup_test_env();

    let config = Config::from_env().expect("should load config");

    let result = BlockchainClient::new(&config).await;

    match result {
        Ok(_client) => {
            println!("blockchain client initialized successfully");
        }
        Err(e) => {
            println!(
                "blockchain client initialization failed (expected without anvil): {}",
                e
            );
        }
    }
}

#[tokio::test]
async fn test_config_validation_for_blockchain() {
    setup_test_env();

    let config = Config::from_env().expect("should load config");

    assert!(config
        .subscription_manager_address_sepolia
        .starts_with("0x"));
    assert_eq!(config.subscription_manager_address_sepolia.len(), 42);

    assert!(config.subscription_manager_address_base.starts_with("0x"));
    assert_eq!(config.subscription_manager_address_base.len(), 42);

    assert!(config.pyusd_address_sepolia.starts_with("0x"));
    assert_eq!(config.pyusd_address_sepolia.len(), 42);

    assert!(config.pyusd_address_base.starts_with("0x"));
    assert_eq!(config.pyusd_address_base.len(), 42);

    assert_eq!(
        config
            .subscription_manager_address_for_chain("sepolia")
            .unwrap(),
        &config.subscription_manager_address_sepolia
    );
    assert_eq!(
        config
            .subscription_manager_address_for_chain("base")
            .unwrap(),
        &config.subscription_manager_address_base
    );

    assert_eq!(
        config.pyusd_address_for_chain("sepolia").unwrap(),
        &config.pyusd_address_sepolia
    );
    assert_eq!(
        config.pyusd_address_for_chain("base").unwrap(),
        &config.pyusd_address_base
    );

    assert!(config
        .subscription_manager_address_for_chain("invalid")
        .is_err());
    assert!(config.pyusd_address_for_chain("invalid").is_err());
}

#[tokio::test]
#[ignore]
async fn test_blockchain_operations_with_anvil() {
    setup_test_env();

    let config = Config::from_env().expect("should load config");
    let client = BlockchainClient::new(&config)
        .await
        .expect("should connect to anvil");

    let sepolia_result = client.validate_connection("sepolia").await;
    assert!(sepolia_result.is_ok(), "should connect to sepolia anvil");

    let base_result = client.validate_connection("base").await;
    assert!(base_result.is_ok(), "should connect to base anvil");

    let sepolia_block = client
        .get_current_block_number("sepolia")
        .await
        .expect("should get sepolia block");
    assert!(sepolia_block > 0, "should have blocks on sepolia");

    let base_block = client
        .get_current_block_number("base")
        .await
        .expect("should get base block");
    assert!(base_block > 0, "should have blocks on base");

    println!(
        "sepolia block: {}, base block: {}",
        sepolia_block, base_block
    );
}

#[tokio::test]
async fn test_invalid_chain_handling() {
    setup_test_env();

    let config = Config::from_env().expect("should load config");

    match BlockchainClient::new(&config).await {
        Ok(client) => {
            let result = client.validate_connection("invalid_chain").await;
            assert!(result.is_err(), "should reject invalid chain name");

            let result = client.get_current_block_number("invalid_chain").await;
            assert!(result.is_err(), "should reject invalid chain name");
        }
        Err(_) => {
            println!("anvil not running, skipping chain validation test");
        }
    }
}

#[tokio::test]
async fn test_blockchain_error_handling() {
    setup_test_env();

    env::set_var("ETHEREUM_RPC_URL", "http://invalid-url:9999");

    let config = Config::from_env().expect("should load config");
    let result = BlockchainClient::new(&config).await;

    assert!(result.is_err(), "should fail with invalid rpc url");

    env::set_var("ETHEREUM_RPC_URL", "http://127.0.0.1:8545");
    env::set_var("RELAYER_PRIVATE_KEY", "invalid_private_key");

    let config_result = Config::from_env();
    assert!(
        config_result.is_err(),
        "should fail with invalid private key"
    );
}
