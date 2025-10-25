"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

import { PaymentHistoryTable } from "@/components/subscription/PaymentHistoryTable";
import { SubscriptionActions } from "@/components/subscription/SubscriptionActions";
import { SubscriptionTimeline, type TimelineEvent } from "@/components/subscription/SubscriptionTimeline";
import { usePaymentHistory, useSubscription } from "@/hooks/useEnvio";
import {
  formatInterval,
  formatStatusLabel,
  formatTokenAmount,
  formatDateTime,
  getChainName,
  tokenDecimalsForSymbol,
} from "@/lib/utils";

const ENVIO_EXPLORER_URL =
  process.env.NEXT_PUBLIC_ENVIO_EXPLORER_URL?.replace(/\/$/, "") ?? "";

function transactionUrl(hash: string, chainId: number) {
  switch (chainId) {
    case 84532:
      return `https://sepolia.basescan.org/tx/${hash}`;
    case 11155111:
    default:
      return `https://sepolia.etherscan.io/tx/${hash}`;
  }
}

export default function SubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const subscriptionId = params?.id;
  const {
    data: subscription,
    isLoading,
    refetch,
  } = useSubscription(subscriptionId);
  const { data: payments = [], isLoading: loadingPayments } = usePaymentHistory(subscriptionId);
  const [recentPayment, setRecentPayment] = useState<typeof payments[number] | null>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (payments.length > lastCountRef.current) {
      setRecentPayment(payments[payments.length - 1]);
      lastCountRef.current = payments.length;
      const timeout = window.setTimeout(() => setRecentPayment(null), 6000);
      return () => window.clearTimeout(timeout);
    }
    lastCountRef.current = payments.length;
    return undefined;
  }, [payments]);

  const decimals = tokenDecimalsForSymbol(subscription?.tokenSymbol);
  const intervalSeconds = subscription ? Number(subscription.interval ?? 0) : 0;
  const paymentsExecuted = subscription ? Number(subscription.paymentsExecuted ?? 0) : 0;
  const maxPayments = subscription ? Number(subscription.maxPayments ?? 0) : 0;
  const chainId = subscription ? Number(subscription.chainId ?? 0) : undefined;

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!subscription) return [];
    const executed: TimelineEvent[] = payments.map((payment) => ({
      label: `Payment #${payment.paymentNumber}`,
      timestamp: payment.timestamp,
      state: "past",
    }));

    const events = [...executed];

    if (subscription.nextPaymentDue) {
      events.push({
        label: "Next payment",
        timestamp: Number(subscription.nextPaymentDue),
        state: "current",
      });
    }

    const nextPaymentBase = subscription.nextPaymentDue
      ? Number(subscription.nextPaymentDue)
      : Number(subscription.startTime ?? 0);

    if (maxPayments > 0) {
      const remaining = Math.max(
        maxPayments - paymentsExecuted,
        0
      );
      const limit = Math.min(remaining, 3);
      for (let index = 1; index <= limit; index++) {
        events.push({
          label: `Scheduled payment ${paymentsExecuted + index}`,
          timestamp: nextPaymentBase + intervalSeconds * index,
          state: "future",
        });
      }
    }

    return events;
  }, [subscription, payments, maxPayments, paymentsExecuted, intervalSeconds]);

  const explorerUrl =
    subscription?.subscriptionId && ENVIO_EXPLORER_URL
      ? `${ENVIO_EXPLORER_URL}/entities/subscription/${subscription.subscriptionId.toLowerCase()}`
      : null;

  if (!subscriptionId) {
    return (
      <div className="space-y-4">
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back to subscriptions
        </Link>
        <div className="rounded-md border border-rose-500/60 bg-rose-500/10 p-4 text-sm text-rose-200">
          Subscription ID missing from URL.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back to subscriptions
        </Link>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            Loading subscription…
          </div>
        ) : subscription ? (
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold text-text-primary">
              Subscription {subscription.subscriptionId.slice(0, 10)}…
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span>Merchant {subscription.merchant}</span>
              <span>• Chain {getChainName(chainId)}</span>
              <span>
                • Created {formatDateTime(subscription.createdAt)}
              </span>
              <span>• Status {formatStatusLabel(subscription.status)}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-rose-500/60 bg-rose-500/10 p-4 text-sm text-rose-200">
            Subscription not found.
          </div>
        )}
      </header>

      {recentPayment ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100">
          <span>
            Payment #{recentPayment.paymentNumber} executed {formatDateTime(recentPayment.timestamp)}.
          </span>
          <a
            href={transactionUrl(recentPayment.txHash, recentPayment.chainId ?? subscription?.chainId ?? 11155111)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-200 hover:text-emerald-100"
          >
            View transaction
            <ExternalLink size={12} />
          </a>
        </div>
      ) : null}

      {subscription ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="card-surface space-y-4 border border-bronze/60 p-6">
              <h2 className="text-sm font-semibold text-text-primary">
                Subscription details
              </h2>
              <dl className="grid gap-3 text-sm text-text-muted md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Merchant
                  </dt>
                  <dd className="break-words text-text-muted">{subscription.merchant}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Amount
                  </dt>
                  <dd className="text-text-primary">
                    {formatTokenAmount(subscription.amount, decimals)} {subscription.tokenSymbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Interval
                  </dt>
                  <dd>{formatInterval(intervalSeconds)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Total paid
                  </dt>
                  <dd className="text-text-primary">
                    {formatTokenAmount(subscription.totalAmountPaid ?? "0", decimals)}{" "}
                    {subscription.tokenSymbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Executed / Max
                  </dt>
                  <dd>
                    {paymentsExecuted}
                    {maxPayments > 0 ? ` / ${maxPayments}` : " • unlimited"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Next payment
                  </dt>
                  <dd>{formatDateTime(subscription.nextPaymentDue)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Expiry
                  </dt>
                  <dd>{formatDateTime(subscription.expiry)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-text-primary">
                    Created block
                  </dt>
                  <dd>{subscription.createdAtBlock ?? "—"}</dd>
                </div>
              </dl>
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-secondary hover:text-primary"
                >
                  View data on Envio Explorer
                  <ExternalLink size={12} />
                </a>
              ) : null}
            </div>

            <div className="card-surface space-y-4 border border-bronze/60 p-6">
              <h2 className="text-sm font-semibold text-text-primary">Actions</h2>
              <SubscriptionActions
                subscriptionId={subscription.subscriptionId}
                status={subscription.status}
                tokenSymbol={subscription.tokenSymbol ?? "TOKEN"}
                amount={subscription.amount}
                chainId={chainId}
                onComplete={() => refetch()}
              />
            </div>
          </section>

          <SubscriptionTimeline events={timelineEvents} />

          <PaymentHistoryTable
            rows={payments.map((payment) => ({
              id: payment.id,
              subscriptionId: payment.subscriptionId,
              paymentNumber: payment.paymentNumber,
              timestamp: payment.timestamp,
              amount: payment.amount,
              fee: payment.fee,
              tokenSymbol: subscription.tokenSymbol ?? "TOKEN",
              relayer: payment.relayer,
              transactionHash: payment.txHash,
              nexusVerified: payment.nexusVerified,
              explorerUrl: ENVIO_EXPLORER_URL
                ? `${ENVIO_EXPLORER_URL}/entities/payment/${payment.id ?? `${payment.subscriptionId}-${payment.paymentNumber}`}`
                : undefined,
              chainId: payment.chainId,
            }))}
            explorerBaseUrl={ENVIO_EXPLORER_URL}
          />
          {loadingPayments && !payments.length ? (
            <div className="text-sm text-text-muted">Loading payment history…</div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}