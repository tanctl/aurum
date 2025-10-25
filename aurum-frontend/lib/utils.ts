import { formatDistanceToNow } from "date-fns";
import { parseUnits, formatUnits } from "viem";

import { chains, type SupportedChainId } from "@/lib/wagmi";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

const STATUS_CLASS_MAP: Record<string, string> = {
  ACTIVE: "border-emerald-400/60 bg-emerald-400/10 text-emerald-200",
  PAUSED: "border-amber-400/60 bg-amber-400/10 text-amber-200",
  CANCELLED: "border-rose-500/60 bg-rose-500/10 text-rose-200",
  EXPIRED: "border-slate-500/60 bg-slate-500/10 text-slate-200",
  COMPLETED: "border-sky-400/60 bg-sky-400/10 text-sky-200",
};

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

export function formatDateTime(timestamp?: number | string | null): string {
  if (!timestamp) return "—";
  const value =
    typeof timestamp === "string" ? Number.parseInt(timestamp, 10) : timestamp;
  if (!Number.isFinite(value)) return "—";
  return new Date(value * 1000).toLocaleString();
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chains.some((chain) => chain.id === chainId);
}

export function formatInterval(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const UNITS = [
    { label: "year", seconds: 31_536_000 },
    { label: "month", seconds: 2_592_000 },
    { label: "week", seconds: 604_800 },
    { label: "day", seconds: 86_400 },
    { label: "hour", seconds: 3_600 },
    { label: "minute", seconds: 60 },
  ];

  for (const unit of UNITS) {
    if (seconds % unit.seconds === 0) {
      const value = Math.round(seconds / unit.seconds);
      return `${value} ${unit.label}${value === 1 ? "" : "s"}`;
    }
  }

  return `${seconds} seconds`;
}

export function formatStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function statusBadgeClass(status?: string | null): string {
  if (!status) return "border-slate-500/60 bg-slate-500/10 text-slate-200";
  return STATUS_CLASS_MAP[status.toUpperCase()] ?? "border-slate-500/60 bg-slate-500/10 text-slate-200";
}

export function tokenDecimalsForSymbol(symbol?: string | null): number {
  if (!symbol) return 18;
  switch (symbol.toUpperCase()) {
    case "PYUSD":
      return 6;
    default:
      return 18;
  }
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
