use super::handlers::*;
use crate::AppState;
use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;

pub fn create_api_routes(app_state: Arc<AppState>) -> Router {
    Router::new()
        // api v1 routes
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
        // health and status routes
        .route("/health", get(health_check_handler))
        .route("/status", get(status_check_handler))
        // docs routes (optional)
        .route("/api/v1/docs", get(api_documentation_handler))
        .with_state(app_state)
}

// handler for api docs
pub async fn api_documentation_handler() -> axum::response::Html<&'static str> {
    axum::response::Html(
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <title>Aurum Relayer API Documentation</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .endpoint { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
                .method { color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; }
                .post { background-color: #49cc90; }
                .get { background-color: #61affe; }
                code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
                .example { background-color: #f8f8f8; padding: 10px; border-radius: 3px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>Aurum Relayer API v1</h1>
            
            <div class="endpoint">
                <h3><span class="method post">POST</span> /api/v1/intent</h3>
                <p>Submit a subscription intent for processing</p>
                <div class="example">
                    <strong>Request:</strong><br>
                    <code>
                    {<br>
                    &nbsp;&nbsp;"intent": {<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"subscriber": "0x...",<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"merchant": "0x...",<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"amount": "1000000000000000000",<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"interval": 86400,<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"startTime": 1698123456,<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"maxPayments": 12,<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"maxTotalAmount": "12000000000000000000",<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"expiry": 1729659456,<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"nonce": 1<br>
                    &nbsp;&nbsp;},<br>
                    &nbsp;&nbsp;"signature": "0x..."<br>
                    }
                    </code>
                </div>
            </div>
            
            <div class="endpoint">
                <h3><span class="method get">GET</span> /api/v1/subscription/:id</h3>
                <p>Get subscription details by ID</p>
                <div class="example">
                    <strong>Example:</strong> <code>GET /api/v1/subscription/0x123...</code>
                </div>
            </div>
            
            <div class="endpoint">
                <h3><span class="method get">GET</span> /api/v1/merchant/:address/transactions</h3>
                <p>Get transaction history for a merchant</p>
                <div class="example">
                    <strong>Query Parameters:</strong><br>
                    <code>?page=0&size=50</code>
                </div>
            </div>
            
            <div class="endpoint">
                <h3><span class="method get">GET</span> /api/v1/merchant/:address/stats</h3>
                <p>Get aggregated statistics for a merchant</p>
                <div class="example">
                    <strong>Example:</strong> <code>GET /api/v1/merchant/0x123.../stats</code>
                </div>
            </div>
            
            <div class="endpoint">
                <h3><span class="method get">GET</span> /health</h3>
                <p>Health check endpoint</p>
                <div class="example">
                    <strong>Response:</strong><br>
                    <code>
                    {<br>
                    &nbsp;&nbsp;"status": "healthy",<br>
                    &nbsp;&nbsp;"services": {<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"database": {"healthy": true},<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"rpc": {"healthy": true},<br>
                    &nbsp;&nbsp;&nbsp;&nbsp;"envio": {"healthy": true}<br>
                    &nbsp;&nbsp;}<br>
                    }
                    </code>
                </div>
            </div>
            
            <h2>Error Responses</h2>
            <p>All endpoints return errors in the format:</p>
            <div class="example">
                <code>
                {<br>
                &nbsp;&nbsp;"error": "error message",<br>
                &nbsp;&nbsp;"code": "ERROR_CODE"<br>
                }
                </code>
            </div>
            
            <h2>Data Verification</h2>
            <p>All merchant transaction and statistics data is sourced from the Envio HyperIndex. 
            Each response includes an <code>envioExplorerUrl</code> field linking to the Envio Explorer 
            for independent data verification.</p>
        </body>
        </html>
        "#,
    )
}
