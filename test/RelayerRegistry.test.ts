const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RelayerRegistry", function () {
  const MINIMUM_STAKE = ethers.parseUnits("1000", 6);
  const SLASH_AMOUNT = ethers.parseUnits("100", 6);

  let owner;
  let relayer1;
  let relayer2;
  let outsider;
  let mockPYUSD;
  let relayerRegistry;
  let subscriptionManager;

  async function registerRelayer(signer, amount = MINIMUM_STAKE) {
    await mockPYUSD.mint(signer.address, amount);
    await mockPYUSD.connect(signer).approve(await relayerRegistry.getAddress(), amount);
    await relayerRegistry.connect(signer).registerRelayer(amount);
  }

  async function withSubscriptionManager(callback) {
    const subscriptionManagerAddress = await subscriptionManager.getAddress();
    await ethers.provider.send("hardhat_impersonateAccount", [subscriptionManagerAddress]);
    const signer = await ethers.getSigner(subscriptionManagerAddress);
    await ethers.provider.send("hardhat_setBalance", [
      subscriptionManagerAddress,
      "0x1000000000000000000",
    ]);
    const result = await callback(signer);
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [subscriptionManagerAddress]);
    return result;
  }

  beforeEach(async function () {
    [owner, relayer1, relayer2, outsider] = await ethers.getSigners();

    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.waitForDeployment();

    const RelayerRegistry = await ethers.getContractFactory("RelayerRegistry");
    relayerRegistry = await RelayerRegistry.deploy(await mockPYUSD.getAddress());
    await relayerRegistry.waitForDeployment();

    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    subscriptionManager = await SubscriptionManager.deploy(
      await mockPYUSD.getAddress(),
      await relayerRegistry.getAddress()
    );
    await subscriptionManager.waitForDeployment();

    await relayerRegistry.setSubscriptionManager(await subscriptionManager.getAddress());
  });

  describe("deployment", function () {
    it("initialises core parameters", async function () {
      expect(await relayerRegistry.PYUSD_ADDRESS()).to.equal(await mockPYUSD.getAddress());
      expect(await relayerRegistry.MINIMUM_STAKE()).to.equal(MINIMUM_STAKE);
      expect(await relayerRegistry.slashAmountConfig()).to.equal(SLASH_AMOUNT);
      expect(await relayerRegistry.failureThresholdConfig()).to.equal(3);
      expect(await relayerRegistry.subscriptionManager()).to.equal(
        await subscriptionManager.getAddress()
      );
    });
  });

  describe("registration", function () {
    it("registers a relayer with sufficient stake", async function () {
      await registerRelayer(relayer1);

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(relayerData.isActive).to.equal(true);
      expect(await relayerRegistry.canExecute(relayer1.address)).to.equal(true);
      expect(await relayerRegistry.getConsecutiveFailures(relayer1.address)).to.equal(0);
    });

    it("rejects insufficient stake", async function () {
      const amount = MINIMUM_STAKE - ethers.parseUnits("1", 6);
      await mockPYUSD.mint(relayer1.address, amount);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), amount);

      await expect(
        relayerRegistry.connect(relayer1).registerRelayer(amount)
      ).to.be.revertedWith("Insufficient stake amount");
    });

    it("prevents duplicate registration", async function () {
      await registerRelayer(relayer1);
      await mockPYUSD.mint(relayer1.address, MINIMUM_STAKE);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);

      await expect(
        relayerRegistry.connect(relayer1).registerRelayer(MINIMUM_STAKE)
      ).to.be.revertedWith("Relayer already registered");
    });
  });

  describe("unregistration", function () {
    beforeEach(async function () {
      await registerRelayer(relayer1);
    });

    it("allows withdrawal after delay when not slashed", async function () {
      await relayerRegistry.connect(relayer1).requestWithdrawal();
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      await expect(relayerRegistry.connect(relayer1).unregisterRelayer())
        .to.emit(relayerRegistry, "RelayerUnregistered")
        .withArgs(relayer1.address, MINIMUM_STAKE);

      expect(await relayerRegistry.canExecute(relayer1.address)).to.equal(false);
    });

    it("blocks withdrawal while slashed", async function () {
      await withSubscriptionManager(async (signer) => {
        await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
      });

      await expect(
        relayerRegistry.connect(relayer1).requestWithdrawal()
      ).to.be.revertedWith("Relayer not active");
    });
  });

  describe("execution recording", function () {
    beforeEach(async function () {
      await registerRelayer(relayer1);
    });

    it("tracks successful executions and fees", async function () {
      const fee = ethers.parseUnits("5", 6);
      await withSubscriptionManager(async (signer) => {
        await expect(
          relayerRegistry.connect(signer).recordExecution(relayer1.address, true, fee)
        )
          .to.emit(relayerRegistry, "ExecutionRecorded")
          .withArgs(relayer1.address, true, fee);
      });

      const relayerData = await relayerRegistry.relayers(relayer1.address);
      expect(relayerData.successfulExecutions).to.equal(1);
      expect(relayerData.totalFeesEarned).to.equal(fee);
      expect(await relayerRegistry.getConsecutiveFailures(relayer1.address)).to.equal(0);
    });

    it("increments failures and slashes after threshold", async function () {
      await withSubscriptionManager(async (signer) => {
        for (let i = 0; i < 3; i++) {
          await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        }
      });

      const info = await relayerRegistry.relayers(relayer1.address);
      expect(info.stakedAmount).to.equal(MINIMUM_STAKE - SLASH_AMOUNT);
      expect(await relayerRegistry.canExecute(relayer1.address)).to.equal(false);
      expect(await relayerRegistry.getConsecutiveFailures(relayer1.address)).to.equal(0);
      expect(await relayerRegistry.isSlashed(relayer1.address)).to.equal(true);
    });

    it("enforces slashing cooldown", async function () {
      await withSubscriptionManager(async (signer) => {
        for (let i = 0; i < 3; i++) {
          await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        }
      });

      await relayerRegistry.updateSlashingParameters(SLASH_AMOUNT, 1);

      await expect(
        withSubscriptionManager(async (signer) => {
          await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        })
      ).to.be.revertedWith("Relayer not active");

      const timeRemaining = await relayerRegistry.getTimeUntilSlashCooldown(relayer1.address);
      expect(timeRemaining).to.be.gt(0);
    });
  });

  describe("restaking and emergency controls", function () {
    beforeEach(async function () {
      await registerRelayer(relayer1);
      await withSubscriptionManager(async (signer) => {
        for (let i = 0; i < 3; i++) {
          await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        }
      });
    });

    it("allows relayer to restake and regain active status", async function () {
      const topUp = ethers.parseUnits("200", 6);
      await mockPYUSD.mint(relayer1.address, topUp);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), topUp);

      await expect(relayerRegistry.connect(relayer1).restakeAfterSlash(topUp))
        .to.emit(relayerRegistry, "RelayerRestaked")
        .withArgs(relayer1.address, topUp, MINIMUM_STAKE + topUp - SLASH_AMOUNT);

      expect(await relayerRegistry.isSlashed(relayer1.address)).to.equal(false);
      expect(await relayerRegistry.canExecute(relayer1.address)).to.equal(true);
    });

    it("allows owner to emergency slash and unslash", async function () {
      const extraStake = ethers.parseUnits("300", 6);
      await mockPYUSD.mint(relayer1.address, extraStake);
      await mockPYUSD.connect(relayer1).approve(await relayerRegistry.getAddress(), extraStake);
      await relayerRegistry.connect(relayer1).restakeAfterSlash(extraStake);

      await expect(
        relayerRegistry.emergencySlash(relayer1.address, SLASH_AMOUNT, "malicious activity")
      )
        .to.emit(relayerRegistry, "RelayerSlashed")
        .withArgs(relayer1.address, SLASH_AMOUNT, MINIMUM_STAKE + extraStake - (SLASH_AMOUNT * 2n));

      expect(await relayerRegistry.isSlashed(relayer1.address)).to.equal(true);

      await relayerRegistry.emergencyUnslash(relayer1.address);
      expect(await relayerRegistry.isSlashed(relayer1.address)).to.equal(false);
    });

    it("updates slashing parameters via owner call", async function () {
      const newAmount = ethers.parseUnits("150", 6);
      await expect(relayerRegistry.updateSlashingParameters(newAmount, 5))
        .to.emit(relayerRegistry, "SlashingParametersUpdated")
        .withArgs(newAmount, 5);

      expect(await relayerRegistry.slashAmountConfig()).to.equal(newAmount);
      expect(await relayerRegistry.failureThresholdConfig()).to.equal(5);
    });
  });

  describe("view helpers", function () {
    beforeEach(async function () {
      await registerRelayer(relayer1);
    });

    it("returns relayer info struct", async function () {
      const info = await relayerRegistry.getRelayerInfo(relayer1.address);
      expect(info.stakedAmount).to.equal(MINIMUM_STAKE);
      expect(info.isActive).to.equal(true);
    });

    it("reflects canExecute false when stake below minimum", async function () {
      await withSubscriptionManager(async (signer) => {
        for (let i = 0; i < 3; i++) {
          await relayerRegistry.connect(signer).recordExecution(relayer1.address, false, 0);
        }
      });

      expect(await relayerRegistry.canExecute(relayer1.address)).to.equal(false);
    });

    it("returns zero cooldown for never-slashed relayer", async function () {
      expect(await relayerRegistry.getTimeUntilSlashCooldown(relayer1.address)).to.equal(0);
    });
  });

  describe("access control", function () {
    it("restricts recordExecution to subscription manager", async function () {
      await registerRelayer(relayer1);
      await expect(
        relayerRegistry.connect(outsider).recordExecution(relayer1.address, true, 0)
      ).to.be.revertedWith("Only SubscriptionManager");
    });

    it("restricts emergency functions to owner", async function () {
      await registerRelayer(relayer1);
      await expect(
        relayerRegistry.connect(outsider).emergencySlash(relayer1.address, SLASH_AMOUNT, "test")
      ).to.be.revertedWithCustomError(relayerRegistry, "OwnableUnauthorizedAccount");
    });
  });
});
