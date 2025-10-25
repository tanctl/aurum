"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { ChevronDown, ChevronRight, Filter, Loader2, Search } from "lucide-react";

import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { useUserSubscriptions } from "@/hooks/useEnvio";
import { getChainName, formatStatusLabel } from "@/lib/utils";

type StatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "COMPLETED";

const FILTER_OPTIONS: StatusFilter[] = ["ALL", "ACTIVE", "PAUSED", "COMPLETED"];

export default function SubscriptionsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    ACTIVE: false,
    PAUSED: false,
    OTHER: false,
  });

  const {
    data: subscriptions,
    isLoading,
    isFetching,
  } = useUserSubscriptions(address);

  const filtered = useMemo(() => {
    if (!subscriptions) return [];
    const lowerSearch = search.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "COMPLETED"
          ? subscription.status === "COMPLETED"
          : subscription.status === filter;
      const matchesSearch = lowerSearch
        ? subscription.merchant.toLowerCase().includes(lowerSearch) ||
          subscription.subscriptionId.toLowerCase().includes(lowerSearch)
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [subscriptions, filter, search]);

  const grouped = useMemo(() => {
    const groups = {
      ACTIVE: [] as typeof filtered,
      PAUSED: [] as typeof filtered,
      OTHER: [] as typeof filtered,
    };
    for (const subscription of filtered) {
      if (subscription.status === "ACTIVE") {
        groups.ACTIVE.push(subscription);
      } else if (subscription.status === "PAUSED") {
        groups.PAUSED.push(subscription);
      } else {
        groups.OTHER.push(subscription);
      }
    }
    return groups;
  }, [filtered]);

  const isEmpty = !isLoading && (!subscriptions || subscriptions.length === 0);
  const showFilteredEmpty = !isLoading && filtered.length === 0 && !isEmpty;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">My subscriptions</h1>
          <p className="text-sm text-text-muted">
            View and manage recurring payments created with Aurum.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by merchant or ID"
              className="rounded-md border border-bronze/60 bg-carbon pl-9 pr-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as StatusFilter)}
              className="appearance-none rounded-md border border-bronze/60 bg-carbon pl-9 pr-8 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "ALL" ? "All" : formatStatusLabel(option)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-48 animate-pulse rounded-xl border border-carbon/60 bg-carbon/60"
            />
          ))}
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          {showFilteredEmpty ? (
            <div className="card-surface border border-bronze/60 p-6 text-sm text-text-muted">
              No subscriptions match your filters. Try adjusting the filter options above.
            </div>
          ) : null}

          <Section
            title="Active subscriptions"
            description="Currently scheduled and processing."
            collapsed={collapsed.ACTIVE}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, ACTIVE: !prev.ACTIVE }))
            }
            loading={isFetching}
          >
            {grouped.ACTIVE.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {grouped.ACTIVE.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.subscriptionId}
                    subscriptionId={subscription.subscriptionId}
                    merchant={subscription.merchant}
                    amount={subscription.amount}
                    tokenSymbol={subscription.tokenSymbol ?? "TOKEN"}
                    status={subscription.status}
                    intervalSeconds={subscription.interval}
                    executedPayments={subscription.paymentsExecuted}
                    maxPayments={subscription.maxPayments}
                    nextPaymentTime={subscription.nextPaymentDue}
                    totalAmountPaid={subscription.totalAmountPaid}
                    explorerUrl={subscription.explorerUrl}
                    href={`/subscriptions/${subscription.subscriptionId}`}
                    chainLabel={getChainName(subscription.chainId)}
                    accent="highlight"
                    createdAt={subscription.createdAt}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">You have no active subscriptions.</p>
            )}
          </Section>

          <Section
            title="Paused subscriptions"
            description="Temporarily halted; resume to continue billing."
            collapsed={collapsed.PAUSED}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, PAUSED: !prev.PAUSED }))
            }
            loading={isFetching}
          >
            {grouped.PAUSED.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {grouped.PAUSED.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.subscriptionId}
                    subscriptionId={subscription.subscriptionId}
                    merchant={subscription.merchant}
                    amount={subscription.amount}
                    tokenSymbol={subscription.tokenSymbol ?? "TOKEN"}
                    status={subscription.status}
                    intervalSeconds={subscription.interval}
                    executedPayments={subscription.paymentsExecuted}
                    maxPayments={subscription.maxPayments}
                    nextPaymentTime={subscription.nextPaymentDue}
                    totalAmountPaid={subscription.totalAmountPaid}
                    explorerUrl={subscription.explorerUrl}
                    href={`/subscriptions/${subscription.subscriptionId}`}
                    chainLabel={getChainName(subscription.chainId)}
                    createdAt={subscription.createdAt}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No paused subscriptions found.</p>
            )}
          </Section>

          <Section
            title="Completed & archived"
            description="Completed, cancelled, or expired schedules."
            collapsed={collapsed.OTHER}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, OTHER: !prev.OTHER }))
            }
            loading={isFetching}
          >
            {grouped.OTHER.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {grouped.OTHER.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.subscriptionId}
                    subscriptionId={subscription.subscriptionId}
                    merchant={subscription.merchant}
                    amount={subscription.amount}
                    tokenSymbol={subscription.tokenSymbol ?? "TOKEN"}
                    status={subscription.status}
                    intervalSeconds={subscription.interval}
                    executedPayments={subscription.paymentsExecuted}
                    maxPayments={subscription.maxPayments}
                    nextPaymentTime={subscription.nextPaymentDue}
                    totalAmountPaid={subscription.totalAmountPaid}
                    explorerUrl={subscription.explorerUrl}
                    href={`/subscriptions/${subscription.subscriptionId}`}
                    chainLabel={getChainName(subscription.chainId)}
                    createdAt={subscription.createdAt}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Nothing to show here yet.</p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  collapsed: boolean;
  onToggle: () => void;
  loading?: boolean;
  children: React.ReactNode;
};

function Section({
  title,
  description,
  collapsed,
  onToggle,
  loading,
  children,
}: SectionProps) {
  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg border border-bronze/60 bg-carbon/60 px-4 py-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight size={14} className="text-text-muted" />
            ) : (
              <ChevronDown size={14} className="text-text-muted" />
            )}
            <span className="text-sm font-semibold text-text-primary">{title}</span>
          </div>
          {description ? (
            <p className="mt-1 text-xs text-text-muted">{description}</p>
          ) : null}
        </div>
        {loading ? <Loader2 size={16} className="animate-spin text-text-muted" /> : null}
      </button>
      {!collapsed ? children : null}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="card-surface flex flex-col items-center gap-4 border border-bronze/60 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-carbon">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">
          You haven&apos;t created any subscriptions yet
        </h2>
        <p className="max-w-md text-sm text-text-muted">
          Launch your first recurring payment by generating an intent and sending it to the relayer.
        </p>
      </div>
      <Link
        href="/dashboard/merchant/create"
        className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-widest text-foundation-black transition hover:bg-secondary hover:text-foundation-black"
      >
        Create your first subscription
      </Link>
    </div>
  );
}
