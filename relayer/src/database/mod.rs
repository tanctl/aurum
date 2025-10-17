pub mod models;
pub mod queries;

use crate::database::queries::Queries;
use anyhow::Result;
use models::{
    CrossChainVerificationRecord, Execution, ExecutionRecord, IntentCache, Subscription,
    SyncMetadata,
};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{
    collections::HashMap,
    fmt,
    sync::{
        atomic::{AtomicI64, Ordering},
        Arc, Mutex,
    },
};
use tracing::{error, info};

#[derive(Default)]
pub(crate) struct StubStorage {
    pub subscriptions: Mutex<HashMap<String, Subscription>>,
    pub executions: Mutex<Vec<Execution>>,
    pub execution_records: Mutex<Vec<ExecutionRecord>>,
    pub cross_chain_verifications: Mutex<Vec<CrossChainVerificationRecord>>,
    pub intent_cache: Mutex<Vec<IntentCache>>,
    pub sync_metadata: Mutex<HashMap<i64, SyncMetadata>>,
    next_intent_id: AtomicI64,
    next_execution_id: AtomicI64,
}

impl StubStorage {
    fn next_intent_id(&self) -> i64 {
        self.next_intent_id.fetch_add(1, Ordering::SeqCst) + 1
    }

    fn next_execution_id(&self) -> i64 {
        self.next_execution_id.fetch_add(1, Ordering::SeqCst) + 1
    }
}

#[derive(Clone)]
pub struct Database {
    pool: Option<PgPool>,
    stub: Option<Arc<StubStorage>>,
}

impl fmt::Debug for Database {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mode = if self.pool.is_some() {
            "postgres"
        } else if self.stub.is_some() {
            "stub"
        } else {
            "uninitialised"
        };
        f.debug_struct("Database").field("mode", &mode).finish()
    }
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        if database_url.eq_ignore_ascii_case("stub") {
            info!("initialising in-memory stub database");
            return Ok(Self {
                pool: None,
                stub: Some(Arc::new(StubStorage::default())),
            });
        }

        info!("connecting to database at {}", database_url);

        let pool = PgPoolOptions::new()
            .max_connections(20)
            .connect(database_url)
            .await
            .map_err(|e| {
                error!("failed to connect to database: {}", e);
                e
            })?;

        info!("database connection established");

        Ok(Self {
            pool: Some(pool),
            stub: None,
        })
    }

    pub async fn ping(&self) -> Result<()> {
        if let Some(pool) = &self.pool {
            sqlx::query("SELECT 1").execute(pool).await.map_err(|e| {
                error!("database ping failed: {}", e);
                anyhow::anyhow!("database ping failed: {}", e)
            })?;
        }

        info!("database ping successful");
        Ok(())
    }

    pub fn pool(&self) -> Option<&PgPool> {
        self.pool.as_ref()
    }

    pub fn expect_pool(&self) -> &PgPool {
        self.pool
            .as_ref()
            .expect("PgPool requested while running in stub database mode")
    }

    pub fn queries(&self) -> Queries {
        if let Some(pool) = &self.pool {
            Queries::new(pool.clone())
        } else if let Some(stub) = &self.stub {
            Queries::new_stub(stub.clone())
        } else {
            panic!("database not initialised");
        }
    }

    pub async fn run_migrations(&self) -> Result<()> {
        if let Some(pool) = &self.pool {
            info!("running database migrations");

            sqlx::migrate!("./migrations")
                .run(pool)
                .await
                .map_err(|e| {
                    error!("migration failed: {}", e);
                    anyhow::anyhow!("migration failed: {}", e)
                })?;

            info!("database migrations completed successfully");
        }

        Ok(())
    }
}
