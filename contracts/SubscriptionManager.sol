// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RelayerRegistry.sol";

contract SubscriptionManager is ReentrancyGuard, Ownable {
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
        address token;
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
        address token;
    }

    mapping(bytes32 => Subscription) public subscriptions;
    mapping(bytes32 => uint256) public executedPayments;
    mapping(address => uint256) public currentNonce;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => address) public subscriptionToken;
    mapping(bytes32 => uint256) public ethDeposits;
    mapping(address => uint256) public activeSubscriptionCounts;
    address[] private supportedTokenList;
    mapping(address => uint256) private supportedTokenIndex;

    RelayerRegistry public immutable RELAYER_REGISTRY;
    uint256 public constant PROTOCOL_FEE_BPS = 50; // 0.5% protocol fee

    bytes32 private immutable DOMAIN_SEPARATOR;
    bytes32 public constant SUBSCRIPTION_INTENT_TYPEHASH = keccak256(
        "SubscriptionIntent(address subscriber,address merchant,uint256 amount,uint256 interval,uint256 startTime,uint256 maxPayments,uint256 maxTotalAmount,uint256 expiry,uint256 nonce,address token)"
    );
    bytes32 public constant PAUSE_REQUEST_TYPEHASH = keccak256(
        "PauseRequest(bytes32 subscriptionId,uint256 nonce)"
    );
    bytes32 public constant RESUME_REQUEST_TYPEHASH = keccak256(
        "ResumeRequest(bytes32 subscriptionId,uint256 nonce)"
    );

    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        address token,
        uint256 amount,
        uint256 interval,
        uint256 maxPayments,
        uint256 maxTotalAmount,
        uint256 expiry
    );

    event SubscriptionPaused(bytes32 indexed subscriptionId, address indexed subscriber);

    event SubscriptionResumed(bytes32 indexed subscriptionId, address indexed subscriber);

    event SubscriptionCancelled(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant
    );

    event PaymentExecuted(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        address token,
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

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);

    constructor(address[] memory supportedTokenAddresses, address _relayerRegistry)
        Ownable(msg.sender)
    {
        require(_relayerRegistry != address(0), "Invalid relayer registry address");

        RELAYER_REGISTRY = RelayerRegistry(_relayerRegistry);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Aurum")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        _addSupportedTokenInternal(address(0), false);
        for (uint256 i = 0; i < supportedTokenAddresses.length; i++) {
            address token = supportedTokenAddresses[i];
            if (token == address(0)) {
                continue;
            }
            _addSupportedTokenInternal(token, true);
        }
    }

    receive() external payable {}

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

    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "eth already enabled");
        _addSupportedTokenInternal(token, true);
    }

    function removeSupportedToken(address token) external onlyOwner {
        require(token != address(0), "cannot remove eth support");
        require(supportedTokens[token], "token not supported");
        require(activeSubscriptionCounts[token] == 0, "Active subscriptions present");

        supportedTokens[token] = false;

        uint256 index = supportedTokenIndex[token];
        require(index != 0, "token index missing");
        uint256 lastIndex = supportedTokenList.length;
        if (index != lastIndex) {
            address lastToken = supportedTokenList[lastIndex - 1];
            supportedTokenList[index - 1] = lastToken;
            supportedTokenIndex[lastToken] = index;
        }
        supportedTokenList.pop();
        supportedTokenIndex[token] = 0;

        emit TokenRemoved(token);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokenList;
    }

    function getSubscriptionToken(bytes32 subscriptionId) external view returns (address) {
        return subscriptionToken[subscriptionId];
    }

    function getNextNonce(address _subscriber) external view returns (uint256) {
        return currentNonce[_subscriber];
    }

    function getSubscription(bytes32 subscriptionId) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }

    function getPaymentCount(bytes32 subscriptionId) external view returns (uint256) {
        return executedPayments[subscriptionId];
    }

    function getNextPaymentTime(bytes32 subscriptionId) external view returns (uint256) {
        Subscription storage subscription = subscriptions[subscriptionId];
        require(subscription.subscriber != address(0), "Subscription does not exist");

        uint256 paymentsExecuted = executedPayments[subscriptionId];
        return subscription.startTime + (paymentsExecuted * subscription.interval);
    }

    function isSubscriptionActive(bytes32 subscriptionId) external view returns (bool) {
        Subscription storage subscription = subscriptions[subscriptionId];
        return subscription.subscriber != address(0) && subscription.status == SubscriptionStatus.ACTIVE;
    }

    function createSubscription(
        SubscriptionIntent calldata intent,
        bytes calldata signature
    ) external returns (bytes32 subscriptionId) {
        require(intent.nonce == currentNonce[intent.subscriber], "Invalid nonce");
        require(supportedTokens[intent.token], "Token not supported");

        (bool valid, address signer) = verifyIntent(intent, signature);
        require(valid && signer == intent.subscriber, "Invalid signature");

        _validateSubscriptionParams(intent);

        subscriptionId = keccak256(abi.encodePacked(_hashIntent(intent), signature));

        require(subscriptions[subscriptionId].subscriber == address(0), "Subscription already exists");

        if (intent.token != address(0)) {
            uint256 requiredAllowance = intent.amount * intent.maxPayments;
            require(
                IERC20(intent.token).allowance(intent.subscriber, address(this)) >= requiredAllowance,
                "Insufficient token allowance"
            );
        }

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
            token: intent.token,
            status: SubscriptionStatus.ACTIVE
        });

        subscriptionToken[subscriptionId] = intent.token;
        activeSubscriptionCounts[intent.token] += 1;

        currentNonce[intent.subscriber]++;

        emit SubscriptionCreated(
            subscriptionId,
            intent.subscriber,
            intent.merchant,
            intent.token,
            intent.amount,
            intent.interval,
            intent.maxPayments,
            intent.maxTotalAmount,
            intent.expiry
        );

        return subscriptionId;
    }

    function executeSubscription(bytes32 subscriptionId, address relayer) external nonReentrant {
        require(relayer == msg.sender, "Relayer mismatch");
        require(RELAYER_REGISTRY.canExecute(msg.sender), "Relayer not authorized");

        Subscription storage subscription = subscriptions[subscriptionId];

        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(subscription.status == SubscriptionStatus.ACTIVE, "Subscription not active");

        address token = subscriptionToken[subscriptionId];
        require(supportedTokens[token], "Token no longer supported");

        if (block.timestamp > subscription.expiry) {
            _decrementActiveCount(subscriptionId);
            subscription.status = SubscriptionStatus.EXPIRED;
            emit PaymentFailed(
                subscriptionId,
                subscription.subscriber,
                subscription.merchant,
                subscription.amount,
                "Subscription expired"
            );
            RELAYER_REGISTRY.recordExecution(msg.sender, false, 0);
            return;
        }

        require(_isPaymentDue(subscriptionId), "Payment not due yet");

        uint256 currentPaymentNumber = executedPayments[subscriptionId] + 1;
        uint256 fee = (subscription.amount * PROTOCOL_FEE_BPS) / 10000;

        if (!_canExecutePayment(subscriptionId, token)) {
            emit PaymentFailed(
                subscriptionId,
                subscription.subscriber,
                subscription.merchant,
                subscription.amount,
                "Execution constraints not met"
            );
            RELAYER_REGISTRY.recordExecution(msg.sender, false, 0);
            return;
        }

        uint256 merchantAmount = subscription.amount - fee;
        bool paymentSuccess;
        string memory failureReason;

        if (token == address(0)) {
            if (ethDeposits[subscriptionId] < subscription.amount) {
                failureReason = "Insufficient ETH deposit";
            } else {
                (bool sentMerchant, ) = subscription.merchant.call{value: merchantAmount}("");
                if (!sentMerchant) {
                    failureReason = "Merchant transfer failed";
                } else {
                    (bool sentFee, ) = msg.sender.call{value: fee}("");
                    require(sentFee, "Fee transfer failed");
                    ethDeposits[subscriptionId] -= subscription.amount;
                    paymentSuccess = true;
                }
            }
        } else {
            (paymentSuccess, failureReason) = _attemptPayment(subscription, token, merchantAmount, fee);
        }

        if (!paymentSuccess) {
            if (bytes(failureReason).length == 0) {
                failureReason = "Payment execution failed";
            }
            emit PaymentFailed(
                subscriptionId,
                subscription.subscriber,
                subscription.merchant,
                subscription.amount,
                failureReason
            );
            RELAYER_REGISTRY.recordExecution(msg.sender, false, 0);
            return;
        }

        executedPayments[subscriptionId]++;

        emit PaymentExecuted(
            subscriptionId,
            subscription.subscriber,
            subscription.merchant,
            token,
            currentPaymentNumber,
            subscription.amount,
            fee,
            msg.sender
        );

        RELAYER_REGISTRY.recordExecution(msg.sender, true, fee);

        if (executedPayments[subscriptionId] >= subscription.maxPayments) {
            _decrementActiveCount(subscriptionId);
            subscription.status = SubscriptionStatus.COMPLETED;
        }
    }

    function depositForSubscription(bytes32 subscriptionId) external payable nonReentrant {
        Subscription storage subscription = subscriptions[subscriptionId];
        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(subscriptionToken[subscriptionId] == address(0), "Not ETH subscription");
        require(subscription.subscriber == msg.sender, "Only subscriber");
        require(
            subscription.status == SubscriptionStatus.ACTIVE || subscription.status == SubscriptionStatus.PAUSED,
            "Subscription not active"
        );
        require(msg.value > 0, "No ETH sent");

        ethDeposits[subscriptionId] += msg.value;
    }

    function withdrawUnusedETH(bytes32 subscriptionId) external nonReentrant {
        Subscription storage subscription = subscriptions[subscriptionId];
        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(subscriptionToken[subscriptionId] == address(0), "Not ETH subscription");
        require(subscription.subscriber == msg.sender, "Only subscriber");
        require(
            subscription.status == SubscriptionStatus.CANCELLED ||
                subscription.status == SubscriptionStatus.EXPIRED ||
                subscription.status == SubscriptionStatus.COMPLETED,
            "Subscription still active"
        );

        uint256 balance = ethDeposits[subscriptionId];
        require(balance > 0, "No ETH to withdraw");
        ethDeposits[subscriptionId] = 0;

        (bool sent, ) = msg.sender.call{value: balance}("");
        require(sent, "Withdraw failed");
    }

    function pauseSubscription(bytes32 subscriptionId, bytes calldata signature) external {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(subscription.status == SubscriptionStatus.ACTIVE, "Subscription not active");

        bytes32 structHash = keccak256(
            abi.encode(PAUSE_REQUEST_TYPEHASH, subscriptionId, currentNonce[subscription.subscriber])
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash)
        );
        address signer = ECDSA.recover(digest, signature);
        require(signer == subscription.subscriber, "Invalid signature");

        currentNonce[subscription.subscriber]++;

        subscription.status = SubscriptionStatus.PAUSED;

        emit SubscriptionPaused(subscriptionId, subscription.subscriber);
    }

    function resumeSubscription(bytes32 subscriptionId, bytes calldata signature) external {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(subscription.status == SubscriptionStatus.PAUSED, "Subscription not paused");

        bytes32 structHash = keccak256(
            abi.encode(RESUME_REQUEST_TYPEHASH, subscriptionId, currentNonce[subscription.subscriber])
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash)
        );
        address signer = ECDSA.recover(digest, signature);
        require(signer == subscription.subscriber, "Invalid signature");

        currentNonce[subscription.subscriber]++;

        subscription.status = SubscriptionStatus.ACTIVE;

        emit SubscriptionResumed(subscriptionId, subscription.subscriber);
    }

    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage subscription = subscriptions[subscriptionId];

        require(subscription.subscriber != address(0), "Subscription does not exist");
        require(msg.sender == subscription.subscriber, "Only subscriber can cancel");
        require(
            subscription.status == SubscriptionStatus.ACTIVE || subscription.status == SubscriptionStatus.PAUSED,
            "Subscription cannot be cancelled"
        );

        _decrementActiveCount(subscriptionId);
        subscription.status = SubscriptionStatus.CANCELLED;

        emit SubscriptionCancelled(subscriptionId, subscription.subscriber, subscription.merchant);
    }

    function _hashIntent(SubscriptionIntent memory intent) internal pure returns (bytes32) {
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
                intent.nonce,
                intent.token
            )
        );
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    function _isPaymentDue(bytes32 subscriptionId) internal view returns (bool) {
        Subscription storage subscription = subscriptions[subscriptionId];
        uint256 paymentsExecuted = executedPayments[subscriptionId];
        uint256 nextPaymentTime = subscription.startTime + (paymentsExecuted * subscription.interval);
        return block.timestamp >= nextPaymentTime;
    }

    function _canExecutePayment(bytes32 subscriptionId, address token) internal view returns (bool) {
        Subscription storage subscription = subscriptions[subscriptionId];
        uint256 paymentsExecuted = executedPayments[subscriptionId];

        if (paymentsExecuted >= subscription.maxPayments) {
            return false;
        }

        uint256 totalPaidSoFar = paymentsExecuted * subscription.amount;
        if (totalPaidSoFar + subscription.amount > subscription.maxTotalAmount) {
            return false;
        }

        if (token == address(0)) {
            return true;
        }

        IERC20 paymentToken = IERC20(token);
        uint256 totalRequired = subscription.amount;

        if (paymentToken.balanceOf(subscription.subscriber) < totalRequired) {
            return false;
        }

        if (paymentToken.allowance(subscription.subscriber, address(this)) < totalRequired) {
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

    function _attemptPayment(
        Subscription storage subscription,
        address token,
        uint256 merchantAmount,
        uint256 fee
    ) internal returns (bool success, string memory failureReason) {
        IERC20 paymentToken = IERC20(token);

        uint256 totalRequired = subscription.amount;
        if (paymentToken.balanceOf(subscription.subscriber) < totalRequired) {
            return (false, "Insufficient balance for payment");
        }

        if (paymentToken.allowance(subscription.subscriber, address(this)) < totalRequired) {
            return (false, "Insufficient allowance for payment");
        }

        bytes memory transferData = abi.encodeWithSelector(
            IERC20.transferFrom.selector,
            subscription.subscriber,
            subscription.merchant,
            merchantAmount
        );

        bool merchantTransferSuccess = _callToken(address(paymentToken), transferData);
        if (!merchantTransferSuccess) {
            return (false, "Merchant transfer failed");
        }

        bytes memory feeTransferData = abi.encodeWithSelector(
            IERC20.transferFrom.selector,
            subscription.subscriber,
            msg.sender,
            fee
        );

        bool feeTransferSuccess = _callToken(address(paymentToken), feeTransferData);
        if (!feeTransferSuccess) {
            return (false, "Fee transfer failed");
        }

        return (true, "");
    }

    function _callToken(address token, bytes memory data) internal returns (bool) {
        (bool success, bytes memory returndata) = token.call(data);
        if (!success) {
            return false;
        }
        if (returndata.length == 0) {
            return true;
        }
        return abi.decode(returndata, (bool));
    }

    function _addSupportedTokenInternal(address token, bool emitEvent) internal {
        require(!supportedTokens[token], "Token already supported");
        supportedTokens[token] = true;
        supportedTokenList.push(token);
        supportedTokenIndex[token] = supportedTokenList.length;
        if (emitEvent) {
            emit TokenAdded(token);
        }
    }

    function _decrementActiveCount(bytes32 subscriptionId) internal {
        address token = subscriptionToken[subscriptionId];
        if (activeSubscriptionCounts[token] > 0) {
            activeSubscriptionCounts[token] -= 1;
        }
    }
}
