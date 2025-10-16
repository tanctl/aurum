const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionManager", function () {
  let subscriptionManager;
  let mockPYUSD;
  let relayerRegistry;
  let owner;
  let subscriber;
  let merchant;
  let relayer;
  let subscriptionId;

  async function createSubscriptionIntent(params = {}) {
    const amount = params.amount || ethers.parseUnits("10", 6);
    const interval = params.interval || 86400;
    const startTime = params.startTime || Math.floor(Date.now() / 1000);
    const maxPayments = params.maxPayments || 12;
    const maxTotalAmount = params.maxTotalAmount || amount * BigInt(maxPayments);
    const expiry = params.expiry || startTime + (86400 * 365);
    const nonce = params.nonce !== undefined ? params.nonce : await subscriptionManager.getNextNonce(subscriber.address);

    const intent = {
      subscriber: subscriber.address,
      merchant: merchant.address,
      amount: amount,
      interval: interval,
      startTime: startTime,
      maxPayments: maxPayments,
      maxTotalAmount: maxTotalAmount,
      expiry: expiry,
      nonce: nonce
    };

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
    return { intent, signature };
  }

  async function signPauseRequest(subscriptionId, signer = subscriber) {
    const nonce = await subscriptionManager.getNextNonce(signer.address);
    
    const domain = {
      name: "Aurum",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await subscriptionManager.getAddress()
    };

    const types = {
      PauseRequest: [
        { name: "subscriptionId", type: "bytes32" },
        { name: "nonce", type: "uint256" }
      ]
    };

    const values = {
      subscriptionId: subscriptionId,
      nonce: nonce
    };

    return await signer.signTypedData(domain, types, values);
  }

  async function signResumeRequest(subscriptionId, signer = subscriber) {
    const nonce = await subscriptionManager.getNextNonce(signer.address);
    
    const domain = {
      name: "Aurum",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await subscriptionManager.getAddress()
    };

    const types = {
      ResumeRequest: [
        { name: "subscriptionId", type: "bytes32" },
        { name: "nonce", type: "uint256" }
      ]
    };

    const values = {
      subscriptionId: subscriptionId,
      nonce: nonce
    };

    return await signer.signTypedData(domain, types, values);
  }

  const MINIMUM_STAKE = ethers.parseUnits("1000", 6);

  async function registerActiveRelayer() {
    await mockPYUSD.mint(relayer.address, MINIMUM_STAKE);
    await mockPYUSD.connect(relayer).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
    await relayerRegistry.connect(relayer).registerRelayer(MINIMUM_STAKE);
  }

  beforeEach(async function () {
    [owner, subscriber, merchant, relayer] = await ethers.getSigners();

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
      expect(await subscriptionManager.PYUSD_ADDRESS()).to.equal(await mockPYUSD.getAddress());
    });

    it("Should set the correct protocol fee", async function () {
      expect(await subscriptionManager.PROTOCOL_FEE_BPS()).to.equal(50);
    });

    it("Should have the correct typehashes", async function () {
      expect(await subscriptionManager.PAUSE_REQUEST_TYPEHASH()).to.not.equal("0x");
      expect(await subscriptionManager.RESUME_REQUEST_TYPEHASH()).to.not.equal("0x");
    });
  });

  describe("Nonce Management", function () {
    it("Should start with nonce 0 for new addresses", async function () {
      expect(await subscriptionManager.getNextNonce(subscriber.address)).to.equal(0);
    });

    it("Should increment nonce after subscription creation", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);
      
      expect(await subscriptionManager.getNextNonce(subscriber.address)).to.equal(0);
      
      await subscriptionManager.createSubscription(intent, signature);
      
      expect(await subscriptionManager.getNextNonce(subscriber.address)).to.equal(1);
    });

    it("Should reject subscription with wrong nonce", async function () {
      const { intent, signature } = await createSubscriptionIntent({ nonce: 5 });
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);
      
      await expect(
        subscriptionManager.createSubscription(intent, signature)
      ).to.be.revertedWith("Invalid nonce");
    });
  });

  describe("Intent Verification", function () {
    it("Should validate a correct intent signature", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      const verification = await subscriptionManager.verifyIntent(intent, signature);
      expect(verification[0]).to.equal(true);
      expect(verification[1]).to.equal(subscriber.address);
    });

    it("Should detect an invalid intent signature", async function () {
      const { intent } = await createSubscriptionIntent();

      const currentNonce = await subscriptionManager.getNextNonce(subscriber.address);
      const forgedIntent = { ...intent, nonce: currentNonce };

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

      const forgedSignature = await merchant.signTypedData(domain, types, forgedIntent);
      const verification = await subscriptionManager.verifyIntent(forgedIntent, forgedSignature);

      expect(verification[0]).to.equal(false);
      expect(verification[1]).to.equal(merchant.address);
    });
  });

  describe("Create Subscription", function () {
    it("Should create subscription with valid parameters", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      
      // check that subscription was created
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      expect(events).to.have.length(1);
      
      subscriptionId = events[0].topics[1]; // first indexed param is subscriptionId
    });

    it("Should reject subscription with insufficient allowance", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      // don't approve enough
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), ethers.parseUnits("1", 6));

      await expect(
        subscriptionManager.createSubscription(intent, signature)
      ).to.be.revertedWith("Insufficient PYUSD allowance");
    });
  });

  describe("Pause Subscription", function () {
    beforeEach(async function () {
      // create a subscription first
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      subscriptionId = events[0].topics[1];
    });

    it("Should pause subscription with valid signature", async function () {
      const pauseSignature = await signPauseRequest(subscriptionId);
      
      const tx = await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      
      // check subscription status
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      expect(subscription.status).to.equal(1); // PAUSED
      
      // check event emission
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionPaused").topicHash);
      expect(events).to.have.length(1);
    });

    it("Should reject pause with invalid signature", async function () {
      const pauseSignature = await signPauseRequest(subscriptionId, merchant); // wrong signer - should fail
      
      await expect(
        subscriptionManager.pauseSubscription(subscriptionId, pauseSignature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should reject pause on non-existent subscription", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      const pauseSignature = await signPauseRequest(fakeId);
      
      await expect(
        subscriptionManager.pauseSubscription(fakeId, pauseSignature)
      ).to.be.revertedWith("Subscription does not exist");
    });

    it("Should reject pause on already paused subscription", async function () {
      // pause first
      const pauseSignature1 = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature1);
      
      // try to pause again
      const pauseSignature2 = await signPauseRequest(subscriptionId);
      await expect(
        subscriptionManager.pauseSubscription(subscriptionId, pauseSignature2)
      ).to.be.revertedWith("Subscription not active");
    });
  });

  describe("Resume Subscription", function () {
    beforeEach(async function () {
      // create and pause a subscription first
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      subscriptionId = events[0].topics[1];
      
      // pause it
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
    });

    it("Should resume paused subscription with valid signature", async function () {
      const resumeSignature = await signResumeRequest(subscriptionId);
      
      const tx = await subscriptionManager.resumeSubscription(subscriptionId, resumeSignature);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      
      // check subscription status
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      expect(subscription.status).to.equal(0); // ACTIVE
      
      // check event emission
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionResumed").topicHash);
      expect(events).to.have.length(1);
    });

    it("Should reject resume with invalid signature", async function () {
      const resumeSignature = await signResumeRequest(subscriptionId, merchant);
      
      await expect(
        subscriptionManager.resumeSubscription(subscriptionId, resumeSignature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("Should reject resume on active subscription", async function () {
      // resume first
      const resumeSignature1 = await signResumeRequest(subscriptionId);
      await subscriptionManager.resumeSubscription(subscriptionId, resumeSignature1);
      
      // try to resume again
      const resumeSignature2 = await signResumeRequest(subscriptionId);
      await expect(
        subscriptionManager.resumeSubscription(subscriptionId, resumeSignature2)
      ).to.be.revertedWith("Subscription not paused");
    });
  });

  describe("Cancel Subscription", function () {
    beforeEach(async function () {
      // create a subscription first
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      subscriptionId = events[0].topics[1];
    });

    it("Should cancel active subscription by subscriber", async function () {
      const tx = await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      
      // check subscription status
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      expect(subscription.status).to.equal(2); // CANCELLED
      
      // check event emission
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCancelled").topicHash);
      expect(events).to.have.length(1);
    });

    it("Should cancel paused subscription by subscriber", async function () {
      // pause first
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      
      // then cancel
      const tx = await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      expect(subscription.status).to.equal(2); // CANCELLED
    });

    it("Should reject cancellation by non-subscriber", async function () {
      await expect(
        subscriptionManager.connect(merchant).cancelSubscription(subscriptionId)
      ).to.be.revertedWith("Only subscriber can cancel");
    });

    it("Should reject cancellation of non-existent subscription", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      await expect(
        subscriptionManager.connect(subscriber).cancelSubscription(fakeId)
      ).to.be.revertedWith("Subscription does not exist");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // create a subscription first
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      subscriptionId = events[0].topics[1];
    });

    it("Should return correct subscription data", async function () {
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      
      expect(subscription.subscriber).to.equal(subscriber.address);
      expect(subscription.merchant).to.equal(merchant.address);
      expect(subscription.amount).to.equal(ethers.parseUnits("10", 6));
      expect(subscription.status).to.equal(0); // ACTIVE
    });

    it("Should return correct payment count", async function () {
      const count = await subscriptionManager.getPaymentCount(subscriptionId);
      expect(count).to.equal(0);
    });

    it("Should return correct next payment time", async function () {
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      const nextTime = await subscriptionManager.getNextPaymentTime(subscriptionId);
      expect(nextTime).to.equal(subscription.startTime);
    });

    it("Should return correct active status", async function () {
      expect(await subscriptionManager.isSubscriptionActive(subscriptionId)).to.be.true;
      
      // pause and check
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      
      expect(await subscriptionManager.isSubscriptionActive(subscriptionId)).to.be.false;
    });

    it("Should handle view functions on non-existent subscription", async function () {
      const fakeId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      
      // getSubscription should return empty struct
      const subscription = await subscriptionManager.getSubscription(fakeId);
      expect(subscription.subscriber).to.equal("0x0000000000000000000000000000000000000000");
      
      // getPaymentCount should return 0
      expect(await subscriptionManager.getPaymentCount(fakeId)).to.equal(0);
      
      // getNextPaymentTime should revert
      await expect(
        subscriptionManager.getNextPaymentTime(fakeId)
      ).to.be.revertedWith("Subscription does not exist");
      
      // isSubscriptionActive should return false
      expect(await subscriptionManager.isSubscriptionActive(fakeId)).to.be.false;
    });
  });

  describe("State Transitions", function () {
    beforeEach(async function () {
      // create a subscription first
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      subscriptionId = events[0].topics[1];
    });

    it("Should handle ACTIVE -> PAUSED -> ACTIVE transitions", async function () {
      // check initial state
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(0); // ACTIVE
      
      // pause
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(1); // PAUSED
      
      // resume
      const resumeSignature = await signResumeRequest(subscriptionId);
      await subscriptionManager.resumeSubscription(subscriptionId, resumeSignature);
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(0); // ACTIVE
    });

    it("Should handle ACTIVE -> CANCELLED transition", async function () {
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(0); // ACTIVE
      
      await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(2); // CANCELLED
    });

    it("Should handle PAUSED -> CANCELLED transition", async function () {
      // pause first
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(1); // PAUSED
      
      // then cancel
      await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);
      expect((await subscriptionManager.getSubscription(subscriptionId)).status).to.equal(2); // CANCELLED
    });

    it("Should prevent operations on cancelled subscription", async function () {
      // cancel first
      await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);
      
      // try to pause cancelled subscription
      const pauseSignature = await signPauseRequest(subscriptionId);
      await expect(
        subscriptionManager.pauseSubscription(subscriptionId, pauseSignature)
      ).to.be.revertedWith("Subscription not active");
      
      // try to cancel again
      await expect(
        subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId)
      ).to.be.revertedWith("Subscription cannot be cancelled");
    });
  });

  describe("Payment Execution with Lifecycle", function () {
    beforeEach(async function () {
      // create a subscription first
      const { intent, signature } = await createSubscriptionIntent();
      
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      subscriptionId = events[0].topics[1];
    });

    it("Should execute subscription successfully and distribute funds correctly", async function () {
      await registerActiveRelayer();

      const latestBlock = await ethers.provider.getBlock("latest");
      const startTime = latestBlock.timestamp;
      const intervalSeconds = 60;

      const amount = ethers.parseUnits("10", 6);
      const { intent, signature } = await createSubscriptionIntent({
        startTime,
        interval: intervalSeconds,
        maxPayments: 2,
        maxTotalAmount: amount * 2n
      });

      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const events = receipt.logs.filter(log => log.topics[0] === subscriptionManager.interface.getEvent("SubscriptionCreated").topicHash);
      const localSubscriptionId = events[0].topics[1];

      await ethers.provider.send("evm_increaseTime", [Number(intent.interval)]);
      await ethers.provider.send("evm_mine", []);

      const merchantBalanceBefore = await mockPYUSD.balanceOf(merchant.address);
      const relayerBalanceBefore = await mockPYUSD.balanceOf(relayer.address);

      const executeTx = await subscriptionManager.connect(relayer).executeSubscription(localSubscriptionId, relayer.address);
      const executeReceipt = await executeTx.wait();

      const paymentEventTopic = subscriptionManager.interface.getEvent("PaymentExecuted").topicHash;
      const emittedPaymentEvent = executeReceipt.logs.find(log => log.topics[0] === paymentEventTopic);
      expect(emittedPaymentEvent).to.not.equal(undefined);

      const fee = (intent.amount * 50n) / 10000n;
      const merchantAmount = intent.amount - fee;

      const merchantBalanceAfter = await mockPYUSD.balanceOf(merchant.address);
      const relayerBalanceAfter = await mockPYUSD.balanceOf(relayer.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(merchantAmount);
      expect(relayerBalanceAfter - relayerBalanceBefore).to.equal(fee);

      expect(await subscriptionManager.getPaymentCount(localSubscriptionId)).to.equal(1);

      const relayerInfo = await relayerRegistry.relayers(relayer.address);
      expect(relayerInfo.successfulExecutions).to.equal(1);
      expect(relayerInfo.totalFeesEarned).to.equal(fee);

      const updatedSubscription = await subscriptionManager.getSubscription(localSubscriptionId);
      expect(updatedSubscription.status).to.equal(0); // ACTIVE
    });

    it("Should reject payment execution on paused subscription", async function () {
      await registerActiveRelayer();
      // pause subscription
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      
      // try to execute payment
      await expect(
        subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address)
      ).to.be.revertedWith("Subscription not active");
    });

    it("Should reject execution from unregistered relayer", async function () {
      await expect(
        subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address)
      ).to.be.revertedWith("Relayer not authorized");
    });

    it("Should slash relayer after repeated on-chain failures", async function () {
      await registerActiveRelayer();
      await mockPYUSD.setForceFailOnTransfer(subscriber.address, true);

      for (let i = 0; i < 3; i++) {
        await subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address);
      }

      expect(await relayerRegistry.isSlashed(relayer.address)).to.equal(true);
      const stakeInfo = await relayerRegistry.relayers(relayer.address);
      expect(stakeInfo.isActive).to.equal(false);
    });

    it("Should allow payment execution after resume", async function () {
      await registerActiveRelayer();
      // pause subscription
      const pauseSignature = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSignature);
      
      // resume subscription
      const resumeSignature = await signResumeRequest(subscriptionId);
      await subscriptionManager.resumeSubscription(subscriptionId, resumeSignature);
      
      // should allow execution now (even though it might fail due to timing, the status check should pass)
      const subscription = await subscriptionManager.getSubscription(subscriptionId);
      expect(subscription.status).to.equal(0); // ACTIVE
      
      // check that we can call the execution (it may fail due to timing but not due to status)
      try {
        await subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address);
      } catch (error) {
        // if it fails, it should be due to timing, not status
        expect(error.message).to.not.include("Subscription not active");
      }
    });

    it("Should reject payment execution on cancelled subscription", async function () {
      await registerActiveRelayer();
      // cancel subscription
      await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);
      
      // try to execute payment
      await expect(
        subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address)
      ).to.be.revertedWith("Subscription not active");
    });
  });
});
