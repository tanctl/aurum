module ContractType = {
  @genType
  type t = 
    | @as("RelayerRegistry") RelayerRegistry
    | @as("SubscriptionManager") SubscriptionManager

  let name = "CONTRACT_TYPE"
  let variants = [
    RelayerRegistry,
    SubscriptionManager,
  ]
  let config = Internal.makeEnumConfig(~name, ~variants)
}

module EntityType = {
  @genType
  type t = 
    | @as("CrossChainAttestation") CrossChainAttestation
    | @as("IndexerMeta") IndexerMeta
    | @as("Intent") Intent
    | @as("MerchantPerformance") MerchantPerformance
    | @as("MerchantTokenStats") MerchantTokenStats
    | @as("Payment") Payment
    | @as("RelayerPerformance") RelayerPerformance
    | @as("RelayerRegistry_EmergencySlash") RelayerRegistry_EmergencySlash
    | @as("RelayerRegistry_ExecutionRecorded") RelayerRegistry_ExecutionRecorded
    | @as("RelayerRegistry_OwnershipTransferred") RelayerRegistry_OwnershipTransferred
    | @as("RelayerRegistry_RelayerRegistered") RelayerRegistry_RelayerRegistered
    | @as("RelayerRegistry_RelayerRestaked") RelayerRegistry_RelayerRestaked
    | @as("RelayerRegistry_RelayerSlashed") RelayerRegistry_RelayerSlashed
    | @as("RelayerRegistry_RelayerUnregistered") RelayerRegistry_RelayerUnregistered
    | @as("RelayerRegistry_SlashingParametersUpdated") RelayerRegistry_SlashingParametersUpdated
    | @as("RelayerRegistry_WithdrawalRequested") RelayerRegistry_WithdrawalRequested
    | @as("SubscriberStats") SubscriberStats
    | @as("SubscribtionManager_CrossChainPaymentInitiated") SubscribtionManager_CrossChainPaymentInitiated
    | @as("SubscribtionManager_NexusAttestationSubmitted") SubscribtionManager_NexusAttestationSubmitted
    | @as("SubscribtionManager_NexusAttestationVerified") SubscribtionManager_NexusAttestationVerified
    | @as("SubscribtionManager_OwnershipTransferred") SubscribtionManager_OwnershipTransferred
    | @as("SubscribtionManager_PaymentExecuted") SubscribtionManager_PaymentExecuted
    | @as("SubscribtionManager_PaymentFailed") SubscribtionManager_PaymentFailed
    | @as("SubscribtionManager_SubscriptionCancelled") SubscribtionManager_SubscriptionCancelled
    | @as("SubscribtionManager_SubscriptionCreated") SubscribtionManager_SubscriptionCreated
    | @as("SubscribtionManager_SubscriptionPaused") SubscribtionManager_SubscriptionPaused
    | @as("SubscribtionManager_SubscriptionResumed") SubscribtionManager_SubscriptionResumed
    | @as("SubscribtionManager_TokenAdded") SubscribtionManager_TokenAdded
    | @as("SubscribtionManager_TokenRemoved") SubscribtionManager_TokenRemoved
    | @as("Subscription") Subscription
    | @as("dynamic_contract_registry") DynamicContractRegistry

  let name = "ENTITY_TYPE"
  let variants = [
    CrossChainAttestation,
    IndexerMeta,
    Intent,
    MerchantPerformance,
    MerchantTokenStats,
    Payment,
    RelayerPerformance,
    RelayerRegistry_EmergencySlash,
    RelayerRegistry_ExecutionRecorded,
    RelayerRegistry_OwnershipTransferred,
    RelayerRegistry_RelayerRegistered,
    RelayerRegistry_RelayerRestaked,
    RelayerRegistry_RelayerSlashed,
    RelayerRegistry_RelayerUnregistered,
    RelayerRegistry_SlashingParametersUpdated,
    RelayerRegistry_WithdrawalRequested,
    SubscriberStats,
    SubscribtionManager_CrossChainPaymentInitiated,
    SubscribtionManager_NexusAttestationSubmitted,
    SubscribtionManager_NexusAttestationVerified,
    SubscribtionManager_OwnershipTransferred,
    SubscribtionManager_PaymentExecuted,
    SubscribtionManager_PaymentFailed,
    SubscribtionManager_SubscriptionCancelled,
    SubscribtionManager_SubscriptionCreated,
    SubscribtionManager_SubscriptionPaused,
    SubscribtionManager_SubscriptionResumed,
    SubscribtionManager_TokenAdded,
    SubscribtionManager_TokenRemoved,
    Subscription,
    DynamicContractRegistry,
  ]
  let config = Internal.makeEnumConfig(~name, ~variants)
}

let allEnums = ([
  ContractType.config->Internal.fromGenericEnumConfig,
  EntityType.config->Internal.fromGenericEnumConfig,
])
