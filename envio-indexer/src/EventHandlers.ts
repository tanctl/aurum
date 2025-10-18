import {
  SubscriptionCreated,
  SubscriptionPaused,
  SubscriptionResumed,
  SubscriptionCancelled,
  PaymentExecuted,
  PaymentFailed,
  NexusAttestationSubmitted,
  NexusAttestationVerified,
} from "../generated/SubscriptionManager/SubscriptionManager";
import {
  RelayerRegistered,
  RelayerUnregistered,
  ExecutionRecorded,
} from "../generated/RelayerRegistry/RelayerRegistry";
import {
  Subscription,
  Payment,
  MerchantStats,
  MerchantTokenStats,
  RelayerStats,
  CrossChainAttestation,
} from "../generated/schema";
import { BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";

const ZERO_ADDRESS_HEX = "0x0000000000000000000000000000000000000000";

function buildId(prefix: Bytes, chainId: i32): string {
  return prefix.toHexString().concat("-").concat(chainId.toString());
}

function subscriptionScopedId(subscription: Subscription, suffix: string): string {
  return subscription.id.concat("-").concat(suffix);
}

function normalizeHex(bytes: Bytes): string {
  return bytes.toHexString().toLowerCase();
}

function loadPyusdHex(): string | null {
  let context = dataSource.context();
  let value = context.getString("pyusdAddress");
  if (value) {
    return value.toLowerCase();
  }
  return null;
}

function resolveTokenSymbol(token: Bytes): string {
  let normalized = normalizeHex(token);
  if (normalized == ZERO_ADDRESS_HEX) {
    return "ETH";
  }
  let pyusdHex = loadPyusdHex();
  if (pyusdHex && normalized == pyusdHex) {
    return "PYUSD";
  }
  return "UNKNOWN";
}

function createMerchantStats(id: Bytes, chainId: i32): MerchantStats {
  let stats = new MerchantStats(buildId(id, chainId));
  stats.merchant = id;
  stats.totalSubscriptions = 0;
  stats.activeSubscriptions = 0;
  stats.totalRevenue = BigInt.zero();
  stats.totalPayments = 0;
  stats.chainId = chainId;
  stats.save();
  return stats;
}

function merchantTokenStatsId(merchant: Bytes, token: Bytes, chainId: i32): string {
  return merchant
    .toHexString()
    .concat("-")
    .concat(token.toHexString())
    .concat("-")
    .concat(chainId.toString());
}

function createMerchantTokenStats(
  merchant: Bytes,
  token: Bytes,
  tokenSymbol: string,
  chainId: i32
): MerchantTokenStats {
  let stats = new MerchantTokenStats(merchantTokenStatsId(merchant, token, chainId));
  stats.merchant = merchant;
  stats.token = token;
  stats.tokenSymbol = tokenSymbol;
  stats.totalSubscriptions = 0;
  stats.activeSubscriptions = 0;
  stats.totalRevenue = BigInt.zero();
  stats.totalPayments = 0;
  stats.chainId = chainId;
  stats.save();
  return stats;
}

function getOrCreateMerchantTokenStats(
  merchant: Bytes,
  token: Bytes,
  tokenSymbol: string,
  chainId: i32
): MerchantTokenStats {
  let id = merchantTokenStatsId(merchant, token, chainId);
  let stats = MerchantTokenStats.load(id);
  if (stats == null) {
    stats = createMerchantTokenStats(merchant, token, tokenSymbol, chainId);
  }
  return stats as MerchantTokenStats;
}

function createRelayerStats(id: Bytes, chainId: i32): RelayerStats {
  let stats = new RelayerStats(buildId(id, chainId));
  stats.relayer = id;
  stats.successfulExecutions = 0;
  stats.failedExecutions = 0;
  stats.totalFeesEarned = BigInt.zero();
  stats.isActive = true;
  stats.stakedAmount = BigInt.zero();
  stats.chainId = chainId;
  stats.save();
  return stats;
}

export function handleSubscriptionCreated(event: SubscriptionCreated): void {
  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let entity = new Subscription(subscriptionKey);
  let tokenSymbol = resolveTokenSymbol(event.params.token);

  entity.subscriptionId = event.params.subscriptionId;
  entity.subscriber = event.params.subscriber;
  entity.merchant = event.params.merchant;
  entity.token = event.params.token;
  entity.tokenSymbol = tokenSymbol;
  entity.amount = event.params.amount;
  entity.interval = event.params.interval;
  entity.startTime = event.block.timestamp;
  entity.maxPayments = event.params.maxPayments.toI32();
  entity.maxTotalAmount = event.params.maxTotalAmount;
  entity.expiry = event.params.expiry;
  entity.status = "ACTIVE";
  entity.paymentsExecuted = 0;
  entity.totalAmountPaid = BigInt.zero();
  entity.createdAt = event.block.timestamp;
  entity.createdAtBlock = event.block.number;
  entity.chainId = chainId;
  entity.save();

  let merchantAggregate = MerchantStats.load(buildId(event.params.merchant, chainId));
  if (merchantAggregate == null) {
    merchantAggregate = createMerchantStats(event.params.merchant, chainId);
  }
  merchantAggregate.totalSubscriptions += 1;
  merchantAggregate.activeSubscriptions += 1;
  merchantAggregate.save();

  let tokenStats = getOrCreateMerchantTokenStats(
    event.params.merchant,
    event.params.token,
    tokenSymbol,
    chainId
  );
  tokenStats.totalSubscriptions += 1;
  tokenStats.activeSubscriptions += 1;
  tokenStats.save();
}

export function handleSubscriptionPaused(event: SubscriptionPaused): void {
  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let entity = Subscription.load(subscriptionKey);
  if (entity == null) {
    return;
  }
  entity.status = "PAUSED";
  entity.save();

  let aggregate = MerchantStats.load(buildId(entity.merchant, chainId));
  if (aggregate != null && aggregate.activeSubscriptions > 0) {
    aggregate.activeSubscriptions -= 1;
    aggregate.save();
  }

  let tokenStats = MerchantTokenStats.load(
    merchantTokenStatsId(entity.merchant, entity.token, chainId)
  );
  if (tokenStats != null && tokenStats.activeSubscriptions > 0) {
    tokenStats.activeSubscriptions -= 1;
    tokenStats.save();
  }
}

export function handleSubscriptionResumed(event: SubscriptionResumed): void {
  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let entity = Subscription.load(subscriptionKey);
  if (entity == null) {
    return;
  }
  entity.status = "ACTIVE";
  entity.save();

  let aggregate = MerchantStats.load(buildId(entity.merchant, chainId));
  if (aggregate == null) {
    aggregate = createMerchantStats(entity.merchant, chainId);
  }
  aggregate.activeSubscriptions += 1;
  aggregate.save();

  let tokenStats = getOrCreateMerchantTokenStats(
    entity.merchant,
    entity.token,
    entity.tokenSymbol,
    chainId
  );
  tokenStats.activeSubscriptions += 1;
  tokenStats.save();
}

export function handleSubscriptionCancelled(event: SubscriptionCancelled): void {
  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let entity = Subscription.load(subscriptionKey);
  if (entity == null) {
    return;
  }
  let wasActive = entity.status == "ACTIVE";
  entity.status = "CANCELLED";
  entity.save();

  if (wasActive) {
    let aggregate = MerchantStats.load(buildId(entity.merchant, chainId));
    if (aggregate != null && aggregate.activeSubscriptions > 0) {
      aggregate.activeSubscriptions -= 1;
      aggregate.save();
    }

    let tokenStats = MerchantTokenStats.load(
      merchantTokenStatsId(entity.merchant, entity.token, chainId)
    );
    if (tokenStats != null && tokenStats.activeSubscriptions > 0) {
      tokenStats.activeSubscriptions -= 1;
      tokenStats.save();
    }
  }
}

export function handlePaymentExecuted(event: PaymentExecuted): void {
  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let subscription = Subscription.load(subscriptionKey);
  if (subscription == null) {
    return;
  }

  let token = event.params.token;
  let tokenSymbol = resolveTokenSymbol(token);
  let paymentId = subscriptionScopedId(
    subscription,
    event.params.paymentNumber.toString()
  );
  let payment = new Payment(paymentId);

  payment.subscription = subscription.id;
  payment.paymentNumber = event.params.paymentNumber.toI32();
  payment.amount = event.params.amount;
  payment.fee = event.params.fee;
  payment.relayer = event.params.relayer;
  payment.token = token;
  payment.tokenSymbol = tokenSymbol;
  payment.nexusAttestationId = null;
  payment.nexusVerified = false;
  payment.txHash = event.transaction.hash;
  payment.blockNumber = event.block.number;
  payment.timestamp = event.block.timestamp;
  payment.chainId = chainId;
  payment.save();

  subscription.paymentsExecuted += 1;
  subscription.totalAmountPaid = subscription.totalAmountPaid.plus(event.params.amount);
  subscription.save();

  let aggregate = MerchantStats.load(buildId(subscription.merchant, chainId));
  if (aggregate == null) {
    aggregate = createMerchantStats(subscription.merchant, chainId);
  }
  aggregate.totalPayments += 1;
  aggregate.totalRevenue = aggregate.totalRevenue.plus(event.params.amount);
  aggregate.save();

  let tokenStats = getOrCreateMerchantTokenStats(
    subscription.merchant,
    token,
    tokenSymbol,
    chainId
  );
  tokenStats.totalPayments += 1;
  tokenStats.totalRevenue = tokenStats.totalRevenue.plus(event.params.amount);
  tokenStats.save();

  let relayer = RelayerStats.load(buildId(event.params.relayer, chainId));
  if (relayer == null) {
    relayer = createRelayerStats(event.params.relayer, chainId);
  }
  relayer.successfulExecutions += 1;
  relayer.totalFeesEarned = relayer.totalFeesEarned.plus(event.params.fee);
  relayer.save();
}

export function handlePaymentFailed(event: PaymentFailed): void {
  let chainId = event.transaction.chainId.toI32();
  let relayerAddress = event.transaction.from;
  let relayer = RelayerStats.load(buildId(relayerAddress, chainId));
  if (relayer == null) {
    return;
  }
  relayer.failedExecutions += 1;
  relayer.save();
}

export function handleRelayerRegistered(event: RelayerRegistered): void {
  let chainId = event.transaction.chainId.toI32();
  let relayer = RelayerStats.load(buildId(event.params.relayer, chainId));
  if (relayer == null) {
    relayer = createRelayerStats(event.params.relayer, chainId);
  }
  relayer.isActive = true;
  relayer.stakedAmount = event.params.stakedAmount;
  relayer.save();
}

export function handleRelayerUnregistered(event: RelayerUnregistered): void {
  let chainId = event.transaction.chainId.toI32();
  let relayer = RelayerStats.load(buildId(event.params.relayer, chainId));
  if (relayer == null) {
    return;
  }
  relayer.isActive = false;
  relayer.stakedAmount = BigInt.zero();
  relayer.save();
}

export function handleExecutionRecorded(event: ExecutionRecorded): void {
  let chainId = event.transaction.chainId.toI32();
  let relayer = RelayerStats.load(buildId(event.params.relayer, chainId));
  if (relayer == null) {
    relayer = createRelayerStats(event.params.relayer, chainId);
  }

  if (event.params.success) {
    relayer.successfulExecutions += 1;
    relayer.totalFeesEarned = relayer.totalFeesEarned.plus(event.params.feeAmount);
  } else {
    relayer.failedExecutions += 1;
  }
  relayer.save();
}

export function handleNexusAttestationSubmitted(
  event: NexusAttestationSubmitted
): void {
  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let subscription = Subscription.load(subscriptionKey);
  if (subscription == null) {
    return;
  }

  let paymentId = subscriptionScopedId(
    subscription,
    event.params.paymentNumber.toString()
  );
  let payment = Payment.load(paymentId);
  if (payment == null) {
    return;
  }

  payment.nexusAttestationId = event.params.attestationId;
  payment.nexusVerified = false;
  payment.save();

  let attestation = new CrossChainAttestation(event.params.attestationId);
  attestation.subscriptionId = subscription.subscriptionId;
  attestation.paymentNumber = event.params.paymentNumber.toI32();
  attestation.sourceChainId = chainId;
  attestation.token = payment.token;
  attestation.amount = payment.amount;
  attestation.merchant = subscription.merchant;
  attestation.txHash = event.transaction.hash;
  attestation.blockNumber = event.block.number;
  attestation.timestamp = event.block.timestamp;
  attestation.verified = false;
  attestation.createdAt = event.block.timestamp;
  attestation.save();
}

export function handleNexusAttestationVerified(
  event: NexusAttestationVerified
): void {
  let attestationId = event.params.attestationId;
  let attestation = CrossChainAttestation.load(attestationId);
  if (attestation == null) {
    return;
  }

  attestation.verified = true;
  attestation.save();

  let chainId = event.transaction.chainId.toI32();
  let subscriptionKey = buildId(attestation.subscriptionId, chainId);
  let subscription = Subscription.load(subscriptionKey);
  if (subscription == null) {
    return;
  }

  let paymentId = subscriptionScopedId(
    subscription,
    attestation.paymentNumber.toString()
  );
  let payment = Payment.load(paymentId);
  if (payment == null) {
    return;
  }

  payment.nexusVerified = true;
  payment.save();
}
