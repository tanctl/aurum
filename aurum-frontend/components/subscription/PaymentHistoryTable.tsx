import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDownUp, Download, ExternalLink } from "lucide-react";

import {
  formatTokenAmount,
  shortenAddress,
  formatDateTime,
  tokenDecimalsForSymbol,
} from "@/lib/utils";

export type PaymentRow = {
  id?: string;
  subscriptionId: string;
  paymentNumber: number;
  timestamp: number;
  amount: string;
  fee: string;
  tokenSymbol: string;
  relayer: string;
  transactionHash: string;
  nexusVerified?: boolean;
  blockNumber?: number;
  chainId?: number;
  explorerUrl?: string;
};

type PaymentHistoryTableProps = {
  rows: PaymentRow[];
  pageSize?: number;
  explorerBaseUrl?: string;
};

type SortKey = "paymentNumber" | "timestamp" | "amount" | "fee";

export function PaymentHistoryTable({
  rows,
  pageSize = 10,
  explorerBaseUrl,
}: PaymentHistoryTableProps) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("paymentNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filteredRows = useMemo(() => {
    let data = [...rows];
    if (startDate) {
      const start = new Date(startDate).getTime() / 1000;
      data = data.filter((row) => row.timestamp >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() / 1000;
      data = data.filter((row) => row.timestamp <= end + 86_400);
    }
    return data;
  }, [rows, startDate, endDate]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      switch (sortKey) {
        case "timestamp":
          return (a.timestamp - b.timestamp) * direction;
        case "amount":
          return (
            (Number.parseFloat(a.amount) - Number.parseFloat(b.amount)) * direction
          );
        case "fee":
          return (
            (Number.parseFloat(a.fee) - Number.parseFloat(b.fee)) * direction
          );
        case "paymentNumber":
        default:
          return (a.paymentNumber - b.paymentNumber) * direction;
      }
    });
    return sorted;
  }, [filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(Math.ceil(sortedRows.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = sortedRows.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );
  const decimals = (symbol?: string) => tokenDecimalsForSymbol(symbol);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "paymentNumber" ? "desc" : "asc");
  }

  function exportCsv() {
    const header = [
      "Payment Number",
      "Timestamp",
      "Amount",
      "Fee",
      "Token",
      "Relayer",
      "Transaction Hash",
    ];
    const csvRows = [
      header.join(","),
      ...sortedRows.map((row) =>
        [
          row.paymentNumber,
          formatDateTime(row.timestamp),
          formatTokenAmount(row.amount, decimals(row.tokenSymbol)),
          formatTokenAmount(row.fee, decimals(row.tokenSymbol)),
          row.tokenSymbol,
          row.relayer,
          row.transactionHash,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "subscription-payments.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  if (!rows.length) {
    return (
      <div className="card-surface p-6 text-sm text-text-muted">
        No payments have been executed yet.
      </div>
    );
  }

  return (
    <div className="card-surface flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Payment history
          </h3>
          <p className="text-xs text-text-muted">
            Sorted by {sortKey} ({sortDirection})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            From
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setPage(0);
                setStartDate(event.target.value);
              }}
              className="rounded-md border border-bronze/60 bg-carbon px-2 py-1 text-xs text-text-primary focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            To
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setPage(0);
                setEndDate(event.target.value);
              }}
              className="rounded-md border border-bronze/60 bg-carbon px-2 py-1 text-xs text-text-primary focus:border-primary focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-xs font-semibold uppercase tracking-widest text-primary transition hover:bg-primary/10"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-foundation-black/80 text-xs uppercase tracking-widest text-text-muted">
            <tr>
              <SortableHeader
                label="Payment"
                onClick={() => handleSort("paymentNumber")}
                active={sortKey === "paymentNumber"}
              />
              <SortableHeader
                label="Timestamp"
                onClick={() => handleSort("timestamp")}
                active={sortKey === "timestamp"}
              />
              <SortableHeader
                label="Amount"
                onClick={() => handleSort("amount")}
                active={sortKey === "amount"}
              />
              <SortableHeader
                label="Fee"
                onClick={() => handleSort("fee")}
                active={sortKey === "fee"}
              />
              <th className="px-4 py-3">Relayer</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Attestation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate/60">
            {paginatedRows.map((row) => (
              <tr key={`${row.subscriptionId}-${row.paymentNumber}`} className="hover:bg-foundation-black/60">
                <td className="px-4 py-3 text-text-primary">#{row.paymentNumber}</td>
                <td className="px-4 py-3 text-text-muted">{format(new Date(row.timestamp * 1000), "dd MMM yyyy HH:mm")}</td>
                <td className="px-4 py-3 text-text-primary">
                  {formatTokenAmount(row.amount, decimals(row.tokenSymbol))} {row.tokenSymbol}
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {formatTokenAmount(row.fee, decimals(row.tokenSymbol))} {row.tokenSymbol}
                </td>
                <td className="px-4 py-3 text-text-muted">{shortenAddress(row.relayer)}</td>
                <td className="px-4 py-3 text-text-primary">
                  <a
                    href={txExplorer(row.transactionHash, row.chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                  {shortenAddress(row.transactionHash)}
                  <ExternalLink size={12} />
                </a>
                {explorerBaseUrl || row.explorerUrl ? (
                  <a
                    href={(row.explorerUrl ?? `${explorerBaseUrl?.replace(/\/$/, "")}/entities/payment/${row.subscriptionId}-${row.paymentNumber}`) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-xs text-secondary hover:text-primary"
                  >
                    Envio
                    <ExternalLink size={12} />
                  </a>
                ) : null}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      row.nexusVerified
                        ? "border border-primary/60 bg-primary/10 text-primary"
                        : "border border-bronze/60 text-text-muted"
                    }`}
                  >
                    {row.nexusVerified ? "Verified" : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-col gap-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing {paginatedRows.length} of {sortedRows.length} payments
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(value - 1, 0))}
            className="rounded-md border border-bronze/60 px-3 py-1 text-xs uppercase tracking-widest text-text-primary transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((value) => Math.min(value + 1, totalPages - 1))}
            className="rounded-md border border-bronze/60 px-3 py-1 text-xs uppercase tracking-widest text-text-primary transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}

type SortableHeaderProps = {
  label: string;
  onClick: () => void;
  active: boolean;
};

function SortableHeader({ label, onClick, active }: SortableHeaderProps) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 uppercase tracking-widest transition ${
          active ? "text-primary" : "text-text-muted"
        }`}
      >
        {label}
        <ArrowDownUp size={12} />
      </button>
    </th>
  );
}
function txExplorer(hash: string, chainId?: number) {
  switch (chainId) {
    case 84532:
      return `https://sepolia.basescan.org/tx/${hash}`;
    case 11155111:
    default:
      return `https://sepolia.etherscan.io/tx/${hash}`;
  }
}
