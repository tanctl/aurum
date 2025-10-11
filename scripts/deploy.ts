const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts with Hardhat 2.26.3...");

  // deploy MockPYUSD for testing
  const MockPYUSD = await hre.ethers.getContractFactory("MockPYUSD");
  const mockPYUSD = await MockPYUSD.deploy();
  await mockPYUSD.waitForDeployment();
  console.log("MockPYUSD deployed to:", await mockPYUSD.getAddress());

  // deploy SubscriptionManager
  const SubscriptionManager = await hre.ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy(await mockPYUSD.getAddress());
  await subscriptionManager.waitForDeployment();
  console.log("SubscriptionManager deployed to:", await subscriptionManager.getAddress());

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