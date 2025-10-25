"use client";

import type { ComponentType } from "react";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import { Activity, DollarSign, Gauge, LayoutDashboard, RefreshCcw, Users } from "lucide-react";
import { useAccount, useChainId } from "wagmi";

import { useEnvioHealth, useMerchantStats } from "@/hooks/useEnvio";
import { useMerchantTransactions as useRelayerTransactions } from "@/hooks/useSubscriptions";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDateTime, formatTokenAmount, getChainName, shortenAddress } from "@/lib/utils";

type RelayerTransaction = {
  subscriptionId: string;
  subscriber: string;
  merchant: string;
  paymentNumber: number;
  amount: string;
  fee: string;
  relayer: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  chain: string;
  tokenAddress: string;
  tokenSymbol: string;
  nexusAttestationId?: string;
  nexusVerified: boolean;
};

const SUPPORTED_CHAINS = [11155111, 84532];
const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_ENVIO_EXPLORER_URL?.replace(/\/$/, "") ?? "https://explorer.envio.dev";

const formatUsdValue = (value?: number | null) =>
  value == null
    ? "—"
    : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCount = (value?: number | null) => (value == null ? "—" : value.toLocaleString());

export function MerchantDashboard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const merchant = address?.toLowerCase();

  const statsQuery = useMerchantStats(merchant);
  const envioHealthQuery = useEnvioHealth(merchant);
  const transactionsQuery = useRelayerTransactions(merchant, {
    page: 0,
    size: 20,
    useHypersync: true,
  });

  const stats = statsQuery.data;
  const relayerTransactions = (transactionsQuery.data?.transactions ?? []) as RelayerTransaction[];

  const totalRevenueUsd =
    stats && typeof stats.totalRevenue === "bigint"
      ? Number(stats.totalRevenue) / 1_000_000
      : null;

  const walletLabel = merchant ? shortenAddress(merchant) : "No wallet connected";
  const networkLabel = chainId ? getChainName(chainId) : "Unknown network";
  const wrongNetwork = chainId ? !SUPPORTED_CHAINS.includes(chainId) : false;

  const latestBlock = envioHealthQuery.data?.latestBlock ?? null;
  const latestTimestamp = envioHealthQuery.data?.timestamp ?? null;
  const indexingLag = latestTimestamp
    ? formatDistanceToNow(fromUnixTime(latestTimestamp), { addSuffix: true })
    : "—";

  const kpiItems = [
    {
      icon: Users,
      label: "Active Subscriptions",
      value: stats ? formatCount(stats.activeSubscriptions) : "—",
      description: "Count of ongoing, renewing subscriptions.",
    },
    {
      icon: Gauge,
      label: "Monthly Recurring Revenue (MRR)",
      value: stats ? formatUsdValue(stats.mrr ?? 0) : "—",
      description: "Sum of amount / interval × 30 days across active templates.",
    },
    {
      icon: Activity,
      label: "Payments Executed (Total)",
      value: stats ? formatCount(stats.totalPayments) : "—",
      description: "All successful scheduled payments completed.",
    },
    {
      icon: DollarSign,
      label: "Total Revenue (All Time)",
      value: stats ? formatUsdValue(totalRevenueUsd) : "—",
      description: "Lifetime inflow across Sepolia and Base.",
    },
  ];

  const dataSourceBadge = (() => {
    const source = transactionsQuery.data?.dataSource;
    switch (source) {
      case "hypersync":
        return { label: "HyperSync", tone: "border-secondary/60 text-secondary" };
      case "rpc":
        return { label: "RPC fallback", tone: "border-amber-400/60 text-amber-200" };
      case "envio":
      default:
        return { label: "HyperIndex", tone: "border-primary/60 text-primary" };
    }
  })();

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">Merchant Dashboard</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-semibold text-text-primary">
            <LayoutDashboard size={22} className="text-secondary" />
            Overview
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-text-muted">
            Monitoring {walletLabel} across Sepolia &amp; Base. Data streamed live from Envio HyperIndex.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-primary/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {walletLabel}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
              wrongNetwork ? "border-rose-500/60 text-rose-200" : "border-secondary/60 text-secondary"
            }`}
          >
            {wrongNetwork ? `Wrong network (${networkLabel})` : networkLabel}
          </span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiItems.map((item) => (
          <OverviewKpiCard key={item.label} {...item} />
        ))}
      </section>

      <section className="card-surface space-y-5 p-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-text-primary">
              Recent executions
            </h2>
            <p className="text-xs text-text-muted">
              Hydrated directly from the relayer API with provenance badges from Envio and HyperSync.
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${dataSourceBadge.tone}`}
          >
            {dataSourceBadge.label}
          </span>
        </header>
        <TransactionsTable rows={relayerTransactions} isLoading={transactionsQuery.isLoading} />
      </section>

      <section className="card-surface space-y-4 p-6">
        <header>
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-text-primary">
            Data pipeline status
          </h2>
          <p className="text-xs text-text-muted">
            Envio HyperIndex provides the live feed, HyperSync accelerates backfill, and the relayer falls back to RPC
            if either source degrades.
          </p>
        </header>
        <div className="grid gap-3 md:grid-cols-4">
          <PipelineStat
            label="On-chain events"
            value={relayerTransactions[0]?.timestamp ? formatDateTime(relayerTransactions[0].timestamp) : "—"}
            description="Latest PaymentExecuted consumed by relayer."
          />
          <PipelineStat
            label="Envio HyperIndex"
            value={latestBlock ? `Block ${latestBlock.toLocaleString()}` : "—"}
            description={`Indexed ${indexingLag ?? "—"}`}
          />
          <PipelineStat
            label="Relayer DB"
            value={transactionsQuery.data?.count?.toString() ?? "—"}
            description="Cached executions stored in Postgres."
          />
          <PipelineStat
            label="Frontend freshness"
            value={
              transactionsQuery.dataUpdatedAt
                ? formatDistanceToNow(new Date(transactionsQuery.dataUpdatedAt), { addSuffix: true })
                : "—"
            }
            description="Last successful fetch."
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <a
            href={
              transactionsQuery.data?.envioExplorerUrl ??
              `${EXPLORER_BASE}/entities/payment`
            }
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-primary/60 px-3 py-2 text-primary transition hover:bg-primary/10"
          >
            <RefreshCcw size={14} />
            Check Envio explorer
          </a>
          <p className="text-text-muted">
            Avail DA proofs are linked per subscription intent for tamper-evident history.
          </p>
        </div>
      </section>
    </div>
  );
}

type OverviewKpiCardProps = {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  description: string;
};

function OverviewKpiCard({ icon: Icon, label, value, description }: OverviewKpiCardProps) {
  return (
    <div className="card-surface space-y-2.5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
          <Icon size={16} className="text-secondary" />
          <span>{label}</span>
        </div>
      </div>
      <p className="text-3xl font-semibold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{description}</p>
    </div>
  );
}

function PipelineStat({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-md border border-bronze/40 bg-carbon/40 p-4 text-xs text-text-muted">
      <p className="uppercase tracking-[0.3em] text-secondary/80">{label}</p>
      <p className="mt-2 text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-[11px]">{description}</p>
    </div>
  );
}

function TransactionsTable({ rows, isLoading }: { rows: RelayerTransaction[]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-md" />;
  }

  if (!rows.length) {
    return <EmptyState message="No executions yet. Submit an intent to see live data." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-text-muted">
        <thead className="border-b border-bronze/30 uppercase tracking-[0.3em] text-[10px] text-secondary/80">
          <tr>
            <th className="px-3 py-2">Timestamp</th>
            <th className="px-3 py-2">Subscriber</th>
            <th className="px-3 py-2">Subscription</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Fee</th>
            <th className="px-3 py-2">Relayer</th>
            <th className="px-3 py-2">Chain</th>
            <th className="px-3 py-2">Tx</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.transactionHash}-${row.paymentNumber}`} className="border-b border-bronze/20">
              <td className="px-3 py-2 text-text-primary">{formatDateTime(row.timestamp)}</td>
              <td className="px-3 py-2">{shortenAddress(row.subscriber)}</td>
              <td className="px-3 py-2">
                <a
                  href={`${EXPLORER_BASE}/entities/subscription/${row.subscriptionId.toLowerCase()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary transition hover:text-secondary"
                >
                  {shortenAddress(row.subscriptionId)}
                </a>
              </td>
              <td className="px-3 py-2 text-text-primary">
                {formatTokenAmount(row.amount, 6, 2)} {row.tokenSymbol ?? "TOKEN"}
              </td>
              <td className="px-3 py-2">{formatTokenAmount(row.fee, 6, 2)}</td>
              <td className="px-3 py-2">{shortenAddress(row.relayer)}</td>
              <td className="px-3 py-2 uppercase">{row.chain}</td>
              <td className="px-3 py-2">
                <a
                  href={`https://sepolia.etherscan.io/tx/${row.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary transition hover:text-secondary"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-bronze/40 bg-carbon/40 text-sm text-text-muted">
      {message}
    </div>
  );
}

export default MerchantDashboard;
