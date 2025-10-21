import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { SubscriberSidebar } from "@/components/layout/SubscriberSidebar";
import { Web3Provider } from "@/components/providers/Web3Provider";

export default function SubscriberLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Web3Provider>
      <div className="flex min-h-screen flex-col bg-foundation-black">
        <Header showDashboardControls />
        <div className="flex flex-1">
          <SubscriberSidebar />
          <main className="flex-1 overflow-y-auto px-8 py-10">
            <div className="space-y-8">{children}</div>
          </main>
        </div>
      </div>
    </Web3Provider>
  );
}
