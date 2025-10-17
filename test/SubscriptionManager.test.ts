const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionManager", function () {
  const ETH_ADDRESS = ethers.ZeroAddress;
  const MINIMUM_STAKE = ethers.parseUnits("1000", 6);

  let subscriptionManager;
  let mockPYUSD;
  let relayerRegistry;
  let extraToken;
  let owner;
  let subscriber;
  let merchant;
  let relayer;
  let otherAccount;

  async function createSubscriptionIntent(params = {}) {
    const token = params.token || (await mockPYUSD.getAddress());
    const amount = params.amount || ethers.parseUnits("10", token === ETH_ADDRESS ? 18 : 6);
    const interval = params.interval || 86400;
    const startTime = params.startTime || Math.floor(Date.now() / 1000);
    const maxPayments = params.maxPayments || 12;
    const maxTotalAmount =
      params.maxTotalAmount !== undefined ? params.maxTotalAmount : amount * BigInt(maxPayments);
    const expiry = params.expiry || startTime + 86400 * 365;
    const nonce =
      params.nonce !== undefined
        ? params.nonce
        : await subscriptionManager.getNextNonce(subscriber.address);

    const intent = {
      subscriber: subscriber.address,
      merchant: merchant.address,
      amount,
      interval,
      startTime,
      maxPayments,
      maxTotalAmount,
      expiry,
      nonce,
      token,
    };

    const domain = {
      name: "Aurum",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await subscriptionManager.getAddress(),
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
        { name: "nonce", type: "uint256" },
        { name: "token", type: "address" },
      ],
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
      verifyingContract: await subscriptionManager.getAddress(),
    };
    const types = {
      PauseRequest: [
        { name: "subscriptionId", type: "bytes32" },
        { name: "nonce", type: "uint256" },
      ],
    };
    return await signer.signTypedData(domain, types, {
      subscriptionId,
      nonce,
    });
  }

  async function signResumeRequest(subscriptionId, signer = subscriber) {
    const nonce = await subscriptionManager.getNextNonce(signer.address);
    const domain = {
      name: "Aurum",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await subscriptionManager.getAddress(),
    };
    const types = {
      ResumeRequest: [
        { name: "subscriptionId", type: "bytes32" },
        { name: "nonce", type: "uint256" },
      ],
    };
    return await signer.signTypedData(domain, types, {
      subscriptionId,
      nonce,
    });
  }

  async function registerActiveRelayer() {
    await mockPYUSD.mint(relayer.address, MINIMUM_STAKE);
    await mockPYUSD.connect(relayer).approve(await relayerRegistry.getAddress(), MINIMUM_STAKE);
    await relayerRegistry.connect(relayer).registerRelayer(MINIMUM_STAKE);
  }

  async function advanceTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  function getEventArgs(receipt, eventName) {
    const topic = subscriptionManager.interface.getEvent(eventName).topicHash;
    const log = receipt.logs.find((entry) => entry.topics[0] === topic);
    return log ? subscriptionManager.interface.parseLog(log).args : undefined;
  }

  beforeEach(async function () {
    [owner, subscriber, merchant, relayer, otherAccount] = await ethers.getSigners();

    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    mockPYUSD = await MockPYUSD.deploy();
    await mockPYUSD.waitForDeployment();

    const RelayerRegistry = await ethers.getContractFactory("RelayerRegistry");
    relayerRegistry = await RelayerRegistry.deploy(await mockPYUSD.getAddress());
    await relayerRegistry.waitForDeployment();

    const ExtraToken = await ethers.getContractFactory("MockPYUSD");
    extraToken = await ExtraToken.deploy();
    await extraToken.waitForDeployment();

    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    subscriptionManager = await SubscriptionManager.deploy(
      [await mockPYUSD.getAddress()],
      await relayerRegistry.getAddress()
    );
    await subscriptionManager.waitForDeployment();

    await relayerRegistry.setSubscriptionManager(await subscriptionManager.getAddress());
  });

  describe("Deployment", function () {
    it("tracks default supported tokens", async function () {
      const supported = await subscriptionManager.getSupportedTokens();
      expect(supported).to.include(await mockPYUSD.getAddress());
      expect(supported).to.include(ETH_ADDRESS);
      expect(await subscriptionManager.supportedTokens(await mockPYUSD.getAddress())).to.equal(true);
      expect(await subscriptionManager.supportedTokens(ETH_ADDRESS)).to.equal(true);
    });

    it("stores protocol fee configuration", async function () {
      expect(await subscriptionManager.PROTOCOL_FEE_BPS()).to.equal(50);
      expect(await subscriptionManager.PAUSE_REQUEST_TYPEHASH()).to.not.equal("0x");
      expect(await subscriptionManager.RESUME_REQUEST_TYPEHASH()).to.not.equal("0x");
    });
  });

  describe("Nonce management", function () {
    it("starts nonce at zero", async function () {
      expect(await subscriptionManager.getNextNonce(subscriber.address)).to.equal(0);
    });

    it("increments nonce after subscription creation", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      await subscriptionManager.createSubscription(intent, signature);
      expect(await subscriptionManager.getNextNonce(subscriber.address)).to.equal(1);
    });

    it("rejects mismatched nonce", async function () {
      const { intent, signature } = await createSubscriptionIntent({ nonce: 5 });
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      await expect(subscriptionManager.createSubscription(intent, signature)).to.be.revertedWith("Invalid nonce");
    });
  });

  describe("Intent verification", function () {
    it("accepts valid signatures", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      const verification = await subscriptionManager.verifyIntent(intent, signature);
      expect(verification[0]).to.equal(true);
      expect(verification[1]).to.equal(subscriber.address);
    });

    it("rejects signatures from different signer", async function () {
      const { intent } = await createSubscriptionIntent();
      const forgedIntent = { ...intent, nonce: intent.nonce };
      const domain = {
        name: "Aurum",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await subscriptionManager.getAddress(),
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
          { name: "nonce", type: "uint256" },
          { name: "token", type: "address" },
        ],
      };
      const forgedSignature = await merchant.signTypedData(domain, types, forgedIntent);
      const verification = await subscriptionManager.verifyIntent(forgedIntent, forgedSignature);
      expect(verification[0]).to.equal(false);
      expect(verification[1]).to.equal(merchant.address);
    });
  });

  describe("Subscription creation", function () {
    it("creates PYUSD subscription and stores metadata", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intent, signature);
      const receipt = await tx.wait();
      const eventArgs = getEventArgs(receipt, "SubscriptionCreated");

      expect(eventArgs.subscriptionId).to.not.equal(undefined);
      expect(eventArgs.token).to.equal(await mockPYUSD.getAddress());

      const stored = await subscriptionManager.getSubscription(eventArgs.subscriptionId);
      expect(stored.subscriber).to.equal(subscriber.address);
      expect(stored.token).to.equal(await mockPYUSD.getAddress());
      expect(await subscriptionManager.subscriptionToken(eventArgs.subscriptionId)).to.equal(await mockPYUSD.getAddress());
    });

    it("rejects unsupported token intents", async function () {
      const { intent, signature } = await createSubscriptionIntent({ token: await extraToken.getAddress() });
      await extraToken.mint(subscriber.address, intent.maxTotalAmount);

      await expect(subscriptionManager.createSubscription(intent, signature)).to.be.revertedWith("Token not supported");
    });
  });

  describe("Payment execution", function () {
    beforeEach(async function () {
      await registerActiveRelayer();
    });

    it("executes PYUSD subscription and pays merchant/relayer", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);

      const createTx = await subscriptionManager.createSubscription(intent, signature);
      const createReceipt = await createTx.wait();
      const subscriptionId = getEventArgs(createReceipt, "SubscriptionCreated").subscriptionId;

      await advanceTime(intent.interval);

      const merchantBalanceBefore = await mockPYUSD.balanceOf(merchant.address);
      const relayerBalanceBefore = await mockPYUSD.balanceOf(relayer.address);

      const executeTx = await subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address);
      const executeReceipt = await executeTx.wait();
      const eventArgs = getEventArgs(executeReceipt, "PaymentExecuted");

      expect(eventArgs.token).to.equal(await mockPYUSD.getAddress());

      const fee = (intent.amount * BigInt(await subscriptionManager.PROTOCOL_FEE_BPS())) / 10000n;
      const merchantAmount = intent.amount - fee;

      const merchantBalanceAfter = await mockPYUSD.balanceOf(merchant.address);
      const relayerBalanceAfter = await mockPYUSD.balanceOf(relayer.address);

      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(merchantAmount);
      expect(relayerBalanceAfter - relayerBalanceBefore).to.equal(fee);
    });

    it("allows ETH subscription execution with deposited funds", async function () {
      const ethAmount = ethers.parseEther("1");
      const { intent, signature } = await createSubscriptionIntent({
        token: ETH_ADDRESS,
        amount: ethAmount,
        maxPayments: 2,
        maxTotalAmount: ethAmount * 2n,
      });

      const createTx = await subscriptionManager.createSubscription(intent, signature);
      const createReceipt = await createTx.wait();
      const subscriptionId = getEventArgs(createReceipt, "SubscriptionCreated").subscriptionId;

      await subscriptionManager.connect(subscriber).depositForSubscription(subscriptionId, { value: ethAmount * 2n });

      await advanceTime(intent.interval);

      const merchantBalanceBefore = await ethers.provider.getBalance(merchant.address);
      const relayerBalanceBefore = await ethers.provider.getBalance(relayer.address);

      const executeTx = await subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address);
      const executeReceipt = await executeTx.wait();
      const eventArgs = getEventArgs(executeReceipt, "PaymentExecuted");

      const fee = (ethAmount * BigInt(await subscriptionManager.PROTOCOL_FEE_BPS())) / 10000n;
      const merchantAmount = ethAmount - fee;
      const gasPrice = executeReceipt.gasPrice ?? executeReceipt.effectiveGasPrice ?? 0n;
      const gasUsed = executeReceipt.gasUsed * gasPrice;

      const merchantBalanceAfter = await ethers.provider.getBalance(merchant.address);
      const relayerBalanceAfter = await ethers.provider.getBalance(relayer.address);

      expect(eventArgs.token).to.equal(ETH_ADDRESS);
      expect(merchantBalanceAfter - merchantBalanceBefore).to.equal(merchantAmount);
      const relayerDelta = relayerBalanceAfter - relayerBalanceBefore + gasUsed;
      expect(relayerDelta).to.equal(fee);
    });

    it("records failed execution when ETH deposit insufficient", async function () {
      const ethAmount = ethers.parseEther("1");
      const { intent, signature } = await createSubscriptionIntent({
        token: ETH_ADDRESS,
        amount: ethAmount,
        maxPayments: 1,
        maxTotalAmount: ethAmount,
      });

      const createTx = await subscriptionManager.createSubscription(intent, signature);
      const subscriptionId = getEventArgs(await createTx.wait(), "SubscriptionCreated").subscriptionId;

      await advanceTime(intent.interval);

      const executeTx = await subscriptionManager.connect(relayer).executeSubscription(subscriptionId, relayer.address);
      const receipt = await executeTx.wait();
      const failure = getEventArgs(receipt, "PaymentFailed");

      expect(failure.reason).to.equal("Insufficient ETH deposit");
      expect(await subscriptionManager.executedPayments(subscriptionId)).to.equal(0);
    });
  });

  describe("Mixed token coordination", function () {
    beforeEach(async function () {
      await registerActiveRelayer();
    });

    it("handles concurrent PYUSD and ETH subscriptions for same merchant", async function () {
      const { intent: pyIntent, signature: pySignature } = await createSubscriptionIntent();
      await mockPYUSD.mint(subscriber.address, pyIntent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), pyIntent.maxTotalAmount);
      const pyTx = await subscriptionManager.createSubscription(pyIntent, pySignature);
      const pyId = getEventArgs(await pyTx.wait(), "SubscriptionCreated").subscriptionId;

      const ethAmount = ethers.parseEther("2");
      const { intent: ethIntent, signature: ethSignature } = await createSubscriptionIntent({
        token: ETH_ADDRESS,
        amount: ethAmount,
        maxPayments: 2,
        maxTotalAmount: ethAmount * 2n,
      });
      const ethCreateTx = await subscriptionManager.createSubscription(ethIntent, ethSignature);
      const ethId = getEventArgs(await ethCreateTx.wait(), "SubscriptionCreated").subscriptionId;

      await subscriptionManager.connect(subscriber).depositForSubscription(ethId, { value: ethAmount });

      await advanceTime(pyIntent.interval);

      const merchantPyBefore = await mockPYUSD.balanceOf(merchant.address);
      const merchantEthBefore = await ethers.provider.getBalance(merchant.address);

      const relayerPyBefore = await mockPYUSD.balanceOf(relayer.address);

      const pyTxResponse = await subscriptionManager.connect(relayer).executeSubscription(pyId, relayer.address);
      await pyTxResponse.wait();

      const relayerEthBefore = await ethers.provider.getBalance(relayer.address);
      const ethTx = await subscriptionManager.connect(relayer).executeSubscription(ethId, relayer.address);
      const ethReceipt = await ethTx.wait();
      const ethGasPrice = ethReceipt.gasPrice ?? ethReceipt.effectiveGasPrice ?? 0n;
      const gasCost = ethReceipt.gasUsed * ethGasPrice;

      const feePy = (pyIntent.amount * BigInt(await subscriptionManager.PROTOCOL_FEE_BPS())) / 10000n;
      const feeEth = (ethAmount * BigInt(await subscriptionManager.PROTOCOL_FEE_BPS())) / 10000n;

      const merchantPyAfter = await mockPYUSD.balanceOf(merchant.address);
      const merchantEthAfter = await ethers.provider.getBalance(merchant.address);
      const relayerEthAfter = await ethers.provider.getBalance(relayer.address);
      const relayerPyAfter = await mockPYUSD.balanceOf(relayer.address);

      expect(merchantPyAfter - merchantPyBefore).to.equal(pyIntent.amount - feePy);
      expect(merchantEthAfter - merchantEthBefore).to.equal(ethAmount - feeEth);
      expect(relayerPyAfter - relayerPyBefore).to.equal(feePy);
      const relayerEthDelta = relayerEthAfter - relayerEthBefore + gasCost;
      expect(relayerEthDelta).to.equal(feeEth);
    });
  });

  describe("ETH deposit lifecycle", function () {
    it("allows subscriber to withdraw unused ETH after cancellation", async function () {
      const ethAmount = ethers.parseEther("1");
      const { intent, signature } = await createSubscriptionIntent({
        token: ETH_ADDRESS,
        amount: ethAmount,
        maxPayments: 2,
        maxTotalAmount: ethAmount * 2n,
      });

      const createTx = await subscriptionManager.createSubscription(intent, signature);
      const subscriptionId = getEventArgs(await createTx.wait(), "SubscriptionCreated").subscriptionId;

      await subscriptionManager.connect(subscriber).depositForSubscription(subscriptionId, { value: ethAmount * 2n });
      await subscriptionManager.connect(subscriber).cancelSubscription(subscriptionId);

      const balanceBefore = await ethers.provider.getBalance(subscriber.address);
      const withdrawTx = await subscriptionManager.connect(subscriber).withdrawUnusedETH(subscriptionId);
      const receipt = await withdrawTx.wait();
      const withdrawGasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
      const gasCost = receipt.gasUsed * withdrawGasPrice;
      const balanceAfter = await ethers.provider.getBalance(subscriber.address);

      expect(balanceAfter + gasCost - balanceBefore).to.equal(ethAmount * 2n);
      expect(await subscriptionManager.ethDeposits(subscriptionId)).to.equal(0);
    });

    it("blocks withdraws while subscription active", async function () {
      const ethAmount = ethers.parseEther("1");
      const { intent, signature } = await createSubscriptionIntent({
        token: ETH_ADDRESS,
        amount: ethAmount,
        maxPayments: 1,
        maxTotalAmount: ethAmount,
      });

      const createTx = await subscriptionManager.createSubscription(intent, signature);
      const subscriptionId = getEventArgs(await createTx.wait(), "SubscriptionCreated").subscriptionId;
      await subscriptionManager.connect(subscriber).depositForSubscription(subscriptionId, { value: ethAmount });

      await expect(subscriptionManager.connect(subscriber).withdrawUnusedETH(subscriptionId)).to.be.revertedWith(
        "Subscription still active"
      );
    });
  });

  describe("Admin token management", function () {
    it("adds new supported token and allows subscription usage", async function () {
      await subscriptionManager.connect(owner).addSupportedToken(await extraToken.getAddress());
      expect(await subscriptionManager.supportedTokens(await extraToken.getAddress())).to.equal(true);

      const amount = ethers.parseUnits("15", 6);
      const intentData = await createSubscriptionIntent({
        token: await extraToken.getAddress(),
        amount,
        maxPayments: 2,
        maxTotalAmount: amount * 2n,
      });

      await extraToken.mint(subscriber.address, intentData.intent.maxTotalAmount);
      await extraToken
        .connect(subscriber)
        .approve(await subscriptionManager.getAddress(), intentData.intent.maxTotalAmount);

      const tx = await subscriptionManager.createSubscription(intentData.intent, intentData.signature);
      const args = getEventArgs(await tx.wait(), "SubscriptionCreated");
      expect(args.token).to.equal(await extraToken.getAddress());
    });

    it("prevents removing token with active subscriptions", async function () {
      await subscriptionManager.connect(owner).addSupportedToken(await extraToken.getAddress());

      const amount = ethers.parseUnits("5", 6);
      const intentData = await createSubscriptionIntent({
        token: await extraToken.getAddress(),
        amount,
        maxPayments: 1,
        maxTotalAmount: amount,
      });
      await extraToken.mint(subscriber.address, amount);
      await extraToken.connect(subscriber).approve(await subscriptionManager.getAddress(), amount);
      await subscriptionManager.createSubscription(intentData.intent, intentData.signature);

      await expect(
        subscriptionManager.connect(owner).removeSupportedToken(await extraToken.getAddress())
      ).to.be.revertedWith("Active subscriptions present");
    });

    it("removes token after subscriptions end", async function () {
      await subscriptionManager.connect(owner).addSupportedToken(await extraToken.getAddress());
      const amount = ethers.parseUnits("5", 6);
      const intentData = await createSubscriptionIntent({
        token: await extraToken.getAddress(),
        amount,
        maxPayments: 1,
        maxTotalAmount: amount,
      });
      await extraToken.mint(subscriber.address, amount);
      await extraToken.connect(subscriber).approve(await subscriptionManager.getAddress(), amount);
      const tx = await subscriptionManager.createSubscription(intentData.intent, intentData.signature);
      const id = getEventArgs(await tx.wait(), "SubscriptionCreated").subscriptionId;

      await subscriptionManager.connect(subscriber).cancelSubscription(id);
      await subscriptionManager.connect(owner).removeSupportedToken(await extraToken.getAddress());
      expect(await subscriptionManager.supportedTokens(await extraToken.getAddress())).to.equal(false);
    });
  });

  describe("State transitions", function () {
    it("pauses and resumes while retaining token data", async function () {
      const { intent, signature } = await createSubscriptionIntent();
      await mockPYUSD.mint(subscriber.address, intent.maxTotalAmount);
      await mockPYUSD.connect(subscriber).approve(await subscriptionManager.getAddress(), intent.maxTotalAmount);
      const tx = await subscriptionManager.createSubscription(intent, signature);
      const subscriptionId = getEventArgs(await tx.wait(), "SubscriptionCreated").subscriptionId;

      const pauseSig = await signPauseRequest(subscriptionId);
      await subscriptionManager.pauseSubscription(subscriptionId, pauseSig);
      let stored = await subscriptionManager.getSubscription(subscriptionId);
      expect(stored.status).to.equal(1); // PAUSED

      const resumeSig = await signResumeRequest(subscriptionId);
      await subscriptionManager.resumeSubscription(subscriptionId, resumeSig);
      stored = await subscriptionManager.getSubscription(subscriptionId);
      expect(stored.status).to.equal(0); // ACTIVE
    });
  });
});
