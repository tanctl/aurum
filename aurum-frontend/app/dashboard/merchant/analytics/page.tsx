"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAccount } from "wagmi";

import { PaymentHistoryTable } from "@/components/subscription/PaymentHistoryTable";
import { useMerchantStats, useMerchantTransactions } from "@/hooks/useSubscriptions";
import { useMerchantTokenStats as useEnvioTokenStats } from "@/hooks/useEnvio";
import { formatTokenAmount } from "@/lib/utils";

export default function MerchantAnalyticsPage() {
  const { address } = useAccount();
  const { data: relayerData } = useMerchantStats(address);
  const { data: transactions } = useMerchantTransactions(address, {
    page: 0,
    size: 20,
  });
  const { data: envioData } = useEnvioTokenStats(address);

  const mergedTokenStats = useMemo(() => {
    const totals: Record<string, number> = {};

    if (relayerData?.tokenTotals) {
      Object.entries(relayerData.tokenTotals).forEach(([token, total]) => {
        totals[token] = (totals[token] ?? 0) + Number(total);
      });
    }

    envioData?.MerchantTokenStats?.forEach((row) => {
      totals[row.tokenSymbol] =
        (totals[row.tokenSymbol] ?? 0) +
        Number(formatTokenAmount(row.totalRevenue, 18, 4));
    });

    return Object.entries(totals).map(([token, value]) => ({
      token,
      value,
    }));
  }, [relayerData?.tokenTotals, envioData?.MerchantTokenStats]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-muted">
          Token distribution, execution cadence, and attestation visibility across chains.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-secondary/80">
            Unique tokens
          </p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">
            {mergedTokenStats.length}
          </p>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-secondary/80">
            Executions indexed
          </p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">
            {transactions?.count ?? 0}
          </p>
        </div>
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest text-secondary/80">
            Nexus attestations
          </p>
          <p className="mt-3 text-3xl font-semibold text-text-primary">
            {
              transactions?.transactions.filter((item) => item.nexusVerified)
                .length ?? 0
            }
          </p>
        </div>
      </section>

      <section className="card-surface p-6">
        <h2 className="text-sm font-semibold text-text-primary">
          Token breakdown
        </h2>
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer>
            <AreaChart data={mergedTokenStats}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a961" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#c9a961" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="value"
                stroke="#c9a961"
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Execution ledger
        </h2>
        <PaymentHistoryTable rows={transactions?.transactions ?? []} />
      </section>
    </div>
  );
}
