import type { SupportedChainId } from "@/lib/wagmi";

export type SubscriptionTemplate = {
  chainId: SupportedChainId;
  merchant: string;
  token: string;
  amount: string;
  interval: number;
  maxPayments: number;
  maxTotalAmount: string;
  description?: string;
  createdAt: number;
};

export function encodeTemplate(template: SubscriptionTemplate): string {
  const payload = JSON.stringify(template);
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(payload);
  }
  return Buffer.from(payload, "utf-8").toString("base64");
}

export function decodeTemplate(encoded: string): SubscriptionTemplate {
  const json =
    typeof window !== "undefined" && typeof window.atob === "function"
      ? window.atob(encoded)
      : Buffer.from(encoded, "base64").toString("utf-8");
  return JSON.parse(json) as SubscriptionTemplate;
}
