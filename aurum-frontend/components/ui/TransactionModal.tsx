"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Copy, Zap, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { shortenAddress } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

export type TransactionStage = "idle" | "prompting" | "pending" | "confirming" | "success" | "error";

type TransactionModalProps = {
  hash?: `0x${string}` | null;
  chainId?: number;
  status: TransactionStage;
  errorMessage?: string | null;
  confirmations?: number;
  targetConfirmations?: number;
  onClose: () => void;
  onSpeedUp?: () => void;
  onCancelTx?: () => void;
  startedAt?: number;
};

const explorerByChain: Record<number, string> = {
  11155111: "https://sepolia.etherscan.io",
  84532: "https://sepolia.basescan.org",
};

export function TransactionModal({
  hash,
  chainId,
  status,
  errorMessage,
  confirmations = 0,
  targetConfirmations = 12,
  onClose,
  onSpeedUp,
  onCancelTx,
  startedAt,
}: TransactionModalProps) {
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === "confirming" || status === "pending") {
      const timer = window.setInterval(() => setNow(Date.now()), 1000);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, [status]);

  useEffect(() => {
    if (status === "success") {
      toast.success("Transaction confirmed!", {
        description: hash ? `Hash: ${shortenAddress(hash)}` : undefined,
        actionLabel: hash ? "View" : undefined,
        onAction: hash ? () => openExplorer(hash, chainId) : undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : null;
  const elapsedLabel =
    elapsedMs != null ? formatDistanceToNow(new Date(now - elapsedMs), { addSuffix: false }) : "—";

  const explorerUrl = hash && chainId ? `${explorerByChain[chainId] ?? "https://sepolia.etherscan.io"}/tx/${hash}` : null;

  if (status === "idle") {
    return null;
  }

  const showSlowWarning = status === "confirming" && elapsedMs != null && elapsedMs > 120_000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foundation-black/80 px-4 py-8">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-bronze/60 bg-carbon/80 p-6 shadow-2xl">
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {renderTitle(status)}
            </h2>
            <p className="text-xs text-text-muted">{renderSubtitle(status)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-bronze/40 p-1 text-text-muted hover:border-primary hover:text-primary"
            aria-label="Close transaction modal"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-4 text-sm text-text-primary">
          <ProgressBar progress={(confirmations / targetConfirmations) * 100} status={status} />

          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex justify-between rounded-md border border-bronze/40 bg-foundation-black/40 px-3 py-2">
              <span>Confirmations</span>
              <span>
                {confirmations} / {targetConfirmations}
              </span>
            </div>
            {hash ? (
              <div className="flex items-center justify-between rounded-md border border-bronze/40 bg-foundation-black/40 px-3 py-2">
                <span>Transaction</span>
                <div className="flex items-center gap-2">
                  <code className="text-secondary">{shortenAddress(hash)}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(hash)}
                    className="rounded border border-bronze/40 p-1 text-text-muted hover:border-primary hover:text-primary"
                    aria-label="Copy transaction hash"
                  >
                    <Copy size={14} />
                  </button>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-bronze/40 p-1 text-text-muted hover:border-primary hover:text-primary"
                      aria-label="Open transaction in block explorer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {startedAt ? (
              <div className="flex justify-between rounded-md border border-bronze/40 bg-foundation-black/40 px-3 py-2">
                <span>Elapsed time</span>
                <span>{elapsedLabel}</span>
              </div>
            ) : null}
          </dl>

          {showSlowWarning ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <AlertTriangle size={14} />
              <span>This transaction is taking longer than usual.</span>
            </div>
          ) : null}

          {status === "error" && errorMessage ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {onCancelTx && (status === "confirming" || status === "pending") ? (
            <button
              type="button"
              onClick={onCancelTx}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-500 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-rose-200 transition hover:bg-rose-500/10"
            >
              Cancel transaction
            </button>
          ) : null}
          {onSpeedUp && (status === "confirming" || status === "pending") ? (
            <button
              type="button"
              onClick={onSpeedUp}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-secondary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary transition hover:bg-secondary/10"
            >
              <Zap size={14} />
              Speed up
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-bronze/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted transition hover:border-primary hover:text-primary"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function renderTitle(status: TransactionStage) {
  switch (status) {
    case "prompting":
      return "Waiting for wallet confirmation…";
    case "pending":
      return "Transaction submitted";
    case "confirming":
      return "Confirming on-chain…";
    case "success":
      return "Transaction confirmed";
    case "error":
      return "Transaction failed";
    default:
      return "Processing transaction…";
  }
}

function renderSubtitle(status: TransactionStage) {
  switch (status) {
    case "prompting":
      return "Approve this action in your connected wallet.";
    case "pending":
      return "Your transaction was broadcast to the network. Waiting for confirmations.";
    case "confirming":
      return "Confirmations are accruing. You can close this window while we finish up.";
    case "success":
      return "Funds have settled successfully.";
    case "error":
      return "Review the error details and try again.";
    default:
      return "";
  }
}

type ProgressBarProps = {
  progress: number;
  status: TransactionStage;
};

function ProgressBar({ progress, status }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return (
    <div className="h-2 rounded-full bg-foundation-black/40">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${status === "success" ? 100 : clamped}%`,
          background:
            status === "error"
              ? "#f87171"
              : "linear-gradient(90deg, rgba(201,169,97,1) 0%, rgba(107,70,193,1) 100%)",
        }}
      />
    </div>
  );
}

function openExplorer(hash: `0x${string}`, chainId?: number | null) {
  if (!chainId) return;
  const base = explorerByChain[chainId];
  if (base) {
    window.open(`${base}/tx/${hash}`, "_blank", "noopener");
  }
}
