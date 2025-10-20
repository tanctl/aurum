/***** TAKE NOTE ******
This is a hack to get genType to work!

In order for genType to produce recursive types, it needs to be at the 
root module of a file. If it's defined in a nested module it does not 
work. So all the MockDb types and internal functions are defined in TestHelpers_MockDb
and only public functions are recreated and exported from this module.

the following module:
```rescript
module MyModule = {
  @genType
  type rec a = {fieldB: b}
  @genType and b = {fieldA: a}
}
```

produces the following in ts:
```ts
// tslint:disable-next-line:interface-over-type-literal
export type MyModule_a = { readonly fieldB: b };

// tslint:disable-next-line:interface-over-type-literal
export type MyModule_b = { readonly fieldA: MyModule_a };
```

fieldB references type b which doesn't exist because it's defined
as MyModule_b
*/

module MockDb = {
  @genType
  let createMockDb = TestHelpers_MockDb.createMockDb
}

@genType
module Addresses = {
  include TestHelpers_MockAddresses
}

module EventFunctions = {
  //Note these are made into a record to make operate in the same way
  //for Res, JS and TS.

  /**
  The arguements that get passed to a "processEvent" helper function
  */
  @genType
  type eventProcessorArgs<'event> = {
    event: 'event,
    mockDb: TestHelpers_MockDb.t,
    @deprecated("Set the chainId for the event instead")
    chainId?: int,
  }

  @genType
  type eventProcessor<'event> = eventProcessorArgs<'event> => promise<TestHelpers_MockDb.t>

  /**
  A function composer to help create individual processEvent functions
  */
  let makeEventProcessor = (~register) => args => {
    let {event, mockDb, ?chainId} =
      args->(Utils.magic: eventProcessorArgs<'event> => eventProcessorArgs<Internal.event>)

    // Have the line here, just in case the function is called with
    // a manually created event. We don't want to break the existing tests here.
    let _ =
      TestHelpers_MockDb.mockEventRegisters->Utils.WeakMap.set(event, register)
    TestHelpers_MockDb.makeProcessEvents(mockDb, ~chainId=?chainId)([event->(Utils.magic: Internal.event => Types.eventLog<unknown>)])
  }

  module MockBlock = {
    @genType
    type t = {
      hash?: string,
      number?: int,
      timestamp?: int,
    }

    let toBlock = (_mock: t) => {
      hash: _mock.hash->Belt.Option.getWithDefault("foo"),
      number: _mock.number->Belt.Option.getWithDefault(0),
      timestamp: _mock.timestamp->Belt.Option.getWithDefault(0),
    }->(Utils.magic: Types.AggregatedBlock.t => Internal.eventBlock)
  }

  module MockTransaction = {
    @genType
    type t = {
    }

    let toTransaction = (_mock: t) => {
    }->(Utils.magic: Types.AggregatedTransaction.t => Internal.eventTransaction)
  }

  @genType
  type mockEventData = {
    chainId?: int,
    srcAddress?: Address.t,
    logIndex?: int,
    block?: MockBlock.t,
    transaction?: MockTransaction.t,
  }

  /**
  Applies optional paramters with defaults for all common eventLog field
  */
  let makeEventMocker = (
    ~params: Internal.eventParams,
    ~mockEventData: option<mockEventData>,
    ~register: unit => Internal.eventConfig,
  ): Internal.event => {
    let {?block, ?transaction, ?srcAddress, ?chainId, ?logIndex} =
      mockEventData->Belt.Option.getWithDefault({})
    let block = block->Belt.Option.getWithDefault({})->MockBlock.toBlock
    let transaction = transaction->Belt.Option.getWithDefault({})->MockTransaction.toTransaction
    let config = RegisterHandlers.getConfig()
    let event: Internal.event = {
      params,
      transaction,
      chainId: switch chainId {
      | Some(chainId) => chainId
      | None =>
        switch config.defaultChain {
        | Some(chainConfig) => chainConfig.id
        | None =>
          Js.Exn.raiseError(
            "No default chain Id found, please add at least 1 chain to your config.yaml",
          )
        }
      },
      block,
      srcAddress: srcAddress->Belt.Option.getWithDefault(Addresses.defaultAddress),
      logIndex: logIndex->Belt.Option.getWithDefault(0),
    }
    // Since currently it's not possible to figure out the event config from the event
    // we store a reference to the register function by event in a weak map
    let _ = TestHelpers_MockDb.mockEventRegisters->Utils.WeakMap.set(event, register)
    event
  }
}


module RelayerRegistry = {
  module EmergencySlash = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.EmergencySlash.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.EmergencySlash.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("amount")
      amount?: bigint,
      @as("reason")
      reason?: string,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?amount,
        ?reason,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       amount: amount->Belt.Option.getWithDefault(0n),
       reason: reason->Belt.Option.getWithDefault("foo"),
      }
->(Utils.magic: Types.RelayerRegistry.EmergencySlash.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.EmergencySlash.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.EmergencySlash.event)
    }
  }

  module ExecutionRecorded = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.ExecutionRecorded.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.ExecutionRecorded.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("success")
      success?: bool,
      @as("feeAmount")
      feeAmount?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?success,
        ?feeAmount,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       success: success->Belt.Option.getWithDefault(false),
       feeAmount: feeAmount->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.ExecutionRecorded.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.ExecutionRecorded.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.ExecutionRecorded.event)
    }
  }

  module OwnershipTransferred = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.OwnershipTransferred.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.OwnershipTransferred.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("previousOwner")
      previousOwner?: Address.t,
      @as("newOwner")
      newOwner?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?previousOwner,
        ?newOwner,
        ?mockEventData,
      } = args

      let params = 
      {
       previousOwner: previousOwner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       newOwner: newOwner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.RelayerRegistry.OwnershipTransferred.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.OwnershipTransferred.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.OwnershipTransferred.event)
    }
  }

  module RelayerRegistered = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.RelayerRegistered.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.RelayerRegistered.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("stakedAmount")
      stakedAmount?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?stakedAmount,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       stakedAmount: stakedAmount->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.RelayerRegistered.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.RelayerRegistered.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.RelayerRegistered.event)
    }
  }

  module RelayerRestaked = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.RelayerRestaked.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.RelayerRestaked.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("amount")
      amount?: bigint,
      @as("newStake")
      newStake?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?amount,
        ?newStake,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       amount: amount->Belt.Option.getWithDefault(0n),
       newStake: newStake->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.RelayerRestaked.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.RelayerRestaked.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.RelayerRestaked.event)
    }
  }

  module RelayerSlashed = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.RelayerSlashed.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.RelayerSlashed.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("slashAmount")
      slashAmount?: bigint,
      @as("remainingStake")
      remainingStake?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?slashAmount,
        ?remainingStake,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       slashAmount: slashAmount->Belt.Option.getWithDefault(0n),
       remainingStake: remainingStake->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.RelayerSlashed.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.RelayerSlashed.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.RelayerSlashed.event)
    }
  }

  module RelayerUnregistered = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.RelayerUnregistered.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.RelayerUnregistered.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("returnedStake")
      returnedStake?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?returnedStake,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       returnedStake: returnedStake->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.RelayerUnregistered.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.RelayerUnregistered.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.RelayerUnregistered.event)
    }
  }

  module SlashingParametersUpdated = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.SlashingParametersUpdated.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.SlashingParametersUpdated.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("slashAmount")
      slashAmount?: bigint,
      @as("failureThreshold")
      failureThreshold?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?slashAmount,
        ?failureThreshold,
        ?mockEventData,
      } = args

      let params = 
      {
       slashAmount: slashAmount->Belt.Option.getWithDefault(0n),
       failureThreshold: failureThreshold->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.SlashingParametersUpdated.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.SlashingParametersUpdated.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.SlashingParametersUpdated.event)
    }
  }

  module WithdrawalRequested = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.RelayerRegistry.WithdrawalRequested.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.RelayerRegistry.WithdrawalRequested.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("relayer")
      relayer?: Address.t,
      @as("requestTime")
      requestTime?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?relayer,
        ?requestTime,
        ?mockEventData,
      } = args

      let params = 
      {
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       requestTime: requestTime->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.RelayerRegistry.WithdrawalRequested.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.RelayerRegistry.WithdrawalRequested.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.RelayerRegistry.WithdrawalRequested.event)
    }
  }

}


module SubscriptionManager = {
  module CrossChainPaymentInitiated = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.CrossChainPaymentInitiated.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.CrossChainPaymentInitiated.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      @as("subscriberToken")
      subscriberToken?: Address.t,
      @as("sourceChainId")
      sourceChainId?: bigint,
      @as("targetChainId")
      targetChainId?: bigint,
      @as("amount")
      amount?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?subscriberToken,
        ?sourceChainId,
        ?targetChainId,
        ?amount,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       subscriberToken: subscriberToken->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       sourceChainId: sourceChainId->Belt.Option.getWithDefault(0n),
       targetChainId: targetChainId->Belt.Option.getWithDefault(0n),
       amount: amount->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.SubscriptionManager.CrossChainPaymentInitiated.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.CrossChainPaymentInitiated.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.CrossChainPaymentInitiated.event)
    }
  }

  module NexusAttestationSubmitted = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.NexusAttestationSubmitted.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.NexusAttestationSubmitted.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("paymentNumber")
      paymentNumber?: bigint,
      @as("attestationId")
      attestationId?: string,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?paymentNumber,
        ?attestationId,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       paymentNumber: paymentNumber->Belt.Option.getWithDefault(0n),
       attestationId: attestationId->Belt.Option.getWithDefault("foo"),
      }
->(Utils.magic: Types.SubscriptionManager.NexusAttestationSubmitted.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.NexusAttestationSubmitted.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.NexusAttestationSubmitted.event)
    }
  }

  module NexusAttestationVerified = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.NexusAttestationVerified.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.NexusAttestationVerified.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("attestationId")
      attestationId?: string,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?attestationId,
        ?mockEventData,
      } = args

      let params = 
      {
       attestationId: attestationId->Belt.Option.getWithDefault("foo"),
      }
->(Utils.magic: Types.SubscriptionManager.NexusAttestationVerified.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.NexusAttestationVerified.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.NexusAttestationVerified.event)
    }
  }

  module OwnershipTransferred = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.OwnershipTransferred.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.OwnershipTransferred.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("previousOwner")
      previousOwner?: Address.t,
      @as("newOwner")
      newOwner?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?previousOwner,
        ?newOwner,
        ?mockEventData,
      } = args

      let params = 
      {
       previousOwner: previousOwner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       newOwner: newOwner->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.OwnershipTransferred.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.OwnershipTransferred.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.OwnershipTransferred.event)
    }
  }

  module PaymentExecuted = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.PaymentExecuted.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.PaymentExecuted.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      @as("merchant")
      merchant?: Address.t,
      @as("token")
      token?: Address.t,
      @as("paymentNumber")
      paymentNumber?: bigint,
      @as("amount")
      amount?: bigint,
      @as("fee")
      fee?: bigint,
      @as("relayer")
      relayer?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?merchant,
        ?token,
        ?paymentNumber,
        ?amount,
        ?fee,
        ?relayer,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       merchant: merchant->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       token: token->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       paymentNumber: paymentNumber->Belt.Option.getWithDefault(0n),
       amount: amount->Belt.Option.getWithDefault(0n),
       fee: fee->Belt.Option.getWithDefault(0n),
       relayer: relayer->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.PaymentExecuted.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.PaymentExecuted.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.PaymentExecuted.event)
    }
  }

  module PaymentFailed = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.PaymentFailed.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.PaymentFailed.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      @as("merchant")
      merchant?: Address.t,
      @as("amount")
      amount?: bigint,
      @as("reason")
      reason?: string,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?merchant,
        ?amount,
        ?reason,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       merchant: merchant->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       amount: amount->Belt.Option.getWithDefault(0n),
       reason: reason->Belt.Option.getWithDefault("foo"),
      }
->(Utils.magic: Types.SubscriptionManager.PaymentFailed.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.PaymentFailed.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.PaymentFailed.event)
    }
  }

  module SubscriptionCancelled = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.SubscriptionCancelled.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.SubscriptionCancelled.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      @as("merchant")
      merchant?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?merchant,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       merchant: merchant->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.SubscriptionCancelled.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.SubscriptionCancelled.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.SubscriptionCancelled.event)
    }
  }

  module SubscriptionCreated = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.SubscriptionCreated.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.SubscriptionCreated.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      @as("merchant")
      merchant?: Address.t,
      @as("token")
      token?: Address.t,
      @as("amount")
      amount?: bigint,
      @as("interval")
      interval?: bigint,
      @as("maxPayments")
      maxPayments?: bigint,
      @as("maxTotalAmount")
      maxTotalAmount?: bigint,
      @as("expiry")
      expiry?: bigint,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?merchant,
        ?token,
        ?amount,
        ?interval,
        ?maxPayments,
        ?maxTotalAmount,
        ?expiry,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       merchant: merchant->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       token: token->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
       amount: amount->Belt.Option.getWithDefault(0n),
       interval: interval->Belt.Option.getWithDefault(0n),
       maxPayments: maxPayments->Belt.Option.getWithDefault(0n),
       maxTotalAmount: maxTotalAmount->Belt.Option.getWithDefault(0n),
       expiry: expiry->Belt.Option.getWithDefault(0n),
      }
->(Utils.magic: Types.SubscriptionManager.SubscriptionCreated.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.SubscriptionCreated.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.SubscriptionCreated.event)
    }
  }

  module SubscriptionPaused = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.SubscriptionPaused.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.SubscriptionPaused.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.SubscriptionPaused.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.SubscriptionPaused.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.SubscriptionPaused.event)
    }
  }

  module SubscriptionResumed = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.SubscriptionResumed.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.SubscriptionResumed.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("subscriptionId")
      subscriptionId?: string,
      @as("subscriber")
      subscriber?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?subscriptionId,
        ?subscriber,
        ?mockEventData,
      } = args

      let params = 
      {
       subscriptionId: subscriptionId->Belt.Option.getWithDefault("foo"),
       subscriber: subscriber->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.SubscriptionResumed.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.SubscriptionResumed.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.SubscriptionResumed.event)
    }
  }

  module TokenAdded = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.TokenAdded.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.TokenAdded.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("token")
      token?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?token,
        ?mockEventData,
      } = args

      let params = 
      {
       token: token->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.TokenAdded.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.TokenAdded.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.TokenAdded.event)
    }
  }

  module TokenRemoved = {
    @genType
    let processEvent: EventFunctions.eventProcessor<Types.SubscriptionManager.TokenRemoved.event> = EventFunctions.makeEventProcessor(
      ~register=(Types.SubscriptionManager.TokenRemoved.register :> unit => Internal.eventConfig),
    )

    @genType
    type createMockArgs = {
      @as("token")
      token?: Address.t,
      mockEventData?: EventFunctions.mockEventData,
    }

    @genType
    let createMockEvent = args => {
      let {
        ?token,
        ?mockEventData,
      } = args

      let params = 
      {
       token: token->Belt.Option.getWithDefault(TestHelpers_MockAddresses.defaultAddress),
      }
->(Utils.magic: Types.SubscriptionManager.TokenRemoved.eventArgs => Internal.eventParams)

      EventFunctions.makeEventMocker(
        ~params,
        ~mockEventData,
        ~register=(Types.SubscriptionManager.TokenRemoved.register :> unit => Internal.eventConfig),
      )->(Utils.magic: Internal.event => Types.SubscriptionManager.TokenRemoved.event)
    }
  }

}

