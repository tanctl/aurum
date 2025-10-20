use relayer::config::Config;
use std::env;

#[tokio::test]
async fn test_config_loading() {
    env::set_var(
        "DATABASE_URL",
        "postgresql://relayer:dev_pass@localhost:5432/relayer_test",
    );
    env::set_var(
        "ETHEREUM_RPC_URL",
        "https://sepolia.infura.io/v3/abc123def456",
    );
    env::set_var(
        "BASE_RPC_URL",
        "https://base-sepolia.g.alchemy.com/v2/xyz789",
    );
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
        "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    );
    env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_BASE",
        "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    );
    env::set_var(
        "PYUSD_SEPOLIA",
        "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    );
    env::set_var("PYUSD_BASE", "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65");
    env::set_var(
        "SUPPORTED_TOKENS_SEPOLIA",
        "0x0000000000000000000000000000000000000000,0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    );
    env::set_var(
        "SUPPORTED_TOKENS_BASE",
        "0x0000000000000000000000000000000000000000,0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
    );
    env::set_var("AVAIL_RPC_URL", "stub");
    env::remove_var("AVAIL_APPLICATION_ID");
    env::remove_var("AVAIL_AUTH_TOKEN");
    env::remove_var("AVAIL_SECRET_URI");

    let config = Config::from_env().expect("should load config from environment");

    assert_eq!(
        config.database_url,
        "postgresql://relayer:dev_pass@localhost:5432/relayer_test"
    );
    assert_eq!(
        config.ethereum_rpc_url,
        "https://sepolia.infura.io/v3/abc123def456"
    );
    assert_eq!(
        config.base_rpc_url,
        "https://base-sepolia.g.alchemy.com/v2/xyz789"
    );
    assert_eq!(
        config.relayer_address,
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
    );
    assert_eq!(config.server_port, 3000);
    assert_eq!(config.execution_interval_seconds, 30);
}

#[test]
fn test_config_validation() {
    env::set_var(
        "DATABASE_URL",
        "postgresql://relayer:dev_pass@localhost:5432/relayer_test",
    );
    env::set_var(
        "ETHEREUM_RPC_URL",
        "https://sepolia.infura.io/v3/abc123def456",
    );
    env::set_var(
        "BASE_RPC_URL",
        "https://base-sepolia.g.alchemy.com/v2/xyz789",
    );
    env::set_var(
        "RELAYER_PRIVATE_KEY",
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    );
    env::set_var("RELAYER_ADDRESS", "not_a_valid_ethereum_address");
    env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA",
        "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    );
    env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_BASE",
        "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    );
    env::set_var(
        "PYUSD_SEPOLIA",
        "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    );
    env::set_var("PYUSD_BASE", "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65");
    env::set_var(
        "SUPPORTED_TOKENS_SEPOLIA",
        "0x0000000000000000000000000000000000000000,0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    );
    env::set_var(
        "SUPPORTED_TOKENS_BASE",
        "0x0000000000000000000000000000000000000000,0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
    );
    env::set_var("AVAIL_RPC_URL", "stub");
    env::remove_var("AVAIL_APPLICATION_ID");
    env::remove_var("AVAIL_AUTH_TOKEN");
    env::remove_var("AVAIL_SECRET_URI");

    let result = Config::from_env();
    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("valid ethereum address"));
}
