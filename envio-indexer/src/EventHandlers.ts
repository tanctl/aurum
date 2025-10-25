/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import { RelayerRegistry, SubscriptionManager } from "generated";

type HandlerArgs = {
  event: any;
  context: any;
};

const ZERO = BigInt(0);
const ONE = BigInt(1);
const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
const PYUSD_SEPOLIA = "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9";
const PYUSD_BASE = "0x3bc4424841341f8b2657eae8f6b0f2125f63b934";
const ENVIO_VERSION = process.env.ENVO_INDEXER_VERSION ?? "unknown";

function normalizeAddress(value: string): string {
  return value ? value.toLowerCase() : "";
}

function bigIntFrom(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      return BigInt(value);
    } catch {
      return ZERO;
    }
  }
  if (value && typeof (value as any).toString === "function") {
    try {
      return BigInt((value as any).toString());
    } catch {
      return ZERO;
    }
  }
  return ZERO;
}

function safeSubtract(value: bigint, amount: bigint): bigint {
  return value > amount ? value - amount : ZERO;
}

function tokenSymbolFor(token: string, chainId: number): string {
  const normalized = normalizeAddress(token);
  if (normalized === normalizeAddress(ETH_ADDRESS)) {
    return "ETH";
  }
  if (normalized === PYUSD_SEPOLIA || normalized === PYUSD_BASE) {
    return "PYUSD";
  }
  if (normalized === "0x0000000000000000000000000000000000000000") {
    return chainId === 84532 ? "ETH" : "ETH";
  }
  return "UNKNOWN";
}

function tokenDecimalsFor(token: string, symbol: string): number {
  const normalized = normalizeAddress(token);
  switch (symbol) {
    case "ETH":
      return 18;
    case "PYUSD":
      return 6;
    default:
      if (normalized === PYUSD_SEPOLIA || normalized === PYUSD_BASE) {
        return 6;
      }
      return 18;
  }
}

function tokenUsdPriceFor(symbol: string): number {
  switch (symbol) {
    case "PYUSD":
      return 1;
    case "ETH":
      return 3200;
    default:
      return 0;
  }
}

function computeUsdValue(amount: bigint, decimals: number, priceUsd: number): bigint {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return ZERO;
  }
  const priceCents = BigInt(Math.round(priceUsd * 100));
  const scale = BigInt(10) ** BigInt(Math.max(decimals, 0));
  if (scale === ZERO) return ZERO;
  return (amount * priceCents) / scale;
}

function calculateSuccessRate(success: bigint, failure: bigint): number {
  const successCount = Number(success);
  const failureCount = Number(failure);
  const total = successCount + failureCount;
  if (total <= 0) {
    return 100;
  }
  return (successCount / total) * 100;
}

function scoreLatency(latencySeconds?: number | null): number {
  if (latencySeconds == null) {
    return 100;
  }
  if (latencySeconds <= 15) return 100;
  if (latencySeconds >= 600) return 0;
  const adjusted = latencySeconds - 15;
  const maxRange = 600 - 15;
  return Math.max(0, 100 - (adjusted / maxRange) * 100);
}

function computePerformanceScore(success: bigint, failure: bigint, averageLatency?: number | null): number {
  const successRate = calculateSuccessRate(success, failure);
  const latencyScore = scoreLatency(averageLatency ?? undefined);
  const blended = successRate * 0.6 + latencyScore * 0.4;
  return Number.isFinite(blended) ? Number(blended.toFixed(2)) : 0;
}

async function updateIndexerMeta({
  context,
  chainId,
  blockNumber,
  timestamp,
}: {
  context: any;
  chainId: number;
  blockNumber: bigint;
  timestamp: bigint;
}) {
  const metaContext = (context as any).IndexerMeta;
  if (!metaContext) return;
  const id = chainId.toString();
  const existing = await metaContext.get(id);
  const hostNow = BigInt(Math.floor(Date.now() / 1000));
  const indexingLatencySeconds = hostNow > timestamp ? hostNow - timestamp : ZERO;
  const latestIndexedBlock =
    blockNumber > bigIntFrom(existing?.latestIndexedBlock) ? blockNumber : bigIntFrom(existing?.latestIndexedBlock);
  const latestIndexedTimestamp =
    timestamp > bigIntFrom(existing?.latestIndexedTimestamp) ? timestamp : bigIntFrom(existing?.latestIndexedTimestamp);

  const performanceScore = scoreLatency(Number(indexingLatencySeconds));

  metaContext.set({
    id,
    chainId: BigInt(chainId).toString(),
    latestIndexedBlock: latestIndexedBlock.toString(),
    latestIndexedTimestamp: latestIndexedTimestamp.toString(),
    indexingLatencyMs: (indexingLatencySeconds * BigInt(1000)).toString(),
    lastSyncTimestamp: hostNow.toString(),
    envioVersion: ENVIO_VERSION,
    performanceScore,
  });
}

async function upsertMerchantStats({
  context,
  chainId,
  merchant,
  token,
  tokenSymbol,
  revenueDelta,
  totalDelta,
  activeDelta,
  paymentDelta,
}: {
  context: any;
  chainId: number;
  merchant: string;
  token: string;
  tokenSymbol: string;
  revenueDelta?: bigint;
  totalDelta?: bigint;
  activeDelta?: bigint;
  paymentDelta?: bigint;
}) {
  const statsId = `${chainId}_${merchant}_${token}`;
  const statsContext = (context as any).MerchantTokenStats;
  if (!statsContext) {
    return;
  }

  const existing = await statsContext.get(statsId);
  const prevRevenue = bigIntFrom(existing?.totalRevenue);
  const prevPayments = bigIntFrom(existing?.totalPayments);
  const prevTotalSubs = bigIntFrom(existing?.totalSubscriptions);
  const prevActiveSubs = bigIntFrom(existing?.activeSubscriptions);

  const newRevenue = prevRevenue + (revenueDelta ?? ZERO);
  const newPayments = prevPayments + (paymentDelta ?? ZERO);
  const newTotalSubs = prevTotalSubs + (totalDelta ?? ZERO);
  const tentativeActive = prevActiveSubs + (activeDelta ?? ZERO);
  const newActiveSubs = tentativeActive < ZERO ? ZERO : tentativeActive;
  const average =
    newPayments > ZERO ? newRevenue / newPayments : ZERO;

  statsContext.set({
    id: statsId,
    merchant,
    token,
    tokenSymbol,
    chainId: BigInt(chainId).toString(),
    totalSubscriptions: newTotalSubs.toString(),
    activeSubscriptions: newActiveSubs.toString(),
    totalRevenue: newRevenue.toString(),
    totalPayments: newPayments.toString(),
    averageTransactionValue: average.toString(),
  });
}

function paymentEntityId(chainId: number, subscriptionId: string, paymentNumber: any): string {
  return `${chainId}_${subscriptionId}_${paymentNumber.toString()}`;
}

function subscriptionEntityId(chainId: number, subscriptionId: string): string {
  return `${chainId}_${subscriptionId}`;
}

async function updateMerchantPerformance({
  context,
  merchant,
  timestamp,
  amountDelta = ZERO,
  successDelta = ZERO,
  failureDelta = ZERO,
  latencySeconds,
  activeDelta,
  totalDelta,
}: {
  context: any;
  merchant: string;
  timestamp: bigint;
  amountDelta?: bigint;
  successDelta?: bigint;
  failureDelta?: bigint;
  latencySeconds?: number | null;
  activeDelta?: bigint;
  totalDelta?: bigint;
}) {
  const performanceContext = (context as any).MerchantPerformance;
  if (!performanceContext) return;

  const id = merchant;
  const existing = await performanceContext.get(id);

  const prevRevenue = bigIntFrom(existing?.totalRevenue);
  const prevSuccess = bigIntFrom(existing?.successfulPayments);
  const prevFailure = bigIntFrom(existing?.failedPayments);
  const prevTotalPayments = bigIntFrom(existing?.totalPayments);
  const prevActive = bigIntFrom(existing?.activeSubscriptions);
  const prevTotalSubs = bigIntFrom(existing?.totalSubscriptions);
  const prevLatencyTotal = bigIntFrom(existing?.latencyTotalSeconds ?? "0");
  const prevLatencySamples = bigIntFrom(existing?.latencySamples ?? "0");

  const nextRevenue = prevRevenue + amountDelta;
  const nextSuccess = prevSuccess + successDelta;
  const nextFailure = prevFailure + failureDelta;
  const nextTotalPayments = prevTotalPayments + successDelta + failureDelta;
  const nextActive = prevActive + (activeDelta ?? ZERO);
  const nextTotalSubs = prevTotalSubs + (totalDelta ?? ZERO);

  let latencyTotal = prevLatencyTotal;
  let latencySamples = prevLatencySamples;
  if (latencySeconds != null && latencySeconds >= 0) {
    latencyTotal += BigInt(Math.round(latencySeconds));
    latencySamples += ONE;
  }

  const averageLatency =
    latencySamples > ZERO ? Number(latencyTotal) / Math.max(1, Number(latencySamples)) : null;
  const averagePaymentValue =
    nextSuccess > ZERO ? nextRevenue / nextSuccess : ZERO;
  const performanceScore = computePerformanceScore(nextSuccess, nextFailure, averageLatency);
  const shouldUpdateLastPayment = successDelta > ZERO;
  const lastPaymentAt = shouldUpdateLastPayment
    ? timestamp.toString()
    : existing?.lastPaymentAt ?? null;

  performanceContext.set({
    id,
    merchant,
    totalRevenue: nextRevenue.toString(),
    totalPayments: nextTotalPayments.toString(),
    successfulPayments: nextSuccess.toString(),
    failedPayments: nextFailure.toString(),
    latencyTotalSeconds: latencyTotal.toString(),
    latencySamples: latencySamples.toString(),
    averageLatencySeconds: averageLatency ?? 0,
    averagePaymentValue: averagePaymentValue.toString(),
    activeSubscriptions: (nextActive < ZERO ? ZERO : nextActive).toString(),
    totalSubscriptions: (nextTotalSubs < ZERO ? ZERO : nextTotalSubs).toString(),
    performanceScore,
    lastPaymentAt,
    updatedAt: timestamp.toString(),
  });
}

async function updateRelayerPerformance({
  context,
  relayer,
  chainId,
  timestamp,
  feeDelta = ZERO,
  successDelta = ZERO,
  failureDelta = ZERO,
  latencySeconds,
}: {
  context: any;
  relayer: string;
  chainId: number;
  timestamp: bigint;
  feeDelta?: bigint;
  successDelta?: bigint;
  failureDelta?: bigint;
  latencySeconds?: number | null;
}) {
  const relayerContext = (context as any).RelayerPerformance;
  if (!relayerContext) return;
  const normalizedRelayer = normalizeAddress(relayer);
  const id = `${chainId}_${normalizedRelayer}`;
  const existing = await relayerContext.get(id);

  const prevExecutions = bigIntFrom(existing?.executions);
  const prevSuccess = bigIntFrom(existing?.successfulExecutions);
  const prevFailure = bigIntFrom(existing?.failedExecutions);
  const prevFees = bigIntFrom(existing?.totalFees);
  const prevLatencyTotal = bigIntFrom(existing?.latencyTotalSeconds ?? "0");
  const prevLatencySamples = bigIntFrom(existing?.latencySamples ?? "0");

  const nextExecutions = prevExecutions + successDelta + failureDelta;
  const nextSuccess = prevSuccess + successDelta;
  const nextFailure = prevFailure + failureDelta;
  const nextFees = prevFees + feeDelta;

  let latencyTotal = prevLatencyTotal;
  let latencySamples = prevLatencySamples;
  if (latencySeconds != null && latencySeconds >= 0) {
    latencyTotal += BigInt(Math.round(latencySeconds));
    latencySamples += ONE;
  }

  const averageLatency =
    latencySamples > ZERO ? Number(latencyTotal) / Math.max(1, Number(latencySamples)) : null;
  const performanceScore = computePerformanceScore(nextSuccess, nextFailure, averageLatency);

  relayerContext.set({
    id,
    relayer: normalizedRelayer,
    chainId: BigInt(chainId).toString(),
    executions: nextExecutions.toString(),
    successfulExecutions: nextSuccess.toString(),
    failedExecutions: nextFailure.toString(),
    totalFees: nextFees.toString(),
    latencyTotalSeconds: latencyTotal.toString(),
    latencySamples: latencySamples.toString(),
    averageLatencySeconds: averageLatency ?? 0,
    performanceScore,
    updatedAt: timestamp.toString(),
  });
}

async function updateSubscriberStats({
  context,
  merchant,
  subscriber,
  amountDelta = ZERO,
  successDelta = ZERO,
  timestamp,
  activeDelta,
}: {
  context: any;
  merchant: string;
  subscriber: string;
  amountDelta?: bigint;
  successDelta?: bigint;
  timestamp: bigint;
  activeDelta?: bigint;
}) {
  const subscriberContext = (context as any).SubscriberStats;
  if (!subscriberContext) return;
  const id = `${merchant}_${subscriber}`;
  const existing = await subscriberContext.get(id);

  const prevTotal = bigIntFrom(existing?.totalPaid);
  const prevPayments = bigIntFrom(existing?.payments);
  const prevActive = bigIntFrom(existing?.activeSubscriptions);

  const nextTotal = prevTotal + amountDelta;
  const nextPayments = prevPayments + successDelta;
  const nextActive = prevActive + (activeDelta ?? ZERO);

  subscriberContext.set({
    id,
    subscriber,
    merchant,
    totalPaid: nextTotal.toString(),
    payments: nextPayments.toString(),
    activeSubscriptions: (nextActive < ZERO ? ZERO : nextActive).toString(),
    lastPaymentAt: timestamp.toString(),
    performanceScore: computePerformanceScore(nextPayments, ZERO, null),
    updatedAt: timestamp.toString(),
  });
}

RelayerRegistry.EmergencySlash.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    amount: event.params.amount,
    reason: event.params.reason,
  };

  context.RelayerRegistry_EmergencySlash.set(entity);
});

RelayerRegistry.ExecutionRecorded.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    success: event.params.success,
    feeAmount: event.params.feeAmount,
  };

  context.RelayerRegistry_ExecutionRecorded.set(entity);
});

RelayerRegistry.OwnershipTransferred.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.RelayerRegistry_OwnershipTransferred.set(entity);
});

RelayerRegistry.RelayerRegistered.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    stakedAmount: event.params.stakedAmount,
  };

  context.RelayerRegistry_RelayerRegistered.set(entity);
});

RelayerRegistry.RelayerRestaked.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    amount: event.params.amount,
    newStake: event.params.newStake,
  };

  context.RelayerRegistry_RelayerRestaked.set(entity);
});

RelayerRegistry.RelayerSlashed.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    slashAmount: event.params.slashAmount,
    remainingStake: event.params.remainingStake,
  };

  context.RelayerRegistry_RelayerSlashed.set(entity);
});

RelayerRegistry.RelayerUnregistered.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    returnedStake: event.params.returnedStake,
  };

  context.RelayerRegistry_RelayerUnregistered.set(entity);
});

RelayerRegistry.SlashingParametersUpdated.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    slashAmount: event.params.slashAmount,
    failureThreshold: event.params.failureThreshold,
  };

  context.RelayerRegistry_SlashingParametersUpdated.set(entity);
});

RelayerRegistry.WithdrawalRequested.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    relayer: event.params.relayer,
    requestTime: event.params.requestTime,
  };

  context.RelayerRegistry_WithdrawalRequested.set(entity);
});

SubscriptionManager.CrossChainPaymentInitiated.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
    subscriberToken: event.params.subscriberToken,
    sourceChainId: event.params.sourceChainId,
    targetChainId: event.params.targetChainId,
    amount: event.params.amount,
  };

  context.SubscribtionManager_CrossChainPaymentInitiated.set(entity);
});

SubscriptionManager.NexusAttestationSubmitted.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    paymentNumber: event.params.paymentNumber,
    attestationId: event.params.attestationId,
  };

  context.SubscribtionManager_NexusAttestationSubmitted.set(entity);

  const chainId = Number(event.chainId);
  const attestationContext = (context as any).CrossChainAttestation;
  const paymentContext = (context as any).Payment;
  const paymentId = paymentEntityId(
    chainId,
    event.params.subscriptionId,
    event.params.paymentNumber.toString(),
  );
  const existingPayment = paymentContext ? await paymentContext.get(paymentId) : undefined;

  if (attestationContext) {
    attestationContext.set({
      id: event.params.attestationId,
      attestationId: event.params.attestationId,
      subscriptionId: event.params.subscriptionId,
      paymentNumber: event.params.paymentNumber.toString(),
      chainId: BigInt(chainId).toString(),
      token: existingPayment?.token ?? null,
      amount: existingPayment?.amount ?? null,
      verified: false,
      timestamp: bigIntFrom(event.block.timestamp).toString(),
    });
  }

  if (paymentContext && existingPayment) {
    paymentContext.set({
      ...existingPayment,
      nexusAttestationId: event.params.attestationId,
      nexusVerified: false,
    });
  }
});

SubscriptionManager.NexusAttestationVerified.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    attestationId: event.params.attestationId,
  };

  context.SubscribtionManager_NexusAttestationVerified.set(entity);

  const attestationContext = (context as any).CrossChainAttestation;
  const paymentContext = (context as any).Payment;

  if (attestationContext) {
    const existing = await attestationContext.get(event.params.attestationId);
    if (existing) {
      attestationContext.set({
        ...existing,
        verified: true,
      });

      if (paymentContext) {
        const chainId = Number(existing.chainId ?? 0);
        const paymentId = paymentEntityId(
          chainId,
          existing.subscriptionId,
          existing.paymentNumber,
        );
        const payment = await paymentContext.get(paymentId);
        if (payment) {
          paymentContext.set({
            ...payment,
            nexusVerified: true,
          });
        }
      }
    }
  }
});

SubscriptionManager.OwnershipTransferred.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    previousOwner: event.params.previousOwner,
    newOwner: event.params.newOwner,
  };

  context.SubscribtionManager_OwnershipTransferred.set(entity);
});

SubscriptionManager.PaymentExecuted.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
    merchant: event.params.merchant,
    token: event.params.token,
    paymentNumber: event.params.paymentNumber,
    amount: event.params.amount,
    fee: event.params.fee,
    relayer: event.params.relayer,
  };

  context.SubscribtionManager_PaymentExecuted.set(entity);

  const chainId = Number(event.chainId);
  const merchant = normalizeAddress(event.params.merchant);
  const subscriber = normalizeAddress(event.params.subscriber);
  const token = normalizeAddress(event.params.token);
  const tokenSymbol = tokenSymbolFor(token, chainId);
  const amount = bigIntFrom(event.params.amount);
  const fee = bigIntFrom(event.params.fee);
  const paymentNumber = event.params.paymentNumber.toString();
  const blockTimestamp = bigIntFrom(event.block.timestamp);
  const blockNumber = bigIntFrom(event.block.number);
  const paymentId = paymentEntityId(chainId, event.params.subscriptionId, paymentNumber);
  const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);
  const subscriptionContext = (context as any).Subscription;
  const existingSubscription = subscriptionContext ? await subscriptionContext.get(subscriptionId) : undefined;
  const interval = existingSubscription ? bigIntFrom(existingSubscription.interval ?? "0") : ZERO;
  const startTime = existingSubscription
    ? bigIntFrom(existingSubscription.startTime ?? existingSubscription.createdAt ?? blockTimestamp.toString())
    : blockTimestamp;
  const intentSignedAt = existingSubscription?.intentSignedAt
    ? bigIntFrom(existingSubscription.intentSignedAt)
    : startTime;
  const paymentIndex = BigInt(Math.max(Number(event.params.paymentNumber ?? 1) - 1, 0));
  const expectedAt = interval > ZERO ? startTime + interval * paymentIndex : startTime;
  const latencyBn = blockTimestamp > expectedAt ? blockTimestamp - expectedAt : ZERO;
  const latencySeconds = Number(latencyBn);
  const decimals = tokenDecimalsFor(token, tokenSymbol);
  const usdValue = computeUsdValue(amount, decimals, tokenUsdPriceFor(tokenSymbol));

  const paymentsContext = (context as any).Payment;
  if (paymentsContext) {
    const existingPayment = await paymentsContext.get(paymentId);

    paymentsContext.set({
      id: paymentId,
      subscriptionId: event.params.subscriptionId,
      paymentNumber: paymentNumber,
      amount: amount.toString(),
      fee: fee.toString(),
      relayer: normalizeAddress(event.params.relayer),
      txHash: (event.transaction?.hash ?? event.transactionHash ?? "").toString(),
      blockNumber: blockNumber.toString(),
      timestamp: blockTimestamp.toString(),
      chainId: BigInt(chainId).toString(),
      merchant,
      subscriber,
      token,
      tokenSymbol,
      nexusAttestationId: existingPayment?.nexusAttestationId ?? null,
      nexusVerified: existingPayment?.nexusVerified ?? false,
      executedAt: blockTimestamp.toString(),
      expectedAt: expectedAt.toString(),
      intentSignedAt: intentSignedAt.toString(),
      latencySeconds,
      usdValue: usdValue.toString(),
      tokenDecimals: decimals,
      relayerPerformanceId: `${chainId}_${normalizeAddress(event.params.relayer)}`,
      merchantPerformanceId: merchant,
    });
  }

  if (subscriptionContext && existingSubscription) {
    const updatedCount = bigIntFrom(existingSubscription.paymentsExecuted) + ONE;
    const updatedTotal = bigIntFrom(existingSubscription.totalAmountPaid) + amount;
    subscriptionContext.set({
      ...existingSubscription,
      paymentsExecuted: updatedCount.toString(),
      totalAmountPaid: updatedTotal.toString(),
      intentSignedAt: intentSignedAt.toString(),
      performanceScore: computePerformanceScore(updatedCount, ZERO, latencySeconds),
    });
  }

  await updateMerchantPerformance({
    context,
    merchant,
    timestamp: blockTimestamp,
    amountDelta: usdValue,
    successDelta: ONE,
    latencySeconds,
  });

  await updateRelayerPerformance({
    context,
    relayer: normalizeAddress(event.params.relayer),
    chainId,
    timestamp: blockTimestamp,
    feeDelta: fee,
    successDelta: ONE,
    latencySeconds,
  });

  await updateSubscriberStats({
    context,
    merchant,
    subscriber,
    amountDelta: usdValue,
    successDelta: ONE,
    timestamp: blockTimestamp,
  });

  const intentContext = (context as any).Intent;
  if (intentContext) {
    const existingIntent = await intentContext.get(subscriptionId);
    if (existingIntent) {
      intentContext.set({
        ...existingIntent,
        status: "EXECUTED",
        performanceScore: computePerformanceScore(ONE, ZERO, latencySeconds),
      });
    }
  }

  await updateIndexerMeta({
    context,
    chainId,
    blockNumber,
    timestamp: blockTimestamp,
  });

  await upsertMerchantStats({
    context,
    chainId,
    merchant,
    token,
    tokenSymbol,
    revenueDelta: amount,
    paymentDelta: ONE,
  });
});

SubscriptionManager.PaymentFailed.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
    merchant: event.params.merchant,
    amount: event.params.amount,
    reason: event.params.reason,
  };

  context.SubscribtionManager_PaymentFailed.set(entity);

  const chainId = Number(event.chainId);
  const merchant = normalizeAddress(event.params.merchant);
  const subscriber = normalizeAddress(event.params.subscriber);
  const blockTimestamp = bigIntFrom(event.block.timestamp);
  const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);

  await updateMerchantPerformance({
    context,
    merchant,
    timestamp: blockTimestamp,
    failureDelta: ONE,
  });

  const intentContext = (context as any).Intent;
  if (intentContext) {
    const existingIntent = await intentContext.get(subscriptionId);
    if (existingIntent) {
      intentContext.set({
        ...existingIntent,
        status: "FAILED",
        performanceScore: computePerformanceScore(ZERO, ONE, null),
      });
    }
  }

  await updateIndexerMeta({
    context,
    chainId,
    blockNumber: bigIntFrom(event.block.number),
    timestamp: blockTimestamp,
  });
});

SubscriptionManager.SubscriptionCancelled.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
    merchant: event.params.merchant,
  };

  context.SubscribtionManager_SubscriptionCancelled.set(entity);

  const chainId = Number(event.chainId);
  const subscriptionContext = (context as any).Subscription;

  if (subscriptionContext) {
    const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);
    const existing = await subscriptionContext.get(subscriptionId);
    if (existing) {
      subscriptionContext.set({
        ...existing,
        status: "CANCELLED",
      });

      const blockTimestamp = bigIntFrom(event.block.timestamp);

      await updateMerchantPerformance({
        context,
        merchant: existing.merchant,
        timestamp: blockTimestamp,
        activeDelta: -ONE,
      });

      await updateSubscriberStats({
        context,
        merchant: existing.merchant,
        subscriber: existing.subscriber,
        timestamp: blockTimestamp,
        activeDelta: -ONE,
      });

      const intentContext = (context as any).Intent;
      if (intentContext) {
        const existingIntent = await intentContext.get(subscriptionId);
        if (existingIntent) {
          intentContext.set({
            ...existingIntent,
            status: "CANCELLED",
          });
        }
      }

      await updateIndexerMeta({
        context,
        chainId,
        blockNumber: bigIntFrom(event.block.number),
        timestamp: blockTimestamp,
      });

      await upsertMerchantStats({
        context,
        chainId,
        merchant: existing.merchant,
        token: existing.token,
        tokenSymbol: existing.tokenSymbol || tokenSymbolFor(existing.token, chainId),
        activeDelta: -ONE,
      });
    }
  }
});

SubscriptionManager.SubscriptionCreated.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
    merchant: event.params.merchant,
    token: event.params.token,
    amount: event.params.amount,
    interval: event.params.interval,
    maxPayments: event.params.maxPayments,
    maxTotalAmount: event.params.maxTotalAmount,
    expiry: event.params.expiry,
  };

  context.SubscribtionManager_SubscriptionCreated.set(entity);

  const chainId = Number(event.chainId);
  const merchant = normalizeAddress(event.params.merchant);
  const subscriber = normalizeAddress(event.params.subscriber);
  const token = normalizeAddress(event.params.token);
  const tokenSymbol = tokenSymbolFor(token, chainId);
  const subscriptionContext = (context as any).Subscription;
  const blockTimestamp = bigIntFrom(event.block.timestamp);
  const blockNumber = bigIntFrom(event.block.number);

  if (subscriptionContext) {
    const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);
    subscriptionContext.set({
      id: subscriptionId,
      subscriptionId: event.params.subscriptionId,
      subscriber,
      merchant,
      token,
      tokenSymbol,
      amount: bigIntFrom(event.params.amount).toString(),
      interval: bigIntFrom(event.params.interval).toString(),
      maxPayments: bigIntFrom(event.params.maxPayments).toString(),
      maxTotalAmount: bigIntFrom(event.params.maxTotalAmount).toString(),
      expiry: bigIntFrom(event.params.expiry).toString(),
      chainId: BigInt(chainId).toString(),
      status: "ACTIVE",
      createdAt: blockTimestamp.toString(),
      startTime: blockTimestamp.toString(),
      paymentsExecuted: ZERO.toString(),
      totalAmountPaid: ZERO.toString(),
      createdAtBlock: blockNumber.toString(),
      intentSignedAt: blockTimestamp.toString(),
      performanceScore: 100,
    });
  }

  const intentContext = (context as any).Intent;
  if (intentContext) {
    const intentId = subscriptionEntityId(chainId, event.params.subscriptionId);
    intentContext.set({
      id: intentId,
      subscriptionId: event.params.subscriptionId,
      merchant,
      subscriber,
      token,
      amount: bigIntFrom(event.params.amount).toString(),
      interval: bigIntFrom(event.params.interval).toString(),
      maxPayments: bigIntFrom(event.params.maxPayments).toString(),
      maxTotalAmount: bigIntFrom(event.params.maxTotalAmount).toString(),
      expiry: bigIntFrom(event.params.expiry).toString(),
      status: "PENDING",
      createdAt: blockTimestamp.toString(),
      createdAtBlock: blockNumber.toString(),
      signature: null,
      performanceScore: 100,
    });
  }

  await updateMerchantPerformance({
    context,
    merchant,
    timestamp: blockTimestamp,
    totalDelta: ONE,
    activeDelta: ONE,
  });

  await updateSubscriberStats({
    context,
    merchant,
    subscriber,
    timestamp: blockTimestamp,
    activeDelta: ONE,
  });

  await updateIndexerMeta({
    context,
    chainId,
    blockNumber,
    timestamp: blockTimestamp,
  });

  await upsertMerchantStats({
    context,
    chainId,
    merchant,
    token,
    tokenSymbol,
    totalDelta: ONE,
    activeDelta: ONE,
  });
});

SubscriptionManager.SubscriptionPaused.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
  };

  context.SubscribtionManager_SubscriptionPaused.set(entity);

  const chainId = Number(event.chainId);
  const subscriptionContext = (context as any).Subscription;

  if (subscriptionContext) {
    const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);
    const existing = await subscriptionContext.get(subscriptionId);
    if (existing) {
      subscriptionContext.set({
        ...existing,
        status: "PAUSED",
      });

      const blockTimestamp = bigIntFrom(event.block.timestamp);

      await updateMerchantPerformance({
        context,
        merchant: existing.merchant,
        timestamp: blockTimestamp,
        activeDelta: -ONE,
      });

      await updateSubscriberStats({
        context,
        merchant: existing.merchant,
        subscriber: existing.subscriber,
        timestamp: blockTimestamp,
        activeDelta: -ONE,
      });

      await updateIndexerMeta({
        context,
        chainId,
        blockNumber: bigIntFrom(event.block.number),
        timestamp: blockTimestamp,
      });

      await upsertMerchantStats({
        context,
        chainId,
        merchant: existing.merchant,
        token: existing.token,
        tokenSymbol: existing.tokenSymbol || tokenSymbolFor(existing.token, chainId),
        activeDelta: -ONE,
      });
    }
  }
});

SubscriptionManager.SubscriptionResumed.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
  };

  context.SubscribtionManager_SubscriptionResumed.set(entity);

  const chainId = Number(event.chainId);
  const subscriptionContext = (context as any).Subscription;
  if (subscriptionContext) {
    const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);
    const existing = await subscriptionContext.get(subscriptionId);
    if (existing) {
      subscriptionContext.set({
        ...existing,
        status: "ACTIVE",
      });

      const blockTimestamp = bigIntFrom(event.block.timestamp);

      await updateMerchantPerformance({
        context,
        merchant: existing.merchant,
        timestamp: blockTimestamp,
        activeDelta: ONE,
      });

      await updateSubscriberStats({
        context,
        merchant: existing.merchant,
        subscriber: existing.subscriber,
        timestamp: blockTimestamp,
        activeDelta: ONE,
      });

      await updateIndexerMeta({
        context,
        chainId,
        blockNumber: bigIntFrom(event.block.number),
        timestamp: blockTimestamp,
      });

      await upsertMerchantStats({
        context,
        chainId,
        merchant: existing.merchant,
        token: existing.token,
        tokenSymbol: existing.tokenSymbol || tokenSymbolFor(existing.token, chainId),
        activeDelta: ONE,
      });
    }
  }
});

SubscriptionManager.TokenAdded.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    token: event.params.token,
  };

  context.SubscribtionManager_TokenAdded.set(entity);
});

SubscriptionManager.TokenRemoved.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    token: event.params.token,
  };

  context.SubscribtionManager_TokenRemoved.set(entity);
});
