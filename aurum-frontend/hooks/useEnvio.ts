"use client";

import { useQuery } from "@tanstack/react-query";
import { startOfMonth, subMonths } from "date-fns";
import { tokenDecimalsForSymbol } from "@/lib/utils";
import { extractGraphOperationName, recordGraphOperationMetric } from "@/lib/graphMetrics";

const ENVO_ENDPOINT = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_ENDPOINT;
const ENVO_EXPLORER_URL = process.env.NEXT_PUBLIC_ENVIO_EXPLORER_URL;
const THIRTY_DAY_SECONDS = 30 * 24 * 60 * 60;

async function graphRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!ENVO_ENDPOINT) {
    throw new Error("Envio GraphQL endpoint missing");
  }

  const operationName = extractGraphOperationName(query);
  const now = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());
  const start = now();

  try {
    const response = await fetch(ENVO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await response.json();

    if (payload.errors) {
      throw new Error(payload.errors[0]?.message ?? "Unknown Envio error");
    }

    return payload.data as T;
  } finally {
    const duration = now() - start;
    recordGraphOperationMetric(operationName, duration);
  }
}

type MerchantTokenStats = {
  token: string;
  tokenSymbol: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: string;
  totalPayments: number;
  chainId: number;
  averageTransactionValue: string;
};

type MerchantTokenStatsData = {
  MerchantTokenStats: MerchantTokenStats[];
};

type CrossChainAttestation = {
  id: string;
  paymentNumber: number;
  chainId: number;
  token?: string | null;
  amount?: string | null;
  verified: boolean;
  timestamp: string;
};

type CrossChainAttestationData = {
  CrossChainAttestation: CrossChainAttestation[];
};

type SubscriptionEntity = {
  id: string;
  subscriptionId: string;
  subscriber: string;
  merchant: string;
  amount: string;
  interval: number | string;
  maxPayments: number | string;
  maxTotalAmount: string;
  expiry: number | string;
  status: string;
  token: string;
  tokenSymbol: string;
  createdAt: number | string;
  startTime: number | string;
  paymentsExecuted: number | string;
  totalAmountPaid: string;
  chainId: number | string;
  createdAtBlock?: number;
};

type SubscriptionQueryResponse = {
  Subscription: SubscriptionEntity[];
};

type PaymentEntity = {
  id: string;
  subscriptionId: string;
  paymentNumber: number | string;
  amount: string;
  fee: string;
  token: string;
  tokenSymbol: string | null;
  subscriber: string;
  merchant: string;
  relayer: string;
  txHash: string;
  blockNumber: number | string;
  timestamp: number | string;
  chainId: number | string;
  nexusAttestationId?: string | null;
  nexusVerified: boolean;
  executedAt?: number | string;
  expectedAt?: number | string | null;
  intentSignedAt?: number | string | null;
  latencySeconds?: number | null;
  usdValue?: string | null;
  tokenDecimals?: number | null;
  relayerPerformanceId?: string | null;
  merchantPerformanceId?: string | null;
};

type PaymentQueryResponse = {
  Payment: PaymentEntity[];
};

type MerchantDashboardStatsData = {
  total: { aggregate: { count: number } | null } | null;
  active: { aggregate: { count: number } | null } | null;
  payments: {
    aggregate: { count: number; sum: { amount: string | null } | null } | null;
  } | null;
  month: { aggregate: { sum: { amount: string | null } | null } | null } | null;
  prevMonth: { aggregate: { sum: { amount: string | null } | null } | null } | null;
  activeSubscriptionsList: Array<{
    amount: string;
    interval: number | string;
    tokenSymbol: string | null;
  subscriber: string;
  merchant: string;
  }>;
};

type MerchantPerformanceRow = {
  id: string;
  merchant: string;
  totalRevenue: string;
  totalPayments: string;
  successfulPayments: string;
  failedPayments: string;
  latencyTotalSeconds: string;
  latencySamples: string;
  averageLatencySeconds?: number | null;
  averagePaymentValue: string | null;
  activeSubscriptions: string;
  totalSubscriptions: string;
  performanceScore?: number | null;
  lastPaymentAt?: number | string | null;
  updatedAt: number | string;
};

type MerchantPerformanceData = {
  MerchantPerformance: MerchantPerformanceRow[];
};

type RelayerPerformanceRow = {
  id: string;
  relayer: string;
  chainId: number | string;
  executions: string;
  successfulExecutions: string;
  failedExecutions: string;
  totalFees: string;
  latencyTotalSeconds: string;
  latencySamples: string;
  averageLatencySeconds?: number | null;
  performanceScore?: number | null;
  updatedAt: number | string;
};

type RelayerPerformanceData = {
  RelayerPerformance: RelayerPerformanceRow[];
};

type IndexerMetaRow = {
  id: string;
  chainId: number | string;
  latestIndexedBlock: string;
  latestIndexedTimestamp: string;
  indexingLatencyMs: string | null;
  lastSyncTimestamp: string;
  envioVersion: string | null;
  performanceScore?: number | null;
};

type IndexerMetaData = {
  IndexerMeta: IndexerMetaRow[];
};

type MerchantTransactionsData = {
  Payment: PaymentEntity[];
  Payment_aggregate: {
    aggregate: { count: number; sum: { amount: string | null } | null } | null;
  };
};

type MerchantPaymentsSeriesData = {
  Payment: Array<{
    id: string;
    subscriptionId: string;
    subscriber: string;
    merchant: string;
    amount: string;
    timestamp: number | string;
    chainId: number | string;
    tokenSymbol: string | null;
    paymentNumber: number | string;
    executedAt?: number | string;
    expectedAt?: number | string | null;
    intentSignedAt?: number | string | null;
    latencySeconds?: number | null;
    usdValue?: string | null;
    tokenDecimals?: number | null;
  }>;
};

type MerchantSubscribersData = {
  payments: Array<{
    id: string;
    subscriber: string;
    amount: string;
    timestamp: number | string;
    subscriptionId: string;
    chainId: number | string;
  }>;
  subscriptions: Array<{
    id: string;
    subscriber: string;
    status: string;
  }>;
};

type EnvioLatestBlockData = {
  Payment: Array<{
    blockNumber: number | string;
    timestamp: number | string;
    chainId: number | string;
  }>;
};

export type MerchantStatsSummary = {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalPayments: number;
  totalRevenue: bigint;
  monthRevenue: bigint;
  prevMonthRevenue: bigint;
  mrr: number;
};

export type MerchantTransactionRow = {
  id: string;
  subscriptionId: string;
  paymentNumber: number;
  subscriber: string;
  merchant: string;
  amount: string;
  fee: string;
  token: string;
  tokenSymbol: string | null;
  relayer: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  chainId: number;
  executedAt?: number | null;
  expectedAt?: number | null;
  intentSignedAt?: number | null;
  latencySeconds?: number | null;
  usdValue?: string | null;
  tokenDecimals?: number | null;
  nexusAttestationId?: string | null;
  nexusVerified: boolean;
  relayerPerformanceId?: string | null;
  merchantPerformanceId?: string | null;
};

export type MerchantTransactionsResult = {
  transactions: MerchantTransactionRow[];
  totalCount: number;
  totalRevenue: bigint;
};

export type MerchantTransactionsOptions = {
  page?: number;
  pageSize?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  search?: string;
  subscriber?: string | null;
  chainId?: number | null;
};

export type MerchantSeriesPoint = {
  id: string;
  subscriptionId: string;
  subscriber: string;
  merchant: string;
  timestamp: number;
  amount: bigint;
  chainId: number;
  tokenSymbol: string | null;
  paymentNumber: number;
  executedAt?: number | null;
  expectedAt?: number | null;
  intentSignedAt?: number | null;
  latencySeconds?: number | null;
  usdValueCents?: bigint;
  tokenDecimals?: number | null;
};

export type MerchantPerformanceSummary = {
  totalRevenueUsdCents: bigint;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averageLatencySeconds: number | null;
  averagePaymentValueUsdCents: bigint;
  activeSubscriptions: number;
  totalSubscriptions: number;
  performanceScore: number | null;
  lastPaymentAt: number | null;
  updatedAt: number | null;
};

export type RelayerPerformanceSummary = {
  id: string;
  relayer: string;
  chainId: number;
  executions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalFees: bigint;
  averageLatencySeconds: number | null;
  performanceScore: number | null;
  updatedAt: number | null;
};

export type IndexerMetaSummary = {
  chainId: number;
  latestIndexedBlock: number;
  latestIndexedTimestamp: number;
  indexingLatencyMs: number | null;
  lastSyncTimestamp: number;
  envioVersion: string | null;
  performanceScore: number | null;
};

export type MerchantSubscriberSummary = {
  subscriber: string;
  totalPaid: bigint;
  payments: number;
  lastPaymentAt: number;
  activeSubscriptions: number;
  subscriptionIds: number;
};

export type EnvioHealthSummary = {
  latestBlock: number | null;
  chainId: number | null;
  timestamp: number | null;
};

type PaymentFailureEntry = {
  id: string;
  subscriptionId: string;
  merchant: string;
  amount: string;
  reason: string;
};

type MerchantPaymentFailuresData = {
  SubscribtionManager_PaymentFailed: PaymentFailureEntry[];
};

type SubscriptionScheduleRow = {
  subscriptionId: string;
  startTime: number | string;
  interval: number | string;
  createdAt: number | string;
  status: string;
};

type SubscriptionsByIdsData = {
  Subscription: SubscriptionScheduleRow[];
};

type MerchantSubscriptionStatusData = {
  active: { aggregate: { count: number } | null } | null;
  paused: { aggregate: { count: number } | null } | null;
  cancelled: { aggregate: { count: number } | null } | null;
  completed: { aggregate: { count: number } | null } | null;
  newSubscriptions: { aggregate: { count: number } | null } | null;
  recentSubscriptions: Array<{ id: string; createdAt: number | string }>;
  subscriptionDetails: Array<{
    subscriptionId: string;
    interval: number | string;
    startTime: number | string;
    status: string;
  }>;
};

export type SubscriptionMetadata = {
  subscriptionId: string;
  interval: number;
  startTime: number;
  status: string;
  createdAt?: number;
};

export type SubscriptionHealthSummary = {
  active: number;
  paused: number;
  cancelled: number;
  completed: number;
  newInWindow: number;
  recentSubscriptionTimestamps: number[];
  metadata: Map<string, SubscriptionMetadata>;
};

function toBigIntSafe(value: string | null | undefined): bigint {
  if (!value) return BigInt(0);
  try {
    return BigInt(value);
  } catch {
    return BigInt(0);
  }
}

function toNumberSafe(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toMerchantTransactionRow(payment: PaymentEntity): MerchantTransactionRow {
  const subscriptionId = payment.subscriptionId;
  return {
    id: payment.id,
    subscriptionId,
    paymentNumber: toNumberSafe(payment.paymentNumber),
    subscriber: payment.subscriber ?? "",
    merchant: payment.merchant ?? "",
    amount: payment.amount,
    fee: payment.fee,
    token: payment.token,
    tokenSymbol: payment.tokenSymbol ?? null,
    relayer: payment.relayer ?? "",
    txHash: payment.txHash,
    blockNumber: toNumberSafe(payment.blockNumber),
    timestamp: toNumberSafe(payment.timestamp),
    chainId: toNumberSafe(payment.chainId),
    executedAt: payment.executedAt != null ? toNumberSafe(payment.executedAt) : null,
    expectedAt: payment.expectedAt != null ? toNumberSafe(payment.expectedAt) : null,
    intentSignedAt: payment.intentSignedAt != null ? toNumberSafe(payment.intentSignedAt) : null,
    latencySeconds: payment.latencySeconds ?? null,
    usdValue: payment.usdValue ?? null,
    tokenDecimals: payment.tokenDecimals ?? null,
    nexusAttestationId: payment.nexusAttestationId ?? null,
    nexusVerified: payment.nexusVerified ?? false,
    relayerPerformanceId: payment.relayerPerformanceId ?? null,
    merchantPerformanceId: payment.merchantPerformanceId ?? null,
  };
}

function toHumanAmount(amount: string | null | undefined, tokenSymbol?: string | null): number {
  if (!amount) return 0;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 0;
  const decimals = tokenDecimalsForSymbol(tokenSymbol ?? undefined);
  return numeric / 10 ** decimals;
}

function toTimestampSeconds(date: Date): string {
  return Math.floor(date.getTime() / 1000).toString();
}

function buildMerchantWhere(
  merchant: string | undefined,
  options: MerchantTransactionsOptions
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (merchant) {
    where.merchant = { _eq: merchant };
  }

  const timestampFilters: Record<string, string> = {};
  if (options.startDate) {
    timestampFilters._gte = toTimestampSeconds(options.startDate);
  }
  if (options.endDate) {
    timestampFilters._lte = toTimestampSeconds(options.endDate);
  }
  if (Object.keys(timestampFilters).length > 0) {
    where.timestamp = timestampFilters;
  }

  if (options.subscriber) {
    where.subscriber = { _eq: options.subscriber.toLowerCase() };
  }

  if (typeof options.chainId === "number") {
    where.chainId = { _eq: options.chainId };
  }

  const searchValue = options.search?.trim().toLowerCase();
  if (searchValue) {
    where._or = [
      { subscriber: { _ilike: `%${searchValue}%` } },
      { subscriptionId: { _ilike: `%${searchValue}%` } },
      { txHash: { _ilike: `%${searchValue}%` } },
    ];
  }

  return where;
}

export const MERCHANT_TOKEN_STATS_QUERY = /* GraphQL */ `
  query MerchantTokenStats($merchant: String!) {
    MerchantTokenStats(where: { merchant: { _eq: $merchant } }) {
      token
      tokenSymbol
      totalSubscriptions
      activeSubscriptions
      totalRevenue
      totalPayments
      chainId
      averageTransactionValue
    }
  }
`;

const CROSS_CHAIN_ATTESTATIONS_QUERY = /* GraphQL */ `
  query CrossChainAttestations($subscriptionId: String!) {
    CrossChainAttestation(
      where: { subscriptionId: { _eq: $subscriptionId } }
      order_by: { timestamp: desc }
    ) {
      id
      paymentNumber
      chainId
      token
      amount
      verified
      timestamp
    }
  }
`;

const USER_SUBSCRIPTIONS_QUERY = /* GraphQL */ `
  query UserSubscriptions($subscriber: String!) {
    Subscription(
      where: { subscriber: { _eq: $subscriber } }
      order_by: { createdAt: desc }
    ) {
      id
      subscriptionId
      subscriber
      merchant
      amount
      interval
      maxPayments
      maxTotalAmount
      expiry
      status
      token
      tokenSymbol
      createdAt
      startTime
      paymentsExecuted
      totalAmountPaid
      chainId
      createdAtBlock
    }
  }
`;

const SUBSCRIPTION_DETAIL_QUERY = /* GraphQL */ `
  query SubscriptionDetail($subscriptionId: String!) {
    Subscription(where: { subscriptionId: { _eq: $subscriptionId } }, limit: 1) {
      id
      subscriptionId
      subscriber
      merchant
      amount
      interval
      maxPayments
      maxTotalAmount
      expiry
      status
      token
      tokenSymbol
      createdAt
      startTime
      paymentsExecuted
      totalAmountPaid
      chainId
      createdAtBlock
    }
  }
`;

const PAYMENT_HISTORY_QUERY = /* GraphQL */ `
  query SubscriptionPayments($subscriptionId: String!) {
    Payment(
      where: { subscriptionId: { _eq: $subscriptionId } }
      order_by: { paymentNumber: asc }
    ) {
      id
      subscriptionId
      paymentNumber
      amount
      fee
      token
      tokenSymbol
      relayer
      txHash
      blockNumber
      timestamp
      chainId
      nexusAttestationId
      nexusVerified
    }
  }
`;

export const MERCHANT_DASHBOARD_STATS_QUERY = /* GraphQL */ `
  query MerchantDashboardStats(
    $merchant: String!
    $monthStart: bigint!
    $prevMonthStart: bigint!
    $prevMonthEnd: bigint!
  ) {
    total: Subscription_aggregate(where: { merchant: { _eq: $merchant } }) {
      aggregate {
        count
      }
    }
    active: Subscription_aggregate(
      where: { merchant: { _eq: $merchant }, status: { _eq: "ACTIVE" } }
    ) {
      aggregate {
        count
      }
    }
    payments: Payment_aggregate(where: { merchant: { _eq: $merchant } }) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }
    month: Payment_aggregate(
      where: { merchant: { _eq: $merchant }, timestamp: { _gte: $monthStart } }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    prevMonth: Payment_aggregate(
      where: {
        merchant: { _eq: $merchant }
        timestamp: { _gte: $prevMonthStart, _lt: $prevMonthEnd }
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    activeSubscriptionsList: Subscription(
      where: { merchant: { _eq: $merchant }, status: { _eq: "ACTIVE" } }
      limit: 200
    ) {
      amount
      interval
      tokenSymbol
    }
  }
`;

export const MERCHANT_TRANSACTIONS_QUERY = /* GraphQL */ `
  query MerchantTransactions($where: Payment_bool_exp!, $limit: Int!, $offset: Int!) {
    Payment(where: $where, order_by: { timestamp: desc }, limit: $limit, offset: $offset) {
      id
      subscriptionId
      subscriber
      merchant
      amount
      fee
      token
      tokenSymbol
      relayer
      txHash
      blockNumber
      timestamp
      chainId
    }
    Payment_aggregate(where: $where) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }
  }
`;

export const MERCHANT_PAYMENTS_SERIES_QUERY = /* GraphQL */ `
  query MerchantPaymentsSeries($where: Payment_bool_exp!) {
    Payment(where: $where, order_by: { timestamp: asc }, limit: 1000) {
      id
      subscriptionId
      subscriber
      amount
      timestamp
      chainId
      tokenSymbol
      paymentNumber
      executedAt
      expectedAt
      intentSignedAt
      latencySeconds
      usdValue
      tokenDecimals
      relayerPerformanceId
      merchantPerformanceId
    }
  }
`;

export const MERCHANT_SUBSCRIBERS_QUERY = /* GraphQL */ `
  query MerchantSubscribers($merchant: String!) {
    payments: Payment(
      where: { merchant: { _eq: $merchant } }
      order_by: { timestamp: desc }
      limit: 1000
    ) {
      id
      subscriber
      amount
      timestamp
      subscriptionId
      chainId
    }
    subscriptions: Subscription(where: { merchant: { _eq: $merchant } }) {
      id
      subscriber
      status
    }
  }
`;

export const ENVIO_LATEST_BLOCK_QUERY = /* GraphQL */ `
  query EnvioLatestBlock($merchant: String!) {
    Payment(
      where: { merchant: { _eq: $merchant } }
      order_by: { blockNumber: desc }
      limit: 1
    ) {
      blockNumber
      timestamp
      chainId
    }
  }
`;

export const MERCHANT_SUBSCRIPTION_STATUS_QUERY = /* GraphQL */ `
  query MerchantSubscriptionStatus($merchant: String!, $windowStart: bigint!, $windowEnd: bigint!) {
    active: Subscription_aggregate(
      where: {
        merchant: { _eq: $merchant }
        status: { _eq: "ACTIVE" }
        createdAt: { _gte: $windowStart, _lte: $windowEnd }
      }
    ) {
      aggregate {
        count
      }
    }
    paused: Subscription_aggregate(
      where: {
        merchant: { _eq: $merchant }
        status: { _eq: "PAUSED" }
        createdAt: { _gte: $windowStart, _lte: $windowEnd }
      }
    ) {
      aggregate {
        count
      }
    }
    cancelled: Subscription_aggregate(
      where: {
        merchant: { _eq: $merchant }
        status: { _eq: "CANCELLED" }
        createdAt: { _gte: $windowStart, _lte: $windowEnd }
      }
    ) {
      aggregate {
        count
      }
    }
    completed: Subscription_aggregate(
      where: {
        merchant: { _eq: $merchant }
        status: { _eq: "COMPLETED" }
        createdAt: { _gte: $windowStart, _lte: $windowEnd }
      }
    ) {
      aggregate {
        count
      }
    }
    newSubscriptions: Subscription_aggregate(
      where: { merchant: { _eq: $merchant }, createdAt: { _gte: $windowStart, _lte: $windowEnd } }
    ) {
      aggregate {
        count
      }
    }
    recentSubscriptions: Subscription(
      where: { merchant: { _eq: $merchant }, createdAt: { _gte: $windowStart, _lte: $windowEnd } }
      order_by: { createdAt: asc }
      limit: 200
    ) {
      id
      createdAt
    }
    subscriptionDetails: Subscription(
      where: { merchant: { _eq: $merchant } }
      order_by: { createdAt: desc }
      limit: 500
    ) {
      subscriptionId
      interval
      startTime
      status
    }
  }
`;

export const MERCHANT_PAYMENT_FAILURES_QUERY = /* GraphQL */ `
  query MerchantPaymentFailures($merchant: String!, $limit: Int!) {
    SubscribtionManager_PaymentFailed(
      where: { merchant: { _eq: $merchant } }
      order_by: { id: desc }
      limit: $limit
    ) {
      id
      subscriptionId
      merchant
      amount
      reason
    }
  }
`;

export const SUBSCRIPTIONS_BY_IDS_QUERY = /* GraphQL */ `
  query SubscriptionsById($ids: [String!]) {
    Subscription(where: { subscriptionId: { _in: $ids } }) {
      subscriptionId
      startTime
      interval
      createdAt
      status
    }
  }
`;

export const MERCHANT_PERFORMANCE_QUERY = /* GraphQL */ `
  query MerchantPerformance($merchant: String!) {
    MerchantPerformance(where: { merchant: { _eq: $merchant } }, limit: 1) {
      id
      merchant
      totalRevenue
      totalPayments
      successfulPayments
      failedPayments
      latencyTotalSeconds
      latencySamples
      averageLatencySeconds
      averagePaymentValue
      activeSubscriptions
      totalSubscriptions
      performanceScore
      lastPaymentAt
      updatedAt
    }
  }
`;

export const RELAYER_PERFORMANCE_QUERY = /* GraphQL */ `
  query RelayerPerformance($limit: Int!) {
    RelayerPerformance(order_by: { updatedAt: desc }, limit: $limit) {
      id
      relayer
      chainId
      executions
      successfulExecutions
      failedExecutions
      totalFees
      latencyTotalSeconds
      latencySamples
      averageLatencySeconds
      performanceScore
      updatedAt
    }
  }
`;

export const INDEXER_META_QUERY = /* GraphQL */ `
  query IndexerMeta {
    IndexerMeta(order_by: { chainId: asc }) {
      id
      chainId
      latestIndexedBlock
      latestIndexedTimestamp
      indexingLatencyMs
      lastSyncTimestamp
      envioVersion
      performanceScore
    }
  }
`;

export function useMerchantStats(merchantAddress: string | undefined) {
  const merchant = normaliseAddress(merchantAddress);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));

  return useQuery({
    queryKey: ["envio", "merchant", "dashboard-stats", merchant],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 300_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantDashboardStatsData>(MERCHANT_DASHBOARD_STATS_QUERY, {
        merchant,
        monthStart: toTimestampSeconds(monthStart),
        prevMonthStart: toTimestampSeconds(prevMonthStart),
        prevMonthEnd: toTimestampSeconds(monthStart),
      }),
    select: (data): MerchantStatsSummary => {
      const activeList = data.activeSubscriptionsList ?? [];
      const mrr = activeList.reduce((total, subscription) => {
        const interval = toNumberSafe(subscription.interval);
        if (interval <= 0) return total;
        const amount = toHumanAmount(subscription.amount, subscription.tokenSymbol);
        if (!Number.isFinite(amount)) return total;
        return total + (amount / interval) * THIRTY_DAY_SECONDS;
      }, 0);

      return {
        totalSubscriptions: data.total?.aggregate?.count ?? 0,
        activeSubscriptions: data.active?.aggregate?.count ?? 0,
        totalPayments: data.payments?.aggregate?.count ?? 0,
        totalRevenue: toBigIntSafe(data.payments?.aggregate?.sum?.amount ?? null),
        monthRevenue: toBigIntSafe(data.month?.aggregate?.sum?.amount ?? null),
        prevMonthRevenue: toBigIntSafe(data.prevMonth?.aggregate?.sum?.amount ?? null),
        mrr,
      };
    },
  });
}

export function useMerchantTransactions(
  merchantAddress: string | undefined,
  options: MerchantTransactionsOptions = {}
) {
  const merchant = normaliseAddress(merchantAddress);
  const pageSize = options.pageSize ?? 10;
  const page = options.page ?? 0;
  const offset = page * pageSize;
  const where = buildMerchantWhere(merchant, options);
  const serializedWhere = JSON.stringify(where);

  const query = useQuery({
    queryKey: [
      "envio",
      "merchant",
      "transactions",
      merchant,
      pageSize,
      offset,
      serializedWhere,
    ],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantTransactionsData>(MERCHANT_TRANSACTIONS_QUERY, {
        where: JSON.parse(serializedWhere),
        limit: pageSize,
        offset,
      }),
    select: (data): MerchantTransactionsResult => ({
      transactions: data.Payment.map(toMerchantTransactionRow),
      totalCount: data.Payment_aggregate.aggregate?.count ?? 0,
      totalRevenue: toBigIntSafe(data.Payment_aggregate.aggregate?.sum?.amount ?? null),
    }),
  });

  const exportCsv = async (maxRows = 1000): Promise<MerchantTransactionRow[]> => {
    if (!ENVO_ENDPOINT || !merchant) {
      return [];
    }
    const exportData = await graphRequest<MerchantTransactionsData>(
      MERCHANT_TRANSACTIONS_QUERY,
      {
        where: JSON.parse(serializedWhere),
        limit: maxRows,
        offset: 0,
      }
    );
    return exportData.Payment.map(toMerchantTransactionRow);
  };

  return {
    ...query,
    exportCsv,
    variables: {
      where: JSON.parse(serializedWhere),
      limit: pageSize,
      offset,
    },
  };
}

export function useMerchantPaymentsSeries(
  merchantAddress: string | undefined,
  options: Pick<MerchantTransactionsOptions, "startDate" | "endDate" | "subscriber" | "chainId"> = {}
) {
  const merchant = normaliseAddress(merchantAddress);
  const where = buildMerchantWhere(merchant, options);
  const serializedWhere = JSON.stringify(where);

  return useQuery({
    queryKey: ["envio", "merchant", "payments-series", merchant, serializedWhere],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantPaymentsSeriesData>(MERCHANT_PAYMENTS_SERIES_QUERY, {
        where: JSON.parse(serializedWhere),
      }),
    select: (data): MerchantSeriesPoint[] =>
      data.Payment.map((payment) => ({
        id: payment.id,
        subscriptionId: payment.subscriptionId,
        subscriber: payment.subscriber,
        merchant: payment.merchant,
        timestamp: toNumberSafe(payment.timestamp),
        amount: toBigIntSafe(payment.amount),
        chainId: toNumberSafe(payment.chainId),
        tokenSymbol: payment.tokenSymbol,
        paymentNumber: toNumberSafe(payment.paymentNumber),
        executedAt: payment.executedAt != null ? toNumberSafe(payment.executedAt) : null,
        expectedAt: payment.expectedAt != null ? toNumberSafe(payment.expectedAt) : null,
        intentSignedAt: payment.intentSignedAt != null ? toNumberSafe(payment.intentSignedAt) : null,
        latencySeconds: payment.latencySeconds != null ? Number(payment.latencySeconds) : null,
        usdValueCents: toBigIntSafe(payment.usdValue ?? null),
        tokenDecimals: payment.tokenDecimals != null ? Number(payment.tokenDecimals) : null,
      })),
  });
}

export function useMerchantSubscribers(merchantAddress: string | undefined) {
  const merchant = normaliseAddress(merchantAddress);

  return useQuery({
    queryKey: ["envio", "merchant", "subscribers", merchant],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 120_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantSubscribersData>(MERCHANT_SUBSCRIBERS_QUERY, {
        merchant,
      }),
    select: (data): MerchantSubscriberSummary[] => {
      const activeCounts = new Map<string, number>();
      data.subscriptions.forEach((subscription) => {
        if (subscription.status === "ACTIVE") {
          const key = subscription.subscriber.toLowerCase();
          activeCounts.set(key, (activeCounts.get(key) ?? 0) + 1);
        }
      });

      const summary = new Map<
        string,
        { totalPaid: bigint; payments: number; lastPaymentAt: number; subscriptionIds: Set<string> }
      >();

      data.payments.forEach((payment) => {
        const key = payment.subscriber.toLowerCase();
        const entry =
          summary.get(key) ??
          {
            totalPaid: BigInt(0),
            payments: 0,
            lastPaymentAt: 0,
            subscriptionIds: new Set<string>(),
          };
        entry.totalPaid += toBigIntSafe(payment.amount);
        entry.payments += 1;
        entry.lastPaymentAt = Math.max(entry.lastPaymentAt, toNumberSafe(payment.timestamp));
        entry.subscriptionIds.add(payment.subscriptionId);
        summary.set(key, entry);
      });

      return Array.from(summary.entries())
        .map(([subscriber, info]) => ({
          subscriber,
          totalPaid: info.totalPaid,
          payments: info.payments,
          lastPaymentAt: info.lastPaymentAt,
          activeSubscriptions: activeCounts.get(subscriber) ?? 0,
          subscriptionIds: info.subscriptionIds.size,
        }))
        .sort((a, b) => Number(b.totalPaid - a.totalPaid));
    },
  });
}

export function useEnvioHealth(merchantAddress: string | undefined) {
  const merchant = normaliseAddress(merchantAddress);

  return useQuery({
    queryKey: ["envio", "merchant", "envio-health", merchant],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<EnvioLatestBlockData>(ENVIO_LATEST_BLOCK_QUERY, {
        merchant,
      }),
    select: (data): EnvioHealthSummary => {
      const entry = data.Payment?.[0];
      if (!entry) {
        return {
          latestBlock: null,
          chainId: null,
          timestamp: null,
        };
      }
      return {
        latestBlock: toNumberSafe(entry.blockNumber),
        chainId: toNumberSafe(entry.chainId),
        timestamp: toNumberSafe(entry.timestamp),
      };
    },
  });
}

export function useMerchantPaymentFailures(merchantAddress: string | undefined, limit = 500) {
  const merchant = normaliseAddress(merchantAddress);

  return useQuery({
    queryKey: ["envio", "merchant", "payment-failures", merchant, limit],
    enabled: Boolean(ENVO_ENDPOINT && merchant && limit > 0),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantPaymentFailuresData>(MERCHANT_PAYMENT_FAILURES_QUERY, {
        merchant,
        limit,
      }),
    select: (data): PaymentFailureEntry[] => data.SubscribtionManager_PaymentFailed ?? [],
  });
}

export function useSubscriptionsByIds(subscriptionIds: string[]) {
  const uniqueIds = Array.from(new Set(subscriptionIds.map((id) => id.toLowerCase()))).sort();
  const enabled = Boolean(ENVO_ENDPOINT && uniqueIds.length > 0);
  const queryKey = uniqueIds.join(",");

  return useQuery({
    queryKey: ["envio", "subscriptions", queryKey],
    enabled,
    staleTime: 120_000,
    refetchInterval: 120_000,
    queryFn: () =>
      graphRequest<SubscriptionsByIdsData>(SUBSCRIPTIONS_BY_IDS_QUERY, {
        ids: uniqueIds,
      }),
    select: (data): Map<string, SubscriptionMetadata> => {
      const metadata = new Map<string, SubscriptionMetadata>();
      data.Subscription?.forEach((entry) => {
        metadata.set(entry.subscriptionId.toLowerCase(), {
          subscriptionId: entry.subscriptionId,
          interval: toNumberSafe(entry.interval),
          startTime: toNumberSafe(entry.startTime),
          status: entry.status,
          createdAt: toNumberSafe(entry.createdAt),
        });
      });
      return metadata;
    },
  });
}

export function useMerchantPerformance(merchantAddress: string | undefined) {
  const merchant = normaliseAddress(merchantAddress);

  return useQuery({
    queryKey: ["envio", "merchant", "performance", merchant],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantPerformanceData>(MERCHANT_PERFORMANCE_QUERY, {
        merchant,
      }),
    select: (data): MerchantPerformanceSummary | undefined => {
      const row = data.MerchantPerformance?.[0];
      if (!row) return undefined;

      const totalRevenue = toBigIntSafe(row.totalRevenue);
      const totalPayments = Number(toBigIntSafe(row.totalPayments));
      const successes = Number(toBigIntSafe(row.successfulPayments));
      const failures = Number(toBigIntSafe(row.failedPayments));
      const latencyTotal = toBigIntSafe(row.latencyTotalSeconds);
      const latencySamples = toBigIntSafe(row.latencySamples);
      const averageLatency =
        row.averageLatencySeconds != null
          ? row.averageLatencySeconds
          : latencySamples > BigInt(0)
            ? Number(latencyTotal) / Math.max(1, Number(latencySamples))
            : null;

      return {
        totalRevenueUsdCents: totalRevenue,
        totalPayments,
        successfulPayments: successes,
        failedPayments: failures,
        averageLatencySeconds: averageLatency,
        averagePaymentValueUsdCents: toBigIntSafe(row.averagePaymentValue),
        activeSubscriptions: Number(toBigIntSafe(row.activeSubscriptions)),
        totalSubscriptions: Number(toBigIntSafe(row.totalSubscriptions)),
        performanceScore: row.performanceScore ?? null,
        lastPaymentAt: row.lastPaymentAt != null ? toNumberSafe(row.lastPaymentAt) : null,
        updatedAt: toNumberSafe(row.updatedAt),
      };
    },
  });
}

export function useRelayerPerformanceTop(limit = 5) {
  return useQuery({
    queryKey: ["envio", "relayer", "performance", limit],
    enabled: Boolean(ENVO_ENDPOINT),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<RelayerPerformanceData>(RELAYER_PERFORMANCE_QUERY, {
        limit,
      }),
    select: (data): RelayerPerformanceSummary[] =>
      (data.RelayerPerformance ?? []).map((row) => {
        const latencyTotal = toBigIntSafe(row.latencyTotalSeconds);
        const latencySamples = toBigIntSafe(row.latencySamples);
        const averageLatency =
          row.averageLatencySeconds != null
            ? row.averageLatencySeconds
            : latencySamples > BigInt(0)
              ? Number(latencyTotal) / Math.max(1, Number(latencySamples))
              : null;

        return {
          id: row.id,
          relayer: row.relayer,
          chainId: toNumberSafe(row.chainId),
          executions: Number(toBigIntSafe(row.executions)),
          successfulExecutions: Number(toBigIntSafe(row.successfulExecutions)),
          failedExecutions: Number(toBigIntSafe(row.failedExecutions)),
          totalFees: toBigIntSafe(row.totalFees),
          averageLatencySeconds: averageLatency,
          performanceScore: row.performanceScore ?? null,
          updatedAt: toNumberSafe(row.updatedAt),
        };
      }),
  });
}

export function useIndexerMeta() {
  return useQuery({
    queryKey: ["envio", "indexer", "meta"],
    enabled: Boolean(ENVO_ENDPOINT),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () => graphRequest<IndexerMetaData>(INDEXER_META_QUERY),
    select: (data): IndexerMetaSummary[] =>
      (data.IndexerMeta ?? []).map((row) => ({
        chainId: toNumberSafe(row.chainId),
        latestIndexedBlock: Number(toBigIntSafe(row.latestIndexedBlock)),
        latestIndexedTimestamp: Number(toBigIntSafe(row.latestIndexedTimestamp)),
        indexingLatencyMs: row.indexingLatencyMs != null ? Number(toBigIntSafe(row.indexingLatencyMs)) : null,
        lastSyncTimestamp: Number(toBigIntSafe(row.lastSyncTimestamp)),
        envioVersion: row.envioVersion ?? null,
        performanceScore: row.performanceScore ?? null,
      })),
  });
}

export function useMerchantSubscriptionHealth(
  merchantAddress: string | undefined,
  windowStart: Date,
  windowEnd: Date,
) {
  const merchant = normaliseAddress(merchantAddress);
  const windowStartSeconds = toTimestampSeconds(windowStart);
  const windowEndSeconds = toTimestampSeconds(windowEnd);

  return useQuery({
    queryKey: ["envio", "merchant", "subscription-health", merchant, windowStartSeconds, windowEndSeconds],
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () =>
      graphRequest<MerchantSubscriptionStatusData>(MERCHANT_SUBSCRIPTION_STATUS_QUERY, {
        merchant,
        windowStart: windowStartSeconds,
        windowEnd: windowEndSeconds,
      }),
    select: (data): SubscriptionHealthSummary => {
      const metadata = new Map<string, SubscriptionMetadata>();
      data.subscriptionDetails?.forEach((entry) => {
        metadata.set(entry.subscriptionId.toLowerCase(), {
          subscriptionId: entry.subscriptionId,
          interval: toNumberSafe(entry.interval),
          startTime: toNumberSafe(entry.startTime),
          status: entry.status,
        });
      });

      return {
        active: data.active?.aggregate?.count ?? 0,
        paused: data.paused?.aggregate?.count ?? 0,
        cancelled: data.cancelled?.aggregate?.count ?? 0,
        completed: data.completed?.aggregate?.count ?? 0,
        newInWindow: data.newSubscriptions?.aggregate?.count ?? 0,
        recentSubscriptionTimestamps: (data.recentSubscriptions ?? []).map((entry) =>
          toNumberSafe(entry.createdAt),
        ),
        metadata,
      };
    },
  });
}

export function useMerchantTokenStats(merchant: string | undefined) {
  return useQuery({
    queryKey: ["envio", "merchant", merchant],
    queryFn: () =>
      graphRequest<MerchantTokenStatsData>(MERCHANT_TOKEN_STATS_QUERY, {
        merchant,
      }),
    enabled: Boolean(ENVO_ENDPOINT && merchant),
    staleTime: 60_000,
  });
}

export function useCrossChainAttestations(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ["envio", "attestations", subscriptionId],
    queryFn: () =>
      graphRequest<CrossChainAttestationData>(CROSS_CHAIN_ATTESTATIONS_QUERY, {
        subscriptionId,
      }),
    enabled: Boolean(ENVO_ENDPOINT && subscriptionId),
    staleTime: 60_000,
  });
}

function normaliseAddress(value: string | undefined) {
  return value ? value.toLowerCase() : undefined;
}

export type UserSubscription = SubscriptionEntity & {
  nextPaymentDue?: number;
  paymentsRemaining?: number;
  explorerUrl?: string;
};

function enrichSubscription(subscription: SubscriptionEntity): UserSubscription {
  const createdAt = Number(subscription.createdAt);
  const startTime = Number(subscription.startTime);
  const expiry = Number(subscription.expiry);
  const paymentsExecuted = Number(subscription.paymentsExecuted ?? 0);
  const maxPayments = Number(subscription.maxPayments ?? 0);
  const interval = Number(subscription.interval ?? 0);

  const paymentsRemaining =
    maxPayments > 0
      ? Math.max(maxPayments - paymentsExecuted, 0)
      : undefined;

  const nextPaymentDue =
    subscription.status === "ACTIVE"
      ? startTime + interval * Math.max(paymentsExecuted, 0)
      : undefined;

  const explorerUrl =
    ENVO_EXPLORER_URL && subscription.subscriptionId
      ? `${ENVO_EXPLORER_URL.replace(/\/$/, "")}/entities/subscription/${subscription.subscriptionId.toLowerCase()}`
      : undefined;

  return {
    ...subscription,
    nextPaymentDue,
    paymentsRemaining,
    explorerUrl,
    createdAt,
    startTime,
    expiry,
    paymentsExecuted,
    maxPayments,
    interval,
    chainId: Number(subscription.chainId ?? 0),
  } as UserSubscription;
}

export function useUserSubscriptions(subscriber: string | undefined) {
  const normalised = normaliseAddress(subscriber);
  return useQuery({
    queryKey: ["envio", "subscriptions", normalised],
    queryFn: () =>
      graphRequest<SubscriptionQueryResponse>(USER_SUBSCRIPTIONS_QUERY, {
        subscriber: normalised,
      }),
    select: (data) => data.Subscription.map(enrichSubscription),
    enabled: Boolean(ENVO_ENDPOINT && normalised),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const result = query.state.data as UserSubscription[] | undefined;
      const hasActive = result?.some((item) => item.status === "ACTIVE");
      return hasActive ? 30_000 : false;
    },
  });
}

export function useSubscription(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ["envio", "subscription", subscriptionId?.toLowerCase()],
    queryFn: () =>
      graphRequest<SubscriptionQueryResponse>(SUBSCRIPTION_DETAIL_QUERY, {
        subscriptionId: subscriptionId?.toLowerCase(),
      }),
    select: (data) => {
      const entity = data.Subscription[0];
      return entity ? enrichSubscription(entity) : undefined;
    },
    enabled: Boolean(ENVO_ENDPOINT && subscriptionId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const entity = query.state.data as UserSubscription | undefined;
      return entity?.status === "ACTIVE" ? 30_000 : false;
    },
  });
}

export function usePaymentHistory(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ["envio", "payments", subscriptionId?.toLowerCase()],
    queryFn: () =>
      graphRequest<PaymentQueryResponse>(PAYMENT_HISTORY_QUERY, {
        subscriptionId: subscriptionId?.toLowerCase(),
      }),
    select: (data) =>
      data.Payment.map((payment) => ({
        ...payment,
        paymentNumber: Number(payment.paymentNumber),
        blockNumber: Number(payment.blockNumber ?? 0),
        timestamp: Number(payment.timestamp ?? 0),
        chainId: Number(payment.chainId ?? 0),
      })),
    enabled: Boolean(ENVO_ENDPOINT && subscriptionId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const entity = query.queryKey[2];
      return entity ? 30_000 : false;
    },
  });
}
