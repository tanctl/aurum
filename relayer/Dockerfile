# syntax=docker/dockerfile:1.7

FROM rustlang/rust:nightly-bullseye-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    SQLX_OFFLINE=true \
    CARGO_TERM_COLOR=always

# Install build dependencies and verify capnp availability for hypersync-net-types.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        libssl-dev \
        libpq-dev \
        capnproto \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && capnp --version

WORKDIR /app

# Copy manifest and source files required for compilation (SQLx offline data included).
COPY Cargo.toml Cargo.lock ./
COPY .sqlx ./.sqlx
COPY migrations ./migrations
COPY src ./src
COPY artifacts ./artifacts
COPY examples ./examples
COPY tests ./tests

# Compile the binary in release mode (without BuildKit cache mounts for compatibility).
RUN cargo build --locked --release

# Strip symbols to reduce binary size.
RUN strip target/release/relayer

FROM debian:bullseye-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# Runtime dependencies for the compiled binary.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for running the service.
RUN useradd --user-group --create-home --system relayer

WORKDIR /app

# Copy the compiled binary from the builder stage.
COPY --from=builder /app/target/release/relayer /usr/local/bin/relayer

# Ship migrations so runtime can apply them relative to `/app`.
COPY migrations ./migrations

USER relayer

# Keep SQLx in offline mode inside the container.
ENV SQLX_OFFLINE=true

CMD ["relayer"]
