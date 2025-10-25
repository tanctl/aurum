"use client";

import { ReactNode, useMemo, useRef } from "react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import "@/polyfills/global-buffer";
import { getWagmiConfig } from "@/lib/wagmi";

const theme = darkTheme({
  accentColor: "#c9a961",
  accentColorForeground: "#0B0D0F",
  borderRadius: "medium",
});

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry(failureCount, error) {
          if (failureCount >= 3) return false;
          if (error instanceof Error && /invalid|400|422/i.test(error.message)) {
            return false;
          }
          return true;
        },
        retryDelay(failureCount) {
          const base = [1_000, 3_000, 10_000];
          return base[failureCount - 1] ?? 10_000;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry(failureCount, error) {
          if (failureCount >= 2) return false;
          if (error instanceof Error && /rejected/i.test(error.message)) {
            return false;
          }
          return true;
        },
      },
    },
  });

type Web3ProviderProps = {
  children: ReactNode;
};

export function Web3Provider({ children }: Web3ProviderProps) {
  const queryClientRef = useRef<QueryClient>(createClient());
  const wagmiConfig = useMemo(() => getWagmiConfig(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClientRef.current}>
        <RainbowKitProvider theme={theme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
