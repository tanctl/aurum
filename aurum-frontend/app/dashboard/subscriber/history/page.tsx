"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";

import { SubscriptionTimeline } from "@/components/subscription/SubscriptionTimeline";
import { useSubscriberHistory } from "@/hooks/useSubscriptions";
import { shortenAddress } from "@/lib/utils";

export default function SubscriberHistoryPage() {
  const { address } = useAccount();
  const { data, isLoading } = useSubscriberHistory(address);

  const timeline = useMemo(
    () =>
      data?.map((item) => ({
        label: `${item.status} • ${shortenAddress(item.subscriptionId)}`,
        timestamp: item.timestamp,
        description: new Date(item.updatedAt).toLocaleString(),
        completed: item.status === "EXECUTED" || item.status === "COMPLETED",
      })) ?? [],
    [data],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">
          Payment history
        </h1>
        <p className="text-sm text-text-muted">
          Review execution outcomes, pauses, and cancellations emitted by the relayer service.
        </p>
      </header>

      {isLoading ? (
        <div className="card-surface p-6 text-sm text-text-muted">
          Loading timeline...
        </div>
      ) : null}

      {!isLoading && timeline.length === 0 ? (
        <div className="card-surface p-6 text-sm text-text-muted">
          No events found. Once payments execute, they will appear here.
        </div>
      ) : null}

      {timeline.length ? <SubscriptionTimeline events={timeline} /> : null}
    </div>
  );
}
