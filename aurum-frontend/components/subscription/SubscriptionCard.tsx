import { format } from "date-fns";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";

type SubscriptionCardProps = {
  id: string;
  merchant: string;
  tokenSymbol: string;
  amount: string;
  status: string;
  nextPaymentTime?: number;
  executedPayments?: number;
  maxPayments?: number;
};

export function SubscriptionCard({
  id,
  merchant,
  tokenSymbol,
  amount,
  status,
  nextPaymentTime,
  executedPayments,
  maxPayments,
}: SubscriptionCardProps) {
  const nextPaymentLabel = nextPaymentTime
    ? format(new Date(nextPaymentTime * 1000), "dd MMM yyyy, HH:mm")
    : "Not scheduled";

  return (
    <article className="card-surface hover:border-primary/60 transition-colors">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Subscription
          </h3>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            {status}
          </span>
        </div>
        <div className="space-y-2 text-sm text-text-muted">
          <p>
            <span className="text-text-primary">ID:</span> {shortenAddress(id)}
          </p>
          <p>
            <span className="text-text-primary">Merchant:</span> {shortenAddress(merchant)}
          </p>
          <p>
            <span className="text-text-primary">Payment:</span> {formatTokenAmount(amount)} {tokenSymbol}
          </p>
          <p>
            <span className="text-text-primary">Next Due:</span> {nextPaymentLabel}
          </p>
          {typeof executedPayments === "number" && typeof maxPayments === "number" ? (
            <p>
              <span className="text-text-primary">Progress:</span> {executedPayments}/{maxPayments}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
