pub mod config;
pub mod database;
pub mod error;

use anyhow::Result;
use config::Config;
use database::Database;
use std::sync::Arc;
use tracing::{info, error, Level};
use tracing_subscriber;

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub database: Database,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    info!("starting aurum relayer service");

    let config = Config::from_env().map_err(|e| {
        error!("failed to load configuration: {}", e);
        e
    })?;

    info!("configuration loaded successfully");
    info!("server will run on {}:{}", config.server_host, config.server_port);
    info!("execution interval: {} seconds", config.execution_interval_seconds);
    info!("max executions per batch: {}", config.max_executions_per_batch);

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

    let app_state = Arc::new(AppState {
        config: config.clone(),
        database,
    });

    info!("relayer service initialized successfully");

    let app = axum::Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/status", axum::routing::get(status_check))
        .with_state(app_state.clone());

    let addr = format!("{}:{}", config.server_host, config.server_port);
    let listener = tokio::net::TcpListener::bind(&addr).await.map_err(|e| {
        error!("failed to bind to {}: {}", addr, e);
        anyhow::anyhow!("failed to bind to {}: {}", addr, e)
    })?;

    info!("server listening on {}", addr);

    if let Err(e) = axum::serve(listener, app).await {
        error!("server error: {}", e);
        return Err(anyhow::anyhow!("server error: {}", e));
    }

    Ok(())
}

async fn health_check(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> impl axum::response::IntoResponse {
    match state.database.ping().await {
        Ok(_) => {
            info!("health check passed");
            axum::Json(serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now(),
                "database": "connected"
            }))
        }
        Err(e) => {
            error!("health check failed: {}", e);
            axum::Json(serde_json::json!({
                "status": "unhealthy",
                "timestamp": chrono::Utc::now(),
                "database": "disconnected",
                "error": e.to_string()
            }))
        }
    }
}

async fn status_check(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> impl axum::response::IntoResponse {
    info!("status check requested");
    
    axum::Json(serde_json::json!({
        "service": "aurum-relayer",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now(),
        "config": {
            "execution_interval_seconds": state.config.execution_interval_seconds,
            "max_executions_per_batch": state.config.max_executions_per_batch,
            "max_gas_price_gwei": state.config.max_gas_price_gwei,
            "relayer_address": state.config.relayer_address,
            "server_host": state.config.server_host,
            "server_port": state.config.server_port
        }
    }))
}