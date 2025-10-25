import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { MerchantSidebar } from "@/components/layout/MerchantSidebar";

export default function MerchantLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-foundation-black">
      <Header showDashboardControls />
      <div className="flex flex-1">
        <MerchantSidebar />
        <main className="flex-1 overflow-y-auto px-8 py-10">
          <div className="space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
