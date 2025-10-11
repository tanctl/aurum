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
        bool isActive;
        uint256 withdrawalRequestTime;
        bool withdrawalRequested;
    }

    mapping(address => Relayer) public relayers;
    uint256 public constant MINIMUM_STAKE = 1000e6; // 1000 pyusd
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
        require(stakeAmount >= MINIMUM_STAKE, "Insufficient stake amount");
        require(relayers[msg.sender].stakedAmount == 0, "Relayer already registered");

        // stake tokens to become active relayer
        IERC20(PYUSD_ADDRESS).safeTransferFrom(msg.sender, address(this), stakeAmount);

        relayers[msg.sender] = Relayer({
            stakedAmount: stakeAmount,
            successfulExecutions: 0,
            failedExecutions: 0,
            totalFeesEarned: 0,
            isActive: true,
            withdrawalRequestTime: 0,
            withdrawalRequested: false
        });

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


        uint256 stakeToReturn = relayer.stakedAmount;
        
        // clear relayer state before transfer
        relayer.isActive = false;
        relayer.stakedAmount = 0;
        relayer.withdrawalRequested = false;
        relayer.withdrawalRequestTime = 0;

        IERC20(PYUSD_ADDRESS).safeTransfer(msg.sender, stakeToReturn);

        emit RelayerUnregistered(msg.sender, stakeToReturn);
    }

    function recordExecution(
        address relayerAddress,
        bool success,
        uint256 feeAmount
    ) external onlySubscriptionManager {
        Relayer storage relayer = relayers[relayerAddress];
        require(relayer.isActive, "Relayer not active");

        // track relayer performance and earnings
        if (success) {
            relayer.successfulExecutions++;
            relayer.totalFeesEarned += feeAmount;
        } else {
            relayer.failedExecutions++;
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
}