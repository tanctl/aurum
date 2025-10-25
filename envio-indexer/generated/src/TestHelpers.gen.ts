/* TypeScript file generated from TestHelpers.res by genType. */

/* eslint-disable */
/* tslint:disable */

const TestHelpersJS = require('./TestHelpers.res.js');

import type {RelayerRegistry_EmergencySlash_event as Types_RelayerRegistry_EmergencySlash_event} from './Types.gen';

import type {RelayerRegistry_ExecutionRecorded_event as Types_RelayerRegistry_ExecutionRecorded_event} from './Types.gen';

import type {RelayerRegistry_OwnershipTransferred_event as Types_RelayerRegistry_OwnershipTransferred_event} from './Types.gen';

import type {RelayerRegistry_RelayerRegistered_event as Types_RelayerRegistry_RelayerRegistered_event} from './Types.gen';

import type {RelayerRegistry_RelayerRestaked_event as Types_RelayerRegistry_RelayerRestaked_event} from './Types.gen';

import type {RelayerRegistry_RelayerSlashed_event as Types_RelayerRegistry_RelayerSlashed_event} from './Types.gen';

import type {RelayerRegistry_RelayerUnregistered_event as Types_RelayerRegistry_RelayerUnregistered_event} from './Types.gen';

import type {RelayerRegistry_SlashingParametersUpdated_event as Types_RelayerRegistry_SlashingParametersUpdated_event} from './Types.gen';

import type {RelayerRegistry_WithdrawalRequested_event as Types_RelayerRegistry_WithdrawalRequested_event} from './Types.gen';

import type {SubscriptionManager_CrossChainPaymentInitiated_event as Types_SubscriptionManager_CrossChainPaymentInitiated_event} from './Types.gen';

import type {SubscriptionManager_NexusAttestationSubmitted_event as Types_SubscriptionManager_NexusAttestationSubmitted_event} from './Types.gen';

import type {SubscriptionManager_NexusAttestationVerified_event as Types_SubscriptionManager_NexusAttestationVerified_event} from './Types.gen';

import type {SubscriptionManager_OwnershipTransferred_event as Types_SubscriptionManager_OwnershipTransferred_event} from './Types.gen';

import type {SubscriptionManager_PaymentExecuted_event as Types_SubscriptionManager_PaymentExecuted_event} from './Types.gen';

import type {SubscriptionManager_PaymentFailed_event as Types_SubscriptionManager_PaymentFailed_event} from './Types.gen';

import type {SubscriptionManager_SubscriptionCancelled_event as Types_SubscriptionManager_SubscriptionCancelled_event} from './Types.gen';

import type {SubscriptionManager_SubscriptionCreated_event as Types_SubscriptionManager_SubscriptionCreated_event} from './Types.gen';

import type {SubscriptionManager_SubscriptionPaused_event as Types_SubscriptionManager_SubscriptionPaused_event} from './Types.gen';

import type {SubscriptionManager_SubscriptionResumed_event as Types_SubscriptionManager_SubscriptionResumed_event} from './Types.gen';

import type {SubscriptionManager_TokenAdded_event as Types_SubscriptionManager_TokenAdded_event} from './Types.gen';

import type {SubscriptionManager_TokenRemoved_event as Types_SubscriptionManager_TokenRemoved_event} from './Types.gen';

import type {t as Address_t} from 'envio/src/Address.gen';

import type {t as TestHelpers_MockDb_t} from './TestHelpers_MockDb.gen';

/** The arguements that get passed to a "processEvent" helper function */
export type EventFunctions_eventProcessorArgs<event> = {
  readonly event: event; 
  readonly mockDb: TestHelpers_MockDb_t; 
  readonly chainId?: number
};

export type EventFunctions_eventProcessor<event> = (_1:EventFunctions_eventProcessorArgs<event>) => Promise<TestHelpers_MockDb_t>;

export type EventFunctions_MockBlock_t = {
  readonly hash?: string; 
  readonly number?: number; 
  readonly timestamp?: number
};

export type EventFunctions_MockTransaction_t = {};

export type EventFunctions_mockEventData = {
  readonly chainId?: number; 
  readonly srcAddress?: Address_t; 
  readonly logIndex?: number; 
  readonly block?: EventFunctions_MockBlock_t; 
  readonly transaction?: EventFunctions_MockTransaction_t
};

export type RelayerRegistry_EmergencySlash_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly amount?: bigint; 
  readonly reason?: string; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_ExecutionRecorded_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly success?: boolean; 
  readonly feeAmount?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_OwnershipTransferred_createMockArgs = {
  readonly previousOwner?: Address_t; 
  readonly newOwner?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_RelayerRegistered_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly stakedAmount?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_RelayerRestaked_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly amount?: bigint; 
  readonly newStake?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_RelayerSlashed_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly slashAmount?: bigint; 
  readonly remainingStake?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_RelayerUnregistered_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly returnedStake?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_SlashingParametersUpdated_createMockArgs = {
  readonly slashAmount?: bigint; 
  readonly failureThreshold?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type RelayerRegistry_WithdrawalRequested_createMockArgs = {
  readonly relayer?: Address_t; 
  readonly requestTime?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_CrossChainPaymentInitiated_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly subscriberToken?: Address_t; 
  readonly sourceChainId?: bigint; 
  readonly targetChainId?: bigint; 
  readonly amount?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_NexusAttestationSubmitted_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly paymentNumber?: bigint; 
  readonly attestationId?: string; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_NexusAttestationVerified_createMockArgs = { readonly attestationId?: string; readonly mockEventData?: EventFunctions_mockEventData };

export type SubscriptionManager_OwnershipTransferred_createMockArgs = {
  readonly previousOwner?: Address_t; 
  readonly newOwner?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_PaymentExecuted_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly merchant?: Address_t; 
  readonly token?: Address_t; 
  readonly paymentNumber?: bigint; 
  readonly amount?: bigint; 
  readonly fee?: bigint; 
  readonly relayer?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_PaymentFailed_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly merchant?: Address_t; 
  readonly amount?: bigint; 
  readonly reason?: string; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_SubscriptionCancelled_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly merchant?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_SubscriptionCreated_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly merchant?: Address_t; 
  readonly token?: Address_t; 
  readonly amount?: bigint; 
  readonly interval?: bigint; 
  readonly maxPayments?: bigint; 
  readonly maxTotalAmount?: bigint; 
  readonly expiry?: bigint; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_SubscriptionPaused_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_SubscriptionResumed_createMockArgs = {
  readonly subscriptionId?: string; 
  readonly subscriber?: Address_t; 
  readonly mockEventData?: EventFunctions_mockEventData
};

export type SubscriptionManager_TokenAdded_createMockArgs = { readonly token?: Address_t; readonly mockEventData?: EventFunctions_mockEventData };

export type SubscriptionManager_TokenRemoved_createMockArgs = { readonly token?: Address_t; readonly mockEventData?: EventFunctions_mockEventData };

export const MockDb_createMockDb: () => TestHelpers_MockDb_t = TestHelpersJS.MockDb.createMockDb as any;

export const Addresses_mockAddresses: Address_t[] = TestHelpersJS.Addresses.mockAddresses as any;

export const Addresses_defaultAddress: Address_t = TestHelpersJS.Addresses.defaultAddress as any;

export const RelayerRegistry_EmergencySlash_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_EmergencySlash_event> = TestHelpersJS.RelayerRegistry.EmergencySlash.processEvent as any;

export const RelayerRegistry_EmergencySlash_createMockEvent: (args:RelayerRegistry_EmergencySlash_createMockArgs) => Types_RelayerRegistry_EmergencySlash_event = TestHelpersJS.RelayerRegistry.EmergencySlash.createMockEvent as any;

export const RelayerRegistry_ExecutionRecorded_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_ExecutionRecorded_event> = TestHelpersJS.RelayerRegistry.ExecutionRecorded.processEvent as any;

export const RelayerRegistry_ExecutionRecorded_createMockEvent: (args:RelayerRegistry_ExecutionRecorded_createMockArgs) => Types_RelayerRegistry_ExecutionRecorded_event = TestHelpersJS.RelayerRegistry.ExecutionRecorded.createMockEvent as any;

export const RelayerRegistry_OwnershipTransferred_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_OwnershipTransferred_event> = TestHelpersJS.RelayerRegistry.OwnershipTransferred.processEvent as any;

export const RelayerRegistry_OwnershipTransferred_createMockEvent: (args:RelayerRegistry_OwnershipTransferred_createMockArgs) => Types_RelayerRegistry_OwnershipTransferred_event = TestHelpersJS.RelayerRegistry.OwnershipTransferred.createMockEvent as any;

export const RelayerRegistry_RelayerRegistered_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerRegistered_event> = TestHelpersJS.RelayerRegistry.RelayerRegistered.processEvent as any;

export const RelayerRegistry_RelayerRegistered_createMockEvent: (args:RelayerRegistry_RelayerRegistered_createMockArgs) => Types_RelayerRegistry_RelayerRegistered_event = TestHelpersJS.RelayerRegistry.RelayerRegistered.createMockEvent as any;

export const RelayerRegistry_RelayerRestaked_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerRestaked_event> = TestHelpersJS.RelayerRegistry.RelayerRestaked.processEvent as any;

export const RelayerRegistry_RelayerRestaked_createMockEvent: (args:RelayerRegistry_RelayerRestaked_createMockArgs) => Types_RelayerRegistry_RelayerRestaked_event = TestHelpersJS.RelayerRegistry.RelayerRestaked.createMockEvent as any;

export const RelayerRegistry_RelayerSlashed_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerSlashed_event> = TestHelpersJS.RelayerRegistry.RelayerSlashed.processEvent as any;

export const RelayerRegistry_RelayerSlashed_createMockEvent: (args:RelayerRegistry_RelayerSlashed_createMockArgs) => Types_RelayerRegistry_RelayerSlashed_event = TestHelpersJS.RelayerRegistry.RelayerSlashed.createMockEvent as any;

export const RelayerRegistry_RelayerUnregistered_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerUnregistered_event> = TestHelpersJS.RelayerRegistry.RelayerUnregistered.processEvent as any;

export const RelayerRegistry_RelayerUnregistered_createMockEvent: (args:RelayerRegistry_RelayerUnregistered_createMockArgs) => Types_RelayerRegistry_RelayerUnregistered_event = TestHelpersJS.RelayerRegistry.RelayerUnregistered.createMockEvent as any;

export const RelayerRegistry_SlashingParametersUpdated_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_SlashingParametersUpdated_event> = TestHelpersJS.RelayerRegistry.SlashingParametersUpdated.processEvent as any;

export const RelayerRegistry_SlashingParametersUpdated_createMockEvent: (args:RelayerRegistry_SlashingParametersUpdated_createMockArgs) => Types_RelayerRegistry_SlashingParametersUpdated_event = TestHelpersJS.RelayerRegistry.SlashingParametersUpdated.createMockEvent as any;

export const RelayerRegistry_WithdrawalRequested_processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_WithdrawalRequested_event> = TestHelpersJS.RelayerRegistry.WithdrawalRequested.processEvent as any;

export const RelayerRegistry_WithdrawalRequested_createMockEvent: (args:RelayerRegistry_WithdrawalRequested_createMockArgs) => Types_RelayerRegistry_WithdrawalRequested_event = TestHelpersJS.RelayerRegistry.WithdrawalRequested.createMockEvent as any;

export const SubscriptionManager_CrossChainPaymentInitiated_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_CrossChainPaymentInitiated_event> = TestHelpersJS.SubscriptionManager.CrossChainPaymentInitiated.processEvent as any;

export const SubscriptionManager_CrossChainPaymentInitiated_createMockEvent: (args:SubscriptionManager_CrossChainPaymentInitiated_createMockArgs) => Types_SubscriptionManager_CrossChainPaymentInitiated_event = TestHelpersJS.SubscriptionManager.CrossChainPaymentInitiated.createMockEvent as any;

export const SubscriptionManager_NexusAttestationSubmitted_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_NexusAttestationSubmitted_event> = TestHelpersJS.SubscriptionManager.NexusAttestationSubmitted.processEvent as any;

export const SubscriptionManager_NexusAttestationSubmitted_createMockEvent: (args:SubscriptionManager_NexusAttestationSubmitted_createMockArgs) => Types_SubscriptionManager_NexusAttestationSubmitted_event = TestHelpersJS.SubscriptionManager.NexusAttestationSubmitted.createMockEvent as any;

export const SubscriptionManager_NexusAttestationVerified_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_NexusAttestationVerified_event> = TestHelpersJS.SubscriptionManager.NexusAttestationVerified.processEvent as any;

export const SubscriptionManager_NexusAttestationVerified_createMockEvent: (args:SubscriptionManager_NexusAttestationVerified_createMockArgs) => Types_SubscriptionManager_NexusAttestationVerified_event = TestHelpersJS.SubscriptionManager.NexusAttestationVerified.createMockEvent as any;

export const SubscriptionManager_OwnershipTransferred_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_OwnershipTransferred_event> = TestHelpersJS.SubscriptionManager.OwnershipTransferred.processEvent as any;

export const SubscriptionManager_OwnershipTransferred_createMockEvent: (args:SubscriptionManager_OwnershipTransferred_createMockArgs) => Types_SubscriptionManager_OwnershipTransferred_event = TestHelpersJS.SubscriptionManager.OwnershipTransferred.createMockEvent as any;

export const SubscriptionManager_PaymentExecuted_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_PaymentExecuted_event> = TestHelpersJS.SubscriptionManager.PaymentExecuted.processEvent as any;

export const SubscriptionManager_PaymentExecuted_createMockEvent: (args:SubscriptionManager_PaymentExecuted_createMockArgs) => Types_SubscriptionManager_PaymentExecuted_event = TestHelpersJS.SubscriptionManager.PaymentExecuted.createMockEvent as any;

export const SubscriptionManager_PaymentFailed_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_PaymentFailed_event> = TestHelpersJS.SubscriptionManager.PaymentFailed.processEvent as any;

export const SubscriptionManager_PaymentFailed_createMockEvent: (args:SubscriptionManager_PaymentFailed_createMockArgs) => Types_SubscriptionManager_PaymentFailed_event = TestHelpersJS.SubscriptionManager.PaymentFailed.createMockEvent as any;

export const SubscriptionManager_SubscriptionCancelled_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionCancelled_event> = TestHelpersJS.SubscriptionManager.SubscriptionCancelled.processEvent as any;

export const SubscriptionManager_SubscriptionCancelled_createMockEvent: (args:SubscriptionManager_SubscriptionCancelled_createMockArgs) => Types_SubscriptionManager_SubscriptionCancelled_event = TestHelpersJS.SubscriptionManager.SubscriptionCancelled.createMockEvent as any;

export const SubscriptionManager_SubscriptionCreated_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionCreated_event> = TestHelpersJS.SubscriptionManager.SubscriptionCreated.processEvent as any;

export const SubscriptionManager_SubscriptionCreated_createMockEvent: (args:SubscriptionManager_SubscriptionCreated_createMockArgs) => Types_SubscriptionManager_SubscriptionCreated_event = TestHelpersJS.SubscriptionManager.SubscriptionCreated.createMockEvent as any;

export const SubscriptionManager_SubscriptionPaused_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionPaused_event> = TestHelpersJS.SubscriptionManager.SubscriptionPaused.processEvent as any;

export const SubscriptionManager_SubscriptionPaused_createMockEvent: (args:SubscriptionManager_SubscriptionPaused_createMockArgs) => Types_SubscriptionManager_SubscriptionPaused_event = TestHelpersJS.SubscriptionManager.SubscriptionPaused.createMockEvent as any;

export const SubscriptionManager_SubscriptionResumed_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionResumed_event> = TestHelpersJS.SubscriptionManager.SubscriptionResumed.processEvent as any;

export const SubscriptionManager_SubscriptionResumed_createMockEvent: (args:SubscriptionManager_SubscriptionResumed_createMockArgs) => Types_SubscriptionManager_SubscriptionResumed_event = TestHelpersJS.SubscriptionManager.SubscriptionResumed.createMockEvent as any;

export const SubscriptionManager_TokenAdded_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_TokenAdded_event> = TestHelpersJS.SubscriptionManager.TokenAdded.processEvent as any;

export const SubscriptionManager_TokenAdded_createMockEvent: (args:SubscriptionManager_TokenAdded_createMockArgs) => Types_SubscriptionManager_TokenAdded_event = TestHelpersJS.SubscriptionManager.TokenAdded.createMockEvent as any;

export const SubscriptionManager_TokenRemoved_processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_TokenRemoved_event> = TestHelpersJS.SubscriptionManager.TokenRemoved.processEvent as any;

export const SubscriptionManager_TokenRemoved_createMockEvent: (args:SubscriptionManager_TokenRemoved_createMockArgs) => Types_SubscriptionManager_TokenRemoved_event = TestHelpersJS.SubscriptionManager.TokenRemoved.createMockEvent as any;

export const Addresses: { mockAddresses: Address_t[]; defaultAddress: Address_t } = TestHelpersJS.Addresses as any;

export const SubscriptionManager: {
  CrossChainPaymentInitiated: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_CrossChainPaymentInitiated_event>; 
    createMockEvent: (args:SubscriptionManager_CrossChainPaymentInitiated_createMockArgs) => Types_SubscriptionManager_CrossChainPaymentInitiated_event
  }; 
  OwnershipTransferred: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_OwnershipTransferred_event>; 
    createMockEvent: (args:SubscriptionManager_OwnershipTransferred_createMockArgs) => Types_SubscriptionManager_OwnershipTransferred_event
  }; 
  TokenRemoved: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_TokenRemoved_event>; 
    createMockEvent: (args:SubscriptionManager_TokenRemoved_createMockArgs) => Types_SubscriptionManager_TokenRemoved_event
  }; 
  NexusAttestationSubmitted: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_NexusAttestationSubmitted_event>; 
    createMockEvent: (args:SubscriptionManager_NexusAttestationSubmitted_createMockArgs) => Types_SubscriptionManager_NexusAttestationSubmitted_event
  }; 
  SubscriptionResumed: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionResumed_event>; 
    createMockEvent: (args:SubscriptionManager_SubscriptionResumed_createMockArgs) => Types_SubscriptionManager_SubscriptionResumed_event
  }; 
  TokenAdded: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_TokenAdded_event>; 
    createMockEvent: (args:SubscriptionManager_TokenAdded_createMockArgs) => Types_SubscriptionManager_TokenAdded_event
  }; 
  PaymentExecuted: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_PaymentExecuted_event>; 
    createMockEvent: (args:SubscriptionManager_PaymentExecuted_createMockArgs) => Types_SubscriptionManager_PaymentExecuted_event
  }; 
  PaymentFailed: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_PaymentFailed_event>; 
    createMockEvent: (args:SubscriptionManager_PaymentFailed_createMockArgs) => Types_SubscriptionManager_PaymentFailed_event
  }; 
  NexusAttestationVerified: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_NexusAttestationVerified_event>; 
    createMockEvent: (args:SubscriptionManager_NexusAttestationVerified_createMockArgs) => Types_SubscriptionManager_NexusAttestationVerified_event
  }; 
  SubscriptionCreated: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionCreated_event>; 
    createMockEvent: (args:SubscriptionManager_SubscriptionCreated_createMockArgs) => Types_SubscriptionManager_SubscriptionCreated_event
  }; 
  SubscriptionCancelled: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionCancelled_event>; 
    createMockEvent: (args:SubscriptionManager_SubscriptionCancelled_createMockArgs) => Types_SubscriptionManager_SubscriptionCancelled_event
  }; 
  SubscriptionPaused: {
    processEvent: EventFunctions_eventProcessor<Types_SubscriptionManager_SubscriptionPaused_event>; 
    createMockEvent: (args:SubscriptionManager_SubscriptionPaused_createMockArgs) => Types_SubscriptionManager_SubscriptionPaused_event
  }
} = TestHelpersJS.SubscriptionManager as any;

export const RelayerRegistry: {
  WithdrawalRequested: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_WithdrawalRequested_event>; 
    createMockEvent: (args:RelayerRegistry_WithdrawalRequested_createMockArgs) => Types_RelayerRegistry_WithdrawalRequested_event
  }; 
  OwnershipTransferred: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_OwnershipTransferred_event>; 
    createMockEvent: (args:RelayerRegistry_OwnershipTransferred_createMockArgs) => Types_RelayerRegistry_OwnershipTransferred_event
  }; 
  ExecutionRecorded: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_ExecutionRecorded_event>; 
    createMockEvent: (args:RelayerRegistry_ExecutionRecorded_createMockArgs) => Types_RelayerRegistry_ExecutionRecorded_event
  }; 
  RelayerRegistered: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerRegistered_event>; 
    createMockEvent: (args:RelayerRegistry_RelayerRegistered_createMockArgs) => Types_RelayerRegistry_RelayerRegistered_event
  }; 
  RelayerRestaked: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerRestaked_event>; 
    createMockEvent: (args:RelayerRegistry_RelayerRestaked_createMockArgs) => Types_RelayerRegistry_RelayerRestaked_event
  }; 
  RelayerSlashed: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerSlashed_event>; 
    createMockEvent: (args:RelayerRegistry_RelayerSlashed_createMockArgs) => Types_RelayerRegistry_RelayerSlashed_event
  }; 
  RelayerUnregistered: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_RelayerUnregistered_event>; 
    createMockEvent: (args:RelayerRegistry_RelayerUnregistered_createMockArgs) => Types_RelayerRegistry_RelayerUnregistered_event
  }; 
  SlashingParametersUpdated: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_SlashingParametersUpdated_event>; 
    createMockEvent: (args:RelayerRegistry_SlashingParametersUpdated_createMockArgs) => Types_RelayerRegistry_SlashingParametersUpdated_event
  }; 
  EmergencySlash: {
    processEvent: EventFunctions_eventProcessor<Types_RelayerRegistry_EmergencySlash_event>; 
    createMockEvent: (args:RelayerRegistry_EmergencySlash_createMockArgs) => Types_RelayerRegistry_EmergencySlash_event
  }
} = TestHelpersJS.RelayerRegistry as any;

export const MockDb: { createMockDb: () => TestHelpers_MockDb_t } = TestHelpersJS.MockDb as any;
