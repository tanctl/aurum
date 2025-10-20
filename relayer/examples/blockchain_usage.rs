use relayer::{BlockchainClient, Config};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let config = Config::from_env()?;

    let client = BlockchainClient::new(&config).await?;

    println!("validating chain connections...");
    client.validate_connection("sepolia").await?;
    client.validate_connection("base").await?;
    println!("✓ connected to both chains");

    let sepolia_block = client.get_current_block_number("sepolia").await?;
    let base_block = client.get_current_block_number("base").await?;
    println!(
        "current blocks - sepolia: {}, base: {}",
        sepolia_block, base_block
    );

    let subscription_id = [1u8; 32];

    match client.get_subscription(subscription_id, "sepolia").await? {
        Some(subscription) => {
            println!("found subscription:");
            println!("  subscriber: {:?}", subscription.subscriber);
            println!("  merchant: {:?}", subscription.merchant);
            println!("  amount: {}", subscription.amount);
            println!("  status: {}", subscription.status);

            let balance = client
                .check_balance(subscription.subscriber, subscription.token, "sepolia")
                .await?;
            println!("  subscriber balance: {}", balance);

            let has_allowance = client
                .check_allowance(
                    subscription.subscriber,
                    subscription.token,
                    subscription.amount,
                    "sepolia",
                )
                .await?;
            println!("  sufficient allowance: {}", has_allowance);

            if has_allowance && balance >= subscription.amount {
                println!("  ✓ subscription ready for execution");
            } else {
                println!("  ✗ subscription not ready (insufficient balance or allowance)");
            }
        }
        None => {
            println!("subscription not found on sepolia");
        }
    }

    Ok(())
}
