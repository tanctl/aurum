"use client";

import * as React from "react";
import { useMemo } from "react";
import { NexusProvider, useNexus } from "@avail-project/nexus-widgets";
import { useAccount } from "wagmi";

function NexusWalletBridge() {
  const { connector, isConnected } = useAccount();
  const { setProvider, initializeSdk, deinitializeSdk, isSdkInitialized } = useNexus();

  React.useEffect(() => {
    let cancelled = false;

    async function syncProvider() {
      try {
        if (isConnected && connector?.getProvider) {
          const provider = await connector.getProvider();
          if (cancelled || !provider) {
            return;
          }

          setProvider(provider);

          if (!isSdkInitialized) {
            await initializeSdk(provider);
          }
        } else {
          await deinitializeSdk();
        }
      } catch (error) {
        console.debug("nexus bridge sync failed", error);
      }
    }

    void syncProvider();

    return () => {
      cancelled = true;
    };
  }, [connector, deinitializeSdk, initializeSdk, isConnected, isSdkInitialized, setProvider]);

  return null;
}

export default function NexusProviderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const nexusConfig = useMemo(
    () => ({
      network:
        (process.env.NEXT_PUBLIC_NEXUS_NETWORK?.toLowerCase() ?? "testnet") === "mainnet"
          ? "mainnet"
          : ("testnet" as const),
      debug: process.env.NEXT_PUBLIC_NEXUS_DEBUG === "true",
    }),
    []
  );

  return (
    <NexusProvider config={nexusConfig}>
      <NexusWalletBridge />
      {children}
    </NexusProvider>
  );
}
