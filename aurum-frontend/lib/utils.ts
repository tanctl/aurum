import { formatDistanceToNow } from "date-fns";
import { parseUnits, formatUnits } from "viem";

import { chains, type SupportedChainId } from "@/lib/wagmi";

export function shortenAddress(address: string, size = 4): string {
  if (!address) return "";
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function getChainName(chainId?: number): string {
  if (!chainId) return "Unknown";
  const chain = chains.find((item) => item.id === chainId);
  return chain?.name ?? `Chain ${chainId}`;
}

export function formatTokenAmount(
  amount: string | bigint,
  decimals = 18,
  precision = 4,
): string {
  try {
    const value =
      typeof amount === "bigint" ? amount : parseUnits(amount, decimals);
    const formatted = formatUnits(value, decimals);
    const [whole, fraction] = formatted.split(".");
    if (!fraction) return whole;
    return `${whole}.${fraction.slice(0, precision)}`;
  } catch {
    return amount?.toString() ?? "0";
  }
}

export function timeSince(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), {
    addSuffix: true,
  });
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chains.some((chain) => chain.id === chainId);
}
