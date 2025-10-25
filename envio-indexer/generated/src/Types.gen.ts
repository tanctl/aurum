/* TypeScript file generated from Types.res by genType. */

/* eslint-disable */
/* tslint:disable */

import type {CrossChainAttestation_t as Entities_CrossChainAttestation_t} from '../src/db/Entities.gen';

import type {HandlerContext as $$handlerContext} from './Types.ts';

import type {HandlerWithOptions as $$fnWithEventConfig} from './bindings/OpaqueTypes.ts';

import type {IndexerMeta_t as Entities_IndexerMeta_t} from '../src/db/Entities.gen';

import type {Intent_t as Entities_Intent_t} from '../src/db/Entities.gen';

import type {MerchantPerformance_t as Entities_MerchantPerformance_t} from '../src/db/Entities.gen';

import type {MerchantTokenStats_t as Entities_MerchantTokenStats_t} from '../src/db/Entities.gen';

import type {Payment_t as Entities_Payment_t} from '../src/db/Entities.gen';

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

import type {SingleOrMultiple as $$SingleOrMultiple_t} from './bindings/OpaqueTypes';

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

import type {eventOptions as Internal_eventOptions} from 'envio/src/Internal.gen';

import type {genericContractRegisterArgs as Internal_genericContractRegisterArgs} from 'envio/src/Internal.gen';

import type {genericContractRegister as Internal_genericContractRegister} from 'envio/src/Internal.gen';

import type {genericEvent as Internal_genericEvent} from 'envio/src/Internal.gen';

import type {genericHandlerArgs as Internal_genericHandlerArgs} from 'envio/src/Internal.gen';

import type {genericHandler as Internal_genericHandler} from 'envio/src/Internal.gen';

import type {logger as Envio_logger} from 'envio/src/Envio.gen';

import type {noEventFilters as Internal_noEventFilters} from 'envio/src/Internal.gen';

import type {t as Address_t} from 'envio/src/Address.gen';

export type id = string;
export type Id = id;

export type contractRegistrations = {
  readonly log: Envio_logger; 
  readonly addRelayerRegistry: (_1:Address_t) => void; 
  readonly addSubscriptionManager: (_1:Address_t) => void
};

export type entityHandlerContext<entity,indexedFieldOperations> = {
  readonly get: (_1:id) => Promise<(undefined | entity)>; 
  readonly getOrThrow: (_1:id, message:(undefined | string)) => Promise<entity>; 
  readonly getWhere: indexedFieldOperations; 
  readonly getOrCreate: (_1:entity) => Promise<entity>; 
  readonly set: (_1:entity) => void; 
  readonly deleteUnsafe: (_1:id) => void
};

export type handlerContext = $$handlerContext;

export type crossChainAttestation = Entities_CrossChainAttestation_t;
export type CrossChainAttestation = crossChainAttestation;

export type indexerMeta = Entities_IndexerMeta_t;
export type IndexerMeta = indexerMeta;

export type intent = Entities_Intent_t;
export type Intent = intent;

export type merchantPerformance = Entities_MerchantPerformance_t;
export type MerchantPerformance = merchantPerformance;

export type merchantTokenStats = Entities_MerchantTokenStats_t;
export type MerchantTokenStats = merchantTokenStats;

export type payment = Entities_Payment_t;
export type Payment = payment;

export type relayerPerformance = Entities_RelayerPerformance_t;
export type RelayerPerformance = relayerPerformance;

export type relayerRegistry_EmergencySlash = Entities_RelayerRegistry_EmergencySlash_t;
export type RelayerRegistry_EmergencySlash = relayerRegistry_EmergencySlash;

export type relayerRegistry_ExecutionRecorded = Entities_RelayerRegistry_ExecutionRecorded_t;
export type RelayerRegistry_ExecutionRecorded = relayerRegistry_ExecutionRecorded;

export type relayerRegistry_OwnershipTransferred = Entities_RelayerRegistry_OwnershipTransferred_t;
export type RelayerRegistry_OwnershipTransferred = relayerRegistry_OwnershipTransferred;

export type relayerRegistry_RelayerRegistered = Entities_RelayerRegistry_RelayerRegistered_t;
export type RelayerRegistry_RelayerRegistered = relayerRegistry_RelayerRegistered;

export type relayerRegistry_RelayerRestaked = Entities_RelayerRegistry_RelayerRestaked_t;
export type RelayerRegistry_RelayerRestaked = relayerRegistry_RelayerRestaked;

export type relayerRegistry_RelayerSlashed = Entities_RelayerRegistry_RelayerSlashed_t;
export type RelayerRegistry_RelayerSlashed = relayerRegistry_RelayerSlashed;

export type relayerRegistry_RelayerUnregistered = Entities_RelayerRegistry_RelayerUnregistered_t;
export type RelayerRegistry_RelayerUnregistered = relayerRegistry_RelayerUnregistered;

export type relayerRegistry_SlashingParametersUpdated = Entities_RelayerRegistry_SlashingParametersUpdated_t;
export type RelayerRegistry_SlashingParametersUpdated = relayerRegistry_SlashingParametersUpdated;

export type relayerRegistry_WithdrawalRequested = Entities_RelayerRegistry_WithdrawalRequested_t;
export type RelayerRegistry_WithdrawalRequested = relayerRegistry_WithdrawalRequested;

export type subscriberStats = Entities_SubscriberStats_t;
export type SubscriberStats = subscriberStats;

export type subscribtionManager_CrossChainPaymentInitiated = Entities_SubscribtionManager_CrossChainPaymentInitiated_t;
export type SubscribtionManager_CrossChainPaymentInitiated = subscribtionManager_CrossChainPaymentInitiated;

export type subscribtionManager_NexusAttestationSubmitted = Entities_SubscribtionManager_NexusAttestationSubmitted_t;
export type SubscribtionManager_NexusAttestationSubmitted = subscribtionManager_NexusAttestationSubmitted;

export type subscribtionManager_NexusAttestationVerified = Entities_SubscribtionManager_NexusAttestationVerified_t;
export type SubscribtionManager_NexusAttestationVerified = subscribtionManager_NexusAttestationVerified;

export type subscribtionManager_OwnershipTransferred = Entities_SubscribtionManager_OwnershipTransferred_t;
export type SubscribtionManager_OwnershipTransferred = subscribtionManager_OwnershipTransferred;

export type subscribtionManager_PaymentExecuted = Entities_SubscribtionManager_PaymentExecuted_t;
export type SubscribtionManager_PaymentExecuted = subscribtionManager_PaymentExecuted;

export type subscribtionManager_PaymentFailed = Entities_SubscribtionManager_PaymentFailed_t;
export type SubscribtionManager_PaymentFailed = subscribtionManager_PaymentFailed;

export type subscribtionManager_SubscriptionCancelled = Entities_SubscribtionManager_SubscriptionCancelled_t;
export type SubscribtionManager_SubscriptionCancelled = subscribtionManager_SubscriptionCancelled;

export type subscribtionManager_SubscriptionCreated = Entities_SubscribtionManager_SubscriptionCreated_t;
export type SubscribtionManager_SubscriptionCreated = subscribtionManager_SubscriptionCreated;

export type subscribtionManager_SubscriptionPaused = Entities_SubscribtionManager_SubscriptionPaused_t;
export type SubscribtionManager_SubscriptionPaused = subscribtionManager_SubscriptionPaused;

export type subscribtionManager_SubscriptionResumed = Entities_SubscribtionManager_SubscriptionResumed_t;
export type SubscribtionManager_SubscriptionResumed = subscribtionManager_SubscriptionResumed;

export type subscribtionManager_TokenAdded = Entities_SubscribtionManager_TokenAdded_t;
export type SubscribtionManager_TokenAdded = subscribtionManager_TokenAdded;

export type subscribtionManager_TokenRemoved = Entities_SubscribtionManager_TokenRemoved_t;
export type SubscribtionManager_TokenRemoved = subscribtionManager_TokenRemoved;

export type subscription = Entities_Subscription_t;
export type Subscription = subscription;

export type eventIdentifier = {
  readonly chainId: number; 
  readonly blockTimestamp: number; 
  readonly blockNumber: number; 
  readonly logIndex: number
};

export type entityUpdateAction<entityType> = "Delete" | { TAG: "Set"; _0: entityType };

export type entityUpdate<entityType> = {
  readonly eventIdentifier: eventIdentifier; 
  readonly entityId: id; 
  readonly entityUpdateAction: entityUpdateAction<entityType>
};

export type entityValueAtStartOfBatch<entityType> = 
    "NotSet"
  | { TAG: "AlreadySet"; _0: entityType };

export type updatedValue<entityType> = {
  readonly latest: entityUpdate<entityType>; 
  readonly history: entityUpdate<entityType>[]; 
  readonly containsRollbackDiffChange: boolean
};

export type inMemoryStoreRowEntity<entityType> = 
    { TAG: "Updated"; _0: updatedValue<entityType> }
  | { TAG: "InitialReadFromDb"; _0: entityValueAtStartOfBatch<entityType> };

export type Transaction_t = {};

export type Block_t = {
  readonly number: number; 
  readonly timestamp: number; 
  readonly hash: string
};

export type AggregatedBlock_t = {
  readonly hash: string; 
  readonly number: number; 
  readonly timestamp: number
};

export type AggregatedTransaction_t = {};

export type eventLog<params> = Internal_genericEvent<params,Block_t,Transaction_t>;
export type EventLog<params> = eventLog<params>;

export type SingleOrMultiple_t<a> = $$SingleOrMultiple_t<a>;

export type HandlerTypes_args<eventArgs,context> = { readonly event: eventLog<eventArgs>; readonly context: context };

export type HandlerTypes_contractRegisterArgs<eventArgs> = Internal_genericContractRegisterArgs<eventLog<eventArgs>,contractRegistrations>;

export type HandlerTypes_contractRegister<eventArgs> = Internal_genericContractRegister<HandlerTypes_contractRegisterArgs<eventArgs>>;

export type HandlerTypes_eventConfig<eventFilters> = Internal_eventOptions<eventFilters>;

export type fnWithEventConfig<fn,eventConfig> = $$fnWithEventConfig<fn,eventConfig>;

export type contractRegisterWithOptions<eventArgs,eventFilters> = fnWithEventConfig<HandlerTypes_contractRegister<eventArgs>,HandlerTypes_eventConfig<eventFilters>>;

export type RelayerRegistry_chainId = 84532 | 11155111;

export type RelayerRegistry_EmergencySlash_eventArgs = {
  readonly relayer: Address_t; 
  readonly amount: bigint; 
  readonly reason: string
};

export type RelayerRegistry_EmergencySlash_block = Block_t;

export type RelayerRegistry_EmergencySlash_transaction = Transaction_t;

export type RelayerRegistry_EmergencySlash_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_EmergencySlash_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_EmergencySlash_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_EmergencySlash_block
};

export type RelayerRegistry_EmergencySlash_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_EmergencySlash_event,handlerContext,void>;

export type RelayerRegistry_EmergencySlash_handler = Internal_genericHandler<RelayerRegistry_EmergencySlash_handlerArgs>;

export type RelayerRegistry_EmergencySlash_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_EmergencySlash_event,contractRegistrations>>;

export type RelayerRegistry_EmergencySlash_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_EmergencySlash_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_EmergencySlash_eventFiltersDefinition = 
    RelayerRegistry_EmergencySlash_eventFilter
  | RelayerRegistry_EmergencySlash_eventFilter[];

export type RelayerRegistry_EmergencySlash_eventFilters = 
    RelayerRegistry_EmergencySlash_eventFilter
  | RelayerRegistry_EmergencySlash_eventFilter[]
  | ((_1:RelayerRegistry_EmergencySlash_eventFiltersArgs) => RelayerRegistry_EmergencySlash_eventFiltersDefinition);

export type RelayerRegistry_ExecutionRecorded_eventArgs = {
  readonly relayer: Address_t; 
  readonly success: boolean; 
  readonly feeAmount: bigint
};

export type RelayerRegistry_ExecutionRecorded_block = Block_t;

export type RelayerRegistry_ExecutionRecorded_transaction = Transaction_t;

export type RelayerRegistry_ExecutionRecorded_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_ExecutionRecorded_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_ExecutionRecorded_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_ExecutionRecorded_block
};

export type RelayerRegistry_ExecutionRecorded_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_ExecutionRecorded_event,handlerContext,void>;

export type RelayerRegistry_ExecutionRecorded_handler = Internal_genericHandler<RelayerRegistry_ExecutionRecorded_handlerArgs>;

export type RelayerRegistry_ExecutionRecorded_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_ExecutionRecorded_event,contractRegistrations>>;

export type RelayerRegistry_ExecutionRecorded_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_ExecutionRecorded_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_ExecutionRecorded_eventFiltersDefinition = 
    RelayerRegistry_ExecutionRecorded_eventFilter
  | RelayerRegistry_ExecutionRecorded_eventFilter[];

export type RelayerRegistry_ExecutionRecorded_eventFilters = 
    RelayerRegistry_ExecutionRecorded_eventFilter
  | RelayerRegistry_ExecutionRecorded_eventFilter[]
  | ((_1:RelayerRegistry_ExecutionRecorded_eventFiltersArgs) => RelayerRegistry_ExecutionRecorded_eventFiltersDefinition);

export type RelayerRegistry_OwnershipTransferred_eventArgs = { readonly previousOwner: Address_t; readonly newOwner: Address_t };

export type RelayerRegistry_OwnershipTransferred_block = Block_t;

export type RelayerRegistry_OwnershipTransferred_transaction = Transaction_t;

export type RelayerRegistry_OwnershipTransferred_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_OwnershipTransferred_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_OwnershipTransferred_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_OwnershipTransferred_block
};

export type RelayerRegistry_OwnershipTransferred_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_OwnershipTransferred_event,handlerContext,void>;

export type RelayerRegistry_OwnershipTransferred_handler = Internal_genericHandler<RelayerRegistry_OwnershipTransferred_handlerArgs>;

export type RelayerRegistry_OwnershipTransferred_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_OwnershipTransferred_event,contractRegistrations>>;

export type RelayerRegistry_OwnershipTransferred_eventFilter = { readonly previousOwner?: SingleOrMultiple_t<Address_t>; readonly newOwner?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_OwnershipTransferred_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_OwnershipTransferred_eventFiltersDefinition = 
    RelayerRegistry_OwnershipTransferred_eventFilter
  | RelayerRegistry_OwnershipTransferred_eventFilter[];

export type RelayerRegistry_OwnershipTransferred_eventFilters = 
    RelayerRegistry_OwnershipTransferred_eventFilter
  | RelayerRegistry_OwnershipTransferred_eventFilter[]
  | ((_1:RelayerRegistry_OwnershipTransferred_eventFiltersArgs) => RelayerRegistry_OwnershipTransferred_eventFiltersDefinition);

export type RelayerRegistry_RelayerRegistered_eventArgs = { readonly relayer: Address_t; readonly stakedAmount: bigint };

export type RelayerRegistry_RelayerRegistered_block = Block_t;

export type RelayerRegistry_RelayerRegistered_transaction = Transaction_t;

export type RelayerRegistry_RelayerRegistered_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_RelayerRegistered_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_RelayerRegistered_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_RelayerRegistered_block
};

export type RelayerRegistry_RelayerRegistered_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_RelayerRegistered_event,handlerContext,void>;

export type RelayerRegistry_RelayerRegistered_handler = Internal_genericHandler<RelayerRegistry_RelayerRegistered_handlerArgs>;

export type RelayerRegistry_RelayerRegistered_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_RelayerRegistered_event,contractRegistrations>>;

export type RelayerRegistry_RelayerRegistered_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_RelayerRegistered_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_RelayerRegistered_eventFiltersDefinition = 
    RelayerRegistry_RelayerRegistered_eventFilter
  | RelayerRegistry_RelayerRegistered_eventFilter[];

export type RelayerRegistry_RelayerRegistered_eventFilters = 
    RelayerRegistry_RelayerRegistered_eventFilter
  | RelayerRegistry_RelayerRegistered_eventFilter[]
  | ((_1:RelayerRegistry_RelayerRegistered_eventFiltersArgs) => RelayerRegistry_RelayerRegistered_eventFiltersDefinition);

export type RelayerRegistry_RelayerRestaked_eventArgs = {
  readonly relayer: Address_t; 
  readonly amount: bigint; 
  readonly newStake: bigint
};

export type RelayerRegistry_RelayerRestaked_block = Block_t;

export type RelayerRegistry_RelayerRestaked_transaction = Transaction_t;

export type RelayerRegistry_RelayerRestaked_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_RelayerRestaked_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_RelayerRestaked_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_RelayerRestaked_block
};

export type RelayerRegistry_RelayerRestaked_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_RelayerRestaked_event,handlerContext,void>;

export type RelayerRegistry_RelayerRestaked_handler = Internal_genericHandler<RelayerRegistry_RelayerRestaked_handlerArgs>;

export type RelayerRegistry_RelayerRestaked_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_RelayerRestaked_event,contractRegistrations>>;

export type RelayerRegistry_RelayerRestaked_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_RelayerRestaked_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_RelayerRestaked_eventFiltersDefinition = 
    RelayerRegistry_RelayerRestaked_eventFilter
  | RelayerRegistry_RelayerRestaked_eventFilter[];

export type RelayerRegistry_RelayerRestaked_eventFilters = 
    RelayerRegistry_RelayerRestaked_eventFilter
  | RelayerRegistry_RelayerRestaked_eventFilter[]
  | ((_1:RelayerRegistry_RelayerRestaked_eventFiltersArgs) => RelayerRegistry_RelayerRestaked_eventFiltersDefinition);

export type RelayerRegistry_RelayerSlashed_eventArgs = {
  readonly relayer: Address_t; 
  readonly slashAmount: bigint; 
  readonly remainingStake: bigint
};

export type RelayerRegistry_RelayerSlashed_block = Block_t;

export type RelayerRegistry_RelayerSlashed_transaction = Transaction_t;

export type RelayerRegistry_RelayerSlashed_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_RelayerSlashed_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_RelayerSlashed_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_RelayerSlashed_block
};

export type RelayerRegistry_RelayerSlashed_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_RelayerSlashed_event,handlerContext,void>;

export type RelayerRegistry_RelayerSlashed_handler = Internal_genericHandler<RelayerRegistry_RelayerSlashed_handlerArgs>;

export type RelayerRegistry_RelayerSlashed_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_RelayerSlashed_event,contractRegistrations>>;

export type RelayerRegistry_RelayerSlashed_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_RelayerSlashed_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_RelayerSlashed_eventFiltersDefinition = 
    RelayerRegistry_RelayerSlashed_eventFilter
  | RelayerRegistry_RelayerSlashed_eventFilter[];

export type RelayerRegistry_RelayerSlashed_eventFilters = 
    RelayerRegistry_RelayerSlashed_eventFilter
  | RelayerRegistry_RelayerSlashed_eventFilter[]
  | ((_1:RelayerRegistry_RelayerSlashed_eventFiltersArgs) => RelayerRegistry_RelayerSlashed_eventFiltersDefinition);

export type RelayerRegistry_RelayerUnregistered_eventArgs = { readonly relayer: Address_t; readonly returnedStake: bigint };

export type RelayerRegistry_RelayerUnregistered_block = Block_t;

export type RelayerRegistry_RelayerUnregistered_transaction = Transaction_t;

export type RelayerRegistry_RelayerUnregistered_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_RelayerUnregistered_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_RelayerUnregistered_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_RelayerUnregistered_block
};

export type RelayerRegistry_RelayerUnregistered_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_RelayerUnregistered_event,handlerContext,void>;

export type RelayerRegistry_RelayerUnregistered_handler = Internal_genericHandler<RelayerRegistry_RelayerUnregistered_handlerArgs>;

export type RelayerRegistry_RelayerUnregistered_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_RelayerUnregistered_event,contractRegistrations>>;

export type RelayerRegistry_RelayerUnregistered_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_RelayerUnregistered_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_RelayerUnregistered_eventFiltersDefinition = 
    RelayerRegistry_RelayerUnregistered_eventFilter
  | RelayerRegistry_RelayerUnregistered_eventFilter[];

export type RelayerRegistry_RelayerUnregistered_eventFilters = 
    RelayerRegistry_RelayerUnregistered_eventFilter
  | RelayerRegistry_RelayerUnregistered_eventFilter[]
  | ((_1:RelayerRegistry_RelayerUnregistered_eventFiltersArgs) => RelayerRegistry_RelayerUnregistered_eventFiltersDefinition);

export type RelayerRegistry_SlashingParametersUpdated_eventArgs = { readonly slashAmount: bigint; readonly failureThreshold: bigint };

export type RelayerRegistry_SlashingParametersUpdated_block = Block_t;

export type RelayerRegistry_SlashingParametersUpdated_transaction = Transaction_t;

export type RelayerRegistry_SlashingParametersUpdated_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_SlashingParametersUpdated_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_SlashingParametersUpdated_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_SlashingParametersUpdated_block
};

export type RelayerRegistry_SlashingParametersUpdated_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_SlashingParametersUpdated_event,handlerContext,void>;

export type RelayerRegistry_SlashingParametersUpdated_handler = Internal_genericHandler<RelayerRegistry_SlashingParametersUpdated_handlerArgs>;

export type RelayerRegistry_SlashingParametersUpdated_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_SlashingParametersUpdated_event,contractRegistrations>>;

export type RelayerRegistry_SlashingParametersUpdated_eventFilter = {};

export type RelayerRegistry_SlashingParametersUpdated_eventFilters = Internal_noEventFilters;

export type RelayerRegistry_WithdrawalRequested_eventArgs = { readonly relayer: Address_t; readonly requestTime: bigint };

export type RelayerRegistry_WithdrawalRequested_block = Block_t;

export type RelayerRegistry_WithdrawalRequested_transaction = Transaction_t;

export type RelayerRegistry_WithdrawalRequested_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: RelayerRegistry_WithdrawalRequested_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: RelayerRegistry_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: RelayerRegistry_WithdrawalRequested_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: RelayerRegistry_WithdrawalRequested_block
};

export type RelayerRegistry_WithdrawalRequested_handlerArgs = Internal_genericHandlerArgs<RelayerRegistry_WithdrawalRequested_event,handlerContext,void>;

export type RelayerRegistry_WithdrawalRequested_handler = Internal_genericHandler<RelayerRegistry_WithdrawalRequested_handlerArgs>;

export type RelayerRegistry_WithdrawalRequested_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<RelayerRegistry_WithdrawalRequested_event,contractRegistrations>>;

export type RelayerRegistry_WithdrawalRequested_eventFilter = { readonly relayer?: SingleOrMultiple_t<Address_t> };

export type RelayerRegistry_WithdrawalRequested_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: RelayerRegistry_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type RelayerRegistry_WithdrawalRequested_eventFiltersDefinition = 
    RelayerRegistry_WithdrawalRequested_eventFilter
  | RelayerRegistry_WithdrawalRequested_eventFilter[];

export type RelayerRegistry_WithdrawalRequested_eventFilters = 
    RelayerRegistry_WithdrawalRequested_eventFilter
  | RelayerRegistry_WithdrawalRequested_eventFilter[]
  | ((_1:RelayerRegistry_WithdrawalRequested_eventFiltersArgs) => RelayerRegistry_WithdrawalRequested_eventFiltersDefinition);

export type SubscriptionManager_chainId = 84532 | 11155111;

export type SubscriptionManager_CrossChainPaymentInitiated_eventArgs = {
  readonly subscriptionId: string; 
  readonly subscriber: Address_t; 
  readonly subscriberToken: Address_t; 
  readonly sourceChainId: bigint; 
  readonly targetChainId: bigint; 
  readonly amount: bigint
};

export type SubscriptionManager_CrossChainPaymentInitiated_block = Block_t;

export type SubscriptionManager_CrossChainPaymentInitiated_transaction = Transaction_t;

export type SubscriptionManager_CrossChainPaymentInitiated_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_CrossChainPaymentInitiated_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_CrossChainPaymentInitiated_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_CrossChainPaymentInitiated_block
};

export type SubscriptionManager_CrossChainPaymentInitiated_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_CrossChainPaymentInitiated_event,handlerContext,void>;

export type SubscriptionManager_CrossChainPaymentInitiated_handler = Internal_genericHandler<SubscriptionManager_CrossChainPaymentInitiated_handlerArgs>;

export type SubscriptionManager_CrossChainPaymentInitiated_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_CrossChainPaymentInitiated_event,contractRegistrations>>;

export type SubscriptionManager_CrossChainPaymentInitiated_eventFilter = { readonly subscriptionId?: SingleOrMultiple_t<string>; readonly subscriber?: SingleOrMultiple_t<Address_t> };

export type SubscriptionManager_CrossChainPaymentInitiated_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_CrossChainPaymentInitiated_eventFiltersDefinition = 
    SubscriptionManager_CrossChainPaymentInitiated_eventFilter
  | SubscriptionManager_CrossChainPaymentInitiated_eventFilter[];

export type SubscriptionManager_CrossChainPaymentInitiated_eventFilters = 
    SubscriptionManager_CrossChainPaymentInitiated_eventFilter
  | SubscriptionManager_CrossChainPaymentInitiated_eventFilter[]
  | ((_1:SubscriptionManager_CrossChainPaymentInitiated_eventFiltersArgs) => SubscriptionManager_CrossChainPaymentInitiated_eventFiltersDefinition);

export type SubscriptionManager_NexusAttestationSubmitted_eventArgs = {
  readonly subscriptionId: string; 
  readonly paymentNumber: bigint; 
  readonly attestationId: string
};

export type SubscriptionManager_NexusAttestationSubmitted_block = Block_t;

export type SubscriptionManager_NexusAttestationSubmitted_transaction = Transaction_t;

export type SubscriptionManager_NexusAttestationSubmitted_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_NexusAttestationSubmitted_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_NexusAttestationSubmitted_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_NexusAttestationSubmitted_block
};

export type SubscriptionManager_NexusAttestationSubmitted_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_NexusAttestationSubmitted_event,handlerContext,void>;

export type SubscriptionManager_NexusAttestationSubmitted_handler = Internal_genericHandler<SubscriptionManager_NexusAttestationSubmitted_handlerArgs>;

export type SubscriptionManager_NexusAttestationSubmitted_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_NexusAttestationSubmitted_event,contractRegistrations>>;

export type SubscriptionManager_NexusAttestationSubmitted_eventFilter = { readonly subscriptionId?: SingleOrMultiple_t<string>; readonly paymentNumber?: SingleOrMultiple_t<bigint> };

export type SubscriptionManager_NexusAttestationSubmitted_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_NexusAttestationSubmitted_eventFiltersDefinition = 
    SubscriptionManager_NexusAttestationSubmitted_eventFilter
  | SubscriptionManager_NexusAttestationSubmitted_eventFilter[];

export type SubscriptionManager_NexusAttestationSubmitted_eventFilters = 
    SubscriptionManager_NexusAttestationSubmitted_eventFilter
  | SubscriptionManager_NexusAttestationSubmitted_eventFilter[]
  | ((_1:SubscriptionManager_NexusAttestationSubmitted_eventFiltersArgs) => SubscriptionManager_NexusAttestationSubmitted_eventFiltersDefinition);

export type SubscriptionManager_NexusAttestationVerified_eventArgs = { readonly attestationId: string };

export type SubscriptionManager_NexusAttestationVerified_block = Block_t;

export type SubscriptionManager_NexusAttestationVerified_transaction = Transaction_t;

export type SubscriptionManager_NexusAttestationVerified_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_NexusAttestationVerified_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_NexusAttestationVerified_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_NexusAttestationVerified_block
};

export type SubscriptionManager_NexusAttestationVerified_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_NexusAttestationVerified_event,handlerContext,void>;

export type SubscriptionManager_NexusAttestationVerified_handler = Internal_genericHandler<SubscriptionManager_NexusAttestationVerified_handlerArgs>;

export type SubscriptionManager_NexusAttestationVerified_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_NexusAttestationVerified_event,contractRegistrations>>;

export type SubscriptionManager_NexusAttestationVerified_eventFilter = { readonly attestationId?: SingleOrMultiple_t<string> };

export type SubscriptionManager_NexusAttestationVerified_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_NexusAttestationVerified_eventFiltersDefinition = 
    SubscriptionManager_NexusAttestationVerified_eventFilter
  | SubscriptionManager_NexusAttestationVerified_eventFilter[];

export type SubscriptionManager_NexusAttestationVerified_eventFilters = 
    SubscriptionManager_NexusAttestationVerified_eventFilter
  | SubscriptionManager_NexusAttestationVerified_eventFilter[]
  | ((_1:SubscriptionManager_NexusAttestationVerified_eventFiltersArgs) => SubscriptionManager_NexusAttestationVerified_eventFiltersDefinition);

export type SubscriptionManager_OwnershipTransferred_eventArgs = { readonly previousOwner: Address_t; readonly newOwner: Address_t };

export type SubscriptionManager_OwnershipTransferred_block = Block_t;

export type SubscriptionManager_OwnershipTransferred_transaction = Transaction_t;

export type SubscriptionManager_OwnershipTransferred_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_OwnershipTransferred_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_OwnershipTransferred_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_OwnershipTransferred_block
};

export type SubscriptionManager_OwnershipTransferred_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_OwnershipTransferred_event,handlerContext,void>;

export type SubscriptionManager_OwnershipTransferred_handler = Internal_genericHandler<SubscriptionManager_OwnershipTransferred_handlerArgs>;

export type SubscriptionManager_OwnershipTransferred_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_OwnershipTransferred_event,contractRegistrations>>;

export type SubscriptionManager_OwnershipTransferred_eventFilter = { readonly previousOwner?: SingleOrMultiple_t<Address_t>; readonly newOwner?: SingleOrMultiple_t<Address_t> };

export type SubscriptionManager_OwnershipTransferred_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_OwnershipTransferred_eventFiltersDefinition = 
    SubscriptionManager_OwnershipTransferred_eventFilter
  | SubscriptionManager_OwnershipTransferred_eventFilter[];

export type SubscriptionManager_OwnershipTransferred_eventFilters = 
    SubscriptionManager_OwnershipTransferred_eventFilter
  | SubscriptionManager_OwnershipTransferred_eventFilter[]
  | ((_1:SubscriptionManager_OwnershipTransferred_eventFiltersArgs) => SubscriptionManager_OwnershipTransferred_eventFiltersDefinition);

export type SubscriptionManager_PaymentExecuted_eventArgs = {
  readonly subscriptionId: string; 
  readonly subscriber: Address_t; 
  readonly merchant: Address_t; 
  readonly token: Address_t; 
  readonly paymentNumber: bigint; 
  readonly amount: bigint; 
  readonly fee: bigint; 
  readonly relayer: Address_t
};

export type SubscriptionManager_PaymentExecuted_block = Block_t;

export type SubscriptionManager_PaymentExecuted_transaction = Transaction_t;

export type SubscriptionManager_PaymentExecuted_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_PaymentExecuted_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_PaymentExecuted_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_PaymentExecuted_block
};

export type SubscriptionManager_PaymentExecuted_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_PaymentExecuted_event,handlerContext,void>;

export type SubscriptionManager_PaymentExecuted_handler = Internal_genericHandler<SubscriptionManager_PaymentExecuted_handlerArgs>;

export type SubscriptionManager_PaymentExecuted_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_PaymentExecuted_event,contractRegistrations>>;

export type SubscriptionManager_PaymentExecuted_eventFilter = {
  readonly subscriptionId?: SingleOrMultiple_t<string>; 
  readonly subscriber?: SingleOrMultiple_t<Address_t>; 
  readonly merchant?: SingleOrMultiple_t<Address_t>
};

export type SubscriptionManager_PaymentExecuted_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_PaymentExecuted_eventFiltersDefinition = 
    SubscriptionManager_PaymentExecuted_eventFilter
  | SubscriptionManager_PaymentExecuted_eventFilter[];

export type SubscriptionManager_PaymentExecuted_eventFilters = 
    SubscriptionManager_PaymentExecuted_eventFilter
  | SubscriptionManager_PaymentExecuted_eventFilter[]
  | ((_1:SubscriptionManager_PaymentExecuted_eventFiltersArgs) => SubscriptionManager_PaymentExecuted_eventFiltersDefinition);

export type SubscriptionManager_PaymentFailed_eventArgs = {
  readonly subscriptionId: string; 
  readonly subscriber: Address_t; 
  readonly merchant: Address_t; 
  readonly amount: bigint; 
  readonly reason: string
};

export type SubscriptionManager_PaymentFailed_block = Block_t;

export type SubscriptionManager_PaymentFailed_transaction = Transaction_t;

export type SubscriptionManager_PaymentFailed_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_PaymentFailed_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_PaymentFailed_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_PaymentFailed_block
};

export type SubscriptionManager_PaymentFailed_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_PaymentFailed_event,handlerContext,void>;

export type SubscriptionManager_PaymentFailed_handler = Internal_genericHandler<SubscriptionManager_PaymentFailed_handlerArgs>;

export type SubscriptionManager_PaymentFailed_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_PaymentFailed_event,contractRegistrations>>;

export type SubscriptionManager_PaymentFailed_eventFilter = {
  readonly subscriptionId?: SingleOrMultiple_t<string>; 
  readonly subscriber?: SingleOrMultiple_t<Address_t>; 
  readonly merchant?: SingleOrMultiple_t<Address_t>
};

export type SubscriptionManager_PaymentFailed_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_PaymentFailed_eventFiltersDefinition = 
    SubscriptionManager_PaymentFailed_eventFilter
  | SubscriptionManager_PaymentFailed_eventFilter[];

export type SubscriptionManager_PaymentFailed_eventFilters = 
    SubscriptionManager_PaymentFailed_eventFilter
  | SubscriptionManager_PaymentFailed_eventFilter[]
  | ((_1:SubscriptionManager_PaymentFailed_eventFiltersArgs) => SubscriptionManager_PaymentFailed_eventFiltersDefinition);

export type SubscriptionManager_SubscriptionCancelled_eventArgs = {
  readonly subscriptionId: string; 
  readonly subscriber: Address_t; 
  readonly merchant: Address_t
};

export type SubscriptionManager_SubscriptionCancelled_block = Block_t;

export type SubscriptionManager_SubscriptionCancelled_transaction = Transaction_t;

export type SubscriptionManager_SubscriptionCancelled_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_SubscriptionCancelled_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_SubscriptionCancelled_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_SubscriptionCancelled_block
};

export type SubscriptionManager_SubscriptionCancelled_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_SubscriptionCancelled_event,handlerContext,void>;

export type SubscriptionManager_SubscriptionCancelled_handler = Internal_genericHandler<SubscriptionManager_SubscriptionCancelled_handlerArgs>;

export type SubscriptionManager_SubscriptionCancelled_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_SubscriptionCancelled_event,contractRegistrations>>;

export type SubscriptionManager_SubscriptionCancelled_eventFilter = {
  readonly subscriptionId?: SingleOrMultiple_t<string>; 
  readonly subscriber?: SingleOrMultiple_t<Address_t>; 
  readonly merchant?: SingleOrMultiple_t<Address_t>
};

export type SubscriptionManager_SubscriptionCancelled_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_SubscriptionCancelled_eventFiltersDefinition = 
    SubscriptionManager_SubscriptionCancelled_eventFilter
  | SubscriptionManager_SubscriptionCancelled_eventFilter[];

export type SubscriptionManager_SubscriptionCancelled_eventFilters = 
    SubscriptionManager_SubscriptionCancelled_eventFilter
  | SubscriptionManager_SubscriptionCancelled_eventFilter[]
  | ((_1:SubscriptionManager_SubscriptionCancelled_eventFiltersArgs) => SubscriptionManager_SubscriptionCancelled_eventFiltersDefinition);

export type SubscriptionManager_SubscriptionCreated_eventArgs = {
  readonly subscriptionId: string; 
  readonly subscriber: Address_t; 
  readonly merchant: Address_t; 
  readonly token: Address_t; 
  readonly amount: bigint; 
  readonly interval: bigint; 
  readonly maxPayments: bigint; 
  readonly maxTotalAmount: bigint; 
  readonly expiry: bigint
};

export type SubscriptionManager_SubscriptionCreated_block = Block_t;

export type SubscriptionManager_SubscriptionCreated_transaction = Transaction_t;

export type SubscriptionManager_SubscriptionCreated_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_SubscriptionCreated_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_SubscriptionCreated_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_SubscriptionCreated_block
};

export type SubscriptionManager_SubscriptionCreated_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_SubscriptionCreated_event,handlerContext,void>;

export type SubscriptionManager_SubscriptionCreated_handler = Internal_genericHandler<SubscriptionManager_SubscriptionCreated_handlerArgs>;

export type SubscriptionManager_SubscriptionCreated_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_SubscriptionCreated_event,contractRegistrations>>;

export type SubscriptionManager_SubscriptionCreated_eventFilter = {
  readonly subscriptionId?: SingleOrMultiple_t<string>; 
  readonly subscriber?: SingleOrMultiple_t<Address_t>; 
  readonly merchant?: SingleOrMultiple_t<Address_t>
};

export type SubscriptionManager_SubscriptionCreated_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_SubscriptionCreated_eventFiltersDefinition = 
    SubscriptionManager_SubscriptionCreated_eventFilter
  | SubscriptionManager_SubscriptionCreated_eventFilter[];

export type SubscriptionManager_SubscriptionCreated_eventFilters = 
    SubscriptionManager_SubscriptionCreated_eventFilter
  | SubscriptionManager_SubscriptionCreated_eventFilter[]
  | ((_1:SubscriptionManager_SubscriptionCreated_eventFiltersArgs) => SubscriptionManager_SubscriptionCreated_eventFiltersDefinition);

export type SubscriptionManager_SubscriptionPaused_eventArgs = { readonly subscriptionId: string; readonly subscriber: Address_t };

export type SubscriptionManager_SubscriptionPaused_block = Block_t;

export type SubscriptionManager_SubscriptionPaused_transaction = Transaction_t;

export type SubscriptionManager_SubscriptionPaused_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_SubscriptionPaused_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_SubscriptionPaused_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_SubscriptionPaused_block
};

export type SubscriptionManager_SubscriptionPaused_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_SubscriptionPaused_event,handlerContext,void>;

export type SubscriptionManager_SubscriptionPaused_handler = Internal_genericHandler<SubscriptionManager_SubscriptionPaused_handlerArgs>;

export type SubscriptionManager_SubscriptionPaused_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_SubscriptionPaused_event,contractRegistrations>>;

export type SubscriptionManager_SubscriptionPaused_eventFilter = { readonly subscriptionId?: SingleOrMultiple_t<string>; readonly subscriber?: SingleOrMultiple_t<Address_t> };

export type SubscriptionManager_SubscriptionPaused_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_SubscriptionPaused_eventFiltersDefinition = 
    SubscriptionManager_SubscriptionPaused_eventFilter
  | SubscriptionManager_SubscriptionPaused_eventFilter[];

export type SubscriptionManager_SubscriptionPaused_eventFilters = 
    SubscriptionManager_SubscriptionPaused_eventFilter
  | SubscriptionManager_SubscriptionPaused_eventFilter[]
  | ((_1:SubscriptionManager_SubscriptionPaused_eventFiltersArgs) => SubscriptionManager_SubscriptionPaused_eventFiltersDefinition);

export type SubscriptionManager_SubscriptionResumed_eventArgs = { readonly subscriptionId: string; readonly subscriber: Address_t };

export type SubscriptionManager_SubscriptionResumed_block = Block_t;

export type SubscriptionManager_SubscriptionResumed_transaction = Transaction_t;

export type SubscriptionManager_SubscriptionResumed_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_SubscriptionResumed_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_SubscriptionResumed_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_SubscriptionResumed_block
};

export type SubscriptionManager_SubscriptionResumed_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_SubscriptionResumed_event,handlerContext,void>;

export type SubscriptionManager_SubscriptionResumed_handler = Internal_genericHandler<SubscriptionManager_SubscriptionResumed_handlerArgs>;

export type SubscriptionManager_SubscriptionResumed_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_SubscriptionResumed_event,contractRegistrations>>;

export type SubscriptionManager_SubscriptionResumed_eventFilter = { readonly subscriptionId?: SingleOrMultiple_t<string>; readonly subscriber?: SingleOrMultiple_t<Address_t> };

export type SubscriptionManager_SubscriptionResumed_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_SubscriptionResumed_eventFiltersDefinition = 
    SubscriptionManager_SubscriptionResumed_eventFilter
  | SubscriptionManager_SubscriptionResumed_eventFilter[];

export type SubscriptionManager_SubscriptionResumed_eventFilters = 
    SubscriptionManager_SubscriptionResumed_eventFilter
  | SubscriptionManager_SubscriptionResumed_eventFilter[]
  | ((_1:SubscriptionManager_SubscriptionResumed_eventFiltersArgs) => SubscriptionManager_SubscriptionResumed_eventFiltersDefinition);

export type SubscriptionManager_TokenAdded_eventArgs = { readonly token: Address_t };

export type SubscriptionManager_TokenAdded_block = Block_t;

export type SubscriptionManager_TokenAdded_transaction = Transaction_t;

export type SubscriptionManager_TokenAdded_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_TokenAdded_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_TokenAdded_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_TokenAdded_block
};

export type SubscriptionManager_TokenAdded_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_TokenAdded_event,handlerContext,void>;

export type SubscriptionManager_TokenAdded_handler = Internal_genericHandler<SubscriptionManager_TokenAdded_handlerArgs>;

export type SubscriptionManager_TokenAdded_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_TokenAdded_event,contractRegistrations>>;

export type SubscriptionManager_TokenAdded_eventFilter = { readonly token?: SingleOrMultiple_t<Address_t> };

export type SubscriptionManager_TokenAdded_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_TokenAdded_eventFiltersDefinition = 
    SubscriptionManager_TokenAdded_eventFilter
  | SubscriptionManager_TokenAdded_eventFilter[];

export type SubscriptionManager_TokenAdded_eventFilters = 
    SubscriptionManager_TokenAdded_eventFilter
  | SubscriptionManager_TokenAdded_eventFilter[]
  | ((_1:SubscriptionManager_TokenAdded_eventFiltersArgs) => SubscriptionManager_TokenAdded_eventFiltersDefinition);

export type SubscriptionManager_TokenRemoved_eventArgs = { readonly token: Address_t };

export type SubscriptionManager_TokenRemoved_block = Block_t;

export type SubscriptionManager_TokenRemoved_transaction = Transaction_t;

export type SubscriptionManager_TokenRemoved_event = {
  /** The parameters or arguments associated with this event. */
  readonly params: SubscriptionManager_TokenRemoved_eventArgs; 
  /** The unique identifier of the blockchain network where this event occurred. */
  readonly chainId: SubscriptionManager_chainId; 
  /** The address of the contract that emitted this event. */
  readonly srcAddress: Address_t; 
  /** The index of this event's log within the block. */
  readonly logIndex: number; 
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  readonly transaction: SubscriptionManager_TokenRemoved_transaction; 
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  readonly block: SubscriptionManager_TokenRemoved_block
};

export type SubscriptionManager_TokenRemoved_handlerArgs = Internal_genericHandlerArgs<SubscriptionManager_TokenRemoved_event,handlerContext,void>;

export type SubscriptionManager_TokenRemoved_handler = Internal_genericHandler<SubscriptionManager_TokenRemoved_handlerArgs>;

export type SubscriptionManager_TokenRemoved_contractRegister = Internal_genericContractRegister<Internal_genericContractRegisterArgs<SubscriptionManager_TokenRemoved_event,contractRegistrations>>;

export type SubscriptionManager_TokenRemoved_eventFilter = { readonly token?: SingleOrMultiple_t<Address_t> };

export type SubscriptionManager_TokenRemoved_eventFiltersArgs = { 
/** The unique identifier of the blockchain network where this event occurred. */
readonly chainId: SubscriptionManager_chainId; 
/** Addresses of the contracts indexing the event. */
readonly addresses: Address_t[] };

export type SubscriptionManager_TokenRemoved_eventFiltersDefinition = 
    SubscriptionManager_TokenRemoved_eventFilter
  | SubscriptionManager_TokenRemoved_eventFilter[];

export type SubscriptionManager_TokenRemoved_eventFilters = 
    SubscriptionManager_TokenRemoved_eventFilter
  | SubscriptionManager_TokenRemoved_eventFilter[]
  | ((_1:SubscriptionManager_TokenRemoved_eventFiltersArgs) => SubscriptionManager_TokenRemoved_eventFiltersDefinition);

export type chainId = number;

export type chain = 84532 | 11155111;
