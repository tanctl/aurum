use relayer::{AvailClient, BlockchainClient, Config, Database, Scheduler};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    println!("initializing secure payment scheduler with enhanced security features...");

    let config = Config::from_env()?;

    let database = Database::new(&config.database_url).await?;
    let queries = Arc::new(database.queries());
    let pool = database.pool().clone(); // get pool for distributed locking

    let blockchain_client = Arc::new(BlockchainClient::new(&config).await?);
    let avail_client = Arc::new(AvailClient::new(&config).await?);

    let mut scheduler = Scheduler::new(queries, blockchain_client, avail_client, pool).await?;

    println!("starting payment scheduler...");
    scheduler.start().await?;

    println!("scheduler is running. press ctrl+c to stop.");

    tokio::signal::ctrl_c().await?;

    println!("stopping scheduler...");
    scheduler.stop().await?;

    println!("scheduler stopped gracefully");

    Ok(())
}
