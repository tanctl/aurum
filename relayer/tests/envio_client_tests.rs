use relayer::integrations::envio::EnvioClient;
use serde_json::json;

#[tokio::test]
async fn test_envio_client_stub() {
    let client = EnvioClient::new_stub();
    assert!(client.health_check().await.unwrap());
    let result = client
        .get_merchant_transactions("0xdeadbeef", 0, 10)
        .await
        .expect("stub call should succeed");
    assert!(result.transactions.is_empty());
    assert_eq!(result.total_count, 0);
}

#[tokio::test]
async fn test_envio_client_remote_queries() {
    if std::net::TcpListener::bind("127.0.0.1:0").is_err() {
        eprintln!("skipping remote envio client test due to restricted networking");
        return;
    }

    let mut server = mockito::Server::new_async().await;
    let graphql_endpoint = format!("{}/v1/graphql", server.url());
    let explorer_url = format!("{}/explorer", server.url());

    let _mock_transactions = server
        .mock("POST", "/v1/graphql")
        .match_header("content-type", "application/json")
        .match_body(mockito::Matcher::Any)
        .with_status(200)
        .with_body(
            json!({
                "data": {
                    "Payment": [
                        {
                            "id": "1",
                            "subscriptionId": "0x01",
                            "paymentNumber": 1,
                            "amount": "100",
                            "fee": "5",
                            "relayer": "0xrelayer",
                            "txHash": "0xtx",
                            "blockNumber": 100,
                            "timestamp": 1700000000,
                            "chainId": 11155111,
                            "merchant": "0xmerchant",
                            "subscriber": "0xsubscriber"
                        }
                    ],
                    "Payment_aggregate": {
                        "aggregate": {
                            "count": "1",
                            "sum": { "amount": "100" }
                        }
                    }
                }
            })
            .to_string(),
        )
        .create_async()
        .await;

    let client = EnvioClient::new(graphql_endpoint, explorer_url).expect("client");
    let result = client
        .get_merchant_transactions("0xmerchant", 0, 10)
        .await
        .expect("remote call should succeed");
    assert_eq!(result.transactions.len(), 1);
    assert_eq!(result.total_count, 1);
}
