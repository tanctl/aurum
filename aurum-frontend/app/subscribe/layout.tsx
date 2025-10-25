import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";

export default function SubscribeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-foundation-black">
      <Header showDashboardControls />
      <div className="mx-auto w-full max-w-4xl px-6 py-10 lg:max-w-5xl">{children}</div>
    </div>
  );
}
