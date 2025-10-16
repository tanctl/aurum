pub mod envio;
pub mod handlers;
pub mod routes;
pub mod types;
pub mod validation;

use axum::{
    body::Body,
    http::{header, HeaderValue, Method, Request, StatusCode},
    middleware,
    response::Response,
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tracing::info;

use crate::{AppState, RelayerError};

pub struct ApiServer;

impl ApiServer {
    pub async fn create(app_state: Arc<AppState>) -> Router {
        info!("initializing REST API server");

        let api_router = routes::create_api_routes(app_state)
            .layer(middleware::from_fn(logging_and_cors_middleware));

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

        axum::serve(
            listener,
            router.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await
        .map_err(|e| RelayerError::InternalError(format!("API server error: {}", e)))?;

        Ok(())
    }
}

fn apply_cors_headers(response: &mut Response) {
    let headers = response.headers_mut();
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_ORIGIN,
        HeaderValue::from_static("*"),
    );
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_METHODS,
        HeaderValue::from_static("GET,POST,OPTIONS"),
    );
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_HEADERS,
        HeaderValue::from_static("*"),
    );
    headers.insert(
        header::ACCESS_CONTROL_MAX_AGE,
        HeaderValue::from_static("600"),
    );
}

async fn logging_and_cors_middleware(req: Request<Body>, next: middleware::Next) -> Response {
    if req.method() == Method::OPTIONS {
        let mut response = Response::builder()
            .status(StatusCode::NO_CONTENT)
            .body(Body::empty())
            .unwrap();
        apply_cors_headers(&mut response);
        response
    } else {
        let method = req.method().clone();
        let uri = req.uri().clone();
        let start = std::time::Instant::now();

        let mut response = next.run(req).await;
        apply_cors_headers(&mut response);

        info!(
            method = %method,
            uri = %uri,
            status = response.status().as_u16(),
            latency_ms = start.elapsed().as_millis(),
            "api request"
        );

        response
    }
}
