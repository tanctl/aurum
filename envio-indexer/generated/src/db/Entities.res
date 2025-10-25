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

module CrossChainAttestation = {
  let name = (CrossChainAttestation :> string)
  @genType
  type t = {
    amount: option<bigint>,
    attestationId: string,
    chainId: bigint,
    id: id,
    paymentNumber: bigint,
    subscriptionId: string,
    timestamp: bigint,
    token: option<string>,
    verified: bool,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", S.null(BigInt.schema)),
    attestationId: s.field("attestationId", S.string),
    chainId: s.field("chainId", BigInt.schema),
    id: s.field("id", S.string),
    paymentNumber: s.field("paymentNumber", BigInt.schema),
    subscriptionId: s.field("subscriptionId", S.string),
    timestamp: s.field("timestamp", BigInt.schema),
    token: s.field("token", S.null(S.string)),
    verified: s.field("verified", S.bool),
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
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "attestationId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "chainId", 
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
      "paymentNumber", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "subscriptionId", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "timestamp", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "token", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "verified", 
      Boolean,
      ~fieldSchema=S.bool,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module IndexerMeta = {
  let name = (IndexerMeta :> string)
  @genType
  type t = {
    chainId: bigint,
    envioVersion: option<string>,
    id: id,
    indexingLatencyMs: option<bigint>,
    lastSyncTimestamp: bigint,
    latestIndexedBlock: bigint,
    latestIndexedTimestamp: bigint,
    performanceScore: option<float>,
  }

  let schema = S.object((s): t => {
    chainId: s.field("chainId", BigInt.schema),
    envioVersion: s.field("envioVersion", S.null(S.string)),
    id: s.field("id", S.string),
    indexingLatencyMs: s.field("indexingLatencyMs", S.null(BigInt.schema)),
    lastSyncTimestamp: s.field("lastSyncTimestamp", BigInt.schema),
    latestIndexedBlock: s.field("latestIndexedBlock", BigInt.schema),
    latestIndexedTimestamp: s.field("latestIndexedTimestamp", BigInt.schema),
    performanceScore: s.field("performanceScore", S.null(S.float)),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "chainId", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "envioVersion", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "id", 
      Text,
      ~fieldSchema=S.string,
      ~isPrimaryKey,
      
      
      
      
      ),
      mkField(
      "indexingLatencyMs", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "lastSyncTimestamp", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "latestIndexedBlock", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "latestIndexedTimestamp", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "performanceScore", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module Intent = {
  let name = (Intent :> string)
  @genType
  type t = {
    amount: bigint,
    createdAt: bigint,
    createdAtBlock: bigint,
    expiry: bigint,
    id: id,
    interval: bigint,
    maxPayments: bigint,
    maxTotalAmount: bigint,
    merchant: string,
    performanceScore: option<float>,
    signature: option<string>,
    status: string,
    subscriber: string,
    subscriptionId: string,
    token: string,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    createdAt: s.field("createdAt", BigInt.schema),
    createdAtBlock: s.field("createdAtBlock", BigInt.schema),
    expiry: s.field("expiry", BigInt.schema),
    id: s.field("id", S.string),
    interval: s.field("interval", BigInt.schema),
    maxPayments: s.field("maxPayments", BigInt.schema),
    maxTotalAmount: s.field("maxTotalAmount", BigInt.schema),
    merchant: s.field("merchant", S.string),
    performanceScore: s.field("performanceScore", S.null(S.float)),
    signature: s.field("signature", S.null(S.string)),
    status: s.field("status", S.string),
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
      "createdAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "createdAtBlock", 
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
      "performanceScore", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "signature", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "status", 
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

module MerchantPerformance = {
  let name = (MerchantPerformance :> string)
  @genType
  type t = {
    activeSubscriptions: bigint,
    averageLatencySeconds: option<float>,
    averagePaymentValue: option<bigint>,
    failedPayments: bigint,
    id: id,
    lastPaymentAt: option<bigint>,
    latencySamples: bigint,
    latencyTotalSeconds: bigint,
    merchant: string,
    performanceScore: option<float>,
    successfulPayments: bigint,
    totalPayments: bigint,
    totalRevenue: bigint,
    totalSubscriptions: bigint,
    updatedAt: bigint,
  }

  let schema = S.object((s): t => {
    activeSubscriptions: s.field("activeSubscriptions", BigInt.schema),
    averageLatencySeconds: s.field("averageLatencySeconds", S.null(S.float)),
    averagePaymentValue: s.field("averagePaymentValue", S.null(BigInt.schema)),
    failedPayments: s.field("failedPayments", BigInt.schema),
    id: s.field("id", S.string),
    lastPaymentAt: s.field("lastPaymentAt", S.null(BigInt.schema)),
    latencySamples: s.field("latencySamples", BigInt.schema),
    latencyTotalSeconds: s.field("latencyTotalSeconds", BigInt.schema),
    merchant: s.field("merchant", S.string),
    performanceScore: s.field("performanceScore", S.null(S.float)),
    successfulPayments: s.field("successfulPayments", BigInt.schema),
    totalPayments: s.field("totalPayments", BigInt.schema),
    totalRevenue: s.field("totalRevenue", BigInt.schema),
    totalSubscriptions: s.field("totalSubscriptions", BigInt.schema),
    updatedAt: s.field("updatedAt", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "activeSubscriptions", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "averageLatencySeconds", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "averagePaymentValue", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "failedPayments", 
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
      "lastPaymentAt", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "latencySamples", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "latencyTotalSeconds", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "performanceScore", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "successfulPayments", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalPayments", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalRevenue", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalSubscriptions", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "updatedAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module MerchantTokenStats = {
  let name = (MerchantTokenStats :> string)
  @genType
  type t = {
    activeSubscriptions: bigint,
    averageTransactionValue: bigint,
    chainId: bigint,
    id: id,
    merchant: string,
    token: string,
    tokenSymbol: string,
    totalPayments: bigint,
    totalRevenue: bigint,
    totalSubscriptions: bigint,
  }

  let schema = S.object((s): t => {
    activeSubscriptions: s.field("activeSubscriptions", BigInt.schema),
    averageTransactionValue: s.field("averageTransactionValue", BigInt.schema),
    chainId: s.field("chainId", BigInt.schema),
    id: s.field("id", S.string),
    merchant: s.field("merchant", S.string),
    token: s.field("token", S.string),
    tokenSymbol: s.field("tokenSymbol", S.string),
    totalPayments: s.field("totalPayments", BigInt.schema),
    totalRevenue: s.field("totalRevenue", BigInt.schema),
    totalSubscriptions: s.field("totalSubscriptions", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "activeSubscriptions", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "averageTransactionValue", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "chainId", 
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
      "token", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "tokenSymbol", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "totalPayments", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalRevenue", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalSubscriptions", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module Payment = {
  let name = (Payment :> string)
  @genType
  type t = {
    amount: bigint,
    blockNumber: bigint,
    chainId: bigint,
    executedAt: bigint,
    expectedAt: option<bigint>,
    fee: bigint,
    id: id,
    intentSignedAt: option<bigint>,
    latencySeconds: option<int>,
    merchant: string,
    merchantPerformanceId: option<string>,
    nexusAttestationId: option<string>,
    nexusVerified: bool,
    paymentNumber: bigint,
    relayer: string,
    relayerPerformanceId: option<string>,
    subscriber: string,
    subscriptionId: string,
    timestamp: bigint,
    token: string,
    tokenDecimals: option<int>,
    tokenSymbol: string,
    txHash: string,
    usdValue: option<bigint>,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    blockNumber: s.field("blockNumber", BigInt.schema),
    chainId: s.field("chainId", BigInt.schema),
    executedAt: s.field("executedAt", BigInt.schema),
    expectedAt: s.field("expectedAt", S.null(BigInt.schema)),
    fee: s.field("fee", BigInt.schema),
    id: s.field("id", S.string),
    intentSignedAt: s.field("intentSignedAt", S.null(BigInt.schema)),
    latencySeconds: s.field("latencySeconds", S.null(S.int)),
    merchant: s.field("merchant", S.string),
    merchantPerformanceId: s.field("merchantPerformanceId", S.null(S.string)),
    nexusAttestationId: s.field("nexusAttestationId", S.null(S.string)),
    nexusVerified: s.field("nexusVerified", S.bool),
    paymentNumber: s.field("paymentNumber", BigInt.schema),
    relayer: s.field("relayer", S.string),
    relayerPerformanceId: s.field("relayerPerformanceId", S.null(S.string)),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
    timestamp: s.field("timestamp", BigInt.schema),
    token: s.field("token", S.string),
    tokenDecimals: s.field("tokenDecimals", S.null(S.int)),
    tokenSymbol: s.field("tokenSymbol", S.string),
    txHash: s.field("txHash", S.string),
    usdValue: s.field("usdValue", S.null(BigInt.schema)),
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
      "blockNumber", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "chainId", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "executedAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "expectedAt", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
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
      "intentSignedAt", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "latencySeconds", 
      Integer,
      ~fieldSchema=S.null(S.int),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "merchantPerformanceId", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "nexusAttestationId", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "nexusVerified", 
      Boolean,
      ~fieldSchema=S.bool,
      
      
      
      
      
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
      "relayerPerformanceId", 
      Text,
      ~fieldSchema=S.null(S.string),
      
      ~isNullable,
      
      
      
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
      "timestamp", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "token", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "tokenDecimals", 
      Integer,
      ~fieldSchema=S.null(S.int),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "tokenSymbol", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "txHash", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "usdValue", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

module RelayerPerformance = {
  let name = (RelayerPerformance :> string)
  @genType
  type t = {
    averageLatencySeconds: option<float>,
    chainId: bigint,
    executions: bigint,
    failedExecutions: bigint,
    id: id,
    latencySamples: bigint,
    latencyTotalSeconds: bigint,
    performanceScore: option<float>,
    relayer: string,
    successfulExecutions: bigint,
    totalFees: bigint,
    updatedAt: bigint,
  }

  let schema = S.object((s): t => {
    averageLatencySeconds: s.field("averageLatencySeconds", S.null(S.float)),
    chainId: s.field("chainId", BigInt.schema),
    executions: s.field("executions", BigInt.schema),
    failedExecutions: s.field("failedExecutions", BigInt.schema),
    id: s.field("id", S.string),
    latencySamples: s.field("latencySamples", BigInt.schema),
    latencyTotalSeconds: s.field("latencyTotalSeconds", BigInt.schema),
    performanceScore: s.field("performanceScore", S.null(S.float)),
    relayer: s.field("relayer", S.string),
    successfulExecutions: s.field("successfulExecutions", BigInt.schema),
    totalFees: s.field("totalFees", BigInt.schema),
    updatedAt: s.field("updatedAt", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "averageLatencySeconds", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "chainId", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "executions", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "failedExecutions", 
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
      "latencySamples", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "latencyTotalSeconds", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "performanceScore", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "relayer", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "successfulExecutions", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "totalFees", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "updatedAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
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

module SubscriberStats = {
  let name = (SubscriberStats :> string)
  @genType
  type t = {
    activeSubscriptions: bigint,
    id: id,
    lastPaymentAt: option<bigint>,
    merchant: string,
    payments: bigint,
    performanceScore: option<float>,
    subscriber: string,
    totalPaid: bigint,
    updatedAt: bigint,
  }

  let schema = S.object((s): t => {
    activeSubscriptions: s.field("activeSubscriptions", BigInt.schema),
    id: s.field("id", S.string),
    lastPaymentAt: s.field("lastPaymentAt", S.null(BigInt.schema)),
    merchant: s.field("merchant", S.string),
    payments: s.field("payments", BigInt.schema),
    performanceScore: s.field("performanceScore", S.null(S.float)),
    subscriber: s.field("subscriber", S.string),
    totalPaid: s.field("totalPaid", BigInt.schema),
    updatedAt: s.field("updatedAt", BigInt.schema),
  })

  let rowsSchema = S.array(schema)

  @genType
  type indexedFieldOperations = {
    
  }

  let table = mkTable(
    (name :> string),
    ~fields=[
      mkField(
      "activeSubscriptions", 
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
      "lastPaymentAt", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "merchant", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "payments", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "performanceScore", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "subscriber", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "totalPaid", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "updatedAt", 
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

module Subscription = {
  let name = (Subscription :> string)
  @genType
  type t = {
    amount: bigint,
    chainId: bigint,
    createdAt: bigint,
    createdAtBlock: bigint,
    expiry: bigint,
    id: id,
    intentSignedAt: option<bigint>,
    interval: bigint,
    maxPayments: bigint,
    maxTotalAmount: bigint,
    merchant: string,
    paymentsExecuted: bigint,
    performanceScore: option<float>,
    startTime: bigint,
    status: string,
    subscriber: string,
    subscriptionId: string,
    token: string,
    tokenSymbol: string,
    totalAmountPaid: bigint,
  }

  let schema = S.object((s): t => {
    amount: s.field("amount", BigInt.schema),
    chainId: s.field("chainId", BigInt.schema),
    createdAt: s.field("createdAt", BigInt.schema),
    createdAtBlock: s.field("createdAtBlock", BigInt.schema),
    expiry: s.field("expiry", BigInt.schema),
    id: s.field("id", S.string),
    intentSignedAt: s.field("intentSignedAt", S.null(BigInt.schema)),
    interval: s.field("interval", BigInt.schema),
    maxPayments: s.field("maxPayments", BigInt.schema),
    maxTotalAmount: s.field("maxTotalAmount", BigInt.schema),
    merchant: s.field("merchant", S.string),
    paymentsExecuted: s.field("paymentsExecuted", BigInt.schema),
    performanceScore: s.field("performanceScore", S.null(S.float)),
    startTime: s.field("startTime", BigInt.schema),
    status: s.field("status", S.string),
    subscriber: s.field("subscriber", S.string),
    subscriptionId: s.field("subscriptionId", S.string),
    token: s.field("token", S.string),
    tokenSymbol: s.field("tokenSymbol", S.string),
    totalAmountPaid: s.field("totalAmountPaid", BigInt.schema),
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
      "chainId", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "createdAt", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "createdAtBlock", 
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
      "intentSignedAt", 
      Numeric,
      ~fieldSchema=S.null(BigInt.schema),
      
      ~isNullable,
      
      
      
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
      "paymentsExecuted", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "performanceScore", 
      DoublePrecision,
      ~fieldSchema=S.null(S.float),
      
      ~isNullable,
      
      
      
      ),
      mkField(
      "startTime", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
      mkField(
      "status", 
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
      mkField(
      "tokenSymbol", 
      Text,
      ~fieldSchema=S.string,
      
      
      
      
      
      ),
      mkField(
      "totalAmountPaid", 
      Numeric,
      ~fieldSchema=BigInt.schema,
      
      
      
      
      
      ),
    ],
  )

  let entityHistory = table->EntityHistory.fromTable(~schema)

  external castToInternal: t => Internal.entity = "%identity"
}

let userEntities = [
  module(CrossChainAttestation),
  module(IndexerMeta),
  module(Intent),
  module(MerchantPerformance),
  module(MerchantTokenStats),
  module(Payment),
  module(RelayerPerformance),
  module(RelayerRegistry_EmergencySlash),
  module(RelayerRegistry_ExecutionRecorded),
  module(RelayerRegistry_OwnershipTransferred),
  module(RelayerRegistry_RelayerRegistered),
  module(RelayerRegistry_RelayerRestaked),
  module(RelayerRegistry_RelayerSlashed),
  module(RelayerRegistry_RelayerUnregistered),
  module(RelayerRegistry_SlashingParametersUpdated),
  module(RelayerRegistry_WithdrawalRequested),
  module(SubscriberStats),
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
  module(Subscription),
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
