const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RelayerRegistry", function () {
  let relayerRegistry;
  let mockPYUSD;
  let subscriptionManager;
  let owner;
  let relayer1;
  let relayer2;
  let user;

  const MINIMUM_STAKE = ethers.parseUnits("1000", 6);

  beforeEach(async function () {
    [owner, relayer1, relayer2, user] = await ethers.getSigners();

    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.waitForDeployment();

    const RelayerRegistry = await ethers.getContractFactory("RelayerRegistry");
    relayerRegistry = await RelayerRegistry.deploy(await mockPYUSD.getAddress());
    await relayerRegistry.waitForDeployment();

    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    subscriptionManager = await SubscriptionManager.deploy(await mockPYUSD.getAddress(), await relayerRegistry.getAddress());
    await subscriptionManager.waitForDeployment();

    await relayerRegistry.setSubscriptionManager(await subscriptionManager.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct PYUSD address", async function () {
      expect(await relayerRegistry.PYUSD_ADDRESS()).to.equal(await mockPYUSD.getAddress());
    });

    it("Should set the correct minimum stake", async function () {
      expect(await relayerRegistry.MINIMUM_STAKE()).to.equal(MINIMUM_STAKE);
    });

    it("Should set the subscription manager address", async function () {
      expect(await relayerRegistry.subscriptionManager()).to.equal(await subscriptionManager.getAddress());
    });

    it("Should reject invalid PYUSD address in constructor", async function () {
      const RelayerRegistry = await ethers.getContractFactory("RelayerRegistry");
      await expect(
        RelayerRegistry.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid PYUSD address");
    });

    it("Should reject setting subscription manager twice", async function () {
      await expect(
        relayerRegistry.setSubscriptionManager(await subscriptionManager.getAddress())
      ).to.be.revertedWith("Already set");
    });
  });

  describe("Relayer Registration", function () {
    beforeEach(async function () {
      await mockPYUSD.mint(relayer1.address, MINIMUM_STAKE * 2n);
      await mockPYUSD.mint(relayer2.address, MINIMUM_STAKE * 2n);
    });

    it("Should register relayer with sufficient stake", async function () {
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
      
      const tx = await relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(relayerData.isActive).to.be.true;
      expect(relayerData.successfulExecutions).to.equal(0);
      expect(relayerData.failedExecutions).to.equal(0);
      expect(relayerData.totalFeesEarned).to.equal(0);

      const events = receipt.logs.filter(log => 
        log.topics[0] === relayerRegistry.interface.getEvent("RelayerRegistered").topicHash
      );
      expect(events).to.have.length(1);
    });

    it("Should register relayer with stake above minimum", async function () {
      const stakeAmount = MINIMUM_STAKE * 2n;
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), stakeAmount);
      
      await relayerRegistry.connect(relayer1).registerRelayer(stakeAmount);

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.stakedAmount).to.equal(stakeAmount);
      expect(relayerData.isActive).to.be.true;
    });

    it("Should reject registration with insufficient stake", async function () {
      const insufficientStake = MINIMUM_STAKE - 1n;
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), insufficientStake);
      
      await expect(
        relayerRegistry.connect(relayer1).registerRelayer(insufficientStake)
      ).to.be.revertedWith("Insufficient stake amount");
    });

    it("Should reject registration if already registered", async function () {
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
      await relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE);

      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
      await expect(
        relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE)
      ).to.be.revertedWith("Relayer already registered");
    });

    it("Should reject registration with insufficient token balance", async function () {
      const excessiveStake = MINIMUM_STAKE * 3n;
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), excessiveStake);
      
      await expect(
        relayerRegistry.connect(relayer1).registerRelayer(excessiveStake)
      ).to.be.reverted;
    });

    it("Should reject registration without sufficient allowance", async function () {
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE - 1n);
      
      await expect(
        relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE)
      ).to.be.reverted;
    });
  });

  describe("Relayer Unregistration", function () {
    beforeEach(async function () {
      await mockPYUSD.mint(relayer1.address, MINIMUM_STAKE);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
      await relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE);
    });

    it("Should unregister relayer and return stake after withdrawal delay", async function () {
      const initialBalance = await mockPYUSD.balanceOf(relayer1.address);
      
      await relayerRegistry.connect(relayer1).requestWithdrawal();
      
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine", []);
      
      const tx = await relayerRegistry.connect(relayer1).unregisterRelayer();
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.stakedAmount).to.equal(0);
      expect(relayerData.isActive).to.be.false;
      expect(relayerData.withdrawalRequested).to.be.false;

      const finalBalance = await mockPYUSD.balanceOf(relayer1.address);
      expect(finalBalance).to.equal(initialBalance + MINIMUM_STAKE);

      const events = receipt.logs.filter(log => 
        log.topics[0] === relayerRegistry.interface.getEvent("RelayerUnregistered").topicHash
      );
      expect(events).to.have.length(1);
    });

    it("Should reject unregistration if not active", async function () {
      await relayerRegistry.connect(relayer1).requestWithdrawal();
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      await relayerRegistry.connect(relayer1).unregisterRelayer();

      await expect(
        relayerRegistry.connect(relayer1).unregisterRelayer()
      ).to.be.revertedWith("Relayer not active");
    });

    it("Should reject unregistration if never registered", async function () {
      await expect(
        relayerRegistry.connect(relayer2).unregisterRelayer()
      ).to.be.revertedWith("Relayer not active");
    });

    it("Should request withdrawal successfully", async function () {
      const tx = await relayerRegistry.connect(relayer1).requestWithdrawal();
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.withdrawalRequested).to.be.true;
      expect(relayerData.withdrawalRequestTime).to.be.greaterThan(0);

      const events = receipt.logs.filter(log => 
        log.topics[0] === relayerRegistry.interface.getEvent("WithdrawalRequested").topicHash
      );
      expect(events).to.have.length(1);
    });

    it("Should reject unregistration before withdrawal delay", async function () {
      await relayerRegistry.connect(relayer1).requestWithdrawal();
      
      await expect(
        relayerRegistry.connect(relayer1).unregisterRelayer()
      ).to.be.revertedWith("Withdrawal delay not met");
    });

    it("Should reject unregistration without withdrawal request", async function () {
      await expect(
        relayerRegistry.connect(relayer1).unregisterRelayer()
      ).to.be.revertedWith("Must request withdrawal first");
    });
  });

  describe("Execution Recording", function () {
    beforeEach(async function () {
      // register a relayer
      await mockPYUSD.mint(relayer1.address, MINIMUM_STAKE);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
      await relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE);
    });

    it("Should record successful execution by subscription manager", async function () {
      const feeAmount = ethers.parseUnits("5", 6);

      // impersonate subscription manager for this call
      await ethers.provider.send("hardhat_impersonateAccount", [await subscriptionManager.getAddress()]);
      const subscriptionManagerSigner = await ethers.getSigner(await subscriptionManager.getAddress());
      
      // fund the impersonated account
      await ethers.provider.send("hardhat_setBalance", [
        await subscriptionManager.getAddress(),
        "0x1000000000000000000"
      ]);

      const tx = await relayerRegistry.connect(subscriptionManagerSigner).recordExecution(
        relayer1.address,
        true,
        feeAmount
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);

      // check relayer stats
      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.successfulExecutions).to.equal(1);
      expect(relayerData.failedExecutions).to.equal(0);
      expect(relayerData.totalFeesEarned).to.equal(feeAmount);

      // check event emission
      const events = receipt.logs.filter(log => 
        log.topics[0] === relayerRegistry.interface.getEvent("ExecutionRecorded").topicHash
      );
      expect(events).to.have.length(1);

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await subscriptionManager.getAddress()]);
    });

    it("Should record failed execution by subscription manager", async function () {
      // impersonate subscription manager for this call
      await ethers.provider.send("hardhat_impersonateAccount", [await subscriptionManager.getAddress()]);
      const subscriptionManagerSigner = await ethers.getSigner(await subscriptionManager.getAddress());
      
      // fund the impersonated account
      await ethers.provider.send("hardhat_setBalance", [
        await subscriptionManager.getAddress(),
        "0x1000000000000000000"
      ]);
      
      const tx = await relayerRegistry.connect(subscriptionManagerSigner).recordExecution(
        relayer1.address,
        false,
        0
      );
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);

      // check relayer stats
      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.successfulExecutions).to.equal(0);
      expect(relayerData.failedExecutions).to.equal(1);
      expect(relayerData.totalFeesEarned).to.equal(0);

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await subscriptionManager.getAddress()]);
    });

    it("Should reject execution recording from non-subscription manager", async function () {
      await expect(
        relayerRegistry.connect(user).recordExecution(relayer1.address, true, 100)
      ).to.be.revertedWith("Only SubscriptionManager");
    });

    it("Should reject execution recording for inactive relayer", async function () {
      // unregister relayer first
      await relayerRegistry.connect(relayer1).requestWithdrawal();
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await relayerRegistry.connect(relayer1).unregisterRelayer();

      // impersonate subscription manager
      await ethers.provider.send("hardhat_impersonateAccount", [await subscriptionManager.getAddress()]);
      const subscriptionManagerSigner = await ethers.getSigner(await subscriptionManager.getAddress());

      await ethers.provider.send("hardhat_setBalance", [
        await subscriptionManager.getAddress(),
        "0x1000000000000000000"
      ]);

      await expect(
        relayerRegistry.connect(subscriptionManagerSigner).recordExecution(relayer1.address, true, 100)
      ).to.be.revertedWith("Relayer not active");

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await subscriptionManager.getAddress()]);
    });

    it("Should accumulate multiple executions correctly", async function () {
      await ethers.provider.send("hardhat_impersonateAccount", [await subscriptionManager.getAddress()]);
      const subscriptionManagerSigner = await ethers.getSigner(await subscriptionManager.getAddress());

      await ethers.provider.send("hardhat_setBalance", [
        await subscriptionManager.getAddress(),
        "0x1000000000000000000"
      ]);

      const fee1 = ethers.parseUnits("2", 6);
      const fee2 = ethers.parseUnits("3", 6);

      await relayerRegistry.connect(subscriptionManagerSigner).recordExecution(relayer1.address, true, fee1);
      
      await relayerRegistry.connect(subscriptionManagerSigner).recordExecution(relayer1.address, false, 0);
      
      await relayerRegistry.connect(subscriptionManagerSigner).recordExecution(relayer1.address, true, fee2);

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.successfulExecutions).to.equal(2);
      expect(relayerData.failedExecutions).to.equal(1);
      expect(relayerData.totalFeesEarned).to.equal(fee1 + fee2);

      await ethers.provider.send("hardhat_stopImpersonatingAccount", [await subscriptionManager.getAddress()]);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // register a relayer
      await mockPYUSD.mint(relayer1.address, MINIMUM_STAKE);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
      await relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE);
    });

    it("Should return correct relayer active status", async function () {
      expect(await relayerRegistry.isRelayerActive(relayer1.address)).to.be.true;
      expect(await relayerRegistry.isRelayerActive(relayer2.address)).to.be.false;

      await relayerRegistry.connect(relayer1).requestWithdrawal();
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      await relayerRegistry.connect(relayer1).unregisterRelayer();
      expect(await relayerRegistry.isRelayerActive(relayer1.address)).to.be.false;
    });

    it("Should return correct relayer stats", async function () {
      const [stakedAmount, successfulExecutions, failedExecutions, totalFeesEarned, isActive] = 
        await relayerRegistry.getRelayerStats(relayer1.address);

      expect(stakedAmount).to.equal(MINIMUM_STAKE);
      expect(successfulExecutions).to.equal(0);
      expect(failedExecutions).to.equal(0);
      expect(totalFeesEarned).to.equal(0);
      expect(isActive).to.be.true;
    });

    it("Should return empty stats for non-existent relayer", async function () {
      const [stakedAmount, successfulExecutions, failedExecutions, totalFeesEarned, isActive] = 
        await relayerRegistry.getRelayerStats(relayer2.address);

      expect(stakedAmount).to.equal(0);
      expect(successfulExecutions).to.equal(0);
      expect(failedExecutions).to.equal(0);
      expect(totalFeesEarned).to.equal(0);
      expect(isActive).to.be.false;
    });
  });
});