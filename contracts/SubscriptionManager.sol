// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SubscriptionManager {
    enum SubscriptionStatus {
        ACTIVE,
        PAUSED,
        CANCELLED,
        EXPIRED,
        COMPLETED
    }

    struct Subscription {
        address subscriber;
        address merchant;
        uint256 amount;
        uint256 interval;
        uint256 startTime;
        uint256 maxPayments;
        uint256 maxTotalAmount;
        uint256 expiry;
        uint256 nonce;
        SubscriptionStatus status;
    }

    struct SubscriptionIntent {
        address subscriber;
        address merchant;
        uint256 amount;
        uint256 interval;
        uint256 startTime;
        uint256 maxPayments;
        uint256 maxTotalAmount;
        uint256 expiry;
        uint256 nonce;
    }

    mapping(bytes32 => Subscription) public subscriptions;
    mapping(bytes32 => uint256) public executedPayments;
    
    address public immutable PYUSD_ADDRESS;
    uint256 public constant PROTOCOL_FEE_BPS = 50;

    bytes32 private immutable DOMAIN_SEPARATOR;
    bytes32 public constant SUBSCRIPTION_INTENT_TYPEHASH = keccak256(
        "SubscriptionIntent(address subscriber,address merchant,uint256 amount,uint256 interval,uint256 startTime,uint256 maxPayments,uint256 maxTotalAmount,uint256 expiry,uint256 nonce)"
    );

    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 amount,
        uint256 interval,
        uint256 maxPayments,
        uint256 maxTotalAmount,
        uint256 expiry
    );

    event SubscriptionPaused(
        bytes32 indexed subscriptionId,
        address indexed subscriber
    );

    event SubscriptionResumed(
        bytes32 indexed subscriptionId,
        address indexed subscriber
    );

    event SubscriptionCancelled(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant
    );

    event PaymentExecuted(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 paymentNumber,
        uint256 amount,
        uint256 fee,
        address relayer
    );

    event PaymentFailed(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 amount,
        string reason
    );

    constructor(address _pyusdAddress) {
        PYUSD_ADDRESS = _pyusdAddress;
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Aurum")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function verifyIntent(
        SubscriptionIntent calldata intent,
        bytes calldata signature
    ) public view returns (bool valid, address signer) {
        bytes32 structHash = _hashIntent(intent);
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash)
        );
        
        address recovered = ECDSA.recover(digest, signature);
        return (recovered == intent.subscriber, recovered);
    }

    function _hashIntent(
        SubscriptionIntent memory intent
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                SUBSCRIPTION_INTENT_TYPEHASH,
                intent.subscriber,
                intent.merchant,
                intent.amount,
                intent.interval,
                intent.startTime,
                intent.maxPayments,
                intent.maxTotalAmount,
                intent.expiry,
                intent.nonce
            )
        );
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    function createSubscription(
        SubscriptionIntent calldata intent,
        bytes calldata signature
    ) external returns (bytes32 subscriptionId) {
        // verify signature
        (bool valid, address signer) = verifyIntent(intent, signature);
        require(valid && signer == intent.subscriber, "Invalid signature");

        // validate subscription parameters
        _validateSubscriptionParams(intent);

        // compute subscription id
        subscriptionId = keccak256(abi.encodePacked(
            _hashIntent(intent),
            signature
        ));

        // ensure subscription doesnt alr exist
        require(subscriptions[subscriptionId].subscriber == address(0), "Subscription already exists");

        // check pyusd allowance
        uint256 requiredAllowance = intent.amount * intent.maxPayments;
        require(
            IERC20(PYUSD_ADDRESS).allowance(intent.subscriber, address(this)) >= requiredAllowance,
            "Insufficient PYUSD allowance"
        );

        // create subscription
        subscriptions[subscriptionId] = Subscription({
            subscriber: intent.subscriber,
            merchant: intent.merchant,
            amount: intent.amount,
            interval: intent.interval,
            startTime: intent.startTime,
            maxPayments: intent.maxPayments,
            maxTotalAmount: intent.maxTotalAmount,
            expiry: intent.expiry,
            nonce: intent.nonce,
            status: SubscriptionStatus.ACTIVE
        });

        emit SubscriptionCreated(
            subscriptionId,
            intent.subscriber,
            intent.merchant,
            intent.amount,
            intent.interval,
            intent.maxPayments,
            intent.maxTotalAmount,
            intent.expiry
        );

        return subscriptionId;
    }

    function executeSubscription(
        bytes32 subscriptionId,
        address relayer
    ) external {
        Subscription storage subscription = subscriptions[subscriptionId];
        
        // ensure subscription exists and is active
        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(subscription.status == SubscriptionStatus.ACTIVE, "Subscription not active");
        
        // check if subscription is expired
        if (block.timestamp > subscription.expiry) {
            subscription.status = SubscriptionStatus.EXPIRED;
            emit PaymentFailed(
                subscriptionId,
                subscription.subscriber,
                subscription.merchant,
                subscription.amount,
                "Subscription expired"
            );
            return;
        }
        
        // validate payment is due
        require(_isPaymentDue(subscriptionId), "Payment not due yet");
        
        // validate can execute payment
        require(_canExecutePayment(subscriptionId), "Cannot execute payment");
        
        // get current payment number
        uint256 currentPaymentNumber = executedPayments[subscriptionId] + 1;
        
        // calculate protocol fee
        uint256 fee = (subscription.amount * PROTOCOL_FEE_BPS) / 10000;
        uint256 merchantAmount = subscription.amount - fee;
        
        // attempt transfers
        IERC20 pyusd = IERC20(PYUSD_ADDRESS);
        
        try pyusd.transferFrom(subscription.subscriber, subscription.merchant, merchantAmount) {
            // merchant transfer succeeded, now transfer fee to relayer
            try pyusd.transferFrom(subscription.subscriber, relayer, fee) {
                // both transfers succeeded
                executedPayments[subscriptionId]++;
                
                emit PaymentExecuted(
                    subscriptionId,
                    subscription.subscriber,
                    subscription.merchant,
                    currentPaymentNumber,
                    subscription.amount,
                    fee,
                    relayer
                );
                
                // check if this was last payment
                if (executedPayments[subscriptionId] >= subscription.maxPayments) {
                    subscription.status = SubscriptionStatus.COMPLETED;
                }
                
            } catch {
                // fee transfer failed, emit payment failed event
                emit PaymentFailed(
                    subscriptionId,
                    subscription.subscriber,
                    subscription.merchant,
                    subscription.amount,
                    "Fee transfer failed"
                );
            }
        } catch {
            // merchant transfer failed
            emit PaymentFailed(
                subscriptionId,
                subscription.subscriber,
                subscription.merchant,
                subscription.amount,
                "Transfer failed"
            );
        }
    }
    
    function _isPaymentDue(bytes32 subscriptionId) internal view returns (bool) {
        Subscription storage subscription = subscriptions[subscriptionId];
        uint256 paymentsExecuted = executedPayments[subscriptionId];
        uint256 nextPaymentTime = subscription.startTime + (paymentsExecuted * subscription.interval);
        
        return block.timestamp >= nextPaymentTime;
    }
    
    function _canExecutePayment(bytes32 subscriptionId) internal view returns (bool) {
        Subscription storage subscription = subscriptions[subscriptionId];
        uint256 paymentsExecuted = executedPayments[subscriptionId];
        
        // check if we havent exceeded max payments
        if (paymentsExecuted >= subscription.maxPayments) {
            return false;
        }
        
        // check if total amount wouldnt exceed max total amount
        uint256 totalPaidSoFar = paymentsExecuted * subscription.amount;
        if (totalPaidSoFar + subscription.amount > subscription.maxTotalAmount) {
            return false;
        }
        
        IERC20 pyusd = IERC20(PYUSD_ADDRESS);
        
        // check subscriber has sufficient balance
        if (pyusd.balanceOf(subscription.subscriber) < subscription.amount) {
            return false;
        }
        
        // check subscriber has sufficient allowance
        if (pyusd.allowance(subscription.subscriber, address(this)) < subscription.amount) {
            return false;
        }
        
        return true;
    }

    function _validateSubscriptionParams(SubscriptionIntent calldata intent) internal view {
        require(intent.expiry > block.timestamp, "Subscription intent expired");
        require(intent.startTime <= intent.expiry, "Start time must be before expiry");
        require(intent.amount > 0, "Amount must be greater than zero");
        require(intent.interval > 0, "Interval must be greater than zero");
        require(intent.maxPayments > 0, "Max payments must be greater than zero");
        require(intent.maxTotalAmount >= intent.amount * intent.maxPayments, "Max total amount insufficient");
    }
}