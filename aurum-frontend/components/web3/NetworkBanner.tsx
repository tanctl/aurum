"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAccount, useChainId, useChains, useSwitchChain } from "wagmi";
import { baseSepolia, sepolia } from "@/lib/wagmi";

type ExpectedChain = typeof sepolia | typeof baseSepolia;

const EXPECTED_CHAINS: ExpectedChain[] = [sepolia, baseSepolia];
const STORAGE_KEY = "aurum:lastChainId";

export function NetworkBanner() {
  const { isConnected } = useAccount();
  const activeChainId = useChainId();
  const chains = useChains();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [preferredChainId, setPreferredChainId] = useState<number | null>(null);

  useEffect(() => {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        setPreferredChainId(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (activeChainId) {
      window.localStorage.setItem(STORAGE_KEY, String(activeChainId));
    }
  }, [activeChainId]);

  const expectedChain =
    EXPECTED_CHAINS.find((chain) => chain.id === preferredChainId) ?? sepolia;
  const isWrongNetwork =
    isConnected && activeChainId != null && expectedChain.id !== activeChainId;

  const expectedChainMeta = useMemo(
    () => chains.find((chain) => chain.id === expectedChain.id) ?? expectedChain,
    [chains, expectedChain]
  );

  if (!isConnected) {
    return null;
  }

  if (!isWrongNetwork) {
    return null;
  }

  const currentChain =
    chains.find((chain) => chain.id === activeChainId) ??
    EXPECTED_CHAINS.find((chain) => chain.id === activeChainId);

  const switchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: expectedChain.id });
    } catch (err) {
      // silently fail; upstream UX handles toasts
      console.warn("Failed to switch chain", err);
    }
  };

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-medium">
          <AlertTriangle size={16} className="text-amber-300" />
          <span>
            You&apos;re connected to {currentChain?.name ?? `chain ${activeChainId}`}. Switch to{" "}
            {expectedChainMeta.name} to continue.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={switchNetwork}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-amber-300 px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:border-amber-200/40 disabled:text-amber-200/40"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Switch network
          </button>
        </div>
      </div>
    </div>
  );
}
