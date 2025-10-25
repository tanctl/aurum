"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, ClipboardCopy, Loader2 } from "lucide-react";
import { useAccount, useChainId, useSignTypedData } from "wagmi";

import { getPyusdAddress, getSubscriptionManagerAddress, useErc20Read } from "@/lib/contracts";
import { type SupportedChainId } from "@/lib/wagmi";
import { decodeTemplate, type SubscriptionTemplate } from "@/lib/subscriptionTemplate";
import { formatUnits, parseUnits } from "viem";
import { shortenAddress } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SEPOLIA_CHAIN_ID = 11155111 as SupportedChainId;
const BASE_SEPOLIA_CHAIN_ID = 84532 as SupportedChainId;

const DEFAULT_TOKEN_DECIMALS = 18;
const PYUSD_DECIMALS = 6;
const SIGNING_GRACE_PERIOD_SECONDS = 5 * 60;
const AVAIL_EXPLORER_TEMPLATE =
  process.env.NEXT_PUBLIC_AVAIL_EXPLORER_TEMPLATE ??
  (process.env.NEXT_PUBLIC_AVAIL_EXPLORER_URL
    ? `${process.env.NEXT_PUBLIC_AVAIL_EXPLORER_URL.replace(/\/$/, "")}/block/{block}`
    : "");

const RAW_NETWORK_OPTIONS: Array<{ label: string; value: SupportedChainId }> = [
  { label: "Sepolia", value: SEPOLIA_CHAIN_ID },
  { label: "Base Sepolia", value: BASE_SEPOLIA_CHAIN_ID },
];

const NETWORK_OPTIONS: Array<{
  label: string;
  value: SupportedChainId;
  available: boolean;
}> = RAW_NETWORK_OPTIONS.map((option) => ({
  ...option,
  available: getSubscriptionManagerAddress(option.value) !== ZERO_ADDRESS,
}));

const DEFAULT_CHAIN_ID = (
  NETWORK_OPTIONS.find((option) => option.available)?.value ?? SEPOLIA_CHAIN_ID
) as SupportedChainId;

const INTERVAL_LABELS: Record<number, string> = {
  [30 * 24 * 60 * 60]: "Monthly",
  [90 * 24 * 60 * 60]: "Quarterly",
  [365 * 24 * 60 * 60]: "Yearly",
};

const SUBSCRIPTION_INTENT_TYPES = {
  SubscriptionIntent: [
    { name: "subscriber", type: "address" },
    { name: "merchant", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "interval", type: "uint256" },
    { name: "startTime", type: "uint256" },
    { name: "maxPayments", type: "uint256" },
    { name: "maxTotalAmount", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "token", type: "address" },
  ],
} as const;

const BASE_TOKEN_OPTIONS: Record<SupportedChainId, Array<{ label: string; value: string }>> =
  (() => {
    const sepoliaPyusd = getPyusdAddress(SEPOLIA_CHAIN_ID);
    return {
      [SEPOLIA_CHAIN_ID]: [
        { label: "Sepolia – Native ETH", value: ZERO_ADDRESS },
        ...(sepoliaPyusd !== ZERO_ADDRESS
          ? [{ label: "Sepolia – PYUSD test token", value: sepoliaPyusd }]
          : []),
      ],
      [BASE_SEPOLIA_CHAIN_ID]: [{ label: "Base Sepolia – Native ETH", value: ZERO_ADDRESS }],
    };
  })();

const SUBSCRIPTION_MANAGER_ENV_KEYS: Record<SupportedChainId, string> = {
  [SEPOLIA_CHAIN_ID]: "NEXT_PUBLIC_SUBSCRIPTION_MANAGER_SEPOLIA",
  [BASE_SEPOLIA_CHAIN_ID]: "NEXT_PUBLIC_SUBSCRIPTION_MANAGER_BASE",
};

type PreparedIntent = {
  subscriber: string;
  merchant: string;
  amount: string;
  interval: number;
  startTime: number;
  maxPayments: number;
  maxTotalAmount: string;
  expiry: number;
  nonce: number;
  token: string;
};

type SubmitIntentPayload = {
  subscriber: string;
  merchant: string;
  amount: string;
  interval: number;
  start_time: number;
  max_payments: number;
  max_total_amount: string;
  expiry: number;
  nonce: number;
  token: string;
};

type IntentBuildResult = {
  intent: PreparedIntent;
  amountAtomic: bigint;
  maxTotalAtomic: bigint;
  startTime: number;
  expiry: number;
  verifyingContract: string;
  tokenDecimals: number;
};

type ReadySubmission = {
  status: "ready" | "submitting";
  signature: string;
  nonce: number;
  intent: PreparedIntent;
  requestId: string;
};

type SubmissionState =
  | { status: "idle" }
  | ReadySubmission
  | { status: "success"; subscriptionId: string; availBlock?: number; availExtrinsic?: number }
  | { status: "error"; message: string };

export default function SubscribePage() {
  return (
    <Suspense
      fallback={<div className="card-surface p-6 text-sm text-text-muted">Loading intent…</div>}
    >
      <SubscribeFromTemplate />
    </Suspense>
  );
}

function SubscribeFromTemplate() {
  const searchParams = useSearchParams();
  const encodedTemplate = searchParams.get("intent");

  const { address } = useAccount();
  const connectedChainId = useChainId() as SupportedChainId | undefined;
  const { signTypedDataAsync } = useSignTypedData();
  const toast = useToast();

  const [template, setTemplate] = useState<SubscriptionTemplate | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<SupportedChainId>(DEFAULT_CHAIN_ID);
  const [selectedToken, setSelectedToken] = useState<string>(ZERO_ADDRESS);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (submission.status === "success") {
      toast.success("Subscription created successfully!", {
        description: `ID: ${shortenAddress(submission.subscriptionId)}`,
      });
    } else if (submission.status === "error") {
      toast.error("Failed to create subscription", {
        description: submission.message,
      });
    }
  }, [submission, toast]);

  useEffect(() => {
    if (!encodedTemplate) {
      setTemplate(null);
      setDecodeError("No intent was supplied in the link.");
      return;
    }

    try {
      const decoded = decodeTemplate(encodedTemplate);
      setTemplate(decoded);
      setDecodeError(null);
    } catch {
      setTemplate(null);
      setDecodeError("Unable to decode this subscription intent. Request a fresh link from the merchant.");
    }
  }, [encodedTemplate]);

  const tokenOptions = useMemo(() => {
    const baseOptions = BASE_TOKEN_OPTIONS[selectedChain] ?? [];

    if (!template) {
      return baseOptions;
    }

    const augmented = [...baseOptions];
    if (
      template.token &&
      !augmented.some((option) => sameAddress(option.value, template.token))
    ) {
      augmented.push({
        label: `Template token (${truncateAddress(template.token)})`,
        value: template.token,
      });
    }

    return dedupeOptions(augmented);
  }, [selectedChain, template]);

  const decimalsQuery = useErc20Read(
    selectedToken !== ZERO_ADDRESS ? (selectedToken as `0x${string}`) : undefined,
    {
      functionName: "decimals",
      chainId: selectedChain,
    },
  );

  useEffect(() => {
    if (!template) {
      return;
    }

    const templateOption = NETWORK_OPTIONS.find((option) => option.value === template.chainId);
    if (templateOption?.available) {
      setSelectedChain(templateOption.value);
      return;
    }

    if (templateOption && templateOption.value === selectedChain) {
      setSelectedChain(DEFAULT_CHAIN_ID);
    }
  }, [template, selectedChain]);

  useEffect(() => {
    if (!tokenOptions.length) {
      setSelectedToken(ZERO_ADDRESS);
      return;
    }

    if (template && tokenOptions.some((option) => sameAddress(option.value, template.token))) {
      setSelectedToken(template.token);
      return;
    }

    if (!tokenOptions.some((option) => sameAddress(option.value, selectedToken))) {
      setSelectedToken(tokenOptions[0].value);
    }
  }, [tokenOptions, template, selectedToken]);

  useEffect(() => {
    setSubmission({ status: "idle" });
    setCopySuccess(false);
  }, [selectedChain, selectedToken, template]);

  const selectedNetwork = useMemo(
    () => NETWORK_OPTIONS.find((option) => option.value === selectedChain),
    [selectedChain],
  );

  const verifyingContractAddress = useMemo(
    () => getSubscriptionManagerAddress(selectedChain),
    [selectedChain],
  );

  const templateNetwork = useMemo(() => {
    if (!template) {
      return undefined;
    }

    return NETWORK_OPTIONS.find((option) => option.value === template.chainId);
  }, [template]);

  const networkLabel = selectedNetwork?.label ?? `Chain ${selectedChain}`;

  const networkConfigurationIssue = useMemo(() => {
    if (templateNetwork && !templateNetwork.available) {
      const envKey = SUBSCRIPTION_MANAGER_ENV_KEYS[templateNetwork.value];
      return `This subscription intent targets ${templateNetwork.label}, but the app is not configured with a subscription manager contract for that network. Set ${envKey} before rebuilding, or ask the merchant to regenerate the link for a supported network.`;
    }

    if (selectedNetwork && !selectedNetwork.available) {
      const envKey = SUBSCRIPTION_MANAGER_ENV_KEYS[selectedNetwork.value];
      return `Subscription manager address is not configured for ${selectedNetwork.label}. Set ${envKey} in your environment before trying again.`;
    }

    return null;
  }, [selectedNetwork, templateNetwork]);

  const tokenDecimals = useMemo(() => {
    if (selectedToken === ZERO_ADDRESS) {
      return DEFAULT_TOKEN_DECIMALS;
    }

    if (template && sameAddress(selectedToken, template.token)) {
      const maybeDecimals = (template as Partial<SubscriptionTemplate> & {
        tokenDecimals?: number;
      }).tokenDecimals;
      if (typeof maybeDecimals === "number" && Number.isFinite(maybeDecimals)) {
        return maybeDecimals;
      }
    }

    const knownDecimals = getKnownTokenDecimals(selectedChain, selectedToken);
    if (knownDecimals !== null) {
      return knownDecimals;
    }

    const decimalsData = decimalsQuery?.data;
    if (typeof decimalsData === "number") {
      return decimalsData;
    }
    if (typeof decimalsData === "bigint") {
      return Number(decimalsData);
    }

    return DEFAULT_TOKEN_DECIMALS;
  }, [decimalsQuery?.data, selectedChain, selectedToken, template]);

  const signingPreview = useMemo(() => {
    if (!template) {
      return null;
    }

    if (!address) {
      return { error: "Connect your wallet to preview the signing payload." } as const;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const result = buildIntentData({
        now,
        subscriber: address,
        template,
        selectedToken,
        tokenDecimals,
        verifyingContract: verifyingContractAddress,
        gracePeriodSeconds: SIGNING_GRACE_PERIOD_SECONDS,
      });
      return { data: result } as const;
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare signing details. Check the selected token and network.",
      } as const;
    }
  }, [address, template, selectedToken, tokenDecimals, verifyingContractAddress]);

  const needsNetworkSwitch = useMemo(() => {
    if (!connectedChainId) {
      return false;
    }
    return connectedChainId !== selectedChain;
  }, [connectedChainId, selectedChain]);

  const intervalLabel = template
    ? INTERVAL_LABELS[template.interval] ??
      `${Math.round(template.interval / (24 * 60 * 60))} day interval`
    : "";

  const selectedTokenLabel =
    tokenOptions.find((option) => sameAddress(option.value, selectedToken))?.label ??
    truncateAddress(selectedToken);

  async function handleSignIntent() {
    if (!template) {
      return;
    }

    if (!address) {
      setSubmission({ status: "error", message: "Connect your wallet to continue." });
      return;
    }

    if (needsNetworkSwitch) {
      setSubmission({
        status: "error",
        message: `Switch your wallet to ${networkLabel} before signing the intent.`,
      });
      return;
    }

    const verifyingContract = verifyingContractAddress;
    if (!verifyingContract || verifyingContract === ZERO_ADDRESS) {
      setSubmission({
        status: "error",
        message: `Subscription manager address is not configured for ${networkLabel}. Set ${
          SUBSCRIPTION_MANAGER_ENV_KEYS[selectedChain]
        } before rebuilding the frontend.`,
      });
      return;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const { intent, verifyingContract: contractForSigning } = buildIntentData({
        now,
        subscriber: address,
        template,
        selectedToken,
        tokenDecimals,
        verifyingContract,
        gracePeriodSeconds: SIGNING_GRACE_PERIOD_SECONDS,
      });

      const signature = await signTypedDataAsync({
        domain: {
          name: "Aurum",
          version: "1",
          chainId: selectedChain,
          verifyingContract: contractForSigning as `0x${string}`,
        },
        primaryType: "SubscriptionIntent",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        types: SUBSCRIPTION_INTENT_TYPES as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: intent as any,
      });

      const requestId = `${intent.nonce}-${Math.random().toString(36).slice(2, 10)}`;
      setSubmission({
        status: "ready",
        signature,
        nonce: intent.nonce,
        intent,
        requestId,
      });
      setCopySuccess(false);
    } catch (error) {
      setSubmission({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to sign subscription intent.",
      });
    }
  }

  async function handleSubmitIntent() {
    if (submission.status !== "ready" && submission.status !== "submitting") {
      return;
    }
    if (!template) {
      return;
    }

    try {
      setSubmission({
        status: "submitting",
        signature: submission.signature,
        nonce: submission.nonce,
        intent: submission.intent,
        requestId: submission.requestId,
      });

      const payloadIntent = toSubmitIntentPayload(submission.intent);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_RELAYER_API_URL}/api/v1/intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: payloadIntent,
            signature: submission.signature,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Relayer rejected the subscription intent.");
      }

      const json = await response.json();
      setSubmission({
        status: "success",
        subscriptionId: json.subscriptionId,
        availBlock: json.availBlock,
        availExtrinsic: json.availExtrinsic,
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to submit intent to relayer.",
      });
    }
  }

  async function copyTemplateDetails() {
    if (!template) {
      return;
    }

    const summary = [
      `Network: ${networkLabel}`,
      `Merchant: ${template.merchant}`,
      `Token: ${selectedTokenLabel}`,
      `Amount: ${template.amount}`,
      `Interval: ${intervalLabel}`,
      `Max payments: ${template.maxPayments}`,
    ].join("\n");

    await navigator.clipboard.writeText(summary);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  if (decodeError) {
    return (
      <div className="card-surface space-y-4 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary">Review subscription intent</h1>
          <p className="mt-2 text-sm text-text-muted">
            Inspect and submit intents generated by merchants. Connect your wallet to proceed.
          </p>
        </header>
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{decodeError}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-primary">Review subscription intent</h1>
        <p className="text-sm text-text-muted">
          Review the merchant&apos;s schedule, pick your preferred network and token, then sign and
          submit the intent with your connected wallet.
        </p>
      </header>

      <section className="card-surface space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Subscription summary</h2>
            <p className="text-xs text-text-muted">
              Generated {new Date(template.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={copyTemplateDetails}
            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
              copySuccess
                ? "border-primary bg-primary text-foundation-black"
                : "border-primary text-primary hover:bg-primary/10"
            }`}
          >
            <ClipboardCopy className="h-4 w-4" /> {copySuccess ? "Details copied" : "Copy details"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-text-muted">Network</span>
            <select
              className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              value={String(selectedChain)}
              onChange={(event) =>
                setSelectedChain(Number(event.target.value) as SupportedChainId)
              }
            >
              {NETWORK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={!option.available}>
                  {option.label}
                  {!option.available ? " (unconfigured)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-text-muted">Token</span>
            <select
              className="rounded-md border border-bronze/60 bg-foundation-black px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
              value={selectedToken}
              onChange={(event) => setSelectedToken(event.target.value)}
            >
              {tokenOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <dl className="grid gap-4 text-sm text-text-muted md:grid-cols-2">
          <div>
            <dt className="text-text-primary">Merchant</dt>
            <dd className="mt-1 break-all">{template.merchant}</dd>
          </div>
          <div>
            <dt className="text-text-primary">Selected token</dt>
            <dd className="mt-1 break-all">{selectedTokenLabel}</dd>
          </div>
          <div>
            <dt className="text-text-primary">Amount per charge</dt>
            <dd className="mt-1">{template.amount}</dd>
          </div>
          <div>
            <dt className="text-text-primary">Billing cadence</dt>
            <dd className="mt-1">{intervalLabel}</dd>
          </div>
          <div>
            <dt className="text-text-primary">Max payments</dt>
            <dd className="mt-1">{template.maxPayments}</dd>
          </div>
          <div>
            <dt className="text-text-primary">Max total</dt>
            <dd className="mt-1">{template.maxTotalAmount}</dd>
          </div>
          {template.description ? (
            <div className="md:col-span-2">
              <dt className="text-text-primary">Notes</dt>
              <dd className="mt-1 whitespace-pre-line">{template.description}</dd>
            </div>
          ) : null}
          <div className="md:col-span-2 rounded-md bg-carbon/60 px-4 py-3 text-xs text-text-muted">
            The first charge starts after you sign and submit. Additional executions follow your
            selected cadence until the limit is reached.
          </div>
        </dl>

        <div className="rounded-md border border-bronze/40 bg-carbon/60 px-4 py-3 text-xs text-text-muted">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Wallet signing details</h3>
              <p>These raw values will appear in your wallet&apos;s signing prompt.</p>
            </div>
            <p className="text-2xs text-text-muted">
              A {SIGNING_GRACE_PERIOD_SECONDS / 60}-minute buffer is added to the start time so the
              relayer never rejects the intent for being “in the past”.
            </p>
            <p className="text-2xs text-text-muted">
              Expiry is derived from the cadence and max payments: start time + (max payments + 1) ×
              interval.
            </p>
          </div>

          {signingPreview === null ? null : "error" in signingPreview ? (
            <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-rose-200">
              {signingPreview.error}
            </p>
          ) : (
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <dt className="text-text-primary">Subscriber (signer)</dt>
                <dd className="mt-1 break-all">
                  {truncateAddress(signingPreview.data.intent.subscriber)}
                  <span className="ml-2 text-2xs text-text-muted">
                    (must match your connected wallet)
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-primary">Merchant</dt>
                <dd className="mt-1 break-all">
                  {truncateAddress(signingPreview.data.intent.merchant)}
                </dd>
              </div>
              <div>
                <dt className="text-text-primary">Amount (raw)</dt>
                <dd className="mt-1">
                  {signingPreview.data.intent.amount}
                  <span className="ml-2 text-2xs text-text-muted">
                    ≈{" "}
                    {formatTokenAmount(
                      signingPreview.data.amountAtomic,
                      signingPreview.data.tokenDecimals,
                      template.amount,
                    )}{" "}
                    {selectedTokenLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-primary">Max total (raw)</dt>
                <dd className="mt-1">
                  {signingPreview.data.intent.maxTotalAmount}
                  <span className="ml-2 text-2xs text-text-muted">
                    ≈{" "}
                    {formatTokenAmount(
                      signingPreview.data.maxTotalAtomic,
                      signingPreview.data.tokenDecimals,
                      template.maxTotalAmount,
                    )}{" "}
                    {selectedTokenLabel}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-text-primary">First execution</dt>
                <dd className="mt-1">
                  {formatTimestamp(signingPreview.data.startTime)} (
                  {formatRelativeSeconds(
                    signingPreview.data.startTime - Math.floor(Date.now() / 1000),
                  )}
                  )
                </dd>
              </div>
              <div>
                <dt className="text-text-primary">Expiry</dt>
                <dd className="mt-1">
                  {formatTimestamp(signingPreview.data.expiry)} (
                  {formatRelativeSeconds(signingPreview.data.expiry - Math.floor(Date.now() / 1000))})
                </dd>
              </div>
              <div>
                <dt className="text-text-primary">Nonce</dt>
                <dd className="mt-1">{signingPreview.data.intent.nonce}</dd>
              </div>
              <div>
                <dt className="text-text-primary">Verifying contract</dt>
                <dd className="mt-1 break-all">
                  {truncateAddress(signingPreview.data.verifyingContract)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {networkConfigurationIssue ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {networkConfigurationIssue}
        </div>
      ) : null}

      {needsNetworkSwitch ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Switch your wallet to {networkLabel} before signing this intent.
        </div>
      ) : null}

      {submission.status === "success" ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Subscription intent submitted successfully. ID: {submission.subscriptionId}.</span>
          </div>
          {submission.availBlock ? (
            <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-emerald-100">
              <span>
                Avail DA block #{submission.availBlock} • extrinsic{" "}
                {submission.availExtrinsic ?? "?"}
              </span>
              {buildAvailExplorerUrl(submission.availBlock, submission.availExtrinsic) ? (
                <a
                  href={buildAvailExplorerUrl(submission.availBlock, submission.availExtrinsic) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-200 underline decoration-dotted underline-offset-4 hover:text-emerald-100"
                >
                  View on Avail explorer
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}

      {submission.status === "error" ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{submission.message}</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={handleSignIntent}
          disabled={submission.status === "submitting"}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-primary px-6 py-3 text-xs font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted"
        >
          {submission.status === "ready" ||
          submission.status === "submitting" ||
          submission.status === "success" ? (
            <Check className="h-4 w-4" />
          ) : null}
          Sign intent
        </button>

        <button
          type="button"
          onClick={handleSubmitIntent}
          disabled={submission.status !== "ready"}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-bronze/60 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-text-muted transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-bronze/40"
        >
          {submission.status === "submitting" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Submit to relayer
        </button>
      </div>
    </div>
  );
}

function truncateAddress(value: string): string {
  if (!value || value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function dedupeOptions<T extends { value: string }>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getKnownTokenDecimals(
  chainId: SupportedChainId,
  tokenAddress: string,
): number | null {
  if (sameAddress(tokenAddress, ZERO_ADDRESS)) {
    return DEFAULT_TOKEN_DECIMALS;
  }

  const sepoliaPyusd = getPyusdAddress(SEPOLIA_CHAIN_ID);
  if (chainId === SEPOLIA_CHAIN_ID && sepoliaPyusd !== ZERO_ADDRESS) {
    if (sameAddress(tokenAddress, sepoliaPyusd)) {
      return PYUSD_DECIMALS;
    }
  }

  const basePyusd = getPyusdAddress(BASE_SEPOLIA_CHAIN_ID);
  if (chainId === BASE_SEPOLIA_CHAIN_ID && basePyusd !== ZERO_ADDRESS) {
    if (sameAddress(tokenAddress, basePyusd)) {
      return PYUSD_DECIMALS;
    }
  }

  return null;
}

function toSubmitIntentPayload(intent: PreparedIntent): SubmitIntentPayload {
  return {
    subscriber: intent.subscriber.toLowerCase(),
    merchant: intent.merchant.toLowerCase(),
    amount: intent.amount,
    interval: intent.interval,
    start_time: intent.startTime,
    max_payments: intent.maxPayments,
    max_total_amount: intent.maxTotalAmount,
    expiry: intent.expiry,
    nonce: intent.nonce,
    token: intent.token.toLowerCase(),
  };
}

type BuildIntentParams = {
  now: number;
  subscriber: string;
  template: SubscriptionTemplate;
  selectedToken: string;
  tokenDecimals: number;
  verifyingContract: string;
  gracePeriodSeconds: number;
};

function buildIntentData(params: BuildIntentParams): IntentBuildResult {
  const {
    now,
    subscriber,
    template,
    selectedToken,
    tokenDecimals,
    verifyingContract,
    gracePeriodSeconds,
  } = params;

  if (!verifyingContract || verifyingContract === ZERO_ADDRESS) {
    throw new Error("Subscription manager address is not configured for the selected network.");
  }

  let amountAtomic: bigint;
  try {
    amountAtomic = parseUnits(template.amount, tokenDecimals);
  } catch {
    throw new Error("Unable to encode the payment amount for the selected token decimals.");
  }

  const maxPaymentsBigInt = BigInt(template.maxPayments);
  const maxTotalAtomic = amountAtomic * maxPaymentsBigInt;
  const startTime = now + gracePeriodSeconds;
  const expiry =
    template.maxPayments > 0
      ? startTime + template.interval * template.maxPayments + template.interval
      : startTime + template.interval;
  const verifyingLower = verifyingContract.toLowerCase();

  const intent: PreparedIntent = {
    subscriber: subscriber.toLowerCase(),
    merchant: template.merchant.toLowerCase(),
    amount: amountAtomic.toString(),
    interval: template.interval,
    startTime,
    maxPayments: template.maxPayments,
    maxTotalAmount: maxTotalAtomic.toString(),
    expiry,
    nonce: now,
    token: selectedToken.toLowerCase(),
  };

  return {
    intent,
    amountAtomic,
    maxTotalAtomic,
    startTime,
    expiry,
    verifyingContract: verifyingLower,
    tokenDecimals,
  };
}

function formatTokenAmount(value: bigint, decimals: number, fallback: string): string {
  try {
    return formatUnits(value, decimals);
  } catch {
    return fallback;
  }
}

function formatTimestamp(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

function formatRelativeSeconds(deltaSeconds: number): string {
  if (deltaSeconds <= 0) {
    return "now";
  }

  const minutes = deltaSeconds / 60;
  if (minutes < 2) {
    return "≈1 minute";
  }
  if (minutes < 120) {
    return `≈${Math.round(minutes)} minutes`;
  }

  const hours = minutes / 60;
  if (hours < 48) {
    return `≈${Math.round(hours)} hours`;
  }

  const days = hours / 24;
  return `≈${Math.round(days)} days`;
}

function buildAvailExplorerUrl(block?: number, extrinsic?: number): string | null {
  if (!AVAIL_EXPLORER_TEMPLATE || !block) {
    return null;
  }

  let url = AVAIL_EXPLORER_TEMPLATE.replace("{block}", String(block));
  if (url.includes("{extrinsic}")) {
    if (extrinsic === undefined) {
      if (url.includes("extrinsic/")) {
        url = url.replace("extrinsic/", "block/");
      }
      return url.replace("{extrinsic}", "").replace(/[-_/]+$/, "");
    }
    return url.replace("{extrinsic}", String(extrinsic));
  }
  return url;
}
