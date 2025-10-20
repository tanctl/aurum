  @genType
module RelayerRegistry = {
  module EmergencySlash = Types.MakeRegister(Types.RelayerRegistry.EmergencySlash)
  module ExecutionRecorded = Types.MakeRegister(Types.RelayerRegistry.ExecutionRecorded)
  module OwnershipTransferred = Types.MakeRegister(Types.RelayerRegistry.OwnershipTransferred)
  module RelayerRegistered = Types.MakeRegister(Types.RelayerRegistry.RelayerRegistered)
  module RelayerRestaked = Types.MakeRegister(Types.RelayerRegistry.RelayerRestaked)
  module RelayerSlashed = Types.MakeRegister(Types.RelayerRegistry.RelayerSlashed)
  module RelayerUnregistered = Types.MakeRegister(Types.RelayerRegistry.RelayerUnregistered)
  module SlashingParametersUpdated = Types.MakeRegister(Types.RelayerRegistry.SlashingParametersUpdated)
  module WithdrawalRequested = Types.MakeRegister(Types.RelayerRegistry.WithdrawalRequested)
}

  @genType
module SubscriptionManager = {
  module CrossChainPaymentInitiated = Types.MakeRegister(Types.SubscriptionManager.CrossChainPaymentInitiated)
  module NexusAttestationSubmitted = Types.MakeRegister(Types.SubscriptionManager.NexusAttestationSubmitted)
  module NexusAttestationVerified = Types.MakeRegister(Types.SubscriptionManager.NexusAttestationVerified)
  module OwnershipTransferred = Types.MakeRegister(Types.SubscriptionManager.OwnershipTransferred)
  module PaymentExecuted = Types.MakeRegister(Types.SubscriptionManager.PaymentExecuted)
  module PaymentFailed = Types.MakeRegister(Types.SubscriptionManager.PaymentFailed)
  module SubscriptionCancelled = Types.MakeRegister(Types.SubscriptionManager.SubscriptionCancelled)
  module SubscriptionCreated = Types.MakeRegister(Types.SubscriptionManager.SubscriptionCreated)
  module SubscriptionPaused = Types.MakeRegister(Types.SubscriptionManager.SubscriptionPaused)
  module SubscriptionResumed = Types.MakeRegister(Types.SubscriptionManager.SubscriptionResumed)
  module TokenAdded = Types.MakeRegister(Types.SubscriptionManager.TokenAdded)
  module TokenRemoved = Types.MakeRegister(Types.SubscriptionManager.TokenRemoved)
}

@genType /** Register a Block Handler. It'll be called for every block by default. */
let onBlock: (
  Envio.onBlockOptions<Types.chain>,
  Envio.onBlockArgs<Types.handlerContext> => promise<unit>,
) => unit = (
  EventRegister.onBlock: (unknown, Internal.onBlockArgs => promise<unit>) => unit
)->Utils.magic
