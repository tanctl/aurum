"use client";

import { useQuery } from "@tanstack/react-query";

const ENVO_ENDPOINT = process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_ENDPOINT;

async function graphRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!ENVO_ENDPOINT) {
    throw new Error("Envio GraphQL endpoint missing");
  }

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
}

type MerchantTokenStats = {
  token: string;
  tokenSymbol: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalRevenue: string;
  totalPayments: number;
  chainId: number;
};

type MerchantTokenStatsData = {
  MerchantTokenStats: MerchantTokenStats[];
};

type CrossChainAttestation = {
  id: string;
  paymentNumber: number;
  sourceChainId: number;
  token: string;
  amount: string;
  verified: boolean;
  timestamp: string;
};

type CrossChainAttestationData = {
  CrossChainAttestation: CrossChainAttestation[];
};

const MERCHANT_TOKEN_STATS_QUERY = /* GraphQL */ `
  query MerchantTokenStats($merchant: String!) {
    MerchantTokenStats(where: { merchant: { _eq: $merchant } }) {
      token
      tokenSymbol
      totalSubscriptions
      activeSubscriptions
      totalRevenue
      totalPayments
      chainId
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
      sourceChainId
      token
      amount
      verified
      timestamp
    }
  }
`;

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
