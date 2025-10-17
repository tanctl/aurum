use relayer::{
    AvailClient, BlockchainClient, Config, Database, HyperSyncClient, Metrics, NexusClient,
    Scheduler, SchedulerContext,
};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    println!("initializing secure payment scheduler with enhanced security features...");

    let config = Config::from_env()?;

    let database = Database::new(&config.database_url).await?;
    let queries = Arc::new(database.queries());
    let pool = database.expect_pool().clone(); // get pool for distributed locking

    let blockchain_client = Arc::new(BlockchainClient::new(&config).await?);
    let avail_client = Arc::new(AvailClient::new(&config).await?);
    let metrics = Arc::new(Metrics::new());

    let hypersync_client = if let Some((sepolia_url, base_url)) = config.hypersync_urls() {
        match HyperSyncClient::new(sepolia_url.to_string(), base_url.to_string()) {
            Ok(client) => Some(Arc::new(client)),
            Err(err) => {
                eprintln!("failed to initialise HyperSync client: {err}");
                None
            }
        }
    } else {
        None
    };

    let nexus_client = if let Some((rpc_url, signer_key, app_id)) = config.nexus_settings() {
        match NexusClient::new(&rpc_url, &signer_key, &app_id).await {
            Ok(client) => Some(Arc::new(client)),
            Err(err) => {
                eprintln!("failed to initialise Nexus client: {err}");
                None
            }
        }
    } else {
        None
    };

    let scheduler_context = SchedulerContext {
        queries: Arc::clone(&queries),
        blockchain_client: Arc::clone(&blockchain_client),
        avail_client: Arc::clone(&avail_client),
        hypersync_client,
        nexus_client,
        metrics,
        config: config.clone(),
        pool: pool.clone(),
    };

    let mut scheduler = Scheduler::new(scheduler_context).await?;

    println!("starting payment scheduler...");
    scheduler.start().await?;

    println!("scheduler is running. press ctrl+c to stop.");

    tokio::signal::ctrl_c().await?;

    println!("stopping scheduler...");
    scheduler.stop().await?;

    println!("scheduler stopped gracefully");

    Ok(())
}
