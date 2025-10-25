/* TypeScript file generated from TestHelpers_MockDb.res by genType. */

/* eslint-disable */
/* tslint:disable */

const TestHelpers_MockDbJS = require('./TestHelpers_MockDb.res.js');

import type {CrossChainAttestation_t as Entities_CrossChainAttestation_t} from '../src/db/Entities.gen';

import type {DynamicContractRegistry_t as InternalTable_DynamicContractRegistry_t} from 'envio/src/db/InternalTable.gen';

import type {IndexerMeta_t as Entities_IndexerMeta_t} from '../src/db/Entities.gen';

import type {Intent_t as Entities_Intent_t} from '../src/db/Entities.gen';

import type {MerchantPerformance_t as Entities_MerchantPerformance_t} from '../src/db/Entities.gen';

import type {MerchantTokenStats_t as Entities_MerchantTokenStats_t} from '../src/db/Entities.gen';

import type {Payment_t as Entities_Payment_t} from '../src/db/Entities.gen';

import type {RawEvents_t as InternalTable_RawEvents_t} from 'envio/src/db/InternalTable.gen';

import type {RelayerPerformance_t as Entities_RelayerPerformance_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_EmergencySlash_t as Entities_RelayerRegistry_EmergencySlash_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_ExecutionRecorded_t as Entities_RelayerRegistry_ExecutionRecorded_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_OwnershipTransferred_t as Entities_RelayerRegistry_OwnershipTransferred_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_RelayerRegistered_t as Entities_RelayerRegistry_RelayerRegistered_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_RelayerRestaked_t as Entities_RelayerRegistry_RelayerRestaked_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_RelayerSlashed_t as Entities_RelayerRegistry_RelayerSlashed_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_RelayerUnregistered_t as Entities_RelayerRegistry_RelayerUnregistered_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_SlashingParametersUpdated_t as Entities_RelayerRegistry_SlashingParametersUpdated_t} from '../src/db/Entities.gen';

import type {RelayerRegistry_WithdrawalRequested_t as Entities_RelayerRegistry_WithdrawalRequested_t} from '../src/db/Entities.gen';

import type {SubscriberStats_t as Entities_SubscriberStats_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_CrossChainPaymentInitiated_t as Entities_SubscribtionManager_CrossChainPaymentInitiated_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_NexusAttestationSubmitted_t as Entities_SubscribtionManager_NexusAttestationSubmitted_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_NexusAttestationVerified_t as Entities_SubscribtionManager_NexusAttestationVerified_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_OwnershipTransferred_t as Entities_SubscribtionManager_OwnershipTransferred_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_PaymentExecuted_t as Entities_SubscribtionManager_PaymentExecuted_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_PaymentFailed_t as Entities_SubscribtionManager_PaymentFailed_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_SubscriptionCancelled_t as Entities_SubscribtionManager_SubscriptionCancelled_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_SubscriptionCreated_t as Entities_SubscribtionManager_SubscriptionCreated_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_SubscriptionPaused_t as Entities_SubscribtionManager_SubscriptionPaused_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_SubscriptionResumed_t as Entities_SubscribtionManager_SubscriptionResumed_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_TokenAdded_t as Entities_SubscribtionManager_TokenAdded_t} from '../src/db/Entities.gen';

import type {SubscribtionManager_TokenRemoved_t as Entities_SubscribtionManager_TokenRemoved_t} from '../src/db/Entities.gen';

import type {Subscription_t as Entities_Subscription_t} from '../src/db/Entities.gen';

import type {eventLog as Types_eventLog} from './Types.gen';

import type {rawEventsKey as InMemoryStore_rawEventsKey} from './InMemoryStore.gen';

/** The mockDb type is simply an InMemoryStore internally. __dbInternal__ holds a reference
to an inMemoryStore and all the the accessor methods point to the reference of that inMemory
store */
export abstract class inMemoryStore { protected opaque!: any }; /* simulate opaque types */

export type t = {
  readonly __dbInternal__: inMemoryStore; 
  readonly entities: entities; 
  readonly rawEvents: storeOperations<InMemoryStore_rawEventsKey,InternalTable_RawEvents_t>; 
  readonly dynamicContractRegistry: entityStoreOperations<InternalTable_DynamicContractRegistry_t>; 
  readonly processEvents: (_1:Types_eventLog<unknown>[]) => Promise<t>
};

export type entities = {
  readonly CrossChainAttestation: entityStoreOperations<Entities_CrossChainAttestation_t>; 
  readonly IndexerMeta: entityStoreOperations<Entities_IndexerMeta_t>; 
  readonly Intent: entityStoreOperations<Entities_Intent_t>; 
  readonly MerchantPerformance: entityStoreOperations<Entities_MerchantPerformance_t>; 
  readonly MerchantTokenStats: entityStoreOperations<Entities_MerchantTokenStats_t>; 
  readonly Payment: entityStoreOperations<Entities_Payment_t>; 
  readonly RelayerPerformance: entityStoreOperations<Entities_RelayerPerformance_t>; 
  readonly RelayerRegistry_EmergencySlash: entityStoreOperations<Entities_RelayerRegistry_EmergencySlash_t>; 
  readonly RelayerRegistry_ExecutionRecorded: entityStoreOperations<Entities_RelayerRegistry_ExecutionRecorded_t>; 
  readonly RelayerRegistry_OwnershipTransferred: entityStoreOperations<Entities_RelayerRegistry_OwnershipTransferred_t>; 
  readonly RelayerRegistry_RelayerRegistered: entityStoreOperations<Entities_RelayerRegistry_RelayerRegistered_t>; 
  readonly RelayerRegistry_RelayerRestaked: entityStoreOperations<Entities_RelayerRegistry_RelayerRestaked_t>; 
  readonly RelayerRegistry_RelayerSlashed: entityStoreOperations<Entities_RelayerRegistry_RelayerSlashed_t>; 
  readonly RelayerRegistry_RelayerUnregistered: entityStoreOperations<Entities_RelayerRegistry_RelayerUnregistered_t>; 
  readonly RelayerRegistry_SlashingParametersUpdated: entityStoreOperations<Entities_RelayerRegistry_SlashingParametersUpdated_t>; 
  readonly RelayerRegistry_WithdrawalRequested: entityStoreOperations<Entities_RelayerRegistry_WithdrawalRequested_t>; 
  readonly SubscriberStats: entityStoreOperations<Entities_SubscriberStats_t>; 
  readonly SubscribtionManager_CrossChainPaymentInitiated: entityStoreOperations<Entities_SubscribtionManager_CrossChainPaymentInitiated_t>; 
  readonly SubscribtionManager_NexusAttestationSubmitted: entityStoreOperations<Entities_SubscribtionManager_NexusAttestationSubmitted_t>; 
  readonly SubscribtionManager_NexusAttestationVerified: entityStoreOperations<Entities_SubscribtionManager_NexusAttestationVerified_t>; 
  readonly SubscribtionManager_OwnershipTransferred: entityStoreOperations<Entities_SubscribtionManager_OwnershipTransferred_t>; 
  readonly SubscribtionManager_PaymentExecuted: entityStoreOperations<Entities_SubscribtionManager_PaymentExecuted_t>; 
  readonly SubscribtionManager_PaymentFailed: entityStoreOperations<Entities_SubscribtionManager_PaymentFailed_t>; 
  readonly SubscribtionManager_SubscriptionCancelled: entityStoreOperations<Entities_SubscribtionManager_SubscriptionCancelled_t>; 
  readonly SubscribtionManager_SubscriptionCreated: entityStoreOperations<Entities_SubscribtionManager_SubscriptionCreated_t>; 
  readonly SubscribtionManager_SubscriptionPaused: entityStoreOperations<Entities_SubscribtionManager_SubscriptionPaused_t>; 
  readonly SubscribtionManager_SubscriptionResumed: entityStoreOperations<Entities_SubscribtionManager_SubscriptionResumed_t>; 
  readonly SubscribtionManager_TokenAdded: entityStoreOperations<Entities_SubscribtionManager_TokenAdded_t>; 
  readonly SubscribtionManager_TokenRemoved: entityStoreOperations<Entities_SubscribtionManager_TokenRemoved_t>; 
  readonly Subscription: entityStoreOperations<Entities_Subscription_t>
};

export type entityStoreOperations<entity> = storeOperations<string,entity>;

export type storeOperations<entityKey,entity> = {
  readonly getAll: () => entity[]; 
  readonly get: (_1:entityKey) => (undefined | entity); 
  readonly set: (_1:entity) => t; 
  readonly delete: (_1:entityKey) => t
};

/** The constructor function for a mockDb. Call it and then set up the inital state by calling
any of the set functions it provides access to. A mockDb will be passed into a processEvent 
helper. Note, process event helpers will not mutate the mockDb but return a new mockDb with
new state so you can compare states before and after. */
export const createMockDb: () => t = TestHelpers_MockDbJS.createMockDb as any;
