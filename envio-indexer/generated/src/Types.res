//*************
//***ENTITIES**
//*************
@genType.as("Id")
type id = string

@genType
type contractRegistrations = {
  log: Envio.logger,
  // TODO: only add contracts we've registered for the event in the config
  addRelayerRegistry: (Address.t) => unit,
  addSubscriptionManager: (Address.t) => unit,
}

@genType
type entityHandlerContext<'entity, 'indexedFieldOperations> = {
  get: id => promise<option<'entity>>,
  getOrThrow: (id, ~message: string=?) => promise<'entity>,
  getWhere: 'indexedFieldOperations,
  getOrCreate: ('entity) => promise<'entity>,
  set: 'entity => unit,
  deleteUnsafe: id => unit,
}

@genType.import(("./Types.ts", "HandlerContext"))
type handlerContext = {
  log: Envio.logger,
  effect: 'input 'output. (Envio.effect<'input, 'output>, 'input) => promise<'output>,
  isPreload: bool,
  @as("CrossChainAttestation") crossChainAttestation: entityHandlerContext<Entities.CrossChainAttestation.t, Entities.CrossChainAttestation.indexedFieldOperations>,
  @as("IndexerMeta") indexerMeta: entityHandlerContext<Entities.IndexerMeta.t, Entities.IndexerMeta.indexedFieldOperations>,
  @as("Intent") intent: entityHandlerContext<Entities.Intent.t, Entities.Intent.indexedFieldOperations>,
  @as("MerchantPerformance") merchantPerformance: entityHandlerContext<Entities.MerchantPerformance.t, Entities.MerchantPerformance.indexedFieldOperations>,
  @as("MerchantTokenStats") merchantTokenStats: entityHandlerContext<Entities.MerchantTokenStats.t, Entities.MerchantTokenStats.indexedFieldOperations>,
  @as("Payment") payment: entityHandlerContext<Entities.Payment.t, Entities.Payment.indexedFieldOperations>,
  @as("RelayerPerformance") relayerPerformance: entityHandlerContext<Entities.RelayerPerformance.t, Entities.RelayerPerformance.indexedFieldOperations>,
  @as("RelayerRegistry_EmergencySlash") relayerRegistry_EmergencySlash: entityHandlerContext<Entities.RelayerRegistry_EmergencySlash.t, Entities.RelayerRegistry_EmergencySlash.indexedFieldOperations>,
  @as("RelayerRegistry_ExecutionRecorded") relayerRegistry_ExecutionRecorded: entityHandlerContext<Entities.RelayerRegistry_ExecutionRecorded.t, Entities.RelayerRegistry_ExecutionRecorded.indexedFieldOperations>,
  @as("RelayerRegistry_OwnershipTransferred") relayerRegistry_OwnershipTransferred: entityHandlerContext<Entities.RelayerRegistry_OwnershipTransferred.t, Entities.RelayerRegistry_OwnershipTransferred.indexedFieldOperations>,
  @as("RelayerRegistry_RelayerRegistered") relayerRegistry_RelayerRegistered: entityHandlerContext<Entities.RelayerRegistry_RelayerRegistered.t, Entities.RelayerRegistry_RelayerRegistered.indexedFieldOperations>,
  @as("RelayerRegistry_RelayerRestaked") relayerRegistry_RelayerRestaked: entityHandlerContext<Entities.RelayerRegistry_RelayerRestaked.t, Entities.RelayerRegistry_RelayerRestaked.indexedFieldOperations>,
  @as("RelayerRegistry_RelayerSlashed") relayerRegistry_RelayerSlashed: entityHandlerContext<Entities.RelayerRegistry_RelayerSlashed.t, Entities.RelayerRegistry_RelayerSlashed.indexedFieldOperations>,
  @as("RelayerRegistry_RelayerUnregistered") relayerRegistry_RelayerUnregistered: entityHandlerContext<Entities.RelayerRegistry_RelayerUnregistered.t, Entities.RelayerRegistry_RelayerUnregistered.indexedFieldOperations>,
  @as("RelayerRegistry_SlashingParametersUpdated") relayerRegistry_SlashingParametersUpdated: entityHandlerContext<Entities.RelayerRegistry_SlashingParametersUpdated.t, Entities.RelayerRegistry_SlashingParametersUpdated.indexedFieldOperations>,
  @as("RelayerRegistry_WithdrawalRequested") relayerRegistry_WithdrawalRequested: entityHandlerContext<Entities.RelayerRegistry_WithdrawalRequested.t, Entities.RelayerRegistry_WithdrawalRequested.indexedFieldOperations>,
  @as("SubscriberStats") subscriberStats: entityHandlerContext<Entities.SubscriberStats.t, Entities.SubscriberStats.indexedFieldOperations>,
  @as("SubscribtionManager_CrossChainPaymentInitiated") subscribtionManager_CrossChainPaymentInitiated: entityHandlerContext<Entities.SubscribtionManager_CrossChainPaymentInitiated.t, Entities.SubscribtionManager_CrossChainPaymentInitiated.indexedFieldOperations>,
  @as("SubscribtionManager_NexusAttestationSubmitted") subscribtionManager_NexusAttestationSubmitted: entityHandlerContext<Entities.SubscribtionManager_NexusAttestationSubmitted.t, Entities.SubscribtionManager_NexusAttestationSubmitted.indexedFieldOperations>,
  @as("SubscribtionManager_NexusAttestationVerified") subscribtionManager_NexusAttestationVerified: entityHandlerContext<Entities.SubscribtionManager_NexusAttestationVerified.t, Entities.SubscribtionManager_NexusAttestationVerified.indexedFieldOperations>,
  @as("SubscribtionManager_OwnershipTransferred") subscribtionManager_OwnershipTransferred: entityHandlerContext<Entities.SubscribtionManager_OwnershipTransferred.t, Entities.SubscribtionManager_OwnershipTransferred.indexedFieldOperations>,
  @as("SubscribtionManager_PaymentExecuted") subscribtionManager_PaymentExecuted: entityHandlerContext<Entities.SubscribtionManager_PaymentExecuted.t, Entities.SubscribtionManager_PaymentExecuted.indexedFieldOperations>,
  @as("SubscribtionManager_PaymentFailed") subscribtionManager_PaymentFailed: entityHandlerContext<Entities.SubscribtionManager_PaymentFailed.t, Entities.SubscribtionManager_PaymentFailed.indexedFieldOperations>,
  @as("SubscribtionManager_SubscriptionCancelled") subscribtionManager_SubscriptionCancelled: entityHandlerContext<Entities.SubscribtionManager_SubscriptionCancelled.t, Entities.SubscribtionManager_SubscriptionCancelled.indexedFieldOperations>,
  @as("SubscribtionManager_SubscriptionCreated") subscribtionManager_SubscriptionCreated: entityHandlerContext<Entities.SubscribtionManager_SubscriptionCreated.t, Entities.SubscribtionManager_SubscriptionCreated.indexedFieldOperations>,
  @as("SubscribtionManager_SubscriptionPaused") subscribtionManager_SubscriptionPaused: entityHandlerContext<Entities.SubscribtionManager_SubscriptionPaused.t, Entities.SubscribtionManager_SubscriptionPaused.indexedFieldOperations>,
  @as("SubscribtionManager_SubscriptionResumed") subscribtionManager_SubscriptionResumed: entityHandlerContext<Entities.SubscribtionManager_SubscriptionResumed.t, Entities.SubscribtionManager_SubscriptionResumed.indexedFieldOperations>,
  @as("SubscribtionManager_TokenAdded") subscribtionManager_TokenAdded: entityHandlerContext<Entities.SubscribtionManager_TokenAdded.t, Entities.SubscribtionManager_TokenAdded.indexedFieldOperations>,
  @as("SubscribtionManager_TokenRemoved") subscribtionManager_TokenRemoved: entityHandlerContext<Entities.SubscribtionManager_TokenRemoved.t, Entities.SubscribtionManager_TokenRemoved.indexedFieldOperations>,
  @as("Subscription") subscription: entityHandlerContext<Entities.Subscription.t, Entities.Subscription.indexedFieldOperations>,
}

//Re-exporting types for backwards compatability
@genType.as("CrossChainAttestation")
type crossChainAttestation = Entities.CrossChainAttestation.t
@genType.as("IndexerMeta")
type indexerMeta = Entities.IndexerMeta.t
@genType.as("Intent")
type intent = Entities.Intent.t
@genType.as("MerchantPerformance")
type merchantPerformance = Entities.MerchantPerformance.t
@genType.as("MerchantTokenStats")
type merchantTokenStats = Entities.MerchantTokenStats.t
@genType.as("Payment")
type payment = Entities.Payment.t
@genType.as("RelayerPerformance")
type relayerPerformance = Entities.RelayerPerformance.t
@genType.as("RelayerRegistry_EmergencySlash")
type relayerRegistry_EmergencySlash = Entities.RelayerRegistry_EmergencySlash.t
@genType.as("RelayerRegistry_ExecutionRecorded")
type relayerRegistry_ExecutionRecorded = Entities.RelayerRegistry_ExecutionRecorded.t
@genType.as("RelayerRegistry_OwnershipTransferred")
type relayerRegistry_OwnershipTransferred = Entities.RelayerRegistry_OwnershipTransferred.t
@genType.as("RelayerRegistry_RelayerRegistered")
type relayerRegistry_RelayerRegistered = Entities.RelayerRegistry_RelayerRegistered.t
@genType.as("RelayerRegistry_RelayerRestaked")
type relayerRegistry_RelayerRestaked = Entities.RelayerRegistry_RelayerRestaked.t
@genType.as("RelayerRegistry_RelayerSlashed")
type relayerRegistry_RelayerSlashed = Entities.RelayerRegistry_RelayerSlashed.t
@genType.as("RelayerRegistry_RelayerUnregistered")
type relayerRegistry_RelayerUnregistered = Entities.RelayerRegistry_RelayerUnregistered.t
@genType.as("RelayerRegistry_SlashingParametersUpdated")
type relayerRegistry_SlashingParametersUpdated = Entities.RelayerRegistry_SlashingParametersUpdated.t
@genType.as("RelayerRegistry_WithdrawalRequested")
type relayerRegistry_WithdrawalRequested = Entities.RelayerRegistry_WithdrawalRequested.t
@genType.as("SubscriberStats")
type subscriberStats = Entities.SubscriberStats.t
@genType.as("SubscribtionManager_CrossChainPaymentInitiated")
type subscribtionManager_CrossChainPaymentInitiated = Entities.SubscribtionManager_CrossChainPaymentInitiated.t
@genType.as("SubscribtionManager_NexusAttestationSubmitted")
type subscribtionManager_NexusAttestationSubmitted = Entities.SubscribtionManager_NexusAttestationSubmitted.t
@genType.as("SubscribtionManager_NexusAttestationVerified")
type subscribtionManager_NexusAttestationVerified = Entities.SubscribtionManager_NexusAttestationVerified.t
@genType.as("SubscribtionManager_OwnershipTransferred")
type subscribtionManager_OwnershipTransferred = Entities.SubscribtionManager_OwnershipTransferred.t
@genType.as("SubscribtionManager_PaymentExecuted")
type subscribtionManager_PaymentExecuted = Entities.SubscribtionManager_PaymentExecuted.t
@genType.as("SubscribtionManager_PaymentFailed")
type subscribtionManager_PaymentFailed = Entities.SubscribtionManager_PaymentFailed.t
@genType.as("SubscribtionManager_SubscriptionCancelled")
type subscribtionManager_SubscriptionCancelled = Entities.SubscribtionManager_SubscriptionCancelled.t
@genType.as("SubscribtionManager_SubscriptionCreated")
type subscribtionManager_SubscriptionCreated = Entities.SubscribtionManager_SubscriptionCreated.t
@genType.as("SubscribtionManager_SubscriptionPaused")
type subscribtionManager_SubscriptionPaused = Entities.SubscribtionManager_SubscriptionPaused.t
@genType.as("SubscribtionManager_SubscriptionResumed")
type subscribtionManager_SubscriptionResumed = Entities.SubscribtionManager_SubscriptionResumed.t
@genType.as("SubscribtionManager_TokenAdded")
type subscribtionManager_TokenAdded = Entities.SubscribtionManager_TokenAdded.t
@genType.as("SubscribtionManager_TokenRemoved")
type subscribtionManager_TokenRemoved = Entities.SubscribtionManager_TokenRemoved.t
@genType.as("Subscription")
type subscription = Entities.Subscription.t

type eventIdentifier = {
  chainId: int,
  blockTimestamp: int,
  blockNumber: int,
  logIndex: int,
}

type entityUpdateAction<'entityType> =
  | Set('entityType)
  | Delete

type entityUpdate<'entityType> = {
  eventIdentifier: eventIdentifier,
  entityId: id,
  entityUpdateAction: entityUpdateAction<'entityType>,
}

let mkEntityUpdate = (~eventIdentifier, ~entityId, entityUpdateAction) => {
  entityId,
  eventIdentifier,
  entityUpdateAction,
}

type entityValueAtStartOfBatch<'entityType> =
  | NotSet // The entity isn't in the DB yet
  | AlreadySet('entityType)

type updatedValue<'entityType> = {
  latest: entityUpdate<'entityType>,
  history: array<entityUpdate<'entityType>>,
  // In the event of a rollback, some entity updates may have been
  // been affected by a rollback diff. If there was no rollback diff
  // this will always be false.
  // If there was a rollback diff, this will be false in the case of a
  // new entity update (where entity affected is not present in the diff) b
  // but true if the update is related to an entity that is
  // currently present in the diff
  containsRollbackDiffChange: bool,
}

@genType
type inMemoryStoreRowEntity<'entityType> =
  | Updated(updatedValue<'entityType>)
  | InitialReadFromDb(entityValueAtStartOfBatch<'entityType>) // This means there is no change from the db.

//*************
//**CONTRACTS**
//*************

module Transaction = {
  @genType
  type t = {}

  let schema = S.object((_): t => {})
}

module Block = {
  @genType
  type t = {number: int, timestamp: int, hash: string}

  let schema = S.object((s): t => {number: s.field("number", S.int), timestamp: s.field("timestamp", S.int), hash: s.field("hash", S.string)})

  @get
  external getNumber: Internal.eventBlock => int = "number"

  @get
  external getTimestamp: Internal.eventBlock => int = "timestamp"
 
  @get
  external getId: Internal.eventBlock => string = "hash"

  let cleanUpRawEventFieldsInPlace: Js.Json.t => () = %raw(`fields => {
    delete fields.hash
    delete fields.number
    delete fields.timestamp
  }`)
}

module AggregatedBlock = {
  @genType
  type t = {hash: string, number: int, timestamp: int}
}
module AggregatedTransaction = {
  @genType
  type t = {}
}

@genType.as("EventLog")
type eventLog<'params> = Internal.genericEvent<'params, Block.t, Transaction.t>

module SingleOrMultiple: {
  @genType.import(("./bindings/OpaqueTypes", "SingleOrMultiple"))
  type t<'a>
  let normalizeOrThrow: (t<'a>, ~nestedArrayDepth: int=?) => array<'a>
  let single: 'a => t<'a>
  let multiple: array<'a> => t<'a>
} = {
  type t<'a> = Js.Json.t

  external single: 'a => t<'a> = "%identity"
  external multiple: array<'a> => t<'a> = "%identity"
  external castMultiple: t<'a> => array<'a> = "%identity"
  external castSingle: t<'a> => 'a = "%identity"

  exception AmbiguousEmptyNestedArray

  let rec isMultiple = (t: t<'a>, ~nestedArrayDepth): bool =>
    switch t->Js.Json.decodeArray {
    | None => false
    | Some(_arr) if nestedArrayDepth == 0 => true
    | Some([]) if nestedArrayDepth > 0 =>
      AmbiguousEmptyNestedArray->ErrorHandling.mkLogAndRaise(
        ~msg="The given empty array could be interperated as a flat array (value) or nested array. Since it's ambiguous,
        please pass in a nested empty array if the intention is to provide an empty array as a value",
      )
    | Some(arr) => arr->Js.Array2.unsafe_get(0)->isMultiple(~nestedArrayDepth=nestedArrayDepth - 1)
    }

  let normalizeOrThrow = (t: t<'a>, ~nestedArrayDepth=0): array<'a> => {
    if t->isMultiple(~nestedArrayDepth) {
      t->castMultiple
    } else {
      [t->castSingle]
    }
  }
}

module HandlerTypes = {
  @genType
  type args<'eventArgs, 'context> = {
    event: eventLog<'eventArgs>,
    context: 'context,
  }

  @genType
  type contractRegisterArgs<'eventArgs> = Internal.genericContractRegisterArgs<eventLog<'eventArgs>, contractRegistrations>
  @genType
  type contractRegister<'eventArgs> = Internal.genericContractRegister<contractRegisterArgs<'eventArgs>>


  @genType
  type eventConfig<'eventFilters> = Internal.eventOptions<'eventFilters>
}

module type Event = {
  type event

  let handlerRegister: EventRegister.t

  type eventFilters
}

@genType.import(("./bindings/OpaqueTypes.ts", "HandlerWithOptions"))
type fnWithEventConfig<'fn, 'eventConfig> = ('fn, ~eventConfig: 'eventConfig=?) => unit

type handlerWithOptions<'eventArgs, 'eventFilters> = fnWithEventConfig<
  Internal.genericHandler<'eventArgs>,
  HandlerTypes.eventConfig<'eventFilters>,
>

@genType
type contractRegisterWithOptions<'eventArgs, 'eventFilters> = fnWithEventConfig<
  HandlerTypes.contractRegister<'eventArgs>,
  HandlerTypes.eventConfig<'eventFilters>,
>

module MakeRegister = (Event: Event) => {
  let contractRegister: fnWithEventConfig<
    Internal.genericContractRegister<
      Internal.genericContractRegisterArgs<Event.event, contractRegistrations>,
    >,
    HandlerTypes.eventConfig<Event.eventFilters>,
  > = (contractRegister, ~eventConfig=?) =>
    Event.handlerRegister->EventRegister.setContractRegister(
      contractRegister,
      ~eventOptions=eventConfig,
    )

  let handler: fnWithEventConfig<
    Internal.genericHandler<Internal.genericHandlerArgs<Event.event, handlerContext, unit>>,
    HandlerTypes.eventConfig<Event.eventFilters>,
  > = (handler, ~eventConfig=?) => {
    Event.handlerRegister->EventRegister.setHandler(
      handler->(
        Utils.magic: Internal.genericHandler<
          Internal.genericHandlerArgs<Event.event, handlerContext, unit>,
        > => Internal.genericHandler<
          Internal.genericHandlerArgs<Event.event, Internal.handlerContext, 'a>,
        >
      ),
      ~eventOptions=eventConfig,
    )
  }
}

module RelayerRegistry = {
let abi = Ethers.makeAbi((%raw(`[{"type":"event","name":"EmergencySlash","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false},{"name":"reason","type":"string","indexed":false}],"anonymous":false},{"type":"event","name":"ExecutionRecorded","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"success","type":"bool","indexed":false},{"name":"feeAmount","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true},{"name":"newOwner","type":"address","indexed":true}],"anonymous":false},{"type":"event","name":"RelayerRegistered","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"stakedAmount","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"RelayerRestaked","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false},{"name":"newStake","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"RelayerSlashed","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"slashAmount","type":"uint256","indexed":false},{"name":"remainingStake","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"RelayerUnregistered","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"returnedStake","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"SlashingParametersUpdated","inputs":[{"name":"slashAmount","type":"uint256","indexed":false},{"name":"failureThreshold","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"WithdrawalRequested","inputs":[{"name":"relayer","type":"address","indexed":true},{"name":"requestTime","type":"uint256","indexed":false}],"anonymous":false}]`): Js.Json.t))
let eventSignatures = ["EmergencySlash(address indexed relayer, uint256 amount, string reason)", "ExecutionRecorded(address indexed relayer, bool success, uint256 feeAmount)", "OwnershipTransferred(address indexed previousOwner, address indexed newOwner)", "RelayerRegistered(address indexed relayer, uint256 stakedAmount)", "RelayerRestaked(address indexed relayer, uint256 amount, uint256 newStake)", "RelayerSlashed(address indexed relayer, uint256 slashAmount, uint256 remainingStake)", "RelayerUnregistered(address indexed relayer, uint256 returnedStake)", "SlashingParametersUpdated(uint256 slashAmount, uint256 failureThreshold)", "WithdrawalRequested(address indexed relayer, uint256 requestTime)"]
@genType type chainId = [#84532 | #11155111]
let contractName = "RelayerRegistry"

module EmergencySlash = {

let id = "0xb29f077e0f1bff1879b3429feea103b77c429db336ffc4f31154f266038a5c9c_2"
let sighash = "0xb29f077e0f1bff1879b3429feea103b77c429db336ffc4f31154f266038a5c9c"
let name = "EmergencySlash"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, amount: bigint, reason: string}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), amount: s.field("amount", BigInt.schema), reason: s.field("reason", S.string)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, amount: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, reason: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module ExecutionRecorded = {

let id = "0xc799a6e963130dbc0f01e269475a49a5da606f63b2f40ae03f66e7af42076295_2"
let sighash = "0xc799a6e963130dbc0f01e269475a49a5da606f63b2f40ae03f66e7af42076295"
let name = "ExecutionRecorded"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, success: bool, feeAmount: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), success: s.field("success", S.bool), feeAmount: s.field("feeAmount", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, success: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, feeAmount: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module OwnershipTransferred = {

let id = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0_3"
let sighash = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
let name = "OwnershipTransferred"
let contractName = contractName

@genType
type eventArgs = {previousOwner: Address.t, newOwner: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {previousOwner: s.field("previousOwner", Address.schema), newOwner: s.field("newOwner", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("previousOwner") previousOwner?: SingleOrMultiple.t<Address.t>, @as("newOwner") newOwner?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["previousOwner","newOwner",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("previousOwner")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("newOwner")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {previousOwner: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, newOwner: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module RelayerRegistered = {

let id = "0x193a79fd17752d71da6eaba98e99be182b006d3e3178dd96b26a52f905e23e7d_2"
let sighash = "0x193a79fd17752d71da6eaba98e99be182b006d3e3178dd96b26a52f905e23e7d"
let name = "RelayerRegistered"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, stakedAmount: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), stakedAmount: s.field("stakedAmount", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, stakedAmount: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module RelayerRestaked = {

let id = "0x610e5fc0d3114f2abb2801d5c0fdd8f3db27b0fbbf30da68155090bb63a17785_2"
let sighash = "0x610e5fc0d3114f2abb2801d5c0fdd8f3db27b0fbbf30da68155090bb63a17785"
let name = "RelayerRestaked"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, amount: bigint, newStake: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), amount: s.field("amount", BigInt.schema), newStake: s.field("newStake", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, amount: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, newStake: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module RelayerSlashed = {

let id = "0x4ccd10aa8a641e19c262018438ab4cbaa91e683a875ddd178515bc2cc6869ec6_2"
let sighash = "0x4ccd10aa8a641e19c262018438ab4cbaa91e683a875ddd178515bc2cc6869ec6"
let name = "RelayerSlashed"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, slashAmount: bigint, remainingStake: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), slashAmount: s.field("slashAmount", BigInt.schema), remainingStake: s.field("remainingStake", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, slashAmount: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, remainingStake: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module RelayerUnregistered = {

let id = "0x1febc9d304fb99c3cd8bc5ffe8b9219d7676ffad2aa8cfa3a8286ea93092244c_2"
let sighash = "0x1febc9d304fb99c3cd8bc5ffe8b9219d7676ffad2aa8cfa3a8286ea93092244c"
let name = "RelayerUnregistered"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, returnedStake: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), returnedStake: s.field("returnedStake", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, returnedStake: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module SlashingParametersUpdated = {

let id = "0xcaf538385e067c71f144fcab1890f637fa60fb1ab456f6a023a4c9427df9deb7_1"
let sighash = "0xcaf538385e067c71f144fcab1890f637fa60fb1ab456f6a023a4c9427df9deb7"
let name = "SlashingParametersUpdated"
let contractName = contractName

@genType
type eventArgs = {slashAmount: bigint, failureThreshold: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {slashAmount: s.field("slashAmount", BigInt.schema), failureThreshold: s.field("failureThreshold", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {}

@genType type eventFilters = Internal.noEventFilters

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=[])
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {slashAmount: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, failureThreshold: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module WithdrawalRequested = {

let id = "0xe670e4e82118d22a1f9ee18920455ebc958bae26a90a05d31d3378788b1b0e44_2"
let sighash = "0xe670e4e82118d22a1f9ee18920455ebc958bae26a90a05d31d3378788b1b0e44"
let name = "WithdrawalRequested"
let contractName = contractName

@genType
type eventArgs = {relayer: Address.t, requestTime: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {relayer: s.field("relayer", Address.schema), requestTime: s.field("requestTime", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("relayer") relayer?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["relayer",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("relayer")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {relayer: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, requestTime: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}
}

module SubscriptionManager = {
let abi = Ethers.makeAbi((%raw(`[{"type":"event","name":"CrossChainPaymentInitiated","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true},{"name":"subscriberToken","type":"address","indexed":false},{"name":"sourceChainId","type":"uint256","indexed":false},{"name":"targetChainId","type":"uint256","indexed":false},{"name":"amount","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"NexusAttestationSubmitted","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"paymentNumber","type":"uint256","indexed":true},{"name":"attestationId","type":"string","indexed":false}],"anonymous":false},{"type":"event","name":"NexusAttestationVerified","inputs":[{"name":"attestationId","type":"string","indexed":true}],"anonymous":false},{"type":"event","name":"OwnershipTransferred","inputs":[{"name":"previousOwner","type":"address","indexed":true},{"name":"newOwner","type":"address","indexed":true}],"anonymous":false},{"type":"event","name":"PaymentExecuted","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true},{"name":"merchant","type":"address","indexed":true},{"name":"token","type":"address","indexed":false},{"name":"paymentNumber","type":"uint256","indexed":false},{"name":"amount","type":"uint256","indexed":false},{"name":"fee","type":"uint256","indexed":false},{"name":"relayer","type":"address","indexed":false}],"anonymous":false},{"type":"event","name":"PaymentFailed","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true},{"name":"merchant","type":"address","indexed":true},{"name":"amount","type":"uint256","indexed":false},{"name":"reason","type":"string","indexed":false}],"anonymous":false},{"type":"event","name":"SubscriptionCancelled","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true},{"name":"merchant","type":"address","indexed":true}],"anonymous":false},{"type":"event","name":"SubscriptionCreated","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true},{"name":"merchant","type":"address","indexed":true},{"name":"token","type":"address","indexed":false},{"name":"amount","type":"uint256","indexed":false},{"name":"interval","type":"uint256","indexed":false},{"name":"maxPayments","type":"uint256","indexed":false},{"name":"maxTotalAmount","type":"uint256","indexed":false},{"name":"expiry","type":"uint256","indexed":false}],"anonymous":false},{"type":"event","name":"SubscriptionPaused","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true}],"anonymous":false},{"type":"event","name":"SubscriptionResumed","inputs":[{"name":"subscriptionId","type":"bytes32","indexed":true},{"name":"subscriber","type":"address","indexed":true}],"anonymous":false},{"type":"event","name":"TokenAdded","inputs":[{"name":"token","type":"address","indexed":true}],"anonymous":false},{"type":"event","name":"TokenRemoved","inputs":[{"name":"token","type":"address","indexed":true}],"anonymous":false}]`): Js.Json.t))
let eventSignatures = ["CrossChainPaymentInitiated(bytes32 indexed subscriptionId, address indexed subscriber, address subscriberToken, uint256 sourceChainId, uint256 targetChainId, uint256 amount)", "NexusAttestationSubmitted(bytes32 indexed subscriptionId, uint256 indexed paymentNumber, string attestationId)", "NexusAttestationVerified(string indexed attestationId)", "OwnershipTransferred(address indexed previousOwner, address indexed newOwner)", "PaymentExecuted(bytes32 indexed subscriptionId, address indexed subscriber, address indexed merchant, address token, uint256 paymentNumber, uint256 amount, uint256 fee, address relayer)", "PaymentFailed(bytes32 indexed subscriptionId, address indexed subscriber, address indexed merchant, uint256 amount, string reason)", "SubscriptionCancelled(bytes32 indexed subscriptionId, address indexed subscriber, address indexed merchant)", "SubscriptionCreated(bytes32 indexed subscriptionId, address indexed subscriber, address indexed merchant, address token, uint256 amount, uint256 interval, uint256 maxPayments, uint256 maxTotalAmount, uint256 expiry)", "SubscriptionPaused(bytes32 indexed subscriptionId, address indexed subscriber)", "SubscriptionResumed(bytes32 indexed subscriptionId, address indexed subscriber)", "TokenAdded(address indexed token)", "TokenRemoved(address indexed token)"]
@genType type chainId = [#84532 | #11155111]
let contractName = "SubscriptionManager"

module CrossChainPaymentInitiated = {

let id = "0xf390aa1a770332a917bd81866f7b23763fbc5ecd678d2a64a87b1e59e2d8cd4d_3"
let sighash = "0xf390aa1a770332a917bd81866f7b23763fbc5ecd678d2a64a87b1e59e2d8cd4d"
let name = "CrossChainPaymentInitiated"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t, subscriberToken: Address.t, sourceChainId: bigint, targetChainId: bigint, amount: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema), subscriberToken: s.field("subscriberToken", Address.schema), sourceChainId: s.field("sourceChainId", BigInt.schema), targetChainId: s.field("targetChainId", BigInt.schema), amount: s.field("amount", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriberToken: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, sourceChainId: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, targetChainId: decodedEvent.body->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, amount: decodedEvent.body->Js.Array2.unsafe_get(3)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module NexusAttestationSubmitted = {

let id = "0xa71dd30f67c8fd0d0ca44df679fad2e87b7cf3ddaefc5e999461cd952ea63de9_3"
let sighash = "0xa71dd30f67c8fd0d0ca44df679fad2e87b7cf3ddaefc5e999461cd952ea63de9"
let name = "NexusAttestationSubmitted"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, paymentNumber: bigint, attestationId: string}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), paymentNumber: s.field("paymentNumber", BigInt.schema), attestationId: s.field("attestationId", S.string)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("paymentNumber") paymentNumber?: SingleOrMultiple.t<bigint>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","paymentNumber",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("paymentNumber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromBigInt)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, paymentNumber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, attestationId: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module NexusAttestationVerified = {

let id = "0xfa4f9f82c6a5ad76b2cc384005ed38bcfd9d3fe06d406ec60fc74160d128aef2_2"
let sighash = "0xfa4f9f82c6a5ad76b2cc384005ed38bcfd9d3fe06d406ec60fc74160d128aef2"
let name = "NexusAttestationVerified"
let contractName = contractName

@genType
type eventArgs = {attestationId: string}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {attestationId: s.field("attestationId", S.string)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("attestationId") attestationId?: SingleOrMultiple.t<string>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["attestationId",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("attestationId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map((value) => TopicFilter.keccak256(value->TopicFilter.castToHexUnsafe))))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {attestationId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module OwnershipTransferred = {

let id = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0_3"
let sighash = "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
let name = "OwnershipTransferred"
let contractName = contractName

@genType
type eventArgs = {previousOwner: Address.t, newOwner: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {previousOwner: s.field("previousOwner", Address.schema), newOwner: s.field("newOwner", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("previousOwner") previousOwner?: SingleOrMultiple.t<Address.t>, @as("newOwner") newOwner?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["previousOwner","newOwner",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("previousOwner")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("newOwner")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {previousOwner: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, newOwner: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module PaymentExecuted = {

let id = "0x8edd31b1042c3b68388248a57905bb81bd5b2abd7334d9e2cee14b88a479a23d_4"
let sighash = "0x8edd31b1042c3b68388248a57905bb81bd5b2abd7334d9e2cee14b88a479a23d"
let name = "PaymentExecuted"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t, merchant: Address.t, token: Address.t, paymentNumber: bigint, amount: bigint, fee: bigint, relayer: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema), merchant: s.field("merchant", Address.schema), token: s.field("token", Address.schema), paymentNumber: s.field("paymentNumber", BigInt.schema), amount: s.field("amount", BigInt.schema), fee: s.field("fee", BigInt.schema), relayer: s.field("relayer", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>, @as("merchant") merchant?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber","merchant",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)), ~topic3=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("merchant")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, merchant: decodedEvent.indexed->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, token: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, paymentNumber: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, amount: decodedEvent.body->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, fee: decodedEvent.body->Js.Array2.unsafe_get(3)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, relayer: decodedEvent.body->Js.Array2.unsafe_get(4)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module PaymentFailed = {

let id = "0x8d07bb7d7ffc0fde6ebc3e0e718c1fdbfac73eb7ea593da5566fa86a1c3c1a30_4"
let sighash = "0x8d07bb7d7ffc0fde6ebc3e0e718c1fdbfac73eb7ea593da5566fa86a1c3c1a30"
let name = "PaymentFailed"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t, merchant: Address.t, amount: bigint, reason: string}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema), merchant: s.field("merchant", Address.schema), amount: s.field("amount", BigInt.schema), reason: s.field("reason", S.string)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>, @as("merchant") merchant?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber","merchant",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)), ~topic3=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("merchant")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, merchant: decodedEvent.indexed->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, amount: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, reason: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module SubscriptionCancelled = {

let id = "0x8065a33ad053d617d51579685a263b0f7c6ec05931dbc0280bfda3a784208959_4"
let sighash = "0x8065a33ad053d617d51579685a263b0f7c6ec05931dbc0280bfda3a784208959"
let name = "SubscriptionCancelled"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t, merchant: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema), merchant: s.field("merchant", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>, @as("merchant") merchant?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber","merchant",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)), ~topic3=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("merchant")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, merchant: decodedEvent.indexed->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module SubscriptionCreated = {

let id = "0xb76f505b43aee5831d9f29bf6332a7aa4e48e7016819fbd63de7dbace080f049_4"
let sighash = "0xb76f505b43aee5831d9f29bf6332a7aa4e48e7016819fbd63de7dbace080f049"
let name = "SubscriptionCreated"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t, merchant: Address.t, token: Address.t, amount: bigint, interval: bigint, maxPayments: bigint, maxTotalAmount: bigint, expiry: bigint}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema), merchant: s.field("merchant", Address.schema), token: s.field("token", Address.schema), amount: s.field("amount", BigInt.schema), interval: s.field("interval", BigInt.schema), maxPayments: s.field("maxPayments", BigInt.schema), maxTotalAmount: s.field("maxTotalAmount", BigInt.schema), expiry: s.field("expiry", BigInt.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>, @as("merchant") merchant?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber","merchant",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)), ~topic3=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("merchant")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, merchant: decodedEvent.indexed->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, token: decodedEvent.body->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, amount: decodedEvent.body->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, interval: decodedEvent.body->Js.Array2.unsafe_get(2)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, maxPayments: decodedEvent.body->Js.Array2.unsafe_get(3)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, maxTotalAmount: decodedEvent.body->Js.Array2.unsafe_get(4)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, expiry: decodedEvent.body->Js.Array2.unsafe_get(5)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module SubscriptionPaused = {

let id = "0xded8d4d23682b33f0e79da6698526d10c5f7ec65705c1903e9ac7f78b5e3a51b_3"
let sighash = "0xded8d4d23682b33f0e79da6698526d10c5f7ec65705c1903e9ac7f78b5e3a51b"
let name = "SubscriptionPaused"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module SubscriptionResumed = {

let id = "0xaa36c7b46a257244f7f4be84a7163f464e536b2f812d6c308ef7856c58ba925d_3"
let sighash = "0xaa36c7b46a257244f7f4be84a7163f464e536b2f812d6c308ef7856c58ba925d"
let name = "SubscriptionResumed"
let contractName = contractName

@genType
type eventArgs = {subscriptionId: string, subscriber: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {subscriptionId: s.field("subscriptionId", S.string), subscriber: s.field("subscriber", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("subscriptionId") subscriptionId?: SingleOrMultiple.t<string>, @as("subscriber") subscriber?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["subscriptionId","subscriber",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriptionId")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.castToHexUnsafe)), ~topic2=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("subscriber")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {subscriptionId: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, subscriber: decodedEvent.indexed->Js.Array2.unsafe_get(1)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module TokenAdded = {

let id = "0x784c8f4dbf0ffedd6e72c76501c545a70f8b203b30a26ce542bf92ba87c248a4_2"
let sighash = "0x784c8f4dbf0ffedd6e72c76501c545a70f8b203b30a26ce542bf92ba87c248a4"
let name = "TokenAdded"
let contractName = contractName

@genType
type eventArgs = {token: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {token: s.field("token", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("token") token?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["token",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("token")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {token: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}

module TokenRemoved = {

let id = "0x4c910b69fe65a61f7531b9c5042b2329ca7179c77290aa7e2eb3afa3c8511fd3_2"
let sighash = "0x4c910b69fe65a61f7531b9c5042b2329ca7179c77290aa7e2eb3afa3c8511fd3"
let name = "TokenRemoved"
let contractName = contractName

@genType
type eventArgs = {token: Address.t}
@genType
type block = Block.t
@genType
type transaction = Transaction.t

@genType
type event = {
  /** The parameters or arguments associated with this event. */
  params: eventArgs,
  /** The unique identifier of the blockchain network where this event occurred. */
  chainId: chainId,
  /** The address of the contract that emitted this event. */
  srcAddress: Address.t,
  /** The index of this event's log within the block. */
  logIndex: int,
  /** The transaction that triggered this event. Configurable in `config.yaml` via the `field_selection` option. */
  transaction: transaction,
  /** The block in which this event was recorded. Configurable in `config.yaml` via the `field_selection` option. */
  block: block,
}

@genType
type handlerArgs = Internal.genericHandlerArgs<event, handlerContext, unit>
@genType
type handler = Internal.genericHandler<handlerArgs>
@genType
type contractRegister = Internal.genericContractRegister<Internal.genericContractRegisterArgs<event, contractRegistrations>>

let paramsRawEventSchema = S.object((s): eventArgs => {token: s.field("token", Address.schema)})
let blockSchema = Block.schema
let transactionSchema = Transaction.schema

let handlerRegister: EventRegister.t = EventRegister.make(
  ~contractName,
  ~eventName=name,
)

@genType
type eventFilter = {@as("token") token?: SingleOrMultiple.t<Address.t>}

@genType type eventFiltersArgs = {/** The unique identifier of the blockchain network where this event occurred. */ chainId: chainId, /** Addresses of the contracts indexing the event. */ addresses: array<Address.t>}

@genType @unboxed type eventFiltersDefinition = Single(eventFilter) | Multiple(array<eventFilter>)

@genType @unboxed type eventFilters = | ...eventFiltersDefinition | Dynamic(eventFiltersArgs => eventFiltersDefinition)

let register = (): Internal.evmEventConfig => {
  let {getEventFiltersOrThrow, filterByAddresses} = LogSelection.parseEventFiltersOrThrow(~eventFilters=handlerRegister->EventRegister.getEventFilters, ~sighash, ~params=["token",], ~topic1=(_eventFilter) => _eventFilter->Utils.Dict.dangerouslyGetNonOption("token")->Belt.Option.mapWithDefault([], topicFilters => topicFilters->Obj.magic->SingleOrMultiple.normalizeOrThrow->Belt.Array.map(TopicFilter.fromAddress)))
  {
    getEventFiltersOrThrow,
    filterByAddresses,
    dependsOnAddresses: !(handlerRegister->EventRegister.isWildcard) || filterByAddresses,
    blockSchema: blockSchema->(Utils.magic: S.t<block> => S.t<Internal.eventBlock>),
    transactionSchema: transactionSchema->(Utils.magic: S.t<transaction> => S.t<Internal.eventTransaction>),
    convertHyperSyncEventArgs: (decodedEvent: HyperSyncClient.Decoder.decodedEvent) => {token: decodedEvent.indexed->Js.Array2.unsafe_get(0)->HyperSyncClient.Decoder.toUnderlying->Utils.magic, }->(Utils.magic: eventArgs => Internal.eventParams),
    id,
  name,
  contractName,
  isWildcard: (handlerRegister->EventRegister.isWildcard),
  handler: handlerRegister->EventRegister.getHandler,
  contractRegister: handlerRegister->EventRegister.getContractRegister,
  paramsRawEventSchema: paramsRawEventSchema->(Utils.magic: S.t<eventArgs> => S.t<Internal.eventParams>),
  }
}
}
}

@genType
type chainId = int

@genType
type chain = [#84532 | #11155111]
