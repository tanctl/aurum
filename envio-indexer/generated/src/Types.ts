// This file is to dynamically generate TS types
// which we can't get using GenType
// Use @genType.import to link the types back to ReScript code

import type { Logger, EffectCaller } from "envio";
import type * as Entities from "./db/Entities.gen.ts";

export type HandlerContext = {
  /**
   * Access the logger instance with event as a context. The logs will be displayed in the console and Envio Hosted Service.
   */
  readonly log: Logger;
  /**
   * Call the provided Effect with the given input.
   * Effects are the best for external calls with automatic deduplication, error handling and caching.
   * Define a new Effect using createEffect outside of the handler.
   */
  readonly effect: EffectCaller;
  /**
   * True when the handlers run in preload mode - in parallel for the whole batch.
   * Handlers run twice per batch of events, and the first time is the "preload" run
   * During preload entities aren't set, logs are ignored and exceptions are silently swallowed.
   * Preload mode is the best time to populate data to in-memory cache.
   * After preload the handler will run for the second time in sequential order of events.
   */
  readonly isPreload: boolean;
  readonly RelayerRegistry_EmergencySlash: {
    /**
     * Load the entity RelayerRegistry_EmergencySlash from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_EmergencySlash_t | undefined>,
    /**
     * Load the entity RelayerRegistry_EmergencySlash from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_EmergencySlash_t>,
    readonly getWhere: Entities.RelayerRegistry_EmergencySlash_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_EmergencySlash from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_EmergencySlash_t) => Promise<Entities.RelayerRegistry_EmergencySlash_t>,
    /**
     * Set the entity RelayerRegistry_EmergencySlash in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_EmergencySlash_t) => void,
    /**
     * Delete the entity RelayerRegistry_EmergencySlash from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_ExecutionRecorded: {
    /**
     * Load the entity RelayerRegistry_ExecutionRecorded from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_ExecutionRecorded_t | undefined>,
    /**
     * Load the entity RelayerRegistry_ExecutionRecorded from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_ExecutionRecorded_t>,
    readonly getWhere: Entities.RelayerRegistry_ExecutionRecorded_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_ExecutionRecorded from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_ExecutionRecorded_t) => Promise<Entities.RelayerRegistry_ExecutionRecorded_t>,
    /**
     * Set the entity RelayerRegistry_ExecutionRecorded in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_ExecutionRecorded_t) => void,
    /**
     * Delete the entity RelayerRegistry_ExecutionRecorded from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_OwnershipTransferred: {
    /**
     * Load the entity RelayerRegistry_OwnershipTransferred from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_OwnershipTransferred_t | undefined>,
    /**
     * Load the entity RelayerRegistry_OwnershipTransferred from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_OwnershipTransferred_t>,
    readonly getWhere: Entities.RelayerRegistry_OwnershipTransferred_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_OwnershipTransferred from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_OwnershipTransferred_t) => Promise<Entities.RelayerRegistry_OwnershipTransferred_t>,
    /**
     * Set the entity RelayerRegistry_OwnershipTransferred in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_OwnershipTransferred_t) => void,
    /**
     * Delete the entity RelayerRegistry_OwnershipTransferred from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_RelayerRegistered: {
    /**
     * Load the entity RelayerRegistry_RelayerRegistered from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_RelayerRegistered_t | undefined>,
    /**
     * Load the entity RelayerRegistry_RelayerRegistered from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_RelayerRegistered_t>,
    readonly getWhere: Entities.RelayerRegistry_RelayerRegistered_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_RelayerRegistered from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_RelayerRegistered_t) => Promise<Entities.RelayerRegistry_RelayerRegistered_t>,
    /**
     * Set the entity RelayerRegistry_RelayerRegistered in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_RelayerRegistered_t) => void,
    /**
     * Delete the entity RelayerRegistry_RelayerRegistered from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_RelayerRestaked: {
    /**
     * Load the entity RelayerRegistry_RelayerRestaked from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_RelayerRestaked_t | undefined>,
    /**
     * Load the entity RelayerRegistry_RelayerRestaked from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_RelayerRestaked_t>,
    readonly getWhere: Entities.RelayerRegistry_RelayerRestaked_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_RelayerRestaked from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_RelayerRestaked_t) => Promise<Entities.RelayerRegistry_RelayerRestaked_t>,
    /**
     * Set the entity RelayerRegistry_RelayerRestaked in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_RelayerRestaked_t) => void,
    /**
     * Delete the entity RelayerRegistry_RelayerRestaked from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_RelayerSlashed: {
    /**
     * Load the entity RelayerRegistry_RelayerSlashed from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_RelayerSlashed_t | undefined>,
    /**
     * Load the entity RelayerRegistry_RelayerSlashed from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_RelayerSlashed_t>,
    readonly getWhere: Entities.RelayerRegistry_RelayerSlashed_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_RelayerSlashed from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_RelayerSlashed_t) => Promise<Entities.RelayerRegistry_RelayerSlashed_t>,
    /**
     * Set the entity RelayerRegistry_RelayerSlashed in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_RelayerSlashed_t) => void,
    /**
     * Delete the entity RelayerRegistry_RelayerSlashed from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_RelayerUnregistered: {
    /**
     * Load the entity RelayerRegistry_RelayerUnregistered from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_RelayerUnregistered_t | undefined>,
    /**
     * Load the entity RelayerRegistry_RelayerUnregistered from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_RelayerUnregistered_t>,
    readonly getWhere: Entities.RelayerRegistry_RelayerUnregistered_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_RelayerUnregistered from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_RelayerUnregistered_t) => Promise<Entities.RelayerRegistry_RelayerUnregistered_t>,
    /**
     * Set the entity RelayerRegistry_RelayerUnregistered in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_RelayerUnregistered_t) => void,
    /**
     * Delete the entity RelayerRegistry_RelayerUnregistered from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_SlashingParametersUpdated: {
    /**
     * Load the entity RelayerRegistry_SlashingParametersUpdated from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_SlashingParametersUpdated_t | undefined>,
    /**
     * Load the entity RelayerRegistry_SlashingParametersUpdated from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_SlashingParametersUpdated_t>,
    readonly getWhere: Entities.RelayerRegistry_SlashingParametersUpdated_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_SlashingParametersUpdated from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_SlashingParametersUpdated_t) => Promise<Entities.RelayerRegistry_SlashingParametersUpdated_t>,
    /**
     * Set the entity RelayerRegistry_SlashingParametersUpdated in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_SlashingParametersUpdated_t) => void,
    /**
     * Delete the entity RelayerRegistry_SlashingParametersUpdated from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly RelayerRegistry_WithdrawalRequested: {
    /**
     * Load the entity RelayerRegistry_WithdrawalRequested from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.RelayerRegistry_WithdrawalRequested_t | undefined>,
    /**
     * Load the entity RelayerRegistry_WithdrawalRequested from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.RelayerRegistry_WithdrawalRequested_t>,
    readonly getWhere: Entities.RelayerRegistry_WithdrawalRequested_indexedFieldOperations,
    /**
     * Returns the entity RelayerRegistry_WithdrawalRequested from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.RelayerRegistry_WithdrawalRequested_t) => Promise<Entities.RelayerRegistry_WithdrawalRequested_t>,
    /**
     * Set the entity RelayerRegistry_WithdrawalRequested in the storage.
     */
    readonly set: (entity: Entities.RelayerRegistry_WithdrawalRequested_t) => void,
    /**
     * Delete the entity RelayerRegistry_WithdrawalRequested from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_CrossChainPaymentInitiated: {
    /**
     * Load the entity SubscribtionManager_CrossChainPaymentInitiated from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_CrossChainPaymentInitiated_t | undefined>,
    /**
     * Load the entity SubscribtionManager_CrossChainPaymentInitiated from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_CrossChainPaymentInitiated_t>,
    readonly getWhere: Entities.SubscribtionManager_CrossChainPaymentInitiated_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_CrossChainPaymentInitiated from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_CrossChainPaymentInitiated_t) => Promise<Entities.SubscribtionManager_CrossChainPaymentInitiated_t>,
    /**
     * Set the entity SubscribtionManager_CrossChainPaymentInitiated in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_CrossChainPaymentInitiated_t) => void,
    /**
     * Delete the entity SubscribtionManager_CrossChainPaymentInitiated from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_NexusAttestationSubmitted: {
    /**
     * Load the entity SubscribtionManager_NexusAttestationSubmitted from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_NexusAttestationSubmitted_t | undefined>,
    /**
     * Load the entity SubscribtionManager_NexusAttestationSubmitted from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_NexusAttestationSubmitted_t>,
    readonly getWhere: Entities.SubscribtionManager_NexusAttestationSubmitted_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_NexusAttestationSubmitted from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_NexusAttestationSubmitted_t) => Promise<Entities.SubscribtionManager_NexusAttestationSubmitted_t>,
    /**
     * Set the entity SubscribtionManager_NexusAttestationSubmitted in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_NexusAttestationSubmitted_t) => void,
    /**
     * Delete the entity SubscribtionManager_NexusAttestationSubmitted from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_NexusAttestationVerified: {
    /**
     * Load the entity SubscribtionManager_NexusAttestationVerified from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_NexusAttestationVerified_t | undefined>,
    /**
     * Load the entity SubscribtionManager_NexusAttestationVerified from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_NexusAttestationVerified_t>,
    readonly getWhere: Entities.SubscribtionManager_NexusAttestationVerified_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_NexusAttestationVerified from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_NexusAttestationVerified_t) => Promise<Entities.SubscribtionManager_NexusAttestationVerified_t>,
    /**
     * Set the entity SubscribtionManager_NexusAttestationVerified in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_NexusAttestationVerified_t) => void,
    /**
     * Delete the entity SubscribtionManager_NexusAttestationVerified from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_OwnershipTransferred: {
    /**
     * Load the entity SubscribtionManager_OwnershipTransferred from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_OwnershipTransferred_t | undefined>,
    /**
     * Load the entity SubscribtionManager_OwnershipTransferred from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_OwnershipTransferred_t>,
    readonly getWhere: Entities.SubscribtionManager_OwnershipTransferred_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_OwnershipTransferred from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_OwnershipTransferred_t) => Promise<Entities.SubscribtionManager_OwnershipTransferred_t>,
    /**
     * Set the entity SubscribtionManager_OwnershipTransferred in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_OwnershipTransferred_t) => void,
    /**
     * Delete the entity SubscribtionManager_OwnershipTransferred from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_PaymentExecuted: {
    /**
     * Load the entity SubscribtionManager_PaymentExecuted from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_PaymentExecuted_t | undefined>,
    /**
     * Load the entity SubscribtionManager_PaymentExecuted from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_PaymentExecuted_t>,
    readonly getWhere: Entities.SubscribtionManager_PaymentExecuted_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_PaymentExecuted from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_PaymentExecuted_t) => Promise<Entities.SubscribtionManager_PaymentExecuted_t>,
    /**
     * Set the entity SubscribtionManager_PaymentExecuted in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_PaymentExecuted_t) => void,
    /**
     * Delete the entity SubscribtionManager_PaymentExecuted from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_PaymentFailed: {
    /**
     * Load the entity SubscribtionManager_PaymentFailed from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_PaymentFailed_t | undefined>,
    /**
     * Load the entity SubscribtionManager_PaymentFailed from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_PaymentFailed_t>,
    readonly getWhere: Entities.SubscribtionManager_PaymentFailed_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_PaymentFailed from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_PaymentFailed_t) => Promise<Entities.SubscribtionManager_PaymentFailed_t>,
    /**
     * Set the entity SubscribtionManager_PaymentFailed in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_PaymentFailed_t) => void,
    /**
     * Delete the entity SubscribtionManager_PaymentFailed from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_SubscriptionCancelled: {
    /**
     * Load the entity SubscribtionManager_SubscriptionCancelled from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_SubscriptionCancelled_t | undefined>,
    /**
     * Load the entity SubscribtionManager_SubscriptionCancelled from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_SubscriptionCancelled_t>,
    readonly getWhere: Entities.SubscribtionManager_SubscriptionCancelled_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_SubscriptionCancelled from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_SubscriptionCancelled_t) => Promise<Entities.SubscribtionManager_SubscriptionCancelled_t>,
    /**
     * Set the entity SubscribtionManager_SubscriptionCancelled in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_SubscriptionCancelled_t) => void,
    /**
     * Delete the entity SubscribtionManager_SubscriptionCancelled from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_SubscriptionCreated: {
    /**
     * Load the entity SubscribtionManager_SubscriptionCreated from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_SubscriptionCreated_t | undefined>,
    /**
     * Load the entity SubscribtionManager_SubscriptionCreated from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_SubscriptionCreated_t>,
    readonly getWhere: Entities.SubscribtionManager_SubscriptionCreated_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_SubscriptionCreated from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_SubscriptionCreated_t) => Promise<Entities.SubscribtionManager_SubscriptionCreated_t>,
    /**
     * Set the entity SubscribtionManager_SubscriptionCreated in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_SubscriptionCreated_t) => void,
    /**
     * Delete the entity SubscribtionManager_SubscriptionCreated from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_SubscriptionPaused: {
    /**
     * Load the entity SubscribtionManager_SubscriptionPaused from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_SubscriptionPaused_t | undefined>,
    /**
     * Load the entity SubscribtionManager_SubscriptionPaused from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_SubscriptionPaused_t>,
    readonly getWhere: Entities.SubscribtionManager_SubscriptionPaused_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_SubscriptionPaused from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_SubscriptionPaused_t) => Promise<Entities.SubscribtionManager_SubscriptionPaused_t>,
    /**
     * Set the entity SubscribtionManager_SubscriptionPaused in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_SubscriptionPaused_t) => void,
    /**
     * Delete the entity SubscribtionManager_SubscriptionPaused from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_SubscriptionResumed: {
    /**
     * Load the entity SubscribtionManager_SubscriptionResumed from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_SubscriptionResumed_t | undefined>,
    /**
     * Load the entity SubscribtionManager_SubscriptionResumed from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_SubscriptionResumed_t>,
    readonly getWhere: Entities.SubscribtionManager_SubscriptionResumed_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_SubscriptionResumed from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_SubscriptionResumed_t) => Promise<Entities.SubscribtionManager_SubscriptionResumed_t>,
    /**
     * Set the entity SubscribtionManager_SubscriptionResumed in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_SubscriptionResumed_t) => void,
    /**
     * Delete the entity SubscribtionManager_SubscriptionResumed from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_TokenAdded: {
    /**
     * Load the entity SubscribtionManager_TokenAdded from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_TokenAdded_t | undefined>,
    /**
     * Load the entity SubscribtionManager_TokenAdded from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_TokenAdded_t>,
    readonly getWhere: Entities.SubscribtionManager_TokenAdded_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_TokenAdded from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_TokenAdded_t) => Promise<Entities.SubscribtionManager_TokenAdded_t>,
    /**
     * Set the entity SubscribtionManager_TokenAdded in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_TokenAdded_t) => void,
    /**
     * Delete the entity SubscribtionManager_TokenAdded from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
  readonly SubscribtionManager_TokenRemoved: {
    /**
     * Load the entity SubscribtionManager_TokenRemoved from the storage by ID.
     * If the entity is not found, returns undefined.
     */
    readonly get: (id: string) => Promise<Entities.SubscribtionManager_TokenRemoved_t | undefined>,
    /**
     * Load the entity SubscribtionManager_TokenRemoved from the storage by ID.
     * If the entity is not found, throws an error.
     */
    readonly getOrThrow: (id: string, message?: string) => Promise<Entities.SubscribtionManager_TokenRemoved_t>,
    readonly getWhere: Entities.SubscribtionManager_TokenRemoved_indexedFieldOperations,
    /**
     * Returns the entity SubscribtionManager_TokenRemoved from the storage by ID.
     * If the entity is not found, creates it using provided parameters and returns it.
     */
    readonly getOrCreate: (entity: Entities.SubscribtionManager_TokenRemoved_t) => Promise<Entities.SubscribtionManager_TokenRemoved_t>,
    /**
     * Set the entity SubscribtionManager_TokenRemoved in the storage.
     */
    readonly set: (entity: Entities.SubscribtionManager_TokenRemoved_t) => void,
    /**
     * Delete the entity SubscribtionManager_TokenRemoved from the storage.
     *
     * The 'deleteUnsafe' method is experimental and unsafe. You should manually handle all entity references after deletion to maintain database consistency.
     */
    readonly deleteUnsafe: (id: string) => void,
  }
};

