"use client";

import "@/polyfills/global-buffer";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import {
  BridgeButton,
  type RequestForFunds,
  type UserAsset,
  useNexus,
} from "@avail-project/nexus-widgets";
import { useAccount } from "wagmi";

const HYBRID_CHAIN_ID = 84532;

function formatBalanceEntry(
  sdkBalances: UserAsset[],
  formatter: (amount: string, decimals: number) => string,
) {
  return sdkBalances.flatMap((asset) =>
    asset.breakdown.map((entry) => ({
      symbol: asset.symbol,
      chain: entry.chain.name,
      amount: formatter(entry.balance, entry.decimals),
    })),
  );
}

function formatRequests(intents: RequestForFunds[]) {
  return intents.map((intent) => ({
    id: intent.id,
    status: intent.status,
    totalUsd: intent.summary?.totalUsd ?? 0,
    createdAt: intent.createdAt,
  }));
}

type AsyncAction = "init" | "balances" | "intents" | "bridge" | null;

type BridgeState = "idle" | "success" | "error";

export default function NexusAttestationDemoInner() {
  const { isConnected } = useAccount();
  const { sdk, isSdkInitialized, initializeSdk } = useNexus();

  const [balances, setBalances] = useState<UserAsset[]>([]);
  const [requests, setRequests] = useState<RequestForFunds[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<AsyncAction>(null);
  const [bridgeAmount, setBridgeAmount] = useState("10");
  const [bridgeStatus, setBridgeStatus] = useState<BridgeState>("idle");

  const isReady = isConnected && isSdkInitialized;

  const loadBalances = useCallback(async () => {
    if (!sdk || !isReady) {
      return;
    }
    setError(null);
    setAction("balances");
    try {
      const data = await sdk.getUnifiedBalances();
      setBalances(data ?? []);
    } catch (cause) {
      console.error("failed to load Nexus balances", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load Nexus balances. Ensure the SDK is initialised and your wallet is connected.",
      );
    } finally {
      setAction(null);
    }
  }, [isReady, sdk]);

  const loadRequests = useCallback(async () => {
    if (!sdk || !isReady) {
      return;
    }
    setError(null);
    setAction("intents");
    try {
      const intents = await sdk.getMyIntents(0);
      setRequests(intents ?? []);
    } catch (cause) {
      console.error("failed to load Nexus intents", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load Nexus intents. Ensure the SDK is initialised and your wallet is connected.",
      );
    } finally {
      setAction(null);
    }
  }, [isReady, sdk]);

  const initialise = useCallback(async () => {
    setError(null);
    setAction("init");
    try {
      await initializeSdk();
    } catch (cause) {
      console.error("failed to initialise Nexus SDK", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to initialise Nexus SDK. Connect a wallet that supports chain abstraction.",
      );
    } finally {
      setAction(null);
    }
  }, [initializeSdk]);

  const formattedBalances = useMemo(() => {
    if (!balances.length || !sdk?.utils) {
      return [];
    }

    return formatBalanceEntry(balances, (amount, decimals) =>
      sdk.utils.formatTokenAmount(BigInt(amount), decimals),
    );
  }, [balances, sdk]);

  const formattedRequests = useMemo(
    () => formatRequests(requests),
    [requests],
  );

  const runBridgeIntent = useCallback(async () => {
    if (!sdk || !isReady) {
      setError("Connect and initialise Nexus before launching a bridge intent.");
      return;
    }

    if (!bridgeAmount || Number(bridgeAmount) <= 0) {
      setError("Enter a positive amount to bridge.");
      return;
    }

    setError(null);
    setBridgeStatus("idle");
    setAction("bridge");

    try {
      await sdk.bridge({
        token: "USDC",
        amount: bridgeAmount,
        chainId: HYBRID_CHAIN_ID,
      });
      setBridgeStatus("success");
    } catch (cause) {
      console.error("bridge intent failed", cause);
      setBridgeStatus("error");
      setError(
        cause instanceof Error
          ? cause.message
          : "Bridge intent failed. Check wallet prompts and funding before retrying.",
      );
    } finally {
      setAction(null);
    }
  }, [bridgeAmount, isReady, sdk]);

  return (
    <section className="card-surface space-y-4 border border-primary/20 p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Avail Nexus SDK (browser client)</h2>
        <p className="text-xs text-text-muted">
          Initialise Nexus with your connected wallet, inspect unified balances and outstanding intents,
          and launch a bridge flow via the official widgets. This runs entirely in the browser with the
          injected provider — no backend endpoint required.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={initialise}
          disabled={action !== null || !isConnected || isSdkInitialized}
          className="inline-flex items-center gap-2 rounded-md border border-primary/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:border-primary hover:text-foundation-black hover:bg-primary disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
        >
          {action === "init" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw size={16} />}
          {isSdkInitialized ? "SDK ready" : "Initialise SDK"}
        </button>

        <button
          type="button"
          onClick={loadBalances}
          disabled={action !== null || !isReady}
          className="inline-flex items-center gap-2 rounded-md border border-secondary/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary transition hover:border-secondary hover:text-foundation-black hover:bg-secondary disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
        >
          {action === "balances" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
          Load Unified Balances
        </button>

        <button
          type="button"
          onClick={loadRequests}
          disabled={action !== null || !isReady}
          className="inline-flex items-center gap-2 rounded-md border border-secondary/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary transition hover:border-secondary hover:text-foundation-black hover:bg-secondary disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
        >
          {action === "intents" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
          Load Request-For-Funds
        </button>

        <BridgeButton
          title="Bridge assets with Nexus"
          prefill={{
            token: "USDC",
            chainId: HYBRID_CHAIN_ID,
            amount: "10",
          }}
        >
          {({ onClick, isLoading, disabled }) => (
            <button
              type="button"
              onClick={onClick}
              disabled={disabled || isLoading || !isReady}
              className="inline-flex items-center gap-2 rounded-md border border-primary/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:border-primary hover:text-foundation-black hover:bg-primary disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
              Open Bridge Flow
            </button>
          )}
        </BridgeButton>
      </div>

      <div className="card-surface space-y-3 border border-primary/20 bg-foundation-black/40 p-4">
        <h3 className="text-sm font-semibold text-text-primary">Programmatic bridge intent</h3>
        <p className="text-xs text-text-muted">
          Launch a cross-chain intent directly through the Nexus SDK. This bridges USDC from the
          connected wallet to Base Sepolia without using the widget, exercising the same intent
          infrastructure that powers the UI components.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs uppercase tracking-widest text-secondary/80" htmlFor="bridgeAmount">
            Amount (USDC)
          </label>
          <input
            id="bridgeAmount"
            type="number"
            min="0"
            step="0.1"
            value={bridgeAmount}
            onChange={(event) => setBridgeAmount(event.target.value)}
            className="w-full rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none sm:max-w-xs"
            placeholder="10"
          />
          <button
            type="button"
            onClick={runBridgeIntent}
            disabled={action !== null || !isReady}
            className="inline-flex items-center gap-2 rounded-md border border-secondary/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary transition hover:border-secondary hover:text-foundation-black hover:bg-secondary disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-secondary/50"
          >
            {action === "bridge" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight size={16} />}
            Send Bridge Intent
          </button>
        </div>
        {bridgeStatus === "success" ? (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            Bridge intent submitted. Approve the wallet transactions to complete the cross-chain transfer.
          </p>
        ) : null}
        {bridgeStatus === "error" ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            Bridge intent failed. Confirm you have sufficient USDC and gas on the source chain before retrying.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-primary/20 bg-foundation-black/40 p-4">
          <h3 className="text-sm font-semibold text-text-primary">Unified balances</h3>
          <p className="mt-1 text-xs text-text-muted">
            Aggregated across all supported chains exposed by Nexus. Values update live as you bridge or
            transfer.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {formattedBalances.length ? (
              formattedBalances.map((item, index) => (
                <li key={`${item.symbol}-${item.chain}-${index}`} className="flex justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-secondary/80">
                    {item.symbol} · {item.chain}
                  </span>
                  <span className="text-text-primary">{item.amount}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-text-muted/70">
                Initialise the SDK and load balances to view holdings across supported chains.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-primary/20 bg-foundation-black/40 p-4">
          <h3 className="text-sm font-semibold text-text-primary">Request-for-funds intents</h3>
          <p className="mt-1 text-xs text-text-muted">
            When chain abstraction funding is required, Nexus raises intents. Listing them here demonstrates the
            live SDK connection.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {formattedRequests.length ? (
              formattedRequests.map((intent) => (
                <li key={intent.id} className="flex flex-col rounded-md border border-primary/10 p-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-secondary/80">
                    {intent.id}
                  </span>
                  <span className="text-xs text-text-muted">
                    Status:
                    <span className="text-text-primary"> {intent.status ?? "unknown"}</span>
                  </span>
                  <span className="text-xs text-text-muted">
                    Total USD:
                    <span className="text-text-primary">
                      {` ${Number(intent.totalUsd ?? 0).toFixed(2)}`}
                    </span>
                  </span>
                </li>
              ))
            ) : (
              <li className="text-xs text-text-muted/70">
                No pending intents detected. Trigger a bridge or execute flow to populate this list.
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
