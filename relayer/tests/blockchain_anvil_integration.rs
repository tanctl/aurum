use std::net::TcpListener;
use std::path::PathBuf;
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;

use ethers::abi::Abi;
use ethers::contract::ContractFactory;
use ethers::prelude::*;
use ethers::types::Bytes;
use ethers::utils::Anvil;
use relayer::config::Config;
use relayer::BlockchainClient;
use serde_json::Value;

fn artifact_path(contract: &str) -> PathBuf {
    let mut segments: Vec<&str> = contract.split('/').collect();
    let file_stem = segments
        .pop()
        .expect("contract identifier must include at least a file name");

    let mut path = PathBuf::from("../artifacts/contracts");
    for segment in segments {
        if !segment.is_empty() {
            path.push(segment);
        }
    }

    path.push(format!("{file_stem}.sol"));
    path.push(format!("{file_stem}.json"));
    path
}

fn load_artifact(contract: &str) -> (Abi, Bytes) {
    let path = artifact_path(contract);
    let data = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("failed to read {:?}: {}", path, e));
    let json: Value = serde_json::from_str(&data).expect("valid artifact json");
    let abi: Abi = serde_json::from_value(json["abi"].clone()).expect("abi");
    let bytecode_str = json["bytecode"]["object"]
        .as_str()
        .or_else(|| json["bytecode"].as_str())
        .expect("bytecode");
    let bytecode =
        Bytes::from(hex::decode(bytecode_str.trim_start_matches("0x")).expect("bytecode hex"));
    (abi, bytecode)
}

fn hex_private_key(wallet: &LocalWallet) -> String {
    let key_bytes: [u8; 32] = wallet.signer().to_bytes().into();
    format!("0x{}", hex::encode(key_bytes))
}

#[tokio::test]
async fn test_blockchain_client_with_anvil() {
    if which::which("anvil").is_err() {
        eprintln!("skipping anvil integration test because anvil binary is missing");
        return;
    }
    if TcpListener::bind("127.0.0.1:0").is_err() {
        eprintln!("skipping anvil integration test because local port binding is not permitted");
        return;
    }

    Command::new("npx")
        .current_dir("..")
        .args(["hardhat", "compile"])
        .status()
        .expect("failed to compile contracts");

    let anvil_sepolia = Anvil::new().chain_id(11155111u64).spawn();
    let anvil_base = Anvil::new().chain_id(8453u64).spawn();

    let provider_sepolia = Provider::<Http>::try_from(anvil_sepolia.endpoint())
        .unwrap()
        .interval(Duration::from_millis(10));
    let provider_base = Provider::<Http>::try_from(anvil_base.endpoint())
        .unwrap()
        .interval(Duration::from_millis(10));

    let wallet_key = anvil_sepolia.keys()[0].clone();
    let base_wallet: LocalWallet = LocalWallet::from(wallet_key);
    let wallet_sepolia = base_wallet.clone().with_chain_id(11155111u64);
    let wallet_base = base_wallet.with_chain_id(8453u64);

    let client_sepolia = SignerMiddleware::new(provider_sepolia, wallet_sepolia.clone());
    let client_base = SignerMiddleware::new(provider_base, wallet_base.clone());
    let client_sepolia = Arc::new(client_sepolia);
    let client_base = Arc::new(client_base);

    let (test_pyusd_abi, test_pyusd_bytecode) = load_artifact("test/TestPYUSD");
    let (registry_abi, registry_bytecode) = load_artifact("RelayerRegistry");
    let (manager_abi, manager_bytecode) = load_artifact("SubscriptionManager");

    let test_pyusd_factory = ContractFactory::new(
        test_pyusd_abi.clone(),
        test_pyusd_bytecode.clone(),
        client_sepolia.clone(),
    );
    let test_pyusd_sepolia = test_pyusd_factory.deploy(()).unwrap().send().await.unwrap();

    let registry_factory = ContractFactory::new(
        registry_abi.clone(),
        registry_bytecode.clone(),
        client_sepolia.clone(),
    );
    let relayer_registry_sepolia = registry_factory
        .deploy(test_pyusd_sepolia.address())
        .unwrap()
        .send()
        .await
        .unwrap();

    let manager_factory = ContractFactory::new(
        manager_abi.clone(),
        manager_bytecode.clone(),
        client_sepolia.clone(),
    );
    let subscription_manager_sepolia = manager_factory
        .deploy((
            vec![test_pyusd_sepolia.address()],
            relayer_registry_sepolia.address(),
        ))
        .unwrap()
        .send()
        .await
        .unwrap();

    let registry_contract = Contract::new(
        relayer_registry_sepolia.address(),
        registry_abi.clone(),
        client_sepolia.clone(),
    );
    registry_contract
        .method::<_, ()>(
            "setSubscriptionManager",
            subscription_manager_sepolia.address(),
        )
        .unwrap()
        .send()
        .await
        .unwrap()
        .await
        .unwrap();

    // deploy to base anvil
    let test_pyusd_factory_base = ContractFactory::new(
        test_pyusd_abi.clone(),
        test_pyusd_bytecode.clone(),
        client_base.clone(),
    );
    let test_pyusd_base = test_pyusd_factory_base
        .deploy(())
        .unwrap()
        .send()
        .await
        .unwrap();
    let registry_factory_base = ContractFactory::new(
        registry_abi.clone(),
        registry_bytecode.clone(),
        client_base.clone(),
    );
    let relayer_registry_base = registry_factory_base
        .deploy(test_pyusd_base.address())
        .unwrap()
        .send()
        .await
        .unwrap();
    let manager_factory_base = ContractFactory::new(
        manager_abi.clone(),
        manager_bytecode.clone(),
        client_base.clone(),
    );
    let subscription_manager_base = manager_factory_base
        .deploy((
            vec![test_pyusd_base.address()],
            relayer_registry_base.address(),
        ))
        .unwrap()
        .send()
        .await
        .unwrap();
    let registry_contract_base = Contract::new(
        relayer_registry_base.address(),
        registry_abi.clone(),
        client_base.clone(),
    );
    registry_contract_base
        .method::<_, ()>(
            "setSubscriptionManager",
            subscription_manager_base.address(),
        )
        .unwrap()
        .send()
        .await
        .unwrap()
        .await
        .unwrap();

    // mint tokens on sepolia to relayer wallet for balance check
    let pyusd_contract = Contract::new(
        test_pyusd_sepolia.address(),
        test_pyusd_abi.clone(),
        client_sepolia.clone(),
    );
    pyusd_contract
        .method::<_, ()>("mint", (wallet_sepolia.address(), U256::from(1_000_000u64)))
        .unwrap()
        .send()
        .await
        .unwrap()
        .await
        .unwrap();

    std::env::set_var(
        "DATABASE_URL",
        "postgresql://relayer:dev_pass@localhost:5432/placeholder",
    );
    std::env::set_var("ETHEREUM_RPC_URL", anvil_sepolia.endpoint());
    std::env::set_var("BASE_RPC_URL", anvil_base.endpoint());
    std::env::set_var("RELAYER_PRIVATE_KEY", hex_private_key(&wallet_sepolia));
    std::env::set_var(
        "RELAYER_ADDRESS",
        format!("{:#x}", wallet_sepolia.address()),
    );
    std::env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_SEPOLIA",
        format!("{:#x}", subscription_manager_sepolia.address()),
    );
    std::env::set_var(
        "SUBSCRIPTION_MANAGER_ADDRESS_BASE",
        format!("{:#x}", subscription_manager_base.address()),
    );
    let pyusd_sepolia = format!("{:#x}", test_pyusd_sepolia.address()).to_lowercase();
    let pyusd_base = format!("{:#x}", test_pyusd_base.address()).to_lowercase();
    std::env::set_var("PYUSD_SEPOLIA", &pyusd_sepolia);
    std::env::set_var("PYUSD_BASE", &pyusd_base);
    std::env::set_var(
        "SUPPORTED_TOKENS_SEPOLIA",
        format!(
            "0x0000000000000000000000000000000000000000,{}",
            pyusd_sepolia
        ),
    );
    std::env::set_var(
        "SUPPORTED_TOKENS_BASE",
        format!("0x0000000000000000000000000000000000000000,{}", pyusd_base),
    );
    std::env::set_var("AVAIL_RPC_URL", "stub");
    std::env::remove_var("AVAIL_APPLICATION_ID");
    std::env::remove_var("ENVIO_GRAPHQL_ENDPOINT");
    std::env::remove_var("ENVIO_EXPLORER_URL");

    let config = Config::from_env().expect("config loads");
    let client = BlockchainClient::new(&config)
        .await
        .expect("blockchain client");

    client
        .validate_connection("sepolia")
        .await
        .expect("sepolia connection");
    client
        .validate_connection("base")
        .await
        .expect("base connection");

    let balance = client
        .check_balance(wallet_sepolia.address(), Address::zero(), "sepolia")
        .await
        .expect("balance check");
    assert!(balance > U256::zero());

    let sepolia_chain_id = client.chain_id("sepolia").expect("chain id");
    assert_eq!(sepolia_chain_id, 11155111u64);

    drop(client);
    drop(anvil_sepolia);
    drop(anvil_base);
}
