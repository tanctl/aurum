import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Copy, ExternalLink, Info, ChevronDown, ChevronUp } from "lucide-react";

import {
  formatInterval,
  formatStatusLabel,
  formatTokenAmount,
  shortenAddress,
  statusBadgeClass,
  formatDateTime,
  tokenDecimalsForSymbol,
} from "@/lib/utils";

type SubscriptionCardProps = {
  subscriptionId?: string;
  id?: string;
  merchant: string;
  tokenSymbol?: string;
  amount: string;
  status?: string;
  intervalSeconds?: number;
  executedPayments?: number;
  maxPayments?: number;
  nextPaymentTime?: number;
  totalAmountPaid?: string;
  explorerUrl?: string;
  href?: string;
  chainLabel?: string;
  accent?: "default" | "highlight";
  createdAt?: number;
  className?: string;
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SubscriptionCard({
  subscriptionId,
  id,
  merchant,
  tokenSymbol = "TOKEN",
  amount,
  status = "UNKNOWN",
  intervalSeconds,
  executedPayments,
  maxPayments,
  nextPaymentTime,
  totalAmountPaid,
  explorerUrl,
  href,
  chainLabel,
  accent = "default",
  createdAt,
  className,
}: SubscriptionCardProps) {
  const [copied, setCopied] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const displayId = subscriptionId ?? id ?? "";
  const decimals = tokenDecimalsForSymbol(tokenSymbol);
  const progress = useMemo(() => {
    if (!maxPayments || maxPayments <= 0 || executedPayments === undefined) {
      return undefined;
    }
    return Math.min((executedPayments / maxPayments) * 100, 100);
  }, [executedPayments, maxPayments]);

  const nextPaymentLabel = nextPaymentTime
    ? `${formatDateTime(nextPaymentTime)} (${formatDistanceToNow(
        new Date(nextPaymentTime * 1000),
        { addSuffix: true }
      )})`
    : "Not scheduled";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch (error) {
      console.error("Failed to copy subscription id", error);
    }
  }

  return (
    <article
      className={classNames(
        "card-surface relative flex flex-col gap-4 border border-bronze/60 p-6 transition-colors hover:border-primary/60",
        accent === "highlight" ? "ring-1 ring-primary/40" : "",
        className
      )}
      data-status={status}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary/80">Subscription</p>
          <h3 className="text-lg font-semibold text-text-primary">
            {formatTokenAmount(amount, decimals)} {tokenSymbol}
            {intervalSeconds ? (
              <span className="ml-2 text-sm font-normal text-text-muted">
                / {formatInterval(intervalSeconds)}
              </span>
            ) : null}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-md border border-bronze/50 px-2 py-1 text-text-primary hover:border-primary hover:text-primary"
            >
              <Copy size={12} />
              {copied ? "Copied" : shortenAddress(displayId)}
            </button>
            <span>Merchant {shortenAddress(merchant)}</span>
            {chainLabel ? <span>• {chainLabel}</span> : null}
            {createdAt ? (
              <span>
                • Created {formatDistanceToNow(new Date(createdAt * 1000), { addSuffix: true })}
              </span>
            ) : null}
          </div>
        </div>
        <span
          className={classNames(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest",
            statusBadgeClass(status)
          )}
        >
          {formatStatusLabel(status)}
        </span>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <dl className="space-y-2 text-sm text-text-muted">
          <div className="flex items-center justify-between">
            <dt className="text-text-primary">Next payment</dt>
            <dd>{nextPaymentLabel}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-primary">Payments made</dt>
            <dd>
              {executedPayments ?? 0}
              {typeof maxPayments === "number" && maxPayments > 0 ? ` / ${maxPayments}` : ""}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-text-primary">Total paid</dt>
            <dd>
              {formatTokenAmount(totalAmountPaid ?? "0", decimals)} {tokenSymbol}
            </dd>
         </div>
        </dl>
        <div className="flex flex-col justify-between gap-3">
          {typeof progress === "number" ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-text-muted">
                <span>Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-carbon/60">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-bronze/60 bg-carbon/60 p-3 text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <Info size={14} className="text-secondary" />
                <span>Ongoing subscription without payment cap.</span>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foundation-black transition hover:bg-secondary hover:text-foundation-black"
              >
                View details
              </Link>
            ) : null}
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-bronze/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-secondary hover:border-primary hover:text-primary"
              >
                <ExternalLink size={14} />
                Envio Explorer
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setDetailsOpen((value) => !value)}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary transition-colors hover:text-primary"
      >
        {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {detailsOpen ? "Hide metadata" : "Show metadata"}
      </button>

      {detailsOpen ? (
        <dl className="grid gap-2 text-xs text-text-muted md:grid-cols-2">
          <div>
            <dt className="uppercase tracking-widest text-text-primary">Subscription ID</dt>
            <dd className="break-all text-text-muted">{displayId || "—"}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-text-primary">Merchant</dt>
            <dd className="break-all text-text-muted">{merchant}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-text-primary">Interval</dt>
            <dd className="text-text-muted">{formatInterval(intervalSeconds)}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-text-primary">Next payment</dt>
            <dd className="text-text-muted">{nextPaymentLabel}</dd>
          </div>
        </dl>
      ) : null}
    </article>
  );
}
