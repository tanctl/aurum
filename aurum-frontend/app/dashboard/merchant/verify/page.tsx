"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

import { useCrossChainAttestations } from "@/hooks/useEnvio";

export default function MerchantVerifyPage() {
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [submittedId, setSubmittedId] = useState<string>("");

  const { data, isLoading, error, refetch } = useCrossChainAttestations(submittedId);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedId(subscriptionId);
    await refetch();
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">Verify cross-chain attestation</h1>
        <p className="text-sm text-text-muted">
          Query Avail Nexus attestations indexed by Envio to confirm payment settlement.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card-surface flex flex-col gap-4 p-6 sm:flex-row">
        <input
          type="text"
          value={subscriptionId}
          onChange={(event) => setSubscriptionId(event.target.value)}
          placeholder="Subscription ID (0x...)"
          className="flex-1 rounded-md border border-bronze/60 bg-foundation-black px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-primary bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-widest text-foundation-black transition-colors hover:bg-secondary hover:text-foundation-black"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Lookup
        </button>
      </form>

      {error ? (
        <div className="card-surface flex items-center gap-3 border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
          <AlertTriangle size={16} />
          {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.CrossChainAttestation?.length
          ? data.CrossChainAttestation.map((attestation) => (
              <div
                key={attestation.id}
                className="card-surface flex flex-col gap-3 border border-primary/30 p-5 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-text-primary">Payment #{attestation.paymentNumber}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest">
                    {attestation.verified ? (
                      <>
                        <CheckCircle2 size={14} className="text-primary" /> Verified
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} className="text-secondary" /> Pending
                      </>
                    )}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div>
                    <dt className="uppercase tracking-widest text-secondary/80">Token</dt>
                    <dd className="text-text-primary">{attestation.token}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-secondary/80">Amount</dt>
                    <dd className="text-text-primary">{attestation.amount}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-secondary/80">Source chain</dt>
                    <dd className="text-text-primary">{attestation.sourceChainId}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-widest text-secondary/80">Timestamp</dt>
                    <dd className="text-text-primary">{attestation.timestamp}</dd>
                  </div>
                </dl>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
