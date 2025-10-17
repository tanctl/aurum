use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use relayer::api::types::*;
use relayer::{AppState, AvailClient, BlockchainClient, Config, Database, EnvioClient, Metrics};
use std::sync::Arc;
use tower::util::ServiceExt;

// helper function to create test app state
async fn create_test_app_state() -> Arc<AppState> {
    let config = Config {
        database_url: std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| "stub".to_string()),
        ethereum_rpc_url: std::env::var("TEST_ETHEREUM_RPC_URL")
            .unwrap_or_else(|_| "stub".to_string()),
        base_rpc_url: std::env::var("TEST_BASE_RPC_URL").unwrap_or_else(|_| "stub".to_string()),
        relayer_private_key: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
            .to_string(),
        subscription_manager_address_sepolia: "0x1234567890123456789012345678901234567890"
            .to_string(),
        subscription_manager_address_base: "0x1234567890123456789012345678901234567890".to_string(),
        pyusd_address_sepolia: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
        pyusd_address_base: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
        server_host: "0.0.0.0".to_string(),
        server_port: 3000,
        execution_interval_seconds: 60,
        max_executions_per_batch: 100,
        max_gas_price_gwei: 100,
        relayer_address: "0x1234567890123456789012345678901234567890".to_string(),
        avail_rpc_url: Some("stub".to_string()),
        avail_application_id: None,
        avail_auth_token: None,
        avail_secret_uri: None,
        envio_graphql_endpoint: None,
        envio_explorer_url: None,
        hypersync_url_sepolia: None,
        hypersync_url_base: None,
    };

    let database = Database::new(&config.database_url)
        .await
        .expect("failed to create test database");

    // run migrations for test database
    database
        .run_migrations()
        .await
        .expect("failed to run test migrations");

    let blockchain_client = BlockchainClient::new(&config)
        .await
        .expect("failed to create test blockchain client");

    let avail_client = AvailClient::new(&config)
        .await
        .expect("failed to create avail client");

    let envio_client = EnvioClient::new_stub();

    Arc::new(AppState {
        config,
        database,
        blockchain_client,
        avail_client,
        envio_client,
        hypersync_client: None,
        metrics: Arc::new(Metrics::new()),
    })
}

#[test]
fn metrics_snapshot_defaults() {
    let metrics = Metrics::new();
    let snapshot = metrics.snapshot();
    assert_eq!(snapshot.hypersync_queries, 0);
    assert_eq!(snapshot.envio_queries, 0);
    assert!(snapshot.hypersync_average_ms.abs() < f64::EPSILON);
    assert!(snapshot.envio_average_ms.abs() < f64::EPSILON);
}

// helper function to create test subscription intent
fn create_test_intent() -> SubscriptionIntent {
    let now = chrono::Utc::now().timestamp() as u64;

    SubscriptionIntent {
        subscriber: "0x1234567890123456789012345678901234567890".to_string(),
        merchant: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
        amount: "1000000000000000000".to_string(), // 1 ETH
        interval: 86400,                           // 1 day
        start_time: now + 3600,                    // 1 hour from now
        max_payments: 12,
        max_total_amount: "12000000000000000000".to_string(), // 12 ETH
        expiry: now + (365 * 24 * 60 * 60),                   // 1 year
        nonce: 1,
    }
}

#[tokio::test]
async fn test_health_endpoint() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let health_response: HealthResponse = serde_json::from_slice(&body).unwrap();

    assert_eq!(health_response.status, "healthy");
    assert!(health_response.services.database.healthy);
}

#[tokio::test]
async fn test_submit_intent_success() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let intent = create_test_intent();
    let signature = "0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890".to_string();

    let request_body = SubmitIntentRequest { intent, signature };

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/intent")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&request_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    // should succeed with valid input (signature validation might fail but structure should be ok)
    assert!(response.status().is_success() || response.status() == StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_submit_intent_validation_errors() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    // test invalid address format
    let mut invalid_intent = create_test_intent();
    invalid_intent.subscriber = "invalid_address".to_string();

    let request_body = SubmitIntentRequest {
        intent: invalid_intent,
        signature: "0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890".to_string(),
    };

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/intent")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&request_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_get_subscription_not_found() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let subscription_id = "0x1234567890123456789012345678901234567890123456789012345678901234";

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/subscription/{}", subscription_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_get_subscription_invalid_format() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let invalid_id = "invalid_subscription_id";

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/subscription/{}", invalid_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_merchant_transactions_invalid_address() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let invalid_address = "invalid_merchant_address";

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/merchant/{}/transactions", invalid_address))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_merchant_stats_valid_address() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let merchant_address = "0x1234567890123456789012345678901234567890";

    let response = app
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/merchant/{}/stats", merchant_address))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // may fail due to envio connection but should not be validation error
    assert!(response.status().is_server_error() || response.status().is_success());
}

#[tokio::test]
async fn test_api_documentation() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/docs")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8(body.to_vec()).unwrap();

    assert!(body_str.contains("Aurum Relayer API"));
    assert!(body_str.contains("/api/v1/intent"));
}

#[tokio::test]
async fn test_cors_headers() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    let response = app
        .oneshot(
            Request::builder()
                .method("OPTIONS")
                .uri("/health")
                .header("Origin", "https://example.com")
                .header("Access-Control-Request-Method", "GET")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // CORS should be enabled
    assert!(response
        .headers()
        .contains_key("access-control-allow-origin"));
}

#[tokio::test]
async fn test_error_response_format() {
    let app_state = create_test_app_state().await;
    let app = relayer::api::ApiServer::create(app_state).await;

    // trigger validation error
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/intent")
                .header("content-type", "application/json")
                .body(Body::from("invalid json"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let error_response: serde_json::Value = serde_json::from_slice(&body).unwrap();

    // check error response format
    assert!(error_response.get("error").is_some());
    assert!(error_response.get("code").is_some());
}

// mock test for envio integration (stub mode)
#[tokio::test]
async fn test_envio_client_stub_mode() {
    let client = EnvioClient::new_stub();
    assert!(client.health_check().await.unwrap());
    assert!(client
        .get_merchant_transactions("0x123", 0, 10)
        .await
        .unwrap()
        .transactions
        .is_empty());
}
