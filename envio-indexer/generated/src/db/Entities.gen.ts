/* TypeScript file generated from Entities.res by genType. */

/* eslint-disable */
/* tslint:disable */

export type id = string;

export type whereOperations<entity,fieldType> = { readonly eq: (_1:fieldType) => Promise<entity[]>; readonly gt: (_1:fieldType) => Promise<entity[]> };

export type CrossChainAttestation_t = {
  readonly amount: (undefined | bigint); 
  readonly attestationId: string; 
  readonly chainId: bigint; 
  readonly id: id; 
  readonly paymentNumber: bigint; 
  readonly subscriptionId: string; 
  readonly timestamp: bigint; 
  readonly token: (undefined | string); 
  readonly verified: boolean
};

export type CrossChainAttestation_indexedFieldOperations = {};

export type IndexerMeta_t = {
  readonly chainId: bigint; 
  readonly envioVersion: (undefined | string); 
  readonly id: id; 
  readonly indexingLatencyMs: (undefined | bigint); 
  readonly lastSyncTimestamp: bigint; 
  readonly latestIndexedBlock: bigint; 
  readonly latestIndexedTimestamp: bigint; 
  readonly performanceScore: (undefined | number)
};

export type IndexerMeta_indexedFieldOperations = {};

export type Intent_t = {
  readonly amount: bigint; 
  readonly createdAt: bigint; 
  readonly createdAtBlock: bigint; 
  readonly expiry: bigint; 
  readonly id: id; 
  readonly interval: bigint; 
  readonly maxPayments: bigint; 
  readonly maxTotalAmount: bigint; 
  readonly merchant: string; 
  readonly performanceScore: (undefined | number); 
  readonly signature: (undefined | string); 
  readonly status: string; 
  readonly subscriber: string; 
  readonly subscriptionId: string; 
  readonly token: string
};

export type Intent_indexedFieldOperations = {};

export type MerchantPerformance_t = {
  readonly activeSubscriptions: bigint; 
  readonly averageLatencySeconds: (undefined | number); 
  readonly averagePaymentValue: (undefined | bigint); 
  readonly failedPayments: bigint; 
  readonly id: id; 
  readonly lastPaymentAt: (undefined | bigint); 
  readonly latencySamples: bigint; 
  readonly latencyTotalSeconds: bigint; 
  readonly merchant: string; 
  readonly performanceScore: (undefined | number); 
  readonly successfulPayments: bigint; 
  readonly totalPayments: bigint; 
  readonly totalRevenue: bigint; 
  readonly totalSubscriptions: bigint; 
  readonly updatedAt: bigint
};

export type MerchantPerformance_indexedFieldOperations = {};

export type MerchantTokenStats_t = {
  readonly activeSubscriptions: bigint; 
  readonly averageTransactionValue: bigint; 
  readonly chainId: bigint; 
  readonly id: id; 
  readonly merchant: string; 
  readonly token: string; 
  readonly tokenSymbol: string; 
  readonly totalPayments: bigint; 
  readonly totalRevenue: bigint; 
  readonly totalSubscriptions: bigint
};

export type MerchantTokenStats_indexedFieldOperations = {};

export type Payment_t = {
  readonly amount: bigint; 
  readonly blockNumber: bigint; 
  readonly chainId: bigint; 
  readonly executedAt: bigint; 
  readonly expectedAt: (undefined | bigint); 
  readonly fee: bigint; 
  readonly id: id; 
  readonly intentSignedAt: (undefined | bigint); 
  readonly latencySeconds: (undefined | number); 
  readonly merchant: string; 
  readonly merchantPerformanceId: (undefined | string); 
  readonly nexusAttestationId: (undefined | string); 
  readonly nexusVerified: boolean; 
  readonly paymentNumber: bigint; 
  readonly relayer: string; 
  readonly relayerPerformanceId: (undefined | string); 
  readonly subscriber: string; 
  readonly subscriptionId: string; 
  readonly timestamp: bigint; 
  readonly token: string; 
  readonly tokenDecimals: (undefined | number); 
  readonly tokenSymbol: string; 
  readonly txHash: string; 
  readonly usdValue: (undefined | bigint)
};

export type Payment_indexedFieldOperations = {};

export type RelayerPerformance_t = {
  readonly averageLatencySeconds: (undefined | number); 
  readonly chainId: bigint; 
  readonly executions: bigint; 
  readonly failedExecutions: bigint; 
  readonly id: id; 
  readonly latencySamples: bigint; 
  readonly latencyTotalSeconds: bigint; 
  readonly performanceScore: (undefined | number); 
  readonly relayer: string; 
  readonly successfulExecutions: bigint; 
  readonly totalFees: bigint; 
  readonly updatedAt: bigint
};

export type RelayerPerformance_indexedFieldOperations = {};

export type RelayerRegistry_EmergencySlash_t = {
  readonly amount: bigint; 
  readonly id: id; 
  readonly reason: string; 
  readonly relayer: string
};

export type RelayerRegistry_EmergencySlash_indexedFieldOperations = {};

export type RelayerRegistry_ExecutionRecorded_t = {
  readonly feeAmount: bigint; 
  readonly id: id; 
  readonly relayer: string; 
  readonly success: boolean
};

export type RelayerRegistry_ExecutionRecorded_indexedFieldOperations = {};

export type RelayerRegistry_OwnershipTransferred_t = {
  readonly id: id; 
  readonly newOwner: string; 
  readonly previousOwner: string
};

export type RelayerRegistry_OwnershipTransferred_indexedFieldOperations = {};

export type RelayerRegistry_RelayerRegistered_t = {
  readonly id: id; 
  readonly relayer: string; 
  readonly stakedAmount: bigint
};

export type RelayerRegistry_RelayerRegistered_indexedFieldOperations = {};

export type RelayerRegistry_RelayerRestaked_t = {
  readonly amount: bigint; 
  readonly id: id; 
  readonly newStake: bigint; 
  readonly relayer: string
};

export type RelayerRegistry_RelayerRestaked_indexedFieldOperations = {};

export type RelayerRegistry_RelayerSlashed_t = {
  readonly id: id; 
  readonly relayer: string; 
  readonly remainingStake: bigint; 
  readonly slashAmount: bigint
};

export type RelayerRegistry_RelayerSlashed_indexedFieldOperations = {};

export type RelayerRegistry_RelayerUnregistered_t = {
  readonly id: id; 
  readonly relayer: string; 
  readonly returnedStake: bigint
};

export type RelayerRegistry_RelayerUnregistered_indexedFieldOperations = {};

export type RelayerRegistry_SlashingParametersUpdated_t = {
  readonly failureThreshold: bigint; 
  readonly id: id; 
  readonly slashAmount: bigint
};

export type RelayerRegistry_SlashingParametersUpdated_indexedFieldOperations = {};

export type RelayerRegistry_WithdrawalRequested_t = {
  readonly id: id; 
  readonly relayer: string; 
  readonly requestTime: bigint
};

export type RelayerRegistry_WithdrawalRequested_indexedFieldOperations = {};

export type SubscriberStats_t = {
  readonly activeSubscriptions: bigint; 
  readonly id: id; 
  readonly lastPaymentAt: (undefined | bigint); 
  readonly merchant: string; 
  readonly payments: bigint; 
  readonly performanceScore: (undefined | number); 
  readonly subscriber: string; 
  readonly totalPaid: bigint; 
  readonly updatedAt: bigint
};

export type SubscriberStats_indexedFieldOperations = {};

export type SubscribtionManager_CrossChainPaymentInitiated_t = {
  readonly amount: bigint; 
  readonly id: id; 
  readonly sourceChainId: bigint; 
  readonly subscriber: string; 
  readonly subscriberToken: string; 
  readonly subscriptionId: string; 
  readonly targetChainId: bigint
};

export type SubscribtionManager_CrossChainPaymentInitiated_indexedFieldOperations = {};

export type SubscribtionManager_NexusAttestationSubmitted_t = {
  readonly attestationId: string; 
  readonly id: id; 
  readonly paymentNumber: bigint; 
  readonly subscriptionId: string
};

export type SubscribtionManager_NexusAttestationSubmitted_indexedFieldOperations = {};

export type SubscribtionManager_NexusAttestationVerified_t = { readonly attestationId: string; readonly id: id };

export type SubscribtionManager_NexusAttestationVerified_indexedFieldOperations = {};

export type SubscribtionManager_OwnershipTransferred_t = {
  readonly id: id; 
  readonly newOwner: string; 
  readonly previousOwner: string
};

export type SubscribtionManager_OwnershipTransferred_indexedFieldOperations = {};

export type SubscribtionManager_PaymentExecuted_t = {
  readonly amount: bigint; 
  readonly fee: bigint; 
  readonly id: id; 
  readonly merchant: string; 
  readonly paymentNumber: bigint; 
  readonly relayer: string; 
  readonly subscriber: string; 
  readonly subscriptionId: string; 
  readonly token: string
};

export type SubscribtionManager_PaymentExecuted_indexedFieldOperations = {};

export type SubscribtionManager_PaymentFailed_t = {
  readonly amount: bigint; 
  readonly id: id; 
  readonly merchant: string; 
  readonly reason: string; 
  readonly subscriber: string; 
  readonly subscriptionId: string
};

export type SubscribtionManager_PaymentFailed_indexedFieldOperations = {};

export type SubscribtionManager_SubscriptionCancelled_t = {
  readonly id: id; 
  readonly merchant: string; 
  readonly subscriber: string; 
  readonly subscriptionId: string
};

export type SubscribtionManager_SubscriptionCancelled_indexedFieldOperations = {};

export type SubscribtionManager_SubscriptionCreated_t = {
  readonly amount: bigint; 
  readonly expiry: bigint; 
  readonly id: id; 
  readonly interval: bigint; 
  readonly maxPayments: bigint; 
  readonly maxTotalAmount: bigint; 
  readonly merchant: string; 
  readonly subscriber: string; 
  readonly subscriptionId: string; 
  readonly token: string
};

export type SubscribtionManager_SubscriptionCreated_indexedFieldOperations = {};

export type SubscribtionManager_SubscriptionPaused_t = {
  readonly id: id; 
  readonly subscriber: string; 
  readonly subscriptionId: string
};

export type SubscribtionManager_SubscriptionPaused_indexedFieldOperations = {};

export type SubscribtionManager_SubscriptionResumed_t = {
  readonly id: id; 
  readonly subscriber: string; 
  readonly subscriptionId: string
};

export type SubscribtionManager_SubscriptionResumed_indexedFieldOperations = {};

export type SubscribtionManager_TokenAdded_t = { readonly id: id; readonly token: string };

export type SubscribtionManager_TokenAdded_indexedFieldOperations = {};

export type SubscribtionManager_TokenRemoved_t = { readonly id: id; readonly token: string };

export type SubscribtionManager_TokenRemoved_indexedFieldOperations = {};

export type Subscription_t = {
  readonly amount: bigint; 
  readonly chainId: bigint; 
  readonly createdAt: bigint; 
  readonly createdAtBlock: bigint; 
  readonly expiry: bigint; 
  readonly id: id; 
  readonly intentSignedAt: (undefined | bigint); 
  readonly interval: bigint; 
  readonly maxPayments: bigint; 
  readonly maxTotalAmount: bigint; 
  readonly merchant: string; 
  readonly paymentsExecuted: bigint; 
  readonly performanceScore: (undefined | number); 
  readonly startTime: bigint; 
  readonly status: string; 
  readonly subscriber: string; 
  readonly subscriptionId: string; 
  readonly token: string; 
  readonly tokenSymbol: string; 
  readonly totalAmountPaid: bigint
};

export type Subscription_indexedFieldOperations = {};
