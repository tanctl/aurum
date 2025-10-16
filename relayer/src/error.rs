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
        let (status, code, error_message) = match self {
            RelayerError::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR".to_string(),
                "database error occurred".to_string(),
            ),
            RelayerError::DatabaseError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR".to_string(),
                "database error occurred".to_string(),
            ),
            RelayerError::DatabaseConnection(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_CONNECTION_ERROR".to_string(),
                "database connection error".to_string(),
            ),
            RelayerError::DatabaseMigration(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_MIGRATION_ERROR".to_string(),
                "database migration error".to_string(),
            ),
            RelayerError::DatabaseConstraint(_) => (
                StatusCode::BAD_REQUEST,
                "DATABASE_CONSTRAINT".to_string(),
                "database constraint violation".to_string(),
            ),
            RelayerError::Ethereum(_) => (
                StatusCode::BAD_GATEWAY,
                "ETHEREUM_ERROR".to_string(),
                "ethereum rpc error".to_string(),
            ),
            RelayerError::TransactionFailed(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "TRANSACTION_FAILED".to_string(),
                msg,
            ),
            RelayerError::InsufficientGas(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "INSUFFICIENT_GAS".to_string(),
                msg,
            ),
            RelayerError::NonceError(msg) => (StatusCode::CONFLICT, "NONCE_ERROR".to_string(), msg),
            RelayerError::ContractRevert(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "CONTRACT_REVERT".to_string(),
                msg,
            ),
            RelayerError::RpcConnectionFailed(msg) => (
                StatusCode::BAD_GATEWAY,
                "RPC_CONNECTION_FAILED".to_string(),
                msg,
            ),
            RelayerError::Config(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "CONFIG_ERROR".to_string(),
                "configuration error".to_string(),
            ),
            RelayerError::Validation(msg) => {
                (StatusCode::BAD_REQUEST, "VALIDATION_ERROR".to_string(), msg)
            }
            RelayerError::NotFound(msg) => (StatusCode::NOT_FOUND, "NOT_FOUND".to_string(), msg),
            RelayerError::Duplicate(msg) => (StatusCode::CONFLICT, "DUPLICATE".to_string(), msg),
            RelayerError::InternalError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR".to_string(),
                "internal server error".to_string(),
            ),
        };

        let body = Json(json!({
            "error": error_message,
            "code": code,
        }));

        (status, body).into_response()
    }
}

pub type Result<T> = std::result::Result<T, RelayerError>;
