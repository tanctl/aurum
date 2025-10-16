#![allow(clippy::single_component_path_imports)]

use anyhow::Result;
use std::sync::Arc;
use tokio::signal;
use tracing::{error, info, Level};
use tracing_subscriber;

use relayer::api::ApiServer;
use relayer::{AppState, BlockchainClient, Config, Database, Scheduler};

#[tokio::main]
async fn main() -> Result<()> {
    // initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    info!("starting aurum relayer service");

    // load configuration
    let config = Config::from_env().map_err(|e| {
        error!("failed to load configuration: {}", e);
        e
    })?;

    info!("configuration loaded successfully");
    info!(
        "server will run on {}:{}",
        config.server_host, config.server_port
    );
    info!(
        "execution interval: {} seconds",
        config.execution_interval_seconds
    );
    info!(
        "max executions per batch: {}",
        config.max_executions_per_batch
    );
    if let Some(ref envio_url) = config.envio_hyperindex_url {
        info!("envio hyperindex url: {}", envio_url);
    }

    // initialize database
    let database = Database::new(&config.database_url).await.map_err(|e| {
        error!("failed to initialize database: {}", e);
        e
    })?;

    database.ping().await.map_err(|e| {
        error!("database connection test failed: {}", e);
        e
    })?;

    database.run_migrations().await.map_err(|e| {
        error!("database migration failed: {}", e);
        e
    })?;

    // initialize blockchain client
    let blockchain_client = BlockchainClient::new(&config).await.map_err(|e| {
        error!("failed to initialize blockchain client: {}", e);
        e
    })?;

    // create application state
    let app_state = Arc::new(AppState {
        config: config.clone(),
        database,
        blockchain_client,
    });

    info!("relayer service initialized successfully");

    // initialize scheduler
    let scheduler = Scheduler::new(
        Arc::new(app_state.database.queries().clone()),
        Arc::new(app_state.blockchain_client.clone()),
        app_state.database.pool().clone(),
    )
    .await
    .map_err(|e| {
        error!("failed to initialize scheduler: {}", e);
        e
    })?;

    // start scheduler in background
    let scheduler_handle = tokio::spawn(async move {
        info!("starting payment scheduler");
        if let Err(e) = scheduler.start().await {
            error!("scheduler error: {}", e);
        }
    });

    // initialize API server
    let api_router = ApiServer::create(app_state.clone()).await;

    // start API server in background
    let api_handle = {
        let config = config.clone();
        tokio::spawn(async move {
            info!("starting REST API server");
            if let Err(e) =
                ApiServer::serve(api_router, &config.server_host, config.server_port).await
            {
                error!("API server error: {}", e);
            }
        })
    };

    info!("aurum relayer service started successfully");
    info!(
        "- REST API server: http://{}:{}",
        config.server_host, config.server_port
    );
    info!(
        "- payment scheduler running every {} seconds",
        config.execution_interval_seconds
    );
    info!(
        "- health endpoint: http://{}:{}/health",
        config.server_host, config.server_port
    );

    // wait for shutdown signal
    tokio::select! {
        _ = signal::ctrl_c() => {
            info!("received shutdown signal, stopping services...");
        }
        result = scheduler_handle => {
            if let Err(e) = result {
                error!("scheduler task failed: {}", e);
            }
        }
        result = api_handle => {
            if let Err(e) = result {
                error!("API server task failed: {}", e);
            }
        }
    }

    // graceful shutdown
    info!("shutting down services gracefully...");
    // Note: scheduler handles shutdown when the main task ends

    info!("aurum relayer service stopped successfully");
    Ok(())
}
