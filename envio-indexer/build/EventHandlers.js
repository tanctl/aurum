"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
const generated_1 = require("generated");
generated_1.RelayerRegistry.EmergencySlash.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        amount: event.params.amount,
        reason: event.params.reason,
    };
    context.RelayerRegistry_EmergencySlash.set(entity);
});
generated_1.RelayerRegistry.ExecutionRecorded.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        success: event.params.success,
        feeAmount: event.params.feeAmount,
    };
    context.RelayerRegistry_ExecutionRecorded.set(entity);
});
generated_1.RelayerRegistry.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        previousOwner: event.params.previousOwner,
        newOwner: event.params.newOwner,
    };
    context.RelayerRegistry_OwnershipTransferred.set(entity);
});
generated_1.RelayerRegistry.RelayerRegistered.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        stakedAmount: event.params.stakedAmount,
    };
    context.RelayerRegistry_RelayerRegistered.set(entity);
});
generated_1.RelayerRegistry.RelayerRestaked.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        amount: event.params.amount,
        newStake: event.params.newStake,
    };
    context.RelayerRegistry_RelayerRestaked.set(entity);
});
generated_1.RelayerRegistry.RelayerSlashed.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        slashAmount: event.params.slashAmount,
        remainingStake: event.params.remainingStake,
    };
    context.RelayerRegistry_RelayerSlashed.set(entity);
});
generated_1.RelayerRegistry.RelayerUnregistered.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        returnedStake: event.params.returnedStake,
    };
    context.RelayerRegistry_RelayerUnregistered.set(entity);
});
generated_1.RelayerRegistry.SlashingParametersUpdated.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        slashAmount: event.params.slashAmount,
        failureThreshold: event.params.failureThreshold,
    };
    context.RelayerRegistry_SlashingParametersUpdated.set(entity);
});
generated_1.RelayerRegistry.WithdrawalRequested.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        relayer: event.params.relayer,
        requestTime: event.params.requestTime,
    };
    context.RelayerRegistry_WithdrawalRequested.set(entity);
});
generated_1.SubscriptionManager.CrossChainPaymentInitiated.handler(async ({ event, context }) => {
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
generated_1.SubscriptionManager.NexusAttestationSubmitted.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        subscriptionId: event.params.subscriptionId,
        paymentNumber: event.params.paymentNumber,
        attestationId: event.params.attestationId,
    };
    context.SubscribtionManager_NexusAttestationSubmitted.set(entity);
});
generated_1.SubscriptionManager.NexusAttestationVerified.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        attestationId: event.params.attestationId,
    };
    context.SubscribtionManager_NexusAttestationVerified.set(entity);
});
generated_1.SubscriptionManager.OwnershipTransferred.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        previousOwner: event.params.previousOwner,
        newOwner: event.params.newOwner,
    };
    context.SubscribtionManager_OwnershipTransferred.set(entity);
});
generated_1.SubscriptionManager.PaymentExecuted.handler(async ({ event, context }) => {
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
generated_1.SubscriptionManager.PaymentFailed.handler(async ({ event, context }) => {
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
generated_1.SubscriptionManager.SubscriptionCancelled.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        subscriptionId: event.params.subscriptionId,
        subscriber: event.params.subscriber,
        merchant: event.params.merchant,
    };
    context.SubscribtionManager_SubscriptionCancelled.set(entity);
});
generated_1.SubscriptionManager.SubscriptionCreated.handler(async ({ event, context }) => {
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
generated_1.SubscriptionManager.SubscriptionPaused.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        subscriptionId: event.params.subscriptionId,
        subscriber: event.params.subscriber,
    };
    context.SubscribtionManager_SubscriptionPaused.set(entity);
});
generated_1.SubscriptionManager.SubscriptionResumed.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        subscriptionId: event.params.subscriptionId,
        subscriber: event.params.subscriber,
    };
    context.SubscribtionManager_SubscriptionResumed.set(entity);
});
generated_1.SubscriptionManager.TokenAdded.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        token: event.params.token,
    };
    context.SubscribtionManager_TokenAdded.set(entity);
});
generated_1.SubscriptionManager.TokenRemoved.handler(async ({ event, context }) => {
    const entity = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        token: event.params.token,
    };
    context.SubscribtionManager_TokenRemoved.set(entity);
});
