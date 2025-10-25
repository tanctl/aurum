"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ScanEye,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  useCrossChainAttestations,
  usePaymentHistory,
  useSubscription as useEnvioSubscription,
} from "@/hooks/useEnvio";
import { useSubscription as useRelayerSubscription } from "@/hooks/useSubscriptions";
import { formatDateTime, formatInterval, formatStatusLabel, shortenAddress } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

const AVAIL_EXPLORER_TEMPLATE =
  process.env.NEXT_PUBLIC_AVAIL_EXPLORER_TEMPLATE ??
  (process.env.NEXT_PUBLIC_AVAIL_EXPLORER_URL
    ? `${process.env.NEXT_PUBLIC_AVAIL_EXPLORER_URL.replace(/\/$/, "")}/block/{block}`
    : "https://availscan.com/block/{block}?extrinsic={extrinsic}");

type ComparisonRow = {
  label: string;
  envio?: string | number | null;
  relayer?: string | number | null;
  match: boolean;
};

type PaymentRow = {
  paymentNumber: number;
  timestamp: number;
  amount: string;
  tokenSymbol?: string | null;
  relayer: string;
  chainId: number;
  txHash: string;
};

type AttestationRow = {
  id: string;
  paymentNumber: number;
  chainId: number;
  token?: string | null;
  amount?: string | null;
  verified: boolean;
  timestamp: string;
};

export default function MerchantVerifyPage() {
  const [inputValue, setInputValue] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const relayerQuery = useRelayerSubscription(submittedId);
  const envioQuery = useEnvioSubscription(submittedId ?? undefined);
  const paymentsQuery = usePaymentHistory(submittedId ?? undefined);
  const attestationQuery = useCrossChainAttestations(submittedId ?? undefined);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (!submittedId) return [];
    const relayer = relayerQuery.data;
    const envio = envioQuery.data;
    if (!relayer && !envio) return [];

    const computeMatch = (left?: string | number | null, right?: string | number | null) => {
      if (left == null && right == null) return true;
      if (left == null || right == null) return false;
      return left === right;
    };

    const toNumber = (value?: string | number | bigint | null) => {
      if (value == null) return null;
      const parsed =
        typeof value === "bigint"
          ? Number(value)
          : typeof value === "string"
          ? Number.parseFloat(value)
          : value;
      return Number.isFinite(parsed) ? parsed : null;
    };

    const rows: ComparisonRow[] = [
      {
        label: "Merchant",
        relayer: relayer?.merchant,
        envio: envio?.merchant,
        match: computeMatch(relayer?.merchant?.toLowerCase(), envio?.merchant?.toLowerCase()),
      },
      {
        label: "Subscriber",
        relayer: relayer?.subscriber,
        envio: envio?.subscriber,
        match: computeMatch(relayer?.subscriber?.toLowerCase(), envio?.subscriber?.toLowerCase()),
      },
      {
        label: "Token",
        relayer: relayer?.tokenSymbol,
        envio: envio?.tokenSymbol,
        match: computeMatch(relayer?.tokenSymbol, envio?.tokenSymbol),
      },
      {
        label: "Amount",
        relayer: relayer?.amount,
        envio: envio?.amount,
        match: computeMatch(relayer?.amount, envio?.amount),
      },
      {
        label: "Interval",
        relayer: formatInterval(relayer?.interval),
        envio: formatInterval(toNumber(envio?.interval)),
        match: computeMatch(relayer?.interval, toNumber(envio?.interval)),
      },
      {
        label: "Max payments",
        relayer: relayer?.maxPayments,
        envio: envio?.maxPayments,
        match: computeMatch(relayer?.maxPayments, envio?.maxPayments),
      },
      {
        label: "Executed payments",
        relayer: relayer?.executedPayments,
        envio: envio?.paymentsExecuted,
        match: computeMatch(relayer?.executedPayments, envio?.paymentsExecuted),
      },
      {
        label: "Status",
        relayer: formatStatusLabel(relayer?.status),
        envio: formatStatusLabel(envio?.status),
        match: computeMatch(relayer?.status, envio?.status),
      },
      {
        label: "On-chain payments",
        relayer: relayer?.onChainPayments,
        envio: envio?.paymentsExecuted,
        match: computeMatch(relayer?.onChainPayments, envio?.paymentsExecuted),
      },
    ];

    return rows;
  }, [submittedId, relayerQuery.data, envioQuery.data]);

  const allFieldsMatch = comparisonRows.length
    ? comparisonRows.every((row) => row.match)
    : false;

  const paymentHistory: PaymentRow[] = (paymentsQuery.data ?? []) as PaymentRow[];
  const attestations: AttestationRow[] =
    (attestationQuery.data?.CrossChainAttestation ?? []) as AttestationRow[];
  const relayerSubscription = relayerQuery.data;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSubmittedId(null);
      return;
    }
    setSubmittedId(trimmed);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-secondary/70">Merchant Dashboard</p>
        <h1 className="flex items-center gap-2 text-3xl font-semibold text-text-primary">
          <ShieldCheck size={20} className="text-secondary" />
          Verify
        </h1>
        <p className="text-sm text-text-muted">
          Compare Envio’s indexed view with the relayer’s on-chain read and Avail DA payloads. Demonstrate
          to judges how every subscription is cryptographically verifiable.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="card-surface flex flex-col gap-3 p-6 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-secondary" />
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Subscription ID (0x…)"
            className="w-full rounded-md border border-bronze/60 bg-foundation-black py-3 pl-9 pr-4 text-sm text-text-primary focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-foundation-black transition hover:bg-secondary hover:text-foundation-black"
        >
          {relayerQuery.isFetching || envioQuery.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Validate
        </button>
      </form>

      {submittedId ? (
        <>
          <section className="card-surface space-y-4 p-6">
            <header className="flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-text-primary">
                  <ArrowLeftRight size={16} className="text-secondary" />
                  Envio vs Relayer comparison
                </h2>
                <p className="text-xs text-text-muted">
                  Values pulled from Envio HyperIndex (GraphQL) and relayer REST API backed by on-chain reads.
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
                  allFieldsMatch
                    ? "border-emerald-500/50 text-emerald-300"
                    : "border-amber-400/60 text-amber-200"
                }`}
              >
                {allFieldsMatch ? (
                  <>
                    <CheckCircle2 size={14} />
                    Matched
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} />
                    Review fields
                  </>
                )}
              </span>
            </header>

            <ComparisonTable
              isLoading={relayerQuery.isLoading || envioQuery.isLoading}
              rows={comparisonRows}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="card-surface space-y-4 p-6">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-text-primary">
                    Payment chronology
                  </h3>
                  <p className="text-xs text-text-muted">
                    PaymentExecuted events hydrated from Envio HyperIndex for this subscription.
                  </p>
                </div>
                <span className="rounded-full border border-secondary/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-secondary">
                  {paymentHistory.length} records
                </span>
              </header>
              <PaymentTimeline rows={paymentHistory} isLoading={paymentsQuery.isLoading} />
            </div>

            <div className="card-surface space-y-3 p-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-text-primary">
                <ScanEye size={16} className="text-secondary" />
                Avail data availability
              </h3>
              <AvailPanel subscription={relayerSubscription} />
              <div className="rounded-md border border-bronze/40 bg-carbon/40 p-4 text-xs text-text-muted">
                Raw payload available through the relayer intent cache. Download the JSON via{" "}
                <code className="rounded bg-foundation-black/60 px-2 py-1">/api/v1/subscription/{shortenAddress(
                  submittedId,
                  6,
                )}</code>
              </div>
            </div>
          </section>

          <section className="card-surface space-y-4 p-6">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-text-primary">
                  Cross-chain attestations (Envio)
                </h3>
                <p className="text-xs text-text-muted">HyperIndex entity list keyed by Nexus attestation ID.</p>
              </div>
              <span className="rounded-full border border-primary/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
                {attestations.length} records
              </span>
            </header>
            <AttestationGrid rows={attestations} isLoading={attestationQuery.isLoading} />
          </section>
        </>
      ) : (
        <Skeleton className="h-48 w-full rounded-md border border-dashed border-bronze/40 bg-carbon/40" />
      )}
    </div>
  );
}

function ComparisonTable({ rows, isLoading }: { rows: ComparisonRow[]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-md" />;
  }

  if (!rows.length) {
    return <EmptyState message="No indexed data available for this subscription." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-text-muted">
        <thead className="border-b border-bronze/30 uppercase tracking-[0.3em] text-[10px] text-secondary/80">
          <tr>
            <th className="px-3 py-2">Field</th>
            <th className="px-3 py-2">Envio HyperIndex</th>
            <th className="px-3 py-2">Relayer / On-chain</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-bronze/20">
              <td className="px-3 py-2 text-text-primary">{row.label}</td>
              <td className="px-3 py-2">{renderCell(row.envio)}</td>
              <td className="px-3 py-2">{renderCell(row.relayer)}</td>
              <td className="px-3 py-2">
                {row.match ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 size={14} /> Match
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-200">
                    <AlertTriangle size={14} /> Review
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTimeline({ rows, isLoading }: { rows: PaymentRow[]; isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-48 w-full rounded-md" />;
  if (!rows || rows.length === 0) {
    return <EmptyState message="No payments indexed yet for this subscription." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-text-muted">
        <thead className="border-b border-bronze/30 uppercase tracking-[0.3em] text-[10px] text-secondary/80">
          <tr>
            <th className="px-3 py-2">Payment #</th>
            <th className="px-3 py-2">Timestamp</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Relayer</th>
            <th className="px-3 py-2">Chain</th>
            <th className="px-3 py-2">Tx hash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.txHash}-${row.paymentNumber}`} className="border-b border-bronze/20">
              <td className="px-3 py-2 text-text-primary">{row.paymentNumber}</td>
              <td className="px-3 py-2">{formatDateTime(row.timestamp)}</td>
              <td className="px-3 py-2">
                {row.amount}
                {row.tokenSymbol ? ` ${row.tokenSymbol}` : ""}
              </td>
              <td className="px-3 py-2">{shortenAddress(row.relayer)}</td>
              <td className="px-3 py-2 uppercase">{row.chainId}</td>
              <td className="px-3 py-2">
                <a
                  href={`https://sepolia.etherscan.io/tx/${row.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary transition hover:text-secondary"
                >
                  {shortenAddress(row.txHash)}
                  <ExternalLink size={12} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AvailPanel({ subscription }: { subscription: ReturnType<typeof useRelayerSubscription>["data"] }) {
  if (!subscription) {
    return <EmptyState message="Relayer has not indexed this subscription yet." />;
  }

  const hasMetadata = subscription.availBlock != null && subscription.availExtrinsic != null;

  const availUrl = hasMetadata
    ? buildAvailUrl(subscription.availBlock as number, subscription.availExtrinsic as number)
    : null;

  return (
    <div className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-4 text-sm text-text-muted">
      <p>
        Subscription intent stored on Avail DA block{" "}
        <span className="text-text-primary font-semibold">{subscription.availBlock ?? "—"}</span> · extrinsic{" "}
        <span className="text-text-primary font-semibold">{subscription.availExtrinsic ?? "—"}</span>
      </p>
      {availUrl ? (
        <a
          href={availUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary transition hover:text-secondary"
        >
          View on Avail explorer <ExternalLink size={12} />
        </a>
      ) : (
        <p className="text-xs text-amber-200">
          Avail metadata not recorded yet. Ensure the relayer submitted the intent to Avail.
        </p>
      )}
    </div>
  );
}

function AttestationGrid({ rows, isLoading }: { rows?: AttestationRow[]; isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-48 w-full rounded-md" />;
  if (!rows || rows.length === 0) return <EmptyState message="No Nexus attestations recorded yet." />;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-primary/40 bg-carbon/40 p-4 text-xs text-text-muted">
          <div className="flex items-center justify-between text-text-primary">
            <span>Payment #{row.paymentNumber}</span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] ${
                row.verified ? "text-emerald-300" : "text-amber-200"
              }`}
            >
              {row.verified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {row.verified ? "Verified" : "Pending"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-secondary/80 uppercase tracking-[0.3em] text-[10px]">Token</p>
              <p className="text-text-primary">{row.token ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-secondary/80 uppercase tracking-[0.3em] text-[10px]">Amount</p>
              <p className="text-text-primary">{row.amount ?? "0"}</p>
            </div>
            <div>
              <p className="text-secondary/80 uppercase tracking-[0.3em] text-[10px]">Chain</p>
              <p className="text-text-primary">{row.chainId}</p>
            </div>
            <div>
              <p className="text-secondary/80 uppercase tracking-[0.3em] text-[10px]">Timestamp</p>
              <p className="text-text-primary">{row.timestamp}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderCell(value?: string | number | null) {
  if (value == null || value === "") return <span className="text-amber-200">—</span>;
  if (typeof value === "string" && value.startsWith("0x") && value.length > 20) {
    return shortenAddress(value);
  }
  return value;
}

function buildAvailUrl(block?: number | null, extrinsic?: number | null) {
  if (!AVAIL_EXPLORER_TEMPLATE || block == null) return null;
  let url = AVAIL_EXPLORER_TEMPLATE.replace("{block}", String(block));
  if (extrinsic != null) {
    url = url.replace("{extrinsic}", String(extrinsic));
  }
  return url;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 w-full items-center justify-center rounded-md border border-dashed border-bronze/40 bg-carbon/40 text-xs text-text-muted">
      {message}
    </div>
  );
}
