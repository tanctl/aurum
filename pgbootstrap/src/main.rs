use std::path::PathBuf;
use std::time::Duration;

use pg_embed::pg_enums::PgAuthMethod;
use pg_embed::pg_fetch::PgFetchSettings;
use pg_embed::postgres::{PgEmbed, PgSettings};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let db_dir = PathBuf::from("./target/.pg-bootstrap");
    let _ = pg_embed::pg_access::PgAccess::purge().await;
    let pg_settings = PgSettings {
        database_dir: db_dir,
        port: 5436,
        user: "postgres".to_string(),
        password: "postgres".to_string(),
        auth_method: PgAuthMethod::Plain,
        persistent: true,
        timeout: Some(Duration::from_secs(30)),
        migration_dir: None,
    };
    let fetch_settings = PgFetchSettings::default();

    let mut pg = PgEmbed::new(pg_settings, fetch_settings).await?;
    pg.setup().await?;
    pg.start_db().await?;

    println!("DATABASE_URL={}", pg.db_uri);
    println!("Press Ctrl+C to stop the embedded Postgres server.");

    tokio::signal::ctrl_c().await?;

    pg.stop_db().await?;
    pg.pg_access.clean()?;
    Ok(())
}
