"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAccount } from "wagmi";

import { PaymentHistoryTable } from "@/components/subscription/PaymentHistoryTable";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { useMerchantStats, useMerchantTransactions } from "@/hooks/useSubscriptions";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";

export default function MerchantOverviewPage() {
  const { address } = useAccount();
  const { data: stats, isLoading: statsLoading } = useMerchantStats(address);
  const {
    data: transactions,
    isLoading: txLoading,
  } = useMerchantTransactions(address, { page: 0, size: 5 });

  const chartData = useMemo(() => {
    if (!stats?.tokenTotals) return [];
    return Object.entries(stats.tokenTotals).map(([token, total]) => ({
      token,
      total: Number(formatTokenAmount(total, 18, 2)),
    }));
  }, [stats?.tokenTotals]);

  const highlightedSubscription = useMemo(() => {
    const firstPayment = transactions?.transactions?.[0];
    if (!firstPayment) return null;
    return {
      id: firstPayment.subscriptionId,
      merchant: firstPayment.merchant,
      tokenSymbol: firstPayment.tokenSymbol,
      amount: firstPayment.amount,
      status: "ACTIVE",
      nextPaymentTime: firstPayment.timestamp,
      executedPayments: firstPayment.paymentNumber,
      maxPayments: stats?.totalSubscriptions ?? 0,
    };
  }, [transactions?.transactions, stats?.totalSubscriptions]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-text-primary">
          Merchant overview
        </h1>
        <p className="text-sm text-text-muted">
          {address ? `Connected as ${shortenAddress(address)}` : "Connect your wallet to load live stats."}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-secondary/80">
            Active Subscriptions
          </p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">
            {statsLoading ? "--" : stats?.activeSubscriptions ?? 0}
          </p>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-secondary/80">
            Total Revenue (all time)
          </p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">
            {statsLoading
              ? "--"
              : `${formatTokenAmount(stats?.totalRevenue ?? "0")}`}
          </p>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-secondary/80">
            Token Mix
          </p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">
            {statsLoading ? "--" : Object.keys(stats?.tokenTotals ?? {}).length}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="card-surface p-6">
            <h2 className="text-sm font-semibold text-text-primary">
              Revenue by token
            </h2>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2F3A" />
                  <XAxis dataKey="token" stroke="#8B92A8" />
                  <YAxis stroke="#8B92A8" />
                  <Tooltip
                    contentStyle={{
                      background: "#151820",
                      borderRadius: 12,
                      border: "1px solid #2A2F3A",
                      color: "#E5E7EB",
                    }}
                  />
                  <Bar dataKey="total" fill="#c9a961" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          {highlightedSubscription ? (
            <SubscriptionCard {...highlightedSubscription} />
          ) : (
            <div className="card-surface p-6 text-sm text-text-muted">
              Recent subscription data will appear here once payments execute.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Latest payments
          </h2>
          <Link
            href="/dashboard/merchant/analytics"
            className="text-xs uppercase tracking-widest text-secondary hover:text-primary"
          >
            View analytics
          </Link>
        </div>
        <PaymentHistoryTable
          rows={transactions?.transactions ?? []}
          emptyLabel={
            address
              ? txLoading
                ? "Loading transactions..."
                : "No executions yet"
              : "Connect your wallet to load transactions"
          }
        />
      </section>
    </div>
  );
}
