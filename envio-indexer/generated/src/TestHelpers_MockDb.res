
/***** TAKE NOTE ******
This file module is a hack to get genType to work!

In order for genType to produce recursive types, it needs to be at the 
root module of a file. If it's defined in a nested module it does not 
work. So all the MockDb types and internal functions are defined here in TestHelpers_MockDb
and only public functions are recreated and exported from TestHelpers.MockDb module.

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

open Belt

let mockEventRegisters = Utils.WeakMap.make()

/**
A raw js binding to allow deleting from a dict. Used in store delete operation
*/
let deleteDictKey: (dict<'a>, string) => unit = %raw(`
    function(dict, key) {
      delete dict[key]
    }
  `)

let config = RegisterHandlers.getConfigWithoutRegistrations()
EventRegister.startRegistration(
  ~ecosystem=config.ecosystem,
  ~multichain=config.multichain,
  ~preloadHandlers=config.preloadHandlers,
)

/**
The mockDb type is simply an InMemoryStore internally. __dbInternal__ holds a reference
to an inMemoryStore and all the the accessor methods point to the reference of that inMemory
store
*/
@genType.opaque
type inMemoryStore = InMemoryStore.t

@genType
type rec t = {
  __dbInternal__: inMemoryStore,
  entities: entities,
  rawEvents: storeOperations<InMemoryStore.rawEventsKey, InternalTable.RawEvents.t>,
  dynamicContractRegistry: entityStoreOperations<InternalTable.DynamicContractRegistry.t>,
  processEvents: array<Types.eventLog<unknown>> => promise<t>,
}

// Each user defined entity will be in this record with all the store or "mockdb" operators
@genType
and entities = {
    @as("RelayerRegistry_EmergencySlash") relayerRegistry_EmergencySlash: entityStoreOperations<Entities.RelayerRegistry_EmergencySlash.t>,
    @as("RelayerRegistry_ExecutionRecorded") relayerRegistry_ExecutionRecorded: entityStoreOperations<Entities.RelayerRegistry_ExecutionRecorded.t>,
    @as("RelayerRegistry_OwnershipTransferred") relayerRegistry_OwnershipTransferred: entityStoreOperations<Entities.RelayerRegistry_OwnershipTransferred.t>,
    @as("RelayerRegistry_RelayerRegistered") relayerRegistry_RelayerRegistered: entityStoreOperations<Entities.RelayerRegistry_RelayerRegistered.t>,
    @as("RelayerRegistry_RelayerRestaked") relayerRegistry_RelayerRestaked: entityStoreOperations<Entities.RelayerRegistry_RelayerRestaked.t>,
    @as("RelayerRegistry_RelayerSlashed") relayerRegistry_RelayerSlashed: entityStoreOperations<Entities.RelayerRegistry_RelayerSlashed.t>,
    @as("RelayerRegistry_RelayerUnregistered") relayerRegistry_RelayerUnregistered: entityStoreOperations<Entities.RelayerRegistry_RelayerUnregistered.t>,
    @as("RelayerRegistry_SlashingParametersUpdated") relayerRegistry_SlashingParametersUpdated: entityStoreOperations<Entities.RelayerRegistry_SlashingParametersUpdated.t>,
    @as("RelayerRegistry_WithdrawalRequested") relayerRegistry_WithdrawalRequested: entityStoreOperations<Entities.RelayerRegistry_WithdrawalRequested.t>,
    @as("SubscribtionManager_CrossChainPaymentInitiated") subscribtionManager_CrossChainPaymentInitiated: entityStoreOperations<Entities.SubscribtionManager_CrossChainPaymentInitiated.t>,
    @as("SubscribtionManager_NexusAttestationSubmitted") subscribtionManager_NexusAttestationSubmitted: entityStoreOperations<Entities.SubscribtionManager_NexusAttestationSubmitted.t>,
    @as("SubscribtionManager_NexusAttestationVerified") subscribtionManager_NexusAttestationVerified: entityStoreOperations<Entities.SubscribtionManager_NexusAttestationVerified.t>,
    @as("SubscribtionManager_OwnershipTransferred") subscribtionManager_OwnershipTransferred: entityStoreOperations<Entities.SubscribtionManager_OwnershipTransferred.t>,
    @as("SubscribtionManager_PaymentExecuted") subscribtionManager_PaymentExecuted: entityStoreOperations<Entities.SubscribtionManager_PaymentExecuted.t>,
    @as("SubscribtionManager_PaymentFailed") subscribtionManager_PaymentFailed: entityStoreOperations<Entities.SubscribtionManager_PaymentFailed.t>,
    @as("SubscribtionManager_SubscriptionCancelled") subscribtionManager_SubscriptionCancelled: entityStoreOperations<Entities.SubscribtionManager_SubscriptionCancelled.t>,
    @as("SubscribtionManager_SubscriptionCreated") subscribtionManager_SubscriptionCreated: entityStoreOperations<Entities.SubscribtionManager_SubscriptionCreated.t>,
    @as("SubscribtionManager_SubscriptionPaused") subscribtionManager_SubscriptionPaused: entityStoreOperations<Entities.SubscribtionManager_SubscriptionPaused.t>,
    @as("SubscribtionManager_SubscriptionResumed") subscribtionManager_SubscriptionResumed: entityStoreOperations<Entities.SubscribtionManager_SubscriptionResumed.t>,
    @as("SubscribtionManager_TokenAdded") subscribtionManager_TokenAdded: entityStoreOperations<Entities.SubscribtionManager_TokenAdded.t>,
    @as("SubscribtionManager_TokenRemoved") subscribtionManager_TokenRemoved: entityStoreOperations<Entities.SubscribtionManager_TokenRemoved.t>,
  }
// User defined entities always have a string for an id which is used as the
// key for entity stores
@genType
and entityStoreOperations<'entity> = storeOperations<string, 'entity>
// all the operator functions a user can access on an entity in the mock db
// stores refer to the the module that MakeStore functor outputs in IO.res
@genType
and storeOperations<'entityKey, 'entity> = {
  getAll: unit => array<'entity>,
  get: 'entityKey => option<'entity>,
  set: 'entity => t,
  delete: 'entityKey => t,
}

/**
a composable function to make the "storeOperations" record to represent all the mock
db operations for each entity.
*/
let makeStoreOperatorEntity = (
  ~inMemoryStore: InMemoryStore.t,
  ~makeMockDb,
  ~getStore: InMemoryStore.t => InMemoryTable.Entity.t<'entity>,
  ~getKey: 'entity => Types.id,
): storeOperations<Types.id, 'entity> => {
  let {getUnsafe, values, set} = module(InMemoryTable.Entity)

  let get = id => {
    let store = inMemoryStore->getStore
    if store.table->InMemoryTable.hasByHash(id) {
      getUnsafe(store)(id)
    } else {
      None
    }
  }

  let getAll = () =>
    inMemoryStore
    ->getStore
    ->values

  let delete = entityId => {
    let cloned = inMemoryStore->InMemoryStore.clone
    let table = cloned->getStore

    table->set(
      Delete->Types.mkEntityUpdate(
        ~entityId,
        ~eventIdentifier={chainId: -1, blockNumber: -1, blockTimestamp: 0, logIndex: -1},
      ),
      ~shouldSaveHistory=false,
    )

    cloned->makeMockDb
  }

  let set = entity => {
    let cloned = inMemoryStore->InMemoryStore.clone
    let table = cloned->getStore
    let entityId = entity->getKey

    table->set(
      Set(entity)->Types.mkEntityUpdate(
        ~entityId,
        ~eventIdentifier={chainId: -1, blockNumber: -1, blockTimestamp: 0, logIndex: -1},
      ),
      ~shouldSaveHistory=false,
    )

    cloned->makeMockDb
  }

  {
    getAll,
    get,
    set,
    delete,
  }
}

let makeStoreOperatorMeta = (
  ~inMemoryStore: InMemoryStore.t,
  ~makeMockDb,
  ~getStore: InMemoryStore.t => InMemoryTable.t<'key, 'value>,
  ~getKey: 'value => 'key,
): storeOperations<'key, 'value> => {
  let {get, values, set} = module(InMemoryTable)

  let get = id => get(inMemoryStore->getStore, id)

  let getAll = () => inMemoryStore->getStore->values->Array.map(row => row)

  let set = metaData => {
    let cloned = inMemoryStore->InMemoryStore.clone
    cloned->getStore->set(metaData->getKey, metaData)
    cloned->makeMockDb
  }

  // TODO: Remove. Is delete needed for meta data?
  let delete = key => {
    let cloned = inMemoryStore->InMemoryStore.clone
    let store = cloned->getStore
    store.dict->deleteDictKey(key->store.hash)
    cloned->makeMockDb
  }

  {
    getAll,
    get,
    set,
    delete,
  }
}

/**
Accessor function for getting the internal inMemoryStore in the mockDb
*/
let getInternalDb = (self: t) => self.__dbInternal__

let getEntityOperations = (mockDb: t, ~entityName: string): entityStoreOperations<
  Internal.entity,
> => {
  mockDb.entities
  ->Utils.magic
  ->Utils.Dict.dangerouslyGetNonOption(entityName)
  ->Utils.Option.getExn("Mocked operations for entity " ++ entityName ++ " not found")
}

/**
A function composer for simulating the writing of an inMemoryStore to the external db with a mockDb.
Runs all set and delete operations currently cached in an inMemory store against the mockDb
*/
let executeRowsEntity = (
  mockDb: t,
  ~inMemoryStore: InMemoryStore.t,
  ~entityConfig: Internal.entityConfig,
) => {
   let getInMemTable = (inMemoryStore: InMemoryStore.t) =>
    inMemoryStore->InMemoryStore.getInMemTable(~entityConfig)

  let inMemTable = getInMemTable(inMemoryStore)

  inMemTable.table
  ->InMemoryTable.values
  ->Array.forEach(row => {
    let mockDbTable = mockDb->getInternalDb->getInMemTable
    switch row.entityRow {
    | Updated({latest: {entityUpdateAction: Set(entity)}})
    | InitialReadFromDb(AlreadySet(entity)) =>
      let key = (entity: Internal.entity).id
      mockDbTable->InMemoryTable.Entity.initValue(
        ~allowOverWriteEntity=true,
        ~key,
        ~entity=Some(entity),
      )
    | Updated({latest: {entityUpdateAction: Delete, entityId}}) =>
      mockDbTable.table.dict->deleteDictKey(entityId)
    | InitialReadFromDb(NotSet) => ()
    }
  })
}

let executeRowsMeta = (
  mockDb: t,
  ~inMemoryStore: InMemoryStore.t,
  ~getInMemTable: InMemoryStore.t => InMemoryTable.t<'key, 'entity>,
  ~getKey: 'entity => 'key,
) => {
  let mockDbTable = mockDb->getInternalDb->getInMemTable
  inMemoryStore
  ->getInMemTable
  ->InMemoryTable.values
  ->Array.forEach(row => {
    mockDbTable->InMemoryTable.set(getKey(row), row)
  })
}

/**
The internal make function which can be passed an in memory store and
instantiate a "MockDb". This is useful for cloning or making a MockDb
out of an existing inMemoryStore
*/
let rec makeWithInMemoryStore: InMemoryStore.t => t = (inMemoryStore: InMemoryStore.t) => {
  let rawEvents = makeStoreOperatorMeta(
    ~inMemoryStore,
    ~makeMockDb=makeWithInMemoryStore,
    ~getStore=db => db.rawEvents,
    ~getKey=({chainId, eventId}) => {
      chainId,
      eventId: eventId->BigInt.toString,
    },
  )

  let dynamicContractRegistry = makeStoreOperatorEntity(
    ~inMemoryStore,
    ~getStore=db =>
      db
      ->InMemoryStore.getInMemTable(
        ~entityConfig=module(InternalTable.DynamicContractRegistry)->Entities.entityModToInternal,
      )
      ->(
        Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
          InternalTable.DynamicContractRegistry.t,
        >
      ),
    ~makeMockDb=makeWithInMemoryStore,
    ~getKey=({chainId, contractAddress}) => {
      InternalTable.DynamicContractRegistry.makeId(~chainId, ~contractAddress)
    },
  )

  let entities = {
      relayerRegistry_EmergencySlash: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_EmergencySlash)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_EmergencySlash.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_ExecutionRecorded: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_ExecutionRecorded)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_ExecutionRecorded.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_OwnershipTransferred: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_OwnershipTransferred)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_OwnershipTransferred.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_RelayerRegistered: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_RelayerRegistered)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_RelayerRegistered.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_RelayerRestaked: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_RelayerRestaked)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_RelayerRestaked.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_RelayerSlashed: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_RelayerSlashed)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_RelayerSlashed.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_RelayerUnregistered: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_RelayerUnregistered)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_RelayerUnregistered.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_SlashingParametersUpdated: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_SlashingParametersUpdated)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_SlashingParametersUpdated.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      relayerRegistry_WithdrawalRequested: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.RelayerRegistry_WithdrawalRequested)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.RelayerRegistry_WithdrawalRequested.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_CrossChainPaymentInitiated: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_CrossChainPaymentInitiated)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_CrossChainPaymentInitiated.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_NexusAttestationSubmitted: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_NexusAttestationSubmitted)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_NexusAttestationSubmitted.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_NexusAttestationVerified: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_NexusAttestationVerified)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_NexusAttestationVerified.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_OwnershipTransferred: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_OwnershipTransferred)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_OwnershipTransferred.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_PaymentExecuted: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_PaymentExecuted)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_PaymentExecuted.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_PaymentFailed: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_PaymentFailed)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_PaymentFailed.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_SubscriptionCancelled: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_SubscriptionCancelled)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_SubscriptionCancelled.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_SubscriptionCreated: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_SubscriptionCreated)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_SubscriptionCreated.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_SubscriptionPaused: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_SubscriptionPaused)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_SubscriptionPaused.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_SubscriptionResumed: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_SubscriptionResumed)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_SubscriptionResumed.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_TokenAdded: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_TokenAdded)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_TokenAdded.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
      subscribtionManager_TokenRemoved: {
        makeStoreOperatorEntity(
          ~inMemoryStore,
          ~makeMockDb=makeWithInMemoryStore,
          ~getStore=db => db->InMemoryStore.getInMemTable(
            ~entityConfig=module(Entities.SubscribtionManager_TokenRemoved)->Entities.entityModToInternal,
          )->(
            Utils.magic: InMemoryTable.Entity.t<Internal.entity> => InMemoryTable.Entity.t<
              Entities.SubscribtionManager_TokenRemoved.t,
            >
          ),
          ~getKey=({id}) => id,
        )
      },
  }

  let mockDb = {
    __dbInternal__: inMemoryStore,
    entities,
    rawEvents,
    dynamicContractRegistry,
    processEvents: %raw(`null`),
  }
  (mockDb->Utils.magic)["processEvents"] = makeProcessEvents(mockDb, ~chainId=?None)
  mockDb
}
and makeProcessEvents = (mockDb: t, ~chainId=?) => async (
  events: array<Types.eventLog<unknown>>,
) => {
  let itemsWithContractRegister = []

  let config = {
    ...config,
    registrations: Some(EventRegister.finishRegistration()),
  }

  let processingChainId = ref(chainId)
  let items = events->Array.map(event => {
    let event = event->Internal.fromGenericEvent
    let eventConfig = switch mockEventRegisters->Utils.WeakMap.get(event) {
    | Some(register) => register()
    | None =>
      Js.Exn.raiseError(
        "Events must be created using the mock API (e.g. createMockEvent) to be processed by mockDb.processEvents",
      )
    }
    let chainId = switch chainId {
    | Some(chainId) => chainId
    | None => event.chainId
    }

    switch processingChainId.contents {
    | Some(chainId) =>
      if chainId != event.chainId {
        Js.Exn.raiseError(
          `Processing events on multiple chains is not supported yet. Got chainId ${event.chainId->Belt.Int.toString} but expected ${chainId->Belt.Int.toString}`,
        )
      }
    | None => processingChainId.contents = Some(chainId)
    }

    let chain = config->Config.getChain(~chainId)
    let item = Internal.Event({
      eventConfig,
      event,
      chain,
      logIndex: event.logIndex,
      timestamp: event.block->Types.Block.getTimestamp,
      blockNumber: event.block->Types.Block.getNumber,
    })
    if eventConfig.contractRegister->Option.isSome {
      itemsWithContractRegister->Js.Array2.push(item)->ignore
    }
    item
  })

  let processingChainId = switch processingChainId.contents {
  | Some(chainId) => chainId
  | None =>
    Js.Exn.raiseError("No events provided to processEvents. Please provide at least one event.")
  }

  //Deep copy the data in mockDb, mutate the clone and return the clone
  //So no side effects occur here and state can be compared between process
  //steps
  let mockDbClone = mockDb->cloneMockDb

  //Construct a new instance of an in memory store to run for the given event
  let inMemoryStore = InMemoryStore.make()
  let loadManager = LoadManager.make()
  let persistence = {
    ...config.persistence,
    storage: makeMockStorage(mockDb),
    storageStatus: Ready({cleanRun: false, cache: Js.Dict.empty(), chains: []}),
  }
  let config = {
    ...config,
    persistence,
  }

  //No need to check contract is registered or return anything.
  //The only purpose is to test the registerContract function and to
  //add the entity to the in memory store for asserting registrations
  if itemsWithContractRegister->Utils.Array.notEmpty {
    let dcs = await ChainFetcher.runContractRegistersOrThrow(
      ~itemsWithContractRegister,
      ~chain=ChainMap.Chain.makeUnsafe(~chainId=processingChainId),
      ~config,
    )

    // TODO: Reuse FetchState logic to clean up duplicate dcs
    if dcs->Utils.Array.notEmpty {
      inMemoryStore->InMemoryStore.setDcsToStore(
        Js.Dict.fromArray([(processingChainId->Belt.Int.toString, dcs)]),
        ~shouldSaveHistory=false,
      )
    }
  }

  try {
    await items->EventProcessing.preloadBatchOrThrow(
      ~loadManager,
      ~persistence,
      ~inMemoryStore,
    )
    await items->EventProcessing.runBatchHandlersOrThrow(
      ~inMemoryStore,
      ~loadManager,
      ~config,
      ~shouldSaveHistory=false,
      ~shouldBenchmark=false,
    )
  } catch {
  | EventProcessing.ProcessingError({message, exn, item}) =>
    exn
    ->ErrorHandling.make(~msg=message, ~logger=item->Logging.getItemLogger)
    ->ErrorHandling.logAndRaise
  }

  //In mem store can still contatin raw events and dynamic contracts for the
  //testing framework in cases where either contract register or loaderHandler
  //is None
  mockDbClone->writeFromMemoryStore(~inMemoryStore)
  mockDbClone
}
and makeMockStorage = (mockDb: t): Persistence.storage => {
  {
    isInitialized: () => Js.Exn.raiseError("Not used yet"),
    initialize: (~chainConfigs as _=?, ~entities as _=?, ~enums as _=?) =>
      Js.Exn.raiseError("Not used yet"),
    resumeInitialState: () => Js.Exn.raiseError("Not used yet"),
    loadByIdsOrThrow: (
      type item,
      ~ids,
      ~table: Table.table,
      ~rowsSchema as _: S.t<array<item>>,
    ) => {
      let operations = mockDb->getEntityOperations(~entityName=table.tableName)
      ids
      ->Array.keepMap(id => operations.get(id))
      ->(Utils.magic: array<Internal.entity> => array<item>)
      ->Promise.resolve
    },
    loadByFieldOrThrow: (
      ~fieldName,
      ~fieldSchema as _,
      ~fieldValue,
      ~operator,
      ~table,
      ~rowsSchema as _,
    ) => {
      let mockDbTable =
        mockDb.__dbInternal__.entities->InMemoryStore.EntityTables.get(~entityName=table.tableName)
      let index = TableIndices.Index.makeSingle(
        ~fieldName,
        ~fieldValue,
        ~operator=switch operator {
        | #"=" => Eq
        | #">" => Gt
        },
      )
      mockDbTable
      ->InMemoryTable.Entity.values
      ->Array.keep(entity => {
        index->TableIndices.Index.evaluate(
          ~fieldName,
          ~fieldValue=entity->Utils.magic->Js.Dict.unsafeGet(fieldName),
        )
      })
      ->Promise.resolve
    },
    setOrThrow: (~items as _, ~table as _, ~itemSchema as _) => Js.Exn.raiseError("Not used yet"),
    setEffectCacheOrThrow: (~effect as _, ~items as _, ~initialize as _) => Promise.resolve(),
    dumpEffectCache: () => Js.Exn.raiseError("Not used yet"),
  }
}
and /**
Deep copies the in memory store data and returns a new mockDb with the same
state and no references to data from the passed in mockDb
*/
cloneMockDb = (self: t) => {
  let clonedInternalDb = self->getInternalDb->InMemoryStore.clone
  clonedInternalDb->makeWithInMemoryStore
}
and /**
Simulates the writing of processed data in the inMemoryStore to a mockDb. This function
executes all the rows on each "store" (or pg table) in the inMemoryStore
*/
writeFromMemoryStore = (mockDb: t, ~inMemoryStore: InMemoryStore.t) => {
  //INTERNAL STORES/TABLES EXECUTION
  mockDb->executeRowsMeta(
    ~inMemoryStore,
    ~getInMemTable=inMemStore => {inMemStore.rawEvents},
    ~getKey=(entity): InMemoryStore.rawEventsKey => {
      chainId: entity.chainId,
      eventId: entity.eventId->BigInt.toString,
    },
  )

  Config.codegenPersistence.allEntities->Array.forEach(entityConfig => {
    mockDb->executeRowsEntity(~inMemoryStore, ~entityConfig)
  })
}

/**
The constructor function for a mockDb. Call it and then set up the inital state by calling
any of the set functions it provides access to. A mockDb will be passed into a processEvent 
helper. Note, process event helpers will not mutate the mockDb but return a new mockDb with
new state so you can compare states before and after.
*/
@genType
let //Note: It's called createMockDb over "make" to make it more intuitive in JS and TS

createMockDb = () => makeWithInMemoryStore(InMemoryStore.make())
