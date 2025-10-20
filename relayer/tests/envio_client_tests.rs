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

    let client = EnvioClient::new(graphql_endpoint, explorer_url).expect("client");

    let mock_transactions = server
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
                            "subscriber": "0xsubscriber",
                            "token": "0x0000000000000000000000000000000000000000",
                            "tokenSymbol": "ETH",
                            "nexusAttestationId": null,
                            "nexusVerified": false
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

    let result = client
        .get_merchant_transactions("0xmerchant", 0, 10)
        .await
        .expect("remote call should succeed");
    mock_transactions.assert();
    assert_eq!(result.transactions.len(), 1);
    assert_eq!(result.total_count, 1);
    assert_eq!(result.transactions[0].token_symbol, "ETH");

    let mock_stats = server
        .mock("POST", "/v1/graphql")
        .match_header("content-type", "application/json")
        .match_body(mockito::Matcher::Any)
        .with_status(200)
        .with_body(
            json!({
                "data": {
                    "MerchantTokenStats": [
                        {
                            "merchant": "0xmerchant",
                            "token": "0x0000000000000000000000000000000000000000",
                            "tokenSymbol": "ETH",
                            "totalSubscriptions": 2,
                            "activeSubscriptions": 1,
                            "totalRevenue": "200",
                            "totalPayments": 2,
                            "chainId": 11155111
                        },
                        {
                            "merchant": "0xmerchant",
                            "token": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                            "tokenSymbol": "PYUSD",
                            "totalSubscriptions": 3,
                            "activeSubscriptions": 2,
                            "totalRevenue": "300",
                            "totalPayments": 3,
                            "chainId": 84532
                        }
                    ]
                }
            })
            .to_string(),
        )
        .create_async()
        .await;

    let stats = client
        .get_merchant_stats("0xmerchant")
        .await
        .expect("stats call should succeed")
        .expect("stats result present");
    mock_stats.assert();
    assert_eq!(stats.total.total_subscriptions, 5);
    assert_eq!(stats.by_token.len(), 2);

    let mock_attestations = server
        .mock("POST", "/v1/graphql")
        .match_header("content-type", "application/json")
        .match_body(mockito::Matcher::Any)
        .with_status(200)
        .with_body(
            json!({
                "data": {
                    "CrossChainAttestation": [
                        {
                            "id": "att-1",
                            "subscriptionId": "0x01",
                            "paymentNumber": 1,
                            "sourceChainId": 11155111,
                            "token": "0x0000000000000000000000000000000000000000",
                            "amount": "100",
                            "merchant": "0xmerchant",
                            "txHash": "0xtx",
                            "blockNumber": 100,
                            "timestamp": 1700000000,
                            "verified": false
                        }
                    ]
                }
            })
            .to_string(),
        )
        .create_async()
        .await;

    let attestations = client
        .get_cross_chain_attestations("0x01")
        .await
        .expect("attestation call should succeed");
    mock_attestations.assert();
    assert_eq!(attestations.len(), 1);
    assert_eq!(attestations[0].id, "att-1");

    let mock_payment = server
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
                            "subscriber": "0xsubscriber",
                            "token": "0x0000000000000000000000000000000000000000",
                            "tokenSymbol": "ETH",
                            "nexusAttestationId": "att-1",
                            "nexusVerified": true
                        }
                    ]
                }
            })
            .to_string(),
        )
        .create_async()
        .await;

    let payment = client
        .get_payment_with_attestation("0x01", 1)
        .await
        .expect("payment query should succeed");
    mock_payment.assert();
    let payment = payment.expect("payment record should exist");
    assert_eq!(payment.nexus_attestation_id.as_deref(), Some("att-1"));
    assert!(payment.nexus_verified);
}
