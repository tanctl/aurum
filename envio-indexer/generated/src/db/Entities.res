open Table
open Enums.EntityType
type id = string

type internalEntity = Internal.entity
module type Entity = {
  type t
  let name: string
  let schema: S.t<t>
  let rowsSchema: S.t<array<t>>
  let table: Table.table
  let entityHistory: EntityHistory.t<t>
}
external entityModToInternal: module(Entity with type t = 'a) => Internal.entityConfig = "%identity"
external entityModsToInternal: array<module(Entity)> => array<Internal.entityConfig> = "%identity"
external entitiesToInternal: array<'a> => array<Internal.entity> = "%identity"

@get
external getEntityId: internalEntity => string = "id"

exception UnexpectedIdNotDefinedOnEntity
let getEntityIdUnsafe = (entity: 'entity): id =>
  switch Utils.magic(entity)["id"] {
  | Some(id) => id
  | None =>
    UnexpectedIdNotDefinedOnEntity->ErrorHandling.mkLogAndRaise(
      ~msg="Property 'id' does not exist on expected entity object",
    )
  }

//shorthand for punning
let isPrimaryKey = true
let isNullable = true
let isArray = true
let isIndex = true

@genType
type whereOperations<'entity, 'fieldType> = {
  eq: 'fieldType => promise<array<'entity>>,
  gt: 'fieldType => promise<array<'entity>>
}

module RelayerRegistry_EmergencySlash = {
  let name = (RelayerRegistry_EmergencySlash :> string)
  @genType
  type t = {
    amount: bigint,
    id: id,
    reason: string,
    relayer: string,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    id: s.field("id", S.string),
    reason: s.field("reason", S.string),
    relayer: s.field("relayer", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "amount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "reason", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_ExecutionRecorded = {
  let name = (RelayerRegistry_ExecutionRecorded :> string)
  @genType
  type t = {
    feeAmount: bigint,
    id: id,
    relayer: string,
    success: bool,
  }

  let schema = S.object((s): t => {
    feeAmount: s.field("feeAmount", BigInt.schema),
    id: s.field("id", S.string),
    relayer: s.field("relayer", S.string),
    success: s.field("success", S.bool),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "feeAmount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "success", 
      Boolean,
      ~fieldSchema=S.bool,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_OwnershipTransferred = {
  let name = (RelayerRegistry_OwnershipTransferred :> string)
  @genType
  type t = {
    id: id,
    newOwner: string,
    previousOwner: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    newOwner: s.field("newOwner", S.string),
    previousOwner: s.field("previousOwner", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "newOwner", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "previousOwner", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_RelayerRegistered = {
  let name = (RelayerRegistry_RelayerRegistered :> string)
  @genType
  type t = {
    id: id,
    relayer: string,
    stakedAmount: bigint,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    relayer: s.field("relayer", S.string),
    stakedAmount: s.field("stakedAmount", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "stakedAmount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_RelayerRestaked = {
  let name = (RelayerRegistry_RelayerRestaked :> string)
  @genType
  type t = {
    amount: bigint,
    id: id,
    newStake: bigint,
    relayer: string,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    id: s.field("id", S.string),
    newStake: s.field("newStake", BigInt.schema),
    relayer: s.field("relayer", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "amount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "newStake", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_RelayerSlashed = {
  let name = (RelayerRegistry_RelayerSlashed :> string)
  @genType
  type t = {
    id: id,
    relayer: string,
    remainingStake: bigint,
    slashAmount: bigint,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    relayer: s.field("relayer", S.string),
    remainingStake: s.field("remainingStake", BigInt.schema),
    slashAmount: s.field("slashAmount", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "remainingStake", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "slashAmount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_RelayerUnregistered = {
  let name = (RelayerRegistry_RelayerUnregistered :> string)
  @genType
  type t = {
    id: id,
    relayer: string,
    returnedStake: bigint,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    relayer: s.field("relayer", S.string),
    returnedStake: s.field("returnedStake", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "returnedStake", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_SlashingParametersUpdated = {
  let name = (RelayerRegistry_SlashingParametersUpdated :> string)
  @genType
  type t = {
    failureThreshold: bigint,
    id: id,
    slashAmount: bigint,
  }

  let schema = S.object((s): t => {
    failureThreshold: s.field("failureThreshold", BigInt.schema),
    id: s.field("id", S.string),
    slashAmount: s.field("slashAmount", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "failureThreshold", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "slashAmount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerRegistry_WithdrawalRequested = {
  let name = (RelayerRegistry_WithdrawalRequested :> string)
  @genType
  type t = {
    id: id,
    relayer: string,
    requestTime: bigint,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    relayer: s.field("relayer", S.string),
    requestTime: s.field("requestTime", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "requestTime", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_CrossChainPaymentInitiated = {
  let name = (SubscribtionManager_CrossChainPaymentInitiated :> string)
  @genType
  type t = {
    amount: bigint,
    id: id,
    sourceChainId: bigint,
    subscriber: string,
    subscriberToken: string,
    subscriptionId: string,
    targetChainId: bigint,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    id: s.field("id", S.string),
    sourceChainId: s.field("sourceChainId", BigInt.schema),
    subscriber: s.field("subscriber", S.string),
    subscriberToken: s.field("subscriberToken", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
    targetChainId: s.field("targetChainId", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "amount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "sourceChainId", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriberToken", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "targetChainId", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_NexusAttestationSubmitted = {
  let name = (SubscribtionManager_NexusAttestationSubmitted :> string)
  @genType
  type t = {
    attestationId: string,
    id: id,
    paymentNumber: bigint,
    subscriptionId: string,
  }

  let schema = S.object((s): t => {
    attestationId: s.field("attestationId", S.string),
    id: s.field("id", S.string),
    paymentNumber: s.field("paymentNumber", BigInt.schema),
    subscriptionId: s.field("subscriptionId", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "attestationId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "paymentNumber", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_NexusAttestationVerified = {
  let name = (SubscribtionManager_NexusAttestationVerified :> string)
  @genType
  type t = {
    attestationId: string,
    id: id,
  }

  let schema = S.object((s): t => {
    attestationId: s.field("attestationId", S.string),
    id: s.field("id", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "attestationId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_OwnershipTransferred = {
  let name = (SubscribtionManager_OwnershipTransferred :> string)
  @genType
  type t = {
    id: id,
    newOwner: string,
    previousOwner: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    newOwner: s.field("newOwner", S.string),
    previousOwner: s.field("previousOwner", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "newOwner", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "previousOwner", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_PaymentExecuted = {
  let name = (SubscribtionManager_PaymentExecuted :> string)
  @genType
  type t = {
    amount: bigint,
    fee: bigint,
    id: id,
    merchant: string,
    paymentNumber: bigint,
    relayer: string,
    subscriber: string,
    subscriptionId: string,
    token: string,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    fee: s.field("fee", BigInt.schema),
    id: s.field("id", S.string),
    merchant: s.field("merchant", S.string),
    paymentNumber: s.field("paymentNumber", BigInt.schema),
    relayer: s.field("relayer", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
    token: s.field("token", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "amount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "fee", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "paymentNumber", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "token", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_PaymentFailed = {
  let name = (SubscribtionManager_PaymentFailed :> string)
  @genType
  type t = {
    amount: bigint,
    id: id,
    merchant: string,
    reason: string,
    subscriber: string,
    subscriptionId: string,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    id: s.field("id", S.string),
    merchant: s.field("merchant", S.string),
    reason: s.field("reason", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "amount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "reason", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_SubscriptionCancelled = {
  let name = (SubscribtionManager_SubscriptionCancelled :> string)
  @genType
  type t = {
    id: id,
    merchant: string,
    subscriber: string,
    subscriptionId: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    merchant: s.field("merchant", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_SubscriptionCreated = {
  let name = (SubscribtionManager_SubscriptionCreated :> string)
  @genType
  type t = {
    amount: bigint,
    expiry: bigint,
    id: id,
    interval: bigint,
    maxPayments: bigint,
    maxTotalAmount: bigint,
    merchant: string,
    subscriber: string,
    subscriptionId: string,
    token: string,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    expiry: s.field("expiry", BigInt.schema),
    id: s.field("id", S.string),
    interval: s.field("interval", BigInt.schema),
    maxPayments: s.field("maxPayments", BigInt.schema),
    maxTotalAmount: s.field("maxTotalAmount", BigInt.schema),
    merchant: s.field("merchant", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
    token: s.field("token", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "amount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "expiry", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "interval", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "maxPayments", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "maxTotalAmount", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "token", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_SubscriptionPaused = {
  let name = (SubscribtionManager_SubscriptionPaused :> string)
  @genType
  type t = {
    id: id,
    subscriber: string,
    subscriptionId: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_SubscriptionResumed = {
  let name = (SubscribtionManager_SubscriptionResumed :> string)
  @genType
  type t = {
    id: id,
    subscriber: string,
    subscriptionId: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_TokenAdded = {
  let name = (SubscribtionManager_TokenAdded :> string)
  @genType
  type t = {
    id: id,
    token: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    token: s.field("token", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "token", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module SubscribtionManager_TokenRemoved = {
  let name = (SubscribtionManager_TokenRemoved :> string)
  @genType
  type t = {
    id: id,
    token: string,
  }

  let schema = S.object((s): t => {
    id: s.field("id", S.string),
    token: s.field("token", S.string),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "token", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

let userEntities = [
  module(RelayerRegistry_EmergencySlash),
  module(RelayerRegistry_ExecutionRecorded),
  module(RelayerRegistry_OwnershipTransferred),
  module(RelayerRegistry_RelayerRegistered),
  module(RelayerRegistry_RelayerRestaked),
  module(RelayerRegistry_RelayerSlashed),
  module(RelayerRegistry_RelayerUnregistered),
  module(RelayerRegistry_SlashingParametersUpdated),
  module(RelayerRegistry_WithdrawalRequested),
  module(SubscribtionManager_CrossChainPaymentInitiated),
  module(SubscribtionManager_NexusAttestationSubmitted),
  module(SubscribtionManager_NexusAttestationVerified),
  module(SubscribtionManager_OwnershipTransferred),
  module(SubscribtionManager_PaymentExecuted),
  module(SubscribtionManager_PaymentFailed),
  module(SubscribtionManager_SubscriptionCancelled),
  module(SubscribtionManager_SubscriptionCreated),
  module(SubscribtionManager_SubscriptionPaused),
  module(SubscribtionManager_SubscriptionResumed),
  module(SubscribtionManager_TokenAdded),
  module(SubscribtionManager_TokenRemoved),
]->entityModsToInternal

let allEntities =
  userEntities->Js.Array2.concat(
    [module(InternalTable.DynamicContractRegistry)]->entityModsToInternal,
  )

let byName =
  allEntities
  ->Js.Array2.map(entityConfig => {
    (entityConfig.name, entityConfig)
  })
  ->Js.Dict.fromArray
