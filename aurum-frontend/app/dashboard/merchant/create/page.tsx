"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAccount, useChainId } from "wagmi";
import { Loader2 } from "lucide-react";

import { getPyusdAddress } from "@/lib/contracts";
import { chains, type SupportedChainId } from "@/lib/wagmi";

const subscriptionSchema = z.object({
  merchant: z.string().min(1, "Merchant address is required"),
  amount: z.string().min(1, "Amount is required"),
  interval: z.number().min(60, "Interval must be at least 60 seconds"),
  maxPayments: z.number().min(1),
  expiry: z.string().min(1),
  tokenAddress: z.string().min(1),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

export default function MerchantCreatePage() {
  const { address } = useAccount();
  const chainId = useChainId() as SupportedChainId | undefined;
  const [isSubmitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const defaultValues: SubscriptionFormValues = useMemo(
    () => ({
      merchant: address ?? "",
      amount: "1.0",
      interval: 86_400,
      maxPayments: 12,
      expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16),
      tokenAddress: chainId ? getPyusdAddress(chainId) : "",
    }),
    [address, chainId],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues,
  });

  async function onSubmit(values: SubscriptionFormValues) {
    if (!chainId) {
      setResult("Connect your wallet on Sepolia or Base to continue.");
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);

      const payload = {
        intent: {
          subscriber: address,
          merchant: values.merchant,
          amount: values.amount,
          interval: values.interval,
          startTime: Math.floor(Date.now() / 1000),
          maxPayments: values.maxPayments,
          maxTotalAmount: (Number(values.amount) * values.maxPayments).toString(),
          expiry: Math.floor(new Date(values.expiry).getTime() / 1000),
          nonce: Date.now(),
          token: values.tokenAddress,
        },
        signature: "0x",
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RELAYER_API_URL}/api/v1/intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to submit intent");
      }

      const json = await response.json();
      setResult(`Intent submitted. Subscription ID: ${json.subscriptionId}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">
          Create a subscription intent
        </h1>
        <p className="text-sm text-text-muted">
          Configure schedule, token, and limits, then share the intent with your subscriber for signature.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-surface grid gap-6 p-6 md:grid-cols-2"
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Merchant address</span>
          <input
            type="text"
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            placeholder="0x..."
            {...register("merchant")}
          />
          {errors.merchant ? (
            <span className="text-xs text-rose-300">{errors.merchant.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Amount</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...register("amount")}
          />
          {errors.amount ? (
            <span className="text-xs text-rose-300">{errors.amount.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Interval (seconds)</span>
          <input
            type="number"
            min="60"
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...register("interval", { valueAsNumber: true })}
          />
          {errors.interval ? (
            <span className="text-xs text-rose-300">{errors.interval.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Max payments</span>
          <input
            type="number"
            min="1"
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...register("maxPayments", { valueAsNumber: true })}
          />
          {errors.maxPayments ? (
            <span className="text-xs text-rose-300">{errors.maxPayments.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Expiry (UTC)</span>
          <input
            type="datetime-local"
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...register("expiry")}
          />
          {errors.expiry ? (
            <span className="text-xs text-rose-300">{errors.expiry.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Payment token</span>
          <select
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...register("tokenAddress")}
          >
            <option value="">Select token</option>
            <option value="0x0000000000000000000000000000000000000000">
              Native ETH
            </option>
            {chains.map((chain) => (
              <option
                key={chain.id}
                value={getPyusdAddress(chain.id as SupportedChainId)}
              >
                {chain.name} – PYUSD
              </option>
            ))}
          </select>
          {errors.tokenAddress ? (
            <span className="text-xs text-rose-300">{errors.tokenAddress.message}</span>
          ) : null}
        </label>

        <div className="col-span-full flex flex-col gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit intent
          </button>
          {result ? (
            <p className="text-sm text-text-muted">{result}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
