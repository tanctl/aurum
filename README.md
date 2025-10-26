# Aurum
Cross-chain, non-custodial recurring payments protocol built around EIP-712 subscription intents, bonded relayers, and verifiable settlement across Sepolia and Base.

## Architecture In One Glance

```
┌───────────────┐   1. signed intent   ┌────────────────────┐
│ Subscriber L2 │ ───────────────────▶ │ Aurum REST Relayer │
│ wallet + dApp │                      │  Rust + Axum       │
└───────────────┘                      └─────────┬──────────┘
                                                2│ validation
                                                 ▼
                                         ┌─────────────────┐
                                         │ Database (SQLx) │◀──┐
                                         └────────┬────────┘   │3. cache intent
                                                  │             │
                                                  ▼             │
                                         ┌─────────────────┐    │
                                         │ Avail Client    │────┘
                                         │ (optional DA)   │ 4. submit_data
                                         └────────┬────────┘
                                                  │
                                                  ▼
                                   ┌────────────────────────────────┐
                                   │ Scheduler + Blockchain Client  │──▶ execute payments on L2
                                   │ (locks, balance checks, fees)  │
                                   └────────────────┬───────────────┘
                                                    │
                                                    ▼
                                  ┌───────────────────────────────┐
                                  │ HyperSync + Envio integrations│
                                  │ (history backfill + analytics)│
                                  └───────────────────────────────┘
                                                    │
                                                    ▼
                                           Merchant dashboards
```

---

## Component Summary

### Smart Contracts (`contracts/`)
- `SubscriptionManager.sol` ([contracts/SubscriptionManager.sol](contracts/SubscriptionManager.sol)) holds the protocol EIP-712 domain, validates intents, calculates protocol fees, and mediates payment execution & state transitions. Events emitted: `SubscriptionCreated`, `PaymentExecuted`, `PaymentFailed`, pause/resume/cancel notifications, and token registry updates.
- `RelayerRegistry.sol` ([contracts/RelayerRegistry.sol](contracts/RelayerRegistry.sol)) manages relayer stakes, withdrawal delays, consecutive failure tracking, slashing with cooldown (`SLASHING_COOLDOWN`), restaking, and owner-controlled emergency actions. Only relayers with `stakedAmount >= MINIMUM_STAKE` and not flagged as slashed may execute.
- Hardhat tests under `test/` cover subscription lifecycle and staking/slashing flows. `hardhat.config.ts` targets Sepolia/Base networks and TypeScript scripts deploy the two contracts.

### Relayer (`relayer/`)
- Rust 2021 crate exposing both a library and binary (`cargo run`) with:
  - **REST API** (Axum) for intent submission, subscription lookups, merchant analytics, cross-chain attestations, health, status, and metrics (`relayer/src/api`).
  - **Scheduler** (`relayer/src/scheduler.rs`) performing batched payment runs with Postgres advisory locks, balance/allowance checks, failure back-off, protocol fee reconciliation, and automatic contract status syncing.
  - **Blockchain client** (`relayer/src/blockchain`) backed by ethers-rs signers for Sepolia/Base or deterministic “stub” mode when RPC URLs are `stub`.
  - **Avail client** (`relayer/src/avail`) optionally posting signed intents to Avail DA; falls back to stub if `AVAIL_SIGNING_KEY` is absent.
  - **Envio + HyperSync integrations** (`relayer/src/integrations`) powering analytics and historical lookups. HyperSync fallback to raw RPC ensures resilience.
  - **Database layer** (`relayer/src/database`) with SQLx migrations for `subscriptions`, `executions`, `intent_cache`, `sync_metadata`, etc. Stub mode mirrors writes for testability.
  - **Observability** via `/metrics` (simple averages), tracing-based logging, and `/status` for richer service snapshots.

### Data Indexer (`envio-indexer/`)
- Envio configuration (`config.yaml`) indexes SubscriptionManager & RelayerRegistry events on Base Sepolia (84532) and Sepolia (11155111).
- `src/EventHandlers.ts` normalises events, maintains merchant token stats, per-chain indexer metadata, relayer performance scoring, and token symbol heuristics.
- Generated bindings live in `generated/`; build scripts rely on Envio CLI.

### Web Client (`aurum-frontend/`)
- Next.js 15 (App Router) with Tailwind styling, RainbowKit + wagmi wallet connections, and typed intent-building flows.
- Pages:
  - `/subscribe` decodes intent templates, lets subscribers pick chain/token, signs EIP-712 data, and posts to the relayer (`app/subscribe/page.tsx`).
  - `/subscriptions/[id]` and `dashboard/merchant/*` display execution history, Avail anchoring, and Envio-powered analytics.
  - Landing page summarises product value props and demo video overlay.
- Shared utilities manage token metadata, template encoding, and Envio/relayer API hooks.

---

## Repository Layout

| Path | Purpose |
| ---- | ------- |
| `contracts/` | Solidity sources plus Hardhat tooling (`scripts/deploy.ts`, `test/*.ts`). |
| `relayer/` | Rust service, SQLx migrations, API handlers, scheduler, and integration tests. |
| `aurum-frontend/` | Next.js dApp for subscribers & merchants. |
| `envio-indexer/` | Envio configuration, handlers, and generated bindings. |
| `scripts/` | Misc documentation (`aurum.md`, `demo.md`), deploy helpers. |
| `src/` | Shared Rust utilities (token helpers used by relayer lib consumers). |
| `artifacts/`, `cache/` | Hardhat build outputs. |

---

## Prerequisites

| Tooling | Version Hint | Notes |
| ------- | ------------ | ----- |
| Node.js | ≥ 20.x | Hardhat & Next.js. |
| pnpm | latest | Preferred package manager for JS/TS workspaces. |
| Rust | stable (≥ 1.75) | Required for the relayer crate. |
| cargo sqlx-cli | optional | For offline compile-time checks; runtime migrations executed automatically. |
| PostgreSQL | 14+ | Relayer persistence (set `DATABASE_URL=stub` for in-memory dev mode). |
| Envio CLI | `pnpm dlx envio@latest` | Building & running the indexer locally. |

Optional integrations: Avail RPC access + signing key, HyperSync credentials, WalletConnect project ID, Envio Hosted endpoints.

---

## Component Setup

### 1. Smart Contracts
```bash
cd contracts
pnpm install
pnpm exec hardhat compile
pnpm exec hardhat test          # runs test/*.ts against Hardhat network
pnpm exec hardhat node          # optional: local JSON-RPC for manual testing
pnpm exec hardhat run scripts/deploy.ts --network sepolia   # or base
```

Environment variables (see `hardhat.config.ts`) drive network endpoints and private keys; use `.env` at repo root or Hardhat config plugins.

### 2. Relayer
```bash
cd relayer
cp .env.example .env    # update values
cargo run               # starts API + scheduler (migrations run on boot)
```

Key environment variables (`.env.example` documents the full list):

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | Postgres connection string or `stub` for in-memory mode. |
| `ETHEREUM_RPC_URL` / `BASE_RPC_URL` | Sepolia/Base RPC endpoints (use `stub` for deterministic no-RPC mode). |
| `RELAYER_PRIVATE_KEY` / `RELAYER_ADDRESS` | Signing wallet executing `executeSubscription`. |
| `SUBSCRIPTION_MANAGER_ADDRESS_*` | Deployed contract addresses per chain. |
| `SUPPORTED_TOKENS_*` | Comma-separated token list (must include `0x0` for ETH). |
| `AVAIL_RPC_URL`, `AVAIL_APPLICATION_ID`, `AVAIL_SIGNING_KEY` | Enable Avail remote mode. |
| `ENVIO_GRAPHQL_ENDPOINT`, `ENVIO_EXPLORER_URL` | Merchant analytics via Envio. |
| `HYPERSYNC_URL_SEPOLIA`, `HYPERSYNC_URL_BASE` | Optional HyperSync acceleration (must supply both). |

Useful commands:
```bash
cargo test                           # runs unit/integration tests (uses stub DB)
cargo run -- --help                  # inspect runtime logs via RUST_LOG=debug
cargo run --release                  # production build
```

### 3. Web Client
```bash
cd aurum-frontend
pnpm install
cp .env.example .env.local           # create and populate env file
pnpm dev                             # runs Next.js on http://localhost:3000
```

Important `NEXT_PUBLIC_` settings:

| Var | Description |
| --- | ----------- |
| `NEXT_PUBLIC_RELAYER_API_URL` | Base URL for the Rust API (e.g. `http://localhost:3000`). |
| `NEXT_PUBLIC_SEPOLIA_RPC`, `NEXT_PUBLIC_BASE_RPC` | RPC providers exposed to wagmi. |
| `NEXT_PUBLIC_SUBSCRIPTION_MANAGER_SEPOLIA`, `..._BASE` | Contract addresses used by the dApp. |
| `NEXT_PUBLIC_PYUSD_SEPOLIA`, `NEXT_PUBLIC_PYUSD_BASE` | Token addresses (defaults provided). |
| `NEXT_PUBLIC_ENVIO_GRAPHQL_ENDPOINT`, `NEXT_PUBLIC_ENVIO_EXPLORER_URL` | For analytics views. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect integration. |
| `NEXT_PUBLIC_AVAIL_EXPLORER_URL` / `NEXT_PUBLIC_AVAIL_EXPLORER_TEMPLATE` | Link-out to Avail DA references. |

Build & lint:
```bash
pnpm build
pnpm lint
```

### 4. Envio Indexer
```bash
cd envio-indexer
pnpm install
pnpm envio codegen  # regenerate bindings from config.yaml
pnpm envio start     # run local indexer against configured networks
```

`config.yaml` tracks contract addresses per chain. Update addresses after redeploying and re-run `pnpm exec envio codegen`.

---

## Local End-to-End Flow
1. **Deploy contracts** to Hardhat/Sepolia/Base, note addresses, and update both relayer + frontend env files.
2. **Start supporting services**: Postgres (or `DATABASE_URL=stub`), relayer (`cargo run`), optional Avail stub, Envio indexer (stub or hosted).
3. **Launch the web client**, connect wallet, and use `/subscribe?intent=...` links or merchant dashboard to seed demo data (`aurum-frontend/lib/demoData.ts`).
4. **Create a subscription** – the dApp signs the EIP-712 payload and POSTs to `/api/v1/intent`. Relayer caches the intent, optionally posts to Avail, and writes DB rows.
5. **Scheduler executes** once `interval` is due. It acquires a distributed lock (`relayer/src/scheduler.rs`) to pull due subscriptions, validates allowances/balances, and calls `SubscriptionManager.executeSubscription`. On success it updates `executed_payments`, emits `PaymentExecuted`, records execution in DB + Envio.
6. **Monitoring** – Use API endpoints (`/status`, `/metrics`), Envio explorer URLs, or the dashboard to verify payment history.

---

## Relayer API Surface

| Method & Path | Purpose |
| ------------- | ------- |
| `POST /api/v1/intent` | Submit a signed `SubscriptionIntent` + signature. Validates nonce, signature, supported token, schedules execution, stores Avail reference. |
| `GET /api/v1/subscription/{id}` | Combined database + on-chain subscription status, token symbol, Avail block/extrinsic metadata. |
| `GET /api/v1/merchant/{address}/transactions` | Paginated payment history (HyperSync -> RPC fallback -> Envio). Query params: `page`, `size`, `use_hypersync`, `from_block`, `to_block`, `chain`. |
| `GET /api/v1/merchant/{address}/stats` | Aggregated revenue/subscription counts by token with Envio explorer link. |
| `GET /api/v1/cross-chain/{subscription_id}` | Cross-chain attestation records for a subscription (Envio-sourced). |
| `GET /health` | Basic service health (DB, RPC, Envio) with response times. |
| `GET /status` | Extended status including subscription counts and feature flags. |
| `GET /metrics` | Simple latency counters for HyperSync / Envio queries. |
| `GET /api/v1/docs` | Inline HTML documentation for quick manual testing. |

All API errors return `{ "error": "...", "code": "..." }` as defined in `relayer/src/error.rs`.

---

## Contract Highlights

### SubscriptionManager.sol
- Fixed EIP-712 domain (`DOMAIN_SEPARATOR`) defined at deployment; `verifyIntent` returns signer + validity.
- `createSubscription` checks nonce, token support, allowances, and ensures `maxTotalAmount` ≥ `amount * maxPayments`.
- Execution pipeline (`executeSubscription`) enforces relayer authorization via `RELAYER_REGISTRY.canExecute`, calculates protocol fee (0.5%), differentiates ETH vs ERC-20 flows, emits `PaymentFailed` on errors, and updates `executedPayments` before marking status COMPLETE/EXPIRED.
- Pause/resume/cancel gated by subscriber signatures and nonce increments to prevent replay.
- Token registry helpers restrict removal if active subscriptions exist, ensuring safety for merchants mid-stream.

### RelayerRegistry.sol
- Stake management: `registerRelayer` transfers PYUSD, tracks stats, and resets failure counters. `requestWithdrawal` + `unregisterRelayer` impose a 7-day delay and forbid when currently slashed.
- Failure handling: `recordExecution` increments success/failure counters and triggers `_slashRelayer` after `failureThresholdConfig` consecutive failures, respecting `SLASHING_COOLDOWN`.
- Slashing consequences: amounts deducted from stake, `isSlashed` flag set, `isActive` toggled off until restaked above minimum. Owners can `emergencySlash` / `emergencyUnslash` and update parameters.
- `canExecute` is consumed by the relayer service before calling `executeSubscription` to ensure decentralised execution rights track on-chain stake.

---

## Database Schema (Relayer)
- `subscriptions` – Core subscription state mirroring on-chain fields plus status, totals, failure counts, chain, Avail metadata.
- `executions` – Each attempt with transaction hash, fee breakdown, gas usage, status, optional Nexus attestation metadata.
- `intent_cache` – Raw intents + signatures awaiting processing (enables replays, Avail retrieval).
- `sync_metadata` – Tracks last synced block per chain for HyperSync catch-up.

Migrations live in `relayer/migrations/*.sql` and run automatically at boot; adjust them if schema evolves.

---

## Testing & Quality
- **Contracts**: `pnpm exec hardhat test` under repo root executes Hardhat test suite (`test/*.ts`).
- **Relayer**: `cargo test` leverages stubbed DB/RPC modes for deterministic unit + integration coverage (see `relayer/tests/*.rs`).
- **Frontend**: `pnpm lint` ensures TypeScript + ESLint hygiene; add tests via Jest/Playwright as needed.
- **Indexer**: `pnpm exec envio dev` validates handler logic against live/subscription events; integration assertions can be added inside `src/EventHandlers.ts`.

---

## Utilities & Extras
- `relayer/examples/` – Minimal examples showing direct usage of blockchain client & scheduler.
- `scripts/deploy.ts` – Parameterised Hardhat deployment to Sepolia/Base (update config to point at new networks).
- `src/utils/tokens.rs` – Reusable token helper crate for relayer consumers (normalisation, formatting, runtime registry of PYUSD addresses).

---

## Contributing
- Open issues for protocol or infrastructure changes.
- When modifying SQLx queries run `cargo sqlx prepare -- --lib` to refresh `.sqlx/` data if you use offline checking.