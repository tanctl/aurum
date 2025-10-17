use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

#[derive(Debug)]
pub struct Metrics {
    hypersync_total_nanos: AtomicU64,
    hypersync_queries: AtomicU64,
    envio_total_nanos: AtomicU64,
    envio_queries: AtomicU64,
}

impl Metrics {
    pub fn new() -> Self {
        Self {
            hypersync_total_nanos: AtomicU64::new(0),
            hypersync_queries: AtomicU64::new(0),
            envio_total_nanos: AtomicU64::new(0),
            envio_queries: AtomicU64::new(0),
        }
    }

    pub fn record_hypersync_query(&self, duration: Duration) {
        self.hypersync_total_nanos
            .fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
        self.hypersync_queries.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_envio_query(&self, duration: Duration) {
        self.envio_total_nanos
            .fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
        self.envio_queries.fetch_add(1, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        let hypersync_queries = self.hypersync_queries.load(Ordering::Relaxed);
        let envio_queries = self.envio_queries.load(Ordering::Relaxed);

        let hypersync_average_ns = if hypersync_queries > 0 {
            self.hypersync_total_nanos.load(Ordering::Relaxed) / hypersync_queries
        } else {
            0
        };

        let envio_average_ns = if envio_queries > 0 {
            self.envio_total_nanos.load(Ordering::Relaxed) / envio_queries
        } else {
            0
        };

        MetricsSnapshot {
            hypersync_queries,
            hypersync_average_ms: hypersync_average_ns as f64 / 1_000_000_f64,
            envio_queries,
            envio_average_ms: envio_average_ns as f64 / 1_000_000_f64,
        }
    }
}

impl Default for Metrics {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Serialize)]
pub struct MetricsSnapshot {
    #[serde(rename = "hypersyncQueries")]
    pub hypersync_queries: u64,
    #[serde(rename = "hypersyncAverageMs")]
    pub hypersync_average_ms: f64,
    #[serde(rename = "envioQueries")]
    pub envio_queries: u64,
    #[serde(rename = "envioAverageMs")]
    pub envio_average_ms: f64,
}
