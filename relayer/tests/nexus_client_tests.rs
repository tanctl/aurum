use chrono::Utc;
use relayer::avail::{NexusClient, PaymentAttestation};
use relayer::Result;

fn sample_attestation() -> PaymentAttestation {
    PaymentAttestation {
        source_chain_id: 11155111,
        subscription_id: [1u8; 32],
        payment_number: 1,
        amount: 42,
        merchant: [2u8; 20],
        tx_hash: [3u8; 32],
        block_number: 100,
        timestamp: Utc::now().timestamp() as u64,
    }
}

#[tokio::test]
async fn test_nexus_client_stub_submission_cycle() -> Result<()> {
    let client = NexusClient::new_stub();
    let attestation = sample_attestation();

    let submission = client
        .submit_payment_attestation(attestation.clone())
        .await?;
    assert!(!submission.attestation_id.is_empty());

    let status = client
        .query_payment_attestation(&submission.attestation_id)
        .await?
        .expect("attestation should exist in stub mode");
    assert!(status.verified);
    assert_eq!(status.attestation, attestation);

    let summary = client
        .verify_cross_chain_subscription(&attestation.subscription_id, attestation.source_chain_id)
        .await?;
    assert!(summary.exists);
    assert_eq!(summary.payment_count, 1);
    assert_eq!(summary.total_amount, attestation.amount);

    Ok(())
}

#[tokio::test]
async fn test_nexus_client_remote_mock() -> Result<()> {
    if std::net::TcpListener::bind("127.0.0.1:0").is_err() {
        eprintln!("skipping nexus remote test due to restricted networking");
        return Ok(());
    }

    let mut server = mockito::Server::new_async().await;

    let status_mock = server
        .mock("GET", "/status")
        .with_status(200)
        .with_body("{}")
        .create_async()
        .await;

    let graphql_endpoint = server.url();
    let signer_key = "0x00112233445566778899aabbccddeeff";
    let client = NexusClient::new(&graphql_endpoint, signer_key, "aurum").await?;
    drop(status_mock);

    let attestation = sample_attestation();

    let submit_mock = server
        .mock("POST", "/attestations")
        .match_header("content-type", "application/json")
        .with_status(200)
        .with_body(
            serde_json::json!({
                "attestationId": "att-remote-1"
            })
            .to_string(),
        )
        .create_async()
        .await;

    let query_mock = server
        .mock("GET", "/attestations/att-remote-1")
        .with_status(200)
        .with_body(
            serde_json::json!({
                "attestation": attestation,
                "verified": true
            })
            .to_string(),
        )
        .create_async()
        .await;

    let submission = client
        .submit_payment_attestation(attestation.clone())
        .await?;
    assert_eq!(submission.attestation_id, "att-remote-1");
    drop(submit_mock);

    let status = client
        .query_payment_attestation("att-remote-1")
        .await?
        .expect("attestation should be returned by mock server");
    assert!(status.verified);
    assert_eq!(status.attestation.tx_hash, attestation.tx_hash);
    drop(query_mock);

    let verify_mock = server
        .mock(
            "GET",
            format!(
                "/subscriptions/{}/attestations",
                hex::encode(attestation.subscription_id)
            )
            .as_str(),
        )
        .match_query(mockito::Matcher::UrlEncoded(
            "chainId".into(),
            attestation.source_chain_id.to_string(),
        ))
        .with_status(200)
        .with_body(
            serde_json::json!({
                "attestations": [attestation]
            })
            .to_string(),
        )
        .create_async()
        .await;

    let summary = client
        .verify_cross_chain_subscription(&sample_attestation().subscription_id, 11155111)
        .await?;
    assert!(summary.exists);
    assert_eq!(summary.payment_count, 1);
    drop(verify_mock);

    Ok(())
}
