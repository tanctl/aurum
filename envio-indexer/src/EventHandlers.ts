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

  const paymentsContext = (context as any).Payment;
  if (paymentsContext) {
    const paymentId = paymentEntityId(chainId, event.params.subscriptionId, paymentNumber);
    const existingPayment = await paymentsContext.get(paymentId);
    paymentsContext.set({
      id: paymentId,
      subscriptionId: event.params.subscriptionId,
      paymentNumber: paymentNumber,
      amount: amount.toString(),
      fee: fee.toString(),
      relayer: normalizeAddress(event.params.relayer),
      txHash: (event.transaction?.hash ?? event.transactionHash ?? "").toString(),
      blockNumber: bigIntFrom(event.block.number).toString(),
      timestamp: bigIntFrom(event.block.timestamp).toString(),
      chainId: BigInt(chainId).toString(),
      merchant,
      subscriber,
      token,
      tokenSymbol,
      nexusAttestationId: existingPayment?.nexusAttestationId ?? null,
      nexusVerified: existingPayment?.nexusVerified ?? false,
    });
  }

  const subscriptionContext = (context as any).Subscription;
  if (subscriptionContext) {
    const subscriptionId = subscriptionEntityId(chainId, event.params.subscriptionId);
    const existingSubscription = await subscriptionContext.get(subscriptionId);
    if (existingSubscription) {
      const updatedCount = bigIntFrom(existingSubscription.paymentsExecuted) + ONE;
      const updatedTotal = bigIntFrom(existingSubscription.totalAmountPaid) + amount;
      subscriptionContext.set({
        ...existingSubscription,
        paymentsExecuted: updatedCount.toString(),
        totalAmountPaid: updatedTotal.toString(),
      });
    }
  }

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
      createdAt: bigIntFrom(event.block.timestamp).toString(),
      startTime: bigIntFrom(event.block.timestamp).toString(),
      paymentsExecuted: ZERO.toString(),
      totalAmountPaid: ZERO.toString(),
      createdAtBlock: bigIntFrom(event.block.number).toString(),
    });
  }

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
