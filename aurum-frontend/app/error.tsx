"use client";

import { useEffect } from "react";
import Link from "next/link";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-foundation-black text-text-primary">
        <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-rose-400/40 bg-carbon/80 p-8 text-center shadow-2xl">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-rose-200">Something went wrong</h1>
            <p className="text-sm text-text-muted">
              An unexpected error occurred while rendering this page. You can try again or head back
              to the dashboard.
            </p>
          </div>

          {isDevelopment ? (
            <pre className="max-h-48 overflow-auto rounded-lg border border-rose-400/30 bg-foundation-black/70 p-4 text-left text-xs text-rose-200">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-md border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-widest text-primary transition hover:bg-primary/10"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-bronze/60 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-text-primary transition hover:border-primary hover:text-primary"
            >
              Return home
            </Link>
          </div>

          {error.digest ? (
            <p className="text-2xs text-text-muted">Error reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
