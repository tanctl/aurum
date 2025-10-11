const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionManager", function () {
  let subscriptionManager;
  let mockPYUSD;
  let owner;
  let subscriber;
  let merchant;

  beforeEach(async function () {
    [owner, subscriber, merchant] = await ethers.getSigners();

    // deploy MockPYUSD
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.waitForDeployment();

    // deploy SubscriptionManager
    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    subscriptionManager = await SubscriptionManager.deploy(await mockPYUSD.getAddress());
    await subscriptionManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct PYUSD address", async function () {
      expect(await subscriptionManager.PYUSD_ADDRESS()).to.equal(await mockPYUSD.getAddress());
    });

    it("Should set the correct protocol fee", async function () {
      expect(await subscriptionManager.PROTOCOL_FEE_BPS()).to.equal(50);
    });
  });

  describe("Create Subscription", function () {
    it("Should create subscription with valid parameters", async function () {
      const amount = ethers.parseUnits("10", 6); // 10 PYUSD
      const interval = 86400; // 1 day
      const startTime = Math.floor(Date.now() / 1000);
      const maxPayments = 12;
      const maxTotalAmount = amount * BigInt(maxPayments);
      const expiry = startTime + (86400 * 365); // 1 year

      const intent = {
        subscriber: subscriber.address,
        merchant: merchant.address,
        amount: amount,
        interval: interval,
        startTime: startTime,
        maxPayments: maxPayments,
        maxTotalAmount: maxTotalAmount,
        expiry: expiry,
        nonce: 0
      };

      // mint and approve PYUSD for subscriber
      await mockPYUSD.mint(subscriber.address, maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), maxTotalAmount);

      // create signature
      const domain = {
        name: "Aurum",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await subscriptionManager.getAddress()
      };

      const types = {
        SubscriptionIntent: [
          { name: "subscriber", type: "address" },
          { name: "merchant", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "interval", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "maxPayments", type: "uint256" },
          { name: "maxTotalAmount", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const signature = await subscriber.signTypedData(domain, types, intent);

      // create subscription
      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
    });
  });
});