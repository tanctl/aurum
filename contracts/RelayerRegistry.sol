// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RelayerRegistry is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    struct Relayer {
        uint256 stakedAmount;
        uint256 successfulExecutions;
        uint256 failedExecutions;
        uint256 totalFeesEarned;
        uint256 withdrawalRequestTime;
        bool isActive;
        bool withdrawalRequested;
    }

    mapping(address => Relayer) public relayers;
    uint256 public constant MINIMUM_STAKE = 1000e6; // 1000 pyusd
    uint256 public constant SLASH_AMOUNT = 100e6;
    uint256 public constant CONSECUTIVE_FAILURES_THRESHOLD = 3;
    uint256 public constant SLASHING_COOLDOWN = 1 days;

    uint256 public slashAmountConfig = SLASH_AMOUNT;
    uint256 public failureThresholdConfig = CONSECUTIVE_FAILURES_THRESHOLD;

    mapping(address => uint256) public lastSlashTime;
    mapping(address => uint256) public consecutiveFailures;
    mapping(address => bool) public isSlashed;

    uint256 public constant WITHDRAWAL_DELAY = 7 days;
    address public immutable PYUSD_ADDRESS;
    address public subscriptionManager;

    event RelayerRegistered(
        address indexed relayer,
        uint256 stakedAmount
    );

    event RelayerUnregistered(
        address indexed relayer,
        uint256 returnedStake
    );

    event WithdrawalRequested(
        address indexed relayer,
        uint256 requestTime
    );

    event ExecutionRecorded(
        address indexed relayer,
        bool success,
        uint256 feeAmount
    );

    event RelayerSlashed(
        address indexed relayer,
        uint256 slashAmount,
        uint256 remainingStake
    );

    event RelayerRestaked(
        address indexed relayer,
        uint256 amount,
        uint256 newStake
    );

    event SlashingParametersUpdated(
        uint256 slashAmount,
        uint256 failureThreshold
    );

    event EmergencySlash(
        address indexed relayer,
        uint256 amount,
        string reason
    );

    modifier onlySubscriptionManager() {
        require(msg.sender == subscriptionManager, "Only SubscriptionManager");
        _;
    }

    constructor(address _pyusdAddress) Ownable(msg.sender) {
        require(_pyusdAddress != address(0), "Invalid PYUSD address");
        PYUSD_ADDRESS = _pyusdAddress;
    }

    function setSubscriptionManager(address _subscriptionManager) external onlyOwner {
        require(_subscriptionManager != address(0), "Invalid address");
        require(subscriptionManager == address(0), "Already set");
        subscriptionManager = _subscriptionManager;
    }

    function registerRelayer(uint256 stakeAmount) external nonReentrant {
        require(relayers[msg.sender].stakedAmount == 0, "Relayer already registered");
        require(stakeAmount >= MINIMUM_STAKE, "Insufficient stake amount");

        // stake tokens to become active relayer
        IERC20 token = IERC20(PYUSD_ADDRESS);
        token.safeTransferFrom(msg.sender, address(this), stakeAmount);

        relayers[msg.sender] = Relayer({
            stakedAmount: stakeAmount,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalFeesEarned: 0,
            isActive: true,
            withdrawalRequestTime: 0,
            withdrawalRequested: false
        });
        consecutiveFailures[msg.sender] = 0;
        isSlashed[msg.sender] = false;
        lastSlashTime[msg.sender] = 0;

        emit RelayerRegistered(msg.sender, stakeAmount);
    }

    function requestWithdrawal() external {
        Relayer storage relayer = relayers[msg.sender];
        require(relayer.isActive, "Relayer not active");
        require(relayer.stakedAmount > 0, "Relayer not registered");
        require(!relayer.withdrawalRequested, "Withdrawal already requested");

        relayer.withdrawalRequested = true;
        relayer.withdrawalRequestTime = block.timestamp;

        emit WithdrawalRequested(msg.sender, block.timestamp);
    }

    function unregisterRelayer() external nonReentrant {
        Relayer storage relayer = relayers[msg.sender];
        require(relayer.isActive, "Relayer not active");
        require(relayer.stakedAmount > 0, "Relayer not registered");
        require(relayer.withdrawalRequested, "Must request withdrawal first");
        require(
            block.timestamp >= relayer.withdrawalRequestTime + WITHDRAWAL_DELAY,
            "Withdrawal delay not met"
        );
        require(!isSlashed[msg.sender], "Relayer slashed");


        uint256 stakeToReturn = relayer.stakedAmount;
        
        // clear relayer state before transfer
        relayer.isActive = false;
        relayer.stakedAmount = 0;
        relayer.withdrawalRequested = false;
        relayer.withdrawalRequestTime = 0;

        IERC20(PYUSD_ADDRESS).safeTransfer(msg.sender, stakeToReturn);

        emit RelayerUnregistered(msg.sender, stakeToReturn);

        delete relayers[msg.sender];
        delete consecutiveFailures[msg.sender];
        delete lastSlashTime[msg.sender];
        delete isSlashed[msg.sender];
    }

    function recordExecution(
        address relayerAddress,
        bool success,
        uint256 feeAmount
    ) external onlySubscriptionManager {
        Relayer storage relayer = relayers[relayerAddress];
        require(relayer.stakedAmount > 0, "Relayer not registered");
        require(relayer.isActive, "Relayer not active");
        require(!isSlashed[relayerAddress], "Relayer slashed");

        // track relayer performance and earnings
        if (success) {
            relayer.successfulExecutions++;
            relayer.totalFeesEarned += feeAmount;
            consecutiveFailures[relayerAddress] = 0;
        } else {
            relayer.failedExecutions++;
            consecutiveFailures[relayerAddress]++;
            if (consecutiveFailures[relayerAddress] >= failureThresholdConfig) {
                _slashRelayer(relayerAddress, slashAmountConfig);
            }
        }

        emit ExecutionRecorded(relayerAddress, success, feeAmount);
    }

    function isRelayerActive(address relayerAddress) external view returns (bool) {
        return relayers[relayerAddress].isActive;
    }

    function getRelayerStats(address relayerAddress) external view returns (
        uint256 stakedAmount,
        uint256 successfulExecutions,
        uint256 failedExecutions,
        uint256 totalFeesEarned,
        bool isActive
    ) {
        Relayer storage relayer = relayers[relayerAddress];
        return (
            relayer.stakedAmount,
            relayer.successfulExecutions,
            relayer.failedExecutions,
            relayer.totalFeesEarned,
            relayer.isActive
        );
    }

    function getRelayerInfo(address relayerAddress) external view returns (Relayer memory) {
        return relayers[relayerAddress];
    }

    function canExecute(address relayerAddress) external view returns (bool) {
        Relayer storage relayer = relayers[relayerAddress];
        return relayer.isActive && !isSlashed[relayerAddress] && relayer.stakedAmount >= MINIMUM_STAKE;
    }

    function getConsecutiveFailures(address relayerAddress) external view returns (uint256) {
        return consecutiveFailures[relayerAddress];
    }

    function getTimeUntilSlashCooldown(address relayerAddress) external view returns (uint256) {
        if (block.timestamp >= lastSlashTime[relayerAddress] + SLASHING_COOLDOWN) {
            return 0;
        }
        return (lastSlashTime[relayerAddress] + SLASHING_COOLDOWN) - block.timestamp;
    }

    function restakeAfterSlash(uint256 amount) external nonReentrant {
        require(isSlashed[msg.sender], "Relayer not slashed");
        require(amount > 0, "Invalid amount");
        require(relayers[msg.sender].stakedAmount > 0, "Relayer not registered");

        IERC20(PYUSD_ADDRESS).safeTransferFrom(msg.sender, address(this), amount);

        Relayer storage relayer = relayers[msg.sender];
        relayer.stakedAmount += amount;

        if (relayer.stakedAmount >= MINIMUM_STAKE) {
            relayer.isActive = true;
            isSlashed[msg.sender] = false;
        }

        emit RelayerRestaked(msg.sender, amount, relayer.stakedAmount);
    }

    function emergencySlash(address relayerAddress, uint256 amount, string calldata reason) external onlyOwner {
        require(amount > 0, "Invalid slash amount");
        Relayer storage relayer = relayers[relayerAddress];
        require(relayer.stakedAmount >= amount, "Insufficient stake");

        require(relayer.stakedAmount > 0, "Relayer not registered");

        _applySlash(relayerAddress, amount);

        emit EmergencySlash(relayerAddress, amount, reason);
    }

    function emergencyUnslash(address relayerAddress) external onlyOwner {
        require(isSlashed[relayerAddress], "Relayer not slashed");

        isSlashed[relayerAddress] = false;
        consecutiveFailures[relayerAddress] = 0;

        Relayer storage relayer = relayers[relayerAddress];
        if (relayer.stakedAmount >= MINIMUM_STAKE) {
            relayer.isActive = true;
        }
    }

    function updateSlashingParameters(uint256 slashAmount, uint256 failureThreshold) external onlyOwner {
        require(slashAmount > 0, "Invalid slash amount");
        require(failureThreshold > 0, "Invalid threshold");

        slashAmountConfig = slashAmount;
        failureThresholdConfig = failureThreshold;

        emit SlashingParametersUpdated(slashAmount, failureThreshold);
    }

    function _slashRelayer(address relayerAddress, uint256 amount) internal {
        Relayer storage relayer = relayers[relayerAddress];
        require(relayer.stakedAmount >= amount, "Insufficient stake to slash");
        require(block.timestamp >= lastSlashTime[relayerAddress] + SLASHING_COOLDOWN, "Slash cooldown active");

        _applySlash(relayerAddress, amount);
    }

    function _applySlash(address relayerAddress, uint256 amount) internal {
        Relayer storage relayer = relayers[relayerAddress];
        require(relayer.stakedAmount >= amount, "Insufficient stake");

        lastSlashTime[relayerAddress] = block.timestamp;

        relayer.stakedAmount -= amount;
        isSlashed[relayerAddress] = true;
        consecutiveFailures[relayerAddress] = 0;

        if (relayer.stakedAmount < MINIMUM_STAKE) {
            relayer.isActive = false;
        }

        emit RelayerSlashed(relayerAddress, amount, relayer.stakedAmount);
    }
}
