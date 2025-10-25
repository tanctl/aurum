"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  LineChart,
  Gauge,
  PieChart as PieChartIcon,
  Repeat,
  SignalHigh,
} from "lucide-react";

import {
  useMerchantPaymentsSeries,
  useMerchantSubscriptionHealth,
  useEnvioHealth,
  useMerchantPaymentFailures,
  useSubscriptionsByIds,
  useMerchantPerformance,
  useRelayerPerformanceTop,
  useIndexerMeta,
  type MerchantSeriesPoint,
  type SubscriptionHealthSummary,
  type SubscriptionMetadata,
  type MerchantPerformanceSummary,
  type RelayerPerformanceSummary,
} from "@/hooks/useEnvio";
import { useGraphLatencyAverage } from "@/hooks/useGraphMetrics";
import { Skeleton } from "@/components/ui/Skeleton";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatTokenAmount, getChainName, tokenDecimalsForSymbol, shortenAddress } from "@/lib/utils";

const COLOR_PALETTE = ["#c9a961", "#81a1f1", "#f472b6", "#38bdf8", "#f97316", "#22c55e"];
const CHAIN_FILTERS = [
  { label: "All chains", value: "all" as const },
  { label: "Sepolia", value: 11155111 as const },
  { label: "Base", value: 84532 as const },
];

const RELAYER_STATUS_URL = process.env.NEXT_PUBLIC_RELAYER_API_URL
  ? `${process.env.NEXT_PUBLIC_RELAYER_API_URL.replace(/\/$/, "")}/status`
  : "/status";

const SUCCESS_RATE_WARN_THRESHOLD = 98;
const LATENCY_WARN_THRESHOLD_SECONDS = 60;
const SYNC_LAG_WARNING_SECONDS = 90;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

type ChainFilter = (typeof CHAIN_FILTERS)[number]["value"];
type DateRange = { start: Date; end: Date };

type MixDatum = { label: string; value: number };

export default function MerchantAnalyticsPage() {
  const { address } = useAccount();
  const merchant = address?.toLowerCase();

  const [dateRange, setDateRange] = useState<DateRange>(() => createDefaultDateRange());
  const [chainFilter, setChainFilter] = useState<ChainFilter>("all");
  const [tokenFilter, setTokenFilter] = useState<string>("all");

  const seriesQuery = useMerchantPaymentsSeries(merchant, {
    startDate: dateRange.start,
    endDate: dateRange.end,
    chainId: chainFilter === "all" ? undefined : chainFilter,
  });
  const subscriptionHealthQuery = useMerchantSubscriptionHealth(merchant, dateRange.start, dateRange.end);
  const envioHealthQuery = useEnvioHealth(merchant);
  const merchantPerformanceQuery = useMerchantPerformance(merchant);
  const relayerPerformanceQuery = useRelayerPerformanceTop();
  const indexerMetaQuery = useIndexerMeta();

  const allSeries = useMemo(() => seriesQuery.data ?? [], [seriesQuery.data]);
  const tokenOptions = useMemo(() => buildTokenOptions(allSeries), [allSeries]);
  useEffect(() => {
    if (tokenFilter !== "all" && !tokenOptions.includes(tokenFilter)) {
      setTokenFilter("all");
    }
  }, [tokenFilter, tokenOptions]);

  const filteredSeries = useMemo(() => {
    if (tokenFilter === "all") {
      return allSeries;
    }
    return allSeries.filter((point) => (point.tokenSymbol ?? "UNKNOWN").toUpperCase() === tokenFilter);
  }, [allSeries, tokenFilter]);

  const revenueTimeline = useMemo(() => buildRevenueTimeline(filteredSeries), [filteredSeries]);
  const totalVolume = useMemo(() => revenueTimeline.reduce((sum, point) => sum + point.value, 0), [revenueTimeline]);
  const totalPayments = filteredSeries.length;
  const averageTicket = totalPayments ? totalVolume / totalPayments : 0;

  const tokenMixData = useMemo(() => buildMixData(filteredSeries, (point) => (point.tokenSymbol ?? "UNKNOWN").toUpperCase()), [filteredSeries]);
  const chainMixData = useMemo(() => buildMixData(filteredSeries, (point) => getChainName(point.chainId)), [filteredSeries]);

  const subscriptionHealth = subscriptionHealthQuery.data;
  const subscriptionVelocity = useMemo(
    () => buildSubscriptionVelocity(subscriptionHealth?.recentSubscriptionTimestamps ?? []),
    [subscriptionHealth?.recentSubscriptionTimestamps],
  );
  const newSubscriptionsCount = subscriptionHealth?.newInWindow ?? 0;
  const rangeLabel = useMemo(() => formatRangeLabel(dateRange), [dateRange]);

  const subscriptionIds = useMemo(
    () => Array.from(new Set(filteredSeries.map((point) => point.subscriptionId.toLowerCase()))),
    [filteredSeries],
  );
  const failuresQuery = useMerchantPaymentFailures(merchant);
  const subscriptionMetadataQuery = useSubscriptionsByIds(subscriptionIds);

  const combinedMetadata = useMemo(() => {
    const merged = new Map<string, SubscriptionMetadata>();
    if (subscriptionHealth?.metadata) {
      subscriptionHealth.metadata.forEach((value, key) => {
        merged.set(key, { ...value });
      });
    }
    subscriptionMetadataQuery.data?.forEach((value, key) => {
      const existing = merged.get(key);
      merged.set(key, existing ? { ...existing, ...value } : { ...value });
    });
    return merged;
  }, [subscriptionHealth?.metadata, subscriptionMetadataQuery.data]);

  const merchantPerformance = merchantPerformanceQuery.data;
  const relayerPerformance = relayerPerformanceQuery.data ?? [];

  const rangeStartSeconds = Math.floor(dateRange.start.getTime() / 1000);
  const rangeEndSeconds = Math.floor(dateRange.end.getTime() / 1000);

  const reliabilityMetrics = useMemo(() => {
    const successCount = filteredSeries.length;
    let latencySamples = 0;
    let latencyTotal = 0;

    filteredSeries.forEach((point) => {
      const subscriptionId = point.subscriptionId.toLowerCase();
      const metadata = combinedMetadata.get(subscriptionId);
      let latency = point.latencySeconds ?? null;

      if (latency == null) {
        if (!metadata) return;
        const interval = Number(metadata.interval);
        const startTime = Number(metadata.startTime);
        if (!Number.isFinite(interval) || interval <= 0 || !Number.isFinite(startTime) || startTime <= 0) {
          return;
        }
        const paymentIndex = Math.max(point.paymentNumber - 1, 0);
        const expectedTimestamp = startTime + interval * paymentIndex;
        if (!Number.isFinite(expectedTimestamp)) return;
        latency = point.timestamp - expectedTimestamp;
      }

      if (latency == null || latency < 0) {
        return;
      }

      latencySamples += 1;
      latencyTotal += latency;
    });

    const failureEvents = (failuresQuery.data ?? []).filter((entry) => {
      const failureSubscription = entry.subscriptionId.toLowerCase();
      const [chainPart] = entry.id.split("_");
      const failureChainId = Number(chainPart);
      if (chainFilter !== "all" && (!Number.isFinite(failureChainId) || failureChainId !== chainFilter)) {
        return false;
      }

      const hasMatchingPayment = filteredSeries.some(
        (point) => point.subscriptionId.toLowerCase() === failureSubscription,
      );
      let includeEvent = hasMatchingPayment;

      if (tokenFilter !== "all") {
        const tokenMatch = filteredSeries.some(
          (point) =>
            point.subscriptionId.toLowerCase() === failureSubscription &&
            (point.tokenSymbol ?? "UNKNOWN").toUpperCase() === tokenFilter,
        );
        if (!tokenMatch) {
          return false;
        }
        includeEvent = true;
      } else if (!hasMatchingPayment) {
        const metadata = combinedMetadata.get(failureSubscription);
        if (!metadata?.createdAt) return false;
        if (metadata.createdAt < rangeStartSeconds || metadata.createdAt > rangeEndSeconds) {
          return false;
        }
        includeEvent = true;
      }

      return includeEvent;
    });

    const failureCount = failureEvents.length;
    const totalAttempts = successCount + failureCount;
    const successRate = totalAttempts ? (successCount / totalAttempts) * 100 : null;
    const averageLatencySeconds = latencySamples ? latencyTotal / latencySamples : null;

    return {
      successCount,
      failureCount,
      successRate,
      averageLatencySeconds,
      latencySamples,
    };
  }, [
    filteredSeries,
    combinedMetadata,
    failuresQuery.data,
    chainFilter,
    tokenFilter,
    rangeStartSeconds,
    rangeEndSeconds,
  ]);

  const reliabilityLoading =
    seriesQuery.isLoading || failuresQuery.isLoading || subscriptionMetadataQuery.isLoading;
  const reliabilityWarning =
    (reliabilityMetrics.successRate != null && reliabilityMetrics.successRate < SUCCESS_RATE_WARN_THRESHOLD) ||
    (reliabilityMetrics.averageLatencySeconds != null &&
      reliabilityMetrics.averageLatencySeconds > LATENCY_WARN_THRESHOLD_SECONDS);

  const trackedOperations = useMemo(
    () => ["MerchantPaymentsSeries", "MerchantSubscriptionStatus", "MerchantPerformance", "RelayerPerformance", "IndexerMeta"],
    [],
  );
  const graphLatencyMs = useGraphLatencyAverage(trackedOperations);

  const latestBlock = envioHealthQuery.data?.latestBlock ?? null;
  const latestChainId = envioHealthQuery.data?.chainId ?? null;
  const latestTimestamp = envioHealthQuery.data?.timestamp ?? null;
  const syncLagSeconds = latestTimestamp
    ? Math.max(0, Math.round(Date.now() / 1000 - latestTimestamp))
    : null;
  const blocksBehind = syncLagSeconds != null ? Math.max(0, Math.round(syncLagSeconds / 12)) : null;
  const showLagWarning = syncLagSeconds != null && syncLagSeconds > SYNC_LAG_WARNING_SECONDS;

  const currentIndexerMeta = useMemo(() => {
    const entries = indexerMetaQuery.data ?? [];
    if (!entries.length) return null;
    if (latestChainId != null) {
      return entries.find((entry) => entry.chainId === latestChainId) ?? entries[0];
    }
    return entries[0];
  }, [indexerMetaQuery.data, latestChainId]);

  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">Merchant Dashboard</p>
        <div className="mt-2 flex items-center gap-2">
          <BarChart3 size={20} className="text-secondary" />
          <h1 className="text-3xl font-semibold text-text-primary">Analytics</h1>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-text-muted">
          Track settlement revenue, understand where it comes from, and keep a pulse on subscription health—all without leaving the dashboard.
        </p>
      </header>

      <section className="card-surface space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
              <LineChart size={16} className="text-secondary" />
              <span>Revenue trend</span>
            </div>
            <p className="mt-1 text-xs text-text-muted">Settlement volume for the selected window, chain, and token.</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-secondary/60">{rangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.3em]">
            <DateRangeControl range={dateRange} onChange={(nextRange) => setDateRange(nextRange)} />
            <FilterGroup
              label="Chain"
              options={CHAIN_FILTERS.map((option) => ({ label: option.label, value: option.value }))}
              value={chainFilter}
              onChange={(value) => setChainFilter(value as ChainFilter)}
            />
            <FilterGroup
              label="Token"
              options={["all", ...tokenOptions].map((token) => ({ label: token === "all" ? "All tokens" : token, value: token }))}
              value={tokenFilter}
              onChange={(value) => setTokenFilter(String(value))}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatChip label="Total volume" value={currencyFormatter.format(totalVolume)} hint="Sum of settled payments in range" />
          <StatChip label="Payments" value={totalPayments.toLocaleString()} hint="Count within range" />
          <StatChip label="Avg ticket" value={currencyFormatter.format(averageTicket)} hint="Volume ÷ payments" />
        </div>

        <div className="h-80">
          {seriesQuery.isLoading ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : revenueTimeline.length === 0 ? (
            <EmptyState message="No payments in this window yet." />
          ) : (
            <ResponsiveContainer>
              <AreaChart data={revenueTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a961" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#c9a961" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2330" />
                <XAxis dataKey="label" stroke="#A1A8BD" />
                <YAxis stroke="#A1A8BD" width={70} tickFormatter={(value) => `$${numberFormatter.format(value)}`} />
                <Tooltip
                  contentStyle={{ background: "#151820", borderRadius: 12, border: "1px solid #2A2F3A", color: "#E5E7EB" }}
                  formatter={(value: number) => currencyFormatter.format(value)}
                />
                <Area type="monotone" dataKey="value" stroke="#c9a961" fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <MixCard
          icon={PieChartIcon}
          title="Token mix"
          description="Distribution of revenue by token for the selected filters."
          data={tokenMixData}
        />
        <MixCard
          icon={SignalHigh}
          title="Chain mix"
          description="Settled payments per network."
          data={chainMixData}
        />
      </section>

      <SubscriptionHealthCard
        summary={subscriptionHealth}
        velocity={subscriptionVelocity}
        isLoading={subscriptionHealthQuery.isLoading}
        newSubscriptions={newSubscriptionsCount}
      />

      <ExecutionReliabilityCard
        isLoading={reliabilityLoading}
        successRate={reliabilityMetrics.successRate}
        averageLatencySeconds={reliabilityMetrics.averageLatencySeconds}
        failureCount={reliabilityMetrics.failureCount}
        successCount={reliabilityMetrics.successCount}
        latencySamples={reliabilityMetrics.latencySamples}
        warning={reliabilityWarning}
        incidentsUrl={RELAYER_STATUS_URL}
        score={merchantPerformance?.performanceScore ?? null}
      />

      <IndexingFreshnessCard
        isLoading={envioHealthQuery.isLoading}
        latestBlock={latestBlock}
        chainId={latestChainId}
        syncLagSeconds={syncLagSeconds}
        blocksBehind={blocksBehind}
        graphLatencyMs={graphLatencyMs}
        warning={showLagWarning}
        indexerVersion={currentIndexerMeta?.envioVersion ?? null}
        indexerScore={currentIndexerMeta?.performanceScore ?? null}
        indexingLatencyMs={currentIndexerMeta?.indexingLatencyMs ?? null}
      />

      <ProtocolHealthCard
        isLoading={merchantPerformanceQuery.isLoading}
        summary={merchantPerformance}
      />

      <RelayerPerformanceCard
        relayers={relayerPerformance}
        isLoading={relayerPerformanceQuery.isLoading}
      />
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: string | number }>;
  value: string | number;
  onChange: (value: string | number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted">{label}</span>
      <div className="flex overflow-hidden rounded-full border border-bronze/40">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.label}
              type="button"
              className={`px-3 py-1 text-[11px] ${
                active ? "bg-primary text-foundation-black" : "text-text-muted"
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangeControl({ range, onChange }: { range: DateRange; onChange: (range: DateRange) => void }) {
  const handleStartChange = (value: string) => {
    const parsed = parseDateFromInput(value);
    if (!parsed) return;
    const nextStart = startOfDayLocal(parsed);
    const adjustedEnd = nextStart.getTime() > range.end.getTime() ? endOfDayLocal(new Date(nextStart)) : range.end;
    onChange({ start: nextStart, end: adjustedEnd });
  };

  const handleEndChange = (value: string) => {
    const parsed = parseDateFromInput(value);
    if (!parsed) return;
    const nextEnd = endOfDayLocal(parsed);
    const adjustedStart = nextEnd.getTime() < range.start.getTime() ? startOfDayLocal(new Date(parsed)) : range.start;
    onChange({ start: adjustedStart, end: nextEnd });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted">Date</span>
      <div className="flex items-center gap-2 rounded-full border border-bronze/40 bg-carbon/40 px-3 py-1">
        <input
          type="date"
          className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-text-primary outline-none"
          value={formatDateInput(range.start)}
          max={formatDateInput(range.end)}
          onChange={(event) => handleStartChange(event.target.value)}
        />
        <span className="text-text-muted">to</span>
        <input
          type="date"
          className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-text-primary outline-none"
          value={formatDateInput(range.end)}
          min={formatDateInput(range.start)}
          onChange={(event) => handleEndChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function StatChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-bronze/40 bg-carbon/50 p-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">{label}</p>
      <p className="mt-2 text-xl font-semibold text-text-primary">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

function MixCard({
  icon: Icon,
  title,
  description,
  data,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  data: MixDatum[];
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <section className="card-surface space-y-4 p-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
          <Icon size={16} className="text-secondary" />
          <span>{title}</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </header>
      {!data.length ? (
        <EmptyState message="No data for current filters." />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-48 w-full flex-1">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} innerRadius="55%" outerRadius="75%" paddingAngle={3} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={entry.label} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#151820", borderRadius: 12, border: "1px solid #2A2F3A", color: "#E5E7EB" }}
                  formatter={(value: number, name) => [`${numberFormatter.format(value)}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-2 text-sm text-text-muted">
            {data.slice(0, 5).map((entry, index) => {
              const percent = total > 0 ? (entry.value / total) * 100 : 0;
              return (
                <li
                  key={entry.label}
                  className="flex items-center justify-between gap-4 rounded-md border border-bronze/30 bg-carbon/40 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-text-primary">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
                    />
                    {entry.label}
                  </span>
                  <span className="flex items-center gap-3 text-text-primary">
                    <span className="tabular-nums">{numberFormatter.format(entry.value)}</span>
                    <span className="text-xs text-secondary/70">{percent.toFixed(1)}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function SubscriptionHealthCard({
  summary,
  velocity,
  isLoading,
  newSubscriptions,
}: {
  summary: SubscriptionHealthSummary | undefined;
  velocity: Array<{ label: string; count: number }>;
  isLoading: boolean;
  newSubscriptions: number;
}) {
  const counts = [
    { label: "Active", value: summary?.active ?? 0 },
    { label: "Paused", value: summary?.paused ?? 0 },
    { label: "Cancelled", value: summary?.cancelled ?? 0 },
    { label: "Completed", value: summary?.completed ?? 0 },
  ];
  const lifecycleTotal = counts.reduce((sum, entry) => sum + entry.value, 0);
  const retentionRate = lifecycleTotal > 0 ? Math.min(100, (counts[0].value / lifecycleTotal) * 100) : null;

  return (
    <section className="card-surface space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
            <Repeat size={16} className="text-secondary" />
            <span>Subscription health</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Lifecycle mix plus new creations in this window.</p>
        </div>
        <InfoTooltip label="Source" description="Counts derived from MERCHANT_SUBSCRIPTION_STATUS_QUERY (Envio GraphQL)." />
      </header>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-md" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {counts.map((entry) => (
              <div key={entry.label} className="rounded-md border border-bronze/40 bg-carbon/50 p-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">{entry.label}</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{entry.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-bronze/40 bg-carbon/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">New this range</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{newSubscriptions.toLocaleString()}</p>
              <p className="mt-1 text-[11px] text-text-muted">Subscriptions created within the selected dates.</p>
            </div>
            <div className="rounded-md border border-bronze/40 bg-carbon/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">Retention signal</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">
                {retentionRate != null ? `${retentionRate.toFixed(1)}%` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-text-muted">Active share of lifecycle mix.</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">New subscriptions cadence</p>
            <div className="h-32">
              {!velocity.length ? (
                <EmptyState message="No new subscriptions during this window." />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={velocity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2330" />
                    <XAxis dataKey="label" stroke="#A1A8BD" hide={velocity.length > 10} />
                    <YAxis stroke="#A1A8BD" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#151820", borderRadius: 12, border: "1px solid #2A2F3A", color: "#E5E7EB" }}
                    />
                    <Bar dataKey="count" fill="#c9a961" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ExecutionReliabilityCard({
  isLoading,
  successRate,
  averageLatencySeconds,
  failureCount,
  successCount,
  latencySamples,
  warning,
  incidentsUrl,
  score,
}: {
  isLoading: boolean;
  successRate: number | null;
  averageLatencySeconds: number | null;
  failureCount: number;
  successCount: number;
  latencySamples: number;
  warning: boolean;
  incidentsUrl: string;
  score: number | null;
}) {
  const attempts = successCount + failureCount;
  const formattedSuccessRate =
    successRate != null ? `${successRate.toFixed(1)}%` : "—";
  let formattedLatency = "—";
  if (averageLatencySeconds != null) {
    if (averageLatencySeconds >= 1) {
      formattedLatency = `${averageLatencySeconds.toFixed(1)}s`;
    } else {
      formattedLatency = `${Math.round(averageLatencySeconds * 1000)}ms`;
    }
  }
  const formattedFailures = failureCount.toLocaleString();
  const formattedAttempts = attempts.toLocaleString();
  const formattedScore = score != null ? `${score.toFixed(1)}` : "—";

  return (
    <section className="card-surface space-y-4 p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
            <Gauge size={16} className="text-secondary" />
            <span>Execution reliability</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Protocol-grade execution measured from intent signing to on-chain settlement.
          </p>
        </div>
        <a
          href={incidentsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-secondary/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-secondary transition hover:border-secondary hover:text-secondary"
        >
          View incidents
        </a>
      </header>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : (
        <>
          {warning ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              <AlertTriangle size={14} />
              <span>Investigate relayer or RPC health—success rate or latency is outside the safe band.</span>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReliabilityStat
              label="Success rate"
              value={formattedSuccessRate}
              hint={attempts ? `Across ${formattedAttempts} attempts` : undefined}
            />
            <ReliabilityStat
              label="Avg execution latency"
              value={formattedLatency}
              hint={
                latencySamples
                  ? `Calculated from ${latencySamples.toLocaleString()} settled payments`
                  : "No settled payments in range"
              }
            />
            <ReliabilityStat
              label="Failed / retried"
              value={formattedFailures}
              hint={failureCount ? "Counted from PaymentFailed events" : "No retries recorded"}
            />
            <ReliabilityStat
              label="Protocol score"
              value={formattedScore}
              hint="60% success + 40% latency"
            />
          </div>
        </>
      )}
    </section>
  );
}

function ReliabilityStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-bronze/40 bg-carbon/50 p-4">
      <p className="text-[10px] uppercase tracking-[0.3em] text-secondary/70">{label}</p>
      <p className="mt-2 text-xl font-semibold text-text-primary">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

function IndexingFreshnessCard({
  isLoading,
  latestBlock,
  chainId,
  syncLagSeconds,
  blocksBehind,
  graphLatencyMs,
  warning,
  indexerVersion,
  indexerScore,
  indexingLatencyMs,
}: {
  isLoading: boolean;
  latestBlock: number | null;
  chainId: number | null;
  syncLagSeconds: number | null;
  blocksBehind: number | null;
  graphLatencyMs: number | null;
  warning: boolean;
  indexerVersion: string | null;
  indexerScore: number | null;
  indexingLatencyMs: number | null;
}) {
  const blockLabel = latestBlock ? `#${latestBlock.toLocaleString()}` : "—";
  const chainLabel = chainId ? getChainName(chainId) : undefined;
  const lagLabel =
    syncLagSeconds != null ? `${syncLagSeconds.toLocaleString()}s` : "—";
  const graphLabel =
    graphLatencyMs != null ? `${graphLatencyMs.toFixed(0)}ms` : "—";
  const indexerLatencyLabel =
    indexingLatencyMs != null ? `${(indexingLatencyMs / 1000).toFixed(1)}s` : "—";
  const indexerScoreLabel =
    indexerScore != null ? `${indexerScore.toFixed(1)}` : "—";

  return (
    <section className="card-surface space-y-4 p-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
          <Activity size={16} className="text-secondary" />
          <span>Indexing freshness</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Live Envio indexing health plus client-side GraphQL responsiveness for this page.
        </p>
      </header>
      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-md" />
      ) : (
        <>
          {warning && blocksBehind != null ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-400/60 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              <AlertTriangle size={14} />
              <span>Data ~{blocksBehind.toLocaleString()} blocks behind. Check Envio sync status.</span>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReliabilityStat label="Latest indexed block" value={blockLabel} hint={chainLabel} />
            <ReliabilityStat label="Sync lag" value={lagLabel} hint="Seconds behind head" />
            <ReliabilityStat label="GraphQL response" value={graphLabel} hint="Avg of active queries" />
            <ReliabilityStat
              label="Indexer score"
              value={indexerScoreLabel}
              hint={indexerVersion ? `Envio ${indexerVersion}` : "Latency-weighted health"}
            />
            <ReliabilityStat
              label="Indexer latency"
              value={indexerLatencyLabel}
              hint="Sync loop round-trip"
            />
          </div>
        </>
      )}
    </section>
  );
}

function ProtocolHealthCard({
  isLoading,
  summary,
}: {
  isLoading: boolean;
  summary: MerchantPerformanceSummary | undefined;
}) {
  const totalRevenueUsd = summary ? Number(summary.totalRevenueUsdCents) / 100 : 0;
  const averagePaymentUsd = summary ? Number(summary.averagePaymentValueUsdCents) / 100 : 0;
  const totalAttempts = summary ? summary.successfulPayments + summary.failedPayments : 0;
  const successRate = totalAttempts
    ? (summary!.successfulPayments / totalAttempts) * 100
    : null;
  const successLabel = successRate != null ? `${successRate.toFixed(1)}%` : "—";
  const performanceLabel = summary?.performanceScore != null ? `${summary.performanceScore.toFixed(1)}` : "—";
  const lastPaymentLabel = summary?.lastPaymentAt
    ? new Date(summary.lastPaymentAt * 1000).toLocaleString()
    : "—";

  return (
    <section className="card-surface space-y-4 p-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
          <Gauge size={16} className="text-secondary" />
          <span>Protocol health</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Lifetime execution quality blended from success ratio and on-chain latency.
        </p>
      </header>
      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : !summary ? (
        <EmptyState message="No merchant performance data yet." />
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <ReliabilityStat
            label="Performance score"
            value={performanceLabel}
            hint="60% success + 40% latency"
          />
          <ReliabilityStat
            label="Lifetime revenue"
            value={currencyFormatter.format(totalRevenueUsd)}
            hint="USD equivalent across tokens"
          />
          <ReliabilityStat
            label="Avg payment value"
            value={currencyFormatter.format(averagePaymentUsd)}
            hint="Weighted by USD"
          />
          <ReliabilityStat
            label="Success rate"
            value={successLabel}
            hint={`${summary.successfulPayments.toLocaleString()} ok / ${summary.failedPayments.toLocaleString()} fail`}
          />
          <ReliabilityStat
            label="Active subscriptions"
            value={summary.activeSubscriptions.toLocaleString()}
            hint={`${summary.totalSubscriptions.toLocaleString()} total`}
          />
          <ReliabilityStat
            label="Last execution"
            value={lastPaymentLabel}
            hint="Across entire history"
          />
        </div>
      )}
    </section>
  );
}

function RelayerPerformanceCard({
  relayers,
  isLoading,
}: {
  relayers: RelayerPerformanceSummary[];
  isLoading: boolean;
}) {
  return (
    <section className="card-surface space-y-4 p-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-text-primary">
          <SignalHigh size={16} className="text-secondary" />
          <span>Relayer performance</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Top relayers ranked by blended score. Success ratio and latency drive the ranking.
        </p>
      </header>
      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-md" />
      ) : !relayers.length ? (
        <EmptyState message="No relayer executions recorded yet." />
      ) : (
        <div className="space-y-2">
          {relayers.map((relayer) => {
            const total = relayer.successfulExecutions + relayer.failedExecutions;
            const successRate = total ? (relayer.successfulExecutions / total) * 100 : null;
            const latencyLabel =
              relayer.averageLatencySeconds != null
                ? `${relayer.averageLatencySeconds.toFixed(1)}s`
                : "—";
            const updatedLabel = relayer.updatedAt
              ? new Date(relayer.updatedAt * 1000).toLocaleTimeString()
              : "—";
            return (
              <div
                key={relayer.id}
                className="flex flex-col gap-2 rounded-md border border-bronze/40 bg-carbon/40 px-3 py-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3 text-text-primary">
                  <span className="text-sm font-semibold">
                    {shortenAddress(relayer.relayer)}
                  </span>
                  <span className="rounded-full border border-secondary/40 px-2 py-[2px] text-[10px] uppercase tracking-[0.3em] text-secondary/80">
                    {getChainName(relayer.chainId)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span>{`Exec ${relayer.executions.toLocaleString()}`}</span>
                  <span>{successRate != null ? `Success ${successRate.toFixed(1)}%` : "—"}</span>
                  <span>{`Latency ${latencyLabel}`}</span>
                  <span>{`Score ${relayer.performanceScore != null ? relayer.performanceScore.toFixed(1) : "—"}`}</span>
                  <span>{`Updated ${updatedLabel}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-bronze/40 bg-carbon/40 px-4 text-sm text-text-muted">
      {message}
    </div>
  );
}

function buildTokenOptions(points: MerchantSeriesPoint[]): string[] {
  const tokens = new Set<string>();
  points.forEach((point) => {
    const symbol = (point.tokenSymbol ?? "UNKNOWN").toUpperCase();
    tokens.add(symbol);
  });
  return Array.from(tokens.values()).sort();
}

function valueForPoint(point: MerchantSeriesPoint): number {
  if (point.usdValueCents != null) {
    return Number(point.usdValueCents) / 100;
  }
  const decimals = tokenDecimalsForSymbol(point.tokenSymbol ?? undefined);
  return Number.parseFloat(formatTokenAmount(point.amount, decimals, 8)) || 0;
}

function buildRevenueTimeline(points: MerchantSeriesPoint[]): Array<{ label: string; value: number }> {
  const buckets = new Map<string, { total: number; date: Date }>();
  points.forEach((point) => {
    const date = new Date(point.timestamp * 1000);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
    const entry = buckets.get(key) ?? { total: 0, date };
    entry.total += valueForPoint(point);
    entry.date = date;
    buckets.set(key, entry);
  });
  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(entry.date),
      value: Number(entry.total.toFixed(4)),
    }));
}

function buildMixData(points: MerchantSeriesPoint[], keyFn: (point: MerchantSeriesPoint) => string): MixDatum[] {
  const totals = new Map<string, number>();
  points.forEach((point) => {
    const key = keyFn(point);
    totals.set(key, (totals.get(key) ?? 0) + valueForPoint(point));
  });
  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value: Number(value.toFixed(4)) }))
    .sort((a, b) => b.value - a.value);
}

function buildSubscriptionVelocity(timestamps: number[]): Array<{ label: string; count: number }> {
  if (!timestamps.length) return [];
  const buckets = new Map<number, number>();
  timestamps.forEach((timestamp) => {
    if (!timestamp) return;
    const date = new Date(timestamp * 1000);
    date.setHours(0, 0, 0, 0);
    const key = date.getTime();
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, count]) => ({
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(time)),
      count,
    }));
}

function formatRangeLabel(range: DateRange): string {
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  return `${formatter.format(range.start)} — ${formatter.format(range.end)}`;
}

function createDefaultDateRange(): DateRange {
  const end = endOfDayLocal(new Date());
  const startSeed = new Date(end);
  startSeed.setDate(startSeed.getDate() - 29);
  const start = startOfDayLocal(startSeed);
  return { start, end };
}

function startOfDayLocal(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDayLocal(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}
