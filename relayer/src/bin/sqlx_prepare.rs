#![cfg_attr(not(feature = "sqlx-prepare-cli"), allow(dead_code))]

#[cfg(feature = "sqlx-prepare-cli")]
use std::path::PathBuf;
#[cfg(feature = "sqlx-prepare-cli")]
use std::process::Stdio;
#[cfg(feature = "sqlx-prepare-cli")]
use std::time::Duration;

#[cfg(feature = "sqlx-prepare-cli")]
use pg_embed::pg_enums::PgAuthMethod;
#[cfg(feature = "sqlx-prepare-cli")]
use pg_embed::pg_fetch::{PgFetchSettings, PG_V15};
#[cfg(feature = "sqlx-prepare-cli")]
use pg_embed::postgres::{PgEmbed, PgSettings};
#[cfg(feature = "sqlx-prepare-cli")]
use sqlx::postgres::PgPoolOptions;
#[cfg(feature = "sqlx-prepare-cli")]
use tokio::process::Command;

#[cfg(feature = "sqlx-prepare-cli")]
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db_dir = PathBuf::from("./target/.pg-sqlx");
    let cache_dir = std::env::current_dir()?.join("target/.pg-cache");
    std::fs::create_dir_all(&cache_dir)?;
    std::env::set_var("XDG_CACHE_HOME", &cache_dir);
    let fetch_settings = PgFetchSettings {
        version: PG_V15,
        ..Default::default()
    };
    let mut pg = PgEmbed::new(
        PgSettings {
            database_dir: db_dir,
            port: 5436,
            user: "postgres".to_string(),
            password: "postgres".to_string(),
            auth_method: PgAuthMethod::Plain,
            persistent: false,
            timeout: Some(Duration::from_secs(15)),
            migration_dir: None,
        },
        fetch_settings,
    )
    .await?;

    pg.setup().await?;
    pg.start_db().await?;

    let database_name = "aurum_prepare";
    {
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&pg.full_db_uri("postgres"))
            .await?;

        let drop_db_sql = format!(r#"DROP DATABASE IF EXISTS "{}""#, database_name);
        sqlx::query(&drop_db_sql).execute(&admin_pool).await?;

        let create_db_sql = format!(r#"CREATE DATABASE "{}""#, database_name);
        sqlx::query(&create_db_sql).execute(&admin_pool).await?;
    }

    let database_url = pg.full_db_uri(database_name);
    std::env::set_var("DATABASE_URL", &database_url);
    std::env::set_var("SQLX_OFFLINE", "false");

    let status = Command::new("cargo")
        .current_dir(".")
        .args(["sqlx", "prepare", "--", "--lib", "--tests"])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .status()
        .await?;

    pg.stop_db().await?;

    if !status.success() {
        anyhow::bail!("cargo sqlx prepare failed");
    }

    Ok(())
}

#[cfg(not(feature = "sqlx-prepare-cli"))]
fn main() -> anyhow::Result<()> {
    Err(anyhow::anyhow!(
        "Enable the `sqlx-prepare-cli` feature to run this binary"
    ))
}
