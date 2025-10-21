"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_RELAYER_API_URL;

type Nullable<T> = T | null | undefined;

type SubscriptionApiResponse = {
  id: string;
  subscriber: string;
  merchant: string;
  amount: string;
  interval: number;
  startTime: number;
  maxPayments: number;
  maxTotalAmount: string;
  expiry: number;
  nonce: number;
  tokenAddress: string;
  tokenSymbol: string;
  status: string;
  executedPayments: number;
  totalPaid: string;
  nextPaymentTime: number;
  failureCount: number;
  chain: string;
  createdAt: string;
  updatedAt: string;
  onChainStatus: number;
  onChainPayments: number;
  contractAddress: string;
  availBlock?: number;
  availExtrinsic?: number;
};

type MerchantStatsResponse = {
  totalRevenue: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  tokenTotals: Record<string, string>;
  envoyExplorerUrl?: string;
};

type MerchantTransaction = {
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

type MerchantTransactionsResponse = {
  transactions: MerchantTransaction[];
  count: number;
  totalRevenue: string;
  tokenTotals: Record<string, string>;
  page: number;
  size: number;
};

type SubscriptionHistoryItem = {
  subscriptionId: string;
  status: string;
  updatedAt: string;
  timestamp: number;
};

async function fetchJson<T>(path: string): Promise<T> {
  if (!API_BASE) {
    throw new Error("Relayer API URL not configured");
  }

  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  detail: (id: string) => ["subscriptions", id] as const,
  merchant: (address: string) => ["merchant", address] as const,
  merchantStats: (address: string) => ["merchant", address, "stats"] as const,
  merchantTransactions: (address: string, page: number, size: number) =>
    ["merchant", address, "transactions", page, size] as const,
  subscriber: (address: string) => ["subscriber", address] as const,
};

export function useSubscription(id: Nullable<string>) {
  return useQuery({
    queryKey: id ? subscriptionKeys.detail(id) : subscriptionKeys.all,
    queryFn: () => fetchJson<SubscriptionApiResponse>(`/api/v1/subscription/${id}`),
    enabled: Boolean(API_BASE && id),
    staleTime: 15_000,
  });
}

type MerchantTransactionParams = {
  page?: number;
  size?: number;
  useHypersync?: boolean;
  chain?: string;
};

export function useMerchantTransactions(
  address: Nullable<string>,
  { page = 0, size = 25, useHypersync = false, chain }: MerchantTransactionParams = {},
) {
  return useQuery({
    queryKey: address
      ? subscriptionKeys.merchantTransactions(address, page, size)
      : subscriptionKeys.merchantTransactions("", page, size),
    queryFn: () =>
      fetchJson<MerchantTransactionsResponse>(
        `/api/v1/merchant/${address}/transactions?page=${page}&size=${size}&use_hypersync=${useHypersync}${
          chain ? `&chain=${encodeURIComponent(chain)}` : ""
        }`,
      ),
    enabled: Boolean(API_BASE && address),
    staleTime: 30_000,
  });
}

export function useMerchantStats(address: Nullable<string>) {
  return useQuery({
    queryKey: address ? subscriptionKeys.merchantStats(address) : subscriptionKeys.merchant(""),
    queryFn: () => fetchJson<MerchantStatsResponse>(`/api/v1/merchant/${address}/stats`),
    enabled: Boolean(API_BASE && address),
    staleTime: 60_000,
  });
}

export function useSubscriberHistory(address: Nullable<string>) {
  return useQuery({
    queryKey: address ? subscriptionKeys.subscriber(address) : subscriptionKeys.subscriber(""),
    queryFn: () => fetchJson<SubscriptionHistoryItem[]>(`/api/v1/subscriber/${address}/history`),
    enabled: Boolean(API_BASE && address),
    staleTime: 60_000,
  });
}

export function useSubscriptionSummary(id: Nullable<string>) {
  const { data, ...rest } = useSubscription(id);

  const summary = useMemo(() => {
    if (!data) return undefined;
    return {
      ...data,
      isDue: data.nextPaymentTime > 0 && data.nextPaymentTime <= Math.floor(Date.now() / 1000),
    };
  }, [data]);

  return { data: summary, ...rest };
}
