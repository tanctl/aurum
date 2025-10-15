pub mod envio;
pub mod handlers;
pub mod routes;
pub mod types;
pub mod validation;

use axum::{
    middleware,
    response::Response,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tracing::info;

use crate::{AppState, RelayerError};
use handlers::*;

pub struct ApiServer;

impl ApiServer {
    pub async fn create(app_state: Arc<AppState>) -> Router {
        info!("initializing REST API server");

        let api_router = Router::new()
            .route("/api/v1/intent", post(submit_intent_handler))
            .route("/api/v1/subscription/:id", get(get_subscription_handler))
            .route(
                "/api/v1/merchant/:address/transactions",
                get(get_merchant_transactions_handler),
            )
            .route(
                "/api/v1/merchant/:address/stats",
                get(get_merchant_stats_handler),
            )
            .route("/health", get(health_check_handler))
            .route("/status", get(health_check_handler)) // alias for health
            .with_state(app_state)
            .layer(middleware::from_fn(request_logging_middleware));

        info!("REST API server initialized successfully");
        api_router
    }

    pub async fn serve(router: Router, host: &str, port: u16) -> Result<(), RelayerError> {
        let addr = format!("{}:{}", host, port);
        info!("starting API server on {}", addr);

        let listener = tokio::net::TcpListener::bind(&addr).await.map_err(|e| {
            RelayerError::InternalError(format!("failed to bind API server to {}: {}", addr, e))
        })?;

        info!("API server listening on {}", addr);

        axum::serve(listener, router)
            .await
            .map_err(|e| RelayerError::InternalError(format!("API server error: {}", e)))?;

        Ok(())
    }
}

// request logging middleware
async fn request_logging_middleware(
    req: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start_time = std::time::Instant::now();

    let response = next.run(req).await;
    let status = response.status();
    let duration = start_time.elapsed();

    info!(
        "API request: {} {} - {} ({:?})",
        method,
        uri,
        status.as_u16(),
        duration
    );

    response
}

// api-specific error handling is handled by the existing implementation in error.rs
