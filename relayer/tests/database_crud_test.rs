use std::io::ErrorKind;
use std::path::PathBuf;
use std::time::Duration;

use chrono::Utc;
use pg_embed::pg_enums::PgAuthMethod;
use pg_embed::pg_errors::PgEmbedErrorType;
use pg_embed::pg_fetch::{PgFetchSettings, PG_V15};
use pg_embed::postgres::{PgEmbed, PgSettings};
use relayer::database::{models::*, queries::Queries};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

fn sample_subscription(id: &str) -> Subscription {
    Subscription {
        id: id.to_string(),
        subscriber: "0x1111111111111111111111111111111111111111".to_string(),
        merchant: "0x2222222222222222222222222222222222222222".to_string(),
        amount: "1000".to_string(),
        interval_seconds: 60,
        start_time: Utc::now() - chrono::Duration::minutes(5),
        max_payments: 5,
        max_total_amount: "5000".to_string(),
        expiry: Utc::now() + chrono::Duration::hours(1),
        nonce: 0,
        status: "ACTIVE".to_string(),
        executed_payments: 0,
        total_paid: "0".to_string(),
        next_payment_due: Utc::now() - chrono::Duration::minutes(1),
        failure_count: 0,
        chain: "sepolia".to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        avail_block_number: None,
        avail_extrinsic_index: None,
    }
}

fn sample_intent(subscription: &Subscription) -> IntentCache {
    IntentCache {
        id: 0,
        subscription_intent: serde_json::json!({"id": subscription.id}),
        signature: "0xdeadbeef".to_string(),
        subscription_id: subscription.id.clone(),
        subscriber: subscription.subscriber.clone(),
        merchant: subscription.merchant.clone(),
        amount: subscription.amount.clone(),
        interval_seconds: subscription.interval_seconds,
        start_time: subscription.start_time,
        max_payments: subscription.max_payments,
        max_total_amount: subscription.max_total_amount.clone(),
        expiry: subscription.expiry,
        nonce: subscription.nonce,
        processed: false,
        created_at: Utc::now(),
        processed_at: None,
        chain: subscription.chain.clone(),
        avail_block_number: Some(1),
        avail_extrinsic_index: Some(0),
    }
}

fn sample_execution(subscription: &Subscription) -> Execution {
    Execution {
        id: 0,
        subscription_id: subscription.id.clone(),
        relayer_address: "0x3333333333333333333333333333333333333333".to_string(),
        payment_number: 1,
        amount_paid: subscription.amount.clone(),
        protocol_fee: "10".to_string(),
        merchant_amount: "990".to_string(),
        transaction_hash: "0xhash".to_string(),
        block_number: 1,
        gas_used: "21000".to_string(),
        gas_price: "1000000000".to_string(),
        status: "SUCCESS".to_string(),
        error_message: None,
        executed_at: Utc::now(),
        chain: subscription.chain.clone(),
        nexus_attestation_id: None,
        nexus_verified: false,
        nexus_submitted_at: None,
    }
}

#[tokio::test]
async fn test_queries_against_postgres() {
    let db_dir = PathBuf::from("./target/.pg");
    let cache_dir = std::env::current_dir()
        .expect("current dir")
        .join("target/.pg-cache");
    std::fs::create_dir_all(&cache_dir).expect("create cache dir");
    std::env::set_var("XDG_CACHE_HOME", &cache_dir);
    let fetch_settings = PgFetchSettings {
        version: PG_V15,
        ..Default::default()
    };
    let mut pg = PgEmbed::new(
        PgSettings {
            database_dir: db_dir,
            port: 5435,
            user: "postgres".to_string(),
            password: "postgres".to_string(),
            auth_method: PgAuthMethod::Plain,
            persistent: false,
            timeout: Some(Duration::from_secs(15)),
            migration_dir: None,
        },
        fetch_settings,
    )
    .await
    .expect("pg embed setup");

    if let Err(err) = pg.setup().await {
        match err.error_type {
            PgEmbedErrorType::DownloadFailure => {
                eprintln!("skipping database CRUD test: {}", err);
                return;
            }
            PgEmbedErrorType::ReadFileError => {
                eprintln!(
                    "skipping database CRUD test due to corrupted cached Postgres archive: {}",
                    err
                );
                let cache_path = pg.pg_access.cache_dir.clone();
                if let Err(remove_err) = std::fs::remove_dir_all(&cache_path) {
                    if remove_err.kind() != ErrorKind::NotFound {
                        eprintln!(
                            "failed to clear cached Postgres files at {}: {}",
                            cache_path.display(),
                            remove_err
                        );
                    }
                }
                return;
            }
            _ => panic!("setup postgres: {}", err),
        }
    }
    pg.start_db().await.expect("start postgres");

    let database_name = "aurum_test";
    {
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&pg.full_db_uri("postgres"))
            .await
            .expect("connect admin postgres");

        let drop_db_sql = format!(r#"DROP DATABASE IF EXISTS "{}""#, database_name);
        sqlx::query(&drop_db_sql)
            .execute(&admin_pool)
            .await
            .expect("drop test database");

        let create_db_sql = format!(r#"CREATE DATABASE "{}""#, database_name);
        sqlx::query(&create_db_sql)
            .execute(&admin_pool)
            .await
            .expect("create test database");
    }

    let connection_string = pg.full_db_uri(database_name);
    let pool = PgPool::connect(&connection_string)
        .await
        .expect("connect postgres");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("run migrations");

    let queries = Queries::new(pool.clone());

    let subscription = sample_subscription("sub_test_01");
    queries
        .insert_subscription(&subscription)
        .await
        .expect("insert subscription");

    let fetched = queries
        .get_subscription(&subscription.id)
        .await
        .expect("fetch subscription")
        .expect("subscription present");
    assert_eq!(fetched.subscriber, subscription.subscriber);

    let nonce_used = queries
        .is_nonce_used(&subscription.subscriber, subscription.nonce)
        .await
        .expect("nonce check");
    assert!(nonce_used);

    let intent = sample_intent(&subscription);
    let intent_id = queries.cache_intent(&intent).await.expect("cache intent");
    assert!(intent_id > 0);

    let cached_intent = queries
        .get_cached_intent(&subscription.id)
        .await
        .expect("get cached intent")
        .expect("cached intent present");
    assert_eq!(cached_intent.signature, intent.signature);

    let due_subs = queries
        .get_due_subscriptions()
        .await
        .expect("due subscriptions");
    assert_eq!(due_subs.len(), 1);

    queries
        .increment_payment_count(&subscription.id, "1000")
        .await
        .expect("increment payments");

    queries
        .increment_failure_count(&subscription.id)
        .await
        .expect("increment failure");

    let execution = sample_execution(&subscription);
    let execution_id = queries
        .insert_execution(&execution)
        .await
        .expect("insert execution");
    assert!(execution_id > 0);

    let merchant_execs = queries
        .get_merchant_executions(&subscription.merchant, 10)
        .await
        .expect("merchant executions");
    assert_eq!(merchant_execs.len(), 1);

    let subscription_execs = queries
        .get_executions_by_subscription(&subscription.id)
        .await
        .expect("subscription executions");
    assert_eq!(subscription_execs.len(), 1);

    queries
        .update_execution_status(execution_id, "FAILED", Some("manual"))
        .await
        .expect("update execution status");

    let (active, paused, total) = queries
        .get_subscription_stats(&subscription.chain)
        .await
        .expect("subscription stats");
    assert_eq!(active + paused, total);

    queries
        .mark_intent_processed(intent_id)
        .await
        .expect("mark intent processed");

    let cleaned = queries
        .cleanup_expired_intents()
        .await
        .expect("cleanup intents");
    assert!(cleaned >= 0);

    queries
        .update_subscription_status(&subscription.id, "PAUSED")
        .await
        .expect("pause subscription");

    queries
        .update_subscription_status_enum(&subscription.id, SubscriptionStatus::Active)
        .await
        .expect("resume subscription");

    queries
        .update_subscription_after_payment(
            &subscription.id,
            1,
            Utc::now() + chrono::Duration::minutes(1),
            0,
        )
        .await
        .expect("update subscription after payment");

    drop(pool);

    pg.stop_db().await.expect("stop postgres");
}
