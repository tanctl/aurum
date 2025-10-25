"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { Address, Hex } from "viem";
import {
  Loader2,
  Pause,
  Play,
  ShieldAlert,
  ShieldOff,
  Sparkles,
} from "lucide-react";

import { SUBSCRIPTION_MANAGER_ABI, getSubscriptionManagerAddress } from "@/lib/contracts";
import {
  formatTokenAmount,
  shortenAddress,
  tokenDecimalsForSymbol,
} from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import type { UserSubscription } from "@/hooks/useEnvio";
import { TransactionModal, type TransactionStage } from "@/components/ui/TransactionModal";

type SubscriptionActionsProps = {
  subscriptionId: string;
  status: string;
  tokenSymbol?: string;
  amount?: string;
  chainId?: number;
  onComplete?: () => void;
};

type ModalKind = "pause" | "resume" | "cancel" | null;

const buttonBase =
  "inline-flex items-center gap-2 rounded-md border bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors";

const TARGET_CONFIRMATIONS = 12;

function txUrl(hash: string, chainId?: number) {
  switch (chainId) {
    case 84532:
      return `https://sepolia.basescan.org/tx/${hash}`;
    case 11155111:
    default:
      return `https://sepolia.etherscan.io/tx/${hash}`;
  }
}

function deriveFriendlyError(message: string): { title: string; description?: string } {
  const lower = message.toLowerCase();
  if (lower.includes("insufficient funds")) {
    return {
      title: "Insufficient ETH for gas fees",
      description: "Top up your wallet with testnet ETH and try again.",
    };
  }
  if (lower.includes("balance")) {
    return {
      title: "Insufficient token balance",
      description: "Check your PYUSD balance and ensure it covers the subscription amount.",
    };
  }
  if (lower.includes("allowance")) {
    return {
      title: "Insufficient allowance",
      description: "Approve the contract to spend the required amount and retry.",
    };
  }
  if (lower.includes("network") || lower.includes("rpc")) {
    return {
      title: "Network issue",
      description: "We had trouble reaching the network. Please retry shortly.",
    };
  }
  return {
    title: "Transaction failed",
    description: message,
  };
}

export function SubscriptionActions({
  subscriptionId,
  status,
  tokenSymbol = "TOKEN",
  amount,
  chainId: overrideChainId,
  onComplete,
}: SubscriptionActionsProps) {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const effectiveChainId = overrideChainId ?? connectedChainId;
  const contractAddress = useMemo<Address | undefined>(
    () =>
      effectiveChainId ? getSubscriptionManagerAddress(effectiveChainId) : undefined,
    [effectiveChainId]
  );
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient({ chainId: effectiveChainId });
  const queryClient = useQueryClient();
  const toast = useToast();

  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("idle");
  const [confirmations, setConfirmations] = useState(0);
  const [transactionStartedAt, setTransactionStartedAt] = useState<number | undefined>();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const decimals = tokenDecimalsForSymbol(tokenSymbol);
  const lowerSubscriptionId = subscriptionId.toLowerCase();
  const subscriberCacheKey = useMemo(
    () => (address ? (["envio", "subscriptions", address.toLowerCase()] as const) : null),
    [address],
  );
  const subscriptionCacheKey = useMemo(
    () => ["envio", "subscription", lowerSubscriptionId] as const,
    [lowerSubscriptionId],
  );

  const optimisticUpdate = useCallback(
    (nextStatus: string) => {
      const subscriptionSnapshot = queryClient.getQueryData<UserSubscription | undefined>(
        subscriptionCacheKey,
      );
      const subscriptionsSnapshot = subscriberCacheKey
        ? queryClient.getQueryData<UserSubscription[] | undefined>(subscriberCacheKey)
        : undefined;

      queryClient.setQueryData<UserSubscription | undefined>(subscriptionCacheKey, (current) =>
        current ? { ...current, status: nextStatus } : current,
      );

      if (subscriberCacheKey) {
        queryClient.setQueryData<UserSubscription[] | undefined>(subscriberCacheKey, (current) => {
          if (!current) return current;
          return current.map((item) =>
            item.subscriptionId === subscriptionId ? { ...item, status: nextStatus } : item,
          );
        });
      }

      return { subscriptionSnapshot, subscriptionsSnapshot };
    },
    [queryClient, subscriptionCacheKey, subscriberCacheKey, subscriptionId]
  );

  const revertOptimistic = useCallback(
    (snapshots: {
      subscriptionSnapshot: UserSubscription | undefined;
      subscriptionsSnapshot: UserSubscription[] | undefined;
    }) => {
      queryClient.setQueryData<UserSubscription | undefined>(
        subscriptionCacheKey,
        snapshots.subscriptionSnapshot,
      );
      if (subscriberCacheKey) {
        queryClient.setQueryData<UserSubscription[] | undefined>(
          subscriberCacheKey,
          snapshots.subscriptionsSnapshot,
        );
      }
    },
    [queryClient, subscriptionCacheKey, subscriberCacheKey]
  );

  const isPaused = status === "PAUSED";
  const isActive = status === "ACTIVE";
  const canPause = isActive;
  const canResume = isPaused;
  const canCancel = status === "ACTIVE" || status === "PAUSED";

  const ensureReady = useCallback(() => {
    if (!address) {
      throw new Error("Connect your wallet to manage this subscription.");
    }
    if (!contractAddress) {
      throw new Error("Unsupported network for subscription management.");
    }
    if (!walletClient) {
      throw new Error("Wallet client not available. Check your connection.");
    }
    if (!publicClient) {
      throw new Error("RPC client unavailable. Please refresh and try again.");
    }
  }, [address, contractAddress, walletClient, publicClient]);

  async function fetchNonce(): Promise<bigint> {
    if (!publicClient || !contractAddress || !address) return BigInt(0);
    return publicClient.readContract({
      abi: SUBSCRIPTION_MANAGER_ABI,
      address: contractAddress,
      functionName: "getNextNonce",
      args: [address],
    }) as Promise<bigint>;
  }

  async function signRequest(kind: "pause" | "resume", nonce: bigint): Promise<Hex> {
    if (!walletClient || !contractAddress || effectiveChainId === undefined) {
      throw new Error("Wallet not ready to sign request.");
    }

    const typeName = kind === "pause" ? "PauseRequest" : "ResumeRequest";
    const message = { subscriptionId, nonce };

    return walletClient.signTypedData({
      account: address!,
      domain: {
        name: "Aurum",
        version: "1",
        chainId: BigInt(effectiveChainId),
        verifyingContract: contractAddress,
      },
      types: {
        [typeName]: [
          { name: "subscriptionId", type: "bytes32" },
          { name: "nonce", type: "uint256" },
        ],
      },
      primaryType: typeName,
      message,
    });
  }

  async function handlePause() {
    const snapshot = optimisticUpdate("PAUSED");
    try {
      ensureReady();
      setBusy(true);
      setError(null);
      setPendingStatus("PAUSED");
      setTransactionStage("prompting");
      setTransactionHash(null);
      setTransactionStartedAt(Date.now());
      setConfirmations(0);

      const nonce = await fetchNonce();
      const signature = await signRequest("pause", nonce);

      setTransactionStage("pending");
      const hash = await walletClient!.writeContract({
        abi: SUBSCRIPTION_MANAGER_ABI,
        address: contractAddress!,
        functionName: "pauseSubscription",
        args: [subscriptionId as Hex, signature],
      });
      setTransactionHash(hash);
      setTransactionStage("confirming");

      await publicClient!.waitForTransactionReceipt({ hash });
      setTransactionStage("success");
      setConfirmations(TARGET_CONFIRMATIONS);
      setPendingStatus(null);
      toast.success("Subscription paused", {
        description: `Subscription ${shortenAddress(subscriptionId)} is now paused.`,
        actionLabel: hash ? "View" : undefined,
        onAction: hash ? () => window.open(txUrl(hash, effectiveChainId), "_blank") : undefined,
      });
      onComplete?.();
      setModal(null);
      queryClient.invalidateQueries({ queryKey: subscriptionCacheKey });
      if (subscriberCacheKey) {
        queryClient.invalidateQueries({ queryKey: subscriberCacheKey });
      }
    } catch (err) {
      revertOptimistic(snapshot);
      setPendingStatus(null);
      setTransactionStage("error");
      const message = err instanceof Error ? err.message : String(err);
      if (/user rejected/i.test(message)) {
        toast.info("Transaction rejected", {
          description: "No changes were made.",
        });
      } else {
        setError(message);
        const friendly = deriveFriendlyError(message);
        toast.error(friendly.title, {
          description: friendly.description,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResume() {
    const snapshot = optimisticUpdate("ACTIVE");
    try {
      ensureReady();
      setBusy(true);
      setError(null);
      setPendingStatus("ACTIVE");
      setTransactionStage("prompting");
      setTransactionHash(null);
      setTransactionStartedAt(Date.now());
      setConfirmations(0);

      const nonce = await fetchNonce();
      const signature = await signRequest("resume", nonce);

      setTransactionStage("pending");
      const hash = await walletClient!.writeContract({
        abi: SUBSCRIPTION_MANAGER_ABI,
        address: contractAddress!,
        functionName: "resumeSubscription",
        args: [subscriptionId as Hex, signature],
      });
      setTransactionHash(hash);
      setTransactionStage("confirming");

      await publicClient!.waitForTransactionReceipt({ hash });
      setTransactionStage("success");
      setConfirmations(TARGET_CONFIRMATIONS);
      setPendingStatus(null);
      toast.success("Subscription resumed", {
        description: `Subscription ${shortenAddress(subscriptionId)} is active again.`,
        actionLabel: hash ? "View" : undefined,
        onAction: hash ? () => window.open(txUrl(hash, effectiveChainId), "_blank") : undefined,
      });
      onComplete?.();
      setModal(null);
      queryClient.invalidateQueries({ queryKey: subscriptionCacheKey });
      if (subscriberCacheKey) {
        queryClient.invalidateQueries({ queryKey: subscriberCacheKey });
      }
    } catch (err) {
      revertOptimistic(snapshot);
      setPendingStatus(null);
      setTransactionStage("error");
      const message = err instanceof Error ? err.message : String(err);
      if (/user rejected/i.test(message)) {
        toast.info("Transaction rejected", {
          description: "No changes were made.",
        });
      } else {
        setError(message);
        const friendly = deriveFriendlyError(message);
        toast.error(friendly.title, {
          description: friendly.description,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function estimateCancelGas() {
    if (!publicClient || !contractAddress || !address) return null;
    try {
      const { request } = await publicClient.simulateContract({
        abi: SUBSCRIPTION_MANAGER_ABI,
        address: contractAddress,
        account: address,
        functionName: "cancelSubscription",
        args: [subscriptionId as Hex],
      });
      const gas = request.gas ?? BigInt(0);
      return formatTokenAmount(gas.toString(), 18);
    } catch (error) {
      console.warn("Failed to estimate gas", error);
      return null;
    }
  }

  async function handleCancel() {
    const snapshot = optimisticUpdate("CANCELLED");
    try {
      ensureReady();
      setBusy(true);
      setError(null);
      setPendingStatus("CANCELLED");
      setTransactionStage("prompting");
      setTransactionHash(null);
      setTransactionStartedAt(Date.now());
      setConfirmations(0);

      setTransactionStage("pending");
      const hash = await walletClient!.writeContract({
        abi: SUBSCRIPTION_MANAGER_ABI,
        address: contractAddress!,
        functionName: "cancelSubscription",
        args: [subscriptionId as Hex],
      });
      setTransactionHash(hash);
      setTransactionStage("confirming");

      await publicClient!.waitForTransactionReceipt({ hash });
      setTransactionStage("success");
      setConfirmations(TARGET_CONFIRMATIONS);
      setPendingStatus(null);
      toast.success("Subscription cancelled", {
        description: `Future executions for ${shortenAddress(subscriptionId)} are disabled.`,
        actionLabel: hash ? "View" : undefined,
        onAction: hash ? () => window.open(txUrl(hash, effectiveChainId), "_blank") : undefined,
      });
      onComplete?.();
      setModal(null);
      queryClient.invalidateQueries({ queryKey: subscriptionCacheKey });
      if (subscriberCacheKey) {
        queryClient.invalidateQueries({ queryKey: subscriberCacheKey });
      }
    } catch (err) {
      revertOptimistic(snapshot);
      setPendingStatus(null);
      setTransactionStage("error");
      const message = err instanceof Error ? err.message : String(err);
      if (/user rejected/i.test(message)) {
        toast.info("Transaction rejected", {
          description: "No changes were made.",
        });
      } else {
        setError(message);
        const friendly = deriveFriendlyError(message);
        toast.error(friendly.title, {
          description: friendly.description,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const disabledTooltip = useMemo(() => {
    if (!address) return "Connect your wallet to manage this subscription.";
    if (!contractAddress) return "Unsupported network.";
    return undefined;
  }, [address, contractAddress]);

  const closeTransactionModal = () => {
    setTransactionStage("idle");
    setTransactionHash(null);
    setTransactionStartedAt(undefined);
    setConfirmations(0);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canPause || !address || busy}
            onClick={() => setModal("pause")}
            className={`${buttonBase} border-bronze/60 text-text-primary hover:border-primary hover:bg-carbon/30 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
            title={disabledTooltip}
          >
            {busy && modal === "pause" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause size={14} />}
            Pause
          </button>
          <button
            type="button"
            disabled={!canResume || !address || busy}
            onClick={() => setModal("resume")}
            className={`${buttonBase} border-primary text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
            title={disabledTooltip}
          >
            {busy && modal === "resume" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play size={14} />}
            Resume
          </button>
          <button
            type="button"
            disabled={!canCancel || !address || busy}
            onClick={async () => {
              setModal("cancel");
              const gas = await estimateCancelGas();
              setGasEstimate(gas);
            }}
            className={`${buttonBase} border-rose-500/60 text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
            title={disabledTooltip}
          >
            {busy && modal === "cancel" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ShieldOff size={14} />
            )}
            Cancel
          </button>
        </div>
        {pendingStatus ? (
          <div className="text-2xs uppercase tracking-[0.3em] text-secondary">
            {pendingStatus === "PAUSED"
              ? "Pausing subscription…"
              : pendingStatus === "ACTIVE"
              ? "Resuming subscription…"
              : "Cancelling subscription…"}
          </div>
        ) : null}

        <ActionModal
          modal={modal}
          busy={busy}
          error={error}
          transactionHash={transactionHash}
          amount={amount}
          tokenSymbol={tokenSymbol}
          gasEstimate={gasEstimate}
          onClose={() => {
            setModal(null);
            setError(null);
            setTransactionHash(null);
          }}
          decimals={decimals}
          chainId={effectiveChainId}
          onConfirmPause={handlePause}
          onConfirmResume={handleResume}
          onConfirmCancel={handleCancel}
          subscriptionId={subscriptionId}
        />
      </div>
      <TransactionModal
        hash={transactionHash as `0x${string}` | null}
        chainId={effectiveChainId}
        status={transactionStage}
        errorMessage={error ?? undefined}
        confirmations={confirmations}
        targetConfirmations={TARGET_CONFIRMATIONS}
        onClose={closeTransactionModal}
        startedAt={transactionStartedAt}
      />
    </>
  );
}

type ActionModalProps = {
  modal: ModalKind;
  busy: boolean;
  error: string | null;
  transactionHash: string | null;
  amount?: string;
  tokenSymbol?: string;
  gasEstimate: string | null;
  subscriptionId: string;
  decimals: number;
  chainId?: number;
  onClose: () => void;
  onConfirmPause: () => Promise<void>;
  onConfirmResume: () => Promise<void>;
  onConfirmCancel: () => Promise<void>;
};

function ActionModal({
  modal,
  busy,
  error,
  transactionHash,
  amount,
  tokenSymbol,
  gasEstimate,
  subscriptionId,
  decimals,
  chainId,
  onClose,
  onConfirmPause,
  onConfirmResume,
  onConfirmCancel,
}: ActionModalProps) {
  if (!modal) return null;

  const isPause = modal === "pause";
  const isResume = modal === "resume";
  const title = isPause
    ? "Pause subscription?"
    : isResume
    ? "Resume subscription?"
    : "Cancel subscription?";
  const description = isPause
    ? "Pausing will stop the relayer from executing further payments until you resume."
    : isResume
    ? "Resuming re-enables scheduled executions for this subscription."
    : "Cancellation is permanent. Future executions will be prevented and you may need to re-create the schedule.";

  const confirm = isPause
    ? onConfirmPause
    : isResume
    ? onConfirmResume
    : onConfirmCancel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foundation-black/80 px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border border-bronze/60 bg-carbon p-6 shadow-2xl">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-foundation-black">
            {isPause ? <Pause size={16} className="text-primary" /> : null}
            {isResume ? <Play size={16} className="text-primary" /> : null}
            {!isPause && !isResume ? (
              <ShieldAlert size={16} className="text-rose-400" />
            ) : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </header>

        <section className="mt-4 space-y-4 rounded-md border border-bronze/60 bg-foundation-black/40 p-4 text-sm text-text-muted">
          <div className="flex items-center justify-between">
            <span>Subscription</span>
            <span className="font-mono text-text-primary">
              {shortenAddress(subscriptionId)}
            </span>
          </div>
          {amount ? (
            <div className="flex items-center justify-between">
              <span>Recurring amount</span>
              <span className="text-text-primary">
                {formatTokenAmount(amount, decimals)} {tokenSymbol}
              </span>
            </div>
          ) : null}
          {modal === "cancel" && gasEstimate ? (
            <div className="flex items-center justify-between text-xs text-text-muted/80">
              <span>Estimated gas cost</span>
              <span>{gasEstimate} ETH</span>
            </div>
          ) : null}
          {transactionHash ? (
            <div className="flex items-center justify-between text-xs text-text-muted/80">
              <span>Transaction hash</span>
              <a
                href={txUrl(transactionHash, chainId)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary"
              >
                {shortenAddress(transactionHash)}
              </a>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md border border-rose-500/60 bg-rose-500/10 p-3 text-xs text-rose-200">
              {error}
            </div>
          ) : null}
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-bronze/60 px-4 py-2 text-xs uppercase tracking-widest text-text-muted hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Close
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`rounded-md border px-4 py-2 text-xs uppercase tracking-widest text-foundation-black ${
              isPause
                ? "border-primary bg-primary hover:bg-secondary"
                : isResume
                ? "border-emerald-400 bg-emerald-400 hover:bg-emerald-500"
                : "border-rose-500 bg-rose-500 hover:bg-rose-600"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Processing
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                {isPause ? <Pause size={14} /> : null}
                {isResume ? <Sparkles size={14} /> : null}
                {!isPause && !isResume ? <ShieldOff size={14} /> : null}
                Confirm
              </span>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
