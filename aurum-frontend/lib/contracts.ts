import subscriptionManagerArtifact from "@/abi/SubscriptionManager.json";
import erc20Artifact from "@/abi/ERC20.json";
import { useCallback, useMemo } from "react";
import { useReadContract, useWriteContract, type UseReadContractParameters } from "wagmi";
import type { Abi, Address } from "viem";

import type { SupportedChainId } from "@/lib/wagmi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function envAddress(value: string | undefined): Address {
  if (!value || value.trim() === "") {
    return ZERO_ADDRESS;
  }
  return value as Address;
}

export const SUBSCRIPTION_MANAGER_ABI = subscriptionManagerArtifact.abi as Abi;
export const ERC20_ABI = erc20Artifact.abi as Abi;

export const SUBSCRIPTION_MANAGER_ADDRESSES: Record<SupportedChainId, Address> = {
  11155111: envAddress(process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_SEPOLIA),
  84532: envAddress(process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_BASE),
};

export const PYUSD_ADDRESSES: Record<SupportedChainId, Address> = {
  11155111: envAddress(process.env.NEXT_PUBLIC_PYUSD_SEPOLIA),
  84532: envAddress(process.env.NEXT_PUBLIC_PYUSD_BASE),
};

type SubscriptionManagerReadParams = Omit<
  UseReadContractParameters<typeof SUBSCRIPTION_MANAGER_ABI>,
  "abi" | "address" | "chainId"
>;

type Erc20ReadParams = Omit<
  UseReadContractParameters<typeof ERC20_ABI>,
  "abi" | "address"
>;

export function getSubscriptionManagerAddress(
  chainId: SupportedChainId,
): Address {
  return SUBSCRIPTION_MANAGER_ADDRESSES[chainId] ?? ZERO_ADDRESS;
}

export function getPyusdAddress(chainId: SupportedChainId): Address {
  return PYUSD_ADDRESSES[chainId] ?? ZERO_ADDRESS;
}

export function useSubscriptionManagerRead(
  chainId: SupportedChainId,
  params: SubscriptionManagerReadParams,
) {
  const address = useMemo(() => getSubscriptionManagerAddress(chainId), [chainId]);

  return useReadContract({
    abi: SUBSCRIPTION_MANAGER_ABI,
    address,
    chainId,
    ...params,
  } as UseReadContractParameters<typeof SUBSCRIPTION_MANAGER_ABI>);
}

export function useSubscriptionManagerWrite(chainId: SupportedChainId) {
  const mutation = useWriteContract();
  const address = useMemo(() => getSubscriptionManagerAddress(chainId), [chainId]);

  const writeContract = useCallback(
    (params: Parameters<typeof mutation.writeContract>[0]) =>
      mutation.writeContract({
        ...params,
        abi: SUBSCRIPTION_MANAGER_ABI,
        address,
        chainId,
      } as Parameters<typeof mutation.writeContract>[0]),
    [address, chainId, mutation],
  );

  const writeContractAsync = useCallback(
    (params: Parameters<typeof mutation.writeContractAsync>[0]) =>
      mutation.writeContractAsync({
        ...params,
        abi: SUBSCRIPTION_MANAGER_ABI,
        address,
        chainId,
      } as Parameters<typeof mutation.writeContractAsync>[0]),
    [address, chainId, mutation],
  );

  return {
    ...mutation,
    writeContract,
    writeContractAsync,
  };
}

export function useErc20Read(
  address: Address | undefined,
  params: Erc20ReadParams,
) {
  const config = address
    ? ({
        ...params,
        abi: ERC20_ABI,
        address,
      } as UseReadContractParameters<typeof ERC20_ABI>)
    : undefined;

  return useReadContract(config);
}

export function useErc20Write(address: Address | undefined) {
  const mutation = useWriteContract();

  const writeContract = useCallback(
    (params: Parameters<typeof mutation.writeContract>[0]) => {
      if (!address) {
        throw new Error("ERC20 contract address is required");
      }

      mutation.writeContract({
        ...params,
        abi: ERC20_ABI,
        address,
      } as Parameters<typeof mutation.writeContract>[0]);
    },
    [address, mutation],
  );

  const writeContractAsync = useCallback(
    (params: Parameters<typeof mutation.writeContractAsync>[0]) => {
      if (!address) {
        throw new Error("ERC20 contract address is required");
      }

      mutation.writeContractAsync({
        ...params,
        abi: ERC20_ABI,
        address,
      } as Parameters<typeof mutation.writeContractAsync>[0]);
    },
    [address, mutation],
  );

  return {
    ...mutation,
    writeContract,
    writeContractAsync,
  };
}
