
type hyperSyncConfig = {endpointUrl: string}
type hyperFuelConfig = {endpointUrl: string}

@genType.opaque
type rpcConfig = {
  syncConfig: InternalConfig.sourceSync,
}

@genType
type syncSource = HyperSync(hyperSyncConfig) | HyperFuel(hyperFuelConfig) | Rpc(rpcConfig)

@genType.opaque
type aliasAbi = Ethers.abi

type eventName = string

type contract = {
  name: string,
  abi: aliasAbi,
  addresses: array<string>,
  events: array<eventName>,
}

type configYaml = {
  syncSource,
  startBlock: int,
  confirmedBlockThreshold: int,
  contracts: dict<contract>,
  lowercaseAddresses: bool,
}

let publicConfig = ChainMap.fromArrayUnsafe([
  {
    let contracts = Js.Dict.fromArray([
      (
        "RelayerRegistry",
        {
          name: "RelayerRegistry",
          abi: Types.RelayerRegistry.abi,
          addresses: [
            "0xD05DbfD9a66d9B388B513902c4F717B9C5E75Dd2",
          ],
          events: [
            Types.RelayerRegistry.EmergencySlash.name,
            Types.RelayerRegistry.ExecutionRecorded.name,
            Types.RelayerRegistry.OwnershipTransferred.name,
            Types.RelayerRegistry.RelayerRegistered.name,
            Types.RelayerRegistry.RelayerRestaked.name,
            Types.RelayerRegistry.RelayerSlashed.name,
            Types.RelayerRegistry.RelayerUnregistered.name,
            Types.RelayerRegistry.SlashingParametersUpdated.name,
            Types.RelayerRegistry.WithdrawalRequested.name,
          ],
        }
      ),
      (
        "SubscriptionManager",
        {
          name: "SubscriptionManager",
          abi: Types.SubscriptionManager.abi,
          addresses: [
            "0x34b058f0870Bc58E1EE82a656985766738B5cD69",
          ],
          events: [
            Types.SubscriptionManager.CrossChainPaymentInitiated.name,
            Types.SubscriptionManager.NexusAttestationSubmitted.name,
            Types.SubscriptionManager.NexusAttestationVerified.name,
            Types.SubscriptionManager.OwnershipTransferred.name,
            Types.SubscriptionManager.PaymentExecuted.name,
            Types.SubscriptionManager.PaymentFailed.name,
            Types.SubscriptionManager.SubscriptionCancelled.name,
            Types.SubscriptionManager.SubscriptionCreated.name,
            Types.SubscriptionManager.SubscriptionPaused.name,
            Types.SubscriptionManager.SubscriptionResumed.name,
            Types.SubscriptionManager.TokenAdded.name,
            Types.SubscriptionManager.TokenRemoved.name,
          ],
        }
      ),
    ])
    let chain = ChainMap.Chain.makeUnsafe(~chainId=84532)
    (
      chain,
      {
        confirmedBlockThreshold: 200,
        syncSource: HyperSync({endpointUrl: "https://84532.hypersync.xyz"}),
        startBlock: 0,
        contracts,
        lowercaseAddresses: false
      }
    )
  },
  {
    let contracts = Js.Dict.fromArray([
      (
        "SubscriptionManager",
        {
          name: "SubscriptionManager",
          abi: Types.SubscriptionManager.abi,
          addresses: [
            "0xb351Ee33129F1e3d995FE546a747F67B55fA8A17",
          ],
          events: [
            Types.SubscriptionManager.CrossChainPaymentInitiated.name,
            Types.SubscriptionManager.NexusAttestationSubmitted.name,
            Types.SubscriptionManager.NexusAttestationVerified.name,
            Types.SubscriptionManager.OwnershipTransferred.name,
            Types.SubscriptionManager.PaymentExecuted.name,
            Types.SubscriptionManager.PaymentFailed.name,
            Types.SubscriptionManager.SubscriptionCancelled.name,
            Types.SubscriptionManager.SubscriptionCreated.name,
            Types.SubscriptionManager.SubscriptionPaused.name,
            Types.SubscriptionManager.SubscriptionResumed.name,
            Types.SubscriptionManager.TokenAdded.name,
            Types.SubscriptionManager.TokenRemoved.name,
          ],
        }
      ),
      (
        "RelayerRegistry",
        {
          name: "RelayerRegistry",
          abi: Types.RelayerRegistry.abi,
          addresses: [
            "0x0aEE7395C351607954d193FC719C2648f597BD6c",
          ],
          events: [
            Types.RelayerRegistry.EmergencySlash.name,
            Types.RelayerRegistry.ExecutionRecorded.name,
            Types.RelayerRegistry.OwnershipTransferred.name,
            Types.RelayerRegistry.RelayerRegistered.name,
            Types.RelayerRegistry.RelayerRestaked.name,
            Types.RelayerRegistry.RelayerSlashed.name,
            Types.RelayerRegistry.RelayerUnregistered.name,
            Types.RelayerRegistry.SlashingParametersUpdated.name,
            Types.RelayerRegistry.WithdrawalRequested.name,
          ],
        }
      ),
    ])
    let chain = ChainMap.Chain.makeUnsafe(~chainId=11155111)
    (
      chain,
      {
        confirmedBlockThreshold: 200,
        syncSource: HyperSync({endpointUrl: "https://11155111.hypersync.xyz"}),
        startBlock: 0,
        contracts,
        lowercaseAddresses: false
      }
    )
  },
])

@genType
let getGeneratedByChainId: int => configYaml = chainId => {
  let chain = ChainMap.Chain.makeUnsafe(~chainId)
  if !(publicConfig->ChainMap.has(chain)) {
    Js.Exn.raiseError(
      "No chain with id " ++ chain->ChainMap.Chain.toString ++ " found in config.yaml",
    )
  }
  publicConfig->ChainMap.get(chain)
}
