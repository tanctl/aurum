@val external require: string => unit = "require"

let registerContractHandlers = (
  ~contractName,
  ~handlerPathRelativeToRoot,
  ~handlerPathRelativeToConfig,
) => {
  try {
    require(`../${Path.relativePathToRootFromGenerated}/${handlerPathRelativeToRoot}`)
  } catch {
  | exn =>
    let params = {
      "Contract Name": contractName,
      "Expected Handler Path": handlerPathRelativeToConfig,
      "Code": "EE500",
    }
    let logger = Logging.createChild(~params)

    let errHandler = exn->ErrorHandling.make(~msg="Failed to import handler file", ~logger)
    errHandler->ErrorHandling.log
    errHandler->ErrorHandling.raiseExn
  }
}

%%private(
  let makeGeneratedConfig = () => {
    let chains = [
      {
        let contracts = [
          {
            InternalConfig.name: "RelayerRegistry",
            abi: Types.RelayerRegistry.abi,
            addresses: [
              "0xD05DbfD9a66d9B388B513902c4F717B9C5E75Dd2"->Address.Evm.fromStringOrThrow
,
            ],
            events: [
              (Types.RelayerRegistry.EmergencySlash.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.ExecutionRecorded.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.OwnershipTransferred.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerRegistered.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerRestaked.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerSlashed.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerUnregistered.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.SlashingParametersUpdated.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.WithdrawalRequested.register() :> Internal.eventConfig),
            ],
            startBlock: None,
          },
          {
            InternalConfig.name: "SubscriptionManager",
            abi: Types.SubscriptionManager.abi,
            addresses: [
              "0x34b058f0870Bc58E1EE82a656985766738B5cD69"->Address.Evm.fromStringOrThrow
,
            ],
            events: [
              (Types.SubscriptionManager.CrossChainPaymentInitiated.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.NexusAttestationSubmitted.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.NexusAttestationVerified.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.OwnershipTransferred.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.PaymentExecuted.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.PaymentFailed.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionCancelled.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionCreated.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionPaused.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionResumed.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.TokenAdded.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.TokenRemoved.register() :> Internal.eventConfig),
            ],
            startBlock: None,
          },
        ]
        let chain = ChainMap.Chain.makeUnsafe(~chainId=84532)
        {
          InternalConfig.confirmedBlockThreshold: 200,
          startBlock: 0,
          id: 84532,
          contracts,
          sources: NetworkSources.evm(~chain, ~contracts=[{name: "RelayerRegistry",events: [Types.RelayerRegistry.EmergencySlash.register(), Types.RelayerRegistry.ExecutionRecorded.register(), Types.RelayerRegistry.OwnershipTransferred.register(), Types.RelayerRegistry.RelayerRegistered.register(), Types.RelayerRegistry.RelayerRestaked.register(), Types.RelayerRegistry.RelayerSlashed.register(), Types.RelayerRegistry.RelayerUnregistered.register(), Types.RelayerRegistry.SlashingParametersUpdated.register(), Types.RelayerRegistry.WithdrawalRequested.register()],abi: Types.RelayerRegistry.abi}, {name: "SubscriptionManager",events: [Types.SubscriptionManager.CrossChainPaymentInitiated.register(), Types.SubscriptionManager.NexusAttestationSubmitted.register(), Types.SubscriptionManager.NexusAttestationVerified.register(), Types.SubscriptionManager.OwnershipTransferred.register(), Types.SubscriptionManager.PaymentExecuted.register(), Types.SubscriptionManager.PaymentFailed.register(), Types.SubscriptionManager.SubscriptionCancelled.register(), Types.SubscriptionManager.SubscriptionCreated.register(), Types.SubscriptionManager.SubscriptionPaused.register(), Types.SubscriptionManager.SubscriptionResumed.register(), Types.SubscriptionManager.TokenAdded.register(), Types.SubscriptionManager.TokenRemoved.register()],abi: Types.SubscriptionManager.abi}], ~hyperSync=Some("https://84532.hypersync.xyz"), ~allEventSignatures=[Types.RelayerRegistry.eventSignatures, Types.SubscriptionManager.eventSignatures]->Belt.Array.concatMany, ~shouldUseHypersyncClientDecoder=true, ~rpcs=[], ~lowercaseAddresses=false)
        }
      },
      {
        let contracts = [
          {
            InternalConfig.name: "SubscriptionManager",
            abi: Types.SubscriptionManager.abi,
            addresses: [
              "0xb351Ee33129F1e3d995FE546a747F67B55fA8A17"->Address.Evm.fromStringOrThrow
,
            ],
            events: [
              (Types.SubscriptionManager.CrossChainPaymentInitiated.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.NexusAttestationSubmitted.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.NexusAttestationVerified.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.OwnershipTransferred.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.PaymentExecuted.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.PaymentFailed.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionCancelled.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionCreated.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionPaused.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.SubscriptionResumed.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.TokenAdded.register() :> Internal.eventConfig),
              (Types.SubscriptionManager.TokenRemoved.register() :> Internal.eventConfig),
            ],
            startBlock: None,
          },
          {
            InternalConfig.name: "RelayerRegistry",
            abi: Types.RelayerRegistry.abi,
            addresses: [
              "0x0aEE7395C351607954d193FC719C2648f597BD6c"->Address.Evm.fromStringOrThrow
,
            ],
            events: [
              (Types.RelayerRegistry.EmergencySlash.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.ExecutionRecorded.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.OwnershipTransferred.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerRegistered.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerRestaked.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerSlashed.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.RelayerUnregistered.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.SlashingParametersUpdated.register() :> Internal.eventConfig),
              (Types.RelayerRegistry.WithdrawalRequested.register() :> Internal.eventConfig),
            ],
            startBlock: None,
          },
        ]
        let chain = ChainMap.Chain.makeUnsafe(~chainId=11155111)
        {
          InternalConfig.confirmedBlockThreshold: 200,
          startBlock: 0,
          id: 11155111,
          contracts,
          sources: NetworkSources.evm(~chain, ~contracts=[{name: "SubscriptionManager",events: [Types.SubscriptionManager.CrossChainPaymentInitiated.register(), Types.SubscriptionManager.NexusAttestationSubmitted.register(), Types.SubscriptionManager.NexusAttestationVerified.register(), Types.SubscriptionManager.OwnershipTransferred.register(), Types.SubscriptionManager.PaymentExecuted.register(), Types.SubscriptionManager.PaymentFailed.register(), Types.SubscriptionManager.SubscriptionCancelled.register(), Types.SubscriptionManager.SubscriptionCreated.register(), Types.SubscriptionManager.SubscriptionPaused.register(), Types.SubscriptionManager.SubscriptionResumed.register(), Types.SubscriptionManager.TokenAdded.register(), Types.SubscriptionManager.TokenRemoved.register()],abi: Types.SubscriptionManager.abi}, {name: "RelayerRegistry",events: [Types.RelayerRegistry.EmergencySlash.register(), Types.RelayerRegistry.ExecutionRecorded.register(), Types.RelayerRegistry.OwnershipTransferred.register(), Types.RelayerRegistry.RelayerRegistered.register(), Types.RelayerRegistry.RelayerRestaked.register(), Types.RelayerRegistry.RelayerSlashed.register(), Types.RelayerRegistry.RelayerUnregistered.register(), Types.RelayerRegistry.SlashingParametersUpdated.register(), Types.RelayerRegistry.WithdrawalRequested.register()],abi: Types.RelayerRegistry.abi}], ~hyperSync=Some("https://11155111.hypersync.xyz"), ~allEventSignatures=[Types.SubscriptionManager.eventSignatures, Types.RelayerRegistry.eventSignatures]->Belt.Array.concatMany, ~shouldUseHypersyncClientDecoder=true, ~rpcs=[], ~lowercaseAddresses=false)
        }
      },
    ]

    Config.make(
      ~shouldRollbackOnReorg=true,
      ~shouldSaveFullHistory=false,
      ~isUnorderedMultichainMode=true,
      ~chains,
      ~enableRawEvents=false,
      ~batchSize=?Env.batchSize,
      ~preloadHandlers=true,
      ~lowercaseAddresses=false,
      ~shouldUseHypersyncClientDecoder=true,
    )
  }

  let config: ref<option<Config.t>> = ref(None)
)

let registerAllHandlers = () => {
  let configWithoutRegistrations = makeGeneratedConfig()
  EventRegister.startRegistration(
    ~ecosystem=configWithoutRegistrations.ecosystem,
    ~multichain=configWithoutRegistrations.multichain,
    ~preloadHandlers=configWithoutRegistrations.preloadHandlers,
  )

  registerContractHandlers(
    ~contractName="RelayerRegistry",
    ~handlerPathRelativeToRoot="src/EventHandlers.ts",
    ~handlerPathRelativeToConfig="src/EventHandlers.ts",
  )
  registerContractHandlers(
    ~contractName="SubscriptionManager",
    ~handlerPathRelativeToRoot="src/EventHandlers.ts",
    ~handlerPathRelativeToConfig="src/EventHandlers.ts",
  )

  let generatedConfig = {
    // Need to recreate initial config one more time,
    // since configWithoutRegistrations called register for event
    // before they were ready
    ...makeGeneratedConfig(),
    registrations: Some(EventRegister.finishRegistration()),
  }
  config := Some(generatedConfig)
  generatedConfig
}

let getConfig = () => {
  switch config.contents {
  | Some(config) => config
  | None => registerAllHandlers()
  }
}

let getConfigWithoutRegistrations = makeGeneratedConfig
