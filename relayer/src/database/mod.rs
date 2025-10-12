pub mod models;
pub mod queries;

use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use tracing::{info, error};

#[derive(Debug, Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
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
        
        Ok(Database { pool })
    }

    pub async fn ping(&self) -> Result<()> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| {
                error!("database ping failed: {}", e);
                anyhow::anyhow!("database ping failed: {}", e)
            })?;
        
        info!("database ping successful");
        Ok(())
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn run_migrations(&self) -> Result<()> {
        info!("running database migrations");
        
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| {
                error!("migration failed: {}", e);
                anyhow::anyhow!("migration failed: {}", e)
            })?;

        info!("database migrations completed successfully");
        Ok(())
    }
}