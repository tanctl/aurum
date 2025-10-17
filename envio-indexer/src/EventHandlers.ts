import {
  SubscriptionCreated,
  SubscriptionPaused,
  SubscriptionResumed,
  SubscriptionCancelled,
  PaymentExecuted,
  PaymentFailed,
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
  RelayerStats,
} from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

function buildId(prefix: Bytes, chainId: i32): string {
  return prefix.toHexString().concat("-").concat(chainId.toString());
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
  entity.subscriptionId = event.params.subscriptionId;
  entity.subscriber = event.params.subscriber;
  entity.merchant = event.params.merchant;
  entity.token = event.params.token;
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

  let merchantId = buildId(event.params.merchant, chainId);
  let stats = MerchantStats.load(merchantId);
  if (stats == null) {
    stats = createMerchantStats(event.params.merchant, chainId);
  }
  stats.totalSubscriptions += 1;
  stats.activeSubscriptions += 1;
  stats.save();
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

  let stats = MerchantStats.load(buildId(entity.merchant, chainId));
  if (stats != null && stats.activeSubscriptions > 0) {
    stats.activeSubscriptions -= 1;
    stats.save();
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

  let stats = MerchantStats.load(buildId(entity.merchant, chainId));
  if (stats == null) {
    stats = createMerchantStats(entity.merchant, chainId);
  }
  stats.activeSubscriptions += 1;
  stats.save();
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
    let stats = MerchantStats.load(buildId(entity.merchant, chainId));
    if (stats != null && stats.activeSubscriptions > 0) {
      stats.activeSubscriptions -= 1;
      stats.save();
    }
  }
}

export function handlePaymentExecuted(event: PaymentExecuted): void {
  let chainId = event.transaction.chainId.toI32();
  let paymentId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.params.paymentNumber.toString());
  let payment = new Payment(paymentId);

  let subscriptionKey = buildId(event.params.subscriptionId, chainId);
  let subscription = Subscription.load(subscriptionKey);
  if (subscription == null) {
    return;
  }

  payment.subscription = subscription.id;
  payment.paymentNumber = event.params.paymentNumber.toI32();
  payment.amount = event.params.amount;
  payment.fee = event.params.fee;
  payment.relayer = event.params.relayer;
  payment.token = event.params.token;
  payment.txHash = event.transaction.hash;
  payment.blockNumber = event.block.number;
  payment.timestamp = event.block.timestamp;
  payment.chainId = chainId;
  payment.save();

  subscription.paymentsExecuted += 1;
  subscription.totalAmountPaid = subscription.totalAmountPaid.plus(event.params.amount);
  subscription.save();

  let stats = MerchantStats.load(buildId(subscription.merchant, chainId));
  if (stats == null) {
    stats = createMerchantStats(subscription.merchant, chainId);
  }
  stats.totalPayments += 1;
  stats.totalRevenue = stats.totalRevenue.plus(event.params.amount);
  stats.save();

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
