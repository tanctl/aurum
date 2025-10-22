import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Web3Provider } from "@/components/providers/Web3Provider";

export default function SubscribeLayout({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <div className="min-h-screen bg-foundation-black">
        <Header showDashboardControls />
        <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:max-w-5xl">
          {children}
        </div>
      </div>
    </Web3Provider>
  );
}
