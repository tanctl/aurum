/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import { RelayerRegistry, SubscriptionManager } from "generated";

type HandlerArgs = {
  event: any;
  context: any;
};

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
});

SubscriptionManager.NexusAttestationVerified.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    attestationId: event.params.attestationId,
  };

  context.SubscribtionManager_NexusAttestationVerified.set(entity);
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
});

SubscriptionManager.SubscriptionPaused.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
  };

  context.SubscribtionManager_SubscriptionPaused.set(entity);
});

SubscriptionManager.SubscriptionResumed.handler(async ({ event, context }: HandlerArgs) => {
  const entity = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    subscriptionId: event.params.subscriptionId,
    subscriber: event.params.subscriber,
  };

  context.SubscribtionManager_SubscriptionResumed.set(entity);
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
