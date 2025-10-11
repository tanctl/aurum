const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts with Hardhat 2.26.3...");

  // deploy MockPYUSD for testing
  const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
  const mockPYUSD = await MockPYUSD.deploy();
  await mockPYUSD.waitForDeployment();
  console.log("MockPYUSD deployed to:", await mockPYUSD.getAddress());

  // get deployer address for proper ownership
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // deploy RelayerRegistry first
  const RelayerRegistry = await hre.ethers.getContractFactory("RelayerRegistry");
  const relayerRegistry = await RelayerRegistry.deploy(await mockPYUSD.getAddress());
  await relayerRegistry.waitForDeployment();
  console.log("RelayerRegistry deployed to:", await relayerRegistry.getAddress());
  console.log("RelayerRegistry owner:", await relayerRegistry.owner());

  // deploy SubscriptionManager with RelayerRegistry address
  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy(await mockPYUSD.getAddress(), await relayerRegistry.getAddress());
  await subscriptionManager.waitForDeployment();
  console.log("SubscriptionManager deployed to:", await subscriptionManager.getAddress());

  // set SubscriptionManager address in RelayerRegistry
  await relayerRegistry.setSubscriptionManager(await subscriptionManager.getAddress());
  console.log("SubscriptionManager address set in RelayerRegistry");

  console.log("Deployment Summary:");
  console.log("Hardhat 2.26.3 - WORKING");
  console.log("CommonJS support - WORKING");
  console.log("Contract compilation - WORKING");
  console.log("Contract deployment - WORKING");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});