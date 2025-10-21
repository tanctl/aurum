import { format } from "date-fns";
import { formatTokenAmount, shortenAddress } from "@/lib/utils";

type PaymentRow = {
  subscriptionId: string;
  paymentNumber: number;
  timestamp: number;
  amount: string;
  fee: string;
  tokenSymbol: string;
  relayer: string;
  transactionHash: string;
  nexusVerified?: boolean;
};

type PaymentHistoryTableProps = {
  rows: PaymentRow[];
  emptyLabel?: string;
};

export function PaymentHistoryTable({ rows, emptyLabel = "No payments yet" }: PaymentHistoryTableProps) {
  if (!rows.length) {
    return (
      <div className="card-surface p-6 text-sm text-text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-bronze/70 bg-carbon/80">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-foundation-black/80 uppercase text-xs tracking-widest text-text-muted">
          <tr>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Timestamp</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Relayer</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate/60">
          {rows.map((row) => (
            <tr key={`${row.subscriptionId}-${row.paymentNumber}`} className="hover:bg-foundation-black/60">
              <td className="px-4 py-3 text-text-primary">
                #{row.paymentNumber} • {shortenAddress(row.subscriptionId)}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {format(new Date(row.timestamp * 1000), "dd MMM yyyy HH:mm")}
              </td>
              <td className="px-4 py-3 text-text-primary">
                {formatTokenAmount(row.amount)} {row.tokenSymbol}
                <span className="ml-2 text-xs text-text-muted">
                  Fee {formatTokenAmount(row.fee)}
                </span>
              </td>
              <td className="px-4 py-3 text-text-muted">
                {shortenAddress(row.relayer)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    row.nexusVerified
                      ? "border border-primary/60 bg-primary/10 text-primary"
                      : "border border-bronze/60 text-text-muted"
                  }`}
                >
                  {row.nexusVerified ? "Attested" : "Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
