"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ClipboardCopy, Loader2, RefreshCw } from "lucide-react";
import { useAccount, useChainId } from "wagmi";

import { getPyusdAddress } from "@/lib/contracts";
import { type SupportedChainId } from "@/lib/wagmi";
import {
  encodeTemplate,
  type SubscriptionTemplate,
} from "@/lib/subscriptionTemplate";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const NETWORK_OPTIONS: Array<{ label: string; value: SupportedChainId }> = [
  { label: "Sepolia", value: 11155111 },
  { label: "Base Sepolia", value: 84532 },
];

const INTERVAL_PRESETS = [
  { key: "monthly", label: "Monthly", seconds: 30 * 24 * 60 * 60 },
  { key: "quarterly", label: "Quarterly", seconds: 90 * 24 * 60 * 60 },
  { key: "yearly", label: "Yearly", seconds: 365 * 24 * 60 * 60 },
] as const;

const CUSTOM_INTERVAL_KEY = "custom";

const subscriptionSchema = z.object({
  merchant: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/u, "Enter a valid merchant address"),
  amount: z
    .string()
    .refine((value) => Number(value) > 0, "Amount must be greater than zero"),
  interval: z
    .number()
    .min(60, "Interval must be at least one minute"),
  maxPayments: z
    .number()
    .min(1, "At least one payment is required"),
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/u, "Select a supported token"),
  network: z.string().min(1, "Select a network"),
  description: z
    .string()
    .max(240, "Keep the description under 240 characters")
    .optional()
    .or(z.literal("")),
  customIntervalDays: z.number().min(1, "Custom interval must be at least 1 day").optional(),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

type GeneratedTemplate = {
  shareUrl: string;
  encoded: string;
  template: SubscriptionTemplate;
};

function defaultTokenForChain(chain: SupportedChainId): string {
  const options = tokenOptionsForChain(chain);
  if (options.length === 0) {
    return "";
  }
  return options[0].value;
}

function tokenOptionsForChain(
  chain: SupportedChainId,
): Array<{ label: string; value: string }> {
  const chainLabel = chain === 84532 ? "Base Sepolia" : "Sepolia";
  const pyusdAddress = getPyusdAddress(chain);
  const options: Array<{ label: string; value: string }> = [];

  if (pyusdAddress && pyusdAddress !== ZERO_ADDRESS) {
    options.push({
      label: `${chainLabel} – PYUSD`,
      value: pyusdAddress,
    });
  }

  options.push({
    label: `${chainLabel} – Native ETH`,
    value: ZERO_ADDRESS,
  });

  return options.filter(
    (option, index, self) =>
      self.findIndex((candidate) => candidate.value.toLowerCase() === option.value.toLowerCase()) ===
      index,
  );
}

export default function MerchantCreatePage() {
  const { address } = useAccount();
  const connectedChain = useChainId() as SupportedChainId | undefined;

  const [selectedChain, setSelectedChain] = useState<SupportedChainId>(
    connectedChain ?? NETWORK_OPTIONS[0].value,
  );
  const [selectedIntervalKey, setSelectedIntervalKey] = useState<string>(
    INTERVAL_PRESETS[1]?.key ?? "monthly",
  );
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(30);
  const [isSubmitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const defaultValues = useMemo<SubscriptionFormValues>(
    () => ({
      merchant: address ?? "",
      amount: "1.0",
      interval: INTERVAL_PRESETS[1]?.seconds ?? 30 * 24 * 60 * 60,
      maxPayments: 12,
      tokenAddress: defaultTokenForChain(connectedChain ?? NETWORK_OPTIONS[0].value),
      network: String(connectedChain ?? NETWORK_OPTIONS[0].value),
      description: "",
      customIntervalDays: customIntervalDays,
    }),
    [address, connectedChain, customIntervalDays],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues,
  });

  useEffect(() => {
    if (address) {
      setValue("merchant", address);
    }
  }, [address, setValue]);

  const tokenAddressField = register("tokenAddress");
  const networkField = register("network");
  const customIntervalDaysField = register("customIntervalDays", { valueAsNumber: true });

  // keep RHF state in sync with connected chain
  useEffect(() => {
    if (!connectedChain) return;
    setSelectedChain(connectedChain);
    setValue("network", String(connectedChain));
    setValue("tokenAddress", defaultTokenForChain(connectedChain));
  }, [connectedChain, setValue]);

  // update interval seconds when preset/custom changes
  const watchedCustomDays = watch("customIntervalDays") ?? customIntervalDays;
  useEffect(() => {
    if (selectedIntervalKey === CUSTOM_INTERVAL_KEY) {
      const days = watchedCustomDays > 0 ? watchedCustomDays : 1;
      setValue("interval", days * 24 * 60 * 60);
    }
  }, [selectedIntervalKey, watchedCustomDays, setValue]);

  const amount = watch("amount");
  const maxPayments = watch("maxPayments");

  const tokenOptions = useMemo(
    () => tokenOptionsForChain(selectedChain),
    [selectedChain],
  );

  function handleNetworkChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = Number(event.target.value) as SupportedChainId;
    setSelectedChain(value);
    setValue("network", event.target.value);
    setValue("tokenAddress", defaultTokenForChain(value));
  }

  function handleIntervalChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const key = event.target.value;
    setSelectedIntervalKey(key);
    if (key === CUSTOM_INTERVAL_KEY) {
      const days = watchedCustomDays > 0 ? watchedCustomDays : 1;
      setValue("interval", days * 24 * 60 * 60);
    } else {
      const preset = INTERVAL_PRESETS.find((option) => option.key === key);
      setValue("interval", preset?.seconds ?? INTERVAL_PRESETS[0].seconds);
    }
  }

  async function onSubmit(values: SubscriptionFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      setCopySuccess(false);

      if (selectedIntervalKey === CUSTOM_INTERVAL_KEY && (!watchedCustomDays || watchedCustomDays <= 0)) {
        throw new Error("Please enter the number of days for the custom interval.");
      }

      const template: SubscriptionTemplate = {
        chainId: selectedChain,
        merchant: values.merchant,
        token: values.tokenAddress,
        amount: values.amount,
        interval: values.interval,
        maxPayments: values.maxPayments,
        maxTotalAmount: (Number(values.amount) * values.maxPayments).toString(),
        description: values.description?.trim() || undefined,
        createdAt: Date.now(),
      };

      const encoded = encodeTemplate(template);
      if (!encoded) {
        throw new Error("Unable to encode subscription template in this environment.");
      }

      const origin = window.location.origin;
      const shareUrl = `${origin}/subscribe?intent=${encodeURIComponent(encoded)}`;
      setGenerated({ shareUrl, encoded, template });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate template link");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyShareUrl() {
    if (!generated?.shareUrl) return;
    await navigator.clipboard.writeText(generated.shareUrl);
    setCopySuccess(true);
    setError(null);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  function resetForm() {
    const resetChain = connectedChain ?? NETWORK_OPTIONS[0].value;
    setSelectedChain(resetChain);
    setSelectedIntervalKey(INTERVAL_PRESETS[1]?.key ?? "monthly");
    setCustomIntervalDays(30);

    reset({
      merchant: address ?? "",
      amount: "1.0",
      interval: INTERVAL_PRESETS[1]?.seconds ?? 30 * 24 * 60 * 60,
      maxPayments: 12,
      tokenAddress: defaultTokenForChain(resetChain),
      network: String(resetChain),
      description: "",
      customIntervalDays: 30,
    });

    setGenerated(null);
    setError(null);
    setCopySuccess(false);
  }

  const networkLabel = NETWORK_OPTIONS.find((option) => option.value === selectedChain)?.label ?? "Unknown network";
  const intervalLabel =
    selectedIntervalKey === CUSTOM_INTERVAL_KEY
      ? `${watchedCustomDays || customIntervalDays} day interval`
      : INTERVAL_PRESETS.find((option) => option.key === selectedIntervalKey)?.label ?? "custom interval";
  const totalAmount = amount && maxPayments ? (Number(amount) * Number(maxPayments)).toFixed(4) : "0.0000";
  const intentCreated = Boolean(generated);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">Merchant Dashboard</p>
        <h1 className="text-2xl font-semibold text-text-primary">Create</h1>
        <p className="text-sm text-text-muted">
          Configure billing parameters once. Share the generated link with your subscriber so they can review, sign, and submit the intent from their wallet.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-surface grid gap-6 p-6 md:grid-cols-2"
      >
        <label className="flex flex-col gap-2 text-sm md:col-span-2">
          <span className="text-text-muted">Payment token</span>
          <select
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...tokenAddressField}
            value={watch("tokenAddress") ?? ""}
            onChange={(event) => {
              tokenAddressField.onChange(event);
            }}
          >
            <option value="">Select token</option>
            {tokenOptions.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.tokenAddress ? (
            <span className="text-xs text-rose-300">{errors.tokenAddress.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Network</span>
          <select
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            value={String(selectedChain)}
            {...networkField}
            onChange={(event) => {
              networkField.onChange(event);
              handleNetworkChange(event);
            }}
          >
            {NETWORK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-2xs text-text-muted">Subscribers must switch to {networkLabel} before signing.</span>
          {errors.network ? (
            <span className="text-xs text-rose-300">{errors.network.message}</span>
          ) : null}
        </label>

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
          <span className="text-text-muted">Payment amount</span>
          <input
            type="number"
            step="0.000001"
            min="0"
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            {...register("amount")}
          />
          {errors.amount ? (
            <span className="text-xs text-rose-300">{errors.amount.message}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Billing interval</span>
          <select
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            value={selectedIntervalKey}
            onChange={handleIntervalChange}
          >
            {INTERVAL_PRESETS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_INTERVAL_KEY}>Custom (days)</option>
          </select>
          {selectedIntervalKey === CUSTOM_INTERVAL_KEY ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="w-24 rounded-md border border-bronze/60 bg-foundation-black px-2 py-1 text-sm text-text-primary focus:border-primary focus:outline-none"
                value={watchedCustomDays ?? customIntervalDays}
                {...customIntervalDaysField}
                onChange={(event) => {
                  customIntervalDaysField.onChange(event);
                  const days = Number(event.target.value) || 1;
                  setCustomIntervalDays(days);
                  setValue("interval", days * 24 * 60 * 60);
                }}
              />
              <span className="text-2xs text-text-muted">Days between each charge</span>
            </div>
          ) : null}
          {errors.customIntervalDays ? (
            <span className="text-xs text-rose-300">{errors.customIntervalDays.message}</span>
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

        <label className="md:col-span-2 flex flex-col gap-2 text-sm">
          <span className="text-text-muted">Internal notes (optional)</span>
          <textarea
            rows={3}
            className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            placeholder="Subscription purpose, plan name, etc."
            {...register("description")}
          />
          {errors.description ? (
            <span className="text-xs text-rose-300">{errors.description.message}</span>
          ) : null}
        </label>

        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="space-y-1 text-xs text-text-muted">
            <p>
              Billing
              <span className="text-text-primary font-semibold">
                {" "}
                {amount || 0}
              </span>
              {" "}tokens
              <span className="text-text-primary font-semibold">
                {" "}
                {intervalLabel.toLowerCase()}
              </span>
              .
            </p>
            <p>
              Maximum total across {maxPayments || 0} payments
              <span className="text-text-primary font-semibold">
                {" "}
                {totalAmount}
              </span>
              .
            </p>
            <p>Subscribers need balance and allowance above the maximum total before each execution.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-md border px-6 py-3 text-xs font-semibold uppercase tracking-widest transition-colors md:w-auto ${
              intentCreated
                ? "border-primary bg-primary/10 text-primary"
                : "border-primary bg-transparent text-primary hover:bg-primary/10"
            } disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : intentCreated ? (
              <Check className="h-4 w-4" />
            ) : null}
            {intentCreated ? "Intent created" : "Create intent"}
          </button>
        </div>
      </form>

      {generated ? (
        <div className="card-surface space-y-4 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Share this link</h2>
          <p className="text-sm text-text-muted">
            Anyone with the link can review the schedule, connect their wallet, sign the intent, and submit it to the relayer on {networkLabel}.
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <code className="flex-1 truncate rounded-md bg-carbon px-3 py-2 text-xs text-text-primary">
              {generated.shareUrl}
            </code>
            <button
              type="button"
              onClick={copyShareUrl}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                copySuccess
                  ? "border-primary bg-primary text-foundation-black"
                  : "border-primary text-primary hover:bg-primary/10"
              }`}
            >
              <ClipboardCopy className="h-4 w-4" /> {copySuccess ? "Link copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-md border border-bronze/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-text-muted hover:border-bronze"
            >
              <RefreshCw className="h-4 w-4" /> Create another intent
            </button>
          </div>

          <div className="grid gap-2 text-xs text-text-muted md:grid-cols-2">
            <div>
              <span className="font-semibold text-text-primary">Network</span>
              <p className="mt-1">{networkLabel}</p>
            </div>
            <div>
              <span className="font-semibold text-text-primary">Merchant</span>
              <p className="mt-1 break-all">{generated.template.merchant}</p>
            </div>
            <div>
              <span className="font-semibold text-text-primary">Token</span>
              <p className="mt-1 break-all">{generated.template.token}</p>
            </div>
            <div>
              <span className="font-semibold text-text-primary">Amount / cycle</span>
              <p className="mt-1">{generated.template.amount}</p>
            </div>
            <div>
              <span className="font-semibold text-text-primary">Billing interval</span>
              <p className="mt-1">
                {selectedIntervalKey === CUSTOM_INTERVAL_KEY
                  ? `${watchedCustomDays || customIntervalDays} days`
                  : INTERVAL_PRESETS.find((option) => option.seconds === generated.template.interval)?.label ??
                    `${generated.template.interval} seconds`}
              </p>
            </div>
            <div>
              <span className="font-semibold text-text-primary">Max payments</span>
              <p className="mt-1">{generated.template.maxPayments}</p>
            </div>
            <div>
              <span className="font-semibold text-text-primary">Max total</span>
              <p className="mt-1">{generated.template.maxTotalAmount}</p>
            </div>
            {generated.template.description ? (
              <div className="md:col-span-2">
                <span className="font-semibold text-text-primary">Notes</span>
                <p className="mt-1 whitespace-pre-line">{generated.template.description}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
