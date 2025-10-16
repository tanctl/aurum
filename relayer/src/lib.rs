#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::needless_return)]
#![allow(clippy::useless_vec)]
#![allow(clippy::assertions_on_constants)]
#![allow(clippy::single_component_path_imports)]
#![allow(clippy::type_complexity)]

pub mod api;
pub mod blockchain;
pub mod config;
pub mod database;
pub mod error;
pub mod scheduler;

pub use blockchain::BlockchainClient;
pub use config::Config;
pub use database::Database;
pub use error::{RelayerError, Result};
pub use scheduler::Scheduler;

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub database: Database,
    pub blockchain_client: BlockchainClient,
}
