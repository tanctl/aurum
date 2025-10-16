use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::fmt;

#[derive(Debug)]
pub enum RelayerError {
    Database(sqlx::Error),
    DatabaseError(String),
    DatabaseConnection(String),
    DatabaseMigration(String),
    DatabaseConstraint(String),
    Ethereum(ethers::providers::ProviderError),
    TransactionFailed(String),
    InsufficientGas(String),
    NonceError(String),
    ContractRevert(String),
    RpcConnectionFailed(String),
    Config(anyhow::Error),
    Validation(String),
    NotFound(String),
    Duplicate(String),
    InternalError(String),
}

impl fmt::Display for RelayerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            RelayerError::Database(err) => write!(f, "database error: {}", err),
            RelayerError::DatabaseError(msg) => write!(f, "database error: {}", msg),
            RelayerError::DatabaseConnection(msg) => {
                write!(f, "database connection error: {}", msg)
            }
            RelayerError::DatabaseMigration(msg) => write!(f, "database migration error: {}", msg),
            RelayerError::DatabaseConstraint(msg) => {
                write!(f, "database constraint error: {}", msg)
            }
            RelayerError::Ethereum(err) => write!(f, "ethereum error: {}", err),
            RelayerError::TransactionFailed(msg) => write!(f, "transaction failed: {}", msg),
            RelayerError::InsufficientGas(msg) => write!(f, "insufficient gas: {}", msg),
            RelayerError::NonceError(msg) => write!(f, "nonce error: {}", msg),
            RelayerError::ContractRevert(msg) => write!(f, "contract revert: {}", msg),
            RelayerError::RpcConnectionFailed(msg) => write!(f, "rpc connection failed: {}", msg),
            RelayerError::Config(err) => write!(f, "config error: {}", err),
            RelayerError::Validation(msg) => write!(f, "validation error: {}", msg),
            RelayerError::NotFound(msg) => write!(f, "not found: {}", msg),
            RelayerError::Duplicate(msg) => write!(f, "duplicate: {}", msg),
            RelayerError::InternalError(msg) => write!(f, "internal error: {}", msg),
        }
    }
}

impl std::error::Error for RelayerError {}

impl From<sqlx::Error> for RelayerError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::Database(db_err) => {
                // handle specific database constraint errors
                if let Some(constraint) = db_err.constraint() {
                    RelayerError::DatabaseConstraint(format!(
                        "constraint violation: {}",
                        constraint
                    ))
                } else if db_err.is_unique_violation() {
                    RelayerError::Duplicate("unique constraint violation".to_string())
                } else if db_err.is_foreign_key_violation() {
                    RelayerError::DatabaseConstraint("foreign key violation".to_string())
                } else {
                    RelayerError::Database(err)
                }
            }
            sqlx::Error::RowNotFound => {
                RelayerError::NotFound("database row not found".to_string())
            }
            _ => RelayerError::Database(err),
        }
    }
}

impl From<ethers::providers::ProviderError> for RelayerError {
    fn from(err: ethers::providers::ProviderError) -> Self {
        RelayerError::Ethereum(err)
    }
}

impl From<anyhow::Error> for RelayerError {
    fn from(err: anyhow::Error) -> Self {
        RelayerError::InternalError(err.to_string())
    }
}

impl IntoResponse for RelayerError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            RelayerError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database error occurred".to_string(),
            ),
            RelayerError::DatabaseError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database error occurred".to_string(),
            ),
            RelayerError::DatabaseConnection(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database connection error".to_string(),
            ),
            RelayerError::DatabaseMigration(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "database migration error".to_string(),
            ),
            RelayerError::DatabaseConstraint(_) => (
                StatusCode::BAD_REQUEST,
                "database constraint violation".to_string(),
            ),
            RelayerError::Ethereum(_) => {
                (StatusCode::BAD_GATEWAY, "ethereum rpc error".to_string())
            }
            RelayerError::TransactionFailed(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "transaction execution failed".to_string(),
            ),
            RelayerError::InsufficientGas(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "insufficient gas for transaction".to_string(),
            ),
            RelayerError::NonceError(_) => {
                (StatusCode::CONFLICT, "transaction nonce error".to_string())
            }
            RelayerError::ContractRevert(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "contract execution reverted".to_string(),
            ),
            RelayerError::RpcConnectionFailed(_) => (
                StatusCode::BAD_GATEWAY,
                "blockchain rpc connection failed".to_string(),
            ),
            RelayerError::Config(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "configuration error".to_string(),
            ),
            RelayerError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            RelayerError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            RelayerError::Duplicate(msg) => (StatusCode::CONFLICT, msg),
            RelayerError::InternalError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, RelayerError>;
