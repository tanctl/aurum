"use client";

type Listener = () => void;

const MAX_SAMPLES = 20;

let metrics = new Map<string, number[]>();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function recordGraphOperationMetric(operationName: string | undefined, durationMs: number) {
  if (!operationName || Number.isNaN(durationMs)) {
    return;
  }

  const next = new Map(metrics);
  const samples = next.get(operationName) ?? [];
  const updated = [...samples, durationMs];
  if (updated.length > MAX_SAMPLES) {
    updated.shift();
  }
  next.set(operationName, updated);
  metrics = next;
  notify();
}

export function subscribeGraphMetrics(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGraphMetricsSnapshot() {
  return metrics;
}

export function extractGraphOperationName(query: string | undefined): string | undefined {
  if (!query) return undefined;
  const match = query.match(/(query|mutation)\s+([A-Za-z0-9_]+)/);
  return match?.[2];
}
