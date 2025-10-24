"use client";

import dynamic from "next/dynamic";

const NexusProviderShell = dynamic(() => import("./NexusProviderShell"), {
  ssr: false,
});

const NexusAttestationDemoInner = dynamic(
  () => import("./NexusAttestationDemoInner"),
  { ssr: false }
);

export function NexusAttestationDemo() {
  return (
    <NexusProviderShell>
      <NexusAttestationDemoInner />
    </NexusProviderShell>
  );
}
