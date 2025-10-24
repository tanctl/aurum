#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::needless_return)]
#![allow(clippy::useless_vec)]
#![allow(clippy::assertions_on_constants)]
#![allow(clippy::single_component_path_imports)]
#![allow(clippy::type_complexity)]

pub mod api;
pub mod avail;
pub mod blockchain;
pub mod config;
pub mod database;
pub mod error;
pub mod integrations;
pub mod metrics;
pub mod scheduler;
pub mod utils;

pub use avail::{AvailClient, AvailClientMode};
pub use blockchain::BlockchainClient;
pub use config::Config;
pub use database::Database;
pub use error::{RelayerError, Result};
pub use integrations::envio::EnvioClient;
pub use integrations::hypersync::HyperSyncClient;
pub use metrics::{Metrics, MetricsSnapshot};
pub use scheduler::{Scheduler, SchedulerContext};

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub database: Database,
    pub blockchain_client: BlockchainClient,
    pub avail_client: avail::AvailClient,
    pub envio_client: EnvioClient,
    pub hypersync_client: Option<std::sync::Arc<HyperSyncClient>>,
    pub metrics: std::sync::Arc<Metrics>,
}
