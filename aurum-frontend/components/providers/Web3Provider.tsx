"use client";

import { ReactNode, useRef } from "react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import "@/polyfills/global-buffer";
import { config } from "@/lib/wagmi";

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
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });

type Web3ProviderProps = {
  children: ReactNode;
};

export function Web3Provider({ children }: Web3ProviderProps) {
  const queryClientRef = useRef<QueryClient>(createClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClientRef.current}>
        <RainbowKitProvider theme={theme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
