"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { getGraphMetricsSnapshot, subscribeGraphMetrics } from "@/lib/graphMetrics";

export function useGraphLatencyAverage(operationNames: string[]) {
  const snapshot = useSyncExternalStore(
    subscribeGraphMetrics,
    getGraphMetricsSnapshot,
    getGraphMetricsSnapshot,
  );

  return useMemo(() => {
    if (!operationNames.length) return null;
    const durations: number[] = [];
    operationNames.forEach((name) => {
      const samples = snapshot.get(name);
      if (samples?.length) {
        durations.push(...samples);
      }
    });
    if (!durations.length) return null;
    const total = durations.reduce((sum, value) => sum + value, 0);
    return total / durations.length;
  }, [snapshot, operationNames]);
}
