"use client";

import { useState } from "react";
import { Loader2, Pause, Play, ShieldOff } from "lucide-react";

const buttonBase =
  "inline-flex items-center gap-2 rounded-md border bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors";

type SubscriptionActionsProps = {
  status: string;
  onPause?: () => Promise<void> | void;
  onResume?: () => Promise<void> | void;
  onCancel?: () => Promise<void> | void;
};

export function SubscriptionActions({ status, onPause, onResume, onCancel }: SubscriptionActionsProps) {
  const [busy, setBusy] = useState(false);

  async function handle(action?: () => Promise<void> | void) {
    if (!action) return;
    try {
      setBusy(true);
      await action();
    } finally {
      setBusy(false);
    }
  }

  const isPaused = status === "PAUSED";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy || isPaused}
        onClick={() => handle(onPause)}
        className={`${buttonBase} border-bronze/60 text-text-primary hover:border-primary hover:bg-carbon/30 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
      >
        {busy && !isPaused ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
        Pause
      </button>
      <button
        type="button"
        disabled={busy || !isPaused}
        onClick={() => handle(onResume)}
        className={`${buttonBase} border-primary text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
      >
        {busy && isPaused ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        Resume
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => handle(onCancel)}
        className={`${buttonBase} border-rose-500/60 text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-bronze/40 disabled:text-text-muted`}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
        Cancel
      </button>
    </div>
  );
}
