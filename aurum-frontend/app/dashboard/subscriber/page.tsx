"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";

import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { SubscriptionActions } from "@/components/subscription/SubscriptionActions";
import { useSubscriberHistory } from "@/hooks/useSubscriptions";
import { shortenAddress } from "@/lib/utils";

export default function SubscriberDashboardPage() {
  const { address } = useAccount();
  const { data: history, isLoading } = useSubscriberHistory(address);

  const activeSubscriptions = useMemo(() => {
    if (!history) return [];
    return history
      .filter((item) => item.status === "ACTIVE")
      .map((item) => ({
        id: item.subscriptionId,
        subscriptionId: item.subscriptionId,
        status: item.status,
        merchant: item.subscriptionId,
        tokenSymbol: "UNKNOWN",
        amount: "0",
        nextPaymentTime: item.timestamp,
      }));
  }, [history]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">
          My subscriptions
        </h1>
        <p className="text-sm text-text-muted">
          {address
            ? `Connected as ${shortenAddress(address)}. Manage active schedules below.`
            : "Connect your wallet to load your subscriptions."}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        {isLoading ? (
          <div className="card-surface p-6 text-sm text-text-muted lg:col-span-2">
            Loading your subscriptions...
          </div>
        ) : null}
        {!isLoading && activeSubscriptions.length === 0 ? (
          <div className="card-surface p-6 text-sm text-text-muted lg:col-span-2">
            No active subscriptions detected. Once you sign an intent, it will appear here.
          </div>
        ) : null}
        {activeSubscriptions.map((subscription) => (
          <div key={subscription.id} className="space-y-4">
            <SubscriptionCard
              {...subscription}
              subscriptionId={subscription.subscriptionId}
              merchant={subscription.merchant}
              amount={subscription.amount}
            />
            <SubscriptionActions
              subscriptionId={subscription.subscriptionId}
              status={subscription.status}
              tokenSymbol={subscription.tokenSymbol}
              amount={subscription.amount}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
