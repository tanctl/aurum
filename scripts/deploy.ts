const hre = require("hardhat");

const DEFAULT_PYUSD_BY_CHAIN_ID = {
  11155111: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // Sepolia PYUSD
  84532: "0x3bC4424841341f8b2657eAE8f6B0f2125f63b934", // Base Sepolia test PYUSD
};

function resolveEnvAddress(...keys) {
  for (const key of keys) {
    const value = key ? process.env[key] : undefined;
    if (value && hre.ethers.isAddress(value)) {
      return hre.ethers.getAddress(value);
    }
  }
  return undefined;
}

async function resolvePyusdAddress() {
  const { network } = hre;
  const chainId = network.config.chainId ?? 0;

  const explicit = resolveEnvAddress(
    "PYUSD_ADDRESS",
    `PYUSD_${network.name.toUpperCase()}`,
    chainId === 11155111 ? "PYUSD_SEPOLIA" : undefined,
    chainId === 8453 || chainId === 84532 ? "PYUSD_BASE" : undefined
  );

  if (explicit) {
    return { address: explicit, isTestDeployment: false };
  }

  const defaultAddress = DEFAULT_PYUSD_BY_CHAIN_ID[chainId];
  if (defaultAddress) {
    return { address: hre.ethers.getAddress(defaultAddress), isTestDeployment: false };
  }

  // fall back to deploying a local test token when running on hardhat-style networks
  const shouldDeployTestToken = chainId === 31337 || network.name === "hardhat" || network.name === "localhost";
  if (!shouldDeployTestToken) {
    throw new Error(
      `PYUSD address not configured for network ${network.name}. Set PYUSD_ADDRESS or PYUSD_${network.name
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, "")}.`
    );
  }

  const TestPYUSD = await hre.ethers.getContractFactory("TestPYUSD");
  const testPYUSD = await TestPYUSD.deploy();
  await testPYUSD.waitForDeployment();
  const address = await testPYUSD.getAddress();
  console.log(`Deployed TestPYUSD to ${address} for local development`);
  return { address, isTestDeployment: true };
}

async function main() {
  console.log(`Deploying contracts with Hardhat on ${hre.network.name}...`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  const { address: pyusdAddress } = await resolvePyusdAddress();
  console.log("Using PYUSD address:", pyusdAddress);

  const RelayerRegistry = await hre.ethers.getContractFactory("RelayerRegistry");
  const relayerRegistry = await RelayerRegistry.deploy(pyusdAddress);
  await relayerRegistry.waitForDeployment();
  console.log("RelayerRegistry deployed to:", await relayerRegistry.getAddress());
  console.log("RelayerRegistry owner:", await relayerRegistry.owner());

  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const supportedTokens = [pyusdAddress, hre.ethers.ZeroAddress];
  const subscriptionManager = await SubscriptionManager.deploy(
    supportedTokens,
    await relayerRegistry.getAddress()
  );
  await subscriptionManager.waitForDeployment();
  console.log("SubscriptionManager deployed to:", await subscriptionManager.getAddress());
  console.log("Supported tokens:", supportedTokens);

  await relayerRegistry.setSubscriptionManager(await subscriptionManager.getAddress());
  console.log("SubscriptionManager address set in RelayerRegistry");

  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
