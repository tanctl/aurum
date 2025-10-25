"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  label: string;
  description: ReactNode;
  className?: string;
};

export function InfoTooltip({ label, description, className }: InfoTooltipProps) {
  return (
    <div className={cn("relative inline-block text-left", className)}>
      <details className="group inline-flex cursor-pointer list-none">
        <summary className="flex items-center gap-1 text-secondary outline-none">
          <Info size={14} aria-label={`${label} information`} />
          <span className="text-2xs uppercase tracking-widest">{label}</span>
        </summary>
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-bronze/60 bg-foundation-black/95 p-4 text-xs text-text-muted shadow-xl">
          {typeof description === "string" ? (
            <p>{description}</p>
          ) : (
            description
          )}
        </div>
      </details>
    </div>
  );
}
