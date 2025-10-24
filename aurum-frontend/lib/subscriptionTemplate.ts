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

function encodeBase64Utf8(payload: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(
      encodeURIComponent(payload).replace(/%([0-9A-F]{2})/g, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      ),
    );
  }

  return Buffer.from(payload, "utf-8").toString("base64");
}

function decodeBase64Utf8(encoded: string): string {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binary = window.atob(encoded);
    const percentEncoded = Array.from(binary)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("");
    return decodeURIComponent(percentEncoded);
  }

  return Buffer.from(encoded, "base64").toString("utf-8");
}

export function encodeTemplate(template: SubscriptionTemplate): string {
  const payload = JSON.stringify(template);
  return encodeBase64Utf8(payload);
}

export function decodeTemplate(encoded: string): SubscriptionTemplate {
  const json = decodeBase64Utf8(encoded);
  return JSON.parse(json) as SubscriptionTemplate;
}
