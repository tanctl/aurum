"use client";

import { useMemo } from "react";
import type { Address } from "viem";

import {
  getPyusdAddress,
  getSubscriptionManagerAddress,
  PYUSD_ADDRESSES,
  SUBSCRIPTION_MANAGER_ADDRESSES,
} from "@/lib/contracts";
import type { SupportedChainId } from "@/lib/wagmi";

export function useContractAddresses(chainId?: SupportedChainId) {
  return useMemo(() => {
    if (!chainId) {
      return {
        subscriptionManager: undefined,
        pyusd: undefined,
      } as const;
    }

    return {
      subscriptionManager: getSubscriptionManagerAddress(chainId),
      pyusd: getPyusdAddress(chainId),
    } as const;
  }, [chainId]);
}

export function useSupportedContracts() {
  return useMemo(() => {
    return Object.entries(SUBSCRIPTION_MANAGER_ADDRESSES).map(
      ([chainId, address]) => ({
        chainId: Number(chainId) as SupportedChainId,
        subscriptionManager: address,
        pyusd: PYUSD_ADDRESSES[Number(chainId) as SupportedChainId] as Address,
      }),
    );
  }, []);
}
